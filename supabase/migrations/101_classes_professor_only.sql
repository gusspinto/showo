-- Only professors can create classes (was any authenticated user)
DROP POLICY IF EXISTS "Auth insert class" ON public.classes;
CREATE POLICY "Professor insert class" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'professor'
  );
