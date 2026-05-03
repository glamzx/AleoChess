-- Retention layer: streaks, daily quests, login bonus, and Battle Pass.
-- Note: 0008_economy.sql already exists, so this migration uses the next
-- available version while implementing the requested 0008_retention schema.

alter table public.profiles
  add column if not exists longest_streak integer not null default 0,
  add column if not exists streak_grace_month text,
  add column if not exists streak_grace_tokens_used integer not null default 0;

create table if not exists public.daily_quests (
  id text primary key,
  name text not null,
  description text not null,
  reward_coins integer not null,
  reward_xp integer not null,
  condition jsonb not null
);

create table if not exists public.user_daily_quests (
  user_id uuid not null references public.profiles(id),
  quest_id text not null references public.daily_quests(id),
  date date not null,
  progress integer not null default 0,
  target integer not null,
  completed_at timestamptz,
  primary key (user_id, quest_id, date)
);

create table if not exists public.battlepass_seasons (
  id integer primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_premium_only_track boolean not null default false
);

create table if not exists public.battlepass_tiers (
  season_id integer not null references public.battlepass_seasons(id),
  tier integer not null,
  xp_required integer not null,
  free_reward jsonb,
  premium_reward jsonb,
  primary key (season_id, tier)
);

create table if not exists public.user_battlepass (
  user_id uuid not null references public.profiles(id),
  season_id integer not null references public.battlepass_seasons(id),
  xp integer not null default 0,
  premium boolean not null default false,
  claimed_free_tiers integer[] not null default '{}',
  claimed_premium_tiers integer[] not null default '{}',
  primary key (user_id, season_id)
);

create index if not exists user_daily_quests_user_date_idx
  on public.user_daily_quests(user_id, date);
create index if not exists battlepass_seasons_active_idx
  on public.battlepass_seasons(starts_at, ends_at);

create unique index if not exists coin_tx_daily_login_once_idx
  on public.coin_transactions(user_id, reason, ((metadata->>'date')))
  where reason = 'daily_login';

alter table public.daily_quests enable row level security;
alter table public.user_daily_quests enable row level security;
alter table public.battlepass_seasons enable row level security;
alter table public.battlepass_tiers enable row level security;
alter table public.user_battlepass enable row level security;

drop policy if exists daily_quests_public_read on public.daily_quests;
create policy daily_quests_public_read on public.daily_quests for select using (true);

drop policy if exists user_daily_quests_self_read on public.user_daily_quests;
create policy user_daily_quests_self_read on public.user_daily_quests
  for select using (auth.uid() = user_id);

drop policy if exists battlepass_seasons_public_read on public.battlepass_seasons;
create policy battlepass_seasons_public_read on public.battlepass_seasons for select using (true);

drop policy if exists battlepass_tiers_public_read on public.battlepass_tiers;
create policy battlepass_tiers_public_read on public.battlepass_tiers for select using (true);

drop policy if exists user_battlepass_self_read on public.user_battlepass;
create policy user_battlepass_self_read on public.user_battlepass
  for select using (auth.uid() = user_id);

