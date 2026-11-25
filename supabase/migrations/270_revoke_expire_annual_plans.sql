-- expire_annual_plans() e SECURITY DEFINER mas nunca teve REVOKE/GRANT
-- explicito (apanhado numa auditoria de rotina aos advisors), ficando
-- chamavel por anon/authenticated via /rest/v1/rpc. Nao e explorado para
-- prejudicar outra conta (so faz o downgrade que o cron ja fazia), mas e
-- o mesmo descuido ja corrigido noutras funcoes admin (ver licoes
-- aprendidas 2026-11-11/12): so o cron (service_role) deve poder chamar.
revoke all on function public.expire_annual_plans() from public, anon, authenticated;
