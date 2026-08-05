-- ============================================================================
-- 065_security_hardening.sql — Fix security issues
-- ============================================================================
-- 1. Classes: anon can't see code column; authenticated can see all (traceable)
-- 2. Projects: anon can't see grade columns
-- 3. Profiles: anon can't see is_admin; ics_token removed from grant (use RPC)
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CLASSES: hide code from anon
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Public read classes" on public.classes;

revoke select on public.classes from anon;
grant select (id, name, subject, teacher_id, teacher_name, created_at, academic_year)
  on public.classes to anon;

revoke select on public.classes from authenticated;
grant select (id, name, subject, code, teacher_id, teacher_name, created_at, academic_year)
  on public.classes to authenticated;

create policy "Anon read classes"
  on public.classes for select to anon
  using (true);

create policy "Authenticated read classes"
  on public.classes for select to authenticated
  using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PROJECTS: hide teacher grades from anon
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Public read projects" on public.projects;

revoke select on public.projects from anon;
grant select (
  id, created_at, user_id, name, area, goal, problem, solution,
  target_audience, features, technologies, challenges, results, learnings,
  cover_url, slug, ai_tagline, ai_description, ai_highlights,
  school_year, course, school, creator_name, is_pap, pap_supervisor, pap_date,
  project_type, score, linkedin_url, github_url, portfolio_url,
  views, defense_date, preview_style, tags, guide_config, preview_blocks,
  likes_count, interest_count, review_status, review_status_updated_at
) on public.projects to anon;

create policy "Public read projects"
  on public.projects for select
  using (true);

-- RPC for grade access (owner, class teacher, or admin)
create or replace function public.get_project_grades(p_project_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_result jsonb;
  v_user_id text;
begin
  select user_id into v_user_id from public.projects where id = p_project_id;
  if auth.uid()::text = v_user_id
    or exists (select 1 from public.class_projects cp join public.classes c on c.id = cp.class_id where cp.project_id = p_project_id and c.teacher_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  then
    select jsonb_build_object(
      'teacher_score', teacher_score,
      'teacher_score_note', teacher_score_note,
      'teacher_score_ratings', teacher_score_ratings,
      'teacher_score_by', teacher_score_by,
      'teacher_score_updated_at', teacher_score_updated_at
    ) into v_result from public.projects where id = p_project_id;
    return v_result;
  end if;
  return null;
end;
$$;

grant execute on function public.get_project_grades(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PROFILES: remove is_admin from anon; ics_token via RPC only
-- ═══════════════════════════════════════════════════════════════════════════

revoke select on public.profiles from anon;
grant select (
  id, username, total_xp, created_at, full_name, bio,
  banned_at, role, avatar_url, available_for_work,
  company, company_role, company_website, linkedin_url, looking_for,
  company_description, company_location, company_industry, company_size,
  skills, school
) on public.profiles to anon;

revoke select on public.profiles from authenticated;
grant select (
  id, username, total_xp, created_at, full_name, bio,
  is_admin, banned_at, role, avatar_url, available_for_work,
  company, company_role, company_website, linkedin_url, looking_for,
  company_description, company_location, company_industry, company_size,
  skills, school, project_draft, monthly_report_opt_in, area,
  notify_newsletter, notify_marketing, notify_product_updates,
  notify_project_activity, profile_visibility, show_email_publicly, language,
  signup_country, signup_city, signup_referrer, signup_utm_source,
  last_active_at, last_action, welcome_email_sent, monthly_report_sent_at
) on public.profiles to authenticated;

-- ics_token is sensitive (grants calendar access), only own user via RPC
create or replace function public.get_my_ics_token()
returns text
language plpgsql
security definer
stable
as $$
begin
  return (select ics_token from public.profiles where id = auth.uid());
end;
$$;

grant execute on function public.get_my_ics_token() to authenticated;
