-- ============================================================================
-- 177_google_oauth_states.sql
-- ============================================================================
-- A edge function google-calendar-oauth gerava um `state` com randomUUID() mas
-- nunca o guardava nem o validava: o callback lia o user_id directamente de
-- state.split(':')[0] e confiava nele. Isso permitia a qualquer pessoa que
-- soubesse o user_id de outro utilizador gravar tokens Google na conta dessa
-- pessoa (CSRF clássico de OAuth). Esta tabela guarda cada state emitido, de
-- uso único e com validade curta, para o callback poder confirmar que o pedido
-- partiu mesmo de nós e para que utilizador.
--
-- Nenhuma policy de RLS é criada de propósito: com RLS activo e sem policies,
-- a tabela fica inacessível a anon/authenticated e só a service role (as edge
-- functions) lhe toca.
-- ============================================================================

create table if not exists public.google_oauth_states (
  state      text        primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create index if not exists google_oauth_states_expires_idx
  on public.google_oauth_states(expires_at);

alter table public.google_oauth_states enable row level security;

-- Limpeza dos states expirados. Sem search_path explícito isto parte em
-- produção (ver 173_fix_ics_token_search_path.sql).
create or replace function public.purge_expired_google_oauth_states()
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  delete from public.google_oauth_states where expires_at < now();
$$;
