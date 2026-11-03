-- O card "Funil de conversao" do Admin mostrava "Viram o nudge" / "Clicaram
-- no nudge" (do LimitNudgeBanner do Dashboard) ao lado de "Iniciaram
-- checkout" (que na verdade vem de outro mecanismo completamente
-- independente, o PlanGateModal, disparado em qualquer feature que bata no
-- limite) como se fossem passos sequenciais do mesmo funil. Nao sao: dava
-- para ter 0 cliques no nudge e 37 checkouts iniciados ao mesmo tempo,
-- confuso para quem olha. Esta funcao da o detalhe por pessoa de quem
-- iniciou checkout, com que feature o motivou, e se chegou mesmo a pagar
-- (cruzando com billing_events), para o Admin poder separar os dois
-- mecanismos e mostrar uma lista real em vez de so o numero agregado.
CREATE OR REPLACE FUNCTION public.admin_get_checkout_funnel(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  created_at timestamptz,
  user_id uuid,
  full_name text,
  username text,
  feature text,
  completed boolean
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
    SELECT f.created_at, f.user_id, p.full_name, p.username, f.feature,
           EXISTS (
             SELECT 1 FROM public.billing_events b
             WHERE b.user_id = f.user_id
               AND b.event = 'subscription_started'
               AND b.created_at >= f.created_at
               AND b.created_at <= f.created_at + interval '7 days'
           )
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    WHERE f.event = 'checkout_started' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_checkout_funnel(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_checkout_funnel(timestamptz) TO authenticated;
