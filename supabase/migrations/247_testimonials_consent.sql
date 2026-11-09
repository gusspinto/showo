-- O pop-up de avaliação (246) diz agora explicitamente que a mensagem pode
-- ser usada como testemunho. Sem uma checkbox própria, escrever a mensagem
-- não é consentimento real, é dar a entender. consent_public é a resposta
-- explícita da pessoa; approved_for_marketing continua a ser a curadoria
-- manual do admin por cima disso, nunca publica nada só por consent_public
-- ser true.
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS consent_public boolean NOT NULL DEFAULT false;
