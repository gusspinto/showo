-- ============================================================================
-- 141_project_database.sql — Base de dados + API por projeto (premium)
-- ----------------------------------------------------------------------------
-- Contexto: reunião com Hugo Rosas, 03/set — "hosting de BD/API para
-- converter projetos teóricos em produtos funcionais". Decisão: em vez de
-- criar tabelas Postgres a sério por projeto (DDL dinâmico a partir de
-- input do aluno é a receita para injeção de SQL e explosão de tabelas
-- físicas), guarda-se tudo num armazém genérico (JSONB), com o "schema" só
-- para validar e desenhar o formulário. Zero DDL dinâmico, zero exposição
-- direta via PostgREST — tudo passa pela função project-db, que controla
-- limites por plano e autenticação (sessão OU chave de API).
-- ============================================================================

-- ── Definição das tabelas do aluno ──
CREATE TABLE IF NOT EXISTS public.project_data_tables (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (name ~ '^[a-z][a-z0-9_]{0,39}$'),
  label      text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  -- [{ "name": "titulo", "type": "text"|"number"|"boolean"|"date", "required": bool }]
  columns    jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS project_data_tables_project_idx ON public.project_data_tables (project_id);

-- ── Linhas — armazém genérico, uma linha física por linha lógica ──
CREATE TABLE IF NOT EXISTS public.project_data_rows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id   uuid NOT NULL REFERENCES public.project_data_tables(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_data_rows_table_idx ON public.project_data_rows (table_id);

-- ── Chave de API por projeto — é o que torna isto um "produto" real: dá
-- para chamar de fora (curl, Postman, o próprio frontend do aluno) sem
-- precisar de sessão Showo nenhuma. ──
CREATE TABLE IF NOT EXISTS public.project_api_keys (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  key        text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sem GRANT nenhum a anon/authenticated nas três tabelas — de propósito.
-- Tudo passa pela função project-db (service role), que decide quem pode o
-- quê: dono via sessão, ou qualquer chamador externo via chave de API só
-- para tabelas que o dono marcou como públicas ou com a própria chave.
-- Sem RLS a fazer esse trabalho, sem PostgREST exposto — a superfície de
-- ataque é só a função, uma só coisa a auditar.
ALTER TABLE public.project_data_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_data_rows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_api_keys    ENABLE ROW LEVEL SECURITY;
-- (RLS ativo sem nenhuma policy = nega tudo a anon/authenticated; service
-- role ignora RLS sempre, por isso a função continua a funcionar.)

-- ── Limites por plano ──
-- Números conservadores: no plano Free do Supabase (500MB, confirmado hoje
-- a 22MB usados) mesmo o pior caso (todos os utilizadores Pro no limite)
-- fica a uma fração ínfima do teto. O risco real é tráfego de uma API
-- pública, por isso a função aplica também um rate-limit por projeto.
CREATE OR REPLACE FUNCTION public.get_db_plan_limits(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan     text;
  v_org_id   uuid;
  v_org_plan text;
  v_role     text;
BEGIN
  -- user_id em projects é TEXT e pode não ser um uuid (projetos anónimos,
  -- ainda sem dono) — o filtro evita que o cast reviente a função inteira
  -- nesses casos; ficam simplesmente sem plano encontrado, tratados como free.
  SELECT coalesce(pr.plan, 'free'), pr.organization_id, pr.role
    INTO v_plan, v_org_id, v_role
  FROM public.projects p
  JOIN public.profiles pr ON p.user_id ~ '^[0-9a-f-]{36}$' AND pr.id = p.user_id::uuid
  WHERE p.id = p_project_id;

  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  IF v_role = 'professor' THEN v_plan := 'pro'; END IF;

  IF v_org_id IS NOT NULL AND v_role != 'professor' THEN
    SELECT o.plan INTO v_org_plan FROM public.organizations o WHERE o.id = v_org_id;
    IF v_org_plan = 'launch' THEN v_org_plan := 'pro'; END IF;
    IF v_org_plan = 'build' THEN v_org_plan := 'plus'; END IF;
    v_plan := CASE WHEN v_org_plan = 'pro' THEN 'school_pro' ELSE 'school' END;
  END IF;

  IF v_plan = 'build' THEN v_plan := 'plus'; END IF;
  IF v_plan = 'launch' THEN v_plan := 'pro'; END IF;

  RETURN CASE v_plan
    WHEN 'plus'      THEN jsonb_build_object('plan', v_plan, 'max_tables', 2, 'max_rows_per_table', 200,  'max_rows_total', 500)
    WHEN 'school'    THEN jsonb_build_object('plan', v_plan, 'max_tables', 3, 'max_rows_per_table', 300,  'max_rows_total', 1000)
    WHEN 'pro'       THEN jsonb_build_object('plan', v_plan, 'max_tables', 8, 'max_rows_per_table', 2000, 'max_rows_total', 10000)
    WHEN 'school_pro' THEN jsonb_build_object('plan', v_plan, 'max_tables', 8, 'max_rows_per_table', 2000, 'max_rows_total', 10000)
    ELSE jsonb_build_object('plan', v_plan, 'max_tables', 0, 'max_rows_per_table', 0, 'max_rows_total', 0)
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_db_plan_limits(uuid) FROM PUBLIC, anon, authenticated;
