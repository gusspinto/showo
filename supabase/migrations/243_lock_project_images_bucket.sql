-- Achado numa revisao de seguranca (2026-11-04): o bucket "project-images"
-- tinha policies "Anyone can upload/update/delete project images" com
-- roles={public}, ou seja, SEM LOGIN NENHUM, qualquer pessoa na internet
-- podia enviar, substituir ou apagar qualquer ficheiro ali, sem limite de
-- tamanho nem tipo (file_size_limit e allowed_mime_types do bucket estavam
-- a null). Isto deixava apagar capas/imagens de projetos de outras pessoas
-- e alojar ficheiros arbitrarios debaixo do dominio do Showo. feedback-
-- images tinha o mesmo problema no insert (sem exigir sessao), so sem
-- policy de delete (por isso menos grave).
--
-- Corrige para o mesmo padrao ja usado em "covers": so authenticated, e so
-- no caminho do proprio projeto (sections/<project_id>/... ou
-- preview/<project_id>/..., ver ProjectPageParts.jsx). feedback-images
-- passa a exigir sessao no insert (sem policy de update/delete, que ja
-- nao existia).

DROP POLICY IF EXISTS "Anyone can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update project images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete project images" ON storage.objects;

CREATE POLICY "Project images write own project"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] IN ('sections', 'preview')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Project images update own project"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] IN ('sections', 'preview')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Project images delete own project"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] IN ('sections', 'preview')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()::text
    )
  );

-- feedback-images fica como estava (insert aberto a public): a própria
-- tabela feedback aceita envios sem login (insert_feedback, roles=public,
-- user_id pode ser null), por isso exigir sessão aqui quebrava o fluxo real
-- de alguém reportar um bug sem conta. O limite de tamanho/tipo do bucket
-- (abaixo) já fecha a parte séria do problema (ficheiro arbitrário sem
-- limite nenhum).

-- Limites a nivel do bucket (nunca existiram para estes dois), mesmos
-- valores ja usados em "covers" (10MB, so imagens).
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id IN ('project-images', 'feedback-images');
