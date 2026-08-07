-- ============================================================================
-- 067_class_ranking.sql — Ranking opcional por turma
-- ============================================================================
-- O professor pode activar/desactivar o ranking por turma.
-- Quando activo, todos os membros da turma vêem o ranking.
-- ============================================================================

alter table public.classes
  add column if not exists show_ranking boolean not null default false;
