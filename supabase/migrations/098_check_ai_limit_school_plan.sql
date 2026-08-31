-- Fix check_ai_limit to handle school accounts and professor role
-- Previously the RPC only read profiles.plan, missing the school/professor overrides
-- that the frontend applies. Now the backend mirrors that logic.

CREATE OR REPLACE FUNCTION public.check_ai_limit(
  p_user_id  uuid,
  p_feature  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan      text;
  v_acct      text;
  v_org_id    uuid;
  v_role      text;
  v_limit     int;
  v_month     text;
  v_used      int;
  v_remaining int;
BEGIN
  SELECT coalesce(plan, 'free'), account_type, organization_id, role
    INTO v_plan, v_acct, v_org_id, v_role
    FROM public.profiles
   WHERE id = p_user_id;

  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  -- Professors always get launch
  IF v_role = 'professor' THEN v_plan := 'launch'; END IF;

  -- School accounts get school plan (override DB plan)
  IF v_org_id IS NOT NULL AND v_role != 'professor' THEN v_plan := 'school'; END IF;

  v_limit := CASE
    -- free plan
    WHEN v_plan = 'free' AND p_feature = 'createProject'     THEN 2
    WHEN v_plan = 'free' AND p_feature = 'interviewProject'  THEN 0
    WHEN v_plan = 'free' AND p_feature = 'coach'             THEN 10
    WHEN v_plan = 'free' AND p_feature = 'defense'           THEN 1
    WHEN v_plan = 'free' AND p_feature = 'diaryReport'       THEN 1
    WHEN v_plan = 'free' AND p_feature = 'narrative'         THEN 1
    WHEN v_plan = 'free' AND p_feature = 'analyzeProject'    THEN 0
    WHEN v_plan = 'free' AND p_feature = 'coverLetter'       THEN 0
    -- school plan (unlimited except coverLetter)
    WHEN v_plan = 'school' AND p_feature = 'coverLetter'     THEN 0
    WHEN v_plan = 'school'                                    THEN 999999
    -- build plan (unlimited except coverLetter)
    WHEN v_plan = 'build' AND p_feature = 'coverLetter'      THEN 0
    WHEN v_plan = 'build'                                     THEN 999999
    -- launch plan (all unlimited)
    WHEN v_plan = 'launch'                                    THEN 999999
    -- unknown → blocked
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
  VALUES (p_user_id, p_feature, v_month, 1, now())
  ON CONFLICT (user_id, feature, month)
  DO UPDATE SET used = ai_usage.used + 1, updated_at = now()
  RETURNING used INTO v_used;

  v_remaining := greatest(0, v_limit - v_used);

  IF v_used > v_limit THEN
    UPDATE public.ai_usage
    SET used = used - 1, updated_at = now()
    WHERE user_id = p_user_id AND feature = p_feature AND month = v_month;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'used', v_used - 1);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', v_limit, 'used', v_used);
END;
$$;
