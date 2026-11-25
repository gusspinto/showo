-- projects.user_id e text (nao uuid), ao contrario de profiles.id. A
-- funcao admin_get_activation_funnel comparava "pr.user_id = p.id" sem
-- cast, o que rebenta sempre com "operator does not exist: text = uuid"
-- em runtime (so apanhado via chamada real no Admin, nao na aplicacao da
-- migracao). Mesmo padrao de precaucao ja usado na 141_project_database.sql:
-- so faz cast para uuid depois de confirmar com regex que o valor e um
-- uuid valido, porque projects.user_id tambem guarda ids nao-uuid.
create or replace function public.admin_get_activation_funnel(
  p_since timestamptz default date_trunc('month', now())
)
returns table (
  user_id uuid,
  signup_at timestamptz,
  first_project_at timestamptz,
  activated_at timestamptz,
  shared_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select
      p.id,
      p.created_at,
      (select min(pr.created_at) from public.projects pr
        where pr.user_id ~ '^[0-9a-f-]{36}$' and pr.user_id::uuid = p.id and pr.entry_kind = 'full'),
      (select min(pr.created_at) from public.projects pr
        where pr.user_id ~ '^[0-9a-f-]{36}$' and pr.user_id::uuid = p.id and pr.entry_kind = 'full'
          and (
            (length(coalesce(pr.problem, '')) >= 30)::int +
            (length(coalesce(pr.solution, '')) >= 30)::int +
            (length(coalesce(pr.target_audience, '')) >= 30)::int +
            (length(coalesce(pr.features, '')) >= 30)::int +
            (length(coalesce(pr.technologies, '')) >= 30)::int +
            (length(coalesce(pr.challenges, '')) >= 30)::int +
            (length(coalesce(pr.results, '')) >= 30)::int +
            (length(coalesce(pr.learnings, '')) >= 30)::int
          ) >= 3),
      (select min(f.created_at) from public.funnel_events f
        where f.user_id = p.id and f.event = 'project_shared')
    from public.profiles p
    where p.created_at >= p_since
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_get_activation_funnel(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_get_activation_funnel(timestamptz) to authenticated;
