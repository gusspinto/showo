-- O Diário na sidebar deixa de abrir sempre o canvas de um projeto
-- qualquer (o primeiro em foco) e passa a ter um seletor, como o Coach IA:
-- "Geral" (sem projeto) ou um projeto específico. Para isso, project_id
-- tem de poder ficar a null (entradas gerais, não ligadas a nenhum
-- projeto). A RLS já é só "auth.uid() = user_id", não depende de
-- project_id, por isso não precisa de mudar.
ALTER TABLE public.diary_canvas_items ALTER COLUMN project_id DROP NOT NULL;
