-- O diário é o "GPS" da Showo: é dele que saem a timeline, o cartão de
-- progresso, os 30 pontos de score do diário e o material do relatório de
-- PAP. Só que exige escrever à mão — e por isso existe exatamente UMA
-- entrada em toda a base de dados. A app passa a registar sozinha o que a
-- pessoa já faz (completar secções do projeto).
--
-- Estas entradas precisam de um kind próprio, e não de se disfarçarem de
-- 'progresso': o generate-report transforma o diário em prosa NA VOZ DO
-- ALUNO. Uma frase escrita pelo sistema a passar por reflexão do próprio
-- seria desonesta no relatório — com kind='auto' fica sempre distinguível,
-- na interface e para quem lê o diário a seguir.

ALTER TABLE public.project_journal_entries
  DROP CONSTRAINT IF EXISTS project_journal_entries_kind_check;

ALTER TABLE public.project_journal_entries
  ADD CONSTRAINT project_journal_entries_kind_check
  CHECK (kind = ANY (ARRAY[
    'progresso'::text, 'dificuldade'::text, 'decisao'::text,
    'pesquisa'::text, 'ideia'::text, 'resultado'::text, 'nota'::text,
    'auto'::text
  ]));
