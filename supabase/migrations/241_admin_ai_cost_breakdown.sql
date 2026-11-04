-- Pedido do Gustavo: o card de custo de IA por utilizador (migracao 240)
-- so dava o total, sem dizer ONDE a pessoa gasta mais. Funcao nova e
-- independente (nao mexe na 240), mesmo padrao usado no funil de checkout
-- (238/239) para nao repetir o problema do cache do PostgREST ao mudar
-- assinaturas de funcoes existentes.
CREATE FUNCTION public.admin_get_ai_cost_breakdown(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  user_id uuid,
  feature text,
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
    SELECT c.user_id, c.feature, count(*), sum(c.cost_usd)
    FROM public.ai_costs c
    WHERE c.created_at >= p_since AND c.cost_usd IS NOT NULL
    GROUP BY c.user_id, c.feature;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_cost_breakdown(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_cost_breakdown(timestamptz) TO authenticated;
