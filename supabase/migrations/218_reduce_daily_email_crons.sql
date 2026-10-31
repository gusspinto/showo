-- ============================================================================
-- 218_reduce_daily_email_crons.sql
-- ============================================================================
-- Pedido direto do Gustavo em 2026-10-31: tínhamos 4 cron jobs de email a
-- correr TODOS OS DIAS (onboarding, project-activation-nudge, streak-nudge,
-- coach-return-nudge). Cada um só manda no máximo 1 email por dia à mesma
-- pessoa (onboarding, por desenho explícito dele), 1 email por projeto
-- (activation), 1 vez por marco raro (streak, 0 em 30 dias) ou 1 vez na
-- vida (coach-return), mas ter 4 verificações diárias aumenta sem
-- necessidade a chance de alguém apanhar 2+ no mesmo dia por coincidência.
--
-- Reduzido a 2: fica diário só o onboarding (crítico, pedido explícito,
-- liga ao desconto) e o streak (a celebração só faz sentido no próprio dia
-- em que a pessoa bate o marco, perderia o propósito se fosse semanal).
--
--   send-project-activation-nudge   diário 14:00 → segunda/quarta/sexta 14:00
--     (janela de deteção alargada de 24-48h para 24-100h no código, para
--     não perder ninguém no maior intervalo entre corridas: sexta a
--     segunda, 3 dias)
--   send-coach-return-nudge         diário 22:00 → quarta 22:00
--     (janela de 3-21 dias de inatividade já tem 18 dias de margem, um
--     cron semanal nunca perde ninguém, só atrasa o envio em até 7 dias)
--
-- Mantidos diários: send-onboarding-sequence (10:00, pedido explícito),
-- send-streak-nudge (19:00, celebração tem de ser no próprio dia).
-- ============================================================================

SELECT cron.schedule(
  'send-project-activation-nudge',
  '0 14 * * 1,3,5',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-project-activation-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-coach-return-nudge',
  '0 22 * * 3',
  $$select net.http_post(
      url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-coach-return-nudge',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
      body := '{}'::jsonb
    );$$
);
