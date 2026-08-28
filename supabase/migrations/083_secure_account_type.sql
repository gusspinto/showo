-- Remove direct UPDATE on account_type — only server-side RPCs can change it
REVOKE UPDATE (account_type) ON public.profiles FROM authenticated;

-- Secure RPC for institutional signup
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
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT c.id, c.name, c.school_domain_id
    INTO v_class
    FROM public.classes c
   WHERE c.code = upper(trim(p_class_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'class_not_found');
  END IF;

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

  UPDATE public.profiles SET account_type = 'school' WHERE id = v_user_id;

  INSERT INTO public.class_members (class_id, user_id)
  VALUES (v_class.id, v_user_id)
  ON CONFLICT (class_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'class_name', v_class.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_institutional_student(TEXT, TEXT) TO authenticated;

-- Update join_class to reject non-school accounts
DROP FUNCTION IF EXISTS public.join_class(text);

CREATE FUNCTION public.join_class(p_code text)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT account_type INTO v_acct FROM public.profiles WHERE profiles.id = auth.uid()::text;
  IF v_acct IS DISTINCT FROM 'school' THEN
    RAISE EXCEPTION 'institutional_account_required';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name INTO v_class
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

  RETURN QUERY SELECT v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
