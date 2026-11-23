-- /api/sitemap (anon, sem sessão) lê profiles.profile_visibility para filtrar
-- quem aparece no sitemap público (api/sitemap.js). A coluna tinha GRANT
-- SELECT para authenticated mas não para anon, partindo o endpoint com
-- 401/42501 desde 19/11 (achado na auditoria semanal de segurança).
grant select (profile_visibility) on public.profiles to anon;
