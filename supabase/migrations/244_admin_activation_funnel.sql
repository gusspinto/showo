-- Pedido do Gustavo: antes de otimizar conteúdo, paywall ou retenção,
-- medir o funil real de ativação (registo -> projeto com 3+ secções
-- preenchidas -> partilha do link), que é a própria definição de
-- "ativação" já registada no CLAUDE.md. Sem este número, qualquer
-- otimização a jusante é às cegas.
--
-- "3+ secções preenchidas" usa o mesmo critério já usado em
-- pick-project-candidates (sectionsFilled): >=30 carateres em cada um dos
-- 8 campos de conteúdo. Só conta projetos entry_kind='full' (Biblioteca
-- não é um "projeto" para este efeito).
CREATE FUNCTION public.admin_get_activation_funnel(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  user_id uuid,
  signup_at timestamptz,
  first_project_at timestamptz,
  activated_at timestamptz,
  shared_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT
      p.id,
      p.created_at,
      (SELECT min(pr.created_at) FROM public.projects pr
        WHERE pr.user_id = p.id AND pr.entry_kind = 'full'),
      (SELECT min(pr.created_at) FROM public.projects pr
        WHERE pr.user_id = p.id AND pr.entry_kind = 'full'
          AND (
            (length(coalesce(pr.problem, '')) >= 30)::int +
            (length(coalesce(pr.solution, '')) >= 30)::int +
            (length(coalesce(pr.target_audience, '')) >= 30)::int +
            (length(coalesce(pr.features, '')) >= 30)::int +
            (length(coalesce(pr.technologies, '')) >= 30)::int +
            (length(coalesce(pr.challenges, '')) >= 30)::int +
            (length(coalesce(pr.results, '')) >= 30)::int +
            (length(coalesce(pr.learnings, '')) >= 30)::int
          ) >= 3),
      (SELECT min(f.created_at) FROM public.funnel_events f
        WHERE f.user_id = p.id AND f.event = 'project_shared')
    FROM public.profiles p
    WHERE p.created_at >= p_since
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_activation_funnel(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_activation_funnel(timestamptz) TO authenticated;
