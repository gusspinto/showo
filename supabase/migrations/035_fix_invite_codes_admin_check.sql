-- ============================================================================
-- 035_fix_invite_codes_admin_check.sql — fix RLS policies calling is_admin()
-- ============================================================================
-- is_admin() had EXECUTE revoked from anon/authenticated in migration 031
-- ("authenticated mantém EXECUTE porque a função valida is_admin()
-- internamente" — but only true for calls made *inside* a SECURITY DEFINER
-- function; nested calls bypass the grant check, direct calls from an RLS
-- policy don't).
--
-- The two read policies added in 034 called is_admin() directly inside their
-- USING clause, which Postgres evaluates as the querying role. So any admin
-- reading professor_invite_codes/professor_invite_redemptions hit
-- "permission denied for function is_admin" on every SELECT — PostgREST
-- turns that into { data: null, error }, supabase-js callers that only do
-- `data || []` silently got an empty list instead of an error. That's why a
-- freshly generated code (shown once from the RPC's direct return value)
-- seemed to "disappear" — the follow-up read of the table never actually
-- worked, not even once.
--
-- Same fix already used for the other admin_* policies in migration 033:
-- inline EXISTS check against profiles instead of calling the function.
-- ============================================================================

drop policy if exists "Admin read invite codes" on public.professor_invite_codes;
create policy "Admin read invite codes" on public.professor_invite_codes
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin read invite redemptions" on public.professor_invite_redemptions;
create policy "Admin read invite redemptions" on public.professor_invite_redemptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
