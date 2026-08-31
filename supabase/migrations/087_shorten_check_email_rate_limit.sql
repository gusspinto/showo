-- ============================================================
-- 087 — Encurtar o cooldown do check_email_exists
-- ------------------------------------------------------------
-- A janela era 1 hora fixa (date_trunc('hour', now())) com limite
-- de 5. Pior caso: quem batesse no limite perto do minuto 1 ficava
-- bloqueado quase 59 minutos, mesmo a tentar entrar na própria conta.
-- Passa a uma janela de 10 minutos com limite 8 — continua a travar
-- enumeração de emails em massa, mas o pior caso de espera cai para
-- ~10 minutos em vez de quase 1 hora.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_fn_rate_limit(p_key text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_win integer := (extract(epoch from now())::integer / 600) * 600; -- floor a 10 min
  cur_cnt integer;
BEGIN
  INSERT INTO public.fn_rate_limits (key, win, cnt)
  VALUES (p_key, cur_win, 1)
  ON CONFLICT (key, win) DO UPDATE
    SET cnt = fn_rate_limits.cnt + 1
  RETURNING cnt INTO cur_cnt;
  RETURN cur_cnt <= p_limit;
END;
$$;

-- 8 checks por IP a cada 10 minutos (era 5 por hora)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  ip       text;
  allowed  boolean;
BEGIN
  BEGIN
    ip := split_part(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ',', 1
    );
  EXCEPTION WHEN OTHERS THEN
    ip := NULL;
  END;

  ip := trim(coalesce(ip, 'unknown'));
  IF ip = '' THEN ip := 'unknown'; END IF;

  SELECT check_fn_rate_limit(ip || ':check_email', 8) INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
END;
$$;

-- Limpa entradas com mais de 30 minutos em vez de 2 horas — as
-- janelas agora são de 10 min, não há razão para guardar mais tempo.
SELECT cron.unschedule('cleanup-rate-limits');
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/10 * * * *',
  $$DELETE FROM public.fn_rate_limits WHERE win < extract(epoch from now() - interval '30 minutes')::integer$$
);

-- Alívio imediato: limpa já as contagens existentes desta função,
-- para quem está bloqueado agora não ter de esperar pela janela antiga.
DELETE FROM public.fn_rate_limits WHERE key LIKE '%:check_email';
