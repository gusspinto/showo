CREATE TABLE IF NOT EXISTS public.school_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read school_domains" ON public.school_domains
  FOR SELECT USING (true);

CREATE POLICY "admins can manage school_domains" ON public.school_domains
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text::uuid AND is_admin = true)
  );

GRANT SELECT ON public.school_domains TO anon;
GRANT ALL ON public.school_domains TO authenticated;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS school_domain_id UUID REFERENCES public.school_domains(id);

-- Allow both anon and authenticated to read account_type
GRANT SELECT (account_type) ON public.profiles TO anon;
GRANT SELECT (account_type) ON public.profiles TO authenticated;
GRANT UPDATE (account_type) ON public.profiles TO authenticated;

-- Validate email domain against class's school
CREATE OR REPLACE FUNCTION public.validate_class_email(p_code TEXT, p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class RECORD;
  v_school RECORD;
  v_email_domain TEXT;
BEGIN
  SELECT c.id, c.name, c.school_domain_id
    INTO v_class
    FROM public.classes c
   WHERE c.code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'class_not_found');
  END IF;

  IF v_class.school_domain_id IS NULL THEN
    RETURN jsonb_build_object('valid', true, 'class_name', v_class.name);
  END IF;

  SELECT sd.domain, sd.name
    INTO v_school
    FROM public.school_domains sd
   WHERE sd.id = v_class.school_domain_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', true, 'class_name', v_class.name);
  END IF;

  v_email_domain := lower(split_part(lower(trim(p_email)), '@', 2));

  IF v_email_domain = lower(v_school.domain) THEN
    RETURN jsonb_build_object('valid', true, 'class_name', v_class.name, 'school_name', v_school.name);
  ELSE
    RETURN jsonb_build_object('valid', false, 'reason', 'domain_mismatch', 'expected_domain', v_school.domain, 'school_name', v_school.name);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_class_email(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_class_email(TEXT, TEXT) TO authenticated;
