-- GRANTs exigidos pela 100_lock_sensitive_profile_columns (authenticated) e
-- pela 028_column_grants_anon (anon): a EmpresaPage é pública, visitantes
-- sem sessão têm de conseguir ler o selo. Sem UPDATE para ninguém aqui, nem
-- authenticated: só admin_set_company_verified (SECURITY DEFINER, 258) pode
-- mudar este valor, nunca a própria conta.

GRANT SELECT (company_verified) ON public.profiles TO authenticated, anon;
