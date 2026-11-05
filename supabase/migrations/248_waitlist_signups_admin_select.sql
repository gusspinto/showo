-- waitlist_signups só tinha política de INSERT para anon, nenhuma de SELECT
-- para ninguém, nem admin. O Admin (painel "Signups") mostrava sempre 0,
-- apesar de haver registos reais (achado ao investigar um "Signups (0)"
-- suspeito com 1609 utilizadores na base). Não é a tabela a ficar vazia,
-- é a RLS a bloquear a leitura por completo.
CREATE POLICY "admin le a waitlist"
  ON public.waitlist_signups FOR SELECT TO authenticated
  USING (public.is_admin());
