-- ============================================================
-- 114 — check_email_auth_methods(email): que métodos de login
--       existem para uma conta.
-- ------------------------------------------------------------
-- Contas criadas via Google não têm palavra-passe. O
-- signInWithPassword falha sempre para elas, e a app mostrava
-- "Palavra-passe incorreta." — enganador: nunca houve password.
--
-- Esta função diz à home / ao login o que a conta suporta, para
-- podermos mandar o utilizador para o botão do Google (ou para o
-- fluxo de definir palavra-passe) em vez de o deixar a adivinhar.
--
-- Devolve jsonb: { exists, has_password, has_google }
-- Nenhum dado sensível — só a forma de entrar. Mesmo rate-limit
-- dos outros oráculos de email (024/087/088): 8 pedidos por IP a
-- cada 10 minutos.
-- ============================================================

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

  SELECT check_fn_rate_limit(ip || ':check_email', 8) INTO allowed;
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

GRANT EXECUTE ON FUNCTION public.check_email_auth_methods(text) TO anon, authenticated;
