-- ============================================================================
-- 114_invite_codes_organization.sql — Link professor invite codes to orgs
--
-- Problem: professors register via invite code but aren't linked to any
-- organization. This adds organization_id to invite codes so that when a
-- professor redeems a code, they're automatically associated with the school.
-- ============================================================================

-- ── 1. Add organization_id to invite codes ──────────────────────────────────

ALTER TABLE public.professor_invite_codes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ── 2. Update create RPC to accept organization_id ──────────────────────────

CREATE OR REPLACE FUNCTION public.create_professor_invite_code(
  p_label      TEXT    DEFAULT NULL,
  p_max_uses   INTEGER DEFAULT NULL,
  p_org_id     UUID    DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_max_uses IS NOT NULL AND p_max_uses < 1 THEN
    RAISE EXCEPTION 'max_uses must be positive';
  END IF;
  IF p_org_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;

  LOOP
    v_code := (
      SELECT string_agg(substr(v_chars, (random() * length(v_chars))::int + 1, 1), '')
      FROM generate_series(1, 8)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.professor_invite_codes WHERE code = v_code);
  END LOOP;

  INSERT INTO public.professor_invite_codes (code, label, max_uses, created_by, organization_id)
  VALUES (v_code, nullif(trim(p_label), ''), p_max_uses, auth.uid(), p_org_id);

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_professor_invite_code(TEXT, INTEGER, UUID) TO authenticated;

-- ── 3. Update redeem RPC to set organization_id from the code ───────────────

CREATE OR REPLACE FUNCTION public.redeem_professor_invite_code(
  p_code      TEXT,
  p_full_name TEXT,
  p_school    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id     UUID;
  v_org_id UUID;
  v_already_redeemed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id, organization_id INTO v_id, v_org_id
  FROM public.professor_invite_codes
  WHERE code = upper(trim(p_code))
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_exhausted_code';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.professor_invite_redemptions
    WHERE code_id = v_id AND user_id = auth.uid()
  ) INTO v_already_redeemed;

  IF NOT v_already_redeemed THEN
    INSERT INTO public.professor_invite_redemptions (code_id, user_id) VALUES (v_id, auth.uid());
    UPDATE public.professor_invite_codes SET use_count = use_count + 1 WHERE id = v_id;
  END IF;

  PERFORM set_config('app.trusted_profile_write', 'true', true);

  INSERT INTO public.profiles (id, full_name, role, school, organization_id)
  VALUES (auth.uid(), nullif(trim(p_full_name), ''), 'professor', nullif(trim(p_school), ''), v_org_id)
  ON CONFLICT (id) DO UPDATE
    SET role            = 'professor',
        full_name       = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
        school          = coalesce(nullif(trim(p_school), ''), public.profiles.school),
        organization_id = coalesce(v_org_id, public.profiles.organization_id);

  PERFORM set_config('app.trusted_profile_write', 'false', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_professor_invite_code(TEXT, TEXT, TEXT) TO authenticated;
