-- ============================================================================
-- 079_grant_visibility_and_featured_to_anon.sql
--
-- 065 defines column-level SELECT grants for anon on projects.
-- The `visibility`, `featured`, and `featured_order` columns were added
-- after 065 and were never granted, so anon queries that filter or select
-- these columns get a permission error — returning 0 rows silently.
--
-- Fix: grant the three missing columns to anon.
-- ============================================================================

grant select (visibility, featured, featured_order)
  on public.projects to anon;
