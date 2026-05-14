-- Add invite status to project_collaborators
ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS status TEXT
    DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined'));

-- Collaborators can update their own invite status (accept/decline)
CREATE POLICY "Collaborator can respond to invite"
  ON public.project_collaborators FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Existing rows were added intentionally, treat them as accepted
UPDATE public.project_collaborators
  SET status = 'accepted'
  WHERE status IS NULL OR status = 'pending';
