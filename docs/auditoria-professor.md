# Auditoria ao lado do professor — 2026-09-09

Revisão de código do que já está construído para o professor. Complementa o
`analise-professor.md` (que é o roadmap); isto é a passagem de QA: bugs,
inconsistências, e opinião honesta sobre o que falta e o que sobra.

Ficheiros revistos: `Dashboard.jsx` (ramo professor), `TurmaPage.jsx` (1907
linhas), `TurmaAluno.jsx`, `Turmas.jsx`, `CreateTurmaModal.jsx`,
`TeacherEmptyState.jsx`, `WeeklyCheckin.jsx`, grelha de avaliação em
`ProjectPage.jsx`, `Navbar.jsx` (sidebar professor), `App.jsx` (rotas/gates).

---

## Veredicto rápido

O núcleo está lá e está pensado: dashboard com roster de alunos, página da turma
com tarefas/critérios/feedback/ranking/check-ins, página por aluno, grelha de
avaliação 0-20 com dois sistemas, export CSV. A avaliação de projeto
(`set_project_teacher_score`) é o código mais sólido de todos — RPC, erros
tratados, notificação com log.

O problema não é falta de features. É que **o caminho de entrada (criar turma /
aluno entrar) é frágil e está espalhado por 4 implementações diferentes**, e há
**buracos nas notificações** que fazem o professor e o aluno perderem eventos.
Para um piloto onde o Hugo vai explorar sozinho, é aí que ele vai tropeçar.

---

## Bugs e gaps, por severidade

### ALTO

**1. O link de convite da turma não serve para entrar.**
`TurmaPage.jsx:1136` dá um botão "Copiar link" → `/turma/CODE`. Mas em
`TurmaPage.jsx:411`, um aluno individual (`role !== 'professor' &&
account_type !== 'school'`) que abre esse link é **redirecionado para
`/dashboard` sem explicação**. E mesmo um aluno de escola que ainda não é membro
vê a página com botões "Sair" e "Adicionar projeto" — não há botão "Entrar na
turma" em lado nenhum desta página. O professor partilha um link que não faz
nada de útil para quem o recebe. Entrar só funciona pelo modal de código
(Dashboard / Turmas / StudentDashboard / Welcome).
*Fix:* ou a página mostra um CTA "Juntar-me a esta turma" para não-membros
autenticados, ou o link abre o modal de código pré-preenchido, ou tira-se o
botão e assume-se só o código.

**2. `class_members` não fica garantido quando o aluno adiciona um projeto.**
`TurmaPage.jsx:663` faz `supabase.from('class_members').upsert(...)` — sem
`await`, sem verificar erro. O comentário em `Turmas.jsx:117` diz textualmente
que "a direct client upsert into class_members isn't reliable here since that
table's INSERT policy was never captured in a tracked migration". Ou seja: um
aluno pode ter projeto na turma mas não constar como membro → não aparece no
roster, não recebe notificações de tarefas. É a mesma operação que o resto do
código evita de propósito, feita aqui à socapa.
*Fix:* usar `join_class` (ou um RPC dedicado) e confirmar a linha, como o modal
de código já faz.

**3. Mudança de estado em lote não notifica os alunos.**
`handleSetReviewStatus` individual (`ProjectPage.jsx:4887`) notifica o aluno
("marcou como precisa de revisão"). Mas `handleBulkStatus`
(`TurmaPage.jsx:716`) chama `set_project_review_status` em loop e **não cria
notificação nenhuma**. O professor seleciona 10 projetos, marca "precisa de
revisão", e os 10 alunos não sabem. O piloto vai usar o lote.
*Fix:* enviar a notificação também no caminho em lote.

**4. Professor não é notificado quando um aluno entra na turma.**
A única notificação `STUDENT_JOINED` está em `TurmaPage.jsx:683`, e dispara
quando o aluno **adiciona um projeto**, não quando entra. A mensagem até diz
"adicionou o projeto X". Se um aluno entra e não cria projeto durante uma
semana, o professor não tem sinal nenhum. "4 alunos entraram na tua turma" era
das notificações mais úteis para o professor e não existe.
*Fix:* `join_class` (server-side) devia criar a notificação ao professor.

