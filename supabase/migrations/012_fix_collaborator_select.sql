-- Fix SELECT policy on project_collaborators.
-- Previously only the collaborator or the owner could read rows,
-- which meant the public project page sidebar was always empty.

DROP POLICY IF EXISTS "View if owner or collaborator" ON public.project_collaborators;

-- 1. Anyone can see accepted collaborators (project pages are already public)
CREATE POLICY "Public view accepted collaborators"
  ON public.project_collaborators FOR SELECT
  USING (status = 'accepted');

-- 2. Authenticated user can always see their own rows (all statuses)
CREATE POLICY "Own rows always visible"
  ON public.project_collaborators FOR SELECT
  USING (user_id = auth.uid());

-- 3. Project owner can see ALL rows for their project (pending / declined too)
--    Cast both sides to text to avoid uuid vs text type mismatch
CREATE POLICY "Owner view all project collaborators"
  ON public.project_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.user_id::text = auth.uid()::text
    )
  );
