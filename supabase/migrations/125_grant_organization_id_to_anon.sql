-- ============================================================================
-- 125_grant_organization_id_to_anon.sql
--
-- Explore.jsx passa a pedir organization_id na lista pública de pessoas
-- (para distinguir "Individual" de "Aluno" institucional) — a página
-- /explorar é acessível sem conta, e 084 só tinha dado este grant a
-- authenticated. Sem isto, o SELECT falha 42501 para visitantes anónimos
-- (falha a query toda, não só a coluna).
-- ============================================================================

grant select (organization_id) on public.profiles to anon;
