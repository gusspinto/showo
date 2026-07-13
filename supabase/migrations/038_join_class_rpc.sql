-- ============================================================================
-- 038_join_class_rpc.sql — join a class through a SECURITY DEFINER RPC
-- ============================================================================
-- class_members was never created through a tracked migration, so its exact
-- INSERT policy (if any) isn't visible here — a direct client-side
-- .upsert({ class_id, user_id }) from Turmas.jsx/Dashboard.jsx may or may not
-- actually be allowed by RLS, and failures there are silent (supabase-js
-- returns { error }, nothing throws, nothing is checked). Routing this
-- through a SECURITY DEFINER function sidesteps the unknown policy entirely
-- and gives a real error if the code doesn't match a class.
-- ============================================================================

create or replace function public.join_class(p_code text)
returns table(id uuid, name text, code text, teacher_name text)
language plpgsql
security definer
as $$
declare
  v_class record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select c.id, c.name, c.code, c.teacher_name into v_class
  from public.classes c
  where c.code = upper(trim(p_code));

  if v_class.id is null then
    raise exception 'class_not_found';
  end if;

  insert into public.class_members (class_id, user_id)
  values (v_class.id, auth.uid())
  on conflict (class_id, user_id) do nothing;

  return query select v_class.id, v_class.name, v_class.code, v_class.teacher_name;
end;
$$;

grant execute on function public.join_class(text) to authenticated;
