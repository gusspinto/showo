-- ============================================================
-- 115 — Criar a linha de public.profiles no servidor, via trigger.
-- ------------------------------------------------------------
-- Até agora a linha de perfil era criada pelo cliente
-- (AuthContext.fetchProfile) com um .upsert(). O PostgREST
-- traduz upsert para INSERT ... ON CONFLICT DO UPDATE, e o
-- Postgres exige privilégio UPDATE em TODAS as colunas do SET
-- mesmo sem conflito. A migração 100 revogou UPDATE em `role`
-- e `id` de propósito (anti-privesc) — logo, desde a 100,
-- nenhum utilizador novo conseguia criar o próprio perfil (403),
-- e ficava sem dashboard e com "perfil não encontrado".
--
-- Um trigger SECURITY DEFINER em auth.users resolve de vez:
-- corre como dono da função, não depende dos grants do cliente.
-- Padrão standard do Supabase (User Management quickstart).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    coalesce(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    'aluno',
    nullif(
      regexp_replace(
        coalesce(
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'picture',
          ''
        ),
        '=s\d+-c$', '=s400-c'
      ),
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill: quem se registou desde a migração 100 e ficou sem perfil ──
INSERT INTO public.profiles (id, full_name, role, avatar_url)
SELECT
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  'aluno',
  nullif(
    regexp_replace(
      coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''),
      '=s\d+-c$', '=s400-c'
    ),
    ''
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
