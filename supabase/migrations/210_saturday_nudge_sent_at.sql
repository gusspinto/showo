-- Campanha semanal de sábado (empurrão de ativação/score). Guarda quando
-- cada utilizador recebeu o último email desta campanha, para o cron não
-- reenviar na mesma semana se correr mais que uma vez. É só service-role
-- a escrever isto (cron), por isso sem GRANT nenhum ao authenticated,
-- mesmo padrão de plan_expires_at.
ALTER TABLE public.profiles ADD COLUMN saturday_nudge_sent_at timestamptz;
