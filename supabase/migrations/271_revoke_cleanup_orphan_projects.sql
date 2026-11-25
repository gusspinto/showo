-- cleanup_orphan_projects() tinha EXECUTE aberto a PUBLIC (literalmente
-- qualquer role, incluindo anon), encontrado numa auditoria de rotina ao
-- continuar a verificar funcoes SECURITY DEFINER sem REVOKE explicito,
-- mesmo padrao da expire_annual_plans (migracao 270). Nao e explorado
-- para prejudicar outra conta (so apaga projetos orfaos com mais de 24h
-- ja sem dono, o mesmo que o cron faz), mas so o cron deve poder chamar.
revoke all on function public.cleanup_orphan_projects() from public, anon, authenticated;
