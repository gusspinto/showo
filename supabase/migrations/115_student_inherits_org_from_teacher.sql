-- ============================================================================
-- 115_student_inherits_org_from_teacher.sql
--
-- When a student joins a class via register_institutional_student, they
-- inherit the teacher's organization_id. This links students to the school
-- without requiring email domain validation.
--
-- Also makes email_domain optional on organizations (many secondary schools
-- don't have institutional email).
-- ============================================================================

-- ── 1. Make email_domain nullable on organizations ──────────────────────────

ALTER TABLE public.organizations ALTER COLUMN email_domain DROP NOT NULL;

-- Drop the UNIQUE constraint so we can have multiple orgs without domain
-- (need to find and drop the constraint by name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_email_domain_key'
  ) THEN
    ALTER TABLE public.organizations DROP CONSTRAINT organizations_email_domain_key;
  END IF;
END $$;

-- Re-add unique but only for non-null domains
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_email_domain_unique
  ON public.organizations (email_domain)
  WHERE email_domain IS NOT NULL;

-- ── 2. Update admin_create_organization to allow null domain ────────────────

CREATE OR REPLACE FUNCTION public.admin_create_organization(
  p_name         TEXT,
  p_email_domain TEXT DEFAULT NULL,
  p_plan         TEXT DEFAULT 'build'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_email_domain IS NOT NULL AND trim(p_email_domain) != '' THEN
    IF p_email_domain !~ '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'invalid email domain format';
    END IF;
  END IF;

  INSERT INTO public.organizations (name, email_domain, plan)
  VALUES (p_name, CASE WHEN trim(coalesce(p_email_domain,'')) = '' THEN NULL ELSE lower(trim(p_email_domain)) END, p_plan)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_organization(TEXT, TEXT, TEXT) TO authenticated;

-- ── 3. Update register_institutional_student ────────────────────────────────
-- Now: looks up teacher's organization_id and sets it on the student profile.
-- If the class has no school_domain_id, skip email validation entirely.

CREATE OR REPLACE FUNCTION public.register_institutional_student(p_class_code TEXT, p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class RECORD;
  v_school RECORD;
  v_email_domain TEXT;
  v_user_id TEXT;
  v_teacher_org_id UUID;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT c.id, c.name, c.school_domain_id, c.teacher_id
    INTO v_class
    FROM public.classes c
   WHERE c.code = upper(trim(p_class_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'class_not_found');
  END IF;

  -- Validate email domain only if the class requires it
  IF v_class.school_domain_id IS NOT NULL THEN
    SELECT sd.domain, sd.name
      INTO v_school
      FROM public.school_domains sd
     WHERE sd.id = v_class.school_domain_id;

    IF FOUND THEN
      v_email_domain := lower(split_part(lower(trim(p_email)), '@', 2));
      IF v_email_domain != lower(v_school.domain) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'domain_mismatch',
          'expected_domain', v_school.domain, 'school_name', v_school.name);
      END IF;
    END IF;
  END IF;

  -- Get teacher's organization_id
  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles
     WHERE id = v_class.teacher_id::text;
  END IF;

  -- Update student profile: set account_type and inherit org from teacher
  UPDATE public.profiles
     SET account_type    = 'school',
         organization_id = coalesce(v_teacher_org_id, organization_id)
   WHERE id = v_user_id;

  INSERT INTO public.class_members (class_id, user_id)
  VALUES (v_class.id, v_user_id)
  ON CONFLICT (class_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'class_name', v_class.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_institutional_student(TEXT, TEXT) TO authenticated;

-- ── 4. Update join_class to also inherit org ────────────────────────────────
-- For students who already have account_type='school' and join additional classes

CREATE OR REPLACE FUNCTION public.join_class(p_code text)
RETURNS table(id uuid, name text, code text, teacher_name text, verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class record;
  v_already_member boolean;
  v_rows int;
  v_still_there boolean;
  v_acct text;
  v_teacher_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT account_type INTO v_acct FROM public.profiles WHERE profiles.id = auth.uid()::text;
  IF v_acct IS DISTINCT FROM 'school' THEN
    RAISE EXCEPTION 'institutional_account_required';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.teacher_id INTO v_class
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = v_class.id AND user_id = auth.uid()
  ) INTO v_already_member;

  IF v_already_member THEN
    v_still_there := true;
  ELSE
    INSERT INTO public.class_members (class_id, user_id) VALUES (v_class.id, auth.uid());
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    SELECT EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_id = v_class.id AND user_id = auth.uid()
    ) INTO v_still_there;
  END IF;

  -- Inherit teacher's org if student doesn't have one yet
  IF v_class.teacher_id IS NOT NULL THEN
    SELECT organization_id INTO v_teacher_org_id
      FROM public.profiles WHERE id = v_class.teacher_id::text;
    IF v_teacher_org_id IS NOT NULL THEN
      UPDATE public.profiles
         SET organization_id = v_teacher_org_id
       WHERE id = auth.uid()::text AND organization_id IS NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
