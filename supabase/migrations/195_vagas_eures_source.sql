-- Permite distinguir vagas publicadas por utilizadores reais ('showo', a
-- maioria) das importadas automaticamente de fontes externas como o EURES.
-- external_id evita duplicar a mesma vaga em sincronizações repetidas.
alter table vagas add column if not exists source text not null default 'showo';
alter table vagas add column if not exists external_id text;
create unique index if not exists vagas_external_id_uniq on vagas(external_id) where external_id is not null;

-- Vagas importadas têm empregadores diferentes entre si, mas
-- recruiter_id tem de ser sempre a mesma conta-sistema (um utilizador
-- real é exigido pela FK). Sem isto, todas as vagas EURES mostrariam o
-- mesmo nome de empresa (o da conta-sistema), o que seria falso.
alter table vagas add column if not exists employer_name text;
alter table vagas add column if not exists employer_url text;
