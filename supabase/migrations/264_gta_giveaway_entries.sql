-- Confirmação real de participação no sorteio do GTA VI (campanha 24/11).
-- Antes disto não existia nenhum registo de quem realmente "entrou" no
-- sorteio, só a presunção de que ter um projeto publicado contava. O
-- Gustavo pediu um clique explícito de confirmação, para (1) dar às
-- pessoas a sensação real de participação, e (2) dar uma lista honesta
-- de participantes para escolher o vencedor, em vez de inventar critério
-- no fim.
create table public.gta_giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now()
);

alter table public.gta_giveaway_entries enable row level security;

create policy "Users can view own gta entry"
  on public.gta_giveaway_entries for select
  using (auth.uid() = user_id);

create policy "Users can confirm own gta entry"
  on public.gta_giveaway_entries for insert
  with check (auth.uid() = user_id);

-- Só authenticated, nunca anon: confirmar participação exige sessão iniciada.
grant select, insert on public.gta_giveaway_entries to authenticated;
