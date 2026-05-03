-- ========================================================================
-- 0001_init.sql — Aleo Chess Royale schema bootstrap
--
-- Applies the initial public schema:
--   - public.cities      (FK target — declared first)
--   - public.profiles    (1-1 with auth.users via trigger)
--   - RLS policies
--   - on_auth_user_created trigger (auto-provisions a profile row)
--
-- Apply with:
--   supabase db push
--   # or, for production:
--   psql $DATABASE_URL -f infra/supabase/migrations/0001_init.sql
-- ========================================================================

-- pg_trgm is required for the trigram GIN index used in city autocomplete.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------- cities
-- Seeded from GeoNames in a later migration. Population sentinel: NULL
-- means "unknown" so we don't bias autocompletes against small towns.
create table if not exists public.cities (
  id            integer       primary key,
  name          text          not null,
  country_code  text          not null,
  latitude      double precision,
  longitude     double precision,
  population    integer,
  name_ru       text,
  name_kk       text
);

create index if not exists cities_name_trgm on public.cities using gin (name gin_trgm_ops);
create index if not exists cities_country   on public.cities (country_code);

-- --------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id              uuid          primary key references auth.users on delete cascade,
  username        text          unique not null,
  display_name    text,
  avatar_id       text,
  city_id         integer       references public.cities(id),
  country_code    text,
  elo_rating      integer       not null default 1200,
  coin_balance    integer       not null default 100,
  pro_until       timestamptz,
  streak_count    integer       not null default 0,
  streak_last_at  date,
  locale          text          not null default 'ru'
                                check (locale in ('ru', 'kk', 'en')),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- bump updated_at on every row mutation
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- --------------------------------------------------------------- RLS
alter table public.profiles enable row level security;

-- Self-read (kept explicit even though "public_read" subsumes it — useful
-- once we tighten the public policy later, e.g. to only expose username +
-- elo).
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
  on public.profiles for select
  using (auth.uid() = id);

-- Public usernames + ratings (used by leaderboards). Tighten via a view
-- if/when we want to hide PII columns.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
  on public.profiles for select
  using (true);

-- Each user can mutate only their own profile.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
  on public.profiles for update
  using (auth.uid() = id);

-- Inserts are reserved for the trigger (security definer) + the bootstrap
-- server action (which authenticates as the owner). Block everything else.
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles for insert
  with check (auth.uid() = id);

alter table public.cities enable row level security;
drop policy if exists cities_public_read on public.cities;
create policy cities_public_read
  on public.cities for select
  using (true);

-- ------------------------------------------------ auto-provision profile
-- Generates a starter username from raw_user_meta_data when present,
-- falling back to "player_<first 8 chars of uuid>". Idempotent on
-- conflict so re-running the trigger after a manual delete is safe.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  candidate text;
begin
  candidate := coalesce(
    new.raw_user_meta_data->>'preferred_username',
    'player_' || substr(new.id::text, 1, 8)
  );

  -- Best-effort: if the candidate username already exists, append a 4-char
  -- suffix derived from the uuid so the insert can succeed.
  if exists (select 1 from public.profiles where username = candidate) then
    candidate := candidate || '_' || substr(new.id::text, 9, 4);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- friend games
create table if not exists public.games (
  id                uuid          primary key default gen_random_uuid(),
  white_id          uuid          references public.profiles(id) on delete set null,
  black_id          uuid          references public.profiles(id) on delete set null,
  mode              text          not null default 'friend'
                                      check (mode in ('bot', 'ranked', 'friend', 'tournament')),
  time_control      text          not null,
  status            text          not null default 'waiting'
                                      check (status in ('waiting', 'active', 'checkmate', 'stalemate', 'draw', 'resigned', 'timeout', 'aborted')),
  last_move_at      timestamptz,
  result            text          check (result in ('1-0', '0-1', '1/2-1/2')),
  pgn               text          not null default '',
  final_fen         text,
  wager_amount      integer       not null default 0,
  elo_white_before  integer,
  elo_black_before  integer,
  elo_white_after   integer,
  elo_black_after   integer,
  started_at        timestamptz   not null default now(),
  ended_at          timestamptz
);

create index if not exists games_white on public.games(white_id);
create index if not exists games_black on public.games(black_id);
create index if not exists games_status on public.games(status);
create index if not exists games_started_at on public.games(started_at desc);

create table if not exists public.game_moves (
  id            bigint        generated always as identity primary key,
  game_id       uuid          not null references public.games(id) on delete cascade,
  ply           integer       not null,
  san           text          not null,
  uci           text          not null,
  fen_after     text          not null,
  time_left_ms  integer       not null,
  made_at       timestamptz   not null default now(),
  unique (game_id, ply)
);

create index if not exists game_moves_game_ply on public.game_moves(game_id, ply);

alter table public.games enable row level security;
drop policy if exists games_participants_read on public.games;
create policy games_participants_read
  on public.games for select
  using (
    auth.uid() = white_id
    or auth.uid() = black_id
    or status = 'waiting'
  );

drop policy if exists games_create_own on public.games;
create policy games_create_own
  on public.games for insert
  with check (auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists games_participants_update on public.games;
create policy games_participants_update
  on public.games for update
  using (auth.uid() = white_id or auth.uid() = black_id or status = 'waiting')
  with check (auth.uid() = white_id or auth.uid() = black_id);

alter table public.game_moves enable row level security;
drop policy if exists game_moves_participants_read on public.game_moves;
create policy game_moves_participants_read
  on public.game_moves for select
  using (
    exists (
      select 1
      from public.games g
      where g.id = game_moves.game_id
        and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

drop policy if exists game_moves_participants_insert on public.game_moves;
create policy game_moves_participants_insert
  on public.game_moves for insert
  with check (
    exists (
      select 1
      from public.games g
      where g.id = game_moves.game_id
        and g.status = 'active'
        and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

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
set search_path = public
as $$
declare
  g public.games%rowtype;
  next_ply integer;
begin
  select * into g
  from public.games
  where id = p_game_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Game not found');
  end if;

  if g.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Game is not active');
  end if;

  if auth.uid() is distinct from g.white_id and auth.uid() is distinct from g.black_id then
    return jsonb_build_object('ok', false, 'error', 'Not a participant');
  end if;

  select coalesce(max(ply), -1) + 1 into next_ply
  from public.game_moves
  where game_id = p_game_id;

  insert into public.game_moves (game_id, ply, san, uci, fen_after, time_left_ms)
  values (p_game_id, next_ply, p_san, p_uci, p_fen_after, p_time_left_ms)
  on conflict (game_id, ply) do nothing;

  update public.games
  set last_move_at = now(),
      final_fen = p_fen_after
  where id = p_game_id;

  return jsonb_build_object('ok', true, 'ply', next_ply);
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_moves;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
