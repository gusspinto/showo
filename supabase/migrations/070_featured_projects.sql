-- ============================================================================
-- 070_featured_projects.sql — Projetos em destaque (max 3 por utilizador)
-- ============================================================================
-- O aluno pode marcar até 3 projetos como "em destaque".
-- Aparecem no topo do perfil público e na dashboard.
-- ============================================================================

alter table public.projects
  add column if not exists featured boolean not null default false,
  add column if not exists featured_order smallint;

-- Índice para buscar rapidamente os destacados de um utilizador
create index if not exists projects_featured_idx
  on public.projects(user_id, featured, featured_order)
  where featured = true;
