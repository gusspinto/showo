-- enforce_max_projects reimplementava a resolução de plano à mão (role +
-- organization_id) e nunca olhava para organizations.plan, por isso toda a
-- conta de organização caía em 'school' com limite 10 — mesmo as de
-- School Pro, que deviam ter 30 (plans.js). Mesma classe de bug do
-- Plus 10→15 (migração 184), agora para School Pro. Passa a usar
-- resolve_owner_plan(), a mesma função já usada por
-- enforce_clean_slug_plan/enforce_project_files_quota, para não haver
-- uma terceira reimplementação da resolução de plano a dessincronizar.
CREATE OR REPLACE FUNCTION public.enforce_max_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_plan  text;
  v_limit int;
  v_count int;
BEGIN
  IF NEW.user_id IS NULL
     OR coalesce(NEW.entry_kind, 'full') <> 'full'
     OR NEW.parent_project_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_plan := public.resolve_owner_plan(NEW.user_id::uuid);

  v_limit := CASE
    WHEN v_plan = 'free'       THEN 3
    WHEN v_plan = 'school'     THEN 10
    WHEN v_plan = 'school_pro' THEN 30
    WHEN v_plan = 'build'      THEN 15
    WHEN v_plan = 'launch'     THEN 999999
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
$function$;
