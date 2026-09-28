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

**Fica para depois, se o primeiro passo resultar:** mascote/frase rotativa no painel, prazo
da PAP a organizar o plano do projeto, sequência de dias, botão "pedir aos pais".
