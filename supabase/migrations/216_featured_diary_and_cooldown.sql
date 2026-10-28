-- Duas mudanças às regras de destaque, pedidas depois de ver que o "O glúten" ocupava
-- 3 das últimas 10 vagas (30%) e que a atividade de diário nunca era exigida, só contava
-- para desempate.
--
-- 1) Diário obrigatório: "recente" precisa de 1+ registo nas últimas 2 semanas (natural
--    para um projeto novo, já devia estar a escrever desde o início). "geral" precisa de
--    1+ registo nas últimas 4 semanas, 2 semanas ficava com ZERO candidatos elegíveis
--    hoje (confirmado em produção), mataria essa vaga por completo.
-- 2) Cooldown mais forte: deixa de ser só "não 2 semanas seguidas" e passa a "não pode
--    voltar nas 2 semanas a seguir à última vez que esteve em destaque", mesmo que só lá
--    tenha estado 1 semana. Isto impede um projeto de ocupar 2 em cada 3 semanas para sempre.
create or replace function public.get_featured_projects(p_limit int default 6, p_weeks int default 12)
returns table(id uuid, name text, slug text, area text, creator_name text, ai_tagline text, score numeric, cover_url text, views int, project_type text, preview_style jsonb, active_weeks int, manual_weeks int)
language sql security definer set search_path = public stable
as $$
  with semana as (select date_trunc('week', now())::date as atual),
  pin as (
    select fw.project_id from public.featured_weeks fw cross join semana s where fw.week_start = s.atual
  ),
  journal as (
    select e.project_id,
      count(distinct date_trunc('week', e.created_at)) as active_weeks,
      count(distinct date_trunc('week', e.created_at)) filter (where e.external_id is null or e.external_id not like 'gh:%') as manual_weeks
    from public.project_journal_entries e
    where e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    group by e.project_id
  ),
  pinned_rows as (
    select p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline, p.score, p.cover_url, p.views, p.project_type, p.preview_style,
      coalesce(j.active_weeks, 0)::int as active_weeks, coalesce(j.manual_weeks, 0)::int as manual_weeks
    from pin
    join public.projects p on p.id = pin.project_id and (p.visibility = 'public' or p.visibility is null)
    left join journal j on j.project_id = p.id
    order by p.score desc nulls last
  ),
  base as (
    select p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline, p.score, p.cover_url, p.views, p.project_type, p.preview_style,
      coalesce(j.active_weeks, 0)::int as active_weeks, coalesce(j.manual_weeks, 0)::int as manual_weeks,
      dono.created_at as conta_criada, p.created_at as proj_criado
    from public.projects p
    cross join semana s
    join public.profiles dono on dono.id::text = p.user_id
    left join journal j on j.project_id = p.id
    where (p.visibility = 'public' or p.visibility is null)
      and p.user_id not in ('3425e3d2-cc8d-49df-a262-530d868d98ad','a9274b5c-db4c-4e82-96ec-cfe377aad246','bc6e9453-35a9-4e37-afc8-c7bedf057480')
      and p.id not in ('66528838-3f6d-4153-b582-f2ef5e1b454d')
      -- Cooldown: não pode voltar nas 2 semanas a seguir à última vez que esteve em destaque.
      and p.id not in (
        select fw2.project_id from public.featured_weeks fw2 cross join semana s3
        where fw2.week_start in (s3.atual - 7, s3.atual - 14)
      )
      and not exists (
        select 1 from public.profiles me
        join public.profiles outro on outro.phone = me.phone and outro.id <> me.id
        where me.id = dono.id and me.phone is not null
      )
      and dono.created_at < now() - interval '3 days'
      and (dono.created_at < now() - interval '14 days' or p.created_at > now() - interval '14 days')
      and ((length(coalesce(p.goal,'')) >= 20)::int + (length(coalesce(p.problem,'')) >= 20)::int
         + (length(coalesce(p.solution,'')) >= 20)::int + (length(coalesce(p.features,'')) >= 20)::int
         + (length(coalesce(p.results,'')) >= 20)::int) >= 3
  ),
  geral as (
    select * from base
    where conta_criada < now() - interval '14 days'
      and id in (select project_id from public.project_journal_entries where created_at >= now() - interval '28 days')
    order by score desc nulls last, active_weeks desc limit 1
  ),
  recente as (
    select * from base
    where proj_criado > now() - interval '14 days' and id not in (select id from geral)
      and id in (select project_id from public.project_journal_entries where created_at >= now() - interval '14 days')
    order by score desc nulls last, proj_criado desc limit 1
  ),
  excl as (
    select id from pinned_rows where exists (select 1 from pin)
    union all
    select id from geral where not exists (select 1 from pin)
    union all
    select id from recente where not exists (select 1 from pin)
  ),
  resto as (
    select id, name, slug, area, creator_name, ai_tagline, score, cover_url, views, project_type, preview_style, active_weeks, manual_weeks
    from base where id not in (select id from excl)
    order by score desc nulls last, active_weeks desc
  )
  select x.id, x.name, x.slug, x.area, x.creator_name, x.ai_tagline, x.score, x.cover_url, x.views, x.project_type, x.preview_style,
    x.active_weeks, x.manual_weeks
  from (
    select 1 as ordem, id, name, slug, area, creator_name, ai_tagline, score, cover_url, views, project_type, preview_style, active_weeks, manual_weeks
    from pinned_rows where exists (select 1 from pin)
    union all
    select 2, id, name, slug, area, creator_name, ai_tagline, score, cover_url, views, project_type, preview_style, active_weeks, manual_weeks
    from geral where not exists (select 1 from pin)
    union all
    select 2, id, name, slug, area, creator_name, ai_tagline, score, cover_url, views, project_type, preview_style, active_weeks, manual_weeks
    from recente where not exists (select 1 from pin)
    union all
    select 3, id, name, slug, area, creator_name, ai_tagline, score, cover_url, views, project_type, preview_style, active_weeks, manual_weeks
    from resto
  ) x
  order by x.ordem
  limit greatest(p_limit, 1)
$$;
grant execute on function public.get_featured_projects(int, int) to anon, authenticated;
