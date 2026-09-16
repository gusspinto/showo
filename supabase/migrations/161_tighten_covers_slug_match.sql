-- ============================================================================
-- 161_tighten_covers_slug_match.sql
--
-- O "LIKE p.slug || '-%'" da migração anterior tem uma falha de borda: se
-- o slug de um projeto for prefixo do slug de outro (ex.: "abc" e
-- "abc-def"), o dono de "abc-def" passava também no teste de "abc-%".
-- Troca para uma expressão regular que exige exatamente
-- "{slug}-{dígitos}." a seguir — o formato real gerado no upload
-- (`${project.slug}-${Date.now()}.${ext}`) — eliminando a colisão.
-- ============================================================================

DROP POLICY IF EXISTS "Covers write own project" ON storage.objects;
DROP POLICY IF EXISTS "Covers update own project" ON storage.objects;
DROP POLICY IF EXISTS "Covers delete own project" ON storage.objects;

CREATE POLICY "Covers write own project" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text
        AND storage.objects.name ~ ('^' || p.slug || '-[0-9]+\.')
    )
  );

CREATE POLICY "Covers update own project" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text
        AND storage.objects.name ~ ('^' || p.slug || '-[0-9]+\.')
    )
  );

CREATE POLICY "Covers delete own project" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text
        AND storage.objects.name ~ ('^' || p.slug || '-[0-9]+\.')
    )
  );
