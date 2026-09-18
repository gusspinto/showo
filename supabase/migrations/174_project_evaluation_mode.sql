-- ============================================================================
-- 174_project_evaluation_mode.sql
-- ============================================================================
-- Um projeto PAP/Projeto Final pode ser avaliado por um júri (PAP típica,
-- tese com júri), por um único professor/orientador (comum em faculdade),
-- ou pelas duas coisas ao mesmo tempo (a PAP em si tem as duas: orientador
-- ao longo do ano, júri no dia) — por isso 'both', não uma escolha
-- exclusiva. Perguntado inline no passo de criação onde o tipo "pap" é
-- escolhido — sem passo novo no assistente. Usado para adaptar a
-- linguagem no Modo Defesa (ex: tab "Júri" -> "Orientador").
-- ============================================================================

alter table public.projects
  add column if not exists evaluation_mode text
    check (evaluation_mode is null or evaluation_mode in ('jury', 'evaluator', 'both'));

comment on column public.projects.evaluation_mode is 'Como o projeto é avaliado: jury (júri), evaluator (um professor/orientador) ou both. Null = não perguntado ou não aplicável.';

-- Mesmo padrão de 153_project_started_finished.sql: coluna nova não herda
-- os grants column-level já existentes na tabela.
GRANT SELECT (evaluation_mode) ON public.projects TO anon, authenticated;
GRANT UPDATE (evaluation_mode) ON public.projects TO authenticated;
