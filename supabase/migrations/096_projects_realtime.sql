-- ============================================================================
-- 096_projects_realtime.sql — a Biblioteca subscreve UPDATEs em projects
-- para a thumbnail de um item aparecer sozinha assim que fica pronta (gerada
-- em segundo plano depois de "Adicionar"), sem o user ter de recarregar a
-- página à mão.
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
