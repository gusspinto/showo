-- O trigger notify_on_candidatura_insert() referia "vagas.title", mas a
-- coluna real é "vagas.titulo" (PT). Isto nunca funcionou: toda e qualquer
-- candidatura falhava com erro 42703 (coluna inexistente) ANTES sequer de
-- a linha ser inserida, porque o erro vem de dentro do trigger de INSERT —
-- ninguém conseguiu candidatar-se a uma vaga desde que este trigger existe.
create or replace function public.notify_on_candidatura_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_recruiter_id  uuid;
  v_vaga_title    text;
  v_student_name  text;
BEGIN
  SELECT recruiter_id, titulo INTO v_recruiter_id, v_vaga_title
    FROM vagas WHERE id = NEW.vaga_id;

  IF v_recruiter_id IS NULL OR v_recruiter_id = NEW.student_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Um estudante') INTO v_student_name
    FROM profiles WHERE id = NEW.student_id;

  INSERT INTO notifications (user_id, type, message, project_slug, read)
  VALUES (
    v_recruiter_id,
    'NEW_CANDIDATURA',
    v_student_name || ' candidatou-se à tua vaga "' || v_vaga_title || '".',
    NULL,
    false
  );

  RETURN NEW;
END;
$function$;
