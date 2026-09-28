# Análise do StudyFetch (28/09/2026)

Feita com a conta do Bruno, já depois do onboarding inicial. Não vi o registo em si nem os
primeiros ecrãs da conta (a conta já os tinha passado). Foco nos dois temas da reunião de
25/09: porque é que a app prende, e como e quando pedem dinheiro.

## 1. Porque é que prende

**Nunca há um ecrã vazio nem um "e agora?".**
- De um único upload, a IA gerou 5 materiais e um Plano de Estudo com 14 tópicos em
  sequência. A pessoa não fica com "o resultado"; fica com um percurso.
- O percurso tem um marcador "Comece a aprender aqui" e o primeiro passo é minúsculo e com
  tempo: "Veja o que você já sabe, leva 3 minutos". O próximo passo é sempre óbvio e barato.
- Barra de progresso com 0% visível no set, no plano e no painel ("0 Coberto, 0 Dominados").
  Um 0% à vista pede para ser mexido.
- No painel, um cartão "Voltar" leva direto ao set em curso, com a percentagem.

**A mascote fala contigo.** O Sparky aparece no topo do painel com uma frase que muda a
cada visita e aponta para uma funcionalidade concreta ("uma breve sessão de Questionário
pode ser o catalisador..."). É um empurrão pessoal, não um banner.

**Personalização por data.** "Defina a data do seu exame para gerar sessões de estudo
personalizadas". O plano organiza-se em função de um prazo real.

**Pequenos ganchos de retenção:** sequência de dias com classificação, convite para a
comunidade no Discord logo à entrada, anúncios de funcionalidades novas, e estados vazios
que explicam o valor ("Você ainda não praticou nenhum flashcard. Escolha um conjunto...").

**Criação com o mínimo de atrito.** Criar um conjunto pede só o nome (a descrição é
opcional) e tem uma caixa "O que acontece a seguir?" que tira a dúvida antes de a pessoa
carregar.

## 2. Como e quando pedem dinheiro

- **O preço não está escondido dentro da app.** Há um botão "Atualizar" permanente no topo e
  um cartão "Atualizar para Premium" fixo no painel. Só não há página de preços pública.
- **As funcionalidades pagas estão abertas para explorar.** Entrei no "Tutor Me" sem
  bloqueio. Só há um aviso discreto: "Tutor Me is a premium feature".
- **O paywall dispara na ação, não na entrada.** Ao carregar em "Nova Sessão" aparece um aviso
  pequeno com ilustração ("Atualização Necessária!") e só depois de "Continuar" vem o pop-up
  grande de preços. O URL ganha `?payments=true`.
- **O pop-up grande:** estatística de prova social no título ("92% dos assinantes melhoraram
  as notas", "8M+ estudantes"), anual pré-selecionado com o poupado em destaque, mensal ao
  lado, testemunho em carrossel, "Cancele a qualquer momento · Sem pressão · Pagamento
  seguro", link para código de cupão.
- **"Pedir aos meus pais para pagar"** como segundo botão. Para um público de 17-18 anos
  (PAP) isto é relevante: quem usa não é quem paga.
- **Os preços variam.** Vi $8/mês anual e $19 mensal; o screenshot do Gustavo mostrava
  €7,17 e €18. Ou é por moeda/região ou estão a testar preços. Não consigo dizer qual.

O pop-up de upgrade que fizemos no Showo já copia o essencial (pede no momento da ação,
prova social, confiança junto ao botão). A diferença é que o nosso mostra o ganho concreto
na funcionalidade bloqueada e o deles não. Não mexeria nisso agora.

## 3. Comparação com o Showo

O Showo já tem boas peças:
- `Welcome.jsx` manda quem não tem projetos para `/novo` em vez de um painel vazio.
- `/novo` cria o projeto com IA a partir de uma descrição ou de um PDF.
- O `OnboardingAlunoModal` no Dashboard guia perfil, primeiro projeto e partilha.
- A página do projeto tem uma checklist de "Completude" com percentagem.
- O Dashboard tem um bloco "próximo passo" (`NextStepBlock`).

**O buraco:** o `NextStepBlock` (`src/pages/Dashboard.jsx:583`) só aparece quando há
rascunho, novidade do professor, tarefa atrasada, projeto para rever, interesse de empresa
ou zero projetos. Quem já criou um projeto e não tem mais nada pendente **não vê próximo
passo nenhum**. É exatamente o momento de "entrei, achei bom, esqueci-me" que ouvimos nos
áudios. A checklist de completude existe, mas está dentro da página do projeto, recolhível,
e o painel não aponta para ela.

No StudyFetch, esse estado não existe: depois do upload há sempre um "comece aqui" com um
passo de 3 minutos.

## 4. Recomendação: um passo para implementar

**Fazer o `NextStepBlock` nunca ficar vazio enquanto o utilizador não estiver ativado.**

Ativação no Showo = publicar 1 projeto com 3+ secções e partilhar o link. Enquanto isso não
acontecer, o bloco mostra o único passo seguinte em direção a isso, pequeno e com tempo:
- Projeto com menos de 3 secções: "Adiciona a secção X ao teu projeto · leva 3 minutos",
  direto para o campo em falta.
- 3+ secções mas não publicado/partilhado: "Partilha o teu projeto · leva 30 segundos",
  com o link pronto a copiar.

Porquê este e não outro:
- É o buraco exato que o feedback dos áudios aponta.
- Liga-se diretamente à definição de ativação, sem inventar métricas novas.
- Reaproveita o que já existe (o `NextStepBlock` e os dados da checklist de completude), por
  isso é uma alteração pequena.

**O que eu não sei:** quantos utilizadores estão hoje neste estado (1 projeto, não ativado,
nada pendente). Antes de implementar, vale uma query na base de dados para confirmar que é o
grupo grande. Sem o MCP do Supabase nesta sessão, não consigo fazê-la eu.

**Atualização 28/09:** o Gustavo apontou que o buraco maior não é quem cria um projeto e se
esquece, é quem chega pelo vídeo da PAP, pensa "a PAP é só para o ano" e nunca cria nada. Um
comentário em `src/pages/NewProject.jsx:54` diz que 76% dos alunos registados nunca criam
projeto (data da medição desconhecida). Decisão: implementar conforme o maior buraco, depois
de contar as respostas aos áudios por motivo. Ver secção 5, ideia 2.

## 5. Mais ideias, ordenadas

Segunda volta pelo StudyFetch (Conversar, Prática e atividades, Partilhar, Classificação,
Gravar Aula) e verificação no código do Showo do que já existe. Filtro: aproxima da North
Star (projetos validados por professor) ou da ativação (1 projeto com 3+ secções,
partilhado)? Se não, fica de fora.

### Vale a pena

**1. "Pede ao teu professor para validar"** (a nossa versão do "Pedir aos meus pais para
pagar")
- No StudyFetch, quem usa não é quem paga, e há um botão para passar a decisão a quem paga.
  No Showo, quem cria o projeto não é quem o valida.
- Um botão no projeto que manda ao professor do aluno um link para ver e validar o projeto.
- É a única ideia desta lista que mexe diretamente na North Star e na meta dos 10 professores
  validadores até 30/11: cada convite é um professor a entrar pelo aluno. Respeita a regra de
  entrada pelo professor e nunca pelo diretor, e o professor usa grátis.
- Verificado: não encontrei nenhum mecanismo destes no código. A validação hoje passa pelas
  turmas (`review_status`), que o professor cria. Para alunos individuais não há caminho.
- Por verificar antes de desenhar: como um professor sem turma validaria um projeto de um
  aluno que não está numa turma dele. Isto precisa de uma decisão de produto tua.

**2. Data da PAP no onboarding + reativação na altura certa**
- O StudyFetch organiza tudo pela data do exame. Para nós, a data da PAP.
- Hoje a data da defesa só é pedida ao criar um projeto do tipo PAP. Quem pensa "é para o
  ano" e não cria nada sai sem nos dar a data.
- Uma pergunta no `Welcome.jsx` ("Para que vais usar o Showo agora?", com opções que mostram
  que não é só a PAP) e, se for PAP, "Quando é a tua PAP?". A data fica guardada para um
  email de reativação quando se aproximar.
- Depende de contar as respostas aos áudios: se ganhar "PAP é para o ano", é esta.

**3. O próximo passo nunca fica vazio** (secção 4 acima)
- Para quem já tem projeto e não está ativado. É um grupo mais pequeno do que o da ideia 2,
  mas a alteração é pequena.

**4. Frase do dia no painel a mostrar usos que não são a PAP**
- A mascote do StudyFetch diz uma frase diferente a cada visita e aponta para uma
  funcionalidade concreta.
- Para nós, ataca a perceção "isto é só para a PAP": uma frase rotativa no topo do Dashboard
  a apontar para o diário, para um trabalho de disciplina, para a página de estágio, etc.
- Barato: texto estático em rotação, sem IA.

**5. Tempo em cada passo** ("leva 3 minutos")
- O StudyFetch põe tempo no primeiro passo. O `NextStepBlock` já diz "menos de 5 minutos"
  para criar projeto. Levar isso a todos os CTAs de onboarding é só copy.

**6. Inquérito NPS dentro da app**
- O StudyFetch pergunta de 0 a 10 se recomendarias a app. Hoje o nosso feedback vem dos
  áudios, um a um. Um NPS dá um número que se acompanha semana a semana.
- Não aproxima da North Star sozinho, mas diz-nos se o que mudamos está a funcionar.

### Mais tarde

**7. Diário por voz.** O StudyFetch grava a aula e transforma-a em notas. Para nós: gravar 30
segundos sobre o que se fez hoje e a IA escreve a entrada do diário. Baixa o atrito de
registar progresso, que alimenta o score. O reconhecimento de voz já existe no
`DefenseMode.jsx`, mas continua a ser mais trabalho do que as ideias acima.

**8. Partilha com pré-visualização.** O modal de partilha deles mostra um cartão do conjunto e
botões de WhatsApp, Telegram e mensagens. O Showo já tem WhatsApp na página do projeto
(`ProjectPage.jsx:4939`). O ganho seria mostrá-lo no momento de publicar, com cartão. É
melhoria, não buraco.

### Não fazer

- **Classificação pública de sequências.** Viola a regra do Showo de que métricas de
  envolvimento só são visíveis ao próprio utilizador. O Showo já tem sequência semanal
  privada (`RhythmPanel`, "semanas seguidas"), e chega.
- **Quizzes, flashcards, arcade, resumos em áudio.** São ferramentas de estudo. Não
  aproximam de um portefólio nem de uma validação.
- **Comunidade no Discord.** Custa moderação contínua e não temos equipa para isso agora.
- **Preços diferentes por região/teste A/B.** Com o volume atual não há tráfego para um teste
  dar resultado.
