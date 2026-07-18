-- ============================================================================
-- 057_monthly_report_opt_in.sql
-- ============================================================================
-- Professor-only opt-in for a monthly AI-written email summarizing their
-- turmas' activity (Settings.jsx toggle). monthly_report_sent_at tracks the
-- last send so the cron-triggered edge function (send-monthly-report) can
-- skip anyone already emailed this calendar month, even if the job runs
-- more than once.
-- Neither column is in guard_profile_privesc's protected list (is_admin,
-- role, banned_at, total_xp), so the existing "Own profile update" policy
-- already allows a professor to flip their own toggle — no new policy
-- needed.
-- ============================================================================

alter table public.profiles
  add column if not exists monthly_report_opt_in  boolean not null default false,
  add column if not exists monthly_report_sent_at  timestamptz;
