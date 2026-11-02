-- ============================================================================
-- 219_diary_return_nudge.sql
-- ============================================================================
-- Nova campanha send-diary-return-nudge, decidida a partir da análise de
-- 2026-10-31: 92% de quem alguma vez escreveu no diário fê-lo só no dia em
-- que criou o projeto, nunca mais voltando. Lembra quem tem a última
-- entrada manual (nunca a do GitHub sync) há 2-9 dias, 1 vez por sempre.
--
-- GRANT obrigatório nas colunas novas de profiles, mesmo padrão das lições
-- de 2026-10-28 e 2026-10-30: sem isto, qualquer select que inclua estas
-- colunas falha para a tabela toda, não só para a coluna nova.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diary_return_nudge_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS diary_return_nudge_opted_out boolean NOT NULL DEFAULT false;

GRANT SELECT (diary_return_nudge_sent_at, diary_return_nudge_opted_out) ON public.profiles TO authenticated;
GRANT UPDATE (diary_return_nudge_sent_at, diary_return_nudge_opted_out) ON public.profiles TO authenticated;

-- Terça-feira 15h UTC: único dia da semana ainda sem nenhum cron de email,
-- fica a pelo menos 2h de distância de qualquer campanha vizinha.
SELECT cron.schedule(
  'send-diary-return-nudge',
  '0 15 * * 2',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-diary-return-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
