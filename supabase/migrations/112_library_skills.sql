-- ============================================================================
-- 112_library_skills.sql — a IA etiqueta os ficheiros da Biblioteca em
-- segundo plano.
--
-- Mesmo quando o aluno só "adiciona à Biblioteca" (não transforma em
-- página), a IA lê o ficheiro por trás e tira as competências que lá
-- estão + um resumo curto. Assim nada fica como storage morto: serve para
-- pesquisa, para o portefólio e para pré-preencher se mais tarde virar
-- página.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS library_skills text[];

GRANT SELECT (library_skills) ON public.projects TO anon;
GRANT SELECT (library_skills) ON public.projects TO authenticated;
