-- ============================================================
-- 022 — Security: fix critical RLS vulnerabilities
--
-- #4  INSERT projects: prevent forging user_id
-- #1  UPDATE projects: require edit_token for anon projects (via RPC)
-- #5  teacher_feedback: validate role = 'professor'
-- ============================================================

-- ── #4 INSERT: only own user_id or NULL allowed ──────────────
DROP POLICY IF EXISTS "Anyone can insert"         ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;

CREATE POLICY "Insert own or anon project" ON public.projects
  FOR INSERT WITH CHECK (
    user_id IS NULL                -- anonymous project
    OR auth.uid()::text = user_id  -- authenticated user inserting own project
  );

-- ── #1 UPDATE: remove bare user_id IS NULL bypass ────────────
-- Anonymous project updates must go through the update_anon_project RPC below,
-- which validates the edit_token server-side. Direct REST updates on anon
-- projects are no longer allowed.
DROP POLICY IF EXISTS "Owner update" ON public.projects;

CREATE POLICY "Owner update" ON public.projects
  FOR UPDATE USING (
    auth.uid()::text = user_id     -- authenticated owner only
  );

-- ── RPC: authenticated update path for anonymous projects ────
-- Callers must supply the correct edit_token. SECURITY DEFINER so the
-- function can bypass the tightened RLS and perform the update itself
-- after validating ownership via the token.
CREATE OR REPLACE FUNCTION public.update_anon_project(
  p_id    uuid,
  p_token text,
  p_data  jsonb
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result   public.projects;
  bad_keys text[];
BEGIN
  -- Validate: project must be anonymous with a matching edit_token
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id
      AND user_id IS NULL
      AND edit_token IS NOT NULL
      AND edit_token = p_token
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Reject any attempt to overwrite protected columns
  SELECT array_agg(k) INTO bad_keys
  FROM jsonb_object_keys(p_data) AS k
  WHERE k IN ('id', 'user_id', 'edit_token', 'slug', 'created_at');

  IF bad_keys IS NOT NULL THEN
    RAISE EXCEPTION 'disallowed fields: %', bad_keys USING ERRCODE = '42501';
  END IF;

  -- Explicit per-column mapping (safe; no dynamic SQL)
  UPDATE public.projects SET
    name                = CASE WHEN p_data ? 'name'                THEN p_data->>'name'                          ELSE name                END,
    area                = CASE WHEN p_data ? 'area'                THEN p_data->>'area'                          ELSE area                END,
    goal                = CASE WHEN p_data ? 'goal'                THEN p_data->>'goal'                          ELSE goal                END,
    problem             = CASE WHEN p_data ? 'problem'             THEN p_data->>'problem'                       ELSE problem             END,
    solution            = CASE WHEN p_data ? 'solution'            THEN p_data->>'solution'                      ELSE solution            END,
    target_audience     = CASE WHEN p_data ? 'target_audience'     THEN p_data->>'target_audience'               ELSE target_audience     END,
    features            = CASE WHEN p_data ? 'features'            THEN p_data->>'features'                      ELSE features            END,
    technologies        = CASE WHEN p_data ? 'technologies'        THEN p_data->>'technologies'                  ELSE technologies        END,
    challenges          = CASE WHEN p_data ? 'challenges'          THEN p_data->>'challenges'                    ELSE challenges          END,
    results             = CASE WHEN p_data ? 'results'             THEN p_data->>'results'                       ELSE results             END,
    learnings           = CASE WHEN p_data ? 'learnings'           THEN p_data->>'learnings'                     ELSE learnings           END,
    cover_url           = CASE WHEN p_data ? 'cover_url'           THEN p_data->>'cover_url'                     ELSE cover_url           END,
    linkedin_url        = CASE WHEN p_data ? 'linkedin_url'        THEN p_data->>'linkedin_url'                  ELSE linkedin_url        END,
    github_url          = CASE WHEN p_data ? 'github_url'          THEN p_data->>'github_url'                    ELSE github_url          END,
    portfolio_url       = CASE WHEN p_data ? 'portfolio_url'       THEN p_data->>'portfolio_url'                 ELSE portfolio_url       END,
    school_year         = CASE WHEN p_data ? 'school_year'         THEN p_data->>'school_year'                   ELSE school_year         END,
    course              = CASE WHEN p_data ? 'course'              THEN p_data->>'course'                        ELSE course              END,
    school              = CASE WHEN p_data ? 'school'              THEN p_data->>'school'                        ELSE school              END,
    creator_name        = CASE WHEN p_data ? 'creator_name'        THEN p_data->>'creator_name'                  ELSE creator_name        END,
    is_pap              = CASE WHEN p_data ? 'is_pap'              THEN (p_data->>'is_pap')::boolean             ELSE is_pap              END,
    pap_supervisor      = CASE WHEN p_data ? 'pap_supervisor'      THEN p_data->>'pap_supervisor'                ELSE pap_supervisor      END,
    pap_date            = CASE WHEN p_data ? 'pap_date'            THEN p_data->>'pap_date'                      ELSE pap_date            END,
    project_type        = CASE WHEN p_data ? 'project_type'        THEN p_data->>'project_type'                  ELSE project_type        END,
    tags                = CASE WHEN p_data ? 'tags'                THEN p_data->'tags'                           ELSE tags                END,
    score               = CASE WHEN p_data ? 'score'               THEN (p_data->>'score')::integer              ELSE score               END,
    defense_date        = CASE WHEN p_data ? 'defense_date'        THEN p_data->>'defense_date'                  ELSE defense_date        END,
    notified_milestones = CASE WHEN p_data ? 'notified_milestones' THEN p_data->'notified_milestones'            ELSE notified_milestones END,
    ai_feedback         = CASE WHEN p_data ? 'ai_feedback'         THEN p_data->'ai_feedback'                    ELSE ai_feedback         END,
    guide_config        = CASE WHEN p_data ? 'guide_config'        THEN p_data->'guide_config'                   ELSE guide_config        END,
    ai_tagline          = CASE WHEN p_data ? 'ai_tagline'          THEN p_data->>'ai_tagline'                    ELSE ai_tagline          END,
    ai_description      = CASE WHEN p_data ? 'ai_description'      THEN p_data->>'ai_description'                ELSE ai_description      END,
    ai_highlights       = CASE WHEN p_data ? 'ai_highlights'       THEN p_data->'ai_highlights'                  ELSE ai_highlights       END
  WHERE id = p_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Allow both anon and authenticated callers (token is the auth mechanism)
GRANT EXECUTE ON FUNCTION public.update_anon_project(uuid, text, jsonb) TO anon, authenticated;

-- ── #5 teacher_feedback: require role = 'professor' ──────────
DROP POLICY IF EXISTS "Teacher insert feedback" ON public.teacher_feedback;
DROP POLICY IF EXISTS "Teacher update feedback" ON public.teacher_feedback;
DROP POLICY IF EXISTS "Teacher delete feedback" ON public.teacher_feedback;

CREATE POLICY "Teacher insert feedback"
  ON public.teacher_feedback FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

CREATE POLICY "Teacher update feedback"
  ON public.teacher_feedback FOR UPDATE
  USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

CREATE POLICY "Teacher delete feedback"
  ON public.teacher_feedback FOR DELETE
  USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );
