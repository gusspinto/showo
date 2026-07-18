-- ============================================================================
-- 056_task_notifications.sql
-- ============================================================================
-- Adds two notification types to create_notification()'s whitelist (029/047):
-- TASK_ASSIGNED (teacher -> each student in the class, when a task is
-- created) and TASK_COMPLETED (student -> the class's teacher, when they
-- check a task off). Same shape as the existing STUDENT_JOINED check —
-- caller must actually be the teacher/a member of a class shared with the
-- recipient, not an arbitrary pair of users.
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

  elsif p_type = 'TASK_ASSIGNED' then
    if not exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.user_id = p_user_id and c.teacher_id = v_caller
    ) then
      raise exception 'caller does not teach a class p_user_id belongs to';
    end if;

  elsif p_type = 'TASK_COMPLETED' then
    if not exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.user_id = v_caller and c.teacher_id = p_user_id
    ) then
      raise exception 'caller is not in a class taught by p_user_id';
    end if;

  else
    raise exception 'unknown notification type: %', p_type;
  end if;

  insert into public.notifications (user_id, type, message, project_slug, read)
  values (p_user_id, p_type, p_message, p_project_slug, false);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text) to authenticated;
