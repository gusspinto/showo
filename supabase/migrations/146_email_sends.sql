-- ============================================================================
-- 146_email_sends.sql
-- ============================================================================
-- Guarda o id que o Resend devolve por cada email enviado (check-in semanal,
-- para já), para depois se poder consultar entregas/aberturas/cliques a
-- sério em vez de "não sei". opened_at/clicked_at ficam para quando os
-- webhooks do Resend estiverem ligados (email.opened/email.clicked) —
-- por agora só a tabela e o registo do id, sem RLS pública porque só o
-- backend (service role) lhe mexe.
-- ============================================================================

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_type text not null,
  resend_id text not null,
  to_email text not null,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_sends_resend_id_idx on public.email_sends (resend_id);
create index if not exists email_sends_user_id_idx on public.email_sends (user_id);

alter table public.email_sends enable row level security;
