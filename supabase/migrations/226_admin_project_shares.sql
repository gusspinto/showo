-- O Admin só mostrava a contagem total de "Partilharam o link" (migração
-- 130/225), sem dizer quem partilhou nem qual projeto. Pedido explícito do
-- Gustavo depois de perguntar se isso ia aparecer no painel. Mesmo padrão
-- SECURITY DEFINER + is_admin() das outras admin_get_*, porque funnel_events
-- só tem policy de INSERT (migração 130), um select direto do admin dava
-- sempre 0 linhas.
CREATE OR REPLACE FUNCTION public.admin_get_project_shares(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  created_at timestamptz,
  context text,
  user_id uuid,
  full_name text,
  username text,
  project_id uuid,
  project_name text,
  project_slug text
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
    SELECT f.created_at, coalesce(f.feature, 'copy_link'), f.user_id,
           p.full_name, p.username,
           f.project_id, pr.name, pr.slug
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    LEFT JOIN public.projects pr ON pr.id = f.project_id
    WHERE f.event = 'project_shared' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_project_shares(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_project_shares(timestamptz) TO authenticated;
