-- Para o Admin poder ordenar Projetos e Utilizadores por "semanas de
-- acompanhamento" (entradas de diário em semanas distintas, mesmo cálculo
-- já usado em get_project_timeline/ProjectTimelineBadge) e por entradas
-- escritas pelo utilizador vs geradas pela IA (kind='auto' = IA, qualquer
-- outro kind = utilizador). project_journal_entries tem RLS "read own or
-- team", por isso o admin nunca vê o total real com um select direto
-- (mesmo problema já resolvido para admin_get_journal_coverage, 223).
CREATE OR REPLACE FUNCTION public.admin_get_journal_stats()
RETURNS TABLE(
  project_id uuid,
  entry_count bigint,
  ai_count bigint,
  user_count bigint,
  active_weeks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT
      j.project_id,
      count(*) AS entry_count,
      count(*) FILTER (WHERE j.kind = 'auto') AS ai_count,
      count(*) FILTER (WHERE j.kind <> 'auto') AS user_count,
      count(DISTINCT date_trunc('week', j.created_at)) AS active_weeks
    FROM public.project_journal_entries j
    GROUP BY j.project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_journal_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_journal_stats() TO authenticated;
