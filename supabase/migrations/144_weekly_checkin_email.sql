-- ============================================================================
-- 144_weekly_checkin_email.sql
-- ============================================================================
-- Email semanal para quem não entra há 3+ dias e teve visitas reais na
-- semana (perfil ou projeto) — "X pessoas viram, ainda não há nada para ver"
-- ou "X pessoas viram, o teu projeto está parado". Só dispara quando há
-- visitas a sério a mostrar; sem isso, o email não tem gancho nenhum e é
-- só ruído. Mesmo padrão de coluna "última vez enviado" que a 085 já usa,
-- para o cron poder correr mais do que uma vez sem duplicar.
-- ============================================================================

alter table public.profiles
  add column if not exists weekly_checkin_email_sent_at timestamptz;

grant select (weekly_checkin_email_sent_at) on public.profiles to authenticated;
