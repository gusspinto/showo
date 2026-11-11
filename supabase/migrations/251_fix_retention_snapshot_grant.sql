-- admin_compute_retention_snapshot (250_retention_snapshot.sql) ficou sem
-- o REVOKE que todas as outras admin_* têm, por omissão (Postgres dá
-- EXECUTE a PUBLIC por omissão numa função nova). Apanhado pelo advisor de
-- segurança do Supabase: qualquer utilizador autenticado, ou mesmo anon,
-- conseguia chamar /rest/v1/rpc/admin_compute_retention_snapshot e forçar
-- o recálculo fora do cron. Impacto baixo (só escreve numa tabela que só
-- é lida via admin_get_retention_snapshot, essa sim com is_admin()), mas
-- sem razão para ficar aberta.
REVOKE ALL ON FUNCTION public.admin_compute_retention_snapshot() FROM PUBLIC, anon, authenticated;
