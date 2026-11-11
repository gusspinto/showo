-- A 217 adicionou profiles.potential_popup_seen_at mas, tal como a
-- featured_popup_seen_at (213/214), precisa dos GRANTs exigidos pela
-- 100_lock_sensitive_profile_columns: SELECT/UPDATE geral de profiles está
-- revogado, só colunas explicitamente concedidas aqui podem ser lidas ou
-- escritas. Sem isto, qualquer select que inclua esta coluna (entrou no
-- PROFILE_SELECT do AuthContext) falha com 403/42501 para a tabela toda,
-- partindo o carregamento do perfil para todas as contas autenticadas.

GRANT SELECT (potential_popup_seen_at) ON public.profiles TO authenticated;
GRANT UPDATE (potential_popup_seen_at) ON public.profiles TO authenticated;
