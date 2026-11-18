-- Falha real encontrada e confirmada por teste (18/11): a política
-- "Collaborator respond to invite" em project_collaborators só verificava
-- user_id = auth.uid(), sem impedir mudar project_id para OUTRO projeto.
-- Qualquer utilizador conseguia convidar-se a si próprio para um projeto
-- seu, e depois reapontar a própria linha para o id de QUALQUER projeto
-- privado de outra pessoa, marcando status='accepted' — e
-- is_project_collaborator() nem sequer verificava o status, aceitava
-- qualquer linha existente. Resultado: leitura de qualquer projeto privado
-- da plataforma, sem interação nenhuma do dono. Reproduzido e confirmado
-- com duas contas de teste reais antes desta correção, e confirmado que
-- deixou de funcionar depois.

-- 1) Trigger: project_id e user_id de uma linha de colaborador nunca podem
-- mudar depois de criada. Nenhum fluxo legítimo precisa disto — só o
-- status muda (Navbar.jsx, aceitar/recusar) e sections (dono,
-- DefenseMode.jsx). Corrige na fonte, independente de qual política RLS
-- deixou passar o UPDATE.
CREATE OR REPLACE FUNCTION public.prevent_collaborator_retarget()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido mudar o projeto ou o utilizador de um convite já existente.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_collaborator_retarget ON public.project_collaborators;
CREATE TRIGGER trg_prevent_collaborator_retarget
  BEFORE UPDATE ON public.project_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_collaborator_retarget();

-- 2) Defesa em profundidade: mesmo que o trigger acima falhe por algum
-- motivo futuro, a função que concede acesso de leitura nunca deve confiar
-- numa linha que não esteja mesmo aceite.
CREATE OR REPLACE FUNCTION public.is_project_collaborator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND status = 'accepted'
  );
$$;
