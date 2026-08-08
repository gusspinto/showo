-- ============================================================================
-- 069_diary_canvas.sql — Canvas privado do diário de projeto
-- ============================================================================
-- Cada utilizador tem o seu próprio canvas por projeto.
-- Totalmente privado: só o dono pode ler e escrever.
-- ============================================================================

create table if not exists public.diary_canvas_items (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null default 'note'
             check (type in ('note', 'idea', 'highlight')),
  x          float not null default 0,
  y          float not null default 0,
  w          float not null default 220,
  h          float not null default 160,
  content    text not null default '',
  color      text not null default '#1a2030',
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists diary_canvas_items_owner_idx
  on public.diary_canvas_items(project_id, user_id);

alter table public.diary_canvas_items enable row level security;

-- Só o dono pode fazer CRUD
create policy "Owner full access diary_canvas_items"
  on public.diary_canvas_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
