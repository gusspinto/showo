-- ============================================================================
-- 169_exclude_team_from_featured.sql
--
-- get_featured_projects() estava a puxar os próprios projetos de teste dos
-- fundadores (Gustavo, Bruno) para os destaques do Home/Explorar, ao lado
-- de projetos reais de alunos. Isso estraga a prova social, o ponto de
-- "quem já usa" é mostrar trabalho de gente de fora, não da equipa.
--
-- Não há uma flag "é da equipa" no schema, só is_admin (e só a conta
-- "Showo" de testes tem isso, não as contas pessoais do Gustavo/Bruno que
-- usam a app a sério). Exclui por user_id explícito, é feio mas é honesto
-- sobre o que está a acontecer, mais vale isto do que inventar uma coluna
-- nova só para dois IDs. Se a equipa crescer, acrescentar aqui.
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
    AND p.user_id NOT IN (
      '3425e3d2-cc8d-49df-a262-530d868d98ad', -- Gustavo (fundador)
      'a9274b5c-db4c-4e82-96ec-cfe377aad246', -- Bruno Silva (fundador)
      'bc6e9453-35a9-4e37-afc8-c7bedf057480'  -- conta "Showo" de testes/admin
    )
  ORDER BY coalesce(a.active_weeks, 0) DESC, p.score DESC NULLS LAST
  LIMIT greatest(p_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_projects(int, int) TO anon, authenticated;
