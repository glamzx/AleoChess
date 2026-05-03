create extension if not exists pg_cron with schema extensions;

create table public.city_score_events (
  id bigserial primary key,
  city_id integer not null references public.cities(id),
  user_id uuid not null references public.profiles(id),
  game_id uuid references public.games(id) on delete cascade,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index city_score_events_city_idx on public.city_score_events(city_id, created_at);

create table public.city_leaderboard_snapshots (
  id bigserial primary key,
  city_id integer not null references public.cities(id),
  score integer not null,
  active_players integer not null,
  captured_at timestamptz not null default now()
);

create index city_leaderboard_snapshots_city_time_idx on public.city_leaderboard_snapshots(city_id, captured_at desc);

alter table public.city_score_events enable row level security;
alter table public.city_leaderboard_snapshots enable row level security;

drop policy if exists city_score_events_public_read on public.city_score_events;
create policy city_score_events_public_read
  on public.city_score_events for select
  using (true);

drop policy if exists city_leaderboard_snapshots_public_read on public.city_leaderboard_snapshots;
create policy city_leaderboard_snapshots_public_read
  on public.city_leaderboard_snapshots for select
  using (true);

create materialized view public.city_leaderboard_weekly as
  select c.id as city_id,
         c.name,
         c.country_code,
         c.latitude,
         c.longitude,
         coalesce(sum(e.points), 0)::integer as score,
         count(distinct e.user_id)::integer as active_players,
         coalesce((
           select s.score
           from public.city_leaderboard_snapshots s
           where s.city_id = c.id
             and s.captured_at <= now() - interval '7 days'
           order by s.captured_at desc
           limit 1
         ), 0)::integer as previous_score
  from public.cities c
  left join public.city_score_events e on e.city_id = c.id
    and e.created_at > now() - interval '7 days'
  group by c.id;

create unique index city_leaderboard_weekly_city_id_idx on public.city_leaderboard_weekly(city_id);
create index city_leaderboard_weekly_score_idx on public.city_leaderboard_weekly(score desc, active_players desc);

create or replace function public.refresh_city_leaderboard()
returns void language sql as $$
  refresh materialized view concurrently public.city_leaderboard_weekly;
  insert into public.city_leaderboard_snapshots (city_id, score, active_players)
  select city_id, score, active_players
  from public.city_leaderboard_weekly
  where score > 0 or active_players > 0;
  delete from public.city_leaderboard_snapshots
  where captured_at < now() - interval '30 days';
$$;

grant select on public.city_leaderboard_weekly to anon, authenticated;

do $$
begin
  perform cron.unschedule('refresh-city-leaderboard-hourly');
exception
  when others then null;
end $$;

select cron.schedule(
  'refresh-city-leaderboard-hourly',
  '0 * * * *',
  'select public.refresh_city_leaderboard();'
);
