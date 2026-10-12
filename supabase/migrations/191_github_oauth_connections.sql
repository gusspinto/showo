-- Ligação OAuth ao GitHub, por utilizador — permite ler repositórios
-- privados (o sync antigo só lia públicos, com um token global da app).
-- access_token expira (ver nota em 190/create da OAuth App: "Expire user
-- access tokens" ligado) — refresh_token é usado para renovar sem pedir
-- para autorizar outra vez.
CREATE TABLE public.github_connections (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  github_login  text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Só o dono vê a sua própria ligação (é o seu próprio token, não há
-- fronteira a proteger aí) — mas o cliente só pede as colunas que precisa
-- (github_login, created_at), nunca os tokens, por disciplina de código.
CREATE POLICY "Owner reads own github connection" ON public.github_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner deletes own github connection" ON public.github_connections
  FOR DELETE
  USING (auth.uid() = user_id);
