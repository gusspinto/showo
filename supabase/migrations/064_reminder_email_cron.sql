-- ============================================================================
-- 064_reminder_email_cron.sql
-- ============================================================================
-- Schedules send-reminder-emails to run hourly via pg_cron + pg_net.
-- The function checks for reminders due tomorrow (24h notice) that haven't
-- been emailed yet, sends one email per reminder, then marks email_sent=true.
--
-- IMPORTANT: replace REPLACE_WITH_CRON_SECRET below with the actual value
-- of the CRON_SECRET edge function secret (same one used in migration 058).
-- ============================================================================

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminder-emails',
  '0 * * * *',  -- every hour
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-reminder-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
