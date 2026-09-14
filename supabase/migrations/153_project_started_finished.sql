-- ============================================================================
-- 153_project_started_finished.sql
-- ============================================================================
-- O Percurso (ProjectTimeline) mostra consistência ao longo do tempo, mas
-- não distingue "parou porque desistiu" de "parou porque acabou" — um
-- recrutador vendo 6 meses sem registos não sabe se está a olhar para
-- inconsistência ou para um projeto concluído há 6 meses. Duas datas
-- resolvem isto: início (opcional, default = created_at se não definida) e
-- fim (opcional — a sua PRESENÇA é o que marca o projeto como concluído,
-- não um enum à parte para não haver dois campos a poder discordar).
-- ============================================================================

alter table public.projects
  add column if not exists project_started_on date,
  add column if not exists project_finished_on date;

comment on column public.projects.project_started_on is 'Início do trabalho no projeto, definido pelo dono. Null = usa created_at.';
comment on column public.projects.project_finished_on is 'Data de conclusão, definida pelo dono. Presente = projeto concluído (não "parou").';

-- Mesmo padrão de timeline_public (128_project_timeline.sql): coluna nova
-- não herda os grants column-level já existentes na tabela, tem de ser
-- concedida explicitamente — sem isto o select público de ANON_PROJECT_COLUMNS
-- falha por completo assim que inclui estas colunas (visitante anónimo via
-- proj rota pública fica sem conseguir ver o projeto nenhum).
GRANT SELECT (project_started_on, project_finished_on) ON public.projects TO anon, authenticated;
GRANT UPDATE (project_started_on, project_finished_on) ON public.projects TO authenticated;
