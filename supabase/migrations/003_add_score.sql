alter table public.projects
  add column if not exists score integer default 0;

-- Backfill is done lazily on first page visit (ProjectPage.jsx)
