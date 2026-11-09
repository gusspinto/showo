-- O Overview do Admin tentava contar projetos com diário via um select
-- direto do browser a project_journal_entries, mas essa tabela tem RLS
-- "read own or team" (migração do diário em equipa): o admin só via as
-- próprias entradas (quase sempre 0), nunca o total real. Mostrava "0%"
-- mesmo havendo 119 de 773 projetos com diário, confirmado à mão via SQL.
-- Mesmo padrão das outras funções admin_get_*: SECURITY DEFINER com
-- is_admin(), para contornar a RLS só para quem é mesmo admin.
CREATE OR REPLACE FUNCTION public.admin_get_journal_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'projects_with_journal', coalesce((SELECT count(DISTINCT project_id) FROM public.project_journal_entries), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
