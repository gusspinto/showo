-- O checkout passa a aceitar uma variante anual por plano (Plus/Pro). Sem
-- gravar a periodicidade a par do plano, uma fatura anual fica indistinguível
-- da mensal no histórico de billing_events e no admin (MRR/trend errados).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_period text
  CHECK (plan_period IN ('monthly', 'annual'));

ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS plan_period text;
