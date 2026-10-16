-- ============================================================================
-- 198_limit_renewed_email_cron.sql
-- ============================================================================
-- Agenda send-limit-renewed-emails para correr no dia 1 de cada mês, às
-- 02:00 UTC. Avisa quem esgotou algum limite de IA no mês anterior e pode
-- ter saído a pensar que tinha acabado para sempre — o limite renova
-- sozinho (é por mês de calendário na tabela ai_usage), mas sem este email
-- ninguém sabe disso a não ser que volte a abrir a app sozinho.
--
-- IMPORTANTE — antes de correr esta migração, substitui
-- REPLACE_WITH_CRON_SECRET pelo valor real do secret CRON_SECRET da edge
-- function (Project Settings → Edge Functions → Secrets). Mesmo padrão já
-- usado em 058_monthly_report_cron.sql.
-- ============================================================================

select cron.schedule(
  'send-limit-renewed-emails',
  '0 2 1 * *',  -- 02:00 UTC no dia 1 de cada mês
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-limit-renewed-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
