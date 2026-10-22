-- O fix anterior (202, e o dedupe por calendário no AuthContext.jsx) reduziu
-- mas não eliminou logins duplicados: é uma verificação no cliente, que lê
-- last_active_at ANTES de qualquer tab escrever o novo valor. Duas tabs (ou
-- dois disparos próximos de INITIAL_SESSION/SIGNED_IN) leem o mesmo
-- last_active_at antigo, concluem as duas "não é o mesmo dia" e inserem as
-- duas. Confirmado em produção depois do fix: users com 2 a 4 logins no
-- mesmo dia em 20/21 de outubro, mesmo já com o dedupe no cliente ativo.
-- Condição de corrida no cliente nunca se resolve no cliente. A correção
-- correta é um índice único a nível de BD, que a aceita a primeira
-- inserção do dia e rejeita (silenciosamente) as seguintes.

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS occurred_on date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS activity_log_login_once_per_day
  ON public.activity_log (user_id, occurred_on)
  WHERE action = 'login';

-- RPC em vez de insert direto do cliente: o ON CONFLICT ... DO NOTHING
-- precisa de correr no servidor, o cliente não pode fazer upsert contra um
-- índice parcial via REST simples.
CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, action)
  VALUES (auth.uid(), 'login')
  ON CONFLICT (user_id, occurred_on) WHERE action = 'login' DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated;
