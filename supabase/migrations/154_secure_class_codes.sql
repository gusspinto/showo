-- ============================================================================
-- 154_secure_class_codes.sql
--
-- Duas correções da auditoria à parte de escolas/turmas:
--
-- 1. "Authenticated read classes" / "Anon read classes" tinham qual = true —
--    qualquer conta (até anónima, mas sem SELECT na coluna code) conseguia
--    listar TODAS as turmas da plataforma via REST, e qualquer conta
--    autenticada conseguia ler o code de qualquer turma de qualquer escola
--    (não só a sua). Isto tornava o "código da turma" — pensado para só ser
--    conhecido por quem o professor partilha — publicamente enumerável.
--    Restringe a leitura direta da tabela a "as tuas turmas" (professor
--    dono, ou aluno já membro) e move a pesquisa pública por código (usada
--    pela página /turma/:code, que também serve visitantes não autenticados)
--    para uma função SECURITY DEFINER que só devolve UMA turma quando o
--    código exato é fornecido — não permite listagem.
--
-- 2. join_class (o "Entrar numa turma" dentro da app, usado também ao
--    adicionar um projeto existente a uma turma) nunca herdava o
--    organization_id do professor, ao contrário de register_institutional_
--    student (usado só no registo inicial com código). Resultado: dois
--    alunos na mesma turma podiam ficar em planos de IA diferentes consoante
--    o caminho por onde entraram. Alinha os dois.
-- ============================================================================

-- ── 1a. Função pública de pesquisa por código exato (sem listagem) ─────────

CREATE OR REPLACE FUNCTION public.get_class_by_code(p_code text)
RETURNS TABLE(
  id uuid, name text, subject text, code text,
  teacher_id uuid, teacher_name text, academic_year text,
  grade_level text, show_ranking boolean, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT c.id, c.name, c.subject, c.code,
         c.teacher_id, c.teacher_name, c.academic_year,
         c.grade_level, c.show_ranking, c.created_at
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));
$$;

GRANT EXECUTE ON FUNCTION public.get_class_by_code(text) TO anon, authenticated;

-- ── 1b. Aperta a leitura direta da tabela ───────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read classes" ON public.classes;
DROP POLICY IF EXISTS "Anon read classes" ON public.classes;

CREATE POLICY "Owner or member reads class" ON public.classes
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.is_class_member(id));

-- Sem policy para anon: a leitura pública passa a ser só via
-- get_class_by_code (pesquisa por código exato, não listagem).

-- ── 2. join_class passa a herdar organization_id, como register_institutional_student ──

CREATE OR REPLACE FUNCTION public.join_class(p_code text)
RETURNS TABLE(id uuid, name text, code text, teacher_name text, verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles WHERE id = v_class.teacher_id;
  END IF;

  UPDATE public.profiles
     SET account_type    = 'school',
         grade_level      = COALESCE(v_class.grade_level, public.profiles.grade_level),
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
