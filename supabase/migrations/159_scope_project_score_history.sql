-- ============================================================================
-- 159_scope_project_score_history.sql
--
-- "Read own or as professor" em project_score_history deixava QUALQUER
-- professor (profiles.role = 'professor', sem mais nada) ler o histórico
-- de notas de QUALQUER projeto na plataforma — não só das suas próprias
-- turmas. set_project_teacher_score() já usa is_project_in_my_class()
-- para esta mesma verificação; a policy de leitura devia usar a mesma
-- regra, não ficar mais permissiva que a própria escrita.
-- ============================================================================

DROP POLICY IF EXISTS "Read own or as professor" ON public.project_score_history;

CREATE POLICY "Read own or as project's own teacher" ON public.project_score_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_score_history.project_id AND p.user_id = (auth.uid())::text
    )
    OR public.is_project_in_my_class(project_id)
  );
