-- Destaque semanal: nenhum projeto aparece mais de 2 semanas seguidas.
-- Histórico guardado por semana (segunda-feira), escrito pela função
-- send-featured-notification no envio semanal. Sem grants para anon/authenticated:
-- só a função (service role) e o RPC (security definer) lêem esta tabela.

create table if not exists public.featured_weeks (
  week_start date not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (week_start, project_id)
);

alter table public.featured_weeks enable row level security;
revoke all on public.featured_weeks from anon, authenticated;

create or replace function public.get_featured_projects(p_limit int default 6, p_weeks int default 12)
returns table(
  id uuid, name text, slug text, area text, creator_name text, ai_tagline text,
  score numeric, cover_url text, views int, project_type text, preview_style jsonb,
  active_weeks int, manual_weeks int
)
language sql
security definer
set search_path = public
stable
as $$
  with semana as (select date_trunc('week', now())::date as atual)
  select
    p.id, p.name, p.slug, p.area, p.creator_name, p.ai_tagline,
    p.score, p.cover_url, p.views, p.project_type, p.preview_style,
    coalesce(a.active_weeks, 0)::int as active_weeks,
    coalesce(a.manual_weeks, 0)::int as manual_weeks
  from public.projects p
  cross join semana s
  left join (
    select
      e.project_id,
      count(distinct date_trunc('week', e.created_at)) as active_weeks,
      count(distinct date_trunc('week', e.created_at)) filter (where e.external_id is null or e.external_id not like 'gh:%') as manual_weeks
    from public.project_journal_entries e
    where e.created_at >= now() - (greatest(p_weeks, 1) || ' weeks')::interval
    group by e.project_id
  ) a on a.project_id = p.id
  where (p.visibility = 'public' or p.visibility is null)
    and p.user_id not in (
      '3425e3d2-cc8d-49df-a262-530d868d98ad', -- Gustavo (fundador)
      'a9274b5c-db4c-4e82-96ec-cfe377aad246', -- Bruno Silva (fundador)
      'bc6e9453-35a9-4e37-afc8-c7bedf057480'  -- conta "Showo" de testes/admin
    )
    and p.id not in (
      '66528838-3f6d-4153-b582-f2ef5e1b454d' -- "PAP" (David Mendes), texto fraco demais para estar em destaque
    )
    -- Esteve em destaque nas 2 semanas anteriores: nesta fica de fora (máximo 2 seguidas).
    and p.id not in (
      select f1.project_id
      from public.featured_weeks f1
      join public.featured_weeks f2 on f2.project_id = f1.project_id
      cross join semana s2
      where f1.week_start = s2.atual - 7
        and f2.week_start = s2.atual - 14
    )
  order by p.score desc nulls last, coalesce(a.active_weeks, 0) desc
  limit greatest(p_limit, 1)
$$;

grant execute on function public.get_featured_projects(int, int) to anon, authenticated;

-- Semana de 28/09: os 2 projetos que receberam o email de destaque nessa semana
-- (email_sends, 28/09 12:00 UTC).
insert into public.featured_weeks (week_start, project_id)
values
  ('2026-09-28', '919e8fc5-df49-41fb-a591-6e6ffdc29d10'), -- O glúten e os seus desafios
  ('2026-09-28', '36d4c379-29e0-4442-84e1-123cd3808a32')  -- Smart Resumes
on conflict do nothing;
