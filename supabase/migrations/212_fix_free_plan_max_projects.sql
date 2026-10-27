-- O limite de projetos do plano Grátis baixou de 3 para 2 (decisão de
-- produto, 2026-10-27: o Grátis dava demasiado, matava a conversão). O
-- enforce_max_projects() tinha o valor antigo hardcoded, igual ao padrão
-- já visto na migração 184 (Plus 10→15) e na 193 (School Pro). Mesma
-- correção: nova migração + CREATE OR REPLACE, nunca editar a antiga.

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
    WHEN v_plan = 'free'       THEN 2
    WHEN v_plan = 'school'     THEN 10
    WHEN v_plan = 'school_pro' THEN 30
    WHEN v_plan = 'build'      THEN 15
    WHEN v_plan = 'launch'     THEN 999999
    ELSE 2
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
