-- ============================================================================
-- 113_fix_max_projects_uuid_cast.sql
--
-- O trigger enforce_max_projects (099/111) faz `WHERE id = NEW.user_id` a
-- ligar profiles (id uuid) a projects.user_id (text) — dá
-- "operator does not exist: uuid = text" e QUALQUER insert de projeto full
-- rebenta. (Itens da Biblioteca e anexos escapavam porque o 111 devolve
-- cedo antes deste SELECT.)
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
  -- Anónimos e não-full (Biblioteca / anexos) não gastam quota.
  IF NEW.user_id IS NULL
     OR coalesce(NEW.entry_kind, 'full') <> 'full'
     OR NEW.parent_project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(plan, 'free'), role, organization_id
    INTO v_plan, v_role, v_org_id
    FROM public.profiles
   WHERE id = NEW.user_id::uuid;

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
