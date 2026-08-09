-- ══════════════════════════════════════════════════════════════════════════════
-- 073_plan_grants_and_rls.sql
--
-- 1. Grant SELECT on `plan` + `plan_updated_at` to authenticated so
--    fetchProfile() can read the column (065 uses column-level grants, so any
--    new column must be explicitly added or the query returns a permission error
--    that sets profile = null and freezes the dashboard skeleton).
--
-- 2. Do NOT grant UPDATE on `plan` to authenticated — only the service-role
--    webhook (future payment flow) may change a user's plan.
-- ══════════════════════════════════════════════════════════════════════════════

grant select (plan, plan_updated_at) on public.profiles to authenticated;

-- anon never needs to see plan (public profiles don't show plan tier)
-- so no anon grant here.
