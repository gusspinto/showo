-- O sort "Quem mais usa" do Admin ordenava por total_xp, que só é
-- incrementado por award_xp('mission_complete') — o único motivo chamado
-- no frontend (project_created/score_milestone/first_login_daily nunca
-- são invocados). Para a maioria dos users isso é 0, o sort não refletia
-- uso real nenhum. Pedido do Gustavo depois da reunião com o mentor, que
-- perguntou se dava para ver quem faz mais logins, para ligar aos mais
-- ativos de 2 em 2 semanas.
--
-- Acrescenta 'login_counts' ao admin_get_activity_stats já existente:
-- quantos eventos action='login' cada user teve no período. Bounded pelo
-- número de utilizadores ativos no período, mesma lógica de agregação
-- server-side da 133_admin_activity_stats_rpc.sql, nunca linhas cruas.

CREATE OR REPLACE FUNCTION public.admin_get_activity_stats(p_days int DEFAULT 9999)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'active_week', coalesce((
      SELECT jsonb_agg(DISTINCT user_id) FROM public.activity_log WHERE created_at > now() - interval '7 days'
    ), '[]'::jsonb),
    'active_month', coalesce((
      SELECT jsonb_agg(DISTINCT user_id) FROM public.activity_log WHERE created_at > now() - interval '30 days'
    ), '[]'::jsonb),
    'active_range', coalesce((
      SELECT jsonb_agg(DISTINCT user_id) FROM public.activity_log WHERE created_at > now() - make_interval(days => p_days)
    ), '[]'::jsonb),
    'sessions_range', (
      SELECT count(*) FROM public.activity_log
      WHERE created_at > now() - make_interval(days => p_days) AND action = 'login'
    ),
    'login_counts', coalesce((
      SELECT jsonb_object_agg(user_id, c) FROM (
        SELECT user_id, count(*) AS c
        FROM public.activity_log
        WHERE created_at > now() - make_interval(days => p_days) AND action = 'login'
        GROUP BY user_id
      ) sub
    ), '{}'::jsonb),
    'daily', coalesce((
      SELECT jsonb_agg(jsonb_build_object('day', to_char(d, 'YYYY-MM-DD'), 'count', c) ORDER BY d)
      FROM (
        SELECT date_trunc('day', created_at) AS d, count(DISTINCT user_id) AS c
        FROM public.activity_log
        WHERE created_at > now() - interval '31 days'
        GROUP BY 1
      ) sub
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_activity_stats(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_activity_stats(int) TO authenticated;
