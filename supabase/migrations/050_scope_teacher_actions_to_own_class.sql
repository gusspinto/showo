-- ============================================================================
-- 050_scope_teacher_actions_to_own_class.sql
-- ============================================================================
-- Every "professor" action on a project (leaving teacher_feedback, flagging
-- review_status, grading via teacher_score) only ever checked
-- `role = 'professor'` — any professor account could grade/flag/comment on
-- ANY project in the app, not just ones submitted by their own students.
-- Scopes all three to projects that actually belong to a class this teacher
-- teaches. Outside of that, a professor now falls through to the same
-- PublicView a plain visitor gets (ProjectPage.jsx's isProfessor already
-- gates that render branch — this migration is what makes the underlying
-- authorization match what the UI now checks, so hiding the buttons isn't
-- the only thing stopping this).
-- ============================================================================

create or replace function public.is_project_in_my_class(p_project_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.class_projects cp
    join public.classes c on c.id = cp.class_id
    where cp.project_id = p_project_id and c.teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_project_in_my_class(uuid) to authenticated;

-- ── teacher_feedback: require the project to be in one of this teacher's classes ──
drop policy if exists "Teacher insert feedback" on public.teacher_feedback;
drop policy if exists "Teacher update feedback" on public.teacher_feedback;
drop policy if exists "Teacher delete feedback" on public.teacher_feedback;

create policy "Teacher insert feedback"
  on public.teacher_feedback for insert
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'professor')
    and public.is_project_in_my_class(project_id)
  );

create policy "Teacher update feedback"
  on public.teacher_feedback for update
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'professor')
    and public.is_project_in_my_class(project_id)
  );

create policy "Teacher delete feedback"
  on public.teacher_feedback for delete
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'professor')
    and public.is_project_in_my_class(project_id)
  );

-- ── set_project_review_status: same class-scoping ──
create or replace function public.set_project_review_status(p_project_id uuid, p_status text)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'professor') then
    raise exception 'Not authorized';
  end if;

  if not public.is_project_in_my_class(p_project_id) then
    raise exception 'Not authorized';
  end if;

  if p_status is not null and p_status not in ('ready_for_defense', 'needs_revision') then
    raise exception 'invalid status';
  end if;

  update public.projects
  set review_status = p_status,
      review_status_updated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_review_status(uuid, text) to authenticated;

-- ── set_project_teacher_score: same class-scoping ──
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

  if not public.is_project_in_my_class(p_project_id) then
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
