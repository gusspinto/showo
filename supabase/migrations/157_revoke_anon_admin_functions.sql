-- ============================================================================
-- 157_revoke_anon_admin_functions.sql
--
-- Security Advisor: "Public Can Execute SECURITY DEFINER Function" apanhou
-- 57 funções executáveis por anon, incluindo admin_create_ambassador,
-- admin_create_organization, admin_get_users, admin_update_organization.
-- Revi cada uma: todas verificam is_admin() internamente, por isso não há
-- vulnerabilidade real (um visitante sem sessão só recebe 'Not authorized').
-- Mas não há razão nenhuma para anon sequer ter EXECUTE nestas — reduz a
-- superfície de ataque sem mudar nenhum comportamento (quem é admin usa
-- sempre uma sessão authenticated).
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.admin_create_ambassador(uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_organization(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_organization(uuid, text, text, text) FROM anon;
