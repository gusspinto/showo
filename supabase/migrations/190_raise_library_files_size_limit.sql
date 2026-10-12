-- Sobe o limite do bucket 'library-files' de 15MB para 25MB.
--
-- Feedback de users: "documento é muito grande" era barreira para quem
-- queria mesmo trazer um trabalho completo (relatório de PAP com imagens,
-- apresentação inteira). 25MB fica acima do limite de 20MB que o fluxo de
-- "Cria o teu trabalho" (import-project) já aceita para análise por IA —
-- um ficheiro que passa por lá tem sempre espaço para ser guardado aqui a
-- seguir. Armazenamento em si não tem o teto de 32MB da Claude API, por
-- isso não há motivo técnico para ficar mais apertado que isso.
UPDATE storage.buckets SET file_size_limit = 26214400 -- 25 MB
WHERE id = 'library-files';
