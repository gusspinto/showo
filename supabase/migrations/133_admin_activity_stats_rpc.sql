-- The admin overview pulled activity_log with a flat .limit(5000), ordered
-- newest-first. At ~29 rows/day that only covers the last ~170 days today,
-- and the margin shrinks as usage grows — once total rows pass 5000, the
-- 90-day/"Tudo" views (and the meeting-summary export) start silently
-- excluding real activity with no error or warning.
--
-- Replaces raw-row shipping with server-side aggregation: the browser never
-- sees more than "how many distinct users were active", which stays bounded
-- by total user count (currently 74) rather than event count, so this never
-- needs revisiting as activity volume grows.

CREATE OR REPLACE FUNCTION public.admin_get_activity_stats(p_days int DEFAULT 9999)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
