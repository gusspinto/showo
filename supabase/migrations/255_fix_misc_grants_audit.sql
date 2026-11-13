-- Auditoria pedida pelo Gustavo depois de apanhar a function_locks sem RLS
-- (migração 254). Duas coisas encontradas, nenhuma delas explorável hoje,
-- mas ambas inconsistentes com o padrão já usado no resto do projeto.

-- 1) admin_get_journal_coverage e admin_get_real_subscriber_ids nunca
-- tiveram o REVOKE ALL FROM PUBLIC que todas as outras ~20 funções
-- admin_* têm. Já se protegem com IF NOT is_admin() THEN RAISE EXCEPTION
-- lá dentro, por isso anon/authenticated não exploram nada hoje, só
-- recebem "Not authorized". Mesmo assim, alinhar com o padrão (defesa em
-- profundidade, ver lição de 2026-11-11 sobre admin_compute_retention_snapshot).
REVOKE ALL ON FUNCTION public.admin_get_journal_coverage() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_real_subscriber_ids() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_journal_coverage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_real_subscriber_ids() TO authenticated;

-- 2) 9 tabelas com RLS ativo mas ZERO políticas, e mesmo assim com GRANTs
-- de escrita (INSERT/UPDATE/DELETE/TRUNCATE) a anon/authenticated. Hoje
-- isto está fechado por omissão (RLS sem política nenhuma bloqueia tudo
-- menos service_role), mas é um GRANT desnecessário à espera de um
-- problema: se alguém adicionar uma política no futuro sem notar os
-- GRANTs já lá postos, abre mais acesso do que pretendia. Revogar agora,
-- enquanto ainda não há política nenhuma a confundir a leitura.
REVOKE ALL ON public.admin_retention_snapshots FROM anon, authenticated;
REVOKE ALL ON public.ai_costs FROM anon, authenticated;
REVOKE ALL ON public.billing_events FROM anon, authenticated;
REVOKE ALL ON public.email_sends FROM anon, authenticated;
REVOKE ALL ON public.fn_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.google_oauth_states FROM anon, authenticated;
REVOKE ALL ON public.project_api_keys FROM anon, authenticated;
REVOKE ALL ON public.project_data_rows FROM anon, authenticated;
REVOKE ALL ON public.project_views FROM anon, authenticated;
