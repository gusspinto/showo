# Lições aprendidas — Showo

Registo automático de erros corrigidos, para o Claude Code não os repetir. Cada entrada é curta: o que correu mal, a correção, e a regra geral a seguir.

Este ficheiro é lido automaticamente em todas as sessões (via `@docs/licoes-aprendidas.md` no `CLAUDE.md`) — não apagar entradas antigas sem falar com o Gustavo primeiro.

<!-- Novas entradas vão sendo adicionadas aqui pelo Claude Code, mais recentes no fundo. -->

## [2026-09-18] Commit direto em `main` por engano, duas vezes na mesma sessão
- O que correu mal: depois de fazer merge de `dev` para `main` e dar `push`, fiquei sem querer no branch `main`. Os commits seguintes (fix do Explorar, rótulo "PAP / Projeto final") foram parar diretamente a `main`, sem passar por `dev` primeiro — violou a regra de nunca commitar direto em `main`.
- A correção: `git stash` das alterações locais não relacionadas, `git checkout dev`, `git cherry-pick <commit>` para trazer o commit para `dev`, depois `git checkout main` e `git reset --hard origin/main` para desfazer o commit local em `main`, e por fim `git stash pop` para recuperar as alterações locais.
- Regra geral para não repetir: depois de qualquer `git checkout main` (nomeadamente a seguir a um merge+push), correr `git checkout dev` explicitamente antes do próximo `git commit`. Confirmar sempre `git branch --show-current` antes de qualquer `git commit`, não assumir o branch pelo contexto da conversa.

## [2026-09-24] Copy de resposta a assumir culpa que não existe
- O que correu mal: nas respostas a users que disseram apenas que se esqueceram de voltar, escrevi "a culpa é mais nossa do que tua" e "não te demos motivo nenhum para voltares". O Gustavo apontou que isso é vitimização: assume culpa que não existe e convida a pessoa a consolar-nos em vez de agir.
- A correção: cortar a auto-culpabilização e passar direto ao próximo passo concreto (criar o projeto e correr a análise de IA).
- Regra geral para não repetir: em copy de outreach, nunca assumir culpa que não é real nem pedir desculpa por algo que o utilizador não criticou. Agradecer e pedir uma ação concreta. Humildade é não justificar, não é diminuir-se.

## [2026-09-24] Recomendei remover um domínio autorizado do OAuth sem verificar para que servia
- O que correu mal: vi `kctdlnqiomxypvesdify.supabase.co` na lista de domínios autorizados do Google OAuth e disse ao Gustavo para o tirar, por "não ser um domínio dele". Na verdade é o host do redirect URI do Supabase Auth (`/auth/v1/callback`) — removê-lo partia o login com Google em produção. Também diagnostiquei o motivo da verificação a partir da screenshot em vez de ler o código: a verificação é exigida pelo scope sensível `calendar.events` da edge function `google-calendar-oauth`, não pelo login.
- A correção: verificar no código quais os fluxos OAuth e scopes antes de opinar, e desaconselhar a remoção até confirmar os redirect URIs no separador Clientes.
- Regra geral para não repetir: nunca recomendar remover config de infraestrutura (domínios, redirect URIs, chaves, variáveis de ambiente) com base só numa screenshot. Ler primeiro o código que a consome e confirmar o impacto em produção. Um conselho que parte a autenticação custa mais do que a ronda de verificação que tentava poupar.
