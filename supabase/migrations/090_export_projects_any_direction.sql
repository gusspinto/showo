-- ============================================================================
-- 090_export_projects_any_direction.sql — Exportar projetos deixa de ser só
-- escola → pessoal; qualquer conta pode copiar os seus projetos para
-- qualquer outra conta que consiga autenticar.
-- ------------------------------------------------------------------------
-- export_school_projects (056) exigia que quem chamava fosse conta escolar
-- (organization_id preenchido) — só cobria uma direção. Substituída por
-- export_projects, igual em tudo (mesma lógica de limites do plano de
-- destino, mesma verificação de posse dos projetos) menos essa restrição.
-- O sufixo do slug também deixa de assumir "-pessoal" (fazia sentido só
-- numa direção); passa a "-copia", neutro em qualquer sentido.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_projects(
  p_dest_user_id UUID,
  p_project_ids  UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id     UUID   := auth.uid();
  v_dest_plan     TEXT;
  v_dest_max      INT;
  v_dest_count    INT;
  v_available     INT;
  v_copied        UUID[] := '{}';
  v_skipped       INT    := 0;
  proj            RECORD;
  new_slug        TEXT;
  new_id          UUID;
BEGIN
  -- ── Auth checks ──────────────────────────────────────────────────────────
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Destination user must exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_dest_user_id) THEN
    RAISE EXCEPTION 'destination account not found';
  END IF;

  -- Cannot export to self
  IF p_dest_user_id = v_caller_id THEN
    RAISE EXCEPTION 'destination cannot be the same as source';
  END IF;

  -- ── Determine destination plan limits ────────────────────────────────────
  SELECT coalesce(plan, 'free') INTO v_dest_plan
  FROM public.profiles WHERE id = p_dest_user_id;

  v_dest_max := CASE v_dest_plan
    WHEN 'free'   THEN 3
    WHEN 'build'  THEN 10
    WHEN 'launch' THEN 2147483647  -- unlimited
    ELSE 3
  END;

  -- Destination user's org overrides their personal plan
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = p_dest_user_id
  ) THEN
    -- Org accounts get build-level limits (this path is unusual but handle it)
    v_dest_max := 10;
  END IF;

  SELECT count(*) INTO v_dest_count
  FROM public.projects WHERE user_id = p_dest_user_id::text;

  v_available := v_dest_max - v_dest_count;

  IF v_available <= 0 THEN
    RETURN jsonb_build_object(
      'copied',        '[]'::jsonb,
      'skipped',       cardinality(p_project_ids),
      'limit_reached', true,
      'dest_plan',     v_dest_plan,
      'dest_max',      v_dest_max,
      'dest_count',    v_dest_count
    );
  END IF;

  -- ── Copy projects ─────────────────────────────────────────────────────────
  FOR proj IN
    SELECT *
    FROM public.projects
    WHERE id = ANY(p_project_ids)
      AND user_id = v_caller_id::text  -- can only export own projects
    ORDER BY created_at ASC
  LOOP
    IF cardinality(v_copied) >= v_available THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Generate a unique slug: original + "-copia" suffix + random if needed
    new_slug := proj.slug || '-copia';
    IF EXISTS (SELECT 1 FROM public.projects WHERE slug = new_slug) THEN
      new_slug := proj.slug || '-copia-' || substr(gen_random_uuid()::text, 1, 6);
    END IF;

    INSERT INTO public.projects (
      user_id, slug, created_at,
      name, area, goal, problem, solution,
      target_audience, features, technologies,
      challenges, results, learnings,
      cover_url,
      ai_tagline, ai_description, ai_highlights,
      ai_feedback,
      school_year, course, school,
      creator_name, is_pap, pap_supervisor, pap_date,
      project_type,
      score, linkedin_url, github_url, portfolio_url,
      preview_style, defense_date,
      tags, guide_config, preview_blocks
      -- Intentionally NOT copied: edit_token, likes_count, interest_count, views,
      -- review_status, teacher_score_*, featured, featured_order, dashboard_pinned,
      -- report_draft, notified_milestones (per-device state)
    )
    VALUES (
      p_dest_user_id::text, new_slug, now(),
      proj.name, proj.area, proj.goal, proj.problem, proj.solution,
      proj.target_audience, proj.features, proj.technologies,
      proj.challenges, proj.results, proj.learnings,
      proj.cover_url,
      proj.ai_tagline, proj.ai_description, proj.ai_highlights,
      proj.ai_feedback,
      proj.school_year, proj.course, proj.school,
      proj.creator_name, proj.is_pap, proj.pap_supervisor, proj.pap_date,
      proj.project_type,
      proj.score, proj.linkedin_url, proj.github_url, proj.portfolio_url,
      proj.preview_style, proj.defense_date,
      proj.tags, proj.guide_config, proj.preview_blocks
    )
    RETURNING id INTO new_id;

    v_copied := v_copied || new_id;
  END LOOP;

  RETURN jsonb_build_object(
    'copied',        to_jsonb(v_copied),
    'skipped',       v_skipped,
    'limit_reached', v_skipped > 0,
    'dest_plan',     v_dest_plan,
    'dest_max',      v_dest_max,
    'dest_count',    v_dest_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_projects(UUID, UUID[]) TO authenticated;

-- Nada mais chama a versão só-escola — o cliente já usa export_projects.
DROP FUNCTION IF EXISTS public.export_school_projects(UUID, UUID[]);
