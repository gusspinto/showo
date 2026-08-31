-- Make library-files bucket private — files are accessed via signed URLs
UPDATE storage.buckets SET public = false WHERE id = 'library-files';

-- Drop the public read policy
DROP POLICY IF EXISTS "Library file public read" ON storage.objects;

-- Authenticated users can read their own files
CREATE POLICY "Library file read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'library-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
