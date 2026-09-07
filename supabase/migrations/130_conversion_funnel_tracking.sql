-- Conversion-funnel visibility for the admin panel.
--
-- Before this: the admin "Planos pagos" stat only counted profiles.plan IN
-- ('build','launch') — the old plan names. Every new subscriber since the
-- Plus/Pro rename writes 'plus'/'pro', so that stat was silently undercounting
-- (or outright wrong) real revenue-relevant data.
--
-- Also nothing recorded when a user saw the dashboard upgrade nudge, clicked
-- it, or started a checkout — those steps of the funnel were invisible.

-- ── Who actually hit an AI limit this month (admin-only, aggregated read) ──
CREATE OR REPLACE FUNCTION public.admin_get_ai_usage_summary(p_month text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS TABLE(user_id uuid, feature text, used int, plan text, role text, organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT a.user_id, a.feature, a.used, p.plan, p.role, p.organization_id
    FROM public.ai_usage a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.month = p_month;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_usage_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_usage_summary(text) TO authenticated;

-- ── Funnel events: nudge shown/clicked, checkout started ──
-- Each user can only log their own events (auth.uid() = user_id). No SELECT
-- policy for regular users — only the admin RPC below can read them back.
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id bigint generated always as identity primary key,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  feature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_events_event_created_idx ON public.funnel_events (event, created_at);
CREATE INDEX IF NOT EXISTS funnel_events_user_idx ON public.funnel_events (user_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own funnel events" ON public.funnel_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.admin_get_funnel_summary(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(event text, feature text, count bigint, distinct_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT f.event, f.feature, count(*), count(DISTINCT f.user_id)
    FROM public.funnel_events f
    WHERE f.created_at >= p_since
    GROUP BY f.event, f.feature;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_funnel_summary(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_funnel_summary(timestamptz) TO authenticated;
