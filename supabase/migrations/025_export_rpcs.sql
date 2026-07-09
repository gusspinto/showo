-- ============================================================
-- 025 — Export manually-created RPCs into version control
-- Functions: delete_anon_project, delete_account_transfer,
--            admin_set_user_role
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_anon_project(p_slug text, p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM projects WHERE slug = p_slug AND edit_token = p_token AND user_id IS NULL;
  RETURN FOUND;
END;
$$;

-- Only anon and authenticated can call this (owner has edit_token)
GRANT EXECUTE ON FUNCTION public.delete_anon_project(text, text) TO anon, authenticated;

-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_account_transfer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  proj      record;
  new_owner text;
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION public.delete_account_transfer() TO authenticated;

-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF new_role NOT IN ('aluno', 'professor', 'recrutador', 'empresa') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;
