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

### Decisões (fechadas com o Bruno)
- **Vagas volta para o lado escola**, mas visível **só a alunos de 11.º e 12.º ano**.
  Alunos do 10.º para baixo não veem a secção.
- **O ano (10.º/11.º/12.º) passa a ser definido na criação da turma** pelo professor.
- **O aluno que entra pelo código da turma herda esse ano no perfil.**
- **Recrutador e professor** veem a candidatura do aluno.
- **Qualquer aluno** (11.º/12.º) pode candidatar-se a qualquer vaga.
- **O recrutador cria as perguntas** de screening e **filtra ele próprio** quem
  quer chamar, com base nas respostas. (Sem score automático da IA por agora.)

### Schema
```sql
-- Ano da turma (10.º/11.º/12.º) — distinto de academic_year ("2025/2026")
ALTER TABLE public.classes
  ADD COLUMN grade_level text;   -- '10' | '11' | '12' | null

-- Ano do aluno, herdado da turma ao entrar
ALTER TABLE public.profiles
  ADD COLUMN grade_level text;

ALTER TABLE public.vagas
  ADD COLUMN screening_questions jsonb NOT NULL DEFAULT '[]';  -- [{id, q, type:'text'|'choice', options?, required}]

ALTER TABLE public.candidaturas
  ADD COLUMN screening_answers jsonb NOT NULL DEFAULT '[]';    -- [{id, answer}]
```
- `join_class` (RPC, mig 117/118) passa a copiar `classes.grade_level` para
  `profiles.grade_level` ao entrar.
- Gate da secção Estágios/Vagas: `account_type='school'` **e** `grade_level in ('11','12')`.

### Fluxo
- **Criar turma:** o modal ganha um seletor de ano (10.º / 11.º / 12.º).
- **Publicar vaga (recrutador):** modal ganha secção "Perguntas de triagem"
  (add/remove, tipo texto ou escolha, obrigatória).
- **Candidatar-se:** se a vaga tem perguntas, abre formulário → só depois cria a
  `candidatura`.
- **Ver candidaturas:** recrutador **e** professor da turma do aluno veem as
  respostas; o recrutador marca as que quer chamar (status na `candidatura`).
- **Match:** passa a usar as tecnologias demonstradas (`tech_stack` dos projetos,
  feature 2) além das `profile.skills` declaradas.

### Ainda por decidir
- Onde vive a secção: entrada própria na nav (só 11.º/12.º) ou dentro da turma?
- Turmas antigas sem `grade_level` — pedir ao professor para preencher, ou inferir
  de `academic_year`/`school_year`?

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

### Lista canónica (decidido: híbrido)
- `src/lib/technologies.js` — ~150 tecnologias comuns para autocomplete + um mapa
  de aliases (`reactjs`→`React`, `js`→`JavaScript`, `postgres`→`PostgreSQL`…).
- O input do aluno e a `extract-skills` normalizam contra a lista.
- **Entrada livre é permitida** para o que não está na lista (nicho). Se uma
  entrada livre passar a ser usada por muitos projetos, promove-se para a lista.
- Assim os filtros não fragmentam ("Vue"/"Vue.js"/"VueJS" colapsam num só) sem
  prender ninguém a uma lista fechada.

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

### Decisões (fechadas com o Bruno)
- **Marcos curados pelo aluno** — não é o diário em bruto tornado público.
- **A IA sugere marcos** a partir do diário ("isto parece um marco: mudaste de
  abordagem a 12/03; a primeira demo funcional foi a 4/05"). O aluno aceita/edita/
  ignora. Função nova `suggest-milestones` (haiku, lê o diário do projeto).

**Esforço:** médio — os dados já existem, falta a curadoria, a sugestão IA e a vista.

---

## Nota transversal

As features 1, 2 e 5 dependem todas do mesmo alicerce: **competências e
tecnologias estruturadas por projeto** (`skills` / `tech_stack`, migração 126).
Aplicar a 126 destrava as três.
