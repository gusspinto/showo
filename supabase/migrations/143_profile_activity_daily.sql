-- O heatmap do perfil pediu para ser mesmo como o do GitHub — grelha de
-- dias x semanas, não uma linha só de células semanais. Isso precisa de
-- contagem por DIA, não por semana; troca a granularidade do RPC
-- (get_profile_activity, da 142) sem mudar a assinatura — só o shape do
-- jsonb devolvido ('day' em vez de 'week').
CREATE OR REPLACE FUNCTION public.get_profile_activity(p_user_id uuid, p_weeks int DEFAULT 52)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d), '[]'::jsonb)
  FROM (
    SELECT (e.created_at AT TIME ZONE 'UTC')::date AS d, count(*) AS c
    FROM public.project_journal_entries e
    JOIN public.projects p ON p.id = e.project_id
    WHERE p.user_id::uuid = p_user_id
      AND p.visibility <> 'private'
      AND e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    GROUP BY 1
  ) s
$$;
