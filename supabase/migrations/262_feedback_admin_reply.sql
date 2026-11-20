-- Resposta do Gustavo a um feedback, mostrada como popup ao próprio
-- utilizador na próxima vez que usar a app. admin_reply_seen_at marca
-- quando já viu, para a popup só aparecer uma vez.
alter table public.feedback
  add column admin_reply text,
  add column admin_reply_seen_at timestamptz;

grant select (admin_reply, admin_reply_seen_at) on public.feedback to authenticated;

-- SECURITY DEFINER em vez de policy de UPDATE: a tabela feedback já tem
-- GRANT de UPDATE largo e antigo em várias colunas (message, image_url,
-- page_url, user_id) para authenticated/anon, sem nenhuma policy de UPDATE
-- a travar isso hoje (RLS sem policy = bloqueado por omissão). Criar uma
-- policy de UPDATE para marcar "visto" abriria, de borla, a porta para
-- o próprio utilizador reescrever o conteúdo do feedback dele. Uma função
-- restrita evita isso por completo, sem mexer nos grants existentes.
create or replace function public.mark_feedback_reply_seen(p_feedback_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.feedback
  set admin_reply_seen_at = now()
  where id = p_feedback_id
    and user_id = auth.uid()
    and admin_reply is not null
    and admin_reply_seen_at is null;
$$;

revoke all on function public.mark_feedback_reply_seen(uuid) from public, anon, authenticated;
grant execute on function public.mark_feedback_reply_seen(uuid) to authenticated;
