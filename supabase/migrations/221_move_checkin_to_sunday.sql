-- ============================================================================
-- 221_move_checkin_to_sunday.sql
-- ============================================================================
-- Pedido do Gustavo em 2026-10-31: segunda tinha 4 campanhas diferentes
-- (recap, featured, activation, checkin) na mesma manhã. Confirmado contra
-- a BD que a sobreposição real na mesma pessoa é mínima (5 casos em 8
-- semanas, nunca 3+ no mesmo dia), mas o weekly-checkin é de longe a maior
-- em volume (178/semana contra menos de 20/semana das outras três) e não
-- tem nenhuma razão lógica para ser segunda especificamente. Movido para
-- domingo, dia que estava completamente livre, mesma hora (16h UTC).
--
-- Segunda fica com 3 campanhas (recap, featured, activation). Domingo
-- passa a ter 1 (checkin).
-- ============================================================================

SELECT cron.schedule(
  'send-weekly-checkin',
  '0 16 * * 0',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-checkin',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
