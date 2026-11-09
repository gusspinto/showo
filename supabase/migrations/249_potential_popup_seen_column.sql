-- Popup de "O teu Potencial" (tutorial do score, StudentDashboard), mostrado
-- uma única vez na vida da conta. Antes vivia só no localStorage
-- (showo_tut_potential_<user.id>) e voltava a aparecer sempre que a pessoa
-- mudava de dispositivo, usava modo privado, ou limpava dados do site.
-- Mesmo padrão de tour_seen_at / featured_popup_seen_at (profiles):
-- timestamp nullable, NULL = ainda não viu, set no primeiro dismiss, nunca
-- mais se repete.

alter table public.profiles
  add column if not exists potential_popup_seen_at timestamptz;
