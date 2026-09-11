-- Heatmap agregado no perfil público — soma a atividade do diário de
-- TODOS os projetos do utilizador (não só o em destaque), como o gráfico
-- de contribuições do GitHub. Só conta projetos não-privados: o mesmo
-- filtro que a própria página de perfil já aplica à lista de projetos
-- (um projeto privado nunca aparece lá, e não devia contar aqui também).
CREATE OR REPLACE FUNCTION public.get_profile_activity(p_user_id uuid, p_weeks int DEFAULT 52)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('week', wk, 'count', c) ORDER BY wk), '[]'::jsonb)
  FROM (
    SELECT date_trunc('week', e.created_at)::date AS wk, count(*) AS c
    FROM public.project_journal_entries e
    JOIN public.projects p ON p.id = e.project_id
    WHERE p.user_id::uuid = p_user_id
      AND p.visibility <> 'private'
      AND e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    GROUP BY 1
  ) s
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_activity(uuid, int) TO anon, authenticated;
