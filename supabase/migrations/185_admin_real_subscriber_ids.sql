-- O painel de admin contava "Assinantes reais"/"MRR real" a partir de
-- stripe_customer_id + profiles.plan. stripe_customer_id é escrito em
-- create-checkout assim que se cria o Customer no Stripe, ANTES de qualquer
-- pagamento — uma tentativa de checkout abandonada já deixa esse campo
-- preenchido. Combinado com um plan alterado manualmente (ex: acesso de
-- teste dado por SQL), isso contava como "assinante real" sem nunca ter
-- havido pagamento. A prova real é o billing_events, escrito só pelo
-- webhook do Stripe quando a subscrição é confirmada.
CREATE OR REPLACE FUNCTION public.admin_get_real_subscriber_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT latest.user_id
    FROM (
      SELECT DISTINCT ON (b.user_id) b.user_id, b.event
      FROM public.billing_events b
      WHERE b.user_id IS NOT NULL
      ORDER BY b.user_id, b.created_at DESC
    ) latest
    WHERE latest.event IN ('subscription_started', 'payment_succeeded');
END;
$$;
