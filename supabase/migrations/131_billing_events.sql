-- profiles.plan only ever holds the *current* plan — a cancellation
-- overwrites it with 'free' and the history is gone. There was no way to see
-- MRR trend, new subscriptions this month, or churn in the admin panel.
-- The stripe-webhook function now logs every subscription_started,
-- subscription_churned and payment_succeeded event here; this table is the
-- source of truth for revenue history going forward (no retroactive backfill
-- of older Stripe events).

CREATE TABLE IF NOT EXISTS public.billing_events (
  id bigint generated always as identity primary key,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,          -- subscription_started | subscription_churned | payment_succeeded
  plan text,
  amount_cents int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_event_created_idx ON public.billing_events (event, created_at);
CREATE INDEX IF NOT EXISTS billing_events_user_idx ON public.billing_events (user_id);

-- Only the service role (stripe-webhook, which uses the service key) writes
-- here — no client-facing insert policy, unlike funnel_events.
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_get_billing_summary(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(event text, count bigint, total_amount_cents bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT b.event, count(*), coalesce(sum(b.amount_cents), 0)
    FROM public.billing_events b
    WHERE b.created_at >= p_since
    GROUP BY b.event;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_billing_summary(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_billing_summary(timestamptz) TO authenticated;
