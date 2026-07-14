-- ============================================================================
-- 048_project_score_history.sql
-- ============================================================================
-- Re-evaluating a project (set_project_teacher_score, 046) silently
-- overwrote the previous grade with no trace of what it was or when it
-- changed. Adds a history table that set_project_teacher_score now writes
-- the OUTGOING score to (if one existed) right before applying the new one,
-- so both the professor and the student can see how the grade evolved.
-- ============================================================================

create table if not exists public.project_score_history (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  score      numeric not null,
  note       text,
  ratings    jsonb,
  teacher_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists project_score_history_project_id_idx on public.project_score_history(project_id);

alter table public.project_score_history enable row level security;

-- Readable by the project owner (student) and any professor (matches the
-- existing loose "any professor" visibility already used for teacher_feedback
-- and the evaluation card itself — this app doesn't scope evaluation access
-- to class membership at the DB layer).
drop policy if exists "Read own or as professor" on public.project_score_history;
create policy "Read own or as professor" on public.project_score_history
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()::text)
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'professor')
  );

-- No direct INSERT/UPDATE/DELETE policy: only set_project_teacher_score
-- (SECURITY DEFINER) writes here.
revoke insert, update, delete on public.project_score_history from anon, authenticated;

create or replace function public.set_project_teacher_score(
  p_project_id uuid,
  p_score numeric,
  p_note text default null,
  p_ratings jsonb default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_prev record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'professor') then
    raise exception 'Not authorized';
  end if;

  if p_score is null or p_score < 0 or p_score > 20 then
    raise exception 'invalid score';
  end if;

  select teacher_score, teacher_score_note, teacher_score_ratings, teacher_score_by, teacher_score_updated_at
    into v_prev
    from public.projects where id = p_project_id;

  if v_prev.teacher_score is not null then
    insert into public.project_score_history (project_id, score, note, ratings, teacher_id, created_at)
    values (p_project_id, v_prev.teacher_score, v_prev.teacher_score_note, v_prev.teacher_score_ratings,
            coalesce(v_prev.teacher_score_by, auth.uid()), coalesce(v_prev.teacher_score_updated_at, now()));
  end if;

  update public.projects
  set teacher_score = p_score,
      teacher_score_note = nullif(trim(coalesce(p_note, '')), ''),
      teacher_score_ratings = p_ratings,
      teacher_score_by = auth.uid(),
      teacher_score_updated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_teacher_score(uuid, numeric, text, jsonb) to authenticated;
