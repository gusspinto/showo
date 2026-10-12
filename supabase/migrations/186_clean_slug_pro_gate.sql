-- "Portfólio pro com link limpo" — deixar o dono editar o slug do projeto
-- (tirar o sufixo aleatório, escolher o texto) é uma feature Pro. O dono já
-- pode fazer UPDATE direto em projects via RLS ("Owner update"), por isso o
-- gate de plano tem de ser aqui, não só no cliente — nunca confiar só na
-- verificação da UI para uma fronteira paga.
CREATE OR REPLACE FUNCTION public.enforce_clean_slug_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_plan   text;
  v_role   text;
  v_org_id uuid;
  v_org_plan text;
BEGIN
  IF NEW.slug = OLD.slug THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(plan, 'free'), role, organization_id
    INTO v_plan, v_role, v_org_id
    FROM public.profiles
   WHERE id = NEW.user_id::uuid;

  IF v_role = 'professor' THEN
    v_plan := 'launch';
  ELSIF v_org_id IS NOT NULL THEN
    SELECT plan INTO v_org_plan FROM public.organizations WHERE id = v_org_id;
    v_plan := CASE WHEN v_org_plan = 'pro' THEN 'school_pro' ELSE 'school' END;
  END IF;

  IF v_plan NOT IN ('launch', 'school_pro') THEN
    RAISE EXCEPTION 'clean_slug_requires_pro';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_clean_slug_plan ON public.projects;
CREATE TRIGGER trg_enforce_clean_slug_plan
  BEFORE UPDATE OF slug ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_clean_slug_plan();
