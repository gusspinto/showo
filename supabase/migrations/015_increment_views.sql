-- Secure function to increment project views — bypasses RLS
-- so anonymous visitors can increment the counter
CREATE OR REPLACE FUNCTION public.increment_project_views(project_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.projects
  SET views = COALESCE(views, 0) + 1
  WHERE id = project_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_project_views(UUID) TO anon, authenticated;
