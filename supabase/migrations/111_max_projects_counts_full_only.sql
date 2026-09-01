-- ============================================================================
-- 111_max_projects_counts_full_only.sql
--
-- O trigger do 099 conta TODOS os projetos do utilizador para o limite do
-- plano — incluindo itens da Biblioteca (entry_kind='library') e anexos
-- (parent_project_id). Resultado: quem tem uns quantos ficheiros na
-- Biblioteca fica com o INSERT bloqueado em qualquer coisa nova, mesmo
-- "guardar sem analisar". O frontend sempre contou só os projetos
-- AI-estruturados standalone — o servidor passa a fazer o mesmo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_max_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan   text;
  v_role   text;
  v_org_id uuid;
  v_limit  int;
  v_count  int;
BEGIN
  -- Só a ficha AI-estruturada standalone gasta quota. Biblioteca e anexos não.
  IF coalesce(NEW.entry_kind, 'full') <> 'full' OR NEW.parent_project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(plan, 'free'), role, organization_id
    INTO v_plan, v_role, v_org_id
    FROM public.profiles
   WHERE id = NEW.user_id;

  IF v_role = 'professor' THEN v_plan := 'launch'; END IF;
  IF v_org_id IS NOT NULL AND v_role <> 'professor' THEN v_plan := 'school'; END IF;

  v_limit := CASE
    WHEN v_plan = 'free'   THEN 3
    WHEN v_plan = 'school' THEN 10
    WHEN v_plan = 'build'  THEN 10
    WHEN v_plan = 'launch' THEN 999999
    ELSE 3
  END;

  SELECT count(*) INTO v_count
    FROM public.projects
   WHERE user_id = NEW.user_id
     AND entry_kind = 'full'
     AND parent_project_id IS NULL;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'max_projects_reached: limit is %', v_limit;
  END IF;

  RETURN NEW;
END;
$$;
