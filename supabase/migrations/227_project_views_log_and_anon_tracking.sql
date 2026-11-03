-- Duas lacunas encontradas ao tentar ligar uma partilha a uma abertura real:
-- 1) increment_project_views só somava um contador (projects.views), sem
--    data/hora, por isso nunca dava para saber QUANDO uma visita aconteceu,
--    só o total acumulado. Impossível cruzar com uma partilha específica.
-- 2) A chamada no frontend só disparava para visitantes com sessão iniciada
--    (ProjectPage.jsx tinha `if (!user?.id) return`), por isso a maioria de
--    quem recebe um link partilhado (pais, amigos, recrutadores sem conta)
--    nunca era contada, de todo.
--
-- Correção: tabela de registo com timestamp (viewer_id pode ser null, visita
-- anónima), e a função nova aceita viewer_id opcional. O contador antigo
-- (projects.views) mantém-se, só para não partir nada que já o lê.

CREATE TABLE IF NOT EXISTS public.project_views (
  id bigint generated always as identity primary key,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_views_project_created_idx ON public.project_views (project_id, created_at);

ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;
-- Sem policy de SELECT direta: só a função SECURITY DEFINER (log) escreve,
-- e só admin_get_project_shares (admin_get_*, já existente) lê de volta.

CREATE OR REPLACE FUNCTION public.log_project_view(p_project_id uuid, p_viewer_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  INSERT INTO public.project_views (project_id, viewer_id) VALUES (p_project_id, p_viewer_id);
  UPDATE public.projects SET views = COALESCE(views, 0) + 1 WHERE id = p_project_id;
$$;

REVOKE ALL ON FUNCTION public.log_project_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_project_view(uuid, uuid) TO authenticated, anon;

-- admin_get_project_shares passa a dizer, para cada partilha, se o projeto
-- foi visto por alguém DEPOIS dessa partilha (até 30 dias depois). Sinal
-- aproximado por desenho: visitas são anónimas por natureza (a pessoa que
-- recebeu o link pode não ter conta), por isso isto nunca prova que foi
-- ESSA pessoa a abrir, só que o projeto teve uma visita real a seguir.
DROP FUNCTION IF EXISTS public.admin_get_project_shares(timestamptz);

CREATE FUNCTION public.admin_get_project_shares(p_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(
  created_at timestamptz,
  context text,
  user_id uuid,
  full_name text,
  username text,
  project_id uuid,
  project_name text,
  project_slug text,
  opened_after boolean
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
           f.project_id, pr.name, pr.slug,
           EXISTS (
             SELECT 1 FROM public.project_views v
             WHERE v.project_id = f.project_id
               AND v.created_at > f.created_at
               AND v.created_at <= f.created_at + interval '30 days'
           )
    FROM public.funnel_events f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    LEFT JOIN public.projects pr ON pr.id = f.project_id
    WHERE f.event = 'project_shared' AND f.created_at >= p_since
    ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_project_shares(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_project_shares(timestamptz) TO authenticated;
