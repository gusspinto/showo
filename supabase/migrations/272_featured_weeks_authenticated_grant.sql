-- featured_weeks nunca teve GRANT para authenticated, apesar de ser lida
-- diretamente pelo frontend (StudentDashboard.jsx) para o aviso "o teu
-- projeto está em destaque esta semana". Sem GRANT, cada select dava
-- "permission denied for table featured_weeks" (42501), engolido em
-- silêncio no código (erro nunca mostrado, só a funcionalidade a não
-- aparecer). Dados não sensíveis (project_id, week_start de projetos já
-- públicos em destaque), seguro expor leitura a authenticated.
grant select on public.featured_weeks to authenticated;
