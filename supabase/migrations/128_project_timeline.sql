-- ============================================================================
-- 128_project_timeline.sql
-- ----------------------------------------------------------------------------
-- Timeline pública do projeto: a evolução ao longo do tempo, para o
-- recrutador ver consistência ("trabalhou de janeiro a junho" vs "fez tudo
-- na última semana").
--
--   projects.timeline_public — opt-in por projeto
--   project_milestones       — marcos curados pelo aluno (não o diário em bruto)
--   get_project_timeline()   — agregados do diário (datas/contagens, nunca o
--                              conteúdo) para desenhar a timeline, mesmo a anon
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS timeline_public boolean NOT NULL DEFAULT false;

GRANT SELECT (timeline_public) ON public.projects TO anon, authenticated;
GRANT UPDATE (timeline_public) ON public.projects TO authenticated;

-- ── Marcos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  note        text CHECK (note IS NULL OR char_length(note) <= 500),
  happened_on date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own milestones"         ON public.project_milestones;
DROP POLICY IF EXISTS "public milestones read" ON public.project_milestones;

CREATE POLICY "own milestones" ON public.project_milestones
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "public milestones read" ON public.project_milestones
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id AND p.timeline_public = true
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT SELECT ON public.project_milestones TO anon;

CREATE INDEX IF NOT EXISTS project_milestones_project_idx
  ON public.project_milestones (project_id, happened_on);

-- ── Agregados do diário para a timeline ────────────────────────────────────
-- Devolve só datas e contagens, nunca conteúdo. Para o dono funciona sempre;
-- para toda a gente só quando timeline_public = true.
CREATE OR REPLACE FUNCTION public.get_project_timeline(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_public boolean;
  v_created timestamptz;
  v_result jsonb;
BEGIN
  SELECT p.user_id::uuid, p.timeline_public, p.created_at
    INTO v_owner, v_public, v_created
  FROM public.projects p WHERE p.id = p_project_id;

  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT v_public AND v_owner IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'created_on',   v_created::date,
    'first_entry',  min(created_at)::date,
    'last_entry',   max(created_at)::date,
    'entry_count',  count(*),
    'active_weeks', count(DISTINCT date_trunc('week', created_at)),
    'weekly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('week', wk, 'count', c) ORDER BY wk), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', created_at)::date AS wk, count(*) AS c
        FROM public.project_journal_entries
        WHERE project_id = p_project_id
        GROUP BY 1
      ) s
    )
  )
  INTO v_result
  FROM public.project_journal_entries
  WHERE project_id = p_project_id;

  RETURN coalesce(v_result, jsonb_build_object('created_on', v_created::date, 'entry_count', 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_timeline(uuid) TO anon, authenticated;
