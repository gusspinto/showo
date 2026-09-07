-- narrative and exportPptx are generated client-side (no edge function), so
-- their usage was never actually recorded server-side — check_ai_limit only
-- ever ran inside edge functions with the service-role key. Free users could
-- generate unlimited narratives/PowerPoints regardless of the plan limit.
--
-- check_ai_limit itself was also grantable to anon/authenticated with an
-- arbitrary p_user_id — anyone could burn another user's monthly quota.
-- Lock it down to service_role only, and add a self-service RPC that trusts
-- auth.uid() instead of a caller-supplied id for the client-only features.

REVOKE EXECUTE ON FUNCTION public.check_ai_limit(text, text) FROM PUBLIC, anon, authenticated;

-- Stale overload from before user_id was migrated to text — unused (no
-- caller passes a uuid), and dangerous to leave reachable by anon/authenticated.
DROP FUNCTION IF EXISTS public.check_ai_limit(uuid, text);

CREATE OR REPLACE FUNCTION public.consume_ai_usage(p_feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.check_ai_limit(auth.uid()::text, p_feature);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(text) TO authenticated;
