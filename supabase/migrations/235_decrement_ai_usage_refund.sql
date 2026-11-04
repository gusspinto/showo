-- Achado de 2026-11-03: check_ai_limit tem de consumir a unidade ANTES de
-- sabermos se a chamada externa (OpenAI, neste caso) vai responder bem, para
-- dois pedidos em paralelo nao passarem ambos do limite. Mas quando a
-- chamada falha depois disso (ex: creditos esgotados na OpenAI), a pessoa
-- perdia a unidade do mes sem nunca ter recebido nada em troca. Confirmado
-- ao vivo: conta do Gustavo tinha 5 usadas em generateImage, zero imagens
-- no historico, porque a OpenAI respondeu sempre insufficient_quota.
--
-- Esta funcao devolve a unidade (nunca abaixo de 0), chamada pelo
-- generate-image sempre que a geracao falha depois do limite ja ter sido
-- consumido.
CREATE OR REPLACE FUNCTION public.decrement_ai_usage(p_user_id uuid, p_feature text, p_month text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  UPDATE public.ai_usage
  SET used = greatest(0, used - 1), updated_at = now()
  WHERE user_id = p_user_id AND feature = p_feature AND month = p_month;
$$;

REVOKE ALL ON FUNCTION public.decrement_ai_usage(uuid, text, text) FROM PUBLIC, anon, authenticated;
