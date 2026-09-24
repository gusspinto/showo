-- Campanha única já enviada (21/09 + reenvio aos 30 em falta a 24/09).
-- O job era anual (30 9 21 9 *) e voltaria a disparar em setembro de 2027.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-campaign-back-to-school') THEN
    PERFORM cron.unschedule('send-campaign-back-to-school');
  END IF;
END $$;
