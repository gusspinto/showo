-- ============================================================================
-- 034_professor_invite_codes.sql — gated professor self-registration
-- ============================================================================
-- Context: Register.jsx disables the 'professor'/'recrutador'/'empresa' role
-- cards, but that was UI-only. The profiles RLS policy "Own profile" (005)
-- is FOR ALL USING (auth.uid() = id) with no WITH CHECK — for INSERT,
-- Postgres falls back to USING as the check, so any authenticated user could
-- call profiles.insert({ id: <self>, role: 'professor', is_admin: true, ... })
-- directly via the client SDK on first profile creation, bypassing the app
-- entirely. guard_profile_privesc (026) only fires on UPDATE, so it never
-- caught this. This migration closes that INSERT hole and adds a real
-- invite-code gate so professor self-registration can be reopened safely.
--
-- Codes are reusable by default (max_uses = null) — the intended workflow is
-- one code shared with a whole school, not one code per teacher — but an
-- admin can still cap a code to a fixed number of uses (e.g. 1) if they want
-- tighter control for a single person. Each redemption is logged so admins
-- can see exactly who registered through which code.
-- ============================================================================

-- ── 1. Split "Own profile" so INSERT gets its own, restrictive WITH CHECK ──
drop policy if exists "Own profile" on public.profiles;

create policy "Own profile select" on public.profiles
  for select using (auth.uid() = id);

create policy "Own profile update" on public.profiles
  for update using (auth.uid() = id);
  -- trg_guard_profile_privesc (026) still guards role/is_admin/banned_at/total_xp on UPDATE

create policy "Own profile delete" on public.profiles
  for delete using (auth.uid() = id);

create policy "Own profile insert" on public.profiles
  for insert
  with check (
    auth.uid() = id
    and (role is null or role = 'aluno')
    and is_admin is not true
    and banned_at is null
    and coalesce(total_xp, 0) = 0
  );

-- ── 2. Invite codes — locked table, touched only via the RPCs below ────────
create table if not exists public.professor_invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  label      text,                    -- free-text note for admins, e.g. school name
  max_uses   integer,                 -- null = unlimited (the normal case — one code per school)
  use_count  integer not null default 0,
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.professor_invite_codes enable row level security;

create policy "Admin read invite codes" on public.professor_invite_codes
  for select using (is_admin());
-- No insert/update/delete policy for anyone — only the SECURITY DEFINER
-- RPCs below (which bypass RLS as the function owner) can write this table.

-- ── 3. Redemption log — who used which code, and when ──────────────────────
create table if not exists public.professor_invite_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.professor_invite_codes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz default now(),
  unique (code_id, user_id)  -- same person redeeming twice is a no-op, not a second use
);

alter table public.professor_invite_redemptions enable row level security;

create policy "Admin read invite redemptions" on public.professor_invite_redemptions
  for select using (is_admin());

-- ── 4. Admin mints a code ───────────────────────────────────────────────────
create or replace function public.create_professor_invite_code(p_label text default null, p_max_uses integer default null)
returns text
language plpgsql
security definer
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I — avoids manual-entry ambiguity
  v_code  text;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_max_uses is not null and p_max_uses < 1 then
    raise exception 'max_uses must be positive';
  end if;

  loop
    v_code := (
      select string_agg(substr(v_chars, (random() * length(v_chars))::int + 1, 1), '')
      from generate_series(1, 8)
    );
    exit when not exists (select 1 from public.professor_invite_codes where code = v_code);
  end loop;

  insert into public.professor_invite_codes (code, label, max_uses, created_by)
  values (v_code, nullif(trim(p_label), ''), p_max_uses, auth.uid());

  return v_code;
end;
$$;

grant execute on function public.create_professor_invite_code(text, integer) to authenticated;

-- ── 5. Self-serve redemption at registration ────────────────────────────────
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
