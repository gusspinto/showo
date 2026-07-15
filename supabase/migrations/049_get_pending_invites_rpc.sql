-- ============================================================================
-- 049_get_pending_invites_rpc.sql
-- ============================================================================
-- Navbar's invite inbox did 3 sequential round trips on every page load for
-- every logged-in user (pending invite rows -> project names -> inviter
-- names), because a single PostgREST embedded-join query was ambiguous
-- (project_collaborators has two FKs into profiles: user_id and invited_by).
-- This RPC does the same three reads as one explicit SQL join, executed
-- server-side in a single round trip. SECURITY INVOKER (the default) so it
-- runs under the caller's own RLS — same access as the three queries it
-- replaces, no privilege change. Scoped to auth.uid() internally rather than
-- taking a user id parameter, so there's nothing to spoof.
-- ============================================================================

create or replace function public.get_pending_invites()
returns table (
  id            uuid,
  project_id    uuid,
  invited_by    uuid,
  sections      text[],
  project_name  text,
  project_slug  text,
  inviter_name  text
)
language sql
security invoker
stable
as $$
  select
    pc.id,
    pc.project_id,
    pc.invited_by,
    pc.sections,
    p.name  as project_name,
    p.slug  as project_slug,
    coalesce(inv.full_name, inv.username) as inviter_name
  from public.project_collaborators pc
  left join public.projects p     on p.id  = pc.project_id
  left join public.profiles  inv  on inv.id = pc.invited_by
  where pc.user_id = auth.uid() and pc.status = 'pending';
$$;

grant execute on function public.get_pending_invites() to authenticated;