### MÉDIO

**5. `TeacherDashboard.jsx` (531 linhas) é código morto.**
Não é importado em lado nenhum — `App.jsx` manda `/dashboard` para
`Dashboard.jsx`, que tem o seu próprio ramo de professor inline
(`Dashboard.jsx:1355+`). O `analise-professor.md` ainda o refere como se fosse a
dashboard viva. Apagar, ou perde-se tempo a editar o ficheiro errado (aconteceu
implicitamente já — as duas versões divergiram).

**6. Quatro implementações do "entrar numa turma".**
`JoinTurmaModal` (`Dashboard.jsx:220`), `JoinModal` (`Turmas.jsx:105`), o modal
em `StudentDashboard.jsx:115`, e `handleJoinClass` em `Welcome.jsx:140`. Todas
chamam `join_class` mas com tratamento de erro e mensagens ligeiramente
diferentes. É por isto que o `join_class` foi reescrito 12+ vezes (migrações
038, 039, 041, 042, 043, 083, 091, 102, 115, 117, 118, 122, 127 — cada uma um
`DROP FUNCTION` completo). Um componente `<JoinClass>` partilhado apagava três
cópias e uma classe inteira de bugs futuros.

**7. Falhas silenciosas na resposta ao check-in.**
`TurmaPage.jsx:1258` faz `.update({ prof_reply })` a `weekly_checkins` e a
seguir `create_notification` — **nenhum dos dois verifica erro**, e a UI mostra
"Resposta enviada." e atualiza otimisticamente à mesma. Se a RLS não deixar o
professor fazer UPDATE na linha do aluno, a resposta perde-se sem ninguém saber.
Confirmar que existe policy para o professor escrever `prof_reply` nos check-ins
dos seus alunos.

**8. Mensagens de erro cruas para o utilizador.**
`TurmaPage.jsx` tem ~10 `showToast('Erro ao ... ' + error.message)`. O professor
vê `permission denied for table class_evaluation_criteria` ou
`operator does not exist: uuid = text`. Mapear para linguagem humana como o
`CreateTurmaModal:51` já faz ("Só contas de professor podem criar turmas").

**9. Stat "Por rever" mede a coisa errada.**
No topo da dashboard (`Dashboard.jsx:1364`) "Por rever" = projetos sem linha em
`teacher_feedback` do professor. Um projeto que o professor já marcou "pronto
para defesa" mas onde não deixou comentário de secção conta como "por rever".
Na aba "A rever" o mesmo número aparece com o label mais honesto "Sem feedback".
Alinhar: ou é "sem feedback teu" em todo o lado, ou "por rever" passa a
considerar também `review_status`.

**10. Notificação de feedback dispara a cada edição.**
`TurmaAluno.jsx:102` e `TurmaPage` (FeedbackModal) enviam `TEACHER_FEEDBACK`
sempre que o professor guarda um comentário, incluindo quando só corrige uma
palavra num comentário existente. O aluno recebe "o teu professor deixou
feedback" várias vezes pelo mesmo comentário.

### BAIXO

**11. `--color-bg-secondary` não existe.**
Usado sem fallback em `TurmaPage.jsx:1251` (input da resposta ao check-in),
`Settings.jsx:829`, `StudentDashboard.css:2707`. Só está definido
`--color-bg-alt` em `tokens.css`. O input da resposta fica sem fundo. (Em
`Login.jsx:345` tem fallback, por isso lá está bem.)

**12. Cores hardcoded em vez de tokens.**
`TurmaPage.jsx:1231` e à volta: `rgba(74,147,249,0.2)`, `rgba(251,191,36,0.18)`.
Vão ficar mal no tema claro. O resto do ficheiro usa `C.blue` / tokens.

