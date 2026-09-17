-- ============================================================================
-- 164_public_total_project_count.sql
--
-- O contador do hero ("X projetos criados") só contava visibility='public'
-- ou NULL, porque corre como anon e a policy de SELECT (163) já não deixa
-- anon ler privados. Pedido: mostrar o total real de projetos, incluindo
-- privados, sem abrir os dados de cada um.
--
-- Função SECURITY DEFINER que devolve só um número (count), nunca linhas.
-- Um agregado não identifica nem expõe nenhum projeto privado em concreto,
-- por isso é seguro expor a qualquer visitante, ao contrário de baixar a
-- proteção da 163. Conta só entry_kind = 'full' (projetos a sério, não
-- entradas da Biblioteca, que são maioritariamente uploads de ficheiro).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_total_project_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.projects WHERE entry_kind = 'full';
$$;

GRANT EXECUTE ON FUNCTION public.get_total_project_count() TO anon, authenticated;
