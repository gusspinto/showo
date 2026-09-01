-- ============================================================================
-- 110_project_attachments.sql — projetos como anexo de outro projeto.
--
-- Nem tudo merece página própria. Um trabalho de grupo pequeno pode ser
-- anexo de um projeto maior (ex.: "O meu percurso em Marketing" com 3
-- anexos); uma PAP merece página. `parent_project_id` liga um projeto ao
-- seu "pai". Anexos não aparecem sozinhos no Explorar/perfil — aparecem
-- dentro da página do pai.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_parent_idx
  ON public.projects (parent_project_id)
  WHERE parent_project_id IS NOT NULL;

GRANT SELECT (parent_project_id) ON public.projects TO anon;
GRANT SELECT (parent_project_id) ON public.projects TO authenticated;
