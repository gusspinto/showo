# Plano até quarta, 30 de setembro de 2026 (14:30)

Tudo o que ficou decidido na sessão 8 de mentoria (25/09/2026), não só a parte de código.
Organizado por frente, com o que é para fazer, quem faz, e o que é meu (Claude, na app).

## 1. Outreach — limpar as 241 leads

- Parar os áudios personalizados por pessoa. Gravar **um áudio geral**, tipo "boas marcas",
  e enviar a toda a gente. O volume importa mais do que a personalização — o mentor foi
  explícito nisto.
- Enviar como **documento**, não por encaminhar — reencaminhado aparece marcado como tal no
  WhatsApp, documento aparece como áudio normal. Confirmar isto de novo: o Bruno teve um
  caso em que um áudio reencaminhado apareceu normal, o mentor acha que depende de quantas
  vezes já foi reencaminhado. Testar antes de mandar em massa.
- Meta: todas as 241 leads contactadas até **meio da próxima semana**.
- Só depois disto (não antes): criar a automação no WhatsApp que manda o áudio 1-2 dias
  depois de a lead entrar no funil.

## 2. Conteúdo — Instagram oficial da Showo

- **Parar já** de publicar colaborações no Insta oficial — o mentor confirmou que baixam
  drasticamente o alcance. Colaborações só ficam na marca pessoal, como portefólio.
- Trazer para quarta: **2 sketches planeados, pelo menos 1 gravado**. Formato: mostrar a
  dor a ser resolvida pela app em poucos segundos (referência: vídeos da SABEN).
- Trazer também: **documento com as dores que a app resolve** — a lista de onde os
  sketches vão nascer, alimentada pelo que se ouve no WhatsApp dos users.
- Storytelling a partir de notícias mediáticas de IA, com CTA para a app, é a segunda via
  de conteúdo a explorar (menos urgente que os sketches esta semana).

## 3. Objetivos até final do ano

Trazer para quarta (não precisa de estar pronto antes disso):
- Meta de leads até 31 de dezembro.
- Número de vídeos/sketches por semana.
- Quando arrancar com ads.
- Estudar o vídeo viral do brasileiro da SaaS de fitness (5 meses sem users, depois 10 mil
  num dia) para perceber o que é replicável.

## 4. Onboarding — estudar o StudyFetch

Ponto que liga outreach a produto: o feedback recorrente é "entrei, achei bom, esqueci-me".
- Estudar o processo de onboarding do StudyFetch (referência combinada entre Bruno e
  Gustavo) e o que o torna tão "prendedor".
- Já existem [`src/pages/Onboarding.jsx`](../src/pages/Onboarding.jsx) e
  [`Welcome.jsx`](../src/pages/Welcome.jsx) — o trabalho não é construir de novo, é fechar
  o buraco entre entrar e ter o primeiro projeto no ecrã.
- Para quarta: lista das diferenças face ao StudyFetch e **um** passo escolhido para
  implementar. A aposta mais óbvia é acabar o onboarding com um projeto já criado a partir
  de um PDF, não com um ecrã vazio.

## 5. Preços e plano anual (o trabalho que é meu, na app)

Não mexi em nada ainda — os preços atuais (Plus 4,99, Pro 9,99) ficam como estão até
confirmares os valores finais. Deixo aqui o que já verifiquei no código, para quando
decidires avançar.

**Estado atual do código:**
- [`src/lib/plans.js`](../src/lib/plans.js): um só `stripePriceId` por plano, sem noção de
  periodicidade.
- [`src/pages/Pricing.jsx`](../src/pages/Pricing.jsx): preços escritos à mão, sem toggle
  mensal/anual.
- [`supabase/functions/create-checkout/index.ts`](../supabase/functions/create-checkout/index.ts):
  já tem `allow_promotion_codes: true` — **os códigos de desconto já funcionam**, só falta
  criar o coupon no Stripe, não é preciso escrever código para isso.
- Os price IDs vivem em dois sítios (env vars no checkout, hardcoded no `plans.js`) — vão
  divergir quando se criar o anual, se não se arrumar isso primeiro.
- `stripe-webhook` guarda só `metadata.plan`; o anual precisa de mandar a periodicidade
  também, senão fica indistinguível do mensal no histórico de faturação.

**Preços confirmados por ti a 25/09** (se um plano sobe, o outro sobe também; anual = 10×
o mensal, os 2 meses de desconto pedidos na reunião):

| Plano | Agora | Pré-lançamento | Standard pós-campanha |
|---|---|---|---|
| Plus mensal | 4,99 | 8,99 | 6,99 |
| Pro mensal | 9,99 | 17,99 | 13,99 |
| Plus anual | — | 89,90 (7,49/mês) | 69,90 (5,82/mês) |
| Pro anual | — | 179,90 (14,99/mês) | 139,90 (11,65/mês) |

**Cuidado ao criar o coupon `SHOWO50`:** restringir aos preços mensais. Num plano anual há
uma só fatura por ano, e um desconto `repeating` de 6 meses cai inteiro sobre ela — 50% de
89,90 dá 44,95 por um ano completo, não o que se pretende. Confirmar em modo de teste no
Stripe antes de produção.

**Ainda não decidido — não mexo sem o teu ok:** quando subir os preços de facto (a
reunião disse "já", mas ainda não confirmaste a data de execução).

## 6. Pop-up de upgrade dentro da app (a implementar agora, prioridade atual)

Decisão tomada nesta conversa: em vez de esconder os preços e acabar com a `/pricing`
(como o StudyFetch), a `/pricing` fica — é âncora de preço, está no sitemap com prioridade
0.8, e é onde as escolas veem que a conta institucional não é self-serve. O que se copia do
StudyFetch é fechar a venda no momento exato da dor, dentro do pop-up de limite.

Hoje [`src/components/PlanGate.jsx:38`](../src/components/PlanGate.jsx) faz
`navigate('/pricing')` quando alguém atinge um limite — arranca a pessoa do sítio onde
estava. Passa a:
- Mostrar **um** plano, o tier acima do atual (Grátis → Plus, Plus → Pro), com preço e
  botão direto ao checkout, sem sair da página.
- Anual primeiro, com link discreto "prefiro mensal".
- **Sem CTA de pagamento em contas de escola** — `school`/`school_pro`/professor ficam só
  com a mensagem e o botão de fechar, porque essas contas não são self-serve.
- `create-checkout` passa a devolver a pessoa ao path onde estava, não a um `success_url`
  fixo.

Isto é o que estou a implementar agora, a pedido explícito de "não precisarem de ir à
página de planos quando chegarem ao limite das features".

## Não fazer esta semana

- Automação de áudio no WhatsApp (só depois das leads todas contactadas).
- Lançamento oficial / fim do beta (só depois dos sketches definidos).
- Subir os preços de facto (falta o teu ok na data).

## O que levar à reunião de quarta (14:30)

- [ ] 241 leads contactadas por áudio geral.
- [ ] 2 sketches planeados, 1 gravado.
- [ ] Documento de dores que a app resolve.
- [ ] Objetivo de leads e plano até ao fim do ano, incluindo arranque de ads.
- [ ] Lista de diferenças de onboarding face ao StudyFetch, e o passo escolhido.
- [ ] Pop-up de upgrade a converter dentro da app (meu, deve estar pronto antes disso).
