-- ============================================================================
-- 092_library_entries.sql — Biblioteca: itens "adicionados" deixam de gerar a
-- ficha completa de projeto (objetivo/problema/solução/etc). Passam a viver
-- na mesma tabela projects, marcados com entry_kind='library', com só o
-- essencial: nome, descrição breve e o próprio ficheiro. "Criar do 0"
-- continua a gerar a ficha completa (entry_kind='full', o comportamento de
-- sempre — coluna nova com esse default cobre todas as linhas existentes).
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS entry_kind TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS library_description TEXT,
  ADD COLUMN IF NOT EXISTS library_file_url TEXT,
  ADD COLUMN IF NOT EXISTS library_file_name TEXT,
  ADD COLUMN IF NOT EXISTS library_file_type TEXT;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_entry_kind_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_entry_kind_check CHECK (entry_kind IN ('full', 'library'));

CREATE INDEX IF NOT EXISTS idx_projects_entry_kind ON public.projects (user_id, entry_kind);

-- Storage bucket para os ficheiros da Biblioteca — relatórios, apresentações,
-- imagens do que o aluno já tem feito. Público (como 'covers'), porque o
-- objetivo é mostrar isto no perfil/portefólio, não guardar em privado.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'library-files', 'library-files', true, 15728640, -- 15 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/markdown',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 15728640, public = true;

CREATE POLICY "Library file upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'library-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Library file update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Library file delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Library file public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'library-files');
