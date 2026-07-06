-- ============================================================
-- 023 — Rate limiting for Edge Functions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fn_rate_limits (
  key  TEXT    NOT NULL,
  win  INTEGER NOT NULL, -- unix timestamp floored to hour
  cnt  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, win)
);

ALTER TABLE public.fn_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_fn_rate_limit(p_key text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_win integer := extract(epoch from date_trunc('hour', now()))::integer;
  cur_cnt integer;
BEGIN
  INSERT INTO public.fn_rate_limits (key, win, cnt)
  VALUES (p_key, cur_win, 1)
  ON CONFLICT (key, win) DO UPDATE
    SET cnt = fn_rate_limits.cnt + 1
  RETURNING cnt INTO cur_cnt;
  RETURN cur_cnt <= p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_fn_rate_limit(text, integer) TO service_role;

-- Cleanup entries older than 2 hours (runs every hour)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$DELETE FROM public.fn_rate_limits WHERE win < extract(epoch from now() - interval '2 hours')::integer$$
);
