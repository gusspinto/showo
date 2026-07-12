-- ============================================================================
-- 029_notifications_rpc.sql — Fecha INSERT direto em notifications
-- ============================================================================
-- Antes: policy "Insert notifications" tinha with_check=true, logo qualquer
-- autenticado podia inserir notificações na conta de outro user (spam/phishing
-- via link malicioso, e o Navbar mostra-as em realtime).
--
-- Fix: RPC create_notification() SECURITY DEFINER que valida o contexto por
-- tipo de notificação e faz o insert. Depois revoga INSERT direto ao cliente.
-- Os triggers definer existentes (notify_on_comment, notify_on_like) continuam
-- a inserir sem passar por aqui porque correm como owner.
-- ============================================================================

create or replace function public.create_notification(
  p_user_id      uuid,
  p_type         text,
  p_message      text,
  p_project_slug text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not authenticated';                       -- só autenticados podem criar
  end if;

  if p_type in ('MISSION_COMPLETE', 'SCORE_MILESTONE') then
    if p_user_id <> v_caller then
      raise exception 'self-notification only';                -- notificações pessoais só a si próprio
    end if;

  elsif p_type = 'TEACHER_FEEDBACK' then
    if not exists (
      select 1 from public.teacher_feedback tf
      join public.projects p on p.id = tf.project_id
      where tf.teacher_id = v_caller and p.user_id = p_user_id::text
    ) then
      raise exception 'caller has no feedback for that student';  -- só o prof que deu feedback pode notificar
    end if;

  elsif p_type = 'STUDENT_JOINED' then
    if not exists (
      select 1 from public.class_projects cp
      join public.projects p on p.id = cp.project_id
      join public.classes c  on c.id = cp.class_id
      where p.user_id = v_caller::text and c.teacher_id = p_user_id
    ) then
      raise exception 'caller has no project in that teacher''s class';  -- só quem juntou um projeto
    end if;

  else
    raise exception 'unknown notification type: %', p_type;    -- whitelist estrita de tipos
  end if;

  insert into public.notifications (user_id, type, message, project_slug, read)
  values (p_user_id, p_type, p_message, p_project_slug, false);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text) to authenticated;

-- Fecha o buraco: nenhum cliente pode inserir diretamente; só via RPC ou triggers definer
drop policy if exists "Insert notifications" on public.notifications;   -- policy que permitia tudo
revoke insert on public.notifications from anon, authenticated;         -- reforço a nível de privilégio
