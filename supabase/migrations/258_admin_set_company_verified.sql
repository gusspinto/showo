-- Mesmo padrão do admin_set_user_role (025): só um admin pode marcar/tirar o
-- selo de verificado de uma conta empresa/recrutador. REVOKE explícito de
-- PUBLIC/anon/authenticated obrigatório (lição 2026-11-11): o Postgres dá
-- EXECUTE a PUBLIC por omissão numa função nova, e só o GRANT a seguir
-- reabre para quem deve mesmo chamar isto.

CREATE OR REPLACE FUNCTION public.admin_set_company_verified(target_user_id uuid, verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET company_verified = verified
  WHERE id = target_user_id AND role IN ('empresa', 'recrutador');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_company_verified(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_verified(uuid, boolean) TO authenticated;
