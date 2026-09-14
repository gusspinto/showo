-- Testa se o PhoneGate é mesmo um ponto de fuga, em vez de assumir.
-- Corre no SQL Editor do Supabase.

-- 1) Quantos alunos/recrutadores/empresas (quem passa pelo PhoneGate)
-- ficaram parados sem telefone, e destes quantos também não têm projeto
-- (ou seja: ficaram mesmo presos, sem saída nenhuma)
select
  count(*) as total,
  count(*) filter (where phone is null) as sem_telefone,
  round(100.0 * count(*) filter (where phone is null) / count(*), 1) as pct_sem_telefone
from profiles
where role != 'professor';

-- 2) Cruza com projetos: de quem não tem telefone, quantos também
-- não têm projeto nenhum (ou seja, nunca passaram do gate)
select
  count(*) as total_sem_telefone,
  count(*) filter (where pr.user_id is null) as tambem_sem_projeto
from profiles p
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role != 'professor' and p.phone is null;

-- 3) Comparação: taxa de "sem projeto" entre quem TEM telefone vs quem NÃO tem
-- Se for parecida, o PhoneGate não é o problema. Se for muito maior em quem
-- não tem telefone, é sinal de que ficam presos ali.
select
  (p.phone is not null) as tem_telefone,
  count(*) as total,
  count(*) filter (where pr.user_id is null) as sem_projeto,
  round(100.0 * count(*) filter (where pr.user_id is null) / count(*), 1) as pct_sem_projeto
from profiles p
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role = 'aluno'
group by 1;
