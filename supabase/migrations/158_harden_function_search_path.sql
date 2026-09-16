-- ============================================================================
-- 158_harden_function_search_path.sql
--
-- Security Advisor: "Function Search Path Mutable" em ~60 funções (quase
-- todas SECURITY DEFINER). Sem search_path fixo, uma função SECURITY
-- DEFINER que referencia objetos sem qualificar o esquema pode ser
-- sequestrada — um atacante cria um objeto com o mesmo nome num esquema
-- que vem antes na search_path da sessão, e a função passa a executar
-- código dele com os privilégios elevados do dono da função. Fixar
-- search_path = public, pg_temp elimina essa superfície de ataque sem
-- mudar nenhum comportamento (é o esquema que já usavam implicitamente).
--
-- Duas correções extra encontradas na mesma auditoria:
--
-- 1. cleanup_orphan_projects() não tinha NENHUMA verificação de
--    autenticação e tinha EXECUTE concedido a anon — qualquer visitante
--    sem sessão conseguia disparar a limpeza à vontade. O risco real é
--    baixo (só apaga projetos já órfãos, user_id nulo, >24h), mas não há
--    razão para estar acessível ao cliente — só deve correr via cron
--    (service_role, que ignora GRANT/REVOKE de qualquer forma).
--
-- 2. delete_account_transfer() nunca verificava auth.uid() IS NULL
--    explicitamente — funcionalmente inofensivo hoje (auth.uid() NULL
--    faz as comparações "= NULL" falharem sempre, portanto um chamador
--    anónimo não fazia nada), mas frágil e inconsistente com o resto do
--    codebase. Adicionada a verificação explícita.
-- ============================================================================

ALTER FUNCTION public.get_class_by_code(p_code text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_classes_with_codes() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_users() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_project_grades(p_project_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_ics_token() SET search_path = public, pg_temp;
ALTER FUNCTION public.register_institutional_student(p_class_code text, p_email text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_finance_summary(p_since timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_own_profile(p_full_name text, p_username text, p_bio text, p_phone text, p_role text, p_available_for_work boolean, p_skills text[], p_area text, p_school text, p_monthly_report_opt_in boolean, p_notify_newsletter boolean, p_notify_marketing boolean, p_notify_product_updates boolean, p_notify_project_activity boolean, p_profile_visibility text, p_show_email_publicly boolean, p_company text, p_company_role text, p_company_website text, p_linkedin_url text, p_looking_for text, p_company_description text, p_company_location text, p_company_industry text, p_company_size text, p_occupation text) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_project_views(project_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_profile_views(profile_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_xp(p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_user_by_email(p_email text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_class(p_class_id uuid, p_name text, p_subject text) SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_class_member(p_class_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_ai_limit(p_user_id text, p_feature text) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_comment() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_like() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_notification(p_user_id uuid, p_type text, p_message text, p_project_slug text) SET search_path = public, pg_temp;
ALTER FUNCTION public.join_class(p_code text) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_ics_token() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_max_projects() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_class(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_professor_invite_code(p_label text, p_max_uses integer, p_org_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_ai_usage(p_feature text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ai_usage() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_funnel_summary(p_since timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_create_ambassador(target_user_id uuid, code text, rate numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_referral(code text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ambassador_stats() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_billing_summary(p_since timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_profile_privesc() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_class_member(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_vaga_invite() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_interest_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_mensagens_update() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_likes_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_delete_user(target_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_candidatura_insert() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_candidatura_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_recruiter_interest() SET search_path = public, pg_temp;
ALTER FUNCTION public.reopen_teacher_feedback(p_feedback_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_professor_invite_code(p_label text, p_max_uses integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_professor_invite_code_active(p_code_id uuid, p_active boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_ai_usage_summary(p_month text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_project_review_status(p_project_id uuid, p_status text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_activity_stats(p_days integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pending_invites() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_project_in_my_class(p_project_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.redeem_professor_invite_code(p_code text, p_full_name text, p_school text) SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_teacher_feedback(p_feedback_id uuid, p_note text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_project_teacher_score(p_project_id uuid, p_score numeric, p_note text, p_ratings jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_class_email(p_code text, p_email text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_class(p_class_id uuid, p_name text, p_subject text, p_academic_year text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_partner_company_invite_info(p_token uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_partner_company_invite(p_token uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_lead_with_company(p_company_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_claimed_company(p_company_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.leave_class(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_project_resubmitted(p_project_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_delete_project(p_project_id uuid) SET search_path = public, pg_temp;

-- ── cleanup_orphan_projects: deixa de ser chamável pelo cliente ────────────
REVOKE EXECUTE ON FUNCTION public.cleanup_orphan_projects() FROM anon, authenticated;

-- ── delete_account_transfer: verificação explícita de autenticação ────────
CREATE OR REPLACE FUNCTION public.delete_account_transfer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id text := auth.uid()::text;
  proj      record;
  new_owner text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  FOR proj IN SELECT id FROM projects WHERE user_id = v_user_id LOOP
    SELECT user_id INTO new_owner
    FROM project_collaborators
    WHERE project_id = proj.id AND status = 'accepted'
    ORDER BY created_at ASC LIMIT 1;

    IF new_owner IS NOT NULL THEN
      UPDATE projects SET user_id = new_owner WHERE id = proj.id;
      DELETE FROM project_collaborators WHERE project_id = proj.id AND user_id = new_owner;
    ELSE
      DELETE FROM projects WHERE id = proj.id;
    END IF;
  END LOOP;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$;
