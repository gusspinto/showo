-- ============================================================================
-- 107_profile_headline.sql — Uma linha de identidade no topo do perfil.
--
-- Mudança de direção: o perfil-portefólio personaliza-se por IDENTIDADE e
-- CURADORIA, não por um painel de estilos por-superfície (isso ficou como
-- "marca única" — accent + tipografia — em profile_appearance). O headline
-- é a personalização de maior alavanca: uma frase escrita pelo próprio,
-- logo abaixo do nome.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_headline text;

GRANT SELECT (profile_headline) ON public.profiles TO anon;
GRANT SELECT (profile_headline) ON public.profiles TO authenticated;
GRANT UPDATE (profile_headline) ON public.profiles TO authenticated;
