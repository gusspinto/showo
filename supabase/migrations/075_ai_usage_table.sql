-- ai_usage: server-side tracking of AI feature usage per user per month.
-- The check_ai_limit RPC atomically checks the plan limit and increments usage.

create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null,
  month       text not null,  -- 'YYYY-MM'
  used        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, feature, month)
);

alter table public.ai_usage enable row level security;

create policy "Users can read own usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- No insert/update/delete from client — only via RPC (security definer)
create policy "No direct writes"
  on public.ai_usage for insert
  with check (false);

create policy "No direct updates"
  on public.ai_usage for update
  using (false);

create policy "No direct deletes"
  on public.ai_usage for delete
  using (false);

grant select on public.ai_usage to authenticated;

-- RPC: check_ai_limit
-- Called by edge functions to atomically check + increment usage.
-- Returns JSON: { "allowed": bool, "remaining": int, "limit": int, "used": int }
create or replace function public.check_ai_limit(
  p_user_id  uuid,
  p_feature  text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_plan      text;
  v_limit     int;
  v_month     text;
  v_used      int;
  v_remaining int;
begin
  -- Get the user's plan
  select coalesce(plan, 'free') into v_plan
  from public.profiles
  where id = p_user_id;

  if v_plan is null then
    v_plan := 'free';
  end if;

  -- Plan limits lookup (mirrors src/lib/plans.js)
  v_limit := case
    -- free plan
    when v_plan = 'free' and p_feature = 'createProject'    then 2
    when v_plan = 'free' and p_feature = 'interviewProject'  then 0
    when v_plan = 'free' and p_feature = 'coach'             then 10
    when v_plan = 'free' and p_feature = 'defense'           then 1
    when v_plan = 'free' and p_feature = 'diaryReport'       then 1
    when v_plan = 'free' and p_feature = 'narrative'         then 1
    when v_plan = 'free' and p_feature = 'analyzeProject'    then 0
    when v_plan = 'free' and p_feature = 'coverLetter'       then 0
    -- build plan (unlimited = 999999)
    when v_plan = 'build' and p_feature = 'coverLetter'      then 0
    when v_plan = 'build'                                     then 999999
    -- launch plan (all unlimited)
    when v_plan = 'launch'                                    then 999999
    -- unknown feature/plan → blocked
    else 0
  end;

  -- If limit is 0, blocked entirely
  if v_limit = 0 then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'used', 0);
  end if;

  -- If unlimited, allow without tracking
  if v_limit = 999999 then
    return jsonb_build_object('allowed', true, 'remaining', 999999, 'limit', 999999, 'used', 0);
  end if;

  v_month := to_char(now(), 'YYYY-MM');

  -- Upsert usage row and increment
  insert into public.ai_usage (user_id, feature, month, used, updated_at)
  values (p_user_id, p_feature, v_month, 1, now())
  on conflict (user_id, feature, month)
  do update set used = ai_usage.used + 1, updated_at = now()
  returning used into v_used;

  v_remaining := greatest(0, v_limit - v_used);

  -- If this use pushed past the limit, it was the one that exceeded — rollback the increment
  if v_used > v_limit then
    update public.ai_usage
    set used = used - 1, updated_at = now()
    where user_id = p_user_id and feature = p_feature and month = v_month;
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'used', v_used - 1);
  end if;

  return jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', v_limit, 'used', v_used);
end;
$$;

grant execute on function public.check_ai_limit(uuid, text) to service_role;

-- RPC: get_ai_usage
-- Called by the frontend to get current usage for all features this month.
create or replace function public.get_ai_usage()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_plan   text;
  v_month  text;
  v_result jsonb;
begin
  select coalesce(plan, 'free') into v_plan from public.profiles where id = auth.uid();
  if v_plan is null then v_plan := 'free'; end if;

  v_month := to_char(now(), 'YYYY-MM');

  select coalesce(jsonb_object_agg(feature, used), '{}'::jsonb)
  into v_result
  from public.ai_usage
  where user_id = auth.uid() and month = v_month;

  return v_result;
end;
$$;

grant execute on function public.get_ai_usage() to authenticated;
