-- Pedido do Gustavo (24/11): dar visibilidade real no Admin a quem
-- confirmou participação no sorteio do GTA VI, para escolher o vencedor
-- sem depender de SQL à mão. RLS de gta_giveaway_entries só deixa cada
-- utilizador ver a própria linha, por isso o admin precisa de uma RPC
-- SECURITY DEFINER (mesmo padrão de admin_get_journal_stats e afins).
-- Nota: a função original tinha a coluna de saída chamada "id", que o
-- PL/pgSQL confunde com uma variável implícita do RETURNS TABLE
-- ("column reference id is ambiguous", 42702, só aparece a correr a sério,
-- não ao aplicar a migração). Chamada entry_id para não colidir.
-- plan_now também traduz build/launch (nomes antigos na BD) para
-- plus/pro, para bater certo com o que o Admin.jsx e o resto do código
-- já usam (ver PLAN_ALIASES em src/lib/plans.js).
create function public.admin_get_gta_entries()
returns table (
  entry_id uuid,
  user_id uuid,
  username text,
  full_name text,
  plan_at_entry text,
  plan_now text,
  confirmed_at timestamptz,
  bonus_granted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  return query
    select
      e.id,
      e.user_id,
      p.username,
      p.full_name,
      e.plan_at_entry,
      case p.plan when 'build' then 'plus' when 'launch' then 'pro' else p.plan end,
      e.confirmed_at,
      e.bonus_granted_at
    from public.gta_giveaway_entries e
    join public.profiles p on p.id = e.user_id
    order by e.confirmed_at asc;
end;
$$;

revoke all on function public.admin_get_gta_entries() from public, anon, authenticated;
grant execute on function public.admin_get_gta_entries() to authenticated;

-- Marca o mês extra como já dado, para não se repetir a mesma pessoa duas
-- vezes por engano ao gerir isto manualmente.
create or replace function public.admin_mark_gta_bonus_granted(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  update public.gta_giveaway_entries set bonus_granted_at = now() where id = p_entry_id;
end;
$$;

revoke all on function public.admin_mark_gta_bonus_granted(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_gta_bonus_granted(uuid) to authenticated;
