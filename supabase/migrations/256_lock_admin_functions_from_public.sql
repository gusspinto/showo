-- Auditoria de segurança (18/11): 4 funções admin novas (criadas depois da
-- auditoria de 11-12/11) tinham EXECUTE aberto a PUBLIC/anon, chamáveis via
-- /rest/v1/rpc/... sem sessão nenhuma. Tinham is_admin() a bloquear por
-- dentro, mas isso é a segunda camada, não devia ser a única (mesmo padrão
-- já corrigido nas migrações 157/251/255).

REVOKE ALL ON FUNCTION public.admin_create_ambassador(uuid, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_organization(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_organization(uuid, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_ambassador(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_organization(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_organization(uuid, text, text, text) TO authenticated;
