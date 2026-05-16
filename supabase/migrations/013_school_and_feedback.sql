-- ============================================================
-- 013 — School mode (turmas) + AI project feedback column
-- ============================================================

-- AI feedback storage on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ai_feedback JSONB;

-- Classes (turmas)
CREATE TABLE IF NOT EXISTS public.classes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  subject       TEXT,
  code          TEXT        UNIQUE NOT NULL,
  teacher_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Projects in a class (many-to-many)
CREATE TABLE IF NOT EXISTS public.class_projects (
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, project_id)
);

ALTER TABLE public.classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_projects ENABLE ROW LEVEL SECURITY;

-- Anyone can view classes and their projects (public showcase)
CREATE POLICY "Public read classes"
  ON public.classes FOR SELECT USING (true);

CREATE POLICY "Public read class_projects"
  ON public.class_projects FOR SELECT USING (true);

-- Authenticated users can create classes
CREATE POLICY "Auth insert class"
  ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teacher can update/delete their own class
CREATE POLICY "Teacher update class"
  ON public.classes FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teacher delete class"
  ON public.classes FOR DELETE
  USING (teacher_id = auth.uid());

-- Project owner can add their project to a class
CREATE POLICY "Owner add project to class"
  ON public.class_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()::text
    )
  );

-- Project owner can remove their project from a class
CREATE POLICY "Owner remove project from class"
  ON public.class_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()::text
    )
  );
