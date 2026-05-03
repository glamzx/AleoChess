drop function if exists public.refresh_city_leaderboard();
drop materialized view if exists public.city_leaderboard_weekly;

create materialized view public.city_leaderboard_weekly as
  select c.id as city_id,
         c.name,
         c.country_code,
         c.latitude,
         c.longitude,
         c.population,
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
create index city_leaderboard_weekly_score_idx on public.city_leaderboard_weekly(score desc, active_players desc, population desc);

grant select on public.city_leaderboard_weekly to anon, authenticated;

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

select public.refresh_city_leaderboard();
