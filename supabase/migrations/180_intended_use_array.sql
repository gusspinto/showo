-- 180_intended_use_array.sql
-- IntentGate passou de escolha única para escolha múltipla ("Escolhe tudo o
-- que se aplica") — intended_use tem de guardar mais do que um valor.
-- Sem linhas reais a perder (ver 178: coluna só entrou em uso nesta sessão,
-- ninguém em produção tinha isto preenchido ainda), mas o USING protege
-- qualquer valor de teste que já lá esteja.

ALTER TABLE public.profiles
  ALTER COLUMN intended_use TYPE TEXT[]
  USING (CASE WHEN intended_use IS NULL THEN NULL ELSE ARRAY[intended_use] END);
