-- ============================================================================
-- 171_marketing_campaign_columns.sql
-- ============================================================================
-- Coluna de opt-out para campanhas de email pontuais (a primeira é a de
-- "regresso às aulas", mas a ideia do Maia é que isto rode entre vários
-- temas ao longo do tempo — campanhas, mais-valias, case studies). Separada
-- das outras (weekly_checkin_opted_out, onboarding_opted_out,
-- featured_notification_opted_out) para quem só quer sair de uma coisa não
-- sair de todas.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_campaign_opted_out boolean NOT NULL DEFAULT false;
