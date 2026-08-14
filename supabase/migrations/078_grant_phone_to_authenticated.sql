-- ══════════════════════════════════════════════════════════════════════════════
-- 078_grant_phone_to_authenticated.sql
--
-- Grant SELECT on `phone` to authenticated so fetchProfile() can read it.
-- 065 uses column-level grants, so any new column must be explicitly added.
-- anon never sees phone (private contact info).
-- ══════════════════════════════════════════════════════════════════════════════

grant select (phone) on public.profiles to authenticated;
