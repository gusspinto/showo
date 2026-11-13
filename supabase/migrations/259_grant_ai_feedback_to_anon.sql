-- Explorar ficava vazio (só "Em destaque") para visitantes sem conta: a
-- query geral de Explore.jsx pede a coluna ai_feedback, criada na 013, mas
-- nunca teve GRANT SELECT para anon desde que a 065 fechou projects a uma
-- lista explícita de colunas. Falta uma coluna só chumba o select inteiro
-- (mesmo padrão das lições 2026-10-28 e 2026-10-30), por isso o pedido dava
-- 401 em vez de devolver os projetos sem essa coluna.
GRANT SELECT (ai_feedback) ON public.projects TO anon;
