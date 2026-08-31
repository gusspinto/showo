-- Lock sensitive profile columns from authenticated UPDATE
-- Previously table-level GRANT allowed users to modify plan, role, is_admin, etc.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  full_name, username, bio, avatar_url, area, skills,
  linkedin_url, available_for_work, looking_for,
  company, company_role, company_website, company_description,
  company_location, company_industry, company_size,
  school, phone, language, profile_visibility, show_email_publicly,
  monthly_report_opt_in, weekly_recap_email_opt_in,
  notify_project_activity, notify_product_updates, notify_newsletter, notify_marketing,
  project_draft, last_active_at, last_action,
  signup_country, signup_city, signup_referrer, signup_utm_source
) ON public.profiles TO authenticated;
