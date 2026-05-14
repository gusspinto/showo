-- Fix RLS so collaborators can accept/decline their own invites.
-- The previous FOR ALL owner policy blocked collaborator UPDATEs.

-- Drop and recreate with explicit per-operation policies
DROP POLICY IF EXISTS "Owner manages collaborators"      ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborator can respond to invite" ON public.project_collaborators;

-- Owner: full control (insert, update, delete)
CREATE POLICY "Owner insert collaborators"
  ON public.project_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Owner update collaborators"
  ON public.project_collaborators FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE POLICY "Owner delete collaborators"
  ON public.project_collaborators FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  );

-- Collaborator: can only update their own status (accept/decline)
CREATE POLICY "Collaborator respond to invite"
  ON public.project_collaborators FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
