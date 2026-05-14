-- Project collaborators: allows group PAPs to share a project
-- Each collaborator can be assigned specific sections to present

CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES public.profiles(id),
  sections    TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborator and project owner can read
CREATE POLICY "View if owner or collaborator"
  ON public.project_collaborators FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()::text
    )
  );

-- Only project owner can insert / update / delete
CREATE POLICY "Owner manages collaborators"
  ON public.project_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()::text
    )
  );
