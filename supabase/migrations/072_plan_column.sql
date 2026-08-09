-- Add plan column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'build', 'launch'));

-- plan_updated_at so we can tell when someone last changed plan
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP WITH TIME ZONE;
