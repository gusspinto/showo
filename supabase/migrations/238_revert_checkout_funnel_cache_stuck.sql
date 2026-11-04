-- As migracoes 236/237 mudaram o numero de colunas devolvidas por
-- admin_get_checkout_funnel (DROP + CREATE), e o PostgREST ficou com o
-- cache preso na forma antiga, dando 404 a qualquer chamada mesmo depois
-- de varios NOTIFY pgrst manuais. Em vez de continuar a depender de um
-- reload que nao estava a acontecer, volta-se a uma assinatura simples
-- (6 colunas, igual a antes de 236), com DROP+CREATE explicito. Toda a
-- informacao extra que as migracoes 236/237 tentavam trazer (email,
-- idade da conta, plano atual, projetos, ultima entrada) passa a ser
-- montada no frontend a partir de dados que a pagina de Admin ja carrega
-- de outra forma (users e projects), sem depender desta funcao para isso.
DROP FUNCTION IF EXISTS public.admin_get_checkout_funnel(timestamptz);

CREATE FUNCTION public.admin_get_checkout_funnel(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  created_at timestamptz,
  user_id uuid,
  full_name text,
  username text,
  feature text,
  completed boolean
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
    SELECT f.created_at, f.user_id, p.full_name, p.username, f.feature,
           EXISTS (
             SELECT 1 FROM public.billing_events b
             WHERE b.user_id = f.user_id
               AND b.event = 'subscription_started'
               AND b.created_at >= f.created_at
           )
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    WHERE f.event = 'checkout_started' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_checkout_funnel(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_checkout_funnel(timestamptz) TO authenticated;
