-- Limite de 2 semanas seguidas passa a preferência: só volta a aparecer um projeto nessa situação
-- se não houver ninguém melhor na sua vaga (geral ou recente). Semana de 05/10 registada.
insert into public.featured_weeks (week_start, project_id) values
  ('2026-10-05', '919e8fc5-df49-41fb-a591-6e6ffdc29d10'),
  ('2026-10-05', '36d4c379-29e0-4442-84e1-123cd3808a32')
on conflict do nothing;
