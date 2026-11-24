-- Correção aplicada ao vivo logo a seguir à 264: o projeto dá, por omissão,
-- GRANT total a anon/authenticated em tabelas novas (mesmo padrão já visto
-- em function_locks, ver lição de 2026-11-12). A 264 só pedia GRANT SELECT,
-- INSERT para authenticated, mas anon ficou com acesso total na mesma.
revoke all on public.gta_giveaway_entries from anon;
revoke update, delete, truncate, references, trigger on public.gta_giveaway_entries from authenticated;
