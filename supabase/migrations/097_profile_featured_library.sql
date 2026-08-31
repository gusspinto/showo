-- ============================================================================
-- 097_profile_featured_library.sql — Editar perfil a partir da Biblioteca.
--
-- A secção "Projetos" do perfil público deixava de listar TODOS os projetos
-- "full" por score. Passa a mostrar só os itens que o dono marcou na
-- Biblioteca ("Mostrar no perfil"), pela ordem que ele definiu e no layout
-- que escolheu para cada um (tile com capa OU linha compacta). Vale para os
-- dois tipos de entrada: projetos criados (entry_kind='full') e ficheiros
-- adicionados (entry_kind='library', o portefólio).
--
--  * profile_featured        — aparece no perfil público?
--  * profile_featured_order  — posição (1..N) na grelha do perfil
--  * profile_layout          — 'tile' (capa) | 'row' (linha compacta)
--
-- Nota: o antigo `featured` / `featured_order` (070) continua a existir e a
-- servir o bloco "Em destaque" da dashboard do aluno — coisa separada, fora
-- do âmbito desta migration.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS profile_featured       boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_featured_order smallint,
  ADD COLUMN IF NOT EXISTS profile_layout         text     NOT NULL DEFAULT 'tile';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_profile_layout_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_profile_layout_check CHECK (profile_layout IN ('tile', 'row'));

CREATE INDEX IF NOT EXISTS projects_profile_featured_idx
  ON public.projects (user_id, profile_featured, profile_featured_order)
  WHERE profile_featured = true;

-- ── Backfill 1: quem já tinha destaques (featured) mantém-nos no perfil,
--    pela mesma ordem. Só projetos "full" — itens da Biblioteca nunca
--    estiveram no perfil até agora.
UPDATE public.projects
SET profile_featured       = true,
    profile_featured_order = COALESCE(featured_order, 1)
WHERE featured = true
  AND entry_kind = 'full'
  AND profile_featured = false;

-- ── Backfill 2: sem nenhum destaque escolhido, o perfil ficaria vazio de
--    repente (regressão visível). Promove os até 6 melhores projetos "full"
--    públicos de cada utilizador, por score. O dono ajusta depois na
--    Biblioteca. Só corre para utilizadores que não têm nada marcado.
WITH ranked AS (
  SELECT
    p.id,
    p.user_id,
    row_number() OVER (
      PARTITION BY p.user_id
      ORDER BY p.score DESC NULLS LAST, p.created_at DESC
    ) AS rn
  FROM public.projects p
  WHERE p.entry_kind = 'full'
    AND COALESCE(p.visibility, 'public') <> 'private'
)
UPDATE public.projects p
SET profile_featured       = true,
    profile_featured_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id
  AND ranked.rn <= 6
  AND NOT EXISTS (
    SELECT 1 FROM public.projects existing
    WHERE existing.user_id = ranked.user_id
      AND existing.profile_featured = true
  );

-- ── Grants: o perfil público é lido por anon e por authenticated. As colunas
--    novas + as da Biblioteca (que 092/094 criaram sem grant) têm de estar
--    acessíveis para o fetch do perfil não falhar em silêncio — ver 079/089,
--    o mesmo problema já aconteceu antes.
GRANT SELECT (
  profile_featured, profile_featured_order, profile_layout,
  entry_kind,
  library_description, library_file_url, library_file_name,
  library_file_type, library_thumb_url
) ON public.projects TO anon;

GRANT SELECT (
  profile_featured, profile_featured_order, profile_layout,
  entry_kind,
  library_description, library_file_url, library_file_name,
  library_file_type, library_thumb_url
) ON public.projects TO authenticated;
