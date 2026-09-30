-- 181_profile_heard_from.sql
-- "Onde conheceste o Showo?" — novo passo do onboarding, antes do
-- IntentGate. Mesmo padrão do intended_use (178/179): sem GRANT SELECT
-- direto porque a policy base de profiles é USING(true) (aberta a
-- qualquer autenticado) — lê-se só via get_own_intent(), SECURITY DEFINER,
-- scoped a auth.uid().

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_from TEXT;
GRANT UPDATE (heard_from) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_own_intent()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'intended_use', intended_use,
    'pap_timing', pap_timing,
    'heard_from', heard_from
  )
  FROM public.profiles WHERE id = auth.uid();
$$;
