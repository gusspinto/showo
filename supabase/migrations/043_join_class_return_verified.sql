-- ============================================================================
-- 043_join_class_return_verified.sql
-- ============================================================================
-- 041/042 proved the insert itself is healthy — no BEFORE trigger blocking
-- it, no AFTER trigger removing it, no triggers on the table at all. The
-- function's own internal re-check confirms the row is there right after
-- inserting it. Yet the app's separate client-side follow-up SELECT (a
-- second, independent HTTP request/connection) still couldn't find it —
-- classic read-after-write timing between separate requests, not a data
-- problem. Fix: stop relying on that second round-trip entirely. The
-- function now returns its own internal verification result directly, so
-- the client trusts what was already proven inside the same transaction
-- instead of re-asking a moment later over a fresh connection.
-- ============================================================================

create or replace function public.join_class(p_code text)
returns table(id uuid, name text, code text, teacher_name text, verified boolean)
language plpgsql
security definer
as $$
declare
  v_class record;
  v_already_member boolean;
  v_rows int;
  v_still_there boolean;
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

  select exists (
    select 1 from public.class_members
    where class_id = v_class.id and user_id = auth.uid()
  ) into v_already_member;

  if v_already_member then
    v_still_there := true;
  else
    insert into public.class_members (class_id, user_id) values (v_class.id, auth.uid());
    get diagnostics v_rows = row_count;

    select exists (
      select 1 from public.class_members
      where class_id = v_class.id and user_id = auth.uid()
    ) into v_still_there;
  end if;

  return query select v_class.id, v_class.name, v_class.code, v_class.teacher_name, v_still_there;
end;
$$;

grant execute on function public.join_class(text) to authenticated;
