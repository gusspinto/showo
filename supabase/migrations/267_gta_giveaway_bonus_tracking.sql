-- Pedido do Gustavo (24/11): resolver o buraco de "quem tem direito ao mês
-- grátis por assinar" ser 100% manual e sem rastreio. profiles.plan_updated_at
-- já existe e é fiável (confirmado com uma query real), por isso dá para
-- automatizar quem assinou Plus/Pro depois do início da campanha, sem
-- adivinhar nem confiar na memória de ninguém.
--
-- Nota honesta: profiles.plan_period (mensal/anual) existe na tabela mas
-- está sempre a null em produção, nunca foi preenchido por nenhum fluxo de
-- checkout. A view traz a coluna na mesma, mas hoje vem sempre vazia, não
-- dá para distinguir mensal de anual automaticamente enquanto isso não for
-- corrigido a montante (fora do âmbito desta campanha).
alter table public.gta_giveaway_entries add column bonus_granted_at timestamptz;

create view public.gta_bonus_candidates as
select
  e.user_id,
  p.username,
  p.full_name,
  e.confirmed_at,
  e.plan_at_entry,
  p.plan as plan_now,
  p.plan_updated_at,
  p.plan_period,
  e.bonus_granted_at
from public.gta_giveaway_entries e
join public.profiles p on p.id = e.user_id
where p.plan in ('plus', 'pro')
  and p.plan_updated_at >= '2026-11-24'::date
order by p.plan_updated_at asc;

-- Mesmo padrão default do projeto (visto em gta_giveaway_entries, function_locks):
-- anon/authenticated recebem grants totais por omissão numa tabela/view nova,
-- e isto expõe full_name/username/plan de todos os utilizadores. Só
-- postgres/service_role deve ver esta view (consulta de admin, não da app).
revoke all on public.gta_bonus_candidates from anon, authenticated;
