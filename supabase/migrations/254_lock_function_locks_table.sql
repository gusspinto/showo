-- function_locks (252) nunca teve RLS nem os GRANTs de tabela revogados,
-- ao contrário das funções que a usam. anon e authenticated tinham
-- INSERT/UPDATE/DELETE/TRUNCATE diretos via API REST, o que permitia a
-- qualquer pessoa (mesmo não autenticada) apagar um lock a meio de uma
-- execução real (voltando a causar duplicados) ou bloquear uma sequência
-- para sempre com um lock falso. Apanhado por inspeção visual no painel
-- do Supabase (badge "UNRESTRICTED"), não por auditoria própria.

ALTER TABLE public.function_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.function_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.function_locks TO service_role;
