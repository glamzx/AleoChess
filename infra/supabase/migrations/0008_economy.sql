create table if not exists public.coin_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  amount integer not null,
  reason text not null check (reason in (
    'signup_bonus','daily_quest','streak_bonus','daily_login',
    'wager_stake','wager_win','wager_refund',
    'puzzle_solve','rated_win',
    'shop_purchase','battlepass_reward','admin_grant'
  )),
  game_id uuid references public.games(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coin_tx_user_idx on public.coin_transactions(user_id, created_at desc);
create unique index if not exists coin_tx_wager_stake_once_idx
  on public.coin_transactions(user_id, game_id, reason)
  where reason = 'wager_stake' and game_id is not null;
create unique index if not exists coin_tx_wager_outcome_once_idx
  on public.coin_transactions(user_id, game_id, reason)
  where reason in ('wager_win', 'wager_refund') and game_id is not null;

alter table public.coin_transactions enable row level security;
drop policy if exists tx_self_read on public.coin_transactions;
create policy tx_self_read on public.coin_transactions for select using (auth.uid() = user_id);

create table if not exists public.daily_wager_state (
  user_id uuid primary key references public.profiles(id),
  date date not null,
  total_staked integer not null default 0
);

alter table public.daily_wager_state enable row level security;
drop policy if exists daily_wager_state_self_read on public.daily_wager_state;
create policy daily_wager_state_self_read on public.daily_wager_state for select using (auth.uid() = user_id);

create or replace function public.tg_apply_coin_transaction_balance()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set coin_balance = coin_balance + new.amount
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists apply_coin_transaction_balance on public.coin_transactions;
create trigger apply_coin_transaction_balance
  after insert on public.coin_transactions
  for each row execute function public.tg_apply_coin_transaction_balance();

create or replace function public.queue_ranked_match(
  p_time_control text,
  p_wager_amount integer
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_today date := timezone('utc', now())::date;
  v_state public.daily_wager_state%rowtype;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  if p_wager_amount not in (0, 50, 100, 200) then
    raise exception 'Invalid wager amount';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_wager_amount > 0 and v_profile.created_at > now() - interval '24 hours' then
    raise exception 'Wagers unlock 24 hours after signup';
  end if;

  if v_profile.coin_balance < p_wager_amount then
    raise exception 'Not enough coins for this wager';
  end if;

  insert into public.daily_wager_state (user_id, date, total_staked)
  values (v_user_id, v_today, 0)
  on conflict (user_id) do update set
    date = case when public.daily_wager_state.date = v_today then public.daily_wager_state.date else excluded.date end,
    total_staked = case when public.daily_wager_state.date = v_today then public.daily_wager_state.total_staked else 0 end
  returning * into v_state;

  if v_state.total_staked + p_wager_amount > 1000 then
    raise exception 'Daily wager cap reached';
  end if;

  insert into public.matchmaking_queue (user_id, elo, time_control, wager_amount, queued_at)
  values (v_user_id, v_profile.elo_rating, p_time_control, p_wager_amount, now())
  on conflict (user_id) do update set
    elo = excluded.elo,
    time_control = excluded.time_control,
    wager_amount = excluded.wager_amount,
    queued_at = excluded.queued_at;

  return jsonb_build_object(
    'ok', true,
    'coin_balance', v_profile.coin_balance,
    'remaining_daily_wager', 1000 - v_state.total_staked
  );
end;
$$;

create or replace function public.get_wager_allowance()
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_today date := timezone('utc', now())::date;
  v_total integer := 0;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  select case when date = v_today then total_staked else 0 end into v_total
  from public.daily_wager_state
  where user_id = v_user_id;

  return jsonb_build_object(
    'coin_balance', v_profile.coin_balance,
    'total_staked_today', coalesce(v_total, 0),
    'remaining_daily_wager', greatest(0, 1000 - coalesce(v_total, 0)),
    'wagers_enabled', v_profile.created_at <= now() - interval '24 hours'
  );
end;
$$;

create or replace function public.create_ranked_wager_game(
  p_white_id uuid,
  p_black_id uuid,
  p_time_control text,
  p_wager_amount integer,
  p_white_elo integer,
  p_black_elo integer
)
returns uuid language plpgsql security definer as $$
declare
  v_game_id uuid;
  v_today date := timezone('utc', now())::date;
  v_white public.profiles%rowtype;
  v_black public.profiles%rowtype;
  v_white_total integer := 0;
  v_black_total integer := 0;
begin
  if p_wager_amount not in (0, 50, 100, 200) then
    raise exception 'Invalid wager amount';
  end if;

  select * into v_white from public.profiles where id = p_white_id for update;
  select * into v_black from public.profiles where id = p_black_id for update;

  if not found or v_white.id is null or v_black.id is null then
    raise exception 'Profiles not found';
  end if;

  if p_wager_amount > 0 then
    if v_white.created_at > now() - interval '24 hours' or v_black.created_at > now() - interval '24 hours' then
      raise exception 'Wagers unlock 24 hours after signup';
    end if;

    if v_white.coin_balance < p_wager_amount or v_black.coin_balance < p_wager_amount then
      raise exception 'Not enough coins for wager';
    end if;

    insert into public.daily_wager_state (user_id, date, total_staked)
    values (p_white_id, v_today, 0)
    on conflict (user_id) do update set
      date = case when public.daily_wager_state.date = v_today then public.daily_wager_state.date else excluded.date end,
      total_staked = case when public.daily_wager_state.date = v_today then public.daily_wager_state.total_staked else 0 end;

    insert into public.daily_wager_state (user_id, date, total_staked)
    values (p_black_id, v_today, 0)
    on conflict (user_id) do update set
      date = case when public.daily_wager_state.date = v_today then public.daily_wager_state.date else excluded.date end,
      total_staked = case when public.daily_wager_state.date = v_today then public.daily_wager_state.total_staked else 0 end;

    select total_staked into v_white_total from public.daily_wager_state where user_id = p_white_id for update;
    select total_staked into v_black_total from public.daily_wager_state where user_id = p_black_id for update;

    if v_white_total + p_wager_amount > 1000 or v_black_total + p_wager_amount > 1000 then
      raise exception 'Daily wager cap reached';
    end if;
  end if;

  insert into public.games (white_id, black_id, mode, time_control, status, wager_amount, elo_white_before, elo_black_before, pgn)
  values (p_white_id, p_black_id, 'ranked', p_time_control, 'active', p_wager_amount, p_white_elo, p_black_elo, '*')
  returning id into v_game_id;

  if p_wager_amount > 0 then
    insert into public.coin_transactions (user_id, amount, reason, game_id, metadata)
    values
      (p_white_id, -p_wager_amount, 'wager_stake', v_game_id, jsonb_build_object('color', 'white')),
      (p_black_id, -p_wager_amount, 'wager_stake', v_game_id, jsonb_build_object('color', 'black'));

    update public.daily_wager_state
    set total_staked = total_staked + p_wager_amount
    where user_id in (p_white_id, p_black_id);
  end if;

  delete from public.matchmaking_queue where user_id in (p_white_id, p_black_id);

  return v_game_id;
end;
$$;

create or replace function public.apply_wager_outcome(p_game_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_game public.games%rowtype;
  v_stake integer;
  v_existing integer;
begin
  select * into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  v_stake := coalesce(v_game.wager_amount, 0);
  if v_stake <= 0 then
    return jsonb_build_object('ok', true, 'applied', false, 'reason', 'no_wager');
  end if;

  select count(*) into v_existing
  from public.coin_transactions
  where game_id = p_game_id
    and reason in ('wager_win', 'wager_refund');

  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'applied', false, 'reason', 'already_applied');
  end if;

  if v_game.result = '1-0' then
    insert into public.coin_transactions (user_id, amount, reason, game_id, metadata)
    values (v_game.white_id, v_stake * 2, 'wager_win', p_game_id, jsonb_build_object('result', v_game.result));
  elsif v_game.result = '0-1' then
    insert into public.coin_transactions (user_id, amount, reason, game_id, metadata)
    values (v_game.black_id, v_stake * 2, 'wager_win', p_game_id, jsonb_build_object('result', v_game.result));
  elsif v_game.result = '1/2-1/2' then
    insert into public.coin_transactions (user_id, amount, reason, game_id, metadata)
    values
      (v_game.white_id, v_stake, 'wager_refund', p_game_id, jsonb_build_object('result', v_game.result)),
      (v_game.black_id, v_stake, 'wager_refund', p_game_id, jsonb_build_object('result', v_game.result));
  else
    raise exception 'Game result missing';
  end if;

  return jsonb_build_object('ok', true, 'applied', true, 'stake', v_stake, 'result', v_game.result);
end;
$$;

grant execute on function public.queue_ranked_match(text, integer) to authenticated;
grant execute on function public.get_wager_allowance() to authenticated;
grant execute on function public.create_ranked_wager_game(uuid, uuid, text, integer, integer, integer) to service_role;
grant execute on function public.apply_wager_outcome(uuid) to service_role;
