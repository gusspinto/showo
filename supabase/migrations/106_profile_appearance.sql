-- ============================================================================
-- 106_profile_appearance.sql — Personalização do perfil-portefólio.
--
-- O perfil público passa a ser um portefólio com um toque do próprio user:
-- cor de destaque, tipografia, tom de fundo, estilo dos cards e uma imagem
-- de topo (banner). Tudo num só jsonb — {} = aspeto padrão.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_appearance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Leitura: o perfil é público (anon + authenticated leem a lista de colunas
-- explícita desde o 065; a coluna nova tem de lá estar).
GRANT SELECT (profile_appearance) ON public.profiles TO anon;
GRANT SELECT (profile_appearance) ON public.profiles TO authenticated;

-- Escrita: o 100 trancou o UPDATE de profiles a uma lista de colunas.
-- profile_appearance é segura de editar pelo próprio (só aparência).
GRANT UPDATE (profile_appearance) ON public.profiles TO authenticated;

-- ── Banner: bucket público (a imagem existe para ser vista no perfil
--    público, tal como 'covers' e 'avatars'). Escrita só na própria pasta.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-banners', 'profile-banners', true, 5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

DROP POLICY IF EXISTS "Profile banner upload own" ON storage.objects;
CREATE POLICY "Profile banner upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Profile banner update own" ON storage.objects;
CREATE POLICY "Profile banner update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Profile banner delete own" ON storage.objects;
CREATE POLICY "Profile banner delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Profile banner public read" ON storage.objects;
CREATE POLICY "Profile banner public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profile-banners');
