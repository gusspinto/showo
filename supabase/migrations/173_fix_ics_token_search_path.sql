-- ============================================================================
-- 173_fix_ics_token_search_path.sql
-- ============================================================================
-- ensure_ics_token() (trigger BEFORE INSERT em profiles) chama
-- gen_random_bytes(), do pgcrypto, mas o search_path da função só tinha
-- 'public' e 'pg_temp'. O pgcrypto está instalado no schema 'extensions',
-- por isso TODO o INSERT em profiles falhava com "function gen_random_bytes
-- does not exist" — incluindo o handle_new_user() do signup, que por sua
-- vez fazia até o insert mínimo de fallback falhar, deixando a conta sem
-- perfil (visível no admin como "sem perfil"). Achado via logs do Postgres
-- ao investigar contas órfãs (2026-09-18).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_ics_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
begin
  if new.ics_token is null then
    new.ics_token := encode(gen_random_bytes(24), 'hex');
  end if;
  return new;
end
$function$;
