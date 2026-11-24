-- Pedido do Gustavo (24/11): guardar com que plano a pessoa participa no
-- sorteio (grátis, plus, pro), para a contabilidade do benefício garantido
-- por assinatura (1 mês extra). Não há coluna separada para mensal/anual
-- no perfil, fica só o plano resolvido (resolvePlanId), não o intervalo.
alter table public.gta_giveaway_entries add column plan_at_entry text;
