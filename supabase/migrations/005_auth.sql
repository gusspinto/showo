-- Add user_id to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,
  total_xp    INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old permissive update policy (from migration 002)
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;

-- Projects policies
DROP POLICY IF EXISTS "Public read projects"  ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert"     ON public.projects;
DROP POLICY IF EXISTS "Owner update"          ON public.projects;

CREATE POLICY "Public read projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert" ON public.projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner update" ON public.projects
  FOR UPDATE USING (
    auth.uid()::text = user_id  -- logged-in owner (user_id stored as text)
    OR user_id IS NULL          -- anonymous project (token checked in app)
  );

-- Profiles policies
DROP POLICY IF EXISTS "Own profile" ON public.profiles;

CREATE POLICY "Own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);
