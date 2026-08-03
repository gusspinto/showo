-- ============================================================================
-- 063_reminder_email_sent.sql
-- ============================================================================
-- Adds email_sent flag to personal_reminders so the cron job only sends
-- each reminder email once. The cron job is in 064_reminder_email_cron.sql.
-- ============================================================================

alter table public.personal_reminders
  add column if not exists email_sent boolean not null default false;

comment on column public.personal_reminders.email_sent is
  'Set to true after the day-before reminder email has been dispatched.';
