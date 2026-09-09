-- ============================================================================
-- 139_teacher_pilot_notifications.sql
-- ----------------------------------------------------------------------------
-- Three fixes to the teacher <-> student notification loop found in the
-- 2026-09-09 audit:
--
--  1. CHECKIN_REPLY was never whitelisted in create_notification (029/047/056),
--     so every "professor respondeu ao teu check-in" call threw
--     'unknown notification type' and the student was never told.
--  2. PROJECT_SUBMITTED — a proper type for "aluno adicionou um projeto à
--     turma", instead of overloading STUDENT_JOINED for it.
--  3. join_class now tells the teacher when a student actually joins (not only
--     when they later add a project). Inserted directly since join_class is
--     already SECURITY DEFINER.
--
-- Base: create_notification from 056, join_class from 127. Full bodies
-- reproduced (the project applies migrations by hand).
-- ============================================================================

-- ── 1 + 2 · create_notification: add CHECKIN_REPLY and PROJECT_SUBMITTED ──
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

  elsif p_type = 'CHECKIN_REPLY' then
    -- teacher -> student in a class they teach
    if not exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.user_id = p_user_id and c.teacher_id = v_caller
    ) then
      raise exception 'caller does not teach a class p_user_id belongs to';
    end if;

  elsif p_type in ('STUDENT_JOINED', 'PROJECT_SUBMITTED') then
    -- student -> teacher whose class the student has a project in
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


-- ── 3 · join_class: notify the teacher on a genuine new join ──
-- Base: 127. Adds teacher_id to the class lookup and, when a membership row is
-- actually created (not for someone re-opening a class they already joined),
-- drops a STUDENT_JOINED notification straight into notifications.
DROP FUNCTION IF EXISTS public.join_class(text);

CREATE FUNCTION public.join_class(p_code text)
RETURNS table(id uuid, name text, code text, teacher_name text, verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class record;
  v_already_member boolean;
  v_still_there boolean;
  v_user_email text;
  v_email_domain text;
  v_school_domain text;
  v_student_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.teacher_id, c.school_domain_id, c.grade_level
  INTO v_class
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  IF v_class.school_domain_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE auth.users.id = auth.uid();
    v_email_domain := lower(split_part(lower(trim(v_user_email)), '@', 2));

    SELECT lower(sd.domain) INTO v_school_domain
    FROM public.school_domains sd
    WHERE sd.id = v_class.school_domain_id;

    IF v_school_domain IS NOT NULL AND v_email_domain != v_school_domain THEN
      RAISE EXCEPTION 'school_mismatch';
    END IF;
  END IF;

  UPDATE public.profiles
     SET account_type = 'school',
         grade_level  = COALESCE(v_class.grade_level, public.profiles.grade_level)
   WHERE public.profiles.id = auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = v_class.id AND user_id = auth.uid()
  ) INTO v_already_member;

  IF v_already_member THEN
    v_still_there := true;
  ELSE
    INSERT INTO public.class_members (class_id, user_id) VALUES (v_class.id, auth.uid());
    SELECT EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_id = v_class.id AND user_id = auth.uid()
    ) INTO v_still_there;

    -- Tell the teacher — only on a real first join.
    IF v_still_there AND v_class.teacher_id IS NOT NULL THEN
      SELECT COALESCE(p.full_name, p.username, 'Um aluno')
      INTO v_student_name
      FROM public.profiles p WHERE p.id = auth.uid();

      INSERT INTO public.notifications (user_id, type, message, project_slug, read)
      VALUES (
        v_class.teacher_id,
        'STUDENT_JOINED',
        v_student_name || ' entrou na turma "' || v_class.name || '".',
        NULL,
        false
      );
    END IF;
  END IF;

  RETURN QUERY SELECT v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
