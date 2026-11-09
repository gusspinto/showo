-- Pedido do Gustavo depois de discutir o pior caso teorico do Pro (migracao
-- 232): nao esgotar varios limites de IA ao mesmo tempo e um risco so na
-- teoria, mas nao havia forma de ver isso na pratica sem correr SQL a mao.
-- Esta funcao da visibilidade permanente a quem gasta mais em IA por mes,
-- para decidir um teto de custo global SO se algum dia isto deixar de ser
-- teorico.
CREATE FUNCTION public.admin_get_ai_cost_by_user(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  user_id uuid,
  full_name text,
  username text,
  plan text,
  calls bigint,
  total_usd numeric
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
    SELECT c.user_id, p.full_name, p.username, coalesce(p.plan, 'free'),
           count(*), sum(c.cost_usd)
    FROM public.ai_costs c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    WHERE c.created_at >= p_since AND c.cost_usd IS NOT NULL
    GROUP BY c.user_id, p.full_name, p.username, p.plan
    ORDER BY sum(c.cost_usd) DESC NULLS LAST
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_cost_by_user(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_cost_by_user(timestamptz) TO authenticated;
