-- ============================================================================
-- 027_lockdown_public_reads.sql — Fecha leituras públicas indevidas
-- ============================================================================
-- 1.2 — profiles.email e profiles.project_draft eram lidos por anon (scraping público
--       de emails, exposição de rascunhos jsonb privados). Revoga só ao anon; o dono
--       autenticado continua a ler os próprios via authenticated.
-- 1.3 — class_members tinha SELECT qual=true (qualquer pessoa mapeia a escola inteira:
--       alunos + turmas + professores). Passa a exigir ser membro da mesma turma ou o
--       professor dono. Usa função SECURITY DEFINER para evitar recursão de RLS.
-- 1.4 — Remove policies duplicadas em projects e candidaturas (dívida perigosa:
--       apertar uma deixa a outra aberta silenciosamente).
-- ============================================================================

-- ── 1.2 ─────────────────────────────────────────────────────────────────────
revoke select (email)         on public.profiles from anon;   -- anon deixa de conseguir listar emails
revoke select (project_draft) on public.profiles from anon;   -- anon deixa de ler rascunhos privados

-- ── 1.3 ─────────────────────────────────────────────────────────────────────
create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and user_id = auth.uid()
  );
$$;                                                            -- definer evita recursão da própria policy

drop policy if exists "class_members_select" on public.class_members;
create policy "class_members_select" on public.class_members
  for select using (
    auth.uid() = user_id                                       -- vejo a minha própria adesão
    or public.is_class_member(class_id)                        -- ou sou colega da mesma turma
    or auth.uid() = (
      select teacher_id from public.classes where id = class_id
    )                                                          -- ou sou o professor dono da turma
  );

-- ── 1.4 ─────────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can read projects" on public.projects;                                 -- duplicado de "Public read projects" (005)
drop policy if exists "Recruiters can update candidaturas for their vagas" on public.candidaturas;    -- duplicado de cand_recruiter_update
