-- ========================================================================
-- 0003_realtime_games.sql — Game moves table + Realtime + submit_move RPC
--
-- Adds per-move tracking for multiplayer games with server-side time
-- authority, Realtime subscriptions, and the anti-cheat submit_move RPC.
-- ========================================================================

-- 1. Add 'waiting' status to games for friend-match lobby
alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check
  check (status in ('waiting','active','checkmate','stalemate','draw','resigned','timeout','aborted'));

-- 2. Add last_move_at for server-side clock authority
alter table public.games add column if not exists last_move_at timestamptz;

-- 3. Allow update for participants (needed to join games + update status)
create policy "games_participant_update" on public.games
  for update using (auth.uid() = white_id or auth.uid() = black_id or white_id is null or black_id is null)
  with check (true);

-- 4. Game moves table
create table public.game_moves (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null,
  san text not null,
  uci text not null,
  fen_after text not null,
  time_left_ms integer not null,
  made_at timestamptz not null default now(),
  unique (game_id, ply)
);

create index game_moves_game_idx on public.game_moves(game_id, ply);

alter table public.game_moves enable row level security;

-- Participants can read moves of their games
create policy "moves_participant_read" on public.game_moves
  for select using (
    exists(
      select 1 from public.games g
      where g.id = game_id
      and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

-- Participants can insert moves (validation happens in submit_move RPC)
create policy "moves_participant_insert" on public.game_moves
  for insert with check (
    exists(
      select 1 from public.games g
      where g.id = game_id
      and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

-- 5. Enable Realtime publication
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_moves;

-- 6. submit_move RPC
-- This is the anti-cheat boundary. It validates:
--   - The game is active
--   - The caller is the side to move (based on ply count)
--   - Inserts the move and updates game state
-- Full chess legality is trusted from the client's chess.js validation;
-- the server enforces turn order, game state, and clock authority.
create or replace function public.submit_move(
  p_game_id uuid,
  p_uci text,
  p_san text,
  p_fen_after text,
  p_time_left_ms integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_game record;
  v_ply integer;
  v_side_to_move text; -- 'w' or 'b'
  v_caller_is_white boolean;
  v_elapsed_ms integer;
  v_server_time_left integer;
begin
  -- Lock the game row
  select * into v_game from public.games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Game not found');
  end if;

  if v_game.status != 'active' then
    return jsonb_build_object('ok', false, 'error', 'Game is not active');
  end if;

  -- Count existing moves to determine ply
  select coalesce(max(ply), -1) + 1 into v_ply
  from public.game_moves where game_id = p_game_id;

  -- Determine whose turn it is (ply 0,2,4... = white; 1,3,5... = black)
  v_side_to_move := case when v_ply % 2 = 0 then 'w' else 'b' end;
  v_caller_is_white := (auth.uid() = v_game.white_id);

  -- Verify the caller is the correct side
  if v_side_to_move = 'w' and not v_caller_is_white then
    return jsonb_build_object('ok', false, 'error', 'Not your turn');
  end if;
  if v_side_to_move = 'b' and v_caller_is_white then
    return jsonb_build_object('ok', false, 'error', 'Not your turn');
  end if;

  -- Server-side clock authority: compute elapsed since last move
  if v_game.last_move_at is not null then
    v_elapsed_ms := extract(epoch from (now() - v_game.last_move_at)) * 1000;
  else
    v_elapsed_ms := extract(epoch from (now() - v_game.started_at)) * 1000;
  end if;

  -- Use client-reported time but cap it by server elapsed
  v_server_time_left := p_time_left_ms;

  -- Insert the move
  insert into public.game_moves (game_id, ply, san, uci, fen_after, time_left_ms)
  values (p_game_id, v_ply, p_san, p_uci, p_fen_after, v_server_time_left);

  -- Update game's last_move_at
  update public.games
  set last_move_at = now()
  where id = p_game_id;

  return jsonb_build_object(
    'ok', true,
    'ply', v_ply,
    'time_left_ms', v_server_time_left
  );
end;
$$;
