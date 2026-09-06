# 5 features da reunião com o Hugo (EPBJC #2, 3 set 2026)

Especificação para implementar. Cada uma diz **o que já existe**, **o que falta**,
**schema** e **decisões a fechar**. Contexto original:
[gravação](https://fathom.video/share/HM2qVqXsHW534qQuhvwvwi3HQTbDLS56).

Ordem sugerida por valor/esforço para o piloto:
**2 → 5 → 3 → 4 → 1** (a 2 já está quase feita; a 1 é a maior).

---

## 1. Módulo de Estágios

### Já existe
Sistema de vagas completo em [Vagas.jsx](../src/pages/Vagas.jsx):
- Tabelas `vagas` (titulo, tipo `estagio`/…, area, descricao, requisitos,
  localizacao, is_remote, deadline, `skills[]` requeridas, is_active, recruiter_id)
  e `candidaturas` (aluno → vaga, status `aceite`/`recusada`).
- Recrutador publica/pausa/edita; aluno candidata-se; **match score** = skills do
  aluno ∩ skills da vaga ([Vagas.jsx:27](../src/pages/Vagas.jsx#L27)).
- [Candidatos.jsx](../src/pages/Candidatos.jsx), `saved_candidates`, convites por
  vaga ([ConvidarVagaModal](../src/components/ConvidarVagaModal.jsx)).

### O que a reunião acrescenta
1. **Professor/escola publica estágios** (hoje só recrutador). Estágios locais que
   a escola conhece, para os alunos da turma.
2. **10-15 perguntas de screening** por vaga → o aluno responde antes de
   candidatar → o recrutador vê candidatos já filtrados/pontuados, não fala com
   toda a gente.

### Schema
```sql
ALTER TABLE public.vagas
  ADD COLUMN screening_questions jsonb NOT NULL DEFAULT '[]',  -- [{id, q, type:'text'|'choice', options?, required}]
  ADD COLUMN publisher_role text NOT NULL DEFAULT 'recrutador'; -- 'recrutador' | 'professor'

ALTER TABLE public.candidaturas
  ADD COLUMN screening_answers jsonb NOT NULL DEFAULT '[]',      -- [{id, answer}]
  ADD COLUMN screening_score int;                                -- 0-100, calculado
```
RLS: permitir `INSERT`/`UPDATE` em `vagas` a `role = 'professor'` para vagas da
sua escola; alunos só veem vagas da própria escola quando `publisher_role='professor'`.

### Fluxo
- Publicar: modal ganha secção "Perguntas de triagem" (add/remove, tipo, obrigatória).
- Candidatar-se: se a vaga tem perguntas, abre formulário → só depois cria a
  `candidatura`.
- Recrutador: no cartão da candidatura, expandir mostra respostas + um
  `screening_score` (IA lê respostas + perguntas + projetos do aluno e dá um 0-100
  com 1 frase de razão — função nova `score-candidate`, haiku).
- Match: passar a usar as **tecnologias demonstradas** (`tech_stack` agregado dos
  projetos, ver feature 2) além das `profile.skills` declaradas.

### Decisões a fechar
- **Vagas está fora da nav** (decisão de reestruturação de julho). Reconciliar:
  o módulo de estágios volta à nav só para escolas/turmas? Ou vive dentro da
  página da turma?
- Screening: perguntas livres por vaga, ou um banco de perguntas por área que o
  recrutador escolhe?
- O professor vê as candidaturas dos seus alunos?

**Esforço:** alto (2-3 sessões).

---

## 2. Tags tecnológicas + filtros para recrutadores

### Já existe (feito nesta ronda, à espera da migração 126)
- `projects.tech_stack text[]` (tecnologias confirmadas) + `projects.skills text[]`
  (competências), migração `126_project_skills_and_tech.sql`.
- Edge function `extract-skills` (haiku, **deployed**) — no publish lê o projeto,
  separa tecnologias de competências, grava em `project_skill_suggestions` para o
  aluno confirmar.
- Perfil: sub-secção "Tecnologias" com chips que linkam para `/explorar?tech=`.
- [Explore.jsx](../src/pages/Explore.jsx): `filterTech` + dropdown + `?tech=` no URL.

### O que falta
1. **Aplicar a migração 126** (SQL pronto, ainda por correr em prod).
2. Re-adicionar `tech_stack` ao `.select()` do Explore e `skills, tech_stack` ao
   da Biblioteca (deixei `// TODO após migração 126`).
3. **Filtro do lado do recrutador** — em [Explore.jsx](../src/pages/Explore.jsx)
   (aba Pessoas) e [Candidatos.jsx](../src/pages/Candidatos.jsx), filtrar
   candidatos pelas tecnologias que **demonstraram** nos projetos (união de
   `tech_stack`), não só pelas `profile.skills` que escreveram. Este é o pedido
   específico do Hugo ("essencial para recrutadores").
4. **Lista canónica de tecnologias** (autocomplete) para "React"/"ReactJS"/"react"
   não fragmentarem os filtros. `src/lib/technologies.js` + a IA e o input do
   aluno normalizam contra ela.
5. Chips de `tech_stack` nos cartões de projeto do Explore.

### Decisões a fechar
- Lista canónica: fixa nossa, ou deixa criar novas e só sugere as conhecidas?

**Esforço:** baixo-médio — 70% já está.

---

## 3. Auto-posts no LinkedIn (e a questão do GitHub)

### Já existe
`send-weekly-recap` (migração 085) — gera o recap semanal (o que avançou, o que
ficou parado) e envia por email às segundas.

### Plano — LinkedIn
- A partir do mesmo recap, gerar um **rascunho de post** em 1ª pessoa ("Esta
  semana no [projeto] avancei em X, resolvi Y…"), com o link da página Showo do
  projeto no fim (marketing grátis para nós).
- **Fase 1 (rápida, sem API):** o rascunho aparece na dashboard / no email →
  botão "Copiar" + "Abrir LinkedIn" (`https://www.linkedin.com/feed/?shareActive=true`
  ou o share URL com texto). O aluno cola e publica. Zero OAuth.
- **Fase 2 (opcional):** LinkedIn API (`w_member_social`), OAuth, publicar direto.
  Só se a fase 1 mostrar tração.
- `profiles.linkedin_autopost_opt_in boolean`, guardar o último rascunho gerado
  em `weekly_recaps` (ou tabela nova), cadência colada ao recap.

### A minha opinião sobre o GitHub
**Não faz sentido "auto-posts" para o GitHub.** O GitHub não é um feed social —
não há audiência para "atualizações de progresso" em texto, e o grafo de commits
já mostra consistência. Postar texto lá é ruído.

**O que faz sentido no GitHub** (é outra feature, a "Integração GitHub" da
reunião, e vale mais para quem programa): **exportar o projeto → criar um repo**.
A partir dos campos do projeto + `tech_stack`, criar um repositório com:
- README gerado (problema, solução, tecnologias, resultados)
- `tech_stack` como *topics*
- link de volta para a página Showo
Isto transforma o projeto Showo num artefacto de portefólio que os devs/recrutadores
técnicos esperam ver. Guardar `projects.github_url` (já existe o campo).

**Resumo:** LinkedIn auto-post → sim. GitHub → fazer "criar repo a partir do
projeto", não "auto-posts".

**Esforço:** LinkedIn fase 1 baixo; GitHub repo alto (OAuth + API).

---

## 4. Gamificação — caixas de recompensa

### Já existe
XP (`profiles.total_xp`, migração 033), missões ([Missoes.jsx](../src/pages/Missoes.jsx)).
Memória interna: a equipa quer gamificação **para lá das missões**, para retenção
diária.

### Conceito
Ganhas uma **caixa** por ações que queremos incentivar:
- registo no diário em dias seguidos (streak)
- publicar um projeto
- confirmar as competências que a IA sugeriu
- atingir um marco de score
- concluir uma missão

Abrir a caixa dá uma recompensa aleatória de um conjunto:
- **cosmético de perfil** (desbloqueia uma cor de accent, uma tipografia, um
  padrão de banner) → liga-se diretamente ao ProfileCustomizer, dá razão para
  voltar a mexer no perfil
- boost de XP
- um crédito único de IA (uma "análise de projeto" ou "defesa" grátis)
- um "congelador de streak" (não perde a sequência se falhar um dia)
- um badge

### Schema
```sql
CREATE TABLE public.reward_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  earned_from text NOT NULL,          -- 'diary_streak' | 'publish' | 'mission' | …
  earned_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  reward jsonb                         -- {type:'accent', value:'#...'} etc, null até abrir
);
CREATE TABLE public.profile_unlocks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,                  -- 'accent' | 'font' | 'banner_pattern' | 'badge'
  value text NOT NULL,
  PRIMARY KEY (user_id, kind, value)
);
```
Sorteio e pool de recompensas em código (`src/lib/rewards.js`), não na BD.
O ProfileCustomizer passa a filtrar as opções por `profile_unlocks`.

### Opinião / cuidados
- **Nunca vender caixas nem sorteios pagos.** Showo é para estudantes, alguns
  menores. 100% ganho pelo trabalho. Na UI chamar "recompensa", não "loot box".
- A memória do *vibecoded-audit* diz para tirar gradientes/emojis/sparkles — o
  instinto numa caixa é exatamente isso. Manter contido e on-brand (uma animação
  de abrir sóbria, sem confetti).
- As melhores recompensas são os **cosméticos do perfil** — personalização real,
  não só números que não significam nada.
- Os gatilhos de ganho colam-se aos comportamentos que já são o valor do produto
  (diário consistente, publicar, rever sugestões).

**Esforço:** médio (schema + sorteio + UI de abrir + integração no ProfileCustomizer).

---

## 5. Timeline pública do projeto

### Já existe
- `project_journal_entries` (diário, privado) com `kind`, `created_at`.
- `project_score_history` (migração 048) — evolução do score ao longo do tempo.
- [TurmaAluno.jsx](../src/pages/TurmaAluno.jsx) já calcula "dias ativos", "último
  registo", distribuição por tipo. `calculateDiaryScore` em
  [score.js](../src/lib/score.js).

### Conceito
Timeline pública **opt-in por projeto**: mostra a evolução do projeto no tempo —
início, marcos escolhidos pelo aluno, progressão do score, data de publicação. O
recrutador vê "trabalhou de janeiro a junho" vs "fez tudo na última semana".

### Schema
```sql
ALTER TABLE public.projects
  ADD COLUMN timeline_public boolean NOT NULL DEFAULT false;

-- Marcos curados (não é o diário em bruto)
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  note text,
  happened_on date NOT NULL,
  source_entry_id uuid REFERENCES public.project_journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
Leitura pública de `project_milestones` quando `projects.timeline_public = true`.

### Fluxo
- No sub-espaço do diário por projeto: botão "marcar como marco" numa entrada,
  ou criar um marco à mão.
- Página pública do projeto (quando opt-in): timeline horizontal — primeira
  entrada → hoje, pontos nos marcos, linha do score (de `project_score_history`).
- Sinal de consistência: badge "23 registos ao longo de 5 meses".

### Decisões a fechar
- Marcos curados pelo aluno (recomendado) vs marcar entradas do diário como
  públicas uma a uma?
- A IA sugere marcos a partir do diário ("isto parece um marco: mudaste de
  abordagem a 12/03")?

**Esforço:** médio — os dados já existem, falta a curadoria e a vista.

---

## Nota transversal

As features 1, 2 e 5 dependem todas do mesmo alicerce: **competências e
tecnologias estruturadas por projeto** (`skills` / `tech_stack`, migração 126).
Aplicar a 126 destrava as três.
