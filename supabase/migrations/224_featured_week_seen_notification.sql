-- O popup existente (featured_popup_seen_at) só dispara uma vez na vida da
-- conta, a primeira vez que um projeto é destacado. Semanas seguintes em que
-- a pessoa volta a ser destacada nunca mais mostram nada in-app (só o email,
-- send-featured-notification). Coluna nova para guardar a última semana
-- (featured_weeks.week_start) já vista, assim a notificação in-app volta a
-- aparecer sempre que há uma semana nova de destaque, não só a primeira.
-- GRANT incluído já aqui (lição de 2026-10-28/10-30: profiles tem lockdown
-- de privilégios por coluna, falta de GRANT parte o select da tabela toda).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS featured_week_seen date;

GRANT SELECT (featured_week_seen) ON public.profiles TO authenticated;
GRANT UPDATE (featured_week_seen) ON public.profiles TO authenticated;
