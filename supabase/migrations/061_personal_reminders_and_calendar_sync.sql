-- ============================================================================
-- 061_personal_reminders_and_calendar_sync.sql
-- ============================================================================
-- Adds calendar features to the student dashboard:
--   1. personal_reminders — student's own reminders (title, date, notes, done)
--   2. profiles.ics_token — random token used to authenticate the personal
--      ICS feed URL (so Google/Apple Calendar can subscribe without OAuth)
--   3. google_calendar_tokens — OAuth token storage for bidirectional sync
-- ============================================================================

-- ── 1. personal_reminders ────────────────────────────────────────────────
create table if not exists public.personal_reminders (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  reminder_date date      not null,
  notes       text,
  done        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists personal_reminders_user_date_idx
  on public.personal_reminders(user_id, reminder_date);

alter table public.personal_reminders enable row level security;

create policy "Own reminders — select"
  on public.personal_reminders for select
  using (user_id = auth.uid());

create policy "Own reminders — insert"
  on public.personal_reminders for insert
  with check (user_id = auth.uid());

create policy "Own reminders — update"
  on public.personal_reminders for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Own reminders — delete"
  on public.personal_reminders for delete
  using (user_id = auth.uid());

-- ── 2. profiles.ics_token ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists ics_token text unique;

-- Auto-generate on first insert if missing
create or replace function public.ensure_ics_token()
returns trigger language plpgsql as $$
begin
  if new.ics_token is null then
    new.ics_token := encode(gen_random_bytes(24), 'hex');
  end if;
  return new;
end $$;

drop trigger if exists profiles_ensure_ics_token on public.profiles;
create trigger profiles_ensure_ics_token
  before insert on public.profiles
  for each row execute function public.ensure_ics_token();

-- Backfill existing profiles
update public.profiles
  set ics_token = encode(gen_random_bytes(24), 'hex')
  where ics_token is null;

-- RPC so a client can rotate their token (e.g. leaked feed)
create or replace function public.rotate_ics_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text := encode(gen_random_bytes(24), 'hex');
begin
  update public.profiles
    set ics_token = new_token
    where id = auth.uid();
  return new_token;
end $$;

grant execute on function public.rotate_ics_token() to authenticated;

-- ── 3. google_calendar_tokens ────────────────────────────────────────────
create table if not exists public.google_calendar_tokens (
  user_id       uuid        primary key references auth.users(id) on delete cascade,
  access_token  text        not null,
  refresh_token text        not null,
  expires_at    timestamptz not null,
  calendar_id   text        default 'primary',
  connected_at  timestamptz not null default now()
);

alter table public.google_calendar_tokens enable row level security;

-- Users can see whether they're connected + disconnect; tokens themselves are
-- only readable by the service role (edge functions).
create policy "See own connection status"
  on public.google_calendar_tokens for select
  using (user_id = auth.uid());

create policy "Disconnect own"
  on public.google_calendar_tokens for delete
  using (user_id = auth.uid());
