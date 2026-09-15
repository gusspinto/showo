-- ============================================================================
-- 155_fix_public_turma_page_grants.sql
--
-- Encontrado ao testar a auditoria 154 na prática: a página pública de uma
-- turma (/turma/:code, visitável sem login) estava sempre partida para
-- visitantes anónimos, por dois motivos que nada têm a ver com a correção
-- de segurança anterior — mesmo padrão do bug já apanhado com as colunas
-- de datas do projeto (falta de GRANT numa coluna faz o PostgREST rejeitar
-- a query toda, não só essa coluna):
--
-- 1. projects.teacher_score nunca teve SELECT concedido a anon — a lista de
--    projetos da turma (que inclui esta coluna) falhava por inteiro.
-- 2. is_class_member() nunca teve EXECUTE concedido a anon — a policy de
--    class_members usa esta função, e falha (em vez de simplesmente dar
--    false) quando chamada sem permissão.
-- ============================================================================

GRANT SELECT (teacher_score) ON public.projects TO anon;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid) TO anon;
