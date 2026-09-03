-- ============================================================
-- 116 — Corrige grants de public.classes (criar turma dava
--       "permission denied for table classes").
-- ------------------------------------------------------------
-- A migração 065 fez column-grant SELECT em classes, mas não
-- incluiu as colunas adicionadas depois:
--   · show_ranking      (067)
--   · school_domain_id  (082)
-- O CreateTurmaModal faz `.insert(...).select()` (SELECT *), que
-- toca nessas colunas e chumba.
--
-- Também garante INSERT/UPDATE/DELETE para `authenticated` — a RLS
-- é que decide quem pode: só professores criam (policy
-- "Professor insert class", 101) e só o dono edita/apaga.
-- ============================================================

GRANT SELECT (show_ranking, school_domain_id) ON public.classes TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.classes TO authenticated;
