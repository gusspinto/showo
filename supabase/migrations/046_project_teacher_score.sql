-- ============================================================================
-- 046_project_teacher_score.sql
-- ============================================================================
-- Replaces the jury_eval-in-teacher_feedback hack (a JSON blob stuffed into
-- teacher_feedback.comment, which is why it was leaking raw JSON into the
-- feedback list and never rehydrating) with a real 0-20 grade stored
-- directly on the project — same pattern as review_status (045): a plain
-- column, set through a SECURITY DEFINER RPC since direct UPDATE on
-- projects is owner-only via RLS (022, "Owner update").
-- ============================================================================

alter table public.projects
  add column if not exists teacher_score numeric check (teacher_score >= 0 and teacher_score <= 20),
  add column if not exists teacher_score_note text,
  add column if not exists teacher_score_ratings jsonb,
  add column if not exists teacher_score_by uuid references auth.users(id),
  add column if not exists teacher_score_updated_at timestamptz;

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
