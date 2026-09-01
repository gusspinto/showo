-- ============================================================================
-- 108_library_pdf_url.sql — Word/PowerPoint abrem dentro da app.
--
-- O browser não renderiza Office; a função edge `office-thumbnail` já
-- converte Word/PPT → PDF (Gotenberg) para gerar a miniatura, mas deitava
-- o PDF fora. Passa a guardá-lo aqui e o visualizador (PdfViewer) mostra
-- sempre esse PDF — para Word, PPT e PDF é o mesmo caminho.
--
-- Guarda um path dentro do bucket 'library-files' (privado desde o 097).
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS library_pdf_url text;

GRANT SELECT (library_pdf_url) ON public.projects TO anon;
GRANT SELECT (library_pdf_url) ON public.projects TO authenticated;

-- O PDF de um item que está no perfil tem de ser assinável por qualquer
-- visitante — mesma lógica do 104, agora a incluir o path do PDF.
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
        AND objects.name IN (p.library_file_url, p.library_thumb_url, p.library_pdf_url)
    )
  );
