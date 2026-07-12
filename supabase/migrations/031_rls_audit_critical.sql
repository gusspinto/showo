-- ============================================================================
-- 031_rls_audit_critical.sql — Fixes críticos da auditoria RLS
-- ============================================================================
-- 1. admin_* RPCs deixam de estar expostas a anon (defesa em profundidade)
-- 2. Funções helpers/triggers deixam de ser executáveis via REST
-- 3. recruiter_interests: SELECT restrito; count público via coluna desnormalizada
-- 4. mensagens: trigger impede receiver de alterar content ou campos imutáveis
-- ============================================================================

-- ── 1. admin_* RPCs — revoga anon e PUBLIC ─────────────────────────────────
-- authenticated mantém EXECUTE porque a função valida is_admin() internamente
revoke execute on function public.admin_delete_user(uuid) from anon, public;
revoke execute on function public.admin_get_users()       from anon, public;
revoke execute on function public.admin_set_user_role(uuid, text) from anon, public;

-- ── 2. Helpers e triggers — revoga tudo excepto o que corre como definer ──
-- Estas funções ou são triggers (nunca chamadas via REST) ou helpers internos
revoke execute on function public.is_admin()            from anon, authenticated, public;
revoke execute on function public.is_class_member(uuid) from anon, authenticated, public;
revoke execute on function public.guard_profile_privesc() from anon, authenticated, public;
revoke execute on function public.sync_likes_count()      from anon, authenticated, public;
revoke execute on function public.notify_on_comment()     from anon, authenticated, public;
revoke execute on function public.notify_on_like()        from anon, authenticated, public;
revoke execute on function public.notify_on_candidatura_insert()       from anon, authenticated, public;
revoke execute on function public.notify_on_candidatura_status_change() from anon, authenticated, public;
revoke execute on function public.notify_on_recruiter_interest() from anon, authenticated, public;
revoke execute on function public.notify_on_vaga_invite()        from anon, authenticated, public;
revoke execute on function public.set_updated_at()               from anon, authenticated, public;

-- ── 3. recruiter_interests — SELECT restrito + contador desnormalizado ────
-- 3a. Nova coluna com sync trigger (mesmo padrão que likes_count)
alter table public.projects
  add column if not exists interest_count integer not null default 0;   -- count público sem expor identidades

create or replace function public.sync_interest_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.projects set interest_count = interest_count + 1 where id = new.project_id;
  elsif tg_op = 'DELETE' then
    update public.projects set interest_count = greatest(interest_count - 1, 0) where id = old.project_id;
  end if;
  return null;
end $$;
revoke execute on function public.sync_interest_count() from anon, authenticated, public;

drop trigger if exists trg_sync_interest_count on public.recruiter_interests;
create trigger trg_sync_interest_count
  after insert or delete on public.recruiter_interests
  for each row execute function public.sync_interest_count();

update public.projects p
  set interest_count = (select count(*) from public.recruiter_interests r where r.project_id = p.id);  -- backfill

-- 3b. Restringe SELECT: só o recruiter dono da linha ou o aluno dono do projeto
drop policy if exists "Anyone can view interests" on public.recruiter_interests;
create policy "Recruiter or project owner reads interests" on public.recruiter_interests
  for select using (
    auth.uid() = recruiter_id                                   -- recruiter vê os seus interesses
    or exists (
      select 1 from public.projects p
      where p.id = recruiter_interests.project_id
        and p.user_id = auth.uid()::text                         -- aluno vê quem tem interesse no seu projeto
    )
  );

-- ── 4. mensagens — trigger de imutabilidade + impede adulteração pelo receiver
create or replace function public.guard_mensagens_update()
returns trigger language plpgsql security definer as $$
begin
  if new.from_id    is distinct from old.from_id
  or new.to_id      is distinct from old.to_id
  or new.created_at is distinct from old.created_at then
    raise exception 'campos imutaveis: from_id/to_id/created_at';   -- ninguém reescreve o remetente/destinatário
  end if;
  if new.content is distinct from old.content and old.from_id <> auth.uid() then
    raise exception 'so o sender pode editar content';              -- receiver não adultera conteúdo recebido
  end if;
  return new;
end $$;
revoke execute on function public.guard_mensagens_update() from anon, authenticated, public;

drop trigger if exists trg_guard_mensagens_update on public.mensagens;
create trigger trg_guard_mensagens_update
  before update on public.mensagens
  for each row execute function public.guard_mensagens_update();
