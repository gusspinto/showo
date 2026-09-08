-- PAINEL FINANCEIRO
--
-- Até agora o custo de IA não era guardado em lado nenhum — só dava para o
-- estimar de fora, multiplicando contagens de uso por um custo médio
-- inventado. Um painel financeiro construído sobre isso mostraria números
-- que parecem exatos e não são, que foi exatamente o problema do "MRR
-- €34,96" que afinal eram acessos oferecidos a professores.
--
-- A API devolve os tokens reais de cada chamada. Passamos a guardá-los e a
-- calcular o custo a partir deles, com a tabela de preços por modelo. Custos
-- passados não são recuperáveis — o painel começa vazio e enche a partir de
-- agora, o que é preferível a começar cheio de ficção.

CREATE TABLE IF NOT EXISTS public.ai_costs (
  id bigint generated always as identity primary key,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  -- NULL = modelo sem preço conhecido na tabela. Fica explícito em vez de
  -- entrar como 0 e baixar o custo total sem ninguém dar por isso.
  cost_usd numeric(12,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_costs_created_idx ON public.ai_costs (created_at);
CREATE INDEX IF NOT EXISTS ai_costs_feature_idx ON public.ai_costs (feature);

-- Só o service role (as edge functions) escreve aqui; a leitura é pela RPC
-- de admin abaixo. Sem políticas = negado a anon/authenticated.
ALTER TABLE public.ai_costs ENABLE ROW LEVEL SECURITY;

-- ── Custos fixos (Supabase, Vercel, Resend, domínio...) ──
-- Não há forma de os descobrir a partir da base de dados: são faturas de
-- terceiros. Ficam aqui para o painel poder mostrar lucro real e não só
-- margem sobre IA.
CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id bigint generated always as identity primary key,
  name text NOT NULL,
  amount_eur numeric(10,2) NOT NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fixed costs" ON public.fixed_costs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── Resumo financeiro para o admin ──
CREATE OR REPLACE FUNCTION public.admin_get_finance_summary(p_since timestamptz DEFAULT date_trunc('month', now()))
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
    -- Receita mesmo recebida (faturas pagas no Stripe)
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

    -- Custo de IA real, a partir dos tokens gastos
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

    -- Custos fixos mensais
    'fixed_cost_eur', coalesce((
      SELECT sum(amount_eur) FROM public.fixed_costs WHERE active
    ), 0),
    'fixed_costs', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount_eur', amount_eur, 'notes', notes) ORDER BY amount_eur DESC)
      FROM public.fixed_costs WHERE active
    ), '[]'::jsonb),

    -- Assinantes que pagam mesmo (têm cliente Stripe), para o MRR
    'paying_plus', coalesce((
      SELECT count(*) FROM public.profiles
      WHERE stripe_customer_id IS NOT NULL AND role <> 'professor'
        AND organization_id IS NULL AND plan IN ('plus','build')
    ), 0),
    'paying_pro', coalesce((
      SELECT count(*) FROM public.profiles
      WHERE stripe_customer_id IS NOT NULL AND role <> 'professor'
        AND organization_id IS NULL AND plan IN ('pro','launch')
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_finance_summary(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_finance_summary(timestamptz) TO authenticated;
