# Plataforma do Professor — análise + plano de implementação

Análise do que já existe do lado do professor e organização dos pontos da reunião
com o Hugo, prontos para implementar. Datas convertidas para absolutas (reunião
~início de setembro 2026; piloto a meio de setembro).

---

## 1. O que já existe hoje (estado da plataforma do professor)

| Área | Ficheiro | Estado |
|---|---|---|
| Dashboard do professor | [TeacherDashboard.jsx](../src/pages/TeacherDashboard.jsx) | Turmas, stats (alunos/projetos/score médio/por rever), "precisa de atenção", próximas defesas, correções enviadas, gráfico de submissões por semana, onboarding em 2 passos |
| Lista de turmas | [Turmas.jsx](../src/pages/Turmas.jsx) | — |
| Página da turma | [TurmaPage.jsx](../src/pages/TurmaPage.jsx) (1898 linhas) | Membros, projetos ordenáveis, código + link de convite, feedback por secção, tarefas com conclusão por aluno, critérios de avaliação personalizados, ranking opcional, check-ins semanais com resposta do prof, export CSV, estados de revisão em lote |
| Detalhe por aluno | [TurmaAluno.jsx](../src/pages/TurmaAluno.jsx) | Projetos, notas, diário (registos/dias ativos/tipos), tecnologias, tarefas, link para mensagens |
| Avaliação de projeto | [ProjectPage.jsx:7981](../src/pages/ProjectPage.jsx#L7981) | Grelha de júri (5 critérios 0-4) OU critérios da turma ponderados; nota 0-20; histórico de avaliações; nota escrita; notifica o aluno |
| Feedback do professor | [TurmaPage.jsx:141](../src/pages/TurmaPage.jsx#L141), [TurmaAluno.jsx:76](../src/pages/TurmaAluno.jsx#L76) | Comentários por secção, guardados em `teacher_feedback`, alimentam a IA |
| Notas para PowerPoint | [DefenseMode.jsx:1850](../src/components/DefenseMode.jsx#L1850), [defense-notes/index.ts](../supabase/functions/defense-notes/index.ts) | **Já existe** — exporta .pptx com `slide.addNotes()` por secção + pontos-chave |
| Relatório mensal ao professor | [send-monthly-report/index.ts](../supabase/functions/send-monthly-report/index.ts) | Opt-in nas definições |

### Modelo de dados relevante
`classes`, `class_members`, `class_projects`, `class_tasks`, `class_task_completions`,
`class_evaluation_criteria`, `project_criterion_scores`, `teacher_feedback`,
`project_score_history`, `weekly_checkins`, `projects.technologies` (texto livre),
`projects.tags`, `projects.review_status`, `projects.teacher_score`.

### Fluxo de entrada do aluno
- Registo com código → `register_institutional_student` (valida domínio, promove a `school`)
- Modal "Entrar numa turma" na app → `join_class` (migração 118 passa a promover a `school` também)

---

## 2. IMEDIATO — esta semana

### 2.1 Código de professor ao Hugo
- **Ação (não-código):** confirmar receção e criação de conta. Reenviar via
  [Admin.jsx](../src/pages/Admin.jsx) (gestão de `invite_codes`) se necessário.
- Verificar se o código não foi desativado (migração 036) e se `organization` está
  correta (migração 114) para o Hugo cair na escola certa.

### 2.2 Aplicar migrações 116, 117, 118 em produção

**Verificação feita (2026-09-06):** não é possível confirmar 100% sem acesso SQL a
produção, mas os indícios apontam para **não aplicadas**:
- A tabela `supabase_migrations.schema_migrations` de produção só regista versões
  com timestamp; a **última entrada é `20260902145816`** (2026-09-02 14:58:16).
- 116 foi commitada 14:47, 117 às 14:54 (podiam ter entrado nesse lote), mas
  **118 foi commitada às 15:03 — depois da última migração registada**. As 119-125
  (3+ set) também são posteriores.
- Não há CI que aplique migrações; é manual.
- Os ficheiros numerados (`116_...sql`) não são rastreados individualmente na
  história remota, portanto `supabase migration list` não serve para confirmar.

**Como confirmar em definitivo** (SQL Editor do dashboard):
```sql
-- 116: grants em classes (esperar INSERT/UPDATE/DELETE para authenticated)
select privilege_type from information_schema.role_table_grants
where table_name='classes' and grantee='authenticated';

-- 117/118: corpo atual da função
select pg_get_functiondef(oid) from pg_proc where proname='join_class';
--  contém "account_type = 'school'" (UPDATE)     -> 118 aplicada
--  contém "institutional_account_required"        -> só 117
--  nenhum                                         -> versão antiga (091)
```

- **Bloqueante para o piloto.** Sem elas:
  - 116 → criar turma dá `permission denied for table classes` (faltam grants em
    `show_ranking`, `school_domain_id`).
  - 117 → entrar numa turma dá `operator does not exist: uuid = text`.
  - 118 → modal "Entrar numa turma" exige `account_type = 'school'` mas nunca o
    define; só funciona para quem entrou pelo registo com código.
- **Ação:** `supabase db push` / aplicar as 3 no projeto de produção. Confirmar com
  smoke test: criar turma + entrar com conta de aluno.
- **Nota:** 122 e 124 (`register_institutional_student` uuid cast, `upsert_profile`
  add occupation) também estão no repo — verificar se já estão em produção ou
  entram no mesmo lote.

### 2.3 Fix: XP não atualiza em projetos antigos
- **Onde:** [ProjectPage.jsx:5041](../src/pages/ProjectPage.jsx#L5041) — só regrava
  o score ao **abrir a página do projeto** (`if (s > 0 && data.score !== s)`).
  Projetos antigos que ninguém abriu ficam com o score obsoleto; a dashboard do
  professor ([TeacherDashboard.jsx:287](../src/pages/TeacherDashboard.jsx#L287)) e
  a da turma leem `projects.score` diretamente da BD.
- Além disso `calculateScore` mudou de fórmula ao longo do tempo (diário vale 30pts,
  spam detection, preview blocks) — scores gravados há meses usam regras antigas.
- **Feito (código):** edge function admin-only [recalc-scores/index.ts](../supabase/functions/recalc-scores/index.ts)
  + porta partilhada da fórmula [_shared/score.ts](../supabase/functions/_shared/score.ts).
  Percorre todos os projetos, recalcula com `calculateScore` (mesma lógica do
  cliente) e grava os que estão desatualizados.
- **Como correr** (depois de `supabase functions deploy recalc-scores`), com JWT
  de uma conta admin:
  ```
  # ver o que mudaria, sem gravar
  curl -X POST '<url>/functions/v1/recalc-scores' -H "Authorization: Bearer <jwt>" -d '{"dry_run":true}'
  # aplicar
  curl -X POST '<url>/functions/v1/recalc-scores' -H "Authorization: Bearer <jwt>"
  ```
- Correr uma vez agora, e sempre que a fórmula em `src/lib/score.js` mudar
  (manter `_shared/score.ts` em sincronia).
- Não altera a auto-correção que já existe ao abrir/editar um projeto.

### 2.4 Fix: critérios de avaliação têm de bater 100% — FEITO (código)

Implementado: `addCriterion`/`saveCriterion` em [TurmaPage.jsx](../src/pages/TurmaPage.jsx)
bloqueiam somas > 100%; o botão "+ Critério" pré-preenche o peso restante; o total
mostra "faltam X%". Em [ProjectPage.jsx:7996](../src/pages/ProjectPage.jsx#L7996) o
`canSave` da avaliação exige soma = 100% (com aviso). Notas já guardadas não mudam.

Contexto original:
- **Estado atual:** a soma é apenas informativa. [TurmaPage.jsx:1507](../src/pages/TurmaPage.jsx#L1507)
  mostra `Total: X% (idealmente 100%)` a amarelo, mas deixa gravar. Na avaliação,
  [ProjectPage.jsx:7996](../src/pages/ProjectPage.jsx#L7996) **normaliza** por
  `sumWS / sumW`, portanto pesos 30/30/30 dão nota certa — mas confunde o professor
  e a coluna do CSV mostra "(30%)".
- **Fix mínimo:** ao adicionar/editar critério, validar que o total ≤ 100 e
  bloquear "Guardar" / avaliação enquanto ≠ 100 (`Math.abs(total-100) < 0.1`).
- **Fix melhor:** ao adicionar o 1º critério sugerir peso = restante; botão
  "equilibrar" que distribui igualmente; impedir avaliar um projeto se os
  critérios da turma não somam 100.
- Ficheiros: [TurmaPage.jsx:764](../src/pages/TurmaPage.jsx#L764) (`addCriterion`,
  `saveCriterion`), [ProjectPage.jsx:8006](../src/pages/ProjectPage.jsx#L8006) (`canSave`).

---

## 3. ANTES DO PILOTO — meio de setembro

### 3.1 Presenter Guide → notas no PowerPoint
- **Já implementado** o essencial: [DefenseMode.jsx:1850](../src/components/DefenseMode.jsx#L1850)
  exporta .pptx com notas de orador por slide (Vista do Apresentador) +
  pontos-chave; `defense-notes` gera `slide_notes` a partir do projeto + diário +
  feedback do professor + análise IA.
- **O que falta / verificar para o piloto (PAPs):**
  - O guia "companion no telemóvel" ([PresenterGuide](../src/components/DefenseMode.jsx#L515))
    ainda existe — decidir se se **remove/esconde** ou fica como fallback. O Hugo
    foi claro que telemóvel na mão é mau para o júri.
  - Tornar o export .pptx a ação **primária/óbvia** no DefenseMode (hoje está numa
    tab "guide").
  - Testar o .pptx real: abre bem no PowerPoint desktop? As notas aparecem na
    Vista do Apresentador? Slides não ficam com texto cortado (`content.slice(0,400)`
    em [DefenseMode.jsx:1384](../src/components/DefenseMode.jsx#L1384))?
  - Confirmar que funciona sem plano pago ou ajustar limite (`checkPlanLimit`
    'defense' em [defense-notes/index.ts:25](../supabase/functions/defense-notes/index.ts#L25)).
- **Esforço:** baixo (polish + testes), não é feature nova.

### 3.2 Rever planos / preços
- **Estado:** [Pricing.jsx](../src/pages/Pricing.jsx) — 3 planos (Grátis / Build
  €4,99 / Launch €9,99) todos escritos para **alunos**; professores e contas de
  escola são redirecionados para fora ([Pricing.jsx:132](../src/pages/Pricing.jsx#L132)).
  Limites de IA em [plans.js](../src/lib/plans.js).
- **Pontos do Hugo:**
  1. "Muito AI" — a diferenciação Build vs Launch é toda sobre limites de IA.
  2. Não faz sentido para além de alunos (freelancers, profissionais).
  3. Aluno que paga 2-3 meses e volta a grátis — **o projeto tem de continuar
     visível** (hoje `max_projects` conta só projetos completos, migração 111;
     confirmar que baixar de plano não esconde/bloqueia projetos existentes,
     só impede criar novos).
- **Ação:** redesenhar a matriz de segmentos: aluno individual / aluno via escola
  (grátis, Build incluído — já é o caso, [Pricing.jsx:249](../src/pages/Pricing.jsx#L249))
  / freelancer / profissional. Decidir se há plano/topo separado. **Decisão de
  produto primeiro, código depois** — cruzar com a memória `project-showo-pricing`.
- Garantir downgrade não-destrutivo: teste explícito.

### 3.3 Testar tudo do lado professor (o Hugo vai explorar sozinho)
Checklist de QA a passar antes de meio de setembro:
- [ ] Criar turma (com/sem disciplina, com/sem ano letivo) — precisa da mig. 116
- [ ] Partilhar código + link; aluno entra pelos 2 caminhos — precisa 117/118
- [ ] Aluno adiciona projeto à turma → aparece ao professor + notificação
- [ ] Ver projetos dos alunos, ordenar por completude/score/nome/data
- [ ] Página de detalhe do aluno (diário, tecnologias, tarefas)
- [ ] Deixar feedback por secção → aluno recebe notificação
- [ ] Criar tarefa → alunos notificados → marcar conclusão → professor vê contagem
- [ ] Definir critérios de avaliação (ver 2.4)
- [ ] Avaliar projeto com critérios da turma e sem → nota 0-20 + histórico
- [ ] Estados de revisão em lote ("pronto para defesa" / "precisa de revisão")
- [ ] Export CSV
- [ ] Check-ins semanais + resposta do professor
- [ ] Remover aluno da turma; editar turma; ativar/desativar ranking
- [ ] Relatório mensal por email (opt-in)
- **Ação:** correr esta checklist numa conta de professor limpa + conta(s) de aluno.

---

## 4. PRÓXIMAS SEMANAS — backlog prioritário

Ordenado por valor/esforço para o piloto e para recrutadores.

### 4.1 Tags de tecnologias + filtros (ESSENCIAL — Hugo)
- **Já parcialmente montado:** `projects.technologies` (texto livre) e `projects.tags`
  existem e são carregados no [Explore.jsx:154](../src/pages/Explore.jsx#L154), mas
  **não há filtro por tecnologia** (só área, tipo, zona, disponível —
  [Explore.jsx:242](../src/pages/Explore.jsx#L242)).
- **Trabalho:**
  1. No editor do projeto, campo estruturado de tecnologias (chips com
     autocomplete a partir de lista canónica: JavaScript, C#, Python, React, SQL…)
     em vez de texto livre. Migração para normalizar os existentes.
  2. Filtro "Tecnologia" na exploração (multi-select) + contagem por tech.
  3. Chips clicáveis na página do projeto → exploração filtrada.
- **Esforço:** médio. Alto retorno.

### 4.2 Timeline pública do projeto
- **Base já existe:** `project_journal_entries` (diário) com `created_at`, `kind`.
  A [TurmaAluno.jsx:294](../src/pages/TurmaAluno.jsx#L294) já calcula "dias ativos",
  "último registo", distribuição por tipo.
- **Trabalho:** vista timeline na página pública do projeto (opt-in do aluno):
  "trabalhou de janeiro a junho" vs "tudo na última semana". Recrutador vê
  consistência. Reusar `calculateDiaryScore` como sinal.
- **Esforço:** médio. Sinergia forte com 4.1 e com a proposta de valor "para
  recrutadores".

### 4.3 LinkedIn / GitHub auto-posts a partir do recap semanal
- **Estado:** o Gustavo já andava a fazer isto — **não está neste branch/repo**
  (só existe `cover-letter`; `send-weekly-recap` gera o recap, migração 085).
  Confirmar com o Gustavo onde está e o estado.
- Trello tem 2 cartões: "Auto-posts no Github ou LinkedIn" e "Integração GitHub
  e/ou LinkedIn" — clarificar se são a mesma coisa.
- **Trabalho restante (se aplicável):** botão "Publicar" a partir do recap
  (partilha via URL ou API OAuth). Marketing grátis para o Showo.

### 4.4 Integração GitHub
- **Trabalho:** a partir dos dados do projeto (nome, descrição, tecnologias, README
  gerado por IA), criar repositório via GitHub API + OAuth. Guardar `github_url`
  (campo já existe em `projects`).
- **Esforço:** alto (OAuth + API). Hugo mencionou várias vezes mas "não já".

### 4.5 Módulo de estágios
- **Base parcial:** [Parceiros.jsx](../src/pages/Parceiros.jsx),
  [EmpresaPage.jsx](../src/pages/EmpresaPage.jsx), [Candidatos.jsx](../src/pages/Candidatos.jsx),
  `partner_companies`, `partner_company_invites` (migrações 052-054).
- **Trabalho:** professor/parceiro publica estágio → aluno marca interesse →
  10-15 perguntas de screening → recrutador vê candidatos filtrados.
- **Esforço:** alto. Cruzar com memória `project-individual-vs-school` (separar
  conceitos de escola dos individuais).

### 4.6 Treino de defesa com vídeo/voz
- **Base:** [defense-training/index.ts](../supabase/functions/defense-training/index.ts),
  [DefenseTraining](../src/components/DefenseMode.jsx#L1904) já fazem treino por texto.
- **Trabalho:** videochamada com IA → análise de nervosismo, leitura, contacto
  visual → score. Ambicioso. Precisa de speech-to-text + análise de vídeo.
- **Esforço:** muito alto. Prototipar só com áudio primeiro (ritmo, muletas,
  clareza).

### 4.7 Hosting de projetos (pack premium)
- Servidor para o aluno correr o projeto (BD, API). Ideia do Hugo, não urgente.
- **Esforço:** muito alto (infra + custos). Backlog longo.

### 4.8 Projetos patrocinados/destacados
- Aluno paga para o projeto aparecer em destaque no feed público.
- **Base:** existe `featured` / `featured_order` em `projects` (uso interno do
  aluno). Monetização futura — precisa de slot pago + moderação.
- **Esforço:** médio. Depende de decisão de produto/monetização.

---

## 5. Relação com o Hugo (operacional, não-código)

- **Check-ins:** mensais ou bimensais — aceite. Próximo: **início de outubro 2026**.
- **Canal direto para bugs:** decidir WhatsApp vs email. Recomendação: um canal
  dedicado (WhatsApp/Slack) para triagem rápida + issues no repo para o registo.
  O Hugo quer resposta "na hora" durante o piloto.

---

## 6. Cruzamento com o Trello (board "Tarefas Showo")

Já no board (backlog / rever): Presenter Guide notas PPT, Validar critérios custom
a 100%, Treino de defesa vídeo, Módulo estágios, Integração GitHub/LinkedIn, Tags
tecnológicas + filtros, Auto-posts GitHub/LinkedIn, Hosting premium, templates
melhorados. → coberto pelas secções 3 e 4.

**Não está no board e devia estar (urgente):**
- Aplicar migrações 116/117/118 (+122/124) em produção — secção 2.2
- XP não atualiza em projetos antigos — secção 2.3
- Garantir downgrade de plano não-destrutivo — secção 3.2

**Possivelmente no backlog cortado no screenshot (confirmar):** rever preços/planos,
timeline pública do projeto, projetos patrocinados.

Cartões internos (fora do âmbito professor): sync Google Calendar, vídeos de
sales, Obsidian/Notion, KPI 10.

## 7. Sequência sugerida

1. **Esta semana:** migrações 116/117/118 em produção (2.2) → desbloqueia tudo.
   Código ao Hugo (2.1). Reproduzir + corrigir XP antigo (2.3) e validação 100% (2.4).
2. **Até meio de setembro:** polish do export .pptx + esconder guia de telemóvel
   (3.1). Checklist QA completa do lado professor (3.3). Decisão de preços (3.2) —
   pelo menos garantir downgrade não-destrutivo.
3. **Durante o piloto:** tags de tecnologias + filtro (4.1), depois timeline
   pública (4.2). LinkedIn (4.3) se houver folga.
4. **Pós-piloto:** GitHub (4.4), estágios (4.5), treino com vídeo (4.6).
