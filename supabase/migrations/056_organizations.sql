-- ============================================================================
-- 056_organizations.sql — Multi-tenant school accounts
-- ============================================================================
-- Introduces the Organization entity (escola) and wires it to profiles.
-- Domain-based auto-detection at signup, plan inheritance, and a SECURITY
-- DEFINER RPC for copying projects from a school account to a personal one.
-- ============================================================================

-- ── 1. Organizations table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email_domain TEXT        NOT NULL UNIQUE,  -- e.g. "instituicao.pt"
  plan         TEXT        NOT NULL DEFAULT 'build' CHECK (plan IN ('build', 'launch')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Only admins manage orgs; anyone can look up by domain (needed for signup detection)
CREATE POLICY "Public read organizations"
  ON public.organizations FOR SELECT USING (true);

CREATE POLICY "Admin manage organizations"
  ON public.organizations FOR ALL
  USING (public.is_admin());


-- ── 2. Link profiles → organizations ────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles(organization_id)
  WHERE organization_id IS NOT NULL;


-- ── 3. RPC: look up org by email domain (used during signup) ─────────────────
-- Returns the org row if the domain matches, or an empty result if no match.
-- Callable by anon so the Register page can check before signing up.

CREATE OR REPLACE FUNCTION public.get_organization_by_domain(p_domain TEXT)
RETURNS TABLE (id UUID, name TEXT, plan TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT id, name, plan
  FROM public.organizations
  WHERE lower(trim(email_domain)) = lower(trim(p_domain))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_by_domain(TEXT) TO anon, authenticated;


-- ── 4. RPC: associate a newly-created user with their org (called at signup) ──
-- Sets organization_id on the caller's profile based on the email they signed
-- up with. No-op if the domain doesn't match any org.
-- Called with the school account session immediately after signUp.

CREATE OR REPLACE FUNCTION public.associate_organization_by_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid    UUID   := auth.uid();
  v_email  TEXT;
  v_domain TEXT;
  v_org_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Get email from auth.users (SECURITY DEFINER allows access)
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RETURN; END IF;

  -- Extract domain (everything after @)
  v_domain := lower(split_part(v_email, '@', 2));

  -- Find matching org
  SELECT id INTO v_org_id FROM public.organizations
  WHERE lower(trim(email_domain)) = v_domain
  LIMIT 1;

  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Associate
  UPDATE public.profiles
  SET organization_id = v_org_id
  WHERE id = v_uid AND organization_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.associate_organization_by_email() TO authenticated;


-- ── 5. RPC: export projects from school account → personal account ────────────
-- SECURITY DEFINER so it can write to the target user's project rows.
-- Caller must be authenticated (school account).
-- p_dest_user_id: the personal account's auth.users.id
-- p_project_ids:  array of project UUIDs to copy (must belong to caller)
--
-- Returns a JSONB with:
--   { "copied": [<new_project_ids>], "skipped": <count>, "limit_reached": bool }

CREATE OR REPLACE FUNCTION public.export_school_projects(
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

  -- Caller must be a school account (has organization_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND organization_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'only school accounts can export projects';
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

    -- Generate a unique slug: original + "-pessoal" suffix + random if needed
    new_slug := proj.slug || '-pessoal';
    IF EXISTS (SELECT 1 FROM public.projects WHERE slug = new_slug) THEN
      new_slug := proj.slug || '-pessoal-' || substr(gen_random_uuid()::text, 1, 6);
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

GRANT EXECUTE ON FUNCTION public.export_school_projects(UUID, UUID[]) TO authenticated;


-- ── 6. Admin helper: create an organization ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_organization(
  p_name         TEXT,
  p_email_domain TEXT,
  p_plan         TEXT DEFAULT 'build'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_email_domain !~ '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RAISE EXCEPTION 'invalid email domain format';
  END IF;

  INSERT INTO public.organizations (name, email_domain, plan)
  VALUES (p_name, lower(trim(p_email_domain)), p_plan)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_organization(TEXT, TEXT, TEXT) TO authenticated;
