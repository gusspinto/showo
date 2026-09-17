-- ============================================================================
-- 172_schedule_back_to_school_campaign.sql
-- ============================================================================
-- Envio único da campanha "regresso às aulas", agendado para segunda-feira
-- 2026-09-21 às 10h30 (hora de Portugal, WEST = UTC+1 em setembro), logo
-- 09h30 UTC. Não é um cron recorrente — é uma data fixa (minuto/hora/dia/
-- mês), por isso só dispara nesse dia. Depois de correr, o job fica para
-- trás inofensivo até setembro do ano seguinte, mas o ideal é apagar com
-- `select cron.unschedule('send-campaign-back-to-school')` depois de
-- confirmar que correu bem.
-- ============================================================================

SELECT cron.schedule(
  'send-campaign-back-to-school',
  '30 9 21 9 *',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-campaign-back-to-school',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