insert into public.daily_quests (id, name, description, reward_coins, reward_xp, condition)
values
  ('play_1_game', 'Play 1 game', 'Finish any game mode.', 20, 120, '{"kind":"play_games","count":1}'),
  ('win_2_black', 'Win 2 as Black', 'Win two games while playing black.', 45, 220, '{"kind":"win_games_color","color":"black","count":2}'),
  ('solve_5_puzzles', 'Puzzle Sprint', 'Solve five puzzles today.', 35, 180, '{"kind":"solve_puzzles","count":5}'),
  ('play_1_ranked', 'Enter Ranked', 'Play one ranked game.', 25, 140, '{"kind":"play_ranked","count":1}'),
  ('win_wager', 'High Stakes', 'Win a game with a wager.', 60, 280, '{"kind":"win_wager","count":1}'),
  ('elo_gain_100', 'Rapid Climber', 'Gain 100 Elo in one session.', 75, 350, '{"kind":"elo_gain_session","count":100}'),
  ('capture_queen', 'Queen Hunter', 'Capture an opponent queen.', 35, 180, '{"kind":"capture_piece","piece":"queen","count":1}'),
  ('mate_keep_queen', 'Clean Mate', 'Checkmate without losing your queen.', 55, 260, '{"kind":"checkmate_without_losing_queen","count":1}'),
  ('three_time_controls', 'Time Traveler', 'Play three different time controls.', 40, 220, '{"kind":"different_time_controls","count":3}'),
  ('win_1_white', 'Win as White', 'Win one game as white.', 30, 150, '{"kind":"win_games_color","color":"white","count":1}'),
  ('play_3_games', 'Triple Board', 'Finish three games.', 50, 240, '{"kind":"play_games","count":3}'),
  ('solve_1_puzzle', 'Daily Tactic', 'Solve one puzzle.', 15, 80, '{"kind":"solve_puzzles","count":1}'),
  ('win_1_ranked', 'Rated Victory', 'Win a ranked game.', 50, 250, '{"kind":"win_ranked","count":1}'),
  ('play_blitz', 'Blitz Board', 'Play one blitz game.', 20, 100, '{"kind":"play_time_control_family","family":"blitz","count":1}'),
  ('play_rapid', 'Rapid Board', 'Play one rapid game.', 20, 100, '{"kind":"play_time_control_family","family":"rapid","count":1}'),
  ('make_20_moves', 'Piece Workout', 'Make 20 moves across games.', 25, 130, '{"kind":"make_moves","count":20}'),
  ('win_2_games', 'Two Victories', 'Win two games.', 55, 260, '{"kind":"win_games","count":2}'),
  ('draw_game', 'Hold the Line', 'Draw one game.', 25, 140, '{"kind":"draw_games","count":1}'),
  ('no_blunders', 'Steady Hands', 'Complete a reviewed game with no blunders.', 45, 230, '{"kind":"no_blunder_game","count":1}'),
  ('castle_game', 'Castle Early', 'Castle in a game.', 20, 110, '{"kind":"castle","count":1}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  reward_coins = excluded.reward_coins,
  reward_xp = excluded.reward_xp,
  condition = excluded.condition;

insert into public.battlepass_seasons (id, name, starts_at, ends_at)
values (1, 'Genesis Season', '2026-05-01 00:00:00+00', '2026-06-30 00:00:00+00')
on conflict (id) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into public.battlepass_tiers (season_id, tier, xp_required, free_reward, premium_reward)
select
  1,
  tier,
  tier * 1000,
  case
    when tier % 10 = 0 then jsonb_build_object('type', 'skin', 'item_id', 'sticker.tier_' || tier)
    else jsonb_build_object('type', 'coins', 'amount', 50 + tier * 5)
  end,
  case
    when tier % 10 = 0 then jsonb_build_object('type', 'skin', 'item_id', 'board.royale_' || tier)
    when tier % 5 = 0 then jsonb_build_object('type', 'skin', 'item_id', 'pieces.pro_' || tier)
    else jsonb_build_object('type', 'coins', 'amount', 100 + tier * 10)
  end
from generate_series(1, 50) as tier
on conflict (season_id, tier) do update set
  xp_required = excluded.xp_required,
  free_reward = excluded.free_reward,
  premium_reward = excluded.premium_reward;

create or replace function public.get_active_battlepass_season()
returns public.battlepass_seasons
language sql
stable
set search_path = public
as $$
  select *
  from public.battlepass_seasons
  where starts_at <= now()
    and ends_at > now()
  order by starts_at desc
  limit 1
$$;

create or replace function public.ensure_user_battlepass(p_user_id uuid)
returns public.user_battlepass
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.battlepass_seasons%rowtype;
  v_pass public.user_battlepass%rowtype;
begin
  select * into v_season from public.get_active_battlepass_season();
  if v_season.id is null then
    raise exception 'No active battle pass season';
  end if;

  insert into public.user_battlepass (user_id, season_id)
  values (p_user_id, v_season.id)
  on conflict (user_id, season_id) do nothing;

  select * into v_pass
  from public.user_battlepass
  where user_id = p_user_id and season_id = v_season.id;

  return v_pass;
end;
$$;

create or replace function public.award_battlepass_xp(p_user_id uuid, p_xp integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass public.user_battlepass%rowtype;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Cannot award Battle Pass XP to another user';
  end if;

  if p_xp <= 0 then
    return jsonb_build_object('ok', true, 'awarded_xp', 0);
  end if;

  v_pass := public.ensure_user_battlepass(p_user_id);

  update public.user_battlepass
  set xp = xp + p_xp
  where user_id = v_pass.user_id
    and season_id = v_pass.season_id
  returning * into v_pass;

  return jsonb_build_object('ok', true, 'season_id', v_pass.season_id, 'xp', v_pass.xp);
end;
$$;

create or replace function public.generate_daily_quests_for_user(
  p_user_id uuid,
  p_date date default timezone('utc', now())::date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Cannot generate quests for another user';
  end if;

  insert into public.user_daily_quests (user_id, quest_id, date, target)
  select p_user_id, q.id, p_date, coalesce((q.condition->>'count')::integer, 1)
  from (
    select *
    from public.daily_quests
    where id = 'play_1_game'
    union all
    select *
    from (
      select *
      from public.daily_quests
      where id <> 'play_1_game'
      order by random()
      limit 2
    ) random_quests
  ) q
  on conflict (user_id, quest_id, date) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.generate_daily_quests_for_all(
  p_date date default timezone('utc', now())::date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_profile record;
begin
  for v_profile in select id from public.profiles loop
    v_count := v_count + public.generate_daily_quests_for_user(v_profile.id, p_date);
  end loop;
  return v_count;
end;
$$;

create or replace function public.tick_streak(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_today date := timezone('utc', now())::date;
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_new_streak integer;
  v_login_bonus integer := 0;
  v_used_grace boolean := false;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Cannot tick another user streak';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.streak_grace_month is distinct from v_month then
    update public.profiles
    set streak_grace_month = v_month,
        streak_grace_tokens_used = 0
    where id = p_user_id
    returning * into v_profile;
  end if;

  if v_profile.streak_last_at = v_today then
    return jsonb_build_object(
      'ok', true,
      'streak_count', v_profile.streak_count,
      'longest_streak', v_profile.longest_streak,
      'login_bonus', 0,
      'used_grace', false,
      'already_ticked', true
    );
  end if;

  if v_profile.streak_last_at = v_today - 1 then
    v_new_streak := v_profile.streak_count + 1;
  elsif v_profile.pro_until > now()
    and v_profile.streak_last_at = v_today - 2
    and v_profile.streak_grace_tokens_used < 2 then
    v_new_streak := v_profile.streak_count + 1;
    v_used_grace := true;
  else
    v_new_streak := 1;
  end if;

  update public.profiles
  set streak_count = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      streak_last_at = v_today,
      streak_grace_tokens_used = streak_grace_tokens_used + case when v_used_grace then 1 else 0 end
  where id = p_user_id
  returning * into v_profile;

  v_login_bonus := least(100, 10 + (v_profile.streak_count * 2));

  insert into public.coin_transactions (user_id, amount, reason, metadata)
  values (
    p_user_id,
    v_login_bonus,
    'daily_login',
    jsonb_build_object('date', v_today, 'streak_count', v_profile.streak_count, 'used_grace', v_used_grace)
  )
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'streak_count', v_profile.streak_count,
    'longest_streak', v_profile.longest_streak,
    'login_bonus', v_login_bonus,
    'used_grace', v_used_grace,
    'already_ticked', false
  );
end;
$$;

create or replace function public.quest_event_delta(p_condition jsonb, p_event jsonb)
returns integer
language plpgsql
immutable
as $$
declare
  v_kind text := p_condition->>'kind';
  v_event_kind text := p_event->>'kind';
begin
  if v_kind = 'play_games' and v_event_kind = 'game_played' then
    return 1;
  elsif v_kind = 'win_games' and v_event_kind = 'game_played' and (p_event->>'won')::boolean then
    return 1;
  elsif v_kind = 'win_games_color' and v_event_kind = 'game_played'
    and (p_event->>'won')::boolean
    and p_event->>'color' = p_condition->>'color' then
    return 1;
  elsif v_kind = 'solve_puzzles' and v_event_kind = 'puzzle_solved' then
    return 1;
  elsif v_kind = 'play_ranked' and v_event_kind = 'game_played' and p_event->>'mode' = 'ranked' then
    return 1;
  elsif v_kind = 'win_ranked' and v_event_kind = 'game_played' and p_event->>'mode' = 'ranked' and (p_event->>'won')::boolean then
    return 1;
  elsif v_kind = 'win_wager' and v_event_kind = 'game_played' and (p_event->>'won')::boolean and coalesce((p_event->>'wager_amount')::integer, 0) > 0 then
    return 1;
  elsif v_kind = 'elo_gain_session' and v_event_kind = 'game_played' then
    return greatest(0, coalesce((p_event->>'elo_delta')::integer, 0));
  elsif v_kind = 'capture_piece' and v_event_kind = 'game_played' and (p_event->'captured_pieces') ? (p_condition->>'piece') then
    return 1;
  elsif v_kind = 'checkmate_without_losing_queen' and v_event_kind = 'game_played'
    and p_event->>'status' = 'checkmate'
    and (p_event->>'won')::boolean
    and not coalesce((p_event->>'lost_queen')::boolean, false) then
    return 1;
  elsif v_kind = 'different_time_controls' and v_event_kind = 'game_played' then
    return 1;
  elsif v_kind = 'play_time_control_family' and v_event_kind = 'game_played' and p_event->>'time_control_family' = p_condition->>'family' then
    return 1;
  elsif v_kind = 'make_moves' and v_event_kind = 'game_played' then
    return greatest(0, coalesce((p_event->>'moves')::integer, 1));
  elsif v_kind = 'draw_games' and v_event_kind = 'game_played' and p_event->>'result' = '1/2-1/2' then
    return 1;
  elsif v_kind = 'no_blunder_game' and v_event_kind = 'game_played' and coalesce((p_event->>'blunders')::integer, 0) = 0 then
    return 1;
  elsif v_kind = 'castle' and v_event_kind = 'game_played' and coalesce((p_event->>'castled')::boolean, false) then
    return 1;
  end if;

  return 0;
exception
  when others then
    return 0;
end;
$$;

create or replace function public.apply_quest_reward(
  p_user_id uuid,
  p_quest_id text,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest public.daily_quests%rowtype;
begin
  select q.* into v_quest
  from public.daily_quests q
  join public.user_daily_quests uq on uq.quest_id = q.id
  where uq.user_id = p_user_id
    and uq.quest_id = p_quest_id
    and uq.date = p_date
    and uq.completed_at is not null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Quest is not completed');
  end if;

  insert into public.coin_transactions (user_id, amount, reason, metadata)
  values (
    p_user_id,
    v_quest.reward_coins,
    'daily_quest',
    jsonb_build_object('quest_id', p_quest_id, 'date', p_date)
  );

  perform public.award_battlepass_xp(p_user_id, v_quest.reward_xp);

  return jsonb_build_object('ok', true, 'coins', v_quest.reward_coins, 'xp', v_quest.reward_xp);
end;
$$;

create or replace function public.process_retention_event(
  p_user_id uuid,
  p_event jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('utc', now())::date;
  v_streak jsonb;
  v_row record;
  v_delta integer;
  v_completed jsonb := '[]'::jsonb;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Cannot process another user retention event';
  end if;

  v_streak := public.tick_streak(p_user_id);
  perform public.generate_daily_quests_for_user(p_user_id, v_today);
  perform public.ensure_user_battlepass(p_user_id);

  for v_row in
    select uq.user_id, uq.quest_id, uq.date, uq.progress, uq.target, uq.completed_at,
           q.condition, q.reward_coins, q.reward_xp
    from public.user_daily_quests uq
    join public.daily_quests q on q.id = uq.quest_id
    where uq.user_id = p_user_id
      and uq.date = v_today
      and uq.completed_at is null
    for update of uq
  loop
    v_delta := public.quest_event_delta(v_row.condition, p_event);
    if v_delta > 0 then
      update public.user_daily_quests
      set progress = least(target, progress + v_delta),
          completed_at = case when progress + v_delta >= target then now() else completed_at end
      where user_id = v_row.user_id
        and quest_id = v_row.quest_id
        and date = v_row.date
      returning progress, completed_at into v_row.progress, v_row.completed_at;

      if v_row.completed_at is not null then
        perform public.apply_quest_reward(p_user_id, v_row.quest_id, v_row.date);
        v_completed := v_completed || jsonb_build_array(jsonb_build_object(
          'quest_id', v_row.quest_id,
          'reward_coins', v_row.reward_coins,
          'reward_xp', v_row.reward_xp
        ));
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'streak', v_streak, 'completed_quests', v_completed);
end;
$$;

create or replace function public.claim_battlepass_tier(
  p_tier integer,
  p_track text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pass public.user_battlepass%rowtype;
  v_tier public.battlepass_tiers%rowtype;
  v_reward jsonb;
  v_claimed integer[];
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;
  if p_track not in ('free', 'premium') then
    raise exception 'Invalid track';
  end if;

  v_pass := public.ensure_user_battlepass(v_user_id);

  select * into v_tier
  from public.battlepass_tiers
  where season_id = v_pass.season_id and tier = p_tier;

  if not found then
    raise exception 'Battle pass tier not found';
  end if;
  if v_pass.xp < v_tier.xp_required then
    raise exception 'Tier is locked';
  end if;
  if p_track = 'premium' and not v_pass.premium then
    raise exception 'Premium track is locked';
  end if;

  v_claimed := case when p_track = 'free' then v_pass.claimed_free_tiers else v_pass.claimed_premium_tiers end;
  if p_tier = any(v_claimed) then
    raise exception 'Tier already claimed';
  end if;

  v_reward := case when p_track = 'free' then v_tier.free_reward else v_tier.premium_reward end;

  if v_reward->>'type' = 'coins' then
    insert into public.coin_transactions (user_id, amount, reason, metadata)
    values (v_user_id, (v_reward->>'amount')::integer, 'battlepass_reward',
            jsonb_build_object('season_id', v_pass.season_id, 'tier', p_tier, 'track', p_track));
  end if;

  update public.user_battlepass
  set claimed_free_tiers = case when p_track = 'free' then array_append(claimed_free_tiers, p_tier) else claimed_free_tiers end,
      claimed_premium_tiers = case when p_track = 'premium' then array_append(claimed_premium_tiers, p_tier) else claimed_premium_tiers end
  where user_id = v_user_id
    and season_id = v_pass.season_id;

  return jsonb_build_object('ok', true, 'reward', v_reward, 'tier', p_tier, 'track', p_track);
end;
$$;

create or replace function public.get_retention_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := timezone('utc', now())::date;
  v_profile public.profiles%rowtype;
  v_pass public.user_battlepass%rowtype;
  v_season public.battlepass_seasons%rowtype;
  v_quests jsonb;
  v_tiers jsonb;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  perform public.generate_daily_quests_for_user(v_user_id, v_today);
  v_pass := public.ensure_user_battlepass(v_user_id);

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_season from public.battlepass_seasons where id = v_pass.season_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'name', q.name,
    'description', q.description,
    'reward_coins', q.reward_coins,
    'reward_xp', q.reward_xp,
    'progress', uq.progress,
    'target', uq.target,
    'completed_at', uq.completed_at
  ) order by uq.quest_id), '[]'::jsonb)
  into v_quests
  from public.user_daily_quests uq
  join public.daily_quests q on q.id = uq.quest_id
  where uq.user_id = v_user_id
    and uq.date = v_today;

  select coalesce(jsonb_agg(jsonb_build_object(
    'tier', t.tier,
    'xp_required', t.xp_required,
    'free_reward', t.free_reward,
    'premium_reward', t.premium_reward,
    'free_claimed', t.tier = any(v_pass.claimed_free_tiers),
    'premium_claimed', t.tier = any(v_pass.claimed_premium_tiers)
  ) order by t.tier), '[]'::jsonb)
  into v_tiers
  from public.battlepass_tiers t
  where t.season_id = v_pass.season_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'streak_count', v_profile.streak_count,
      'longest_streak', v_profile.longest_streak,
      'coin_balance', v_profile.coin_balance
    ),
    'daily_quests', v_quests,
    'battlepass', jsonb_build_object(
      'season', row_to_json(v_season),
      'user', row_to_json(v_pass),
      'tiers', v_tiers
    )
  );
end;
$$;

grant execute on function public.tick_streak(uuid) to authenticated, service_role;
grant execute on function public.process_retention_event(uuid, jsonb) to authenticated, service_role;
grant execute on function public.generate_daily_quests_for_user(uuid, date) to authenticated, service_role;
grant execute on function public.generate_daily_quests_for_all(date) to service_role;
grant execute on function public.award_battlepass_xp(uuid, integer) to authenticated, service_role;
grant execute on function public.claim_battlepass_tier(integer, text) to authenticated;
grant execute on function public.get_retention_summary() to authenticated;
