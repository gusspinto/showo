-- ============================================================================
-- 162_join_class_sets_school.sql
--
-- join_class já herda organization_id e grade_level do professor/turma, mas
-- nunca tocava em profiles.school. Resultado: qualquer aluno que entrasse só
-- por código de turma ficava com school = null, mesmo a turma estando ligada
-- a uma escola real via classes.school_domain_id. Isto subestima o número de
-- escolas reais na plataforma (contadas via profiles.school).
--
-- Alinha com o resto da função: passa a preencher school a partir de
-- school_domains.name quando a turma tem escola associada, sem sobrescrever
-- um valor já existente no perfil.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_class(p_code text)
RETURNS TABLE(id uuid, name text, code text, teacher_name text, verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_class record;
  v_already_member boolean;
  v_still_there boolean;
  v_user_email text;
  v_email_domain text;
  v_school_domain text;
  v_school_name text;
  v_student_name text;
  v_teacher_org_id uuid;
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

    SELECT lower(sd.domain), sd.name INTO v_school_domain, v_school_name
    FROM public.school_domains sd
    WHERE sd.id = v_class.school_domain_id;

    IF v_school_domain IS NOT NULL AND v_email_domain != v_school_domain THEN
      RAISE EXCEPTION 'school_mismatch';
    END IF;
  END IF;

  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles WHERE id = v_class.teacher_id;
  END IF;

  UPDATE public.profiles
     SET account_type    = 'school',
         grade_level      = COALESCE(v_class.grade_level, public.profiles.grade_level),
         organization_id  = COALESCE(public.profiles.organization_id, v_teacher_org_id),
         school           = COALESCE(public.profiles.school, v_school_name)
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
$function$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
