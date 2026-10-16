-- Liga o código de embaixador a um código promocional real do Stripe, para
-- a pessoa poder usá-lo diretamente no checkout (escrito em voz alta num
-- vídeo, por exemplo) em vez de depender só do link ?ref=. Guarda o id do
-- coupon Stripe criado para cada embaixadora; o código em si continua a
-- viver em ambassadors.referral_code (reaproveitado também como o texto do
-- promotion code no Stripe).
alter table ambassadors add column if not exists stripe_coupon_id text;
