# Como o StudyFetch faz marketing (28/09/2026)

Sem a parte dos criadores UGC pagos, que já conhecem. Feito pelo site público
(studyfetch.com), pelo sitemap, e por pesquisa — não tenho acesso à conta deles de
analytics nem a números internos, por isso tudo aqui é o que está publicamente visível.

## 1. A página inicial vende resultado, não funcionalidade

- Título: *"Learning that adapts to you."* Subtítulo: *"Stop fighting your notes. Understand
  them."* — a dor vem primeiro, a lista de funcionalidades só depois.
- Prova social logo a seguir ao título, antes de explicarem o que a app faz: **8M+
  utilizadores**, **92% dos utilizadores ativos melhoraram notas**, **redução de 30% no
  tempo de estudo**, **4,9 estrelas em 10 mil avaliações**.
- Sem preços na página pública. Só "Try for free". O preço só aparece dentro da app, no
  momento de pagar (documentámos isso na análise de produto).
- CTA principal repete-se a cada secção ("Get started", "Learn more"), nunca um scroll longo
  sem convite para agir.

## 2. O maior motor: transformar uso em SEO

Isto é o achado mais importante desta análise. Fui ver o sitemap.xml deles diretamente.

- **Question Bank** (`/questions`): todas as perguntas que um utilizador já fez ao tutor de
  IA (Sparky) ficam públicas e indexadas. Contador na própria página: **"7M+ questions in
  our community bank", 50+ disciplinas**. Cada pergunta de um aluno vira uma página que o
  Google pode mostrar a outro aluno com a mesma dúvida.
- **Vídeos explicativos** (`/explainer-video/`): o sitemap tem 11 sub-sitemaps só para isto —
  cada um cabe até 50 mil URLs. É o mesmo mecanismo: conteúdo gerado por uso vira página
  pública.
- **Jogos e bancos de perguntas** (`/games/`, `/question-banks/`): mesma lógica outra vez.
  Cada set de estudo criado por um aluno pode nascer como página partilhável e indexável.
- **100 páginas "/section"**, cada uma um landing page de SEO à volta de uma pesquisa
  específica ("AI Quiz Generator from Class Notes", "AI Flashcard Maker for Language
  Learning"). Confirmei que são templadas: mesma estrutura, ~2500 palavras, 16 FAQs,
  schema markup, sempre a acabar em "Sign up to revolutionize your learning."

**Porque é que isto importa:** não é conteúdo que uma equipa de marketing escreve. É o
próprio produto, ao ser usado, a criar as páginas que trazem gente nova. Quanto mais alunos
usam, mais páginas existem, mais tráfego orgânico chega. É um ciclo que se alimenta sozinho,
e é o oposto de depender só de vídeos virais pontuais.

## 3. Prova social por camadas, cada uma para uma audiência

- **Para alunos:** testemunhos com foto e universidade (Hartnell Community College, Dallas
  College), o número 92%/8M+.
- **Para instituições** (`/enterprise`): números diferentes e mais fortes por serem
  verificáveis — *Emory University: 75% dos alunos melhoraram notas*, *Auburn University:
  91%*. Mais de 10 mil instituições de ensino superior dos EUA já têm alunos a usar a
  plataforma (não significa que a instituição pagou — significa que há alunos lá a usar a
  conta grátis). Integração com Canvas, Blackboard, Schoology, D2L, Google Classroom.
- **Para imprensa/investidores:** parceria anunciada com a NVIDIA (Honen, formação em IA
  para 250 mil+ alunos do secundário, meta de 1 milhão em 3 anos) e ronda de financiamento
  de **10 a 11,5 milhões de dólares** (Owl Ventures, 2025). Isto não é uma tática que se
  copie — é contexto para perceber a escala de recursos que têm.

## 4. Programa de embaixadores de campus

- Separado dos criadores pagos: é um programa para estudantes com **orçamento de marketing
  próprio para gastar no campus deles**, kit de merchandising, conta Premium grátis, e os
  melhores são convidados a visitar o escritório em Nova Iorque. Limitado a 2 embaixadores
  por campus.
- É recrutamento de gente que já é "power user" e tem influência social no meio, não
  criadores anónimos pagos por vídeo.

## 5. Redes sociais oficiais

- Instagram oficial (@studyfetch): 583 mil seguidores, bio "The AI Tutor That Your
  Professors Approve."
- TikTok oficial (@studyfetchai): 85,5 mil seguidores, 3,6 milhões de gostos. Mas tem só
  **3 vídeos publicados** — a conta oficial não é onde publicam volume, é uma vitrine.
  O volume real vem dos criadores UGC (fora do âmbito desta análise) e da comunidade que
  reposta.

## O que é replicável para o Showo, e o que não é

**Replicável, sem precisar do orçamento deles:**
- Título e subtítulo que vendem o resultado, não a funcionalidade — comparar com o texto
  atual do Showo.
- Prova social logo no topo da página, com números reais (não fabricados).
- Página de resultados/estudo separada para escolas, com números verificáveis por
  instituição (paralelo direto à meta dos 10 professores validadores).

**Replicável, mas é trabalho de produto antes de ser marketing:**
- O motor de SEO por uso. O Showo já tem o equivalente em bruto: páginas públicas de
  projeto (`showo.pt/u/...`, `showo.pt/projeto/...`) e a página `/explorar`. A pergunta é se
  essas páginas são indexáveis, têm conteúdo suficiente para rankear, e se há volume que
  justifique o investimento. Vale uma verificação técnica (robots.txt, sitemap, quantas
  páginas de projeto o Google já indexou) antes de decidir investir aqui.

**Não replicável agora, e não vale tentar:**
- Programa de embaixadores com orçamento e merchandising — precisa de dinheiro que não
  temos.
- Parceria com uma NVIDIA — precisa de escala e capital que não temos.
- 7M+ páginas de perguntas — precisa de anos de utilizadores ativos a gerar conteúdo, não é
  uma tática, é uma consequência de escala.
