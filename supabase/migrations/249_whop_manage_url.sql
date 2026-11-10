-- Guarda o manage_url da membership do Whop (link para o próprio cliente
-- gerir/cancelar a subscrição sem precisar de pedir ao Gustavo). O
-- whop-webhook escreve isto em membership.activated. Sem isto, o botão
-- "Gerir subscrição" em Settings.jsx continua a chamar create-portal
-- (Stripe), que não serve para quem subscreveu via Whop.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whop_manage_url text;

-- Permite à pessoa ler o próprio link (lição da coluna sem GRANT, 2026-10-28
-- e 2026-10-30: sem isto, qualquer select que inclua esta coluna falha para
-- a tabela toda, não só para a coluna nova).
GRANT SELECT (whop_manage_url) ON profiles TO authenticated;
