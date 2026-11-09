-- admin_get_finance_summary contava paying_plus/paying_pro a partir de
-- stripe_customer_id IS NOT NULL, o mesmo sinal que o Overview do Admin já
-- tinha identificado como falso: essa coluna é escrita assim que o
-- Customer é criado no Stripe, antes de qualquer pagamento, e fica lá
-- mesmo que o checkout seja abandonado. admin_get_real_subscriber_ids já
-- resolve isto a sério (billing_events: último evento do user é
-- subscription_started ou payment_succeeded), mas o Finanças nunca foi
-- atualizado para usar a mesma lógica, inflacionando "Assinantes" e MRR
-- com gente que nunca chegou a pagar.
CREATE OR REPLACE FUNCTION public.admin_get_finance_summary(p_since timestamp with time zone DEFAULT date_trunc('month'::text, now()))
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'revenue_eur', coalesce((
      SELECT sum(amount_cents)::numeric / 100 FROM public.billing_events
      WHERE event = 'payment_succeeded' AND created_at >= p_since
    ), 0),
    'payments', coalesce((
      SELECT count(*) FROM public.billing_events
      WHERE event = 'payment_succeeded' AND created_at >= p_since
    ), 0),
    'new_subs', coalesce((
      SELECT count(*) FROM public.billing_events
      WHERE event = 'subscription_started' AND created_at >= p_since
    ), 0),
    'churned', coalesce((
      SELECT count(*) FROM public.billing_events
      WHERE event = 'subscription_churned' AND created_at >= p_since
    ), 0),
    'ai_cost_usd', coalesce((
      SELECT sum(cost_usd) FROM public.ai_costs WHERE created_at >= p_since
    ), 0),
    'ai_calls', coalesce((
      SELECT count(*) FROM public.ai_costs WHERE created_at >= p_since
    ), 0),
    'ai_calls_sem_preco', coalesce((
      SELECT count(*) FROM public.ai_costs WHERE created_at >= p_since AND cost_usd IS NULL
    ), 0),
    'ai_by_feature', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'cost_usd')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'feature', feature,
          'calls', count(*),
          'input_tokens', sum(input_tokens),
          'output_tokens', sum(output_tokens),
          'cost_usd', round(coalesce(sum(cost_usd), 0), 4)
        ) AS x
        FROM public.ai_costs WHERE created_at >= p_since GROUP BY feature
      ) s
    ), '[]'::jsonb),
    'fixed_cost_eur', coalesce((
      SELECT sum(amount_eur) FROM public.fixed_costs WHERE active
    ), 0),
    'fixed_costs', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount_eur', amount_eur, 'notes', notes) ORDER BY amount_eur DESC)
      FROM public.fixed_costs WHERE active
    ), '[]'::jsonb),
    'paying_plus', coalesce((
      SELECT count(*) FROM public.profiles p
      WHERE p.role <> 'professor' AND p.organization_id IS NULL AND p.plan IN ('plus', 'build')
        AND p.id IN (
          SELECT latest.user_id FROM (
            SELECT DISTINCT ON (b.user_id) b.user_id, b.event
            FROM public.billing_events b WHERE b.user_id IS NOT NULL
            ORDER BY b.user_id, b.created_at DESC
          ) latest WHERE latest.event IN ('subscription_started', 'payment_succeeded')
        )
    ), 0),
    'paying_pro', coalesce((
      SELECT count(*) FROM public.profiles p
      WHERE p.role <> 'professor' AND p.organization_id IS NULL AND p.plan IN ('pro', 'launch')
        AND p.id IN (
          SELECT latest.user_id FROM (
            SELECT DISTINCT ON (b.user_id) b.user_id, b.event
            FROM public.billing_events b WHERE b.user_id IS NOT NULL
            ORDER BY b.user_id, b.created_at DESC
          ) latest WHERE latest.event IN ('subscription_started', 'payment_succeeded')
        )
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
