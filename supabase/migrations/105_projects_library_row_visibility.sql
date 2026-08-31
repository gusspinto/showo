-- ============================================================================
-- 105_projects_library_row_visibility.sql
--
-- O 103 concedeu a `anon` SELECT nas colunas library_* de `projects`. Como a
-- policy "Public read projects" era USING (true), isso passou a deixar
-- qualquer visitante (sem conta) ler o nome do ficheiro, a descrição e o
-- path de QUALQUER item da Biblioteca via API REST — incluindo os privados
-- que não estão marcados para o perfil. Os ficheiros em si continuam
-- protegidos (097 tornou o bucket privado; 104 só abre os que estão no
-- perfil), mas os metadados vazavam.
--
-- Fix ao nível da linha: a leitura pública de `projects` passa a distinguir
-- os dois tipos de entrada:
--   * entry_kind = 'full'    → público como sempre (a `visibility` privada
--                              continua a ser filtrada no cliente, modelo
--                              pré-existente, fora do âmbito deste fix)
--   * entry_kind = 'library' → só o dono, ou quando profile_featured = true
-- ============================================================================

DROP POLICY IF EXISTS "Public read projects" ON public.projects;

CREATE POLICY "Public read projects"
  ON public.projects FOR SELECT
  USING (
    entry_kind = 'full'
    OR profile_featured = true
    OR user_id = auth.uid()::text
  );
