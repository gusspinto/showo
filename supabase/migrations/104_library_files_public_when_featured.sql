-- ============================================================================
-- 104_library_files_public_when_featured.sql
--
-- O 097 tornou o bucket 'library-files' privado (só o dono lê os seus
-- ficheiros via signed URL). Mas um item da Biblioteca marcado
-- "Mostrar no perfil" (profile_featured=true) precisa de ser visível a
-- qualquer visitante do perfil público.
--
-- Em vez de abrir o bucket todo, esta policy deixa QUALQUER um (anon
-- incluído) fazer SELECT sobre um objeto de 'library-files' — e só esse —
-- quando o path corresponde ao ficheiro (ou à thumbnail) de um projeto
-- entry_kind='library' que está profile_featured. Com o SELECT permitido,
-- o cliente do perfil pode chamar createSignedUrl para esses ficheiros.
-- Tudo o resto continua privado.
-- ============================================================================

DROP POLICY IF EXISTS "Library file read when featured" ON storage.objects;

CREATE POLICY "Library file read when featured"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'library-files'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.entry_kind = 'library'
        AND p.profile_featured = true
        AND objects.name IN (p.library_file_url, p.library_thumb_url)
    )
  );
