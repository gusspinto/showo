-- ============================================================================
-- 170_exclude_thin_pap_from_featured.sql
--
-- O projeto "PAP" (David Mendes) tinha texto fraco a mais para justificar
-- estar em destaque na Home/Explorar. Exclui-se explicitamente, tal como se
-- fez com os fundadores na migration 169 — sem uma métrica real de
-- "qualidade de conteúdo" no schema, a exclusão direta por id é o que há
-- para já. Com isto, o próximo por score entra naturalmente no lugar.
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
    AND p.id NOT IN (
      '66528838-3f6d-4153-b582-f2ef5e1b454d' -- "PAP" (David Mendes), texto fraco demais para estar em destaque
    )
  ORDER BY coalesce(a.active_weeks, 0) DESC, p.score DESC NULLS LAST
  LIMIT greatest(p_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_projects(int, int) TO anon, authenticated;
