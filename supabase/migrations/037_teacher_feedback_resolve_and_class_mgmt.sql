-- ============================================================================
-- 037_teacher_feedback_resolve_and_class_mgmt.sql
-- ============================================================================
-- 1. Turns teacher_feedback into a lightweight action-item loop: a student
--    can mark a piece of feedback resolved (optionally with a short note on
--    what changed), a teacher can reopen it. Both go through RPCs rather
--    than a raw RLS UPDATE policy so the student can only ever touch
--    status/resolved_at/resolution_note, never rewrite the teacher's
--    comment itself.
-- 2. Adds teacher-only class management RPCs (rename/change subject a
--    class, remove a member) — class_members has no INSERT/DELETE policy
--    for "teacher acting on someone else's row" today, only self-service
--    (student joins/leaves their own row), so this needs bypassing RLS via
--    SECURITY DEFINER rather than a new policy, since the table wasn't
--    created through a tracked migration and its exact policy set isn't
--    visible here.
-- ============================================================================

alter table public.teacher_feedback
  add column if not exists status text not null default 'pending' check (status in ('pending', 'resolved')),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_note text;

create or replace function public.resolve_teacher_feedback(p_feedback_id uuid, p_note text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select project_id into v_project_id from public.teacher_feedback where id = p_feedback_id;
  if v_project_id is null then
    raise exception 'not_found';
  end if;

  if not exists (select 1 from public.projects where id = v_project_id and user_id = auth.uid()::text) then
    raise exception 'Not authorized';
  end if;

  update public.teacher_feedback
  set status = 'resolved', resolved_at = now(), resolution_note = nullif(trim(p_note), '')
  where id = p_feedback_id;
end;
$$;

grant execute on function public.resolve_teacher_feedback(uuid, text) to authenticated;

create or replace function public.reopen_teacher_feedback(p_feedback_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.teacher_feedback where id = p_feedback_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update public.teacher_feedback
  set status = 'pending', resolved_at = null, resolution_note = null
  where id = p_feedback_id;
end;
$$;

grant execute on function public.reopen_teacher_feedback(uuid) to authenticated;

-- ── Class management (teacher-only) ─────────────────────────────────────────
create or replace function public.update_class(p_class_id uuid, p_name text, p_subject text default null)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'name required';
  end if;

  update public.classes
  set name = trim(p_name), subject = nullif(trim(coalesce(p_subject, '')), '')
  where id = p_class_id;
end;
$$;

grant execute on function public.update_class(uuid, text, text) to authenticated;

create or replace function public.remove_class_member(p_class_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  delete from public.class_members where class_id = p_class_id and user_id = p_user_id;
end;
$$;

grant execute on function public.remove_class_member(uuid, uuid) to authenticated;
