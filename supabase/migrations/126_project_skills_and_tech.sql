-- ============================================================================
-- 126_project_skills_and_tech.sql
-- ----------------------------------------------------------------------------
-- Competências e tecnologias que um projeto demonstra, para a secção
-- "Competências" do perfil e os filtros de exploração.
--
--   projects.skills      — competências demonstradas, confirmadas pelo aluno
--   projects.tech_stack  — tecnologias concretas, confirmadas pelo aluno
--   project_skill_suggestions — o que a IA extraiu no publish, à espera de
--                          revisão. Tabela à parte (RLS só o dono lê) para
--                          não expor sugestões por rever a quem vê o perfil.
--
-- O campo de texto livre projects.technologies mantém-se (análise IA, ficha
-- do projeto); tech_stack é a versão estruturada para filtros.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tech_stack text[] NOT NULL DEFAULT '{}';

GRANT SELECT (skills, tech_stack) ON public.projects TO anon;
GRANT SELECT (skills, tech_stack) ON public.projects TO authenticated;
GRANT UPDATE (skills, tech_stack) ON public.projects TO authenticated;

CREATE INDEX IF NOT EXISTS projects_skills_gin ON public.projects USING gin (skills);
CREATE INDEX IF NOT EXISTS projects_tech_stack_gin ON public.projects USING gin (tech_stack);

-- ── Sugestões da IA, por rever ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_skill_suggestions (
  project_id    uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skills        text[] NOT NULL DEFAULT '{}',
  technologies  text[] NOT NULL DEFAULT '{}',
  generated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_skill_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own suggestions read"   ON public.project_skill_suggestions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own suggestions write"  ON public.project_skill_suggestions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_skill_suggestions TO authenticated;

-- A edge function (service role) escreve aqui; o cliente lê as suas e apaga
-- quando o aluno confirma ou dispensa.
