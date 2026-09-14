-- ============================================================================
-- 145_notification_viewer_id.sql
-- ============================================================================
-- Guarda quem viu, só quando o visitante estava autenticado (visitantes
-- anónimos continuam sem identidade nenhuma, como sempre foi). Serve para
-- mostrar, no email de check-in semanal, avatares reais bastante desfocados
-- de quem passou por lá — em vez de círculos genéricos. Nunca é exposto ao
-- dono do perfil de outra forma (nome, username) só a foto desfocada.
-- ============================================================================

alter table public.notifications
  add column if not exists viewer_id uuid references auth.users(id) on delete set null;

grant select (viewer_id) on public.notifications to authenticated;
