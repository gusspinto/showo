# Análise de uso real: Coach IA, Diário, Mensagens e outras features com input/output de users

Data: 2026-10-23. Analisado diretamente na base de dados de produção (Supabase, `kctdlnqiomxypvesdify`), lendo conteúdo real escrito por users, não só contadores.

## Metodologia

Tabelas lidas: `coach_messages` (Coach IA por projeto), `global_coach_messages` (Coach IA geral, fora de projeto), `project_journal_entries` (Diário), `mensagens` (DMs entre users), `feedback` (widget de feedback in-app), `teacher_feedback`, e `ai_usage` (contadores por feature: createProject, coach, analyzeProject, defense, interviewProject, diaryReport). Para cada tabela: contei volume, users distintos, e li amostras reais de conteúdo (não só agregados) para avaliar qualidade e intenção real de uso.

**O achado mais importante atravessa todas as features e vem antes de qualquer detalhe por tópico:** em nenhuma das features analisadas há uso recorrente. Ver secção final "O padrão que atravessa tudo" antes das ações por tópico, porque muda a prioridade de tudo o resto.

---

## 1. Coach IA por projeto (`coach_messages`)

**Números:** 662 mensagens, 89 sessões, 82 users distintos desde 16/09. 95% dos users (78 de 82) só abriram **uma sessão, uma única vez, desde sempre**. Só 4 users voltaram (3 com 2 sessões, 1 com 5).

**Qualidade do que é escrito:** é real. Users colam conteúdo genuíno e extenso do próprio projeto de PAP: um guia de turismo completo (74 mil caracteres colados de uma vez), descrições técnicas de redes informáticas, ótica ocular, logística de armazém, gastronomia maltesa. Isto não é teste nem lixo, são alunos a trabalhar a sério no próprio trabalho escolar.

**Como o Coach lida com pedidos de atalho:** testei isto especificamente porque é o risco óbvio de um "coach" de IA em contexto escolar. Encontrei 3 casos de pedidos deliberadamente fora de âmbito ("Podes fazer o projeto", "faz ai alguns jogos divertidos", "Tudo"). Em nenhum caso o Coach escreveu o trabalho pelo aluno: pediu especificidade ("Quando dizes 'fazer o projeto', referes-te a quê exatamente?"), redirecionou com humor para o âmbito certo, ou fez perguntas concretas de volta em vez de inventar conteúdo. Isto é um sinal de qualidade forte, não corrigir.

**O que a maioria faz:** a esmagadora maioria das sessões de 1 mensagem só não são "um user a desistir", são **botões de prompt sugerido** ("O que está mais fraco no meu projeto?", "Tenho os campos X vazios. Ajuda-me a preencher."): a pessoa clica, recebe a resposta, e não continua a conversa. Isto é ambíguo: pode ser "resolveu o problema em 1 resposta" (bom) ou "não percebeu que podia continuar a conversa" (mau). Não dá para distinguir só com os dados, mas o padrão de 1-sessão-só-uma-vez-na-vida sugere mais a segunda hipótese.

### Ações
- **Não mexer no comportamento do modelo.** A forma como recusa escrever o trabalho pelo aluno está a funcionar bem, é um ativo, não um problema.
- **O problema é retenção, não qualidade.** Depois da primeira resposta a um prompt sugerido, mostrar explicitamente 2-3 sugestões de continuação específicas ao que acabou de responder (não genéricas), para converter "recebi 1 resposta" em "continuei a conversa".
- **Trazer o Coach de volta à superfície depois da primeira visita.** Como ninguém volta sozinho, isto tem de ser empurrado: notificação/email quando um campo do projeto continua vazio X dias depois da primeira sessão do Coach ("ainda tens 2 campos por preencher, queres continuar onde ficámos?").

---

## 2. Coach IA geral (`global_coach_messages`, fora de projeto)

**Números:** 350 mensagens, 27 users, desde 18/10 (feature mais recente). **27 de 27 users (100%) só usaram uma vez.** Zero retorno, sem exceção.

**Qualidade do que é escrito:** também real e substancial. É usado principalmente para **ideação de tema de PAP** antes de sequer existir um projeto: "não tenho nada em mente, só não quero nada com hoteis", "escolhe tema", "prefiro um tema diferente tens algo a sugerir". Cobre áreas muito diferentes: proteção civil (túnel do Marão), apps para pessoas com deficiência visual (óculos inteligentes), doações para instituições, bases de dados, séries e filmes. Um user colou uma explicação de projeto com 22 mil caracteres para pedir ajuda a melhorar.

