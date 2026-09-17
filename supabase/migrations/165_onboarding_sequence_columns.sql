-- ============================================================================
-- 165_onboarding_sequence_columns.sql
--
-- Sequência de onboarding de 5 dias (ver docs/onboarding-email-sequence-draft.md).
-- O dia 0 já existe (send-welcome-email, imediato no signup, não mexido
-- aqui). Estas colunas servem só para os dias 1 a 4/5, que ainda não têm
-- automação nenhuma.
--
-- onboarding_sequence_step começa NULL, não 0, de propósito: um DEFAULT
-- normal aplicava-se também às ~220 contas já existentes, e a cópia dos
-- emails (dia 1: "já reparaste que o ChatGPT..."; dia 3: testemunhos, etc.)
-- pressupõe alguém que ACABOU de criar conta, não fazia sentido nenhum para
-- quem já usa a Showo há semanas.
--
-- Para matricular só quem se regista a partir de agora, a primeira versão
-- desta migration usava um trigger BEFORE INSERT novo em profiles. Corrigido
-- antes de aplicar: o comentário da 120_resilient_handle_new_user.sql avisa
-- que foi exatamente um "outro trigger BEFORE INSERT" em profiles que já
-- partiu TODOS os registos novos no passado (rollback da transação inteira
-- em auth.users). Em vez de arriscar outro trigger novo, a matrícula entra
-- dentro da própria handle_new_user, que já corre dentro de um bloco com
-- tratamento de exceção pensado para nunca fazer o signup falhar.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_sequence_step INT,
  ADD COLUMN IF NOT EXISTS onboarding_sequence_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_opted_out BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, avatar_url, onboarding_sequence_step)
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
      ),
      0
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user full insert failed for % : % (%)', NEW.id, SQLERRM, SQLSTATE;
    BEGIN
      INSERT INTO public.profiles (id, onboarding_sequence_step) VALUES (NEW.id, 0) ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user minimal insert also failed for % : % (%)', NEW.id, SQLERRM, SQLSTATE;
    END;
  END;

  RETURN NEW;
END;
$$;

-- o trigger em si (on_auth_user_created) já existe desde a 120, não muda.
