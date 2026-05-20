-- TIER 1: available_for_work + defense_date

-- 1. Add available_for_work to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS available_for_work BOOLEAN NOT NULL DEFAULT false;

-- 2. Add defense_date to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS defense_date DATE;

-- 3. Index for filtering available students
CREATE INDEX IF NOT EXISTS idx_profiles_available_for_work
  ON profiles (available_for_work)
  WHERE available_for_work = true;
