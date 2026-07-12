-- ============================================================================
-- 033_xp_and_invite_rpc.sql — award_xp + find_user_by_email + guard fix
-- ============================================================================
-- 1. award_xp(reason) RPC atribui XP no servidor a partir de whitelist de razões.
-- 2. find_user_by_email(email) RPC devolve só o id para invite lookup.
-- 3. Revoga SELECT (email) de authenticated (evita scraping de emails logado).
-- 4. Reescreve guard_profile_privesc para não depender de is_admin() (revogada
--    em 031). Adiciona bypass via session variable app.trusted_profile_write
--    para RPCs controladas.
-- 5. Reescreve as 4 policies que chamavam is_admin() para fazer o check inline
--    (senão authenticated deixa de conseguir UPDATE/DELETE por falta de EXECUTE).
-- ============================================================================

-- ── Guard sem is_admin(); com bypass via session variable ─────────────────
create or replace function public.guard_profile_privesc()
returns trigger language plpgsql security definer as $$
begin
  -- SET LOCAL vive só a transação; RPCs controladas ligam-no antes do UPDATE
  if coalesce(current_setting('app.trusted_profile_write', true), '') = 'true' then
    return new;
  end if;
  -- Check inline em vez de chamar is_admin() (revogada em 031)
  if exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    return new;
  end if;
  if new.is_admin  is distinct from old.is_admin
  or new.role      is distinct from old.role
  or new.banned_at is distinct from old.banned_at
  or new.total_xp  is distinct from old.total_xp then
    raise exception 'Campos protegidos (is_admin, role, banned_at, total_xp) não podem ser alterados diretamente';
  end if;
  return new;
end $$;

-- ── award_xp: whitelist server-side, incrementa via bypass ────────────────
create or replace function public.award_xp(p_reason text)
returns integer
language plpgsql
security definer
as $$
declare
  v_caller uuid := auth.uid();
  v_points integer;
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  v_points := case p_reason
    when 'mission_complete'  then 10
    when 'project_created'   then 20
    when 'score_milestone'   then 15
    when 'first_login_daily' then 5
    else null
  end;
  if v_points is null then raise exception 'unknown xp reason: %', p_reason; end if;
  perform set_config('app.trusted_profile_write','true', true);
  update public.profiles set total_xp = total_xp + v_points where id = v_caller;
  perform set_config('app.trusted_profile_write','false', true);
  return v_points;
end $$;
grant execute on function public.award_xp(text) to authenticated;

-- ── find_user_by_email: só devolve id, sem scraping estruturado ───────────
create or replace function public.find_user_by_email(p_email text)
returns uuid
language sql
security definer
stable
as $$
  select id from public.profiles where lower(email) = lower(p_email) limit 1;
$$;
grant execute on function public.find_user_by_email(text) to authenticated;

-- ── Fecha email a authenticated (mesmo padrão que 028 fez para anon) ──────
revoke select on public.profiles from authenticated;
grant select (
  id, username, total_xp, created_at, full_name, bio,
  is_admin, banned_at, role, avatar_url, available_for_work,
  company, company_role, company_website, linkedin_url, looking_for,
  company_description, company_location, company_industry, company_size,
  skills, school, project_draft
) on public.profiles to authenticated;                                  -- email fica só para service_role (e ao próprio via auth.email() no JWT)

-- ── Policies admin_* reescritas sem is_admin() ────────────────────────────
drop policy if exists "Admin update projects" on public.projects;
create policy "Admin update projects" on public.projects
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin delete projects" on public.projects;
create policy "Admin delete projects" on public.projects
  for delete using (
    (auth.uid())::text = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin update profiles" on public.profiles;
create policy "Admin update profiles" on public.profiles
  for update using (
    auth.uid() = id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin delete profiles" on public.profiles;
create policy "Admin delete profiles" on public.profiles
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
