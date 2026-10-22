-- Aviso de ativacao pos-criacao: quando alguem cria um projeto e fica com
-- menos de 3 seccoes (preview_blocks), manda-se UM email 24-48h depois a
-- empurrar para completar. Precisa de guardar quando o aviso ja foi
-- mandado, por projeto (nao por conta, um user pode ter varios projetos
-- incompletos ao mesmo tempo), para nunca repetir o mesmo aviso.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS activation_nudge_sent_at timestamptz;
