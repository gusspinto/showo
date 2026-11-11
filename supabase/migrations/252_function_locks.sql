-- Causa real dos envios duplicados na campanha "tempestade" (11 nov 2026):
-- disparei send-campaign-storm várias vezes seguidas achando que a ronda
-- anterior tinha morrido (o erro via pg_net era só o lado a desistir de
-- esperar a resposta), mas a execução anterior continuava mesmo a correr
-- por trás. Duas execuções sobrepostas processam as mesmas pessoas do
-- início da lista em paralelo, cada uma sem saber da outra, 189 pessoas
-- receberam o mesmo email até 6 vezes.
--
-- Lock simples por nome de função, com expiração (stale), para uma
-- segunda chamada enquanto a primeira ainda está a correr desistir em vez
-- de duplicar. Não usa pg_advisory_lock porque a ligação da edge function
-- ao Postgres (via PostgREST) não é persistente, o lock de sessão não
-- sobreviveria entre chamadas.
CREATE TABLE IF NOT EXISTS public.function_locks (
  name text PRIMARY KEY,
  locked_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION public.try_acquire_function_lock(p_name text, p_stale_minutes int DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_acquired boolean;
BEGIN
  INSERT INTO public.function_locks (name, locked_at)
  VALUES (p_name, now())
  ON CONFLICT (name) DO UPDATE
    SET locked_at = now()
    WHERE public.function_locks.locked_at < now() - make_interval(mins => p_stale_minutes)
  RETURNING true INTO v_acquired;

  RETURN coalesce(v_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_function_lock(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.function_locks WHERE name = p_name;
END;
$$;

-- Só as próprias edge functions (service_role) devem conseguir chamar
-- isto, nunca anon/authenticated.
REVOKE ALL ON FUNCTION public.try_acquire_function_lock(text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_function_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_function_lock(text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_function_lock(text) TO service_role;
