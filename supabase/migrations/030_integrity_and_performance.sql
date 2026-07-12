-- ============================================================================
-- 030_integrity_and_performance.sql — Secções 2 e 3 do plano de hardening
-- ============================================================================
-- Secção 2 — Integridade / concorrência
-- Secção 3 — Performance (índices FK, contador de likes, cleanup de anónimos)
-- ============================================================================

-- ── 2.1 Optimistic locking no Kanban de recrutamento ────────────────────────
alter table public.candidaturas
  add column if not exists updated_at timestamptz default now();     -- deteta escritas concorrentes

drop trigger if exists candidaturas_updated_at on public.candidaturas;
create trigger candidaturas_updated_at
  before update on public.candidaturas
  for each row execute function public.set_updated_at();             -- reutiliza função já existente


-- ── 3.1 Índices para foreign keys (hoje quase tudo faz seq scan) ────────────
create index if not exists idx_projects_user_id         on public.projects(user_id);              -- query mais frequente da app
create index if not exists idx_teacher_feedback_project on public.teacher_feedback(project_id);   -- feedback por projeto
create index if not exists idx_candidaturas_vaga        on public.candidaturas(vaga_id);          -- candidaturas por vaga
create index if not exists idx_candidaturas_student     on public.candidaturas(student_id);       -- candidaturas do aluno
create index if not exists idx_vagas_recruiter          on public.vagas(recruiter_id);            -- vagas do recruiter
create index if not exists idx_vagas_active             on public.vagas(is_active) where is_active = true;  -- listagem pública de vagas
create index if not exists idx_project_likes_project    on public.project_likes(project_id);      -- likes por projeto
create index if not exists idx_mensagens_to             on public.mensagens(to_id, read_at);      -- inbox + não lidas
create index if not exists idx_mensagens_from           on public.mensagens(from_id);             -- mensagens enviadas
create index if not exists idx_class_projects_project   on public.class_projects(project_id);     -- projetos por turma
create index if not exists idx_project_collab_project   on public.project_collaborators(project_id);  -- colaboradores por projeto


-- ── 3.2 Contador de likes desnormalizado ────────────────────────────────────
alter table public.projects
  add column if not exists likes_count integer not null default 0;   -- Explore lê o número, sem count() sobre project_likes

create or replace function public.sync_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.projects set likes_count = likes_count + 1
      where id = new.project_id;                                     -- +1 ao dar like
  elsif tg_op = 'DELETE' then
    update public.projects set likes_count = greatest(likes_count - 1, 0)
      where id = old.project_id;                                     -- -1 ao tirar; nunca abaixo de 0
  end if;
  return null;
end $$;

drop trigger if exists trg_sync_likes_count on public.project_likes;
create trigger trg_sync_likes_count
  after insert or delete on public.project_likes
  for each row execute function public.sync_likes_count();           -- mantém o contador em sync

update public.projects p
  set likes_count = (select count(*) from public.project_likes l where l.project_id = p.id);  -- backfill inicial


-- ── 3.3 Limpeza automática de projetos anónimos órfãos ──────────────────────
-- Já verifiquei: 2 projetos apanhados hoje (30d+ sem likes/comments/colaboradores)
select cron.unschedule('cleanup-anon-projects')
  where exists (select 1 from cron.job where jobname = 'cleanup-anon-projects');

select cron.schedule(
  'cleanup-anon-projects',
  '0 4 * * *',                                                       -- todos os dias às 04:00 UTC
  $$
  delete from public.projects
  where user_id is null
    and created_at < now() - interval '30 days'                      -- só anónimos com +30 dias
    and id not in (select project_id from public.project_likes)           -- sem likes
    and id not in (select project_id from public.project_comments)        -- sem comentários
    and id not in (select project_id from public.project_collaborators);  -- sem colaboradores
  $$
);
