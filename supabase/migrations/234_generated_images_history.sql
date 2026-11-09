-- Historico das imagens geradas por IA (pedido do Gustavo). Ate agora a
-- imagem gerada so ficava guardada se a pessoa escolhesse "Usar como capa"
-- (upload feito no frontend, sem registo nenhum); gerar e so descarregar ou
-- copiar perdia a imagem para sempre depois de sair da pagina. Agora o
-- proprio generate-image faz o upload e grava uma linha aqui, sempre, antes
-- de devolver a resposta, independente do que a pessoa decide fazer com ela.
CREATE TABLE IF NOT EXISTS public.generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt text,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_images_user_created_idx ON public.generated_images (user_id, created_at DESC);

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- So a propria pessoa ve o seu historico. So o service role escreve (dentro
-- do generate-image), por isso nao ha policy de insert para authenticated.
CREATE POLICY "generated_images_select_own" ON public.generated_images
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.generated_images TO authenticated;
