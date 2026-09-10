-- ============================================================================
-- 140_timeline_all_auto.sql
-- ----------------------------------------------------------------------------
-- Desde que o GitHub sync passou a escrever no diário (kind='auto'), o
-- "Percurso" pode acabar a repetir sozinho o painel "Código no GitHub" —
-- confirmado num projeto real: as 11 entradas do diário eram todas
-- kind='auto', e o Percurso não dizia nada que o GitHub já não tivesse
-- dito. Isto expõe se TODAS as entradas são automáticas, para o
-- ProjectTimeline poder esconder-se na vista pública nesse caso. Assim que
-- houver uma única entrada escrita à mão, `all_auto` passa a false e o
-- Percurso volta a aparecer normalmente — conta uma história diferente.
-- ============================================================================

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
    'all_auto',     bool_and(kind = 'auto'),
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
