-- Popup de "o teu projeto está em destaque", mostrado uma única vez na vida
-- da conta. Mesmo padrão de tour_seen_at (profiles): timestamp nullable,
-- NULL = ainda não viu, set no primeiro dismiss, nunca mais se repete.

alter table public.profiles
  add column if not exists featured_popup_seen_at timestamptz;
