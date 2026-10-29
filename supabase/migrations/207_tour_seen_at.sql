-- O tour guiado agora dispara sempre na criação de um projeto, mas quem já
-- tinha projetos antes disso e nunca criou mais nenhum nunca o viu. Esta
-- coluna marca a primeira vez que a pessoa viu (ou saltou) o tour, para o
-- mostrar também ao abrir um projeto antigo, uma única vez.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_seen_at timestamptz;

-- O 100_lock_sensitive_profile_columns revogou o SELECT/UPDATE geral de
-- profiles, só as colunas explicitamente concedidas aqui podem ser lidas
-- ou escritas pelo próprio utilizador. Sem SELECT, o AuthContext falha a
-- carregar o perfil (ou cai no fallback legacy, que também precisa da
-- coluna). Sem UPDATE, o update do ProjectPage.jsx falha silenciosamente
-- (0 linhas afetadas, sem erro) e o tour volta a disparar em todos os
-- projetos antigos sempre. Confirmado o bug nos dois casos a testar em
-- conta real antes desta migração ter estes GRANTs.
GRANT SELECT (tour_seen_at) ON public.profiles TO authenticated;
GRANT UPDATE (tour_seen_at) ON public.profiles TO authenticated;
