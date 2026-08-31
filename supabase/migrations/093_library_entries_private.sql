-- ============================================================================
-- 093_library_entries_private.sql — corrige exposição: itens da Biblioteca
-- (entry_kind='library') herdavam visibility='public' por omissão da coluna,
-- ficavam a aparecer no Explorar e acessíveis a qualquer um via /projeto/:slug
-- mesmo estando completamente vazios (só têm ficheiro+nome+descrição, nunca
-- preenchem a ficha). Backfill dos que já existem; o insert em NewProject.jsx
-- já passa a mandar 'private' desde a origem daqui para a frente.
-- ============================================================================

UPDATE public.projects
SET visibility = 'private'
WHERE entry_kind = 'library' AND visibility <> 'private';
