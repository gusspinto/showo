-- Pop-up de avaliação in-app, sugerido pelo Savvy Growth (reunião 04-11,
-- docs/checklist-growth-2026-11-04.md item 4): recolher testemunhos reais
-- dos utilizadores para alimentar os Stories de credibilidade, em vez do
-- link de feedback no canto (quase não é usado).
--
-- Dispara uma única vez por conta, quando o utilizador tem pelo menos um
-- projeto com score >= 71 ("Quase profissional", mesmo threshold usado em
-- Dashboard.jsx/UserProfile.jsx/Ranking.jsx), o momento em que a pessoa
-- já viu o produto a dar resultado, não logo na entrada.
--
-- GRANT explícito porque profiles tem lockdown de privilégios por coluna
-- (100_lock_sensitive_profile_columns.sql).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_popup_seen_at timestamptz;

GRANT SELECT (review_popup_seen_at), UPDATE (review_popup_seen_at)
  ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text,
  approved_for_marketing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Qualquer utilizador autenticado pode deixar o seu testemunho, só o seu
-- próprio (user_id tem de ser o dele). Sem select/update/delete para
-- authenticated: isto é só caixa de entrada, a curadoria é feita pelo admin
-- (approved_for_marketing) antes de qualquer testemunho ser usado a sério.
CREATE POLICY "authenticated pode inserir o seu testemunho"
  ON public.testimonials FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin le todos os testemunhos"
  ON public.testimonials FOR SELECT TO authenticated
  USING (public.is_admin());
