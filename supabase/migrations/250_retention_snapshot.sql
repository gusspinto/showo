-- Retenção mensal/semanal no Admin era recalculada ao vivo em cada reload,
-- com base numa coorte pequena (ex: 140 pessoas na semanal). Isso faz o
-- número oscilar visivelmente em minutos, não porque algo mudou a sério,
-- mas porque "agora" avança, pessoas entram/saem da janela de 7-14 dias e
-- activity_log ganha linhas novas entre um reload e outro. Confirmado ao
-- vivo (2026-11-11): 20/141 (14%) tornou-se 23/140 (16%) em poucos minutos
-- sem ninguém ter "desvoltado". Fixa-se agora como snapshot diário: um
-- valor por dia, calculado uma vez, igual até ao próximo cálculo.

CREATE TABLE IF NOT EXISTS public.admin_retention_snapshots (
  snapshot_date date PRIMARY KEY DEFAULT current_date,
  month_prior_count int NOT NULL,
  month_prior_returned int NOT NULL,
  week_cohort_count int NOT NULL,
  week_cohort_returned int NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_retention_snapshots ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só se lê via admin_get_retention_snapshot (SECURITY
-- DEFINER), nunca por select direto à tabela.

-- Mesma lógica que estava no frontend (Admin.jsx), agora portada para SQL
-- e corrida uma vez por dia em vez de em cada render:
-- mensal = de quem já existia há 30+ dias, quantos tiveram atividade
-- (activity_log) nos últimos 30 dias;
-- semanal = coorte de quem se registou há 7-14 dias (já teve uma semana
-- inteira de oportunidade para voltar), quantos voltaram nos últimos 7 dias.
CREATE OR REPLACE FUNCTION public.admin_compute_retention_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_month_prior_count int;
  v_month_prior_returned int;
  v_week_cohort_count int;
  v_week_cohort_returned int;
BEGIN
  SELECT count(*) INTO v_month_prior_count
  FROM public.profiles WHERE created_at < now() - interval '30 days';

  SELECT count(DISTINCT p.id) INTO v_month_prior_returned
  FROM public.profiles p
  JOIN public.activity_log a ON a.user_id = p.id AND a.created_at > now() - interval '30 days'
  WHERE p.created_at < now() - interval '30 days';

  SELECT count(*) INTO v_week_cohort_count
  FROM public.profiles
  WHERE created_at < now() - interval '7 days' AND created_at >= now() - interval '14 days';

  SELECT count(DISTINCT p.id) INTO v_week_cohort_returned
  FROM public.profiles p
  JOIN public.activity_log a ON a.user_id = p.id AND a.created_at > now() - interval '7 days'
  WHERE p.created_at < now() - interval '7 days' AND p.created_at >= now() - interval '14 days';

  INSERT INTO public.admin_retention_snapshots (
    snapshot_date, month_prior_count, month_prior_returned, week_cohort_count, week_cohort_returned
  ) VALUES (
    current_date, v_month_prior_count, v_month_prior_returned, v_week_cohort_count, v_week_cohort_returned
  )
  ON CONFLICT (snapshot_date) DO UPDATE SET
    month_prior_count = excluded.month_prior_count,
    month_prior_returned = excluded.month_prior_returned,
    week_cohort_count = excluded.week_cohort_count,
    week_cohort_returned = excluded.week_cohort_returned,
    computed_at = now();
END;
$$;

-- Sem GRANT a authenticated/anon de propósito: só o cron (role dono) deve
-- disparar o cálculo. O Admin só lê, via a função abaixo.
CREATE OR REPLACE FUNCTION public.admin_get_retention_snapshot()
RETURNS public.admin_retention_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.admin_retention_snapshots;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_row FROM public.admin_retention_snapshots ORDER BY snapshot_date DESC LIMIT 1;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_retention_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_retention_snapshot() TO authenticated;

-- Uma vez por dia, de madrugada (hora morta, fora de qualquer outro cron
-- de email já agendado nesta janela).
SELECT cron.schedule(
  'compute-retention-snapshot',
  '11 3 * * *',
  $$ select public.admin_compute_retention_snapshot(); $$
);
