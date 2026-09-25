# Plano até quarta, 30 de setembro de 2026 (14:30)

Saído da sessão 8 de mentoria (25/09/2026). Só o que toca no Showo a app — outreach,
sketches e conteúdo ficam de fora deste documento porque a execução já está clara.

## Estado atual do código (verificado, não assumido)

- `src/lib/plans.js`: Plus e Pro têm `stripePriceId` fixo por ambiente. Não existe
  nenhuma noção de periodicidade — só um preço por plano.
- `src/pages/Pricing.jsx`: preços escritos à mão nas linhas 33 (`€0`), 67 (`€4,99`) e
  106 (`€9,99`), com `period: '/mês'`. Não há toggle mensal/anual.
- `supabase/functions/create-checkout/index.ts`: já tem `allow_promotion_codes: true`.
  **Os códigos de desconto do lançamento já funcionam, não é preciso escrever código para
  isso** — basta criar o coupon no Stripe com duração de 6 meses (`duration: repeating`,
  `duration_in_months: 6`).
- Os price IDs do checkout vêm de `STRIPE_PRICE_BUILD` / `STRIPE_PRICE_LAUNCH`, e o
  `plans.js` tem outros price IDs hardcoded. São duas fontes de verdade para a mesma coisa
  e vão divergir no momento em que se criar o plano anual.
- `stripe-webhook` guarda o plano a partir de `sub.metadata.plan`, por isso o plano anual
  tem de mandar `plan: 'plus'` no metadata e a periodicidade em separado, senão o anual
  entra como plano desconhecido e cai no default `'plus'` sem se saber que é anual.

## Tarefas da semana, por ordem

### 1. Subir os preços (é isto que o mentor pediu para ser feito já)
Ficam no valor pré-desconto, para o código de 50% do lançamento fazer sentido.

| Plano | Agora | Pré-lançamento | Standard pós-campanha |
|---|---|---|---|
| Plus mensal | 4,99 | 8,99 | 6,99 |
| Pro mensal | 9,99 | 17,99 | 13,99 |
| Plus anual | — | 89,90 (7,49/mês) | 69,90 (5,82/mês) |
| Pro anual | — | 179,90 (14,99/mês) | 139,90 (11,65/mês) |

Confirmado pelo Gustavo a 25/09: se um plano sobe, o outro sobe também. Anual = 10× o
mensal, os 2 meses de desconto pedidos na reunião. Na UI, valor por mês em destaque e total
anual cobrado logo abaixo, sem letra pequena.

Trabalho: criar os novos preços no Stripe (nunca editar um price existente, quebra as
subscrições ativas), atualizar env vars e `plans.js`, e atualizar os valores no
`Pricing.jsx`. Quem já paga fica no preço antigo — é o comportamento normal do Stripe e é
o correto.

### 2. Plano anual com 2 meses de desconto
- Preços anuais: Plus 89,90/ano, Pro 179,90/ano (10× o mensal pré-lançamento).
- Toggle mensal/anual no `Pricing.jsx`, com o anual pré-selecionado e o badge
  "2 meses grátis" — é isto que sobe o LTV.
- `plans.js` passa a ter `stripePriceId: { month, year }`; `create-checkout` recebe
  `interval` e escolhe o price; o metadata da subscrição passa a levar `interval` para o
  webhook e o billing histórico não ficarem cegos.
- Antes de dar como feito: subscrição de teste real no Stripe em modo teste e query ao
  `profiles.plan` e `billing_events` para confirmar que gravou.

### 3. Coupon de lançamento no Stripe (sem código)
`SHOWO50`, 50%, `repeating` 6 meses, válido durante 2 semanas de campanha. Criar já,
guardar desativado, e ativar no dia do lançamento. Não anunciar nada esta semana.

**Restringir o coupon aos preços mensais.** Num plano anual existe uma só fatura por ano, e
um desconto `repeating` de 6 meses cai inteiro sobre ela: 50% de 89,90 são 44,95 por um ano
completo, sem forma de voltar atrás em quem já resgatou. O Stripe permite limitar um coupon a
produtos específicos — usar isso. Desconto de lançamento no anual, se se quiser, é um segundo
código com percentagem própria e aplicação única. Confirmar em modo de teste antes de
produção, não pela documentação.

### 4. Pop-up de upgrade no PlanGate (decidido a 25/09)
Discutiu-se esconder os preços num pop-up e acabar com a `/pricing`, como o StudyFetch. A
decisão foi não fazer isso: a `/pricing` fica (âncora de preço, SEO — está no sitemap com
prioridade 0.8 — e é onde as escolas vêem que a conta institucional não é self-serve). O que
se copia do StudyFetch é fechar a venda no momento da dor.

Hoje `src/components/PlanGate.jsx:38` faz `navigate('/pricing')` e arranca a pessoa do sítio
onde estava, precisamente quando ela queria continuar a trabalhar. Passa a:

- Mostrar **um** plano, o tier acima do atual (Grátis → Plus, Plus → Pro), com preço e um
  botão direto ao checkout. Anual primeiro, com link discreto "prefiro mensal".
- **Nada de CTA de pagamento em contas de escola.** `resolvePlanId` devolve `school` /
  `school_pro` a quem entrou por código de turma, e professores são `pro`. Para esses fica a
  mensagem e o botão de fechar. Um aluno de escola com botão de pagar estraga a conversa
  comercial com a instituição.
- `create-checkout` passa a aceitar o path de origem e a usá-lo no `success_url` (hoje é fixo
  em `/settings?tab=plano&stripe=success`), com allowlist de paths internos para não criar um
  open redirect. Quem paga volta ao projeto que estava a editar.

### 5. Onboarding, a partir do StudyFetch
Isto é o que faz a diferença no problema real da reunião: as pessoas entram, não voltam.
Já existem `src/pages/Onboarding.jsx` e `Welcome.jsx` — o trabalho não é construir de
novo, é fechar o buraco entre entrar e ter o primeiro projeto no ecrã.

Para a reunião chega levantar, com o StudyFetch aberto ao lado, uma lista do que eles
fazem que nós não fazemos, e escolher **um** passo para implementar. A aposta mais óbvia
face ao feedback recebido é acabar o onboarding com um projeto já criado a partir do PDF,
não com um ecrã vazio.

### 6. Não fazer esta semana
Automação de áudio no WhatsApp e lançamento oficial. O mentor foi explícito: só depois das
241 leads contactadas e dos sketches definidos.

## O que levar à reunião de quarta
- Preços novos já em produção e plano anual a funcionar, com um pagamento de teste feito.
- Coupon criado e pronto a ativar.
- Pop-up de upgrade a converter dentro da app, sem sair da página.
- Lista de diferenças de onboarding face ao StudyFetch e o passo escolhido.
