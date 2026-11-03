-- funnel_events só tinha {user_id, event, feature}. Para "project_shared"
-- isso dava "quem" (user_id) mas não "qual projeto", pedido explícito do
-- Gustavo para conseguir ver quem partilhou o quê. Coluna nova, sem FK
-- obrigatória (o projeto pode ser apagado depois e o evento continua a
-- interessar para histórico).
ALTER TABLE public.funnel_events ADD COLUMN IF NOT EXISTS project_id uuid;
