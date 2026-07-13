-- ============================================================================
-- 044_grant_is_class_member.sql
-- ============================================================================
-- Root cause found: "class_members_select" (027) calls public.is_class_member(),
-- but that function was created in 027 without its own GRANT EXECUTE
-- statement. It likely relied on Postgres's default PUBLIC execute grant on
-- new functions — which a later security hardening pass (same kind of
-- blanket REVOKE that hit is_admin() in 031) evidently removed, since it
-- was never given an explicit grant of its own to fall back on.
--
-- This is why the teacher's view "worked" all along — their session
-- resolves visibility via the (auth.uid() = teacher_id) clause without ever
-- needing to evaluate is_class_member(), while a plain student's own row
-- can hit the codepath that does, and gets "permission denied for function
-- is_class_member" — which the app was silently swallowing until this
-- session's error-surfacing changes exposed it.
-- ============================================================================

grant execute on function public.is_class_member(uuid) to authenticated;
