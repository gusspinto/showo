-- ============================================================
-- 017 — Professor features: teacher_feedback table
-- ============================================================

-- Per-section teacher feedback on projects
CREATE TABLE IF NOT EXISTS public.teacher_feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  teacher_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key  TEXT        NOT NULL DEFAULT 'geral',
  comment    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, teacher_id, field_key)
);

ALTER TABLE public.teacher_feedback ENABLE ROW LEVEL SECURITY;

-- Teacher can manage their own feedback
CREATE POLICY "Teacher insert feedback"
  ON public.teacher_feedback FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teacher update feedback"
  ON public.teacher_feedback FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teacher delete feedback"
  ON public.teacher_feedback FOR DELETE
  USING (teacher_id = auth.uid());

-- Project owner reads feedback on their projects; teacher reads own
CREATE POLICY "Read feedback"
  ON public.teacher_feedback FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()::text
    )
  );

-- Add updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_feedback_updated_at ON public.teacher_feedback;
CREATE TRIGGER teacher_feedback_updated_at
  BEFORE UPDATE ON public.teacher_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
