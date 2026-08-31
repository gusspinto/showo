-- ============================================================================
-- 095_gotenberg_keepalive_cron.sql — o Render (tier grátis) adormece o
-- Gotenberg ao fim de ~15 min sem tráfego, e a primeira conversão a seguir
-- demora 30-60s a arrancar. Um ping a cada 10 min mantém-no sempre acordado,
-- para quem usa a app durante o dia nunca sentir essa espera.
-- ============================================================================

select cron.schedule(
  'gotenberg-keepalive',
  '*/10 * * * *',
  $$
  select net.http_get(url := 'https://showo-gotenberg.onrender.com/health');
  $$
);
