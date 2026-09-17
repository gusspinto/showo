-- ============================================================================
-- 162_profile_inherits_course_and_year.sql
--
-- "Sobre o criador" no editor de projeto (nome/curso/ano letivo/escola)
-- eram quatro inputs em branco que o aluno reescrevia a cada projeto. Para
-- contas de escola, esses dados já existem: curso = classes.subject, ano
-- letivo = classes.academic_year, escola = organizations.name (via
-- profiles.organization_id), nome = profiles.full_name. Só faltava herdar
-- curso e ano letivo para o perfil ao entrar na turma — grade_level já
-- seguia este padrão desde a 127; aqui junta-se course e academic_year à
-- mesma lógica, na mesma função (join_class, versão canónica: 154 + 158).
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_year TEXT;

GRANT SELECT (course, academic_year) ON public.profiles TO authenticated;

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
  v_student_name text;
  v_teacher_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.teacher_id, c.school_domain_id,
         c.grade_level, c.subject, c.academic_year
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

  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles WHERE id = v_class.teacher_id;
  END IF;

  UPDATE public.profiles
     SET account_type    = 'school',
         grade_level      = COALESCE(v_class.grade_level, public.profiles.grade_level),
         course           = COALESCE(v_class.subject, public.profiles.course),
         academic_year    = COALESCE(v_class.academic_year, public.profiles.academic_year),
         organization_id  = COALESCE(public.profiles.organization_id, v_teacher_org_id)
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

-- ── Mesma herança no registo inicial por código de turma (122) ─────────────

CREATE OR REPLACE FUNCTION public.register_institutional_student(p_class_code TEXT, p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_class RECORD;
  v_school RECORD;
  v_email_domain TEXT;
  v_uid UUID;
  v_teacher_org_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT c.id, c.name, c.school_domain_id, c.teacher_id, c.grade_level, c.subject, c.academic_year
    INTO v_class
    FROM public.classes c
   WHERE c.code = upper(trim(p_class_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'class_not_found');
  END IF;

  IF v_class.school_domain_id IS NOT NULL THEN
    SELECT sd.domain, sd.name INTO v_school
      FROM public.school_domains sd
     WHERE sd.id = v_class.school_domain_id;

    IF FOUND THEN
      v_email_domain := lower(split_part(lower(trim(p_email)), '@', 2));
      IF v_email_domain != lower(v_school.domain) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'domain_mismatch',
          'expected_domain', v_school.domain, 'school_name', v_school.name);
      END IF;
    END IF;
  END IF;

  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles
     WHERE id = v_class.teacher_id;
  END IF;

  UPDATE public.profiles
     SET account_type    = 'school',
         organization_id = coalesce(v_teacher_org_id, organization_id),
         grade_level      = COALESCE(v_class.grade_level, grade_level),
         course           = COALESCE(v_class.subject, course),
         academic_year    = COALESCE(v_class.academic_year, academic_year)
   WHERE id = v_uid;

  INSERT INTO public.class_members (class_id, user_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT (class_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'class_name', v_class.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_institutional_student(TEXT, TEXT) TO authenticated;
