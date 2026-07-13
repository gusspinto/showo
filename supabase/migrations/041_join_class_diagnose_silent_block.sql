-- ============================================================================
-- 041_join_class_diagnose_silent_block.sql
-- ============================================================================
-- The app now verifies membership after joining (client-side follow-up
-- SELECT) and confirmed the row is NOT being created, even though
-- join_class returns success with no error. That combination — no SQL
-- error, but the row never lands — points at a BEFORE INSERT trigger on
-- class_members that returns NULL (silently skips the row) instead of
-- raising. This makes join_class check the actual affected row count via
-- GET DIAGNOSTICS and raise a clear, specific exception if the insert
-- affected zero rows, instead of reporting success either way.
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
      raise exception 'insert_silently_blocked: class_members insert affected 0 rows — likely a BEFORE INSERT trigger returning NULL';
    end if;
  end if;

  return query select v_class.id, v_class.name, v_class.code, v_class.teacher_name;
end;
$$;

grant execute on function public.join_class(text) to authenticated;
