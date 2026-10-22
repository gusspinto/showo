-- Esquecido na primeira versao (205): o email de ativacao pos-criacao
-- nao tinha link de cancelar subscricao, ao contrario de todos os outros
-- (onboarding, ciclo continuo). Inconsistente e mau para entregabilidade.
-- Mesmo padrao de coluna dedicada por lista, nao reaproveita
-- onboarding_opted_out nem continuous_cycle_opted_out.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activation_nudge_opted_out boolean NOT NULL DEFAULT false;
