-- Dos alunos sem projeto, quantos voltam a entrar depois do registo?
-- Distingue "entrou, saiu, nunca mais voltou" (churn normal, não é bug)
-- de "voltou várias vezes e continua sem criar" (fricção real a repetir).

-- 1) Distribuição de nº de logins entre quem não tem projeto
select
  logins,
  count(*) as quantos_users
from (
  select p.id, count(a.*) as logins
  from profiles p
  left join activity_log a on a.user_id = p.id and a.action = 'login'
  left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
  where p.role = 'aluno' and pr.user_id is null
  group by p.id
) t
group by logins
order by logins;

-- 2) Dos que voltaram 2+ vezes sem nunca criar projeto — estes são o sinal
-- mais forte de fricção real (tiveram intenção, voltaram, e continuam presos)
select
  p.id,
  p.full_name,
  p.created_at as registo,
  count(a.*) as logins,
  max(a.created_at) as ultimo_login,
  (p.avatar_url ilike '%googleusercontent%') as veio_de_google
from profiles p
join activity_log a on a.user_id = p.id and a.action = 'login'
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role = 'aluno' and pr.user_id is null
group by p.id, p.full_name, p.created_at, p.avatar_url
having count(a.*) >= 2
order by logins desc;

-- 3) Google vs email, só entre quem não tem projeto — origem específica
select
  (p.avatar_url ilike '%googleusercontent%') as veio_de_google,
  count(*) as total_sem_projeto
from profiles p
left join (select distinct user_id from projects) pr on pr.user_id = p.id::text
where p.role = 'aluno' and pr.user_id is null
group by 1;
