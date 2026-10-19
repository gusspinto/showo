-- ============================================================================
-- 201_fix_profiles_created_at_timezone.sql
-- ============================================================================
-- profiles.created_at tinha DEFAULT (now() AT TIME ZONE 'Europe/Lisbon') —
-- um erro clássico de Postgres: isso devolve a hora local de Lisboa como
-- timestamp NAIVE, que depois é reinterpretada como se já estivesse na
-- timezone da sessão ao ser guardada numa coluna timestamptz. Resultado:
-- em horário de verão (Lisboa = UTC+1), cada profiles.created_at ficava
-- 1h à frente do valor real (confirmado ao vivo: auth.users.created_at,
-- que usa `now()` normal, estava sempre certo — profiles.created_at
-- tinha sempre +59m59s a mais, para todos os registos recentes).
--
-- Detetado porque last_active_at (correto) ficava mais recente que
-- created_at (errado) para contas acabadas de criar, o que é impossível.
-- ============================================================================

alter table public.profiles alter column created_at set default now();

update public.profiles p
set created_at = u.created_at
from auth.users u
where p.id = u.id
  and p.created_at is distinct from u.created_at;
