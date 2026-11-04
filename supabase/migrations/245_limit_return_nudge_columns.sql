-- Item 1 da checklist de growth (docs/checklist-growth-2026-11-04.md):
-- email de reativação a quem bateu num limite de IA e não voltou em 7
-- dias. Mesmo padrão de colunas dos outros nudges (coach_nudge_*,
-- diary_return_nudge_*): sent_at (enviado uma única vez por sempre) +
-- opted_out (link de cancelar no próprio email).
--
-- GRANT explícito porque profiles tem lockdown de privilégios por coluna
-- (100_lock_sensitive_profile_columns.sql), sem isto, qualquer select que
-- inclua esta coluna falha para a tabela toda (lição de 2026-10-28,
-- migração 214/219).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS limit_nudge_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS limit_nudge_opted_out boolean NOT NULL DEFAULT false;

GRANT SELECT (limit_nudge_sent_at, limit_nudge_opted_out),
      UPDATE (limit_nudge_sent_at, limit_nudge_opted_out)
  ON public.profiles TO authenticated;
