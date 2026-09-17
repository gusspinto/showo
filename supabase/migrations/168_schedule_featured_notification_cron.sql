-- ============================================================================
-- 168_schedule_featured_notification_cron.sql
-- ============================================================================
-- Agenda o aviso de "projeto em destaque" para correr uma vez por semana,
-- à segunda-feira às 12h UTC (depois do check-in semanal, às 9h, e longe do
-- cron diário de onboarding, às 10h). O secret vem da mesma variável
-- x-cron-secret já usada pelos outros jobs.
--
-- ESTADO AO VIVO (2026-09-17): aplicada e depois desativada a pedido
-- explícito ("não mandes já os emails"), via `select
-- cron.unschedule('send-featured-notification')`. O ficheiro fica como
-- está para documentar a intenção, mas em produção este job não está
-- ativo até alguém voltar a correr cron.schedule com esta mesma definição.
-- ============================================================================

SELECT cron.schedule(
  'send-featured-notification',
  '0 12 * * 1',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-featured-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
