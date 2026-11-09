-- O Coach no Pro e no Escola Pro ficou esquecido em 300 mensagens/mes quando
-- baixamos o do Plus de 100 para 30 (migracao 229). No pior caso de custo
-- real por mensagem ja visto em ai_costs ($0,068), 300 mensagens sozinhas
-- custam $20,40, mais do que o preco todo do Pro (€17,99 ~= $19,53) sem
-- contar com mais nenhuma feature. Margem do Pro no pior caso ficava
-- NEGATIVA (~-37%).
--
-- Baixado para 80 (2,67x o do Plus, dentro da mesma proporcao das outras
-- features pagas do Pro, que andam entre 2x e 5x o Plus). Com 80:
--   - caso medio (custo medio real x limites de todas as features): ~70% margem
--   - pior caso (custo maximo real ja visto x limites): ~39% margem
-- Ambos positivos, ja nao ha cenario em que perdemos dinheiro no mes.
CREATE OR REPLACE FUNCTION public.check_ai_limit(p_user_id text, p_feature text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_plan      text;
  v_acct      text;
  v_org_id    uuid;
  v_org_plan  text;
  v_role      text;
  v_limit     int;
  v_month     text;
  v_used      int;
  v_remaining int;
BEGIN
  SELECT coalesce(plan, 'free'), account_type, organization_id, role
    INTO v_plan, v_acct, v_org_id, v_role
    FROM public.profiles
   WHERE id = p_user_id::uuid;

  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  IF v_role = 'professor' THEN v_plan := 'pro'; END IF;

  IF v_org_id IS NOT NULL AND v_role != 'professor' THEN
    SELECT o.plan INTO v_org_plan FROM public.organizations o WHERE o.id = v_org_id;
    IF v_org_plan = 'launch' THEN v_org_plan := 'pro'; END IF;
    IF v_org_plan = 'build' THEN v_org_plan := 'plus'; END IF;
    v_plan := CASE WHEN v_org_plan = 'pro' THEN 'school_pro' ELSE 'school' END;
  END IF;

  IF v_plan = 'build' THEN v_plan := 'plus'; END IF;
  IF v_plan = 'launch' THEN v_plan := 'pro'; END IF;

  v_limit := CASE
    WHEN v_plan = 'free' AND p_feature = 'createProject'     THEN 3
    WHEN v_plan = 'free' AND p_feature = 'interviewProject'  THEN 3
    WHEN v_plan = 'free' AND p_feature = 'coach'             THEN 10
    WHEN v_plan = 'free' AND p_feature = 'defense'           THEN 1
    WHEN v_plan = 'free' AND p_feature = 'defenseTraining'   THEN 0
    WHEN v_plan = 'free' AND p_feature = 'diaryReport'       THEN 1
    WHEN v_plan = 'free' AND p_feature = 'narrative'         THEN 1
    WHEN v_plan = 'free' AND p_feature = 'analyzeProject'    THEN 1
    WHEN v_plan = 'free' AND p_feature = 'coverLetter'       THEN 0
    WHEN v_plan = 'free' AND p_feature = 'exportPptx'        THEN 3
    WHEN v_plan = 'free' AND p_feature = 'generateImage'     THEN 0
    WHEN v_plan = 'school' AND p_feature = 'createProject'    THEN 15
    WHEN v_plan = 'school' AND p_feature = 'interviewProject' THEN 15
    WHEN v_plan = 'school' AND p_feature = 'coach'            THEN 150
    WHEN v_plan = 'school' AND p_feature = 'defense'          THEN 15
    WHEN v_plan = 'school' AND p_feature = 'defenseTraining'  THEN 10
    WHEN v_plan = 'school' AND p_feature = 'diaryReport'      THEN 5
    WHEN v_plan = 'school' AND p_feature = 'narrative'        THEN 15
    WHEN v_plan = 'school' AND p_feature = 'analyzeProject'   THEN 15
    WHEN v_plan = 'school' AND p_feature = 'coverLetter'      THEN 0
    WHEN v_plan = 'school' AND p_feature = 'exportPptx'       THEN 20
    WHEN v_plan = 'school' AND p_feature = 'generateImage'    THEN 0
    WHEN v_plan = 'school_pro' AND p_feature = 'createProject'    THEN 30
    WHEN v_plan = 'school_pro' AND p_feature = 'interviewProject' THEN 30
    WHEN v_plan = 'school_pro' AND p_feature = 'coach'            THEN 80
    WHEN v_plan = 'school_pro' AND p_feature = 'defense'          THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'defenseTraining'  THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'diaryReport'      THEN 10
    WHEN v_plan = 'school_pro' AND p_feature = 'narrative'        THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'analyzeProject'   THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'coverLetter'      THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'exportPptx'       THEN 999999
    WHEN v_plan = 'school_pro' AND p_feature = 'generateImage'    THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'createProject'     THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'interviewProject'  THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'coach'             THEN 30
    WHEN v_plan = 'plus' AND p_feature = 'defense'           THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'defenseTraining'   THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'diaryReport'       THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'narrative'         THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'analyzeProject'    THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'coverLetter'       THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'exportPptx'        THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'generateImage'     THEN 5
    WHEN v_plan = 'pro' AND p_feature = 'createProject'      THEN 30
    WHEN v_plan = 'pro' AND p_feature = 'interviewProject'   THEN 30
    WHEN v_plan = 'pro' AND p_feature = 'coach'              THEN 80
    WHEN v_plan = 'pro' AND p_feature = 'defense'            THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'defenseTraining'    THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'diaryReport'        THEN 10
    WHEN v_plan = 'pro' AND p_feature = 'narrative'          THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'analyzeProject'     THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'coverLetter'        THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'exportPptx'         THEN 999999
    WHEN v_plan = 'pro' AND p_feature = 'generateImage'      THEN 15
    ELSE 0
  END;

  IF v_limit = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'used', 0);
  END IF;

  IF v_limit = 999999 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 999999, 'limit', 999999, 'used', 0);
  END IF;

  v_month := to_char(now(), 'YYYY-MM');

  INSERT INTO public.ai_usage (user_id, feature, month, used, updated_at)
  VALUES (p_user_id::uuid, p_feature, v_month, 1, now())
  ON CONFLICT (user_id, feature, month)
  DO UPDATE SET used = ai_usage.used + 1, updated_at = now()
  RETURNING used INTO v_used;

  v_remaining := greatest(0, v_limit - v_used);

  IF v_used > v_limit THEN
    UPDATE public.ai_usage
    SET used = used - 1, updated_at = now()
    WHERE user_id = p_user_id::uuid AND feature = p_feature AND month = v_month;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'used', v_used - 1);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', v_limit, 'used', v_used);
END;
$function$;
