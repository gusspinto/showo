-- ============================================================================
-- 123_profile_occupation.sql — "O que fazes" na conta Individual
--
-- Campo livre de ocupação (Aluno/A estudar, Freelancer, CEO, Developer...)
-- para quem se regista como Individual e não é literalmente "aluno" — mas
-- serve qualquer conta. Aparece no perfil público, tal como area/school.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS occupation text;

-- Leitura pública (perfil público mostra a ocupação, tal como a área).
GRANT SELECT (occupation) ON public.profiles TO anon;
GRANT SELECT (occupation) ON public.profiles TO authenticated;

-- Escrita: o 100_lock_sensitive_profile_columns trancou o UPDATE de
-- profiles a uma lista de colunas — occupation é segura de editar pelo
-- próprio, tal como area/skills.
GRANT UPDATE (occupation) ON public.profiles TO authenticated;
