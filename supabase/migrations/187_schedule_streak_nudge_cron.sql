-- Nudge diário de streak (send-streak-nudge), todos os dias às 19:00 UTC —
-- tarde o suficiente para já ter havido atividade do dia (commits, diário),
-- cedo o suficiente para ainda ser noite em PT quando chega o email.
SELECT cron.schedule(
  'send-streak-nudge',
  '0 19 * * *',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-streak-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
