-- Restrict join_class so students can only join classes from their own school
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
  v_user_email text;
  v_email_domain text;
  v_school_domain text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT account_type INTO v_acct FROM public.profiles WHERE profiles.id = auth.uid()::text;
  IF v_acct IS DISTINCT FROM 'school' THEN
    RAISE EXCEPTION 'institutional_account_required';
  END IF;

  SELECT c.id, c.name, c.code, c.teacher_name, c.school_domain_id INTO v_class
  FROM public.classes c
  WHERE c.code = upper(trim(p_code));

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  -- If the class is linked to a school domain, verify the student's email matches
  IF v_class.school_domain_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE auth.users.id = auth.uid();
    v_email_domain := lower(split_part(lower(trim(v_user_email)), '@', 2));

    SELECT lower(sd.domain) INTO v_school_domain
    FROM public.school_domains sd
    WHERE sd.id = v_class.school_domain_id;

    IF v_school_domain IS NOT NULL AND v_email_domain != v_school_domain THEN
      RAISE EXCEPTION 'school_mismatch';
    END IF;
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
