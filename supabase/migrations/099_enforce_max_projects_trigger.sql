-- Enforce maxProjects server-side via trigger (was frontend-only)
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
  SELECT coalesce(plan, 'free'), role, organization_id
    INTO v_plan, v_role, v_org_id
    FROM public.profiles
   WHERE id = NEW.user_id;

  IF v_role = 'professor' THEN v_plan := 'launch'; END IF;
  IF v_org_id IS NOT NULL AND v_role != 'professor' THEN v_plan := 'school'; END IF;

  v_limit := CASE
    WHEN v_plan = 'free'   THEN 3
    WHEN v_plan = 'school' THEN 10
    WHEN v_plan = 'build'  THEN 10
    WHEN v_plan = 'launch' THEN 999999
    ELSE 3
  END;

  SELECT count(*) INTO v_count
    FROM public.projects
   WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'max_projects_reached: limit is %', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_projects ON public.projects;
CREATE TRIGGER trg_enforce_max_projects
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_projects();
