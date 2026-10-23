# Plano de ação: análise de uso do Coach IA, Diário e afins

Gerado a partir de `analise-uso-features-ia-2026-10-23.md`. Checklist vivo, vou marcando à medida que completo.

## Investigação rápida (confirmar antes de construir)

- [x] Cruzar: quem usou o Coach geral criou projeto a seguir? **Só 12 de 27 (44%) criaram projeto no mesmo dia ou depois. Os outros 56% não é handoff, é abandono real. Confirma a ação de construir o email de retorno também para o Coach geral.**
- [x] Quantos users com `defense_date` próxima? **Só 112 de 626 projetos (18%) têm data de defesa definida, e só 14 estão a menos de 30 dias. O uso baixo de defense/interviewProject é plausivelmente timing (a maioria ainda não chegou lá no calendário), não falha de descoberta. Não tratar como bug a corrigir já.**
- [x] Ver o fio completo da queixa "tive um problema com o gustavo" no feedback (08/08). **É o próprio Bruno Silva (cofundador), enviado de /aprende. Não é queixa de user externo, falso alarme.**

## Construção (a ação de maior alavancagem primeiro)

- [x] Email/notificação: 1ª sessão do Coach (projeto ou geral) sem retorno em 3-21 dias, citando a própria pergunta que a pessoa fez. **`send-coach-return-nudge` + `coach-nudge-unsubscribe`, deployed, cron diário às 10h20, testado de ponta a ponta (email real enviado, registado em `email_sends`, `resend_id` confirmado).**
- [x] Corrigir confusão de UI entre a caixa de feedback e o Coach. **Aviso inline em `Feedback.jsx` quando o texto cola >500 caracteres, com link direto para `/coach`. Testado visualmente, sem erros novos na consola.**

## Decisão do Gustavo, não construo sem resposta

- [ ] Diário: continua a ser "escreve sobre o teu progresso" (precisa de prompt ativo) ou aceita-se o log automático como o produto principal?
