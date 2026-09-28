-- ============================================================================
-- 180_full_projects_profile_visible.sql
--
-- Incidente real (2026-09-28): Pedro Falcao criou um projeto "PAP"
-- (entry_kind='full', visibility='public') e ele nunca apareceu no seu
-- próprio perfil, nem no Excel de calls que contava projetos. Causa: 103
-- introduziu profile_featured (NOT NULL DEFAULT false) para a Biblioteca
-- escolher o que mostrar no perfil, e o próprio 103 fez um backfill nesse
-- dia para não esvaziar os perfis de quem já usava a app — mas esse
-- backfill correu uma vez só. Todo projeto "full" criado depois nasce com
-- profile_featured=false e fica invisível no perfil sem o dono ter feito
-- nenhuma escolha (não há ecrã nenhum a perguntar isto na criação).
--
-- Medido antes desta migration: 57 projetos full, 50 não-privados, 26
-- desses (52%) com profile_featured=false — mais de metade dos projetos
-- públicos da plataforma invisíveis no próprio perfil do dono.
--
-- Fix em duas partes:
--   1. saveProject.js passa a gravar profile_featured=true já na criação
--      (vale só para daqui em diante).
--   2. Este backfill cobre os que já existiam antes do fix de código.
--
-- Não mexe em entry_kind='library' (ficheiros da Biblioteca) — esses
-- continuam a exigir curadoria manual do dono, como a 093/103 desenharam.
-- ============================================================================

WITH ranked AS (
  SELECT
    p.id,
    p.user_id,
    row_number() OVER (
      PARTITION BY p.user_id
      ORDER BY p.score DESC NULLS LAST, p.created_at DESC
    ) AS rn,
    COALESCE((
      SELECT MAX(existing.profile_featured_order)
      FROM public.projects existing
      WHERE existing.user_id = p.user_id AND existing.profile_featured = true
    ), 0) AS base_order
  FROM public.projects p
  WHERE p.entry_kind = 'full'
    AND COALESCE(p.visibility, 'public') <> 'private'
    AND p.profile_featured = false
)
UPDATE public.projects p
SET profile_featured       = true,
    profile_featured_order = ranked.base_order + ranked.rn
FROM ranked
WHERE p.id = ranked.id;
