-- ============================================================================
-- 149_vaga_screening_questions.sql
-- ----------------------------------------------------------------------------
-- Perguntas de triagem que o recrutador define por vaga; o aluno responde ao
-- candidatar-se. Sem score automático — o recrutador lê as respostas e filtra
-- ele próprio quem quer chamar.
-- ============================================================================

ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS screening_questions jsonb NOT NULL DEFAULT '[]';
  -- [{id, q, type:'text'|'choice', options?, required}]

ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS screening_answers jsonb NOT NULL DEFAULT '[]';
  -- [{id, answer}]

GRANT SELECT (screening_questions), INSERT (screening_questions), UPDATE (screening_questions)
  ON public.vagas TO authenticated;
GRANT SELECT (screening_answers), INSERT (screening_answers), UPDATE (screening_answers)
  ON public.candidaturas TO authenticated;
