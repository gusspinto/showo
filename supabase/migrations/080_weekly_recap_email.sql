-- ============================================================================
-- 080_weekly_recap_email.sql
-- ============================================================================
-- Email semanal do Recap, para quem tem plano Launch (pessoal) ou conta de
-- escola. Segue exatamente o mesmo padrão do relatório mensal do professor
-- (057/058): uma coluna de opt-in, uma de "última vez enviado" para o cron
-- poder correr mais do que uma vez sem duplicar emails, e um agendamento
-- pg_cron a chamar a edge function.
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
-- senão fetchProfile() não a consegue ler.
grant select (weekly_recap_email_opt_in)  on public.profiles to authenticated;
grant update (weekly_recap_email_opt_in)  on public.profiles to authenticated;
grant select (weekly_recap_email_sent_at) on public.profiles to authenticated;

-- Segunda-feira às 08:00 UTC — a semana que passou fecha ao domingo, por isso
-- o recap chega quando ainda dá para agir sobre ele.
--
-- IMPORTANTE — antes de correr esta migração, substituir
-- REPLACE_WITH_CRON_SECRET pelo valor real do secret CRON_SECRET
-- (Project Settings → Edge Functions → Secrets), tal como em 058 e 064.
create extension if not exists pg_net with schema extensions;

select cron.unschedule('send-weekly-recap')
where exists (select 1 from cron.job where jobname = 'send-weekly-recap');

select cron.schedule(
  'send-weekly-recap',
  '0 8 * * 1',
  $$
  select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-recap',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
