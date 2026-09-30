-- ============================================================================
-- 178_profile_intended_use.sql — "Para que vais usar o Showo agora?" no /welcome
--
-- Feedback recorrente nos áudios de outreach: quem entra pelo vídeo da PAP
-- pensa "a PAP é só para o ano" e nunca cria um projeto. Sem esta pergunta
-- no onboarding, não há como saber quem está neste caso nem reativar essa
-- pessoa mais perto da altura certa.
--
-- Só para a conta Individual (Welcome.jsx) — contas de escola já têm
-- account_type='school' e entram sempre por código de turma, não passam
-- por esta pergunta.
--
-- Sinal interno, não perfil público: ao contrário de occupation/area (que
-- aparecem na página pública), estas colunas não têm GRANT SELECT nenhum.
-- Não são lidas de volta pela app — só escritas uma vez no onboarding e,
-- mais tarde, lidas por um job de email com a service_role key (que
-- ignora estes grants). Sem SELECT concedido, nenhum outro utilizador
-- autenticado consegue ler isto via REST, mesmo pedindo a linha de outra
-- pessoa — ao contrário de occupation, que é de propósito pública.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intended_use TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pap_timing TEXT;

-- O 100_lock_sensitive_profile_columns revogou o UPDATE geral de profiles —
-- só as colunas explicitamente concedidas aqui podem ser escritas pelo
-- próprio utilizador.
GRANT UPDATE (intended_use, pap_timing) ON public.profiles TO authenticated;
