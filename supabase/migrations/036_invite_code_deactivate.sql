-- ============================================================================
-- 036_invite_code_deactivate.sql — let admins deactivate/reactivate a code
-- ============================================================================

alter table public.professor_invite_codes
  add column if not exists revoked_at timestamptz;

-- Redemption must also check the code hasn't been revoked
create or replace function public.redeem_professor_invite_code(p_code text, p_full_name text, p_school text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_already_redeemed boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_id
  from public.professor_invite_codes
  where code = upper(trim(p_code))
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (max_uses is null or use_count < max_uses);

  if v_id is null then
    raise exception 'invalid_or_exhausted_code';
  end if;

  select exists(
    select 1 from public.professor_invite_redemptions
    where code_id = v_id and user_id = auth.uid()
  ) into v_already_redeemed;

  if not v_already_redeemed then
    insert into public.professor_invite_redemptions (code_id, user_id) values (v_id, auth.uid());
    update public.professor_invite_codes set use_count = use_count + 1 where id = v_id;
  end if;

  perform set_config('app.trusted_profile_write', 'true', true);

  insert into public.profiles (id, full_name, role, school)
  values (auth.uid(), nullif(trim(p_full_name), ''), 'professor', nullif(trim(p_school), ''))
  on conflict (id) do update
    set role      = 'professor',
        full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
        school    = coalesce(nullif(trim(p_school), ''), public.profiles.school);

  perform set_config('app.trusted_profile_write', 'false', true);
end;
$$;

grant execute on function public.redeem_professor_invite_code(text, text, text) to authenticated;

-- Admin toggles a code on/off
create or replace function public.set_professor_invite_code_active(p_code_id uuid, p_active boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.professor_invite_codes
  set revoked_at = case when p_active then null else now() end
  where id = p_code_id;
end;
$$;

grant execute on function public.set_professor_invite_code_active(uuid, boolean) to authenticated;
