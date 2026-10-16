-- ============================================================================
-- 199_mensagens_notified_at.sql
-- ============================================================================
-- Coluna para a notificação por email de mensagens por ler. Marca-se depois
-- de o email de aviso ser enviado para uma mensagem, para o cron de
-- send-message-notifications nunca avisar duas vezes da mesma mensagem.
-- ============================================================================

alter table mensagens add column if not exists notified_at timestamptz;
