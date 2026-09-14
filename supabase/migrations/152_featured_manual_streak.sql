-- ============================================================================
-- 152_featured_manual_streak.sql
-- ============================================================================
-- get_featured_projects() (151) contava QUALQUER entrada do diário como
-- "semana ativa" — incluindo as que o github-sync escreve sozinho a cada
-- sync (external_id 'gh:...'). Isso deixava o selo "🔥 N semanas seguidas"
-- enganoso: um projeto com Actions a correr sozinho parecia tão acompanhado
-- quanto um aluno a escrever de facto no diário.
--
-- Separa os dois: active_weeks (tudo, incluindo GitHub) continua a decidir
-- a ORDEM do destaque — um projeto com código ativo merece aparecer, mesmo
-- que o aluno não escreva. manual_weeks (só entradas sem external_id 'gh:%')
-- passa a decidir o SELO — esse só aparece a quem escreveu mesmo, é mais
-- difícil de ganhar e mais honesto sobre o que está a certificar.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_featured_projects(p_limit int DEFAULT 6, p_weeks int DEFAULT 12)
RETURNS TABLE(
  id uuid, name text, slug text, area text, creator_name text, ai_tagline text,
  score numeric, cover_url text, views int, project_type text, preview_style jsonb,
  active_weeks int, manual_weeks int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline,
    p.score, p.cover_url, p.views, p.project_type, p.preview_style,
    coalesce(a.active_weeks, 0)::int AS active_weeks,
    coalesce(a.manual_weeks, 0)::int AS manual_weeks
  FROM public.projects p
  LEFT JOIN (
    SELECT
      e.project_id,
      count(DISTINCT date_trunc('week', e.created_at)) AS active_weeks,
      count(DISTINCT date_trunc('week', e.created_at)) FILTER (WHERE e.external_id IS NULL OR e.external_id NOT LIKE 'gh:%') AS manual_weeks
    FROM public.project_journal_entries e
    WHERE e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    GROUP BY e.project_id
  ) a ON a.project_id = p.id
  WHERE (p.visibility = 'public' OR p.visibility IS NULL)
  ORDER BY coalesce(a.active_weeks, 0) DESC, p.score DESC NULLS LAST
  LIMIT greatest(p_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_projects(int, int) TO anon, authenticated;
