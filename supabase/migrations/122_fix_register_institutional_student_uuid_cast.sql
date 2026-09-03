-- ============================================================
-- 122 — Corrige "operator does not exist: uuid = text" no
--        register_institutional_student (e re-afirma o join_class).
-- ------------------------------------------------------------
-- A 115 (student_inherits_org_from_teacher) reescreveu
-- register_institutional_student com:
--   v_user_id := auth.uid()::text
--   ... WHERE id = v_class.teacher_id::text
--   UPDATE public.profiles ... WHERE id = v_user_id
-- profiles.id é uuid, por isso todas essas comparações rebentam.
--
-- Efeito: registar-se com código de turma cria a conta mas NÃO liga o
-- aluno à turma nem lhe põe account_type='school' — fica com a mensagem
-- "houve um erro ao entrar na turma".
--
-- Recria a função com uuid em todo o lado. Também recria o join_class
-- na versão correta (117/118) — a 115 do Gustavo trouxe outra vez a
-- versão com o cast e o gate, e a ordem de aplicação das migrações não
-- é garantida.
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_institutional_student(p_class_code TEXT, p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  SELECT c.id, c.name, c.school_domain_id, c.teacher_id
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
         organization_id = coalesce(v_teacher_org_id, organization_id)
   WHERE id = v_uid;

  INSERT INTO public.class_members (class_id, user_id)
  VALUES (v_class.id, v_uid)
  ON CONFLICT (class_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'class_name', v_class.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_institutional_student(TEXT, TEXT) TO authenticated;

-- ── Re-afirma join_class na versão correta (sem cast, sem gate, promove) ──
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
  v_teacher_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.school_domain_id, c.teacher_id INTO v_class
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  IF v_class.school_domain_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE auth.users.id = auth.uid();
    v_email_domain := lower(split_part(lower(trim(v_user_email)), '@', 2));
    SELECT lower(sd.domain) INTO v_school_domain
    FROM public.school_domains sd WHERE sd.id = v_class.school_domain_id;
    IF v_school_domain IS NOT NULL AND v_email_domain != v_school_domain THEN
      RAISE EXCEPTION 'school_mismatch';
    END IF;
  END IF;

  UPDATE public.profiles SET account_type = 'school' WHERE profiles.id = auth.uid();

  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles WHERE id = v_class.teacher_id;
    IF v_teacher_org_id IS NOT NULL THEN
      UPDATE public.profiles SET organization_id = v_teacher_org_id
       WHERE id = auth.uid() AND organization_id IS NULL;
    END IF;
  END IF;

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
  END IF;

  RETURN QUERY SELECT v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
