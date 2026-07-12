-- ============================================================================
-- 028_column_grants_anon.sql — Hotfix ao 027: revoke por coluna requer downgrade
-- ============================================================================
-- 027 fez REVOKE SELECT (email/project_draft) TO anon, mas foi ignorado porque
-- existia GRANT SELECT à tabela inteira (table-level cobre column-level). O único
-- fix é revogar SELECT à tabela e voltar a conceder por coluna, enumerando só as
-- colunas que podem ser públicas. email e project_draft ficam de fora.
-- ============================================================================

revoke select on public.profiles from anon;                    -- limpa grant table-wide

grant select (
  id, username, total_xp, created_at, full_name, bio,
  is_admin, banned_at, role, avatar_url, available_for_work,
  company, company_role, company_website, linkedin_url, looking_for,
  company_description, company_location, company_industry, company_size,
  skills, school
) on public.profiles to anon;                                  -- só colunas seguras; email e project_draft ficam privados a anon
