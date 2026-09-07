-- The "Plano" selector when creating/editing a school (Plus vs Pro) never
-- actually did anything — check_ai_limit ignored organizations.plan and gave
-- every institutional account the same fixed "school" limits regardless of
-- what was picked. This wires it up for real: schools on the Pro tier now
-- get a materially higher limit set (school_pro), matching the new
-- PLANS.school_pro entry in src/lib/plans.js.

CREATE OR REPLACE FUNCTION public.check_ai_limit(
  p_user_id  text,
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
   WHERE id = p_user_id;

  IF v_plan IS NULL THEN v_plan := 'free'; END IF;

  -- Professors always get pro
  IF v_role = 'professor' THEN v_plan := 'pro'; END IF;

  -- School accounts: tier depends on the organization's own plan now.
  -- Existing orgs still carry the pre-rename values ('build'/'launch'),
  -- so alias those the same way individual profiles.plan does below.
  IF v_org_id IS NOT NULL AND v_role != 'professor' THEN
    SELECT o.plan INTO v_org_plan FROM public.organizations o WHERE o.id = v_org_id;
    IF v_org_plan = 'launch' THEN v_org_plan := 'pro'; END IF;
    IF v_org_plan = 'build' THEN v_org_plan := 'plus'; END IF;
    v_plan := CASE WHEN v_org_plan = 'pro' THEN 'school_pro' ELSE 'school' END;
  END IF;

  IF v_plan = 'build' THEN v_plan := 'plus'; END IF;
  IF v_plan = 'launch' THEN v_plan := 'pro'; END IF;

  v_limit := CASE
    -- free
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
    -- school (Escola Plus)
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
    -- school_pro (Escola Pro)
    WHEN v_plan = 'school_pro' AND p_feature = 'createProject'    THEN 30
    WHEN v_plan = 'school_pro' AND p_feature = 'interviewProject' THEN 30
    WHEN v_plan = 'school_pro' AND p_feature = 'coach'            THEN 300
    WHEN v_plan = 'school_pro' AND p_feature = 'defense'          THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'defenseTraining'  THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'diaryReport'      THEN 10
    WHEN v_plan = 'school_pro' AND p_feature = 'narrative'        THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'analyzeProject'   THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'coverLetter'      THEN 25
    WHEN v_plan = 'school_pro' AND p_feature = 'exportPptx'       THEN 999999
    -- plus
    WHEN v_plan = 'plus' AND p_feature = 'createProject'     THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'interviewProject'  THEN 15
    WHEN v_plan = 'plus' AND p_feature = 'coach'             THEN 100
    WHEN v_plan = 'plus' AND p_feature = 'defense'           THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'defenseTraining'   THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'diaryReport'       THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'narrative'         THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'analyzeProject'    THEN 10
    WHEN v_plan = 'plus' AND p_feature = 'coverLetter'       THEN 5
    WHEN v_plan = 'plus' AND p_feature = 'exportPptx'        THEN 15
    -- pro
    WHEN v_plan = 'pro' AND p_feature = 'createProject'      THEN 30
    WHEN v_plan = 'pro' AND p_feature = 'interviewProject'   THEN 30
    WHEN v_plan = 'pro' AND p_feature = 'coach'              THEN 300
    WHEN v_plan = 'pro' AND p_feature = 'defense'            THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'defenseTraining'    THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'diaryReport'        THEN 10
    WHEN v_plan = 'pro' AND p_feature = 'narrative'          THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'analyzeProject'     THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'coverLetter'        THEN 25
    WHEN v_plan = 'pro' AND p_feature = 'exportPptx'         THEN 999999
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

-- admin_get_ai_usage_summary needs the organization's plan too, otherwise the
-- admin funnel would misclassify school_pro accounts as plain "school" when
-- checking whether they're at their limit.
CREATE OR REPLACE FUNCTION public.admin_get_ai_usage_summary(p_month text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS TABLE(user_id uuid, feature text, used int, plan text, role text, organization_id uuid, organization_plan text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT a.user_id, a.feature, a.used, p.plan, p.role, p.organization_id, o.plan AS organization_plan
    FROM public.ai_usage a
    JOIN public.profiles p ON p.id = a.user_id
    LEFT JOIN public.organizations o ON o.id = p.organization_id
    WHERE a.month = p_month;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_usage_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_usage_summary(text) TO authenticated;
