-- ============================================================
-- 119 — Sobe o limite dos "oráculos de email" de 8 para 40 / 10 min.
-- ------------------------------------------------------------
-- check_email_exists (087) e check_email_auth_methods (114) partilham
-- a chave de rate-limit `<ip>:check_email` com limite 8 / 10 min.
--
-- Isso conta TODAS as verificações de todos os utilizadores atrás do
-- mesmo IP. Numa escola, num escritório ou num evento (toda a gente
-- atrás de um NAT), 8 verificações esgotam-se em minutos e a 9ª pessoa
-- é bloqueada logo na PRIMEIRA tentativa de entrar/registar, com a
-- mensagem enganadora "Demasiadas tentativas".
--
-- 40 / 10 min continua a travar scraping em massa mas já não parte uma
-- turma inteira. O cliente também deixou de bloquear o registo quando
-- esta verificação falha (só serve para escolher o ecrã seguinte).
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

  SELECT check_fn_rate_limit(ip || ':check_email', 40) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_email_auth_methods(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  ip           text;
  allowed      boolean;
  v_user_id    uuid;
  v_has_pw     boolean := false;
  v_has_google boolean := false;
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

  SELECT check_fn_rate_limit(ip || ':check_email', 40) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  SELECT id,
         (encrypted_password IS NOT NULL AND encrypted_password <> '')
    INTO v_user_id, v_has_pw
  FROM auth.users
  WHERE lower(email) = lower(p_email);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exists', false, 'has_password', false, 'has_google', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'google'
  ) INTO v_has_google;

  RETURN jsonb_build_object(
    'exists', true,
    'has_password', coalesce(v_has_pw, false),
    'has_google', v_has_google
  );
END;
$$;

-- Alívio imediato: limpa as contagens atuais.
DELETE FROM public.fn_rate_limits WHERE key LIKE '%:check_email';