**Sinal a vigiar, não ignorar:** "faz me app top para ter 20 na pap": um pedido explícito de otimizar para nota, não para aprender. Não é grave isoladamente, mas é o tipo de frase que mostra que pelo menos uma parte dos users vê isto como "a IA que me dá a nota", não "a IA que me ajuda a pensar". Vale a pena rever a resposta do Coach a este tipo de pedido especificamente (não tive acesso à resposta deste caso em concreto).

### Ações
- **Mesmo problema do Coach por projeto, ainda mais extremo (100% vs 95% de uso único).** Esta feature claramente ajuda na fase de ideação, mas depois o user desaparece, provavelmente porque cria o projeto a partir da ideia e passa a usar o Coach *do projeto*, não o geral. Confirmar isto com um cruzamento (user usou o Coach geral e depois criou projeto na mesma sessão/dia?) antes de assumir.
- **Se confirmado:** o Coach geral está a fazer o trabalho dele (ajudar a nascer a ideia) e não precisa de "reter" ninguém, a transição para o Coach do projeto É o sucesso. Isso muda a prioridade: não é um problema a resolver, é preciso só medir corretamente para não tratar como falha algo que é handoff.

---

## 3. Diário (`project_journal_entries`): o achado mais grave do relatório

**Números:** 263 entradas, 91 users. Mas **251 dessas 263 (95%) são `kind: 'auto'`**, texto gerado automaticamente pelo sistema ("Secção preenchida: os desafios encontrados.", "Capa do projeto adicionada."), não escrito pela pessoa. **Entradas genuinamente escritas por um user: só 12, no total, desde sempre, em toda a plataforma.** E dessas 12, nenhum user escreveu em mais de um dia diferente (um escreveu 3 vezes mas tudo no mesmo dia).

**Qualidade do que existe (as 12 reais):** quando alguém escreve mesmo, a qualidade varia muito. Há um exemplo excelente, pessoal e desenvolvido (projeto "Maria sem Migalhas", sobre intolerâncias alimentares, ligado a uma experiência pessoal real da própria pessoa). Mas também há entradas de muito baixo esforço ("Ilha preciso de ajuda", "ja comecei a conctar gente para me ajudar no projeto", "stock esgotado em 2 semanas").

**Isto quer dizer:** o Diário, como feature de reflexão pessoal ao longo do tempo (o que o nome e o posicionamento do produto prometem), **não existe na prática**. O que existe é um log automático de atividade disfarçado de diário. Ninguém está a usar isto como hábito de escrita.

### Ações (prioridade alta, é o gap mais claro de todos)
- **Decisão a tomar primeiro:** o Diário continua a ser vendido/pensado como "escreve sobre o teu progresso" (e precisa de ser radicalmente mais exposto e lembrado), ou aceita-se que a forma real como as pessoas documentam progresso é através da própria ação (preencher secções) e o log automático passa a ser o produto principal, com a escrita manual como extra opcional? Isto é uma decisão de produto, não só de UI.
- Se a resposta for "continua a ser diário de reflexão": precisa de um prompt ativo e recorrente (ex: depois de uma sessão de trabalho no editor, perguntar "o que foi difícil hoje?" antes da pessoa sair), porque hoje a feature está invisível a ponto de 91 users terem *alguma* entrada (maioritariamente automática) mas só uma dúzia terem escrito alguma coisa de propósito.
- Vale a pena perceber porque é que o único exemplo realmente bom (Maria sem Migalhas) aconteceu, o que levou essa pessoa a escrever quando quase mais ninguém o fez, pode informar o prompt certo a mostrar a todos.

---

## 4. Mensagens entre users (`mensagens`)

**Números:** 37 mensagens, 10 users, desde maio. Muito baixo (já confirmado numa análise anterior desta sessão).

**Qualidade do que é escrito:** a esmagadora maioria é ruído sem valor ("oi", "b o n e c o", "burr@", "mekie", "teste"). Há 3 mensagens legítimas e bem escritas da própria equipa (outreach a embaixadoras). E há **um caso de linguagem abusiva dirigida a alguém** ("cala te filho de uma..."), sem conseguir ver o contexto da conversa completa.

