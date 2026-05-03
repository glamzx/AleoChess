-- ========================================================================
-- 0002_games.sql — Games table for all game modes
--
-- Stores completed (and in-progress) games: PvP, bot, friend, tournament.
-- PGN is the authoritative move record; final_fen is convenience.
--
-- Apply with:
--   supabase db push
-- ========================================================================

create table public.games (
  id               uuid           primary key default gen_random_uuid(),
  white_id         uuid           references public.profiles(id) on delete set null,
  black_id         uuid           references public.profiles(id) on delete set null,
  mode             text           not null check (mode in ('bot','ranked','friend','tournament')),
  time_control     text           not null,
  status           text           not null check (status in ('active','checkmate','stalemate','draw','resigned','timeout','aborted')),
  result           text           check (result in ('1-0','0-1','1/2-1/2')),
  pgn              text           not null,
  final_fen        text,
  wager_amount     integer        not null default 0,
  elo_white_before integer,
  elo_black_before integer,
  elo_white_after  integer,
  elo_black_after  integer,
  started_at       timestamptz    not null default now(),
  ended_at         timestamptz
);

create index games_white_idx on public.games(white_id);
create index games_black_idx on public.games(black_id);

alter table public.games enable row level security;

-- Anyone can read completed games (public game history).
create policy "games_public_read" on public.games
  for select using (true);

-- Participants can read their own games (redundant with above but explicit).
create policy "games_participant_read" on public.games
  for select using (auth.uid() = white_id or auth.uid() = black_id);

-- A player can insert a game they participated in, or bot games where one
-- side is null.
create policy "games_self_insert" on public.games
  for insert with check (
    auth.uid() = white_id
    or auth.uid() = black_id
    or white_id is null
    or black_id is null
  );
