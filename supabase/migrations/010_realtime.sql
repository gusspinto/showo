-- Enable Supabase Realtime on project_collaborators
-- so invite notifications arrive without page refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;
