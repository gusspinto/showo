-- ============================================================================
-- 147_schedule_weekly_checkin_cron.sql
-- ============================================================================
-- Agenda o check-in semanal para correr sozinho toda segunda-feira às 9h
-- UTC. O secret vem da mesma variável x-cron-secret já usada por outros
-- jobs (ver CRON_SECRET nos secrets do projeto) — nunca fica em texto
-- simples no histórico do git, só aqui na base de dados.
-- ============================================================================

SELECT cron.schedule(
  'send-weekly-checkin',
  '0 9 * * 1',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-checkin',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
