create or replace function public.upsert_own_profile(
  p_full_name              text    default null,
  p_username               text    default null,
  p_bio                    text    default null,
  p_phone                  text    default null,
  p_role                   text    default 'aluno',
  p_available_for_work     boolean default false,
  p_skills                 text[]  default '{}',
  p_area                   text    default null,
  p_school                 text    default null,
  p_monthly_report_opt_in  boolean default false,
  p_notify_newsletter      boolean default true,
  p_notify_marketing       boolean default false,
  p_notify_product_updates boolean default true,
  p_notify_project_activity boolean default true,
  p_profile_visibility     text    default 'public',
  p_show_email_publicly    boolean default false,
  p_company                text    default null,
  p_company_role           text    default null,
  p_company_website        text    default null,
  p_linkedin_url           text    default null,
  p_looking_for            text    default null,
  p_company_description    text    default null,
  p_company_location       text    default null,
  p_company_industry       text    default null,
  p_company_size           text    default null
)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('aluno', 'professor', 'recrutador', 'empresa') then
    raise exception 'invalid role: %', p_role;
  end if;

  insert into public.profiles (
    id, full_name, username, bio, phone, role, available_for_work, skills, area, school,
    monthly_report_opt_in, notify_newsletter, notify_marketing,
    notify_product_updates, notify_project_activity,
    profile_visibility, show_email_publicly,
    company, company_role, company_website, linkedin_url, looking_for,
    company_description, company_location, company_industry, company_size
  )
  values (
    auth.uid(),
    nullif(trim(coalesce(p_full_name, '')), ''),
    nullif(trim(coalesce(p_username, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    p_role,
    p_available_for_work,
    coalesce(p_skills, '{}'),
    nullif(trim(coalesce(p_area, '')), ''),
    nullif(trim(coalesce(p_school, '')), ''),
    p_monthly_report_opt_in,
    p_notify_newsletter,
    p_notify_marketing,
    p_notify_product_updates,
    p_notify_project_activity,
    p_profile_visibility,
    p_show_email_publicly,
    nullif(trim(coalesce(p_company, '')), ''),
    nullif(trim(coalesce(p_company_role, '')), ''),
    nullif(trim(coalesce(p_company_website, '')), ''),
    nullif(trim(coalesce(p_linkedin_url, '')), ''),
    nullif(trim(coalesce(p_looking_for, '')), ''),
    nullif(trim(coalesce(p_company_description, '')), ''),
    nullif(trim(coalesce(p_company_location, '')), ''),
    nullif(trim(coalesce(p_company_industry, '')), ''),
    nullif(trim(coalesce(p_company_size, '')), '')
  )
  on conflict (id) do update set
    full_name              = excluded.full_name,
    username               = excluded.username,
    bio                    = excluded.bio,
    phone                  = excluded.phone,
    available_for_work     = excluded.available_for_work,
    skills                 = excluded.skills,
    area                   = excluded.area,
    school                 = excluded.school,
    monthly_report_opt_in  = excluded.monthly_report_opt_in,
    notify_newsletter      = excluded.notify_newsletter,
    notify_marketing       = excluded.notify_marketing,
    notify_product_updates = excluded.notify_product_updates,
    notify_project_activity = excluded.notify_project_activity,
    profile_visibility     = excluded.profile_visibility,
    show_email_publicly    = excluded.show_email_publicly,
    company                = excluded.company,
    company_role           = excluded.company_role,
    company_website        = excluded.company_website,
    linkedin_url           = excluded.linkedin_url,
    looking_for            = excluded.looking_for,
    company_description    = excluded.company_description,
    company_location       = excluded.company_location,
    company_industry       = excluded.company_industry,
    company_size           = excluded.company_size;
end;
$$;

drop function if exists public.upsert_own_profile(text, text, text, text, boolean, text[], text, text, boolean, boolean, boolean, boolean, boolean, text, boolean, text, text, text, text, text, text, text, text, text);

grant execute on function public.upsert_own_profile(
  text, text, text, text, text, boolean, text[], text, text, boolean,
  boolean, boolean, boolean, boolean, text, boolean,
  text, text, text, text, text, text, text, text, text
) to authenticated;
