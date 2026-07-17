-- ============================================================================
-- 054_partner_company_invites.sql
-- ============================================================================
-- Lets a company invited via partner_companies actually create a real
-- account, not just be a row the professor tracks manually. Mirrors the
-- pattern 034_professor_invite_codes.sql used to gate 'professor'
-- self-registration: role escalation only happens through a controlled
-- SECURITY DEFINER RPC, never a direct client insert/update. Here the token
-- is per-company (not a shared code), since it's tied to one specific
-- partner_companies row that already has real contact info.
--
-- Once claimed, the company's new account can see (and update the status
-- of) the internship_leads already tracked for it — the professor's manual
-- tracking becomes the company's own live list, no re-entry needed.
-- ============================================================================

alter table public.partner_companies
  add column if not exists invite_token uuid unique default gen_random_uuid(),
  add column if not exists invited_at   timestamptz,
  add column if not exists claimed_by   uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at   timestamptz;

-- backfill: the column default only applies to new rows
update public.partner_companies set invite_token = gen_random_uuid() where invite_token is null;

-- ── Public, token-gated lookup — lets the register page show the company
-- name before the visitor has an account, without exposing contact info ──
create or replace function public.get_partner_company_invite_info(p_token uuid)
returns table (name text, sector text, already_claimed boolean)
language sql
security definer
stable
as $$
  select name, sector, claimed_by is not null
  from public.partner_companies
  where invite_token = p_token;
$$;

grant execute on function public.get_partner_company_invite_info(uuid) to anon, authenticated;

-- ── Claim: called right after signup (or by an already-logged-in user who
-- opens the invite link) — links the account and unlocks role='empresa' ──
create or replace function public.claim_partner_company_invite(p_token uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_company record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id, name, sector, website, claimed_by
  into v_company
  from public.partner_companies
  where invite_token = p_token;

  if v_company.id is null then
    raise exception 'invalid_token';
  end if;

  if v_company.claimed_by is not null and v_company.claimed_by <> auth.uid() then
    raise exception 'already_claimed';
  end if;

  update public.partner_companies
  set claimed_by = auth.uid(), claimed_at = coalesce(claimed_at, now())
  where id = v_company.id;

  perform set_config('app.trusted_profile_write', 'true', true);
  update public.profiles
  set role             = 'empresa',
      company          = coalesce(nullif(trim(coalesce(company, '')), ''), v_company.name),
      company_industry = coalesce(nullif(trim(coalesce(company_industry, '')), ''), v_company.sector),
      company_website  = coalesce(nullif(trim(coalesce(company_website, '')), ''), v_company.website)
  where id = auth.uid();
  perform set_config('app.trusted_profile_write', 'false', true);
end;
$$;

grant execute on function public.claim_partner_company_invite(uuid) to authenticated;

-- ── partner_companies: the claiming company can see its own row ──
create policy "Claimed company can view own row"
  on public.partner_companies for select
  using (claimed_by = auth.uid());

-- ── internship_leads: the claiming company can view and update its own leads ──
create policy "Claimed company can view own leads"
  on public.internship_leads for select
  using (
    exists (
      select 1 from public.partner_companies pc
      where pc.id = internship_leads.company_id and pc.claimed_by = auth.uid()
    )
  );

create policy "Claimed company can update own leads"
  on public.internship_leads for update
  using (
    exists (
      select 1 from public.partner_companies pc
      where pc.id = internship_leads.company_id and pc.claimed_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partner_companies pc
      where pc.id = internship_leads.company_id and pc.claimed_by = auth.uid()
    )
  );
