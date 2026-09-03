-- ============================================================
-- 121 — check_email_confirmed: rate-limit compatível com o polling.
-- ------------------------------------------------------------
-- O ecrã "Verifica o teu email" (Register.jsx) faz polling a esta
-- função a cada 4s durante ~5 min — mas a 088 limitava a 8 pedidos
-- por IP a cada 10 min, com chave PARTILHADA (`<ip>:check_confirmed`).
--
-- Resultado: ao fim de ~32s a função começa a lançar
-- rate_limit_exceeded, o poller pára de detetar a confirmação, e o PC
-- fica preso no "Verifica o teu email" mesmo depois de a pessoa
-- confirmar no telemóvel.
--
-- Fix: chave por IP + hash do email (cada registo tem o seu orçamento,
-- e o de uma pessoa não esgota o de outra atrás do mesmo NAT), e limite
-- de 120 / 10 min (dá para um poll de 5s durante 10 min). Continua a
-- não ser um oráculo útil: só diz "este email específico já confirmou?".
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

  SELECT check_fn_rate_limit(
    ip || ':check_confirmed:' || md5(lower(trim(coalesce(p_email, '')))),
    120
  ) INTO allowed;

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

-- Alívio imediato para quem esteja bloqueado agora
DELETE FROM public.fn_rate_limits WHERE key LIKE '%:check_confirmed%';
