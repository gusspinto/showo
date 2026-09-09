-- ============================================================================
-- 138_grant_profile_views_select.sql
-- ============================================================================
-- 137 added profiles.views but not a column SELECT grant. profiles uses
-- column-level SELECT privileges (see 082/106/107/109/123), so without this
-- any query that selects `views` fails with 403 for the whole row.
-- Only the profile owner sees their count in the UI, so grant to authenticated
-- only (RLS still limits which rows they can read) — not anon.
-- ============================================================================

GRANT SELECT (views) ON public.profiles TO authenticated;
