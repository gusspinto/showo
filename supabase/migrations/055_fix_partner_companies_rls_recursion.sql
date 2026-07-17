-- ============================================================================
-- 055_fix_partner_companies_rls_recursion.sql
-- ============================================================================
-- 054 introduced two cross-table RLS policies that reference each other
-- directly: partner_companies' "Student view companies they have a lead
-- with" queries internship_leads, and internship_leads' "Claimed company can
-- view/update own leads" query partner_companies back — Postgres detects
-- this as infinite recursion (42P17) and the whole table becomes
-- unreadable, even for the teacher's own rows.
--
-- Same class of bug 027_lockdown_public_reads.sql hit with class_members
-- (see is_class_member()) — same fix: route the cross-table check through a
-- SECURITY DEFINER function, whose inner query bypasses RLS instead of
-- re-triggering the calling policy's evaluation chain.
-- ============================================================================

create or replace function public.has_lead_with_company(p_company_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.internship_leads
    where company_id = p_company_id and student_id = auth.uid()
  );
$$;

grant execute on function public.has_lead_with_company(uuid) to authenticated;

create or replace function public.is_claimed_company(p_company_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.partner_companies
    where id = p_company_id and claimed_by = auth.uid()
  );
$$;

grant execute on function public.is_claimed_company(uuid) to authenticated;

drop policy if exists "Student view companies they have a lead with" on public.partner_companies;
create policy "Student view companies they have a lead with"
  on public.partner_companies for select
  using (public.has_lead_with_company(id));

drop policy if exists "Claimed company can view own leads" on public.internship_leads;
create policy "Claimed company can view own leads"
  on public.internship_leads for select
  using (public.is_claimed_company(company_id));

drop policy if exists "Claimed company can update own leads" on public.internship_leads;
create policy "Claimed company can update own leads"
  on public.internship_leads for update
  using (public.is_claimed_company(company_id))
  with check (public.is_claimed_company(company_id));
