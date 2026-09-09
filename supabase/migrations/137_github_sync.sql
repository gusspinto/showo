-- ============================================================================
-- 137_github_sync.sql — Integração GitHub
-- ----------------------------------------------------------------------------
-- O `github_url` já existia, mas era só um link: 1 projeto em 38 o tinha
-- preenchido, e mesmo esse não trazia nada para dentro da app. Um link não
-- prova trabalho nenhum.
--
-- O diário é o "GPS" da Showo, e continua a exigir que se escreva à mão.
-- Para quem programa, o histórico do trabalho já existe e está datado: são
-- os commits. Esta migração prepara o terreno para os ler do repositório
-- público e os deixar cair no diário sozinhos, com os números do repo
-- (linguagens, primeiro e último commit) guardados no projeto.
--
-- Só repositórios PÚBLICOS, via API pública do GitHub. Sem OAuth, sem
-- tokens do aluno, sem acesso a código privado — a app nunca vê mais do que
-- qualquer pessoa vê ao abrir o repositório no browser.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_stats     jsonb,
  ADD COLUMN IF NOT EXISTS github_synced_at timestamptz;

-- Visitantes sem sessão fazem `.select('*')` na página de projeto, e o
-- Postgres exige grant em TODAS as colunas para um wildcard — sem isto,
-- adicionar colunas parte a página para quem não tem conta (foi exatamente
-- o bug da migração 089).
GRANT SELECT (github_stats, github_synced_at) ON public.projects TO anon;

-- ── Entradas de diário com origem externa ──
-- Sincronizar duas vezes não pode duplicar o histórico. O `external_id`
-- identifica a origem exata da entrada (ex: 'gh:owner/repo:2026-03-14') e o
-- índice único garante que a segunda sincronização não escreve nada de novo.
ALTER TABLE public.project_journal_entries
  ADD COLUMN IF NOT EXISTS external_id text;

-- Sem WHERE de propósito: um índice parcial não serve como alvo de ON
-- CONFLICT através do PostgREST (não há forma de lhe passar o predicado, e
-- o upsert rebenta com "no unique or exclusion constraint matching"). Sem o
-- predicado o efeito é o mesmo — no Postgres cada NULL é distinto, por isso
-- as entradas escritas à mão (external_id NULL) não colidem entre si.
CREATE UNIQUE INDEX IF NOT EXISTS project_journal_entries_external_idx
  ON public.project_journal_entries (project_id, external_id);

-- Estas entradas são geradas pelo sistema, tal como as de 135: vão com
-- kind='auto' para nunca se fazerem passar por reflexão escrita pelo aluno
-- quando o generate-report transforma o diário em prosa na primeira pessoa.
