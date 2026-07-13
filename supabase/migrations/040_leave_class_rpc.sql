-- ============================================================================
-- 040_leave_class_rpc.sql — leave a class through a SECURITY DEFINER RPC
-- ============================================================================
-- Same reasoning as join_class (038/039): class_members' real DELETE policy
-- isn't visible here since the table predates any tracked migration, so a
-- direct client-side .delete() may silently not apply.
--
-- Also fixes a real inconsistency: Dashboard.jsx derives "my turmas" two
-- ways — the class_members row, and independently via class_projects (any
-- class one of my own projects is linked to). leaveClass() only ever
-- touched class_members, so a student who'd added a project to the class
-- kept seeing it on their dashboard after "leaving" — leaving now also
-- unlinks the student's own projects from that class.
-- ============================================================================

create or replace function public.leave_class(p_class_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.class_members
  where class_id = p_class_id and user_id = auth.uid();

  delete from public.class_projects
  where class_id = p_class_id
    and project_id in (select id from public.projects where user_id = auth.uid()::text);
end;
$$;

grant execute on function public.leave_class(uuid) to authenticated;
