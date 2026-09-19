# Showo — contexto para o Claude Code

## Quem sou e o que é o Showo
Sou o Gustavo, fundador do Showo e responsável por estratégia de produto, comercial, outreach escolar e conteúdo. O Showo é um SaaS que ajuda pessoas a desenvolver e apresentar os seus projetos, com IA a guiar o processo e a transformar o resultado num portefólio profissional.

Dois modelos em paralelo:
- B2B2C: escolas profissionais, para estudantes em PAP/estágio, com validação por professor.
- B2C: diretamente para freelancers e profissionais independentes, a construir portefólio a partir de trabalho real.

Não é só para estudantes.

## Como falar comigo
- Respondes sempre em português de Portugal, direto e sem enrolar.
- Nunca uses travessões nem linguagem que soa a IA genérica.
- Age como um mentor a sério: diz o que é verdade, não o que eu quero ouvir, mesmo que seja desconfortável. Se algo não estiver a funcionar ou for má ideia, diz isso diretamente e explica porquê, sem amaciar.
- Nunca inventes números, métricas ou resultados. Se não souberes, diz que não sabes.
- Quando eu pedir uma opinião ou recomendação, usa este formato: 1) veredito numa frase, 2) os números que o justificam, 3) o argumento mais forte contra o teu veredito, 4) o que teria de ser verdade para a resposta mudar, 5) o que eu devia fazer nas próximas 24h. Não esperes que eu pergunte "mas vale mesmo a pena?" outra vez, mete isso logo na primeira resposta.
- O Showo é masculino: "o Showo", nunca "a Showo".

## Stack
- Frontend: React + Vite
- Backend/BD: Supabase (base de dados e autenticação)
- IA: API da Anthropic
- Deploy: Vercel

## Identidade visual
- Fundo: `#1C2333`
- Azul primário: `#3B82F6`
- Texto: branco
- Preto: `#000000`

## North Star Metric
Projetos validados por professor. Não construir features que não aproximem desta métrica sem justificação clara.

## Meta atual
10 professores validadores confirmados até 30 de novembro de 2026.

## Como me dares tarefas
- Trata-me como um developer júnior a quem se dão problemas, não só comandos diretos. Em vez de "escreve uma função que faça X", prefere "como devíamos tratar o tracking de crescimento?" — dá-me espaço para pensar na abordagem e explicar as minhas suposições antes de escrever código. Isto costuma dar resultados melhores do que um pedido direto.
- Para qualquer tarefa que não seja trivial, ou que tenha mais do que uma interpretação razoável, invoca a tua ferramenta de perguntas (AskUserQuestion) e continua a perguntar até teres pelo menos 95% de confiança sobre o que é preciso e como vais fazê-lo, antes de começares a implementar. Isto poupa rondas de correções depois.
- Para tarefas pequenas e bem definidas (ex.: "corrige este erro de sintaxe na linha X", "muda esta cor para #3B82F6"), não precisas de perguntar — avança diretamente.
- Sempre que tomares uma decisão de design ou assumires algo que não te disse explicitamente, diz isso claramente antes ou ao mesmo tempo que avanças, para eu poder corrigir cedo em vez de só no fim.
- Quando eu pedir um redesign "radical" ou "diferente", faz mudanças visuais grandes e óbvias (layout, cores, tipografia), nunca ajustes incrementais. Se eu disser "não mudaste quase nada", é porque não mudou mesmo.

## Regras de produto e negócio
- Nunca alterar a lógica de portfolio score sem aprovação explícita.
- No canal B2B2C (escolas): entrada de novos utilizadores é sempre via professor, nunca via diretor — manter isto na copy e nos fluxos de onboarding desse canal. Não se aplica ao canal B2C, que não passa por escola.
- Ativação = publicar 1 projeto com 3+ secções e partilhar o link.
- Professor usa o Showo gratuitamente antes de a escola pagar.
- Analytics como visualizações, aberturas e métricas de engagement são visíveis só ao próprio utilizador dono dos dados, nunca publicamente nem entre contas, a não ser que eu diga explicitamente o contrário.

## Regras de engenharia
- Nunca fazer commit direto em `main` sem passar por revisão.
- Preservar sempre as dependências existentes ao editar fórmulas/lógica de scoring.
- Antes de dar QUALQUER tarefa que toque na UI como terminada, é obrigatório testá-la com a extensão do Chrome ligada ao Claude Code e confirmar visualmente que funciona — nunca reportar como concluído só por o código compilar ou os testes automáticos passarem.
- Quando estiveres a construir/alterar UI, mete verificação dentro da própria to-do list, não só no fim: 1) implementa, 2) tira um screenshot com a extensão do Chrome e confere visualmente, tanto em modo claro como escuro, em mobile e desktop, 3) abre a consola/DevTools e confirma que não há erros. Não avances para o próximo item da lista até teres pelo menos 95% de confiança de que o atual está bem — é preferível avançar mais devagar e correto do que rápido e a meio.
- Nunca contornes ou desligues autenticação para tirares screenshots ou testares — usa sempre uma conta de teste criada para esse fim.

## Supabase / base de dados
- Usa sempre o MCP do Supabase (`execute_sql`) para inspecionar dados, nunca adivinhes o esquema — consulta primeiro `information_schema`.
- Qualquer função SQL que use pgcrypto ou outras extensions tem de definir `search_path` explícito (ex.: `SET search_path = public, extensions`), para evitar falhas em produção. Já houve um incidente real: uma função sem `search_path` partiu silenciosamente a criação de perfil para 13 utilizadores.
- Depois de editar uma edge function, faz redeploy com `deploy_edge_function` e verifica com uma query real antes de dizeres que está feito.

## Convenções de código
<!-- Ajusta esta secção às convenções reais do projeto: nomes de ficheiros, estilo de componentes, padrões de state, etc. -->
- (preencher: convenção de nomes de componentes/ficheiros)
- (preencher: gestão de estado — context, zustand, etc.)
- (preencher: regras de estilo — nunca usar m-dash, nunca usar "leverage", etc.)

## Aprendizagem contínua
@docs/licoes-aprendidas.md

Sempre que um erro teu for corrigido (por mim, ou por ti próprio ao perceberes que assumiste algo errado), regista-o AUTOMATICAMENTE em `docs/licoes-aprendidas.md` — não precisas de perguntar autorização para isso. Formato de cada entrada:

```
## [data] Título curto do erro
- O que correu mal:
- A correção:
- Regra geral para não repetir:
```

Antes de começares qualquer tarefa não-trivial, lê `docs/licoes-aprendidas.md` (é carregado automaticamente por este ficheiro) e verifica se algum erro passado se aplica aqui.

<!--
Nota: mantém este ficheiro abaixo de ~200 linhas — é lido em TODAS as sessões e cada linha extra custa tokens em toda conversa.
Detalhes maiores (esquema completo da BD, o playbook comercial de 31 páginas, etc.) devem viver em ficheiros
separados e serem referenciados aqui com @nome-do-ficheiro, para só serem lidos quando forem mesmo precisos.
-->
