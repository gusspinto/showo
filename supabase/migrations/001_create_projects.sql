create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid,
  name text,
  area text,
  goal text,
  problem text,
  solution text,
  target_audience text,
  features text,
  technologies text,
  challenges text,
  results text,
  learnings text,
  cover_url text,
  slug text unique not null,
  ai_tagline text,
  ai_description text,
  ai_highlights jsonb
);

-- Public read access (no auth required)
alter table public.projects enable row level security;

create policy "Anyone can read projects"
  on public.projects for select
  using (true);

create policy "Anyone can insert projects"
  on public.projects for insert
  with check (true);
