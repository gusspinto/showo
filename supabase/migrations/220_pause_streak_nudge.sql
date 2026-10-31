-- ============================================================================
-- 220_pause_streak_nudge.sql
-- ============================================================================
-- Pedido do Gustavo em 2026-10-31, confirmado depois de ver os números:
-- send-streak-nudge nunca disparou nos últimos 30 dias, e o maior streak de
-- diário de qualquer utilizador real (fora de contas de teste) em toda a
-- história da plataforma foi 2 dias seguidos. O limiar mínimo do email é 5
-- dias, inatingível na prática. É peso morto, não um email que falha às
-- vezes, nunca teve hipótese de disparar.
--
-- Não apagamos a função nem o código, só desligamos o cron. Faz sentido
-- voltar a ligar isto se o send-diary-return-nudge (lançado na mesma sessão)
-- conseguir trazer gente de volta ao diário com regularidade suficiente
-- para streaks reais começarem a acontecer.
-- ============================================================================

SELECT cron.unschedule('send-streak-nudge');
