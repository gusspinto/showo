-- ============================================================================
-- 039_join_class_rpc_fix.sql — join_class no longer assumes a unique
-- constraint exists on (class_id, user_id)
-- ============================================================================
-- The 038 version used `insert ... on conflict (class_id, user_id) do
-- nothing`, which requires an actual unique/primary key constraint on those
-- exact columns. class_members was never created through a tracked
-- migration, so that constraint's existence was a guess — if it doesn't
-- exist, Postgres raises "no unique or exclusion constraint matching the
-- ON CONFLICT specification", the whole function call fails, and the
-- client only sees a generic error it was mapping to "Turma não
-- encontrada". Switched to an explicit existence check instead, which
-- works regardless of what constraints the table actually has.
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

  if not exists (
    select 1 from public.class_members
    where class_id = v_class.id and user_id = auth.uid()
  ) then
    insert into public.class_members (class_id, user_id) values (v_class.id, auth.uid());
  end if;

  return query select v_class.id, v_class.name, v_class.code, v_class.teacher_name;
end;
$$;

grant execute on function public.join_class(text) to authenticated;
