-- ============================================================================
-- 166_schedule_onboarding_sequence_cron.sql
-- ============================================================================
-- Agenda a sequência de onboarding para correr sozinha todos os dias às 10h
-- UTC (uma hora depois do check-in semanal, às segundas, para não
-- competirem pelo mesmo minuto). O secret vem da mesma variável
-- x-cron-secret já usada pelos outros jobs (ver CRON_SECRET nos secrets do
-- projeto) — nunca fica em texto simples no histórico do git, só aqui na
-- base de dados.
-- ============================================================================

SELECT cron.schedule(
  'send-onboarding-sequence',
  '0 10 * * *',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-onboarding-sequence',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
