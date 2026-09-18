-- ============================================================================
-- 168_schedule_featured_notification_cron.sql
-- ============================================================================
-- Agenda o aviso de "projeto em destaque" para correr uma vez por semana,
-- à segunda-feira às 12h UTC (depois do check-in semanal, às 9h, e longe do
-- cron diário de onboarding, às 10h). O secret vem da mesma variável
-- x-cron-secret já usada pelos outros jobs.
--
-- ESTADO AO VIVO (2026-09-17): ativo, jobid 16. Teve um percurso: aplicado,
-- desativado a pedido explícito ("não mandes já os emails"), depois
-- reativado quando se confirmou a cadência semanal. Nesse meio tempo
-- apanhou-se um bug real — a função tinha verify_jwt=true (ao contrário das
-- irmãs send-weekly-checkin/send-onboarding-sequence, que têm
-- verify_jwt=false), por isso as chamadas do cron, sem header Authorization,
-- estavam a falhar com 401 sem ninguém reparar. Corrigido: função redeployada
-- com verify_jwt=false, autorização feita só pelo x-cron-secret próprio.
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
