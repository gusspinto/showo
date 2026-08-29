-- 084_grant_organization_id_to_authenticated.sql
-- 065 uses column-level grants on profiles, so organization_id (added in 056)
-- was never explicitly granted — authenticated users could not read it.
grant select (organization_id) on public.profiles to authenticated;
