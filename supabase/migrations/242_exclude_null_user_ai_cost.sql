-- O Gustavo viu "Utilizador removido" com 40 chamadas e achou que era
-- alguém a passar por cima dos limites do plano. Investigado: nao e.
-- ai_costs.user_id tem ON DELETE SET NULL (correto, mantem o historico de
-- custo real mesmo depois de a conta ser apagada, para a contabilidade nao
-- perder dinheiro ja gasto). O problema e so do RELATORIO: estas linhas
-- espalhadas por 11 dias diferentes desde 14/09, de varias contas apagadas
-- ao longo do tempo (incluindo a conta de teste de jailbreak apagada hoje),
-- ficavam todas juntas debaixo de um "utilizador" fantasma so, parecendo
-- uma pessoa so a abusar. Nao ha nada de acionavel numa conta que ja nao
-- existe, por isso estas linhas saem desta vista (continuam na ai_costs
-- para o total geral de custo, so nao aparecem como se fossem 1 pessoa).
CREATE OR REPLACE FUNCTION public.admin_get_ai_cost_by_user(p_since timestamptz DEFAULT date_trunc('month', now()))
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
    WHERE c.created_at >= p_since AND c.cost_usd IS NOT NULL AND c.user_id IS NOT NULL
    GROUP BY c.user_id, p.full_name, p.username, p.plan
    ORDER BY sum(c.cost_usd) DESC NULLS LAST
    LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_ai_cost_breakdown(p_since timestamptz DEFAULT date_trunc('month', now()))
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
    WHERE c.created_at >= p_since AND c.cost_usd IS NOT NULL AND c.user_id IS NOT NULL
    GROUP BY c.user_id, c.feature;
END;
$$;
