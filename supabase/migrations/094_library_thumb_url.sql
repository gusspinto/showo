-- ============================================================================
-- 094_library_thumb_url.sql — preview real dos PDFs na Biblioteca (à Drive),
-- em vez de só um cartão colorido por tipo de ficheiro. A imagem é gerada no
-- browser (primeira página do PDF, via pdfjs) no momento do upload e sobe
-- para o mesmo bucket 'library-files'; esta coluna só guarda o URL.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS library_thumb_url TEXT;
