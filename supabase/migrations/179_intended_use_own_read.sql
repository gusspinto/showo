-- ============================================================================
-- 179_intended_use_own_read.sql
--
-- Corrige a 178. A 178 não deu GRANT SELECT a `authenticated` em
-- intended_use/pap_timing de propósito, para não aparecerem no perfil
-- público. Mas "Public read profiles" (006_profiles_extend) é
-- `FOR SELECT USING (true)` — a policy de linha é aberta a qualquer pessoa,
-- a privacidade em profiles é feita só por GRANT de coluna. Sem SELECT
-- nenhum, o cliente também não conseguia ler o valor do próprio utilizador
-- de volta — e é disso que o IntentGate (App.jsx) precisa, para saber se
-- já respondeu.
--
-- Em vez de abrir a coluna (o que deixava qualquer autenticado ler o
-- intended_use de qualquer outra pessoa via REST), uma RPC SECURITY DEFINER
-- que só devolve a linha do próprio — mesmo padrão do get_ai_usage().
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_own_intent()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('intended_use', intended_use, 'pap_timing', pap_timing)
  FROM public.profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_own_intent() TO authenticated;
