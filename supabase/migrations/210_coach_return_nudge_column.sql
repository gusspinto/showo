-- Coluna de controlo para o email de retorno ao Coach IA (projeto ou geral).
-- Achado da análise de 2026-10-23: 95-100% dos users que abrem uma conversa
-- com o Coach nunca voltam. Este email dispara uma única vez, X dias depois
-- da primeira (e até agora única) sessão, sem repetir.
alter table public.profiles
  add column if not exists coach_nudge_sent_at timestamptz;

alter table public.profiles
  add column if not exists coach_nudge_opted_out boolean not null default false;
