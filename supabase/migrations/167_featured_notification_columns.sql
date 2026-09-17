-- ============================================================================
-- 167_featured_notification_columns.sql
--
-- Email de parabéns para o dono de um projeto que entrou nos destaques do
-- Explorar/Home (get_featured_projects, ver migração 152). featured_notified_at
-- evita mandar o mesmo aviso toda semana enquanto o projeto se mantiver em
-- destaque, só volta a notificar depois de sair e voltar a entrar (mais de
-- 7 dias desde o último aviso). featured_notification_opted_out é uma lista
-- própria, separada do check-in semanal e do onboarding, para cancelar isto
-- não cancelar os outros.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS featured_notified_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_notification_opted_out BOOLEAN NOT NULL DEFAULT false;
