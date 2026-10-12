-- "Inventário" de ficheiros por projeto — prova real (PDFs, Word, PowerPoint,
-- imagens) anexada a um projeto e mostrada na página pública, não escondida
-- numa biblioteca pessoal à parte. Serve qualquer projeto, não só os
-- "técnicos" (ao contrário do BD+API).
--
-- Limites por plano (MB por projeto, e um teto por conta só para quem tem
-- projetos ilimitados — sem isso, Pro = projetos ilimitados × MB por projeto
-- = exposição de custo sem teto):
--   free            → 0 (feature não disponível)
--   build/school    → 250MB por projeto, sem teto de conta (os 15/10 projetos
--                      já limitam o total a poucos GB)
--   launch/school_pro → 1GB por projeto, 5GB no total da conta

CREATE TABLE public.project_files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  file_url    text not null,
  file_name   text not null,
  file_type   text,
  size_bytes  bigint not null check (size_bytes > 0),
  created_at  timestamptz not null default now()
);

CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_project_files_user_id ON public.project_files(user_id);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own project files" ON public.project_files
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone reads files of public projects" ON public.project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (p.visibility IS NULL OR p.visibility = 'public')
    )
  );

-- Resolve plano real do dono (mesmo padrão de enforce_max_projects /
-- enforce_clean_slug_plan: professor→launch, conta de escola→school/school_pro).
CREATE OR REPLACE FUNCTION public.resolve_owner_plan(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_plan     text;
  v_role     text;
  v_org_id   uuid;
  v_org_plan text;
BEGIN
  SELECT coalesce(plan, 'free'), role, organization_id
    INTO v_plan, v_role, v_org_id
    FROM public.profiles
   WHERE id = p_user_id;

  IF v_role = 'professor' THEN
    RETURN 'launch';
  ELSIF v_org_id IS NOT NULL THEN
    SELECT plan INTO v_org_plan FROM public.organizations WHERE id = v_org_id;
    RETURN CASE WHEN v_org_plan = 'pro' THEN 'school_pro' ELSE 'school' END;
  END IF;

  RETURN coalesce(v_plan, 'free');
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_project_files_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_plan           text;
  v_per_project_mb int;
  v_account_mb     int;      -- NULL = sem teto de conta
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

CREATE TRIGGER trg_enforce_project_files_quota
  BEFORE INSERT ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_files_quota();

-- Storage: só o dono escreve/apaga no seu próprio prefixo (project_id/...),
-- leitura pública (o bucket já é public=true, isto é defesa extra no storage API).
CREATE POLICY "Owner uploads to own project-files prefix" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Owner deletes own project-files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Anyone reads project-files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-files');
