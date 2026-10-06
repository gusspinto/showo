-- Projetos de contas com telemóvel partilhado por outra conta ficam de fora do destaque
-- (mesma pessoa a criar contas novas para voltar a subir no ranking).
create or replace function public.get_featured_projects(p_limit int default 6, p_weeks int default 12)
returns table(id uuid, name text, slug text, area text, creator_name text, ai_tagline text, score numeric, cover_url text, views int, project_type text, preview_style jsonb, active_weeks int, manual_weeks int)
language sql security definer set search_path = public stable
as $$
  with semana as (select date_trunc('week', now())::date as atual)
  select p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline, p.score, p.cover_url, p.views, p.project_type, p.preview_style,
    coalesce(a.active_weeks, 0)::int, coalesce(a.manual_weeks, 0)::int
  from public.projects p
  cross join semana s
  left join (
    select e.project_id,
      count(distinct date_trunc('week', e.created_at)) as active_weeks,
      count(distinct date_trunc('week', e.created_at)) filter (where e.external_id is null or e.external_id not like 'gh:%') as manual_weeks
    from public.project_journal_entries e
    where e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    group by e.project_id
  ) a on a.project_id = p.id
  where (p.visibility = 'public' or p.visibility is null)
    and p.user_id not in ('3425e3d2-cc8d-49df-a262-530d868d98ad','a9274b5c-db4c-4e82-96ec-cfe377aad246','bc6e9453-35a9-4e37-afc8-c7bedf057480')
    and p.id not in ('66528838-3f6d-4153-b582-f2ef5e1b454d')
    and p.id not in (
      select f1.project_id from public.featured_weeks f1
      join public.featured_weeks f2 on f2.project_id = f1.project_id
      cross join semana s2
      where f1.week_start = s2.atual - 7 and f2.week_start = s2.atual - 14
    )
    and not exists (
      select 1 from public.profiles me
      join public.profiles outro on outro.phone = me.phone and outro.id <> me.id
      where me.id::text = p.user_id and me.phone is not null
    )
  order by p.score desc nulls last, coalesce(a.active_weeks, 0) desc
  limit greatest(p_limit, 1)
$$;
grant execute on function public.get_featured_projects(int, int) to anon, authenticated;
