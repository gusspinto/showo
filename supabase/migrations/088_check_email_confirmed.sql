-- ============================================================
-- 088 — check_email_confirmed(email): auto-login no registo quando
-- a confirmação chega por outro dispositivo.
-- ------------------------------------------------------------
-- O ecrã "Verifica o teu email" faz polling a esta função enquanto
-- espera. Só devolve um boolean (confirmado ou não) — nenhum outro
-- dado da conta. Mesmo padrão de rate-limit do check_email_exists
-- (024/087): 8 pedidos por IP a cada 10 minutos, para não virar mais
-- um oráculo de enumeração de emails sem custo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_email_confirmed(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  ip       text;
  allowed  boolean;
BEGIN
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

  SELECT check_fn_rate_limit(ip || ':check_confirmed', 8) INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = lower(p_email) AND email_confirmed_at IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_confirmed(text) TO anon, authenticated;
