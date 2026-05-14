-- ============================================================
-- 011_admin.sql — Admin role + secure functions
-- ============================================================

-- 1. Add is_admin flag and banned_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin    BOOLEAN           DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email       TEXT;

-- 2. Helper function — returns TRUE if the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

-- 3. Project policies — admin can update & delete ANY project
DROP POLICY IF EXISTS "Admin update projects" ON public.projects;
CREATE POLICY "Admin update projects" ON public.projects
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin delete projects" ON public.projects;
CREATE POLICY "Admin delete projects" ON public.projects
  FOR DELETE USING (
    auth.uid()::text = user_id   -- owner can also delete their own
    OR is_admin()
  );

-- 4. Profile policies — admin can update & delete ANY profile
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
CREATE POLICY "Admin update profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Admin delete profiles" ON public.profiles;
CREATE POLICY "Admin delete profiles" ON public.profiles
  FOR DELETE USING (is_admin());

-- 5. Secure function — admin only — returns rows from auth.users
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id            UUID,
  email         TEXT,
  created_at    TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ,
  last_sign_in  TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.confirmed_at,
      u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- 6. Secure function — admin only — delete a user from auth + cascade
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
