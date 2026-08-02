-- ============================================================================
-- 062_project_journal.sql
-- ============================================================================
-- "Diário do projeto" — o mecanismo de acompanhamento contínuo da PAP.
--
-- O aluno vai registando, ao longo das semanas, o que fez, o que decidiu, onde
-- ficou preso, o que pesquisou e o que já conseguiu. Cada entrada é curta e
-- tipada (kind), e cada tipo alimenta uma secção diferente do relatório final —
-- por isso a plataforma consegue mostrar honestamente "o relatório já tem
-- matéria para 6 das 9 secções" em vez de pedir tudo de uma vez no fim.
--
--   1. project_journal_entries — as entradas do diário
--   2. projects.report_draft / report_updated_at — o rascunho gerado, guardado
--      para que o aluno o veja evoluir em vez de o regerar do zero
-- ============================================================================

-- ── 1. project_journal_entries ───────────────────────────────────────────
create table if not exists public.project_journal_entries (
  id         uuid        primary key default gen_random_uuid(),
  project_id uuid        not null references public.projects(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  kind       text        not null default 'progresso',
  content    text        not null,
  created_at timestamptz not null default now()
);

alter table public.project_journal_entries
  drop constraint if exists project_journal_entries_kind_check;
alter table public.project_journal_entries
  add constraint project_journal_entries_kind_check
  check (kind in ('progresso','dificuldade','decisao','pesquisa','ideia','resultado','nota'));

alter table public.project_journal_entries
  drop constraint if exists project_journal_entries_content_len;
alter table public.project_journal_entries
  add constraint project_journal_entries_content_len
  check (char_length(content) between 1 and 4000);

create index if not exists project_journal_project_created_idx
  on public.project_journal_entries(project_id, created_at desc);
create index if not exists project_journal_user_created_idx
  on public.project_journal_entries(user_id, created_at desc);

alter table public.project_journal_entries enable row level security;

-- Quem pode escrever no diário de um projeto: o dono ou um colaborador aceite.
-- SECURITY DEFINER para não colidir com as policies das próprias tabelas.
create or replace function public.can_write_project_journal(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = auth.uid()::text
  ) or exists (
    select 1 from public.project_collaborators c
    where c.project_id = p_project_id
      and c.user_id = auth.uid()
      and c.status = 'accepted'
  );
$$;

grant execute on function public.can_write_project_journal(uuid) to authenticated;

-- Leitura: quem escreveu, e quem pode escrever no projeto (dono + equipa).
-- O diário é notas de trabalho — nunca é público, ao contrário da página do
-- projeto.
drop policy if exists "Journal — read own or team" on public.project_journal_entries;
create policy "Journal — read own or team"
  on public.project_journal_entries for select
  using (
    user_id = auth.uid()
    or public.can_write_project_journal(project_id)
  );

drop policy if exists "Journal — insert own" on public.project_journal_entries;
create policy "Journal — insert own"
  on public.project_journal_entries for insert
  with check (
    user_id = auth.uid()
    and public.can_write_project_journal(project_id)
  );

-- Editar/apagar só a própria entrada: o registo de outra pessoa da equipa é
-- testemunho do trabalho dela.
drop policy if exists "Journal — update own" on public.project_journal_entries;
create policy "Journal — update own"
  on public.project_journal_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Journal — delete own" on public.project_journal_entries;
create policy "Journal — delete own"
  on public.project_journal_entries for delete
  using (user_id = auth.uid());

-- ── 2. Rascunho do relatório guardado no projeto ─────────────────────────
alter table public.projects
  add column if not exists report_draft jsonb,
  add column if not exists report_updated_at timestamptz;
