-- ============================================================================
-- 127_class_grade_level.sql
-- ----------------------------------------------------------------------------
-- Ano de escolaridade da turma (10.º / 11.º / 12.º), distinto de
-- academic_year ("2025/2026"). O aluno herda o ano da turma ao entrar pelo
-- código — serve para mostrar a secção de Estágios só a 11.º e 12.º.
-- ============================================================================

ALTER TABLE public.classes  ADD COLUMN IF NOT EXISTS grade_level text;  -- '10' | '11' | '12'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level text;

GRANT SELECT (grade_level) ON public.classes  TO anon, authenticated;
GRANT SELECT (grade_level) ON public.profiles TO authenticated;
GRANT INSERT (grade_level), UPDATE (grade_level) ON public.classes TO authenticated;

-- ── join_class: entra na turma, promove a conta a 'school' e herda o ano ──
-- Recria a função inteira (base: migração 118) + o grade_level.
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.school_domain_id, c.grade_level
  INTO v_class
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  -- Turma ligada a uma escola: o email do aluno tem de ser do domínio.
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

  -- Entrou numa turma → conta institucional + herda o ano da turma.
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
  END IF;

  RETURN QUERY SELECT v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
