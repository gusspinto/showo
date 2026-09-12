-- ============================================================================
-- 148_checkin_unsubscribe_and_streak.sql
-- ============================================================================
-- Duas coisas que faltavam antes do cron do check-in semanal correr a
-- sério: opt-out (sem isto, a única forma de parar é marcar como spam,
-- o que estraga a reputação do domínio) e um limite de tentativas
-- consecutivas sem a pessoa voltar (senão manda-se para sempre a quem
-- nunca mais vai voltar).
-- ============================================================================

alter table public.profiles
  add column if not exists weekly_checkin_opted_out boolean not null default false,
  add column if not exists weekly_checkin_streak integer not null default 0;

grant select (weekly_checkin_opted_out, weekly_checkin_streak) on public.profiles to authenticated;
