-- Sync automático via webhook do GitHub (push). Guarda o repo normalizado
-- (para o webhook encontrar o projeto pelo payload) e o id do hook criado
-- na API do GitHub (para o conseguir remover depois). Service-role only —
-- sem GRANT a anon/authenticated de propósito, ninguém escreve isto via API.
alter table public.projects
  add column if not exists github_repo_full_name text,
  add column if not exists github_webhook_id bigint;

create index if not exists idx_projects_github_repo_full_name
  on public.projects (github_repo_full_name);
