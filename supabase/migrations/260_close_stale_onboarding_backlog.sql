-- Fecha a sequência de onboarding para quem está registado há mais de
-- 30 dias e ainda estava preso num step < 14 (backlog causado pela
-- falta de order by na query de send-onboarding-sequence, corrigida na
-- migração/commit de 18/11). Mandar a sequência de 14 dias inteira
-- agora, meses depois do registo, não fazia sentido (urgência fabricada
-- sem contexto). Decisão explícita do Gustavo: passam direto para o
-- ciclo contínuo semanal (send-continuous-cycle, já blindado com
-- lock+cap+dedup nesta mesma sessão), que já é o destino normal de quem
-- termina o onboarding sem comprar.
--
-- Confirmado antes de aplicar: zero destas pessoas já tinham histórico
-- no ciclo contínuo, zero tinham opt-out do ciclo contínuo marcado, 585
-- de 588 são plano grátis (os outros 3 já pagam e corretamente deixam
-- de receber qualquer um dos dois emails, filtro plan='free' do ciclo
-- contínuo já cobre isso).
UPDATE public.profiles
SET onboarding_sequence_step = 14
WHERE onboarding_sequence_step IS NOT NULL
  AND onboarding_sequence_step < 14
  AND onboarding_opted_out = false
  AND created_at < now() - interval '30 days';
