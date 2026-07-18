-- ============================================================================
-- 058_monthly_report_cron.sql
-- ============================================================================
-- Schedules send-monthly-report to run automatically on the 1st of every
-- month via pg_cron + pg_net (Postgres calling the edge function over HTTP).
-- No existing job in this codebase does this yet — send-launch-emails is
-- invoked manually — this is the first automated edge-function trigger.
--
-- IMPORTANT — before running this migration, replace REPLACE_WITH_CRON_SECRET
-- below with the actual value of the CRON_SECRET edge function secret
-- (Project Settings → Edge Functions → Secrets). The cron.job definition is
-- only readable by the postgres/service roles, not by anon/authenticated,
-- but it is still plaintext in the job's SQL — acceptable for this project's
-- risk level (same pattern already used for x-cron-secret elsewhere), just
-- don't paste the real secret into a shared chat/ticket.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-monthly-report',
  '0 8 1 * *',  -- 08:00 UTC on the 1st of every month
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-monthly-report',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
