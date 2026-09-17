-- ============================================================================
-- 163_enforce_project_visibility_rls.sql
--
-- A policy "Public read projects" (105) deixava passar qualquer projeto
-- entry_kind = 'full' sem olhar à coluna visibility. O próprio comentário da
-- 105 admitia isto: "a visibility privada continua a ser filtrada no
-- cliente". Na prática, qualquer pedido direto à API REST (chave anon, sem
-- passar pela app) conseguia ler o nome, objetivos e tecnologias de
-- QUALQUER projeto marcado como 'private' ou 'unlisted', a proteção era só
-- a app não mostrar, não era a base de dados recusar.
--
-- Aperta a policy para exigir visibility = 'public' (ou NULL, que hoje é
-- tratado como público em todo o resto do sistema, incluindo o Explorar,
-- mudar esse default fica para uma decisão de produto à parte). Preserva os
-- dois caminhos de acesso legítimo que já existiam sem passar por
-- visibility: o professor da turma do projeto (is_project_in_my_class,
-- usado desde a 050) e os colaboradores do projeto (project_collaborators,
-- desde a 007), para não quebrar a partilha de PAPs em grupo nem a
-- avaliação de professores em projetos que o aluno tenha marcado como
-- privado só para a turma.
--
-- A verificação de colaborador precisa de passar por uma função
-- SECURITY DEFINER: a policy de project_collaborators também consulta
-- projects (para saber se quem lê é o dono), e um EXISTS direto entre as
-- duas tabelas cria recursão infinita nas duas policies a chamarem-se uma à
-- outra (confirmado ao testar, erro 42P17). A função corre com privilégio
-- elevado e não re-avalia a RLS de project_collaborators, quebrando o ciclo.
--
-- Testado ao vivo com `set role anon`: também apanhou uma segunda fuga na
-- mesma policy, `profile_featured = true` ultrapassava a visibilidade sem
-- olhar a entry_kind, e havia projetos `full` reais com visibility='private'
-- e profile_featured=true (dados de teste). profile_featured é uma feature
-- só da Biblioteca (confirmado em src/pages/Biblioteca.jsx, onde marcar um
-- item como privado força profile_featured a false, os dois são estados
-- mutuamente exclusivos ali) — nunca deve valer para entry_kind = 'full'.
-- Passa a exigir entry_kind = 'library' também nesse ramo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_project_collaborator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_collaborator(uuid) TO authenticated;

DROP POLICY IF EXISTS "Public read projects" ON public.projects;

CREATE POLICY "Public read projects"
  ON public.projects FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR (entry_kind = 'library' AND profile_featured = true)
    OR (
      entry_kind = 'full'
      AND (
        visibility = 'public'
        OR visibility IS NULL
        OR public.is_project_in_my_class(id)
        OR public.is_project_collaborator(id)
      )
    )
  );
