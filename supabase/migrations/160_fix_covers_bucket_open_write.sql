-- ============================================================================
-- 160_fix_covers_bucket_open_write.sql
--
-- Achado grave: o bucket "covers" (imagens de capa dos projetos) tinha
-- policies "Anyone can upload/update/delete covers" para o role `public`
-- (inclui anon — qualquer visitante sem sessão) sem NENHUMA restrição de
-- dono. Qualquer pessoa, sem conta nenhuma, conseguia apagar ou substituir
-- a imagem de capa de QUALQUER projeto na plataforma. Havia também
-- policies "authenticated" a fazer a mesma coisa sem scoping de dono —
-- redundantes enquanto as "Anyone" existirem, e mesmo sozinhas não
-- chegavam (qualquer conta autenticada podia mexer na capa de outra
-- pessoa).
--
-- O caminho do ficheiro é "{slug-do-projeto}-{timestamp}.{ext}" (não
-- "{user_id}/...", ao contrário de avatars/library-files/profile-banners),
-- por isso a correção verifica dono via join ao slug do projeto em vez do
-- padrão de pasta usado nos outros buckets.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete covers" ON storage.objects;
DROP POLICY IF EXISTS "Covers upload authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Covers update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Covers delete authenticated" ON storage.objects;
-- Duplicado com "Covers public read" — mantém só uma.
DROP POLICY IF EXISTS "Public covers readable by everyone" ON storage.objects;

CREATE POLICY "Covers write own project" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text AND storage.objects.name LIKE p.slug || '-%'
    )
  );

CREATE POLICY "Covers update own project" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text AND storage.objects.name LIKE p.slug || '-%'
    )
  );

CREATE POLICY "Covers delete own project" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()::text AND storage.objects.name LIKE p.slug || '-%'
    )
  );
