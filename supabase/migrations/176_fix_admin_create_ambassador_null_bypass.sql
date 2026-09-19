-- ============================================================================
-- 176_fix_admin_create_ambassador_null_bypass.sql
-- ============================================================================
-- BUG DE SEGURANÇA: admin_create_ambassador() verificava o admin com
--   SELECT is_admin INTO caller_admin FROM profiles WHERE id = auth.uid();
--   IF NOT caller_admin THEN RAISE EXCEPTION ...
-- Para um pedido anónimo (sem sessão), auth.uid() é NULL, a SELECT não
-- devolve nenhuma linha, e caller_admin fica NULL — não `false`. Em
-- PL/pgSQL, `IF NOT NULL` avalia como falso, por isso o RAISE nunca
-- corria e a função inseria o ambassador na mesma. Qualquer pedido não
-- autenticado a /rest/v1/rpc/admin_create_ambassador conseguia criar um
-- embaixador para qualquer user_id, com a comissão que quisesse.
--
-- Todas as outras funções admin_* usam is_admin() (que devolve sempre
-- true/false via EXISTS, nunca NULL) — esta é a única que tinha a
-- verificação escrita à mão de forma diferente. Alinhada agora com as
-- irmãs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_ambassador(target_user_id uuid, code text, rate numeric DEFAULT 0.20)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO ambassadors (user_id, referral_code, commission_rate, created_by)
  VALUES (target_user_id, lower(code), rate, auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;
