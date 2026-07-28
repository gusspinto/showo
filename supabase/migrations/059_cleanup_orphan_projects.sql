-- ============================================================================
-- 059_cleanup_orphan_projects.sql
-- ============================================================================
-- Anonymous projects are created straight from the homepage widget with
-- user_id = NULL and only get an owner when the visitor registers (the claim
-- step in Register.jsx binds the project's slug to the new user). If the
-- visitor never creates an account, the project stays orphaned forever with
-- no owner — dead rows that should not linger.
--
-- This schedules an hourly pg_cron job that deletes orphaned projects
-- (user_id IS NULL) older than a 24h grace period. The grace window is
-- deliberate: the claim happens during registration, which can trail the
-- initial creation by minutes/hours, so we never delete a project someone
-- is mid-way through claiming.
-- ============================================================================

-- One-off backfill: purge orphans already older than the grace period.
delete from public.projects
where user_id is null
  and created_at < now() - interval '24 hours';

-- Reusable cleanup function (SECURITY DEFINER so the cron job — running as the
-- postgres role — bypasses RLS deterministically).
create or replace function public.cleanup_orphan_projects()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.projects
  where user_id is null
    and created_at < now() - interval '24 hours';
$$;

-- Run every hour, on the hour.
select cron.schedule(
  'cleanup-orphan-projects',
  '0 * * * *',
  $$ select public.cleanup_orphan_projects(); $$
);
