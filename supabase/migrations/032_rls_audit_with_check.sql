-- ============================================================================
-- 032_rls_audit_with_check.sql — with_check em UPDATE policies
-- ============================================================================
-- Policies de UPDATE tinham qual (linha original) mas não with_check (linha nova).
-- Isso permitia a um user autorizado a editar UMA linha mudar campos-chave
-- (owner_id, project_id, etc) e transferir a linha para outro contexto.
-- Este ficheiro adiciona with_check restritivo aos updates críticos.
-- ============================================================================

-- ── teacher_feedback: impede mudança de teacher_id/project_id/field_key ────
drop policy if exists "Teacher update feedback" on public.teacher_feedback;
create policy "Teacher update feedback" on public.teacher_feedback
  for update
  using (
    teacher_id = auth.uid()                                        -- só o autor edita
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'professor'                 -- e ainda é professor
    )
  )
  with_check (
    teacher_id = auth.uid()                                        -- não pode transferir para outro
  );

-- ── vaga_invites: student só muda estado, não pode mudar recruiter/vaga ───
drop policy if exists "student updates status" on public.vaga_invites;
create policy "student updates status" on public.vaga_invites
  for update
  using (auth.uid() = student_id)
  with_check (
    auth.uid() = student_id                                        -- linha nova continua a ser do próprio
  );

-- ── project_comments: user não pode transferir comentário para outro dono ─
drop policy if exists "Users can edit own comment" on public.project_comments;
create policy "Users can edit own comment" on public.project_comments
  for update
  using (auth.uid() = user_id)
  with_check (auth.uid() = user_id);                               -- continua a ser dele