### Ações
- Já reportado nesta sessão que esta feature não justifica investimento (email de notificação, etc.) dado o volume quase nulo, mantém-se essa conclusão.
- O caso de abuso é baixo volume mas vale a pena ver o fio da conversa completo (quem disse a quem, contexto) só para confirmar que não é preciso nenhuma ação de moderação. Não investiguei o conteúdo completo da thread por não ser o foco pedido.

---

## 5. Feedback in-app (`feedback`)

**Números:** só 7 entradas desde sempre, 3 users.

**Qualidade:** 4 são lixo/teste ("Ok", "teste", "test" x2). Uma é uma queixa real mas vaga: "tive um problema com o gustavo" (08/08). A mais recente (22/10) é claramente um **erro de UI**: a pessoa colou uma proposta de PAP inteiríssima (cabeleireiro, "Wash & Relax", com orçamento e metodologia) na caixa de feedback do site, não no Coach. Isto sugere confusão entre "onde reporto um bug" e "onde peço ajuda com o projeto": os dois campos de texto devem parecer-se demasiado ou estar próximos na UI.

### Ações
- Investigar e corrigir a confusão de UI entre a caixa de feedback e o Coach (user colou conteúdo de projeto no sítio errado), risco baixo mas é um sinal real de confusão de interface.
- A queixa "tive um problema com o gustavo" merece ser revisitada diretamente (quem é, que problema), não dá para avaliar só com este texto.

---

## 6. Outras features de IA sem conteúdo gravado (análise de projeto, defesa, entrevista)

Estas não guardam o texto gerado (é efémero, só existe no ecrã na hora), por isso só dá para avaliar pelo volume de uso (`ai_usage`), não pela qualidade do conteúdo:

- `analyzeProject`: 39 usos, 39 users (cada um usou 1 vez).
- `defense` (modo defesa): 12 usos, 10 users.
- `interviewProject` (treino de entrevista): 9 usos, 9 users.
- `diaryReport`: 1 uso, 1 user.

Comparar com `createProject` (criação de projeto com IA): 1559 usos, 808 users: isto é, de longe, a feature de IA mais usada da plataforma, por uma margem enorme.

### Ações
- `defense` e `interviewProject` têm uso tão baixo que vale a pena perceber se é um problema de descoberta (ninguém sabe que existe) ou de momento certo (só faz sentido perto da data de defesa/entrevista, e a maioria dos users ainda não chegou lá). A segunda hipótese é provável dado o calendário letivo, não assumir já que é falha de exposição sem verificar quantos users têm `defense_date` próxima.
- Vale a pena guardar pelo menos um resumo/score do output destas 3 features (não o texto completo todo, por custo e privacidade, mas algo mínimo) para no futuro conseguir avaliar qualidade e não só volume.

---

## O padrão que atravessa tudo (ler isto antes de agir em qualquer secção acima)

Em **todas** as features com interação real (Coach por projeto, Coach geral, Diário manual), a esmagadora maioria dos users usa a feature **exatamente uma vez na vida e nunca mais volta**. Coach por projeto: 95% uma vez só. Coach geral: 100% uma vez só. Diário manual: 100% um dia só.

Isto não é um problema de "a IA não é boa": o conteúdo que a IA produz e a forma como lida com pedidos fora de âmbito mostraram-se sólidos nas amostras que li. É um problema de **a plataforma não trazer ninguém de volta à feature depois do primeiro contacto**. Ou seja, a pergunta "como fazer o user habituar-se e depender da plataforma" não se resolve melhorando a IA, resolve-se com gatilhos ativos que tragam a pessoa de volta (notificações, emails, lembretes dentro do próprio editor) depois da primeira visita, exatamente a direção em que já estás a investir com o funil de emails (onboarding + ciclo contínuo), só que esse funil hoje fala de features e desconto, não especificamente de "voltar a uma conversa que começaste e não acabaste".

### A ação com mais alavancagem de todo este relatório
Email/notificação disparado X dias depois de uma primeira sessão de Coach (projeto ou geral) sem retorno, referenciando especificamente o que a pessoa perguntou ("ainda estás a pensar no tema do projeto? da última vez falámos sobre X") em vez de uma mensagem genérica. Isto ataca diretamente o número mais consistente e mais grave deste relatório: 95-100% de abandono depois da primeira visita, em todas as features de IA com conversa.
