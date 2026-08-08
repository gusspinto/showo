-- ============================================================================
-- 068_project_of_month.sql — Projeto do Mês
-- ============================================================================
-- Curadoria manual: um admin insere uma linha por mês com o projeto escolhido.
-- Qualquer pessoa pode ler. Só admins escrevem.
-- ============================================================================

create table if not exists public.project_of_month (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  month       text not null unique,   -- formato "2026-08"
  note        text,                   -- mensagem opcional do admin (motivo da escolha)
  created_at  timestamptz not null default now()
);

-- Índice para busca pelo mês atual
create index if not exists project_of_month_month_idx on public.project_of_month(month desc);

-- RLS
alter table public.project_of_month enable row level security;

-- Leitura pública
create policy "Public read project_of_month"
  on public.project_of_month for select
  using (true);

-- Escrita apenas para admins
create policy "Admin insert project_of_month"
  on public.project_of_month for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin update project_of_month"
  on public.project_of_month for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin delete project_of_month"
  on public.project_of_month for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
