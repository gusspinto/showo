# Lições aprendidas — Showo

Registo automático de erros corrigidos, para o Claude Code não os repetir. Cada entrada é curta: o que correu mal, a correção, e a regra geral a seguir.

Este ficheiro é lido automaticamente em todas as sessões (via `@docs/licoes-aprendidas.md` no `CLAUDE.md`) — não apagar entradas antigas sem falar com o Gustavo primeiro.

<!-- Novas entradas vão sendo adicionadas aqui pelo Claude Code, mais recentes no fundo. -->

## [2026-09-18] Commit direto em `main` por engano, duas vezes na mesma sessão
- O que correu mal: depois de fazer merge de `dev` para `main` e dar `push`, fiquei sem querer no branch `main`. Os commits seguintes (fix do Explorar, rótulo "PAP / Projeto final") foram parar diretamente a `main`, sem passar por `dev` primeiro — violou a regra de nunca commitar direto em `main`.
- A correção: `git stash` das alterações locais não relacionadas, `git checkout dev`, `git cherry-pick <commit>` para trazer o commit para `dev`, depois `git checkout main` e `git reset --hard origin/main` para desfazer o commit local em `main`, e por fim `git stash pop` para recuperar as alterações locais.
- Regra geral para não repetir: depois de qualquer `git checkout main` (nomeadamente a seguir a um merge+push), correr `git checkout dev` explicitamente antes do próximo `git commit`. Confirmar sempre `git branch --show-current` antes de qualquer `git commit`, não assumir o branch pelo contexto da conversa.
