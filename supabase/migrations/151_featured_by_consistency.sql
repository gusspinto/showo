-- ============================================================================
-- 151_featured_by_consistency.sql
-- ============================================================================
-- "Projetos em destaque" (Home.jsx) ordenava só por score, um número que
-- não distingue quem trabalhou o projeto ao longo do tempo de quem o fez
-- tudo numa noite. Isto adiciona consistência (semanas com pelo menos um
-- registo no diário, nas últimas p_weeks semanas) como critério principal
-- de ordenação, com o score como critério de desempate e fallback natural
-- — projetos sem nenhum registo (active_weeks = 0) continuam a aparecer,
-- ordenados por score como já acontecia, por isso a secção nunca fica
-- vazia mesmo com pouca atividade na plataforma.
--
-- Reaproveita o mesmo padrão de contagem por semana do
-- get_profile_activity (142_profile_activity_rpc.sql), só que por projeto
-- em vez de somado por utilizador, e com o mesmo filtro de privacidade
-- (visibility <> 'private').
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_featured_projects(p_limit int DEFAULT 6, p_weeks int DEFAULT 12)
RETURNS TABLE(
  id uuid, name text, slug text, area text, creator_name text, ai_tagline text,
  score numeric, cover_url text, views int, project_type text, preview_style jsonb,
  active_weeks int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline,
    p.score, p.cover_url, p.views, p.project_type, p.preview_style,
    coalesce(a.active_weeks, 0)::int AS active_weeks
  FROM public.projects p
  LEFT JOIN (
    SELECT e.project_id, count(DISTINCT date_trunc('week', e.created_at)) AS active_weeks
    FROM public.project_journal_entries e
    WHERE e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    GROUP BY e.project_id
  ) a ON a.project_id = p.id
  WHERE (p.visibility = 'public' OR p.visibility IS NULL)
  ORDER BY coalesce(a.active_weeks, 0) DESC, p.score DESC NULLS LAST
  LIMIT greatest(p_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_projects(int, int) TO anon, authenticated;
