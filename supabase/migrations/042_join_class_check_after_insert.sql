-- ============================================================================
-- 042_join_class_check_after_insert.sql
-- ============================================================================
-- 041's GET DIAGNOSTICS check confirmed the INSERT statement itself affects
-- 1 row (no BEFORE trigger silently skipping it) — join_class still returns
-- success, but the client's follow-up SELECT still can't find the row. That
-- combination points at an AFTER INSERT trigger that removes the row (e.g.
-- some validation/side-effect trigger with faulty logic) — GET DIAGNOSTICS
-- ROW_COUNT reflects the INSERT statement's own effect and won't reveal a
-- trigger deleting the row afterward. Added a second, independent
-- existence re-check right after the insert to catch this case with its
-- own distinct error message.
-- ============================================================================

create or replace function public.join_class(p_code text)
returns table(id uuid, name text, code text, teacher_name text)
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

  if not v_already_member then
    insert into public.class_members (class_id, user_id) values (v_class.id, auth.uid());
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'insert_blocked_before: insert statement affected 0 rows — likely a BEFORE INSERT trigger returning NULL';
    end if;

    select exists (
      select 1 from public.class_members
      where class_id = v_class.id and user_id = auth.uid()
    ) into v_still_there;

    if not v_still_there then
      raise exception 'insert_removed_after: row was inserted but is gone moments later — likely an AFTER INSERT trigger deleting it';
    end if;
  end if;

  return query select v_class.id, v_class.name, v_class.code, v_class.teacher_name;
end;
$$;

grant execute on function public.join_class(text) to authenticated;
