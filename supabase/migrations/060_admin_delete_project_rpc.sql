-- Admin RPC for deleting projects (bypasses RLS with security definer)
create or replace function public.admin_delete_project(p_project_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Not an admin';
  end if;
  delete from public.projects where id = p_project_id;
end;
$$;

revoke execute on function public.admin_delete_project(uuid) from anon, public;
grant execute on function public.admin_delete_project(uuid) to authenticated;
