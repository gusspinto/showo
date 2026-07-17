-- ============================================================================
-- 051_class_academic_year.sql
-- ============================================================================
-- Adds an academic-year label to classes ("2025/2026") so professors can
-- categorize turmas by ano letivo instead of one flat list. Named
-- academic_year (not school_year) because projects.school_year already
-- means something different there (grade level: "11º ano", "Licenciatura",
-- etc.) — reusing the name would collide in meaning across tables.
-- Backfills existing rows from created_at using the same Sept-cutoff rule
-- the frontend uses, so old turmas aren't left uncategorized.
-- ============================================================================

alter table public.classes add column if not exists academic_year text;

update public.classes
set academic_year = case
  when extract(month from created_at) >= 9
    then extract(year from created_at)::int || '/' || (extract(year from created_at)::int + 1)
  else (extract(year from created_at)::int - 1) || '/' || extract(year from created_at)::int
end
where academic_year is null;

-- update_class: add optional academic_year param (appended with a default so
-- existing call sites that don't pass it keep working unchanged).
create or replace function public.update_class(
  p_class_id uuid,
  p_name text,
  p_subject text default null,
  p_academic_year text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'name required';
  end if;

  update public.classes
  set name = trim(p_name),
      subject = nullif(trim(coalesce(p_subject, '')), ''),
      academic_year = coalesce(nullif(trim(p_academic_year), ''), academic_year)
  where id = p_class_id;
end;
$$;

grant execute on function public.update_class(uuid, text, text, text) to authenticated;
