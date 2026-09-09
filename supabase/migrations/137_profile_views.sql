-- ============================================================================
-- 137_profile_views.sql
-- ============================================================================
-- Portfolio (profile) view tracking, mirroring the project view counter from
-- 015_increment_views.sql:
--   * profiles.views  — running total, same as projects.views
--   * increment_profile_views(uuid) — SECURITY DEFINER so anonymous visitors
--     can bump the counter despite 100_lock_sensitive_profile_columns.sql
--     revoking UPDATE on the table.
-- The "someone viewed your portfolio" notification is inserted separately by
-- the notify-profile-view edge function (service role, like notify-view), so
-- there is no notifications.type whitelist to widen here.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_profile_views(profile_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET views = COALESCE(views, 0) + 1
  WHERE id = profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO anon, authenticated;
