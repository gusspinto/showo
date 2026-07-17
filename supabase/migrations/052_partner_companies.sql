-- ============================================================================
-- 052_partner_companies.sql
-- ============================================================================
-- Lets a professor keep a private directory of partner companies (places
-- they know take interns) and track, per student, where each lead stands
-- (interessado -> contactado -> resposta -> entrevista -> aceite/recusado).
-- This is the professor's own tool, not a public company listing — unrelated
-- to the "empresa" account role (EmpresaPage.jsx) which is a different
-- concept (companies that use Showo themselves to post vagas).
--
-- Students get read-only visibility into leads that involve them (and the
-- company they point to), so they can see what their professor is doing on
-- their behalf without being able to edit any of it.
-- ============================================================================

create table if not exists public.partner_companies (
  id            uuid        primary key default gen_random_uuid(),
  teacher_id    uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  sector        text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists partner_companies_teacher_idx on public.partner_companies(teacher_id);

create table if not exists public.internship_leads (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        not null references public.partner_companies(id) on delete cascade,
  teacher_id    uuid        not null references auth.users(id) on delete cascade,
  student_id    uuid        not null references auth.users(id) on delete cascade,
  status        text        not null default 'interessado'
                check (status in ('interessado', 'contactado', 'resposta', 'entrevista', 'aceite', 'recusado')),
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (company_id, student_id)
);

create index if not exists internship_leads_teacher_idx on public.internship_leads(teacher_id);
create index if not exists internship_leads_student_idx on public.internship_leads(student_id);

alter table public.partner_companies enable row level security;
alter table public.internship_leads  enable row level security;

-- ── partner_companies ──
create policy "Teacher manage own companies"
  on public.partner_companies for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Student view companies they have a lead with"
  on public.partner_companies for select
  using (
    exists (
      select 1 from public.internship_leads l
      where l.company_id = partner_companies.id and l.student_id = auth.uid()
    )
  );

-- ── internship_leads ──
create policy "Teacher manage own leads"
  on public.internship_leads for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Student view own leads"
  on public.internship_leads for select
  using (student_id = auth.uid());

-- reuses the set_updated_at() trigger function already defined in 030_integrity_and_performance.sql
drop trigger if exists internship_leads_set_updated_at on public.internship_leads;
create trigger internship_leads_set_updated_at
  before update on public.internship_leads
  for each row execute function public.set_updated_at();
