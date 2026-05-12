alter table public.projects
  add column if not exists school_year text,
  add column if not exists course text,
  add column if not exists school text,
  add column if not exists creator_name text,
  add column if not exists is_pap boolean default false,
  add column if not exists pap_supervisor text,
  add column if not exists pap_date text,
  add column if not exists project_type text;

-- Allow updates (required for missions edit modal and field edits)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'projects' and policyname = 'Anyone can update projects'
  ) then
    execute 'create policy "Anyone can update projects" on public.projects for update using (true) with check (true)';
  end if;
end $$;
