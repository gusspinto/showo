-- ============================================================================
-- 200_global_coach_messages.sql
-- ============================================================================
-- Histórico do Coach IA "geral" (acessível pela sidebar, fora de um projeto
-- específico). Tabela separada de coach_messages porque essa tem project_id
-- NOT NULL com FK em cascata para projects — misturar os dois ali obrigaria
-- a mexer numa coluna usada em produção. Mesma forma, sem project_id.
-- ============================================================================

create table if not exists global_coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  session_id uuid default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table global_coach_messages enable row level security;

create policy "Users manage own global coach messages"
  on global_coach_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