**13. Código da turma gerado no cliente sem verificação de colisão.**
`CreateTurmaModal.jsx:44` — `generateCode()` local. 31^6 combos, colisão
improvável no piloto, mas se `classes.code` tiver UNIQUE o insert falha com erro
que parece de RLS e o professor vê "Tenta de novo" (funciona à segunda com
código novo, mas é feio).

**14. `computeCompletude` / `projectCompletude` duplicados.**
`TurmaPage.jsx:744` e `Dashboard.jsx` têm cálculos de completude do projeto
parecidos mas não idênticos (campos e pesos diferentes). O aluno vê uma
percentagem numa página e outra noutra.

**15. Verificar em produção (do `analise-professor.md` §2.2, ainda por
confirmar): migrações 116/117/118.** Sem 116, criar turma dá `permission denied
for table classes`. O `CreateTurmaModal` faz INSERT direto no cliente
(`CreateTurmaModal.jsx:46`), não via RPC, portanto depende 100% dos grants da
116. Correr as queries de introspeção do §2.2 antes do piloto.

---

## O que eu adicionaria

- **Notificação "aluno entrou na turma"** ao professor (ver bug 4). É a de maior
  valor/esforço.
- **Um sítio para o professor ver TODO o feedback que já deu**, por aluno, sem
  abrir projeto a projeto. Hoje o feedback está enterrado dentro de cada
  `InlineFeedback` colapsado no `TurmaAluno`.
- **"Precisa de atenção" mais esperto no roster.** Já existe lógica de
  `stalled`/`slowing` por dias sem atividade (`Dashboard.jsx:1128`), mas só olha
  para `created_at` e `review_status_updated_at` do projeto — não conta registos
  no diário nem check-ins. Um aluno que escreve no diário todos os dias mas não
  "submete" aparece como parado.
- **Filtro por turma na dashboard.** Com 2+ turmas, o roster e os feeds misturam
  tudo. O `showClass` só mostra o nome, não filtra.
- **Exportar as notas para o formato que a escola usa** (pauta). O CSV atual é
  genérico; o Hugo provavelmente quer colar direto no sistema da escola.
- **Estado "avaliado" visível no roster/turma.** Hoje vê-se completude e score
  do sistema, mas não "já dei nota a este / faltam 5".

## O que eu tirava ou simplificava

- **`TeacherDashboard.jsx`** — apagar (bug 5).
- **Consolidar os 4 modais de join** num componente (bug 6). Isto sozinho reduz
  a superfície de bugs do piloto mais do que qualquer feature nova.
- **Ranking da turma** (`show_ranking`, `toggleRanking`) — é opt-in e está
  escondido, mas é mais uma coisa para manter, mais uma migração (067), e
  competição entre alunos numa turma é pedagogicamente discutível. Confirmar com
  o Hugo se alguém usa; se não, remover.
- **Dois sistemas de avaliação** (júri 5x0-4 vs critérios ponderados da turma).
  Ter os dois é confuso — o professor tem de perceber qual está ativo. Escolher
  um por defeito (os critérios da turma, que são configuráveis) e manter o júri
  só como fallback quando a turma não definiu critérios.
- **`PresenterGuide` / guia de telemóvel no DefenseMode** — o `analise-professor.md`
  já diz que o Hugo foi claro que é mau para o júri. Esconder atrás do export
  .pptx.

---

## Ordem sugerida (antes do piloto)

1. Confirmar migrações 116/117/118 em produção (bug 15) — smoke test criar turma
   + entrar.
2. Bug 1 (link de convite) e bug 2 (membership no addProject) — são o caminho de
   entrada e estão partidos.
3. Bug 3 e 4 (notificações de lote e de entrada) — o professor precisa dos
   sinais.
4. Apagar `TeacherDashboard.jsx`; consolidar os modais de join.
5. Bugs 7, 8, 9 (falhas silenciosas, erros crus, stat enganador) — polish de
   confiança.
6. O resto é backlog pós-piloto.
