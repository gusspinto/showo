-- admin_get_checkout_funnel (migracao 233) só dava nome, feature, data e se
-- pagou. Pedido do Gustavo: mais contexto por pessoa para saber porque não
-- avançaram. Acrescenta email (contacto direto), data de registo (conta
-- nova ou antiga), e o plano atual (se já resolveu por outro caminho desde
-- então). "Completou" passa a olhar para qualquer subscription_started
-- depois da tentativa, não só nos 7 dias seguintes, para não esconder quem
-- demorou mais a decidir.
DROP FUNCTION IF EXISTS public.admin_get_checkout_funnel(timestamptz);

CREATE FUNCTION public.admin_get_checkout_funnel(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  created_at timestamptz,
  user_id uuid,
  full_name text,
  username text,
  email text,
  signup_at timestamptz,
  current_plan text,
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
    SELECT f.created_at, f.user_id, p.full_name, p.username,
           u.email, p.created_at, coalesce(p.plan, 'free'), f.feature,
           EXISTS (
             SELECT 1 FROM public.billing_events b
             WHERE b.user_id = f.user_id
               AND b.event = 'subscription_started'
               AND b.created_at >= f.created_at
           )
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    LEFT JOIN auth.users u ON u.id = f.user_id
    WHERE f.event = 'checkout_started' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_checkout_funnel(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_checkout_funnel(timestamptz) TO authenticated;
