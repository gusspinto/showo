-- ============================================================================
-- 045_project_review_status.sql
-- ============================================================================
-- Lets a professor flag a project as "ready for defense" or "needs revision"
-- — a quick status visible to the student and across the whole turma, on top
-- of the freeform teacher_feedback comments. Direct UPDATE via RLS isn't an
-- option ("Owner update" from 022 restricts UPDATE to auth.uid()::text =
-- user_id), so this goes through a SECURITY DEFINER RPC, mirroring the
-- professor-role check already used for teacher_feedback (022, #5).
-- ============================================================================

alter table public.projects
  add column if not exists review_status text check (review_status in ('ready_for_defense', 'needs_revision')),
  add column if not exists review_status_updated_at timestamptz;

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
