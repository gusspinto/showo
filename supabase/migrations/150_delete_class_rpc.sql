-- ============================================================================
-- 150_delete_class_rpc.sql
-- ----------------------------------------------------------------------------
-- Professor apaga a turma. `classes` já tem RLS DELETE para o dono (migração
-- 013), mas algumas tabelas dependentes (class_members, class_evaluation_
-- criteria, project_criterion_scores) foram criadas fora das migrações
-- rastreadas (aplicadas à mão no dashboard), por isso não há garantia de
-- ON DELETE CASCADE nelas. Esta função apaga explicitamente em cada uma antes
-- de apagar a turma, em vez de confiar em cascades que podem não existir —
-- um DELETE a mais numa tabela sem linhas não faz mal nenhum.
-- weekly_checkins fica de fora de propósito: é por aluno/semana, não por
-- turma, os check-ins do aluno continuam válidos depois de a turma sair.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_class(p_class_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_your_class';
  END IF;

  DELETE FROM public.project_criterion_scores
  WHERE criterion_id IN (SELECT id FROM public.class_evaluation_criteria WHERE class_id = p_class_id);

  DELETE FROM public.class_evaluation_criteria WHERE class_id = p_class_id;

  DELETE FROM public.class_task_completions
  WHERE task_id IN (SELECT id FROM public.class_tasks WHERE class_id = p_class_id);

  DELETE FROM public.class_tasks WHERE class_id = p_class_id;
  DELETE FROM public.class_members WHERE class_id = p_class_id;
  DELETE FROM public.class_projects WHERE class_id = p_class_id;

  DELETE FROM public.classes WHERE id = p_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_class(uuid) TO authenticated;
