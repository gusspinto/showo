-- ============================================================================
-- 217_space_out_email_cron_schedules.sql
-- ============================================================================
-- Pedido direto do Gustavo em 2026-10-31: users reais (confirmado com o
-- brunosilva.smd@... e com dados reais de email_sends) estavam a receber
-- vários emails de campanhas diferentes no mesmo dia, a horas próximas
-- umas das outras, e isso parece spam mesmo quando cada campanha, por si
-- só, está correta. A par da correção de código (cada campanha diária/
-- semanal passa a saltar quem está em onboarding ativo), esta migração
-- reespaça os horários dos cron jobs para nunca ficarem a menos de 2h uns
-- dos outros no mesmo dia da semana.
--
-- `cron.schedule` com o mesmo jobname faz update in place (não duplica o
-- job), confirmado no pg_cron 1.4+ já em uso neste projeto.
--
-- Antes → depois (UTC):
--   send-weekly-recap            segunda  08:00 → 06:00
--   send-weekly-checkin          segunda  09:00 → 16:00
--   send-project-activation-nudge  diário 11:00 → 14:00
--   send-continuous-cycle         quinta  10:00 → 16:00 (colidia em cheio
--                                                          com o onboarding,
--                                                          mesma hora)
--   send-saturday-nudge           sábado  13:00 → 17:00
--
-- Mantidos (já bem espaçados do resto): send-onboarding-sequence (10:00
-- diário, é a âncora), send-featured-notification (12:00 segunda),
-- send-streak-nudge (19:00 diário), send-coach-return-nudge (22:00 diário).
-- ============================================================================

SELECT cron.schedule(
  'send-weekly-recap',
  '0 6 * * 1',
  $$
      select net.http_post(
        url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-recap',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
        body := '{}'::jsonb
      );
      $$
);

SELECT cron.schedule(
  'send-weekly-checkin',
  '0 16 * * 1',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-checkin',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'send-project-activation-nudge',
  '0 14 * * *',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-project-activation-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-continuous-cycle',
  '0 16 * * 4',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-continuous-cycle',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-saturday-nudge',
  '0 17 * * 6',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-saturday-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
