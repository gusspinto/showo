-- ============================================================
-- 120 — handle_new_user à prova de bala: nunca faz falhar o signup.
-- ------------------------------------------------------------
-- Sintoma: TODOS os registos por formulário davam "Database error
-- saving new user" — o trigger AFTER INSERT em auth.users estava a
-- lançar exceção, e no Postgres uma exceção num trigger AFTER INSERT
-- faz rollback da transação inteira → o auth.users nem chega a existir.
--
-- Causa exata ainda por confirmar (constraint nova em profiles, outro
-- trigger BEFORE INSERT, CHECK no role, etc.). Enquanto isso:
--   1. tenta o insert completo
--   2. se falhar, tenta um insert mínimo (só o id — o resto tem default)
--   3. se AINDA falhar, engole o erro e regista um WARNING
-- Em qualquer dos casos o RETURN NEW deixa o signup terminar.
--
-- Pior caso: conta criada sem linha de perfil (o backfill/registo trata),
-- que é MUITO melhor do que "não consigo criar conta".
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, avatar_url)
    VALUES (
      NEW.id,
      coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      'aluno',
      nullif(
        regexp_replace(
          coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
          '=s\d+-c$', '=s400-c'
        ),
        ''
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user full insert failed for % : % (%)', NEW.id, SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user minimal insert also failed for % : % (%)', NEW.id, SQLERRM, SQLSTATE;
    END;
  END;

  RETURN NEW;
END;
$$;

-- garante que o trigger continua ligado a esta função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill de quem ficou sem perfil (idempotente)
INSERT INTO public.profiles (id, full_name, role)
SELECT u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       'aluno'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
