-- Depois de "mais contexto por pessoa" (migracao 236), pedido do Gustavo
-- para saber quem vale mesmo a pena contactar: numero de projetos e nota
-- do melhor (envolvimento real na plataforma, nao so uma conta criada), e
-- a ultima vez que entrou (auth.users.last_sign_in_at), para distinguir
-- quem ainda usa o Showo de quem ja desapareceu antes de decidir contactar
-- alguem que esta frio.
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
  completed boolean,
  project_count bigint,
  best_score int,
  last_sign_in_at timestamptz
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
           ),
           coalesce(pr.project_count, 0),
           pr.best_score,
           u.last_sign_in_at
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    LEFT JOIN auth.users u ON u.id = f.user_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS project_count, max(score) AS best_score
      FROM public.projects pj
      WHERE pj.user_id = f.user_id AND pj.entry_kind = 'full'
    ) pr ON true
    WHERE f.event = 'checkout_started' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_checkout_funnel(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_checkout_funnel(timestamptz) TO authenticated;
