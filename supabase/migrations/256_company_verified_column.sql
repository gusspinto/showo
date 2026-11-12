-- Selo "verificado" para perfis de empresa/recrutador, atribuído manualmente
-- por um admin depois de confirmar a empresa a sério, nunca pela própria
-- conta. Boolean simples, default false: confiança nenhuma por omissão, só
-- true quando admin_set_company_verified for chamada (258).

alter table public.profiles
  add column if not exists company_verified boolean not null default false;
