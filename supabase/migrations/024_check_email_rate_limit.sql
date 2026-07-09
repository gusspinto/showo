-- ============================================================
-- 024 — Rate limit check_email_exists (email enumeration oracle)
-- Limit: 5 checks per IP per hour.
-- IP extracted from the x-forwarded-for header that PostgREST
-- injects into request.headers for every REST call.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  ip       text;
  allowed  boolean;
BEGIN
  -- Extract client IP from PostgREST request headers
  BEGIN
    ip := split_part(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ',', 1
    );
  EXCEPTION WHEN OTHERS THEN
    ip := NULL;
  END;

  ip := trim(coalesce(ip, 'unknown'));
  IF ip = '' THEN ip := 'unknown'; END IF;

  -- 5 checks per IP per hour via the shared rate-limit table
  SELECT check_fn_rate_limit(ip || ':check_email', 5) INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
END;
$$;
