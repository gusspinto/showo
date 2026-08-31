-- Restrict direct class_members INSERT to school accounts and professors
-- RPCs (join_class, register_institutional_student) are SECURITY DEFINER
-- so they bypass RLS and still work normally
DROP POLICY IF EXISTS "class_members_insert" ON public.class_members;
CREATE POLICY "class_members_insert" ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'professor'
      OR (SELECT account_type FROM public.profiles WHERE profiles.id = auth.uid()) = 'school'
    )
  );
