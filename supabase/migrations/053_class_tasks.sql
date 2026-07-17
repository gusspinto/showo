-- ============================================================================
-- 053_class_tasks.sql
-- ============================================================================
-- Lets a professor set tasks for a turma (title, description, optional due
-- date). Students in that turma see the list and check items off — a
-- per-student completion row, not a shared checkbox, so each student's
-- progress is independent. Reuses public.is_class_member() from
-- 027_lockdown_public_reads.sql for the "am I in this class" check.
-- ============================================================================

create table if not exists public.class_tasks (
  id           uuid        primary key default gen_random_uuid(),
  class_id     uuid        not null references public.classes(id) on delete cascade,
  teacher_id   uuid        not null references auth.users(id) on delete cascade,
  title        text        not null,
  description  text,
  due_date     date,
  created_at   timestamptz default now()
);

create index if not exists class_tasks_class_idx on public.class_tasks(class_id);

create table if not exists public.class_task_completions (
  task_id       uuid        not null references public.class_tasks(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  completed_at  timestamptz default now(),
  primary key (task_id, user_id)
);

alter table public.class_tasks             enable row level security;
alter table public.class_task_completions  enable row level security;

-- ── class_tasks ──
create policy "Class members and teacher can view tasks"
  on public.class_tasks for select
  using (
    teacher_id = auth.uid()
    or public.is_class_member(class_id)
  );

create policy "Teacher manage own class tasks"
  on public.class_tasks for insert
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

create policy "Teacher update own class tasks"
  on public.class_tasks for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Teacher delete own class tasks"
  on public.class_tasks for delete
  using (teacher_id = auth.uid());

-- ── class_task_completions ──
create policy "View own completions or completions of own class tasks"
  on public.class_task_completions for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.class_tasks t where t.id = task_id and t.teacher_id = auth.uid())
  );

create policy "Student mark own completion"
  on public.class_task_completions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.class_tasks t
      where t.id = task_id and public.is_class_member(t.class_id)
    )
  );

create policy "Student unmark own completion"
  on public.class_task_completions for delete
  using (user_id = auth.uid());
