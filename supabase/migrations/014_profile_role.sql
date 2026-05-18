-- Add role to profiles: aluno | professor | recrutador | empresa
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'aluno'
    CHECK (role IN ('aluno', 'professor', 'recrutador', 'empresa'));
