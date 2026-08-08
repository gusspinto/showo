alter table public.projects
  add column if not exists dashboard_pinned boolean not null default false;
