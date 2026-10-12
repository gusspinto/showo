-- Ajustes pedidos depois de construído o inventário de ficheiros (188):
-- 1) Visibilidade por ficheiro — o dono escolhe o que mostrar na página
--    pública e o que fica só para ele ver.
-- 2) Teto de conta explícito também no Plus (antes só o Pro tinha, por ter
--    projetos ilimitados). O Plus já estava naturalmente limitado a
--    15 projetos × 250MB = 3750MB — isto só torna esse teto explícito,
--    não o torna mais apertado.

ALTER TABLE public.project_files ADD COLUMN visible boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone reads files of public projects" ON public.project_files;
CREATE POLICY "Anyone reads visible files of public projects" ON public.project_files
  FOR SELECT
  USING (
    visible = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (p.visibility IS NULL OR p.visibility = 'public')
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_project_files_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_plan           text;
  v_per_project_mb int;
  v_account_mb     int;
  v_project_bytes  bigint;
  v_account_bytes  bigint;
BEGIN
  v_plan := public.resolve_owner_plan(NEW.user_id);

  v_per_project_mb := CASE
    WHEN v_plan IN ('build', 'school')          THEN 250
    WHEN v_plan IN ('launch', 'school_pro')     THEN 1024
    ELSE 0
  END;
  v_account_mb := CASE
    WHEN v_plan IN ('build', 'school')          THEN 3840
    WHEN v_plan IN ('launch', 'school_pro')     THEN 5120
    ELSE NULL
  END;

  IF v_per_project_mb = 0 THEN
    RAISE EXCEPTION 'project_files_requires_paid_plan';
  END IF;

  SELECT coalesce(sum(size_bytes), 0) INTO v_project_bytes
    FROM public.project_files WHERE project_id = NEW.project_id;
  IF v_project_bytes + NEW.size_bytes > v_per_project_mb::bigint * 1024 * 1024 THEN
    RAISE EXCEPTION 'project_files_project_limit_exceeded';
  END IF;

  IF v_account_mb IS NOT NULL THEN
    SELECT coalesce(sum(size_bytes), 0) INTO v_account_bytes
      FROM public.project_files WHERE user_id = NEW.user_id;
    IF v_account_bytes + NEW.size_bytes > v_account_mb::bigint * 1024 * 1024 THEN
      RAISE EXCEPTION 'project_files_account_limit_exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
