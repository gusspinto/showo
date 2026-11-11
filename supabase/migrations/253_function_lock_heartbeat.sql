-- O lock de 252 marcava locked_at uma única vez, no momento de o adquirir,
-- e eu (o operador) decidia "está morto, posso disparar outra vez" só por
-- essa marca ter mais de N minutos. Isso está errado: uma execução real
-- pode legitimamente demorar mais do que isso (envios com espera entre
-- cada um, retries do Resend), e nessa altura o lock parece "expirado" por
-- fora mesmo com a função ainda viva e a escrever, abrindo a porta a uma
-- segunda execução por cima, exatamente o que causou duplicados a repetir
-- mesmo depois do lock existir (194 pessoas com duplicado, pior caso 10x).
--
-- Corrige-se com heartbeat: quem detém o lock atualiza locked_at
-- periodicamente enquanto trabalha (ver send-campaign-storm). Assim
-- "stale" passa a significar mesmo "sem sinal de vida há N minutos", não
-- "começou há N minutos", que é a garantia que se queria desde o início.
CREATE OR REPLACE FUNCTION public.touch_function_lock(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.function_locks SET locked_at = now() WHERE name = p_name;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_function_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_function_lock(text) TO service_role;
