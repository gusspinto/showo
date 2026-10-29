-- O anual passa a poder ser pago por pagamento único (Multibanco/MB WAY não
-- funcionam em modo subscrição no Stripe, confirmado por teste direto na
-- API). Sem subscrição do Stripe a gerir isto, é o próprio Showo que tem de
-- saber quando o ano acaba, para voltar a free sozinho.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

GRANT SELECT (plan_expires_at) ON public.profiles TO authenticated;
-- Sem UPDATE para authenticated de propósito: só o stripe-webhook e o cron
-- de expiração (service_role, ignora GRANTs) escrevem aqui. O próprio
-- utilizador nunca deve poder mexer na data de expiração do plano dele.

CREATE OR REPLACE FUNCTION public.expire_annual_plans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET plan = 'free', plan_period = null, plan_expires_at = null
  WHERE plan_expires_at IS NOT NULL AND plan_expires_at < now();
END;
$$;

SELECT cron.schedule(
  'expire-annual-plans',
  '0 3 * * *',
  $$ SELECT public.expire_annual_plans(); $$
);
