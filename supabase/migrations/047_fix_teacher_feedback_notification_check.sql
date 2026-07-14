-- ============================================================================
-- 047_fix_teacher_feedback_notification_check.sql
-- ============================================================================
-- create_notification()'s authorization check for type='TEACHER_FEEDBACK'
-- (029) only allowed it when the caller had a row in teacher_feedback for
-- that student's project. Since 045/046 moved review_status and
-- teacher_score onto the projects table directly (no teacher_feedback row
-- involved), both the "marked ready/needs revision" and the "graded X/20"
-- notifications were silently failing that check and never sending.
--
-- Widened the check to also allow: the caller graded one of the student's
-- projects (teacher_score_by), or the caller teaches a class the student
-- has a project in — covers current and future teacher-initiated
-- notifications without requiring a teacher_feedback row to exist first.
-- ============================================================================

create or replace function public.create_notification(
  p_user_id      uuid,
  p_type         text,
  p_message      text,
  p_project_slug text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not authenticated';
  end if;

  if p_type in ('MISSION_COMPLETE', 'SCORE_MILESTONE') then
    if p_user_id <> v_caller then
      raise exception 'self-notification only';
    end if;

  elsif p_type = 'TEACHER_FEEDBACK' then
    if not exists (
      select 1 from public.teacher_feedback tf
      join public.projects p on p.id = tf.project_id
      where tf.teacher_id = v_caller and p.user_id = p_user_id::text
    ) and not exists (
      select 1 from public.projects p
      where p.user_id = p_user_id::text and p.teacher_score_by = v_caller
    ) and not exists (
      select 1 from public.projects p
      join public.class_projects cp on cp.project_id = p.id
      join public.classes c on c.id = cp.class_id
      where p.user_id = p_user_id::text and c.teacher_id = v_caller
    ) then
      raise exception 'caller has no feedback for that student';
    end if;

  elsif p_type = 'STUDENT_JOINED' then
    if not exists (
      select 1 from public.class_projects cp
      join public.projects p on p.id = cp.project_id
      join public.classes c  on c.id = cp.class_id
      where p.user_id = v_caller::text and c.teacher_id = p_user_id
    ) then
      raise exception 'caller has no project in that teacher''s class';
    end if;

  else
    raise exception 'unknown notification type: %', p_type;
  end if;

  insert into public.notifications (user_id, type, message, project_slug, read)
  values (p_user_id, p_type, p_message, p_project_slug, false);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text) to authenticated;
