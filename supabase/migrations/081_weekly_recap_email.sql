-- ============================================================================
-- 081_weekly_recap_email.sql
-- ============================================================================
-- Email semanal do Recap, para quem tem plano Launch (pessoal) ou conta de
-- escola. Segue o padrão do relatório mensal do professor (057/058): uma
-- coluna de opt-in, uma de "última vez enviado" para o cron poder correr mais
-- do que uma vez sem duplicar emails, e um agendamento pg_cron a chamar a
-- edge function.
--
-- Opt-in a true por omissão, ao contrário do relatório do professor: o recap
-- semanal é uma funcionalidade paga que o aluno escolheu ao subscrever o
-- Launch — não faria sentido ele pagar e ter de a ligar. Sai em Definições
-- num clique, e cada email leva a ligação para lá.
--
-- Nenhuma das colunas está na lista protegida do guard_profile_privesc
-- (is_admin, role, banned_at, total_xp), por isso a política "Own profile
-- update" já existente permite ao aluno mudar o seu próprio toggle.
-- ============================================================================

alter table public.profiles
  add column if not exists weekly_recap_email_opt_in  boolean not null default true,
  add column if not exists weekly_recap_email_sent_at timestamptz;

-- 065 usa grants por coluna: qualquer coluna nova tem de ser explicitada,
-- senão o Settings não a consegue ler nem escrever.
grant select (weekly_recap_email_opt_in)  on public.profiles to authenticated;
grant update (weekly_recap_email_opt_in)  on public.profiles to authenticated;
grant select (weekly_recap_email_sent_at) on public.profiles to authenticated;

-- ── Agendamento ─────────────────────────────────────────────────────────────
-- Segunda-feira às 08:00 UTC: a semana fecha ao domingo, por isso o recap
-- chega quando ainda dá para agir sobre ele.
--
-- Ao contrário da 058 e da 064, esta migração NÃO tem um
-- REPLACE_WITH_CRON_SECRET para alguém substituir à mão antes de a correr.
-- O segredo já vive no `command` dos jobs agendados por essas migrações, e é
-- de lá que o vamos buscar. Ganhamos três coisas: o ficheiro pode ser
-- committado e corrido como está, o segredo nunca aparece no repo nem no
-- terminal de quem aplica a migração, e se um dia ele for rodado basta
-- reagendar os jobs em vez de editar migrações antigas.
create extension if not exists pg_net with schema extensions;

do $mig$
declare
  v_secret text;
begin
  -- Qualquer job existente serve: todos usam o mesmo CRON_SECRET.
  select (regexp_match(command, 'x-cron-secret''\s*,\s*''([^'']+)'''))[1]
    into v_secret
  from cron.job
  where command like '%x-cron-secret%'
    and jobname <> 'send-weekly-recap'
  limit 1;

  -- Falhar aqui, alto, é melhor do que agendar um job com um segredo vazio
  -- que ia levar 401 todas as segundas sem ninguém dar por isso.
  if v_secret is null or length(v_secret) = 0 then
    raise exception
      'Não encontrei o x-cron-secret em nenhum cron job existente. Agenda primeiro a 058 ou a 064, ou cria este job à mão com o valor do secret CRON_SECRET.';
  end if;

  if exists (select 1 from cron.job where jobname = 'send-weekly-recap') then
    perform cron.unschedule('send-weekly-recap');
  end if;

  perform cron.schedule(
    'send-weekly-recap',
    '0 8 * * 1',
    format(
      $job$
      select net.http_post(
        url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-recap',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L),
        body := '{}'::jsonb
      );
      $job$,
      v_secret
    )
  );
end
$mig$;
