create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index analysis_jobs_game_unique on public.analysis_jobs(game_id);
create index analysis_jobs_status_created on public.analysis_jobs(status, created_at);

create table public.move_analyses (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null,
  played_uci text not null,
  best_uci text,
  eval_before_cp integer,
  eval_after_cp integer,
  classification text check (classification in ('best','good','inaccuracy','mistake','blunder','brilliant','book')),
  unique (game_id, ply)
);

create index move_analyses_game_ply on public.move_analyses(game_id, ply);

create table public.coach_explanations (
  id bigserial primary key,
  fen_before text not null,
  played_uci text not null,
  classification text not null,
  locale text not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  unique (fen_before, played_uci, classification, locale)
);

create index coach_explanations_lookup on public.coach_explanations(fen_before, played_uci, classification, locale);

alter table public.analysis_jobs enable row level security;
alter table public.move_analyses enable row level security;
alter table public.coach_explanations enable row level security;

drop policy if exists game_moves_bot_finished_insert on public.game_moves;
create policy game_moves_bot_finished_insert
  on public.game_moves for insert
  with check (
    exists (
      select 1
      from public.games g
      where g.id = game_moves.game_id
        and g.mode = 'bot'
        and g.status in ('checkmate', 'stalemate', 'draw', 'resigned', 'timeout', 'aborted')
        and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

drop policy if exists analysis_jobs_participants_read on public.analysis_jobs;
create policy analysis_jobs_participants_read
  on public.analysis_jobs for select
  using (
    exists (
      select 1
      from public.games g
      where g.id = analysis_jobs.game_id
        and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

drop policy if exists move_analyses_participants_read on public.move_analyses;
create policy move_analyses_participants_read
  on public.move_analyses for select
  using (
    exists (
      select 1
      from public.games g
      where g.id = move_analyses.game_id
        and (auth.uid() = g.white_id or auth.uid() = g.black_id)
    )
  );

drop policy if exists coach_explanations_public_read on public.coach_explanations;
create policy coach_explanations_public_read
  on public.coach_explanations for select
  using (true);

create or replace function public.save_move_analyses(
  p_game_id uuid,
  p_analyses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games%rowtype;
  item jsonb;
  saved_count integer := 0;
begin
  select * into g
  from public.games
  where id = p_game_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Game not found');
  end if;

  if auth.uid() is distinct from g.white_id and auth.uid() is distinct from g.black_id then
    return jsonb_build_object('ok', false, 'error', 'Not a participant');
  end if;

  for item in select * from jsonb_array_elements(p_analyses)
  loop
    insert into public.move_analyses (
      game_id,
      ply,
      played_uci,
      best_uci,
      eval_before_cp,
      eval_after_cp,
      classification
    ) values (
      p_game_id,
      (item->>'ply')::integer,
      item->>'played_uci',
      nullif(item->>'best_uci', ''),
      nullif(item->>'eval_before_cp', '')::integer,
      nullif(item->>'eval_after_cp', '')::integer,
      item->>'classification'
    )
    on conflict (game_id, ply) do update set
      played_uci = excluded.played_uci,
      best_uci = excluded.best_uci,
      eval_before_cp = excluded.eval_before_cp,
      eval_after_cp = excluded.eval_after_cp,
      classification = excluded.classification;

    saved_count := saved_count + 1;
  end loop;

  update public.analysis_jobs
  set status = 'done', completed_at = now()
  where game_id = p_game_id;

  return jsonb_build_object('ok', true, 'saved', saved_count);
end;
$$;

create or replace function public.enqueue_analysis_job_for_completed_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('checkmate', 'stalemate', 'draw', 'resigned', 'timeout') then
    insert into public.analysis_jobs (game_id, status)
    values (new.id, 'pending')
    on conflict (game_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists games_enqueue_analysis_job_insert on public.games;
create trigger games_enqueue_analysis_job_insert
  after insert on public.games
  for each row execute function public.enqueue_analysis_job_for_completed_game();

drop trigger if exists games_enqueue_analysis_job_update on public.games;
create trigger games_enqueue_analysis_job_update
  after update of status on public.games
  for each row
  when (old.status is distinct from new.status)
  execute function public.enqueue_analysis_job_for_completed_game();

do $$
begin
  alter publication supabase_realtime add table public.analysis_jobs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.move_analyses;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
