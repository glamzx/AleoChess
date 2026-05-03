create table if not exists public.matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  elo integer not null,
  time_control text not null,
  queued_at timestamptz not null default now(),
  wager_amount integer not null default 0
);

create index if not exists matchmaking_tc_idx on public.matchmaking_queue(time_control, elo);

alter table public.matchmaking_queue enable row level security;

drop policy if exists matchmaking_self_read on public.matchmaking_queue;
create policy matchmaking_self_read
  on public.matchmaking_queue for select
  using (auth.uid() = user_id);

drop policy if exists matchmaking_self_insert on public.matchmaking_queue;
create policy matchmaking_self_insert
  on public.matchmaking_queue for insert
  with check (auth.uid() = user_id);

drop policy if exists matchmaking_self_delete on public.matchmaking_queue;
create policy matchmaking_self_delete
  on public.matchmaking_queue for delete
  using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.matchmaking_queue;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
