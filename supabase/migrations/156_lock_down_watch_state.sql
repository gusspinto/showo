-- ============================================================================
-- 156_lock_down_watch_state.sql
--
-- Security Advisor: "RLS Disabled in Public" em public.watch_state.
-- Tabela genérica key/value, vazia, sem nenhuma referência no código
-- (frontend, migrations, edge functions) — parece ter sido criada à mão e
-- nunca ligada a nada. Pior: anon e authenticated tinham SELECT, INSERT,
-- UPDATE, DELETE e até TRUNCATE sem RLS nenhuma — qualquer visitante sem
-- sessão conseguia apagar a tabela toda via REST.
--
-- Não apaga a tabela (pode estar reservada para algo), só fecha o acesso
-- de cliente por completo: liga RLS sem nenhuma policy (nega tudo via
-- PostgREST) e revoga os GRANTs de anon/authenticated. service_role
-- (usado só por edge functions/cron) mantém acesso total, já que ignora
-- RLS de qualquer forma.
-- ============================================================================

ALTER TABLE public.watch_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.watch_state FROM anon, authenticated;
