-- Antes, a página /vagas ficava totalmente bloqueada (ecrã cheio) para quem
-- não é Pro nem aluno de escola do 11º/12º. Mas a vaga publicada pela própria
-- Showo (Embaixador(a) Showo) devia ficar visível a toda a gente — é
-- recrutamento nosso, não faz sentido escondê-la atrás do Pro. A partir de
-- agora só as vagas futuras (de empresas reais) ficam reservadas ao Pro;
-- esta coluna marca as que ficam sempre visíveis, sem gate nenhum.
alter table vagas add column if not exists free_for_all boolean not null default false;

update vagas set free_for_all = true where id = 'cfa4c01a-cf34-4571-80ed-5ad03e15f43c';
