-- ============================================================================
-- 109_grant_profile_area_to_anon.sql
--
-- O perfil público (UserProfile) mostra a área do utilizador na linha de
-- meta (@user · área · escola) e é suposto qualquer pessoa com o link o
-- ver — mas `area` nunca foi concedida a `anon`, por isso o SELECT do
-- perfil falhava por inteiro para visitantes sem conta e a página dava
-- "Perfil não encontrado". É informação pública (recrutadores até filtram
-- por área).
-- ============================================================================

GRANT SELECT (area) ON public.profiles TO anon;
