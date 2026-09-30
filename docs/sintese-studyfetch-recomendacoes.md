# Síntese: o que fazer com o que aprendemos do StudyFetch (28/09/2026)

Junta [`analise-studyfetch.md`](analise-studyfetch.md) (produto/onboarding) e
[`analise-marketing-studyfetch.md`](analise-marketing-studyfetch.md) (marketing) numa
lista só, ordenada por impacto real na North Star (projetos validados por professor) e na
ativação (1 projeto com 3+ secções, partilhado). Não implementei nada disto ainda, exceto o
protótipo de validação, que já está feito mas por decidir. Isto é para levar à reunião de
quarta.

## 0. Achado urgente, não é ideia, é um bug

**O sitemap do Showo em produção tem zero páginas de projeto.** Fui ao endpoint real
(`showo.pt/sitemap.xml`) e só aparecem as 5 páginas estáticas — nenhum `/projeto/:slug`,
apesar de o código em [`api/sitemap.js`](../api/sitemap.js) já ter a lógica para os
incluir (até 1000, os mais recentes). Isto significa que, agora mesmo, o Google não está a
descobrir nenhum projeto público do Showo por este caminho.

A causa mais provável, que não confirmei por não ter acesso ao painel do Vercel: a variável
de ambiente `SUPABASE_URL`/`SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_URL`, que o código também
aceita) não está configurada nas funções serverless do Vercel — o `.env` local só serve o
frontend, não esta função. Um `catch {}` vazio no código esconde o erro em vez de o mostrar
nos logs.

**Isto liga direto à descoberta da análise de marketing:** o StudyFetch cresce ao transformar
o uso de cada aluno em páginas públicas indexáveis (7M+ perguntas, 50+ disciplinas). O Showo
já tem a mesma ideia construída — páginas de projeto com conteúdo único (área, objetivo,
problema, narrativa) — só que está desligada. Antes de pensar em novas funcionalidades de
SEO, isto é o primeiro passo, e é uma verificação de 5 minutos no Vercel, não uma
funcionalidade nova.

## 1. O maior buraco: quem chega pensando "isto é só para a PAP"

Junta o que o Gustavo apontou (76% nunca cria projeto, segundo comentário no código) com o
que o StudyFetch faz (organiza tudo pela data do exame). Depende de contares as respostas
aos áudios — mas se for este o grupo maior, é a prioridade.
- Onboarding pergunta "Para que vais usar o Showo agora?" com opções que mostram outros usos
  além da PAP.
- Se responder PAP, pergunta a data, mesmo que "ainda não sei" ou "é só para o ano".
- A data fica guardada para reativar a pessoa mais perto da altura, por email — a
  infraestrutura de emails já existe.

## 2. O pedido de validação ao professor (protótipo já feito)

É a ideia com ligação mais direta à North Star: cada pedido é um professor a entrar pela
mão de um aluno, o que respeita a regra de a entrada ser sempre pelo professor. Protótipo em
[`src/components/ValidationRequest.jsx`](../src/components/ValidationRequest.jsx), testado
visualmente, ainda não integrado em nenhuma página real.

**Decisão que falta, e é tua:** como valida um professor que não tem turma nenhuma no Showo?
Hoje a validação só existe dentro de turmas. Sem resposta a isto não dá para desenhar a base
de dados nem o lado do professor. Antes de construir o back-end, vale perguntar a 5 alunos
ativos se pediriam isto ao professor deles — é barato de testar antes de decidir.

## 3. O próximo passo nunca fica vazio

Para quem já tem um projeto e não está ativado, o `NextStepBlock` do Dashboard
(`src/pages/Dashboard.jsx:583`) hoje não mostra nada. É um grupo mais pequeno que o da ideia
1, mas a alteração é pequena e reaproveita a checklist de completude que já existe.

## 4. Copy da página inicial e da app, inspirada no que funciona lá

Sem construir nada, só texto:
- Confirmar se a página inicial do Showo vende o resultado (o que a pessoa ganha) antes da
  funcionalidade — o StudyFetch faz isso e é o primeiro coisa que se lê.
- Prova social real logo no topo, se tivermos números que aguentem — não inventar.
- Frase rotativa no painel a mostrar usos que não são a PAP (liga à ideia 1).
- Tempo em cada passo do onboarding ("leva 3 minutos").

## 5. Inquérito NPS dentro da app

Não aproxima da North Star sozinho, mas dá um número que se acompanha semana a semana, em
vez de depender só das respostas aos áudios, uma a uma.

## Não fazer agora

- Programa de embaixadores de campus com orçamento e merchandising — precisa de dinheiro que
  não há.
- Replicar o motor de 7M+ páginas geradas por uso — é consequência de anos de escala, não
  uma tática. O que se pode fazer é ligar de novo o que já existe (achado 0).
- Classificação pública de sequências, quizzes/flashcards/arcade, comunidade no Discord,
  testes A/B de preço — já explicado em detalhe na análise de produto.

## Ordem sugerida para a reunião de quarta

1. Corrigir o sitemap (5 min de verificação, não é discussão).
2. Contar as respostas aos áudios por motivo, para decidir entre a ideia 1 e a ideia 3.
3. Decidir a pergunta em aberto da ideia 2 (validação sem turma) — sem isto não avanço mais
   nada nessa frente.
4. O resto (copy, NPS) fica para depois, é barato e pode esperar.
