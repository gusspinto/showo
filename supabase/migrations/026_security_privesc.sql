-- ============================================================================
-- 026_security_privesc.sql — Bloqueia escalada de privilégios em profiles
-- ============================================================================
-- Contexto: a policy "Admin update profiles" tem with_check NULL e não restringe
-- colunas. Como o role authenticated tem UPDATE em profiles, qualquer utilizador
-- podia correr update({is_admin:true, role:'empresa', total_xp:999999}) na própria
-- linha (auth.uid() = id passa) e escalar privilégios. Não havia trigger em profiles.
--
-- Fix: trigger BEFORE UPDATE que deixa admins passar, mas bloqueia qualquer alteração
-- a campos protegidos feita por não-admins. RLS não faz column-level de forma fiável,
-- por isso a proteção é feita no trigger.
-- ============================================================================

create or replace function public.guard_profile_privesc()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Admins podem alterar qualquer campo (ex.: painel de admin, banir, promover)
  if public.is_admin() then
    return new;
  end if;

  -- Não-admins não podem tocar em campos sensíveis
  if new.is_admin  is distinct from old.is_admin      -- ninguém se auto-promove a admin
  or new.role      is distinct from old.role          -- role só muda por fluxo controlado
  or new.banned_at is distinct from old.banned_at     -- ninguém se auto-desbane
  or new.total_xp  is distinct from old.total_xp then  -- XP nunca é escrito pelo cliente
    raise exception 'Campos protegidos (is_admin, role, banned_at, total_xp) não podem ser alterados diretamente';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privesc on public.profiles;
create trigger trg_guard_profile_privesc
  before update on public.profiles
  for each row execute function public.guard_profile_privesc();
