-- O Gustavo perguntou se quem aparece em "Iniciaram checkout" clicou mesmo
-- no botão de pagar ou só viu o pop-up. A resposta era "clicou mesmo", mas
-- o evento checkout_started dispara ANTES do pedido ao servidor (create-
-- checkout/create-annual-checkout), por isso também inclui cliques que
-- falharam a meio (erro de rede, Stripe fora do ar) e nunca chegaram à
-- página de pagamento real. Para saber quem chegou mesmo ao Stripe, falta
-- um segundo evento, disparado só depois do pedido ter sucesso (data.url
-- recebido), mesmo antes do redirect.
--
-- Em vez de mudar outra vez a assinatura de admin_get_checkout_funnel (foi
-- isso que prendeu o cache do PostgREST em 236/237), cria-se uma função
-- nova e independente só para este evento extra (checkout_redirected),
-- juntada no frontend aos dados que admin_get_checkout_funnel já devolve.
CREATE FUNCTION public.admin_get_checkout_redirects(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  user_id uuid,
  feature text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT f.user_id, f.feature, f.created_at
    FROM public.funnel_events f
    WHERE f.event = 'checkout_redirected' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_checkout_redirects(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_checkout_redirects(timestamptz) TO authenticated;
