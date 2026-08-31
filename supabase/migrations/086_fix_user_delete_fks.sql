-- ============================================================================
-- 086_fix_user_delete_fks.sql
-- ============================================================================
-- Apagar uma conta rebentava com:
--
--   update or delete on table "users" violates foreign key constraint
--   "projects_teacher_score_by_fkey" on table "projects"
--
-- O admin_delete_user (011) faz só `DELETE FROM auth.users` e conta com as
-- cascatas — o comentário dele diz mesmo "delete a user from auth + cascade".
-- Só que seis chaves estrangeiras foram criadas sem cláusula `on delete`, e
-- nesse caso o Postgres assume NO ACTION, que bloqueia em vez de cascatear.
-- Corrigir só a que aparece na mensagem de erro dava outra a seguir, e outra
-- depois dessa, por isso vão as seis.
--
-- A regra usada em cada uma: o registo pertence a quem? Se pertence a outra
-- pessoa (a nota do professor pertence ao projeto do aluno), a coluna passa a
-- NULL e o registo fica. Se pertence a quem está a ser apagado, vai com ele.
--
-- Os nomes das constraints são procurados no catálogo em vez de escritos à
-- mão: as que foram criadas inline têm o nome automático do Postgres, mas se
-- alguma tiver sido recriada à mão em produção o nome pode não bater certo.
-- ============================================================================

do $mig$
declare
  r record;

  -- tabela, coluna, tabela referenciada, ação
  fks text[][] := array[
    -- A nota e o histórico pertencem ao projeto do ALUNO. Apagar o professor
    -- não pode apagar nem bloquear a avaliação que ele já deu.
    ['projects',              'teacher_score_by', 'users',    'set null'],
    ['project_score_history', 'teacher_id',       'users',    'set null'],
    -- Registos de atribuição: o registo continua a fazer sentido sem saber
    -- quem o criou.
    ['professor_invite_codes','created_by',       'users',    'set null'],
    ['project_collaborators', 'invited_by',       'profiles', 'set null'],
    ['ambassadors',           'created_by',       'profiles', 'set null']
  ];
  i int;
begin
  -- project_score_history.teacher_id é NOT NULL, o que torna `set null`
  -- impossível. A coluna passa a aceitar NULL: o histórico é do projeto, não
  -- do professor, e vale mais guardá-lo sem autor do que perdê-lo.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_score_history'
      and column_name = 'teacher_id' and is_nullable = 'NO'
  ) then
    alter table public.project_score_history alter column teacher_id drop not null;
  end if;

  for i in 1 .. array_length(fks, 1) loop
    for r in
      select con.conname, con.conrelid::regclass as tbl
      from pg_constraint con
      join pg_attribute att
        on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      where con.contype = 'f'
        and con.conrelid = ('public.' || fks[i][1])::regclass
        and att.attname = fks[i][2]
        and array_length(con.conkey, 1) = 1
    loop
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
      execute format(
        'alter table %s add constraint %I foreign key (%I) references %s(id) on delete %s',
        r.tbl, r.conname, fks[i][2],
        case fks[i][3] when 'users' then 'auth.users' else 'public.profiles' end,
        fks[i][4]
      );
      raise notice 'corrigido: % (%) -> on delete %', r.tbl, fks[i][2], fks[i][4];
    end loop;
  end loop;
end
$mig$;

-- ── projects.user_id ────────────────────────────────────────────────────────
-- Esta é a única decisão destrutiva do ficheiro, por isso está à parte.
--
-- É o dono do projeto. As alternativas são duas, e nenhuma é neutra:
--   · set null  — os projetos ficam sem dono. Como as páginas públicas não
--                 exigem dono, os trabalhos de alguém que pediu para ser
--                 apagado continuariam online, órfãos. A migração 059 existe
--                 precisamente para limpar órfãos, o que diz que já
--                 aconteceu antes.
--   · cascade   — os projetos vão com a conta. É o que o admin_delete_user
--                 sempre disse que fazia, e é o que se espera de quem pede
--                 para apagar a conta.
--
-- Vai cascade. Se preferirem tratar a saída de alunos de outra maneira (por
-- exemplo transferir os projetos antes de apagar), apaguem este bloco antes
-- de correr o resto: as outras cinco correções não dependem dele.
do $mig$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.contype = 'f'
      and con.conrelid = 'public.projects'::regclass
      and att.attname = 'user_id'
      and array_length(con.conkey, 1) = 1
  loop
    execute format('alter table public.projects drop constraint %I', r.conname);
    execute format(
      'alter table public.projects add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
      r.conname
    );
    raise notice 'corrigido: projects (user_id) -> on delete cascade';
  end loop;
end
$mig$;
