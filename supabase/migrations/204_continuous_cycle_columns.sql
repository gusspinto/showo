-- Ciclo contínuo semanal (decidido na reunião com o Maia, 2026-10-19):
-- quem termina os 14 dias de onboarding sem comprar entra num ciclo que
-- nunca para, 1 email por semana, 4 ângulos em loop (análises IA, Coach
-- IA, vagas, preparação de defesa). Sai da lista sozinho quando deixa de
-- estar no plano Grátis (filtro na query, não precisa de flag própria).
--
-- continuous_cycle_step guarda a posição no loop de 4 (mod 4 é feito na
-- função, aqui é só um contador crescente, mais simples que resetar).
-- continuous_cycle_sent_at é o cooldown de 6 dias entre envios, mesmo
-- padrão do weekly_checkin_email_sent_at já existente.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS continuous_cycle_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS continuous_cycle_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS continuous_cycle_opted_out boolean NOT NULL DEFAULT false;
