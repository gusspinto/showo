-- A 213 adicionou profiles.featured_popup_seen_at mas esqueceu os GRANTs
-- exigidos pela 100_lock_sensitive_profile_columns (SELECT/UPDATE geral de
-- profiles está revogado, só colunas explicitamente concedidas aqui podem
-- ser lidas ou escritas). Sem isto, o AuthContext falha a carregar QUALQUER
-- perfil (a coluna entrou no PROFILE_SELECT), partindo o dashboard para
-- todas as contas autenticadas. Confirmado o erro 403/42501 em teste real
-- antes desta correção, mesmo padrão da 207_tour_seen_at.

GRANT SELECT (featured_popup_seen_at) ON public.profiles TO authenticated;
GRANT UPDATE (featured_popup_seen_at) ON public.profiles TO authenticated;
