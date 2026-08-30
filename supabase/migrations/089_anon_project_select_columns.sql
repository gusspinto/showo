-- ============================================================================
-- 089_anon_project_select_columns.sql — Corrige preview de projeto para
-- visitantes sem sessão.
-- ------------------------------------------------------------------------
-- 065_security_hardening.sql trocou o SELECT de anon em public.projects de
-- "todas as colunas" para uma lista explícita (esconder notas do professor).
-- Isso é correto, mas o fetch da página de projeto (ProjectPage.jsx) faz
-- `.select('*')`, e o Postgres exige grant em TODAS as colunas para um
-- wildcard select — bastava faltar uma para o pedido inteiro falhar. Como
-- resultado, visitantes sem conta viam "Este projeto não existe ou foi
-- removido" em qualquer projeto público.
--
-- Faltavam especificamente `visibility` (o próprio código cliente usa este
-- campo para decidir se o projeto é privado) e `edit_token` (usado para
-- provar dono de projeto criado anonimamente, antes de reivindicado). Só
-- adiciona estas duas + notified_milestones (inofensivo, já usado no
-- fetch); teacher_score* e outros campos sensíveis continuam de fora.
-- ============================================================================

grant select (visibility, edit_token, notified_milestones)
  on public.projects to anon;
