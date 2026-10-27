-- O percurso (timeline) de um projeto só aparece a quem vê a página pública
-- quando projects.timeline_public = true, e essa coluna nascia sempre a
-- false (128_project_timeline.sql), escondida dentro da aba Missões, sem
-- nenhum aviso ao aluno de que existia. Na prática, quase nenhum projeto
-- real tinha o percurso visível a um recrutador ou professor, mesmo quando
-- o diário estava bem preenchido.
--
-- Passa a default true: todo o projeto novo já nasce com o percurso visível.
-- Os projetos existentes também passam a true, porque não há forma de
-- distinguir "nunca mexeu nisto" de "desligou de propósito" numa coluna
-- boolean só, e dado o quão escondido o interruptor estava, é seguro assumir
-- que a esmagadora maioria nunca o tocou.

ALTER TABLE public.projects ALTER COLUMN timeline_public SET DEFAULT true;

UPDATE public.projects SET timeline_public = true WHERE timeline_public = false;
