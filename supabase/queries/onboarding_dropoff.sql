-- Quantifica quantos alunos se registam mas nunca chegam a criar um projeto.
-- Corre no SQL Editor do Supabase. Ajusta o filtro de role se necessário
-- (contas institucionais/professor não deviam entrar nesta contagem).
--
-- projects.user_id está como text na base de dados real (diferente da
-- migration 001 no repo, que o define como uuid) — daí os casts ::text
-- abaixo. Se o teu erro for o oposto ("uuid = text"), inverte o cast
-- (::uuid em vez de p.id::text).

-- 1) Visão geral por semana: quantos registos, quantos ficaram sem projeto
select
  date_trunc('week', p.created_at) as semana,
  count(*) as total_registos,
  count(*) filter (where pr.user_id is null) as sem_projeto,
  round(100.0 * count(*) filter (where pr.user_id is null) / count(*), 1) as pct_sem_projeto
from profiles p
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role = 'aluno'
group by 1
order by 1 desc;

-- 2) De quem CRIA projeto, quanto tempo demora desde o registo?
-- (útil para perceber se quem cria, cria "logo" ou só passado dias)
select
  p.id,
  p.created_at as registo,
  min(pj.created_at) as primeiro_projeto,
  min(pj.created_at) - p.created_at as tempo_ate_criar
from profiles p
join projects pj on pj.user_id = p.id::text
where p.role = 'aluno'
group by p.id, p.created_at
order by tempo_ate_criar desc
limit 200;

-- 3) Segmenta os "sem projeto" por origem de registo (Google vs email,
-- referrer/utm) — ajuda a ver se o problema é mais forte num caminho
select
  p.signup_utm_source,
  p.signup_referrer,
  count(*) as total,
  count(*) filter (where pr.user_id is null) as sem_projeto,
  round(100.0 * count(*) filter (where pr.user_id is null) / count(*), 1) as pct_sem_projeto
from profiles p
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role = 'aluno'
group by 1, 2
order by total desc
limit 30;
