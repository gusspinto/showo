import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   BASE DE DADOS + API DO PROJETO (premium)
   ──────────────────────────────────────────────────────────────────────────
   O aluno desenha tabelas no editor; isto dá-lhe um armazém de dados a
   sério com uma API que funciona de fora da Showo — curl, Postman, o
   frontend que ele próprio construir. É a diferença entre "projeto teórico"
   e "produto funcional".

   Três decisões que definem a superfície de risco:

   1. Sem DDL dinâmico. Nenhuma tabela Postgres física por aluno — tudo vive
      num armazém genérico (project_data_rows, JSONB), com o "schema"
      (project_data_tables.columns) a servir só para validar e desenhar o
      formulário. Não há CREATE TABLE nenhum a partir de input do aluno —
      isso seria a receita certa para injeção de SQL.

   2. Sem PostgREST exposto. As três tabelas não têm grant nenhum a
      anon/authenticated (ver migração 141) — tudo passa por aqui, com
      service role. Uma só superfície a auditar, não uma por tabela.

   3. Duas formas de entrar: sessão Showo (o dono, para gerir tabelas e
      dados) ou chave de API (para qualquer chamador externo — é isso que
      torna a API "real", utilizável sem nunca ter conta na Showo). A chave
      só chega a ações de dados (ler/escrever linhas), nunca a gerir
      tabelas ou emitir chaves novas.
   ══════════════════════════════════════════════════════════════════════════ */

const COLUMN_TYPES = new Set(['text', 'number', 'boolean', 'date'])
const MAX_COLUMNS = 12
const MANAGEMENT_ACTIONS = new Set(['list_tables', 'create_table', 'delete_table', 'toggle_public', 'get_api_key', 'regen_api_key'])
const DATA_ACTIONS = new Set(['list_rows', 'insert_row', 'update_row', 'delete_row'])

function randomApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 32)
  return `sho_${b64}`
}

/** Valida a forma de uma coluna definida pelo aluno no editor. */
function validColumnDef(c: unknown): c is { name: string; type: string; required?: boolean } {
  if (!c || typeof c !== 'object') return false
  const col = c as Record<string, unknown>
  return typeof col.name === 'string' && /^[a-z][a-z0-9_]{0,29}$/.test(col.name)
    && typeof col.type === 'string' && COLUMN_TYPES.has(col.type)
}

/** Valida e normaliza os dados de uma linha contra o schema declarado. Campos
 * fora do schema são ignorados — não se guarda o que não foi desenhado. */
function coerceRow(data: unknown, columns: Array<{ name: string; type: string; required?: boolean }>) {
  const out: Record<string, unknown> = {}
  const src = (data && typeof data === 'object' ? data as Record<string, unknown> : {})
  for (const col of columns) {
    const v = src[col.name]
    if (v === undefined || v === null || v === '') {
      if (col.required) throw new Error(`Falta o campo obrigatório "${col.name}".`)
      continue
    }
    if (col.type === 'number') {
      const n = Number(v)
      if (Number.isNaN(n)) throw new Error(`"${col.name}" tem de ser um número.`)
      out[col.name] = n
    } else if (col.type === 'boolean') {
      out[col.name] = v === true || v === 'true'
    } else if (col.type === 'date') {
      const d = new Date(String(v))
      if (Number.isNaN(+d)) throw new Error(`"${col.name}" tem de ser uma data válida.`)
      out[col.name] = String(v)
    } else {
      out[col.name] = String(v).slice(0, 2000)
    }
  }
  return out
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')

    if (!MANAGEMENT_ACTIONS.has(action) && !DATA_ACTIONS.has(action)) {
      return json({ error: 'Ação desconhecida.' }, 400)
    }

    // Chamadas externas (chave de API) só podem tocar em dados, nunca gerir
    // tabelas — criar/apagar tabelas e emitir chaves fica sempre por trás
    // da sessão Showo do dono. Para leitura pública (tabela is_public) não
    // é preciso sessão nem chave nenhuma — ver mais abaixo em list_rows.
    const apiKey = req.headers.get('x-api-key')
    let projectId: string | null = null
    let isOwnerSession = false

    if (apiKey) {
      if (!DATA_ACTIONS.has(action)) return json({ error: 'Esta chave só pode ler/escrever dados, não gerir tabelas.' }, 403)
      const { data: keyRow } = await sb.from('project_api_keys').select('project_id').eq('key', apiKey).single()
      if (!keyRow) return json({ error: 'Chave de API inválida.' }, 401)
      projectId = keyRow.project_id
    } else {
      const user = await getAuthUser(req)
      // A leitura pública (list_rows numa tabela is_public) é o único caso
      // sem sessão nem chave — todo o resto exige uma das duas.
      if (!user && action !== 'list_rows') return json({ error: 'Precisas de sessão iniciada ou de uma chave de API.' }, 401)
      projectId = typeof body.projectId === 'string' ? body.projectId : null
      if (user && projectId) {
        const { data: project } = await sb.from('projects').select('id, user_id').eq('id', projectId).single()
        if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
        isOwnerSession = String(project.user_id) === String(user.id)
        if (!isOwnerSession && MANAGEMENT_ACTIONS.has(action)) return json({ error: 'Só o dono do projeto pode gerir a base de dados.' }, 403)
      } else if (user && MANAGEMENT_ACTIONS.has(action)) {
        return json({ error: 'Projeto em falta.' }, 400)
      }
    }

    // Rate limit por IP — mesma proteção que o resto das funções têm contra
    // um script a martelar isto. 200/h chega para uso normal (um aluno a
    // testar a própria API) e trava abuso óbvio.
    if (!(await checkRateLimit(req, 'project-db', 200))) {
      return json({ error: 'Demasiados pedidos seguidos. Tenta daqui a pouco.' }, 429)
    }

    // ── Gestão de tabelas (sempre por sessão) ──
    if (action === 'list_tables') {
      const { data: tables } = await sb.from('project_data_tables').select('id, name, label, columns, is_public, created_at').eq('project_id', projectId).order('created_at')
      const withCounts = await Promise.all((tables ?? []).map(async t => {
        const { count } = await sb.from('project_data_rows').select('id', { count: 'exact', head: true }).eq('table_id', t.id)
        return { ...t, row_count: count ?? 0 }
      }))
      const { data: keyRow } = await sb.from('project_api_keys').select('key').eq('project_id', projectId).single()
      const limits = await sb.rpc('get_db_plan_limits', { p_project_id: projectId })
      return json({ tables: withCounts, api_key: keyRow?.key ?? null, limits: limits.data })
    }

    if (action === 'create_table') {
      const name = String(body.name ?? '').trim().toLowerCase()
      const label = String(body.label ?? '').trim()
      const columns = Array.isArray(body.columns) ? body.columns : []
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(name)) return json({ error: 'Nome da tabela inválido — minúsculas, números e "_", a começar por letra.' }, 400)
      if (!label) return json({ error: 'Falta o nome a mostrar.' }, 400)
      if (!columns.length || columns.length > MAX_COLUMNS) return json({ error: `Entre 1 e ${MAX_COLUMNS} colunas.` }, 400)
      if (!columns.every(validColumnDef)) return json({ error: 'Uma ou mais colunas têm forma inválida (nome/tipo).' }, 400)

      const { data: limitsRes } = await sb.rpc('get_db_plan_limits', { p_project_id: projectId })
      const limits = limitsRes as { max_tables: number } | null
      const { count: tableCount } = await sb.from('project_data_tables').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
      if (!limits?.max_tables) return json({ error: 'A base de dados é uma funcionalidade Plus/Pro — o teu plano atual não inclui.' }, 403)
      if ((tableCount ?? 0) >= limits.max_tables) return json({ error: `O teu plano permite até ${limits.max_tables} tabelas por projeto.` }, 403)

      const { data: created, error } = await sb.from('project_data_tables').insert({ project_id: projectId, name, label, columns }).select().single()
      if (error) {
        if (error.code === '23505') return json({ error: 'Já existe uma tabela com esse nome neste projeto.' }, 409)
        console.error('[project-db] create_table', error.message)
        return json({ error: 'Não foi possível criar a tabela.' }, 500)
      }
      return json({ table: created })
    }

    if (action === 'toggle_public') {
      const tableId = String(body.tableId ?? '')
      const { data: table } = await sb.from('project_data_tables').select('id, project_id').eq('id', tableId).single()
      if (!table || table.project_id !== projectId) return json({ error: 'Tabela não encontrada.' }, 404)
      const { data: updated, error } = await sb.from('project_data_tables').update({ is_public: !!body.isPublic }).eq('id', tableId).select().single()
      if (error) return json({ error: 'Não foi possível atualizar a tabela.' }, 500)
      return json({ table: updated })
    }

    if (action === 'delete_table') {
      const tableId = String(body.tableId ?? '')
      const { data: table } = await sb.from('project_data_tables').select('id, project_id').eq('id', tableId).single()
      if (!table || table.project_id !== projectId) return json({ error: 'Tabela não encontrada.' }, 404)
      await sb.from('project_data_tables').delete().eq('id', tableId)
      return json({ ok: true })
    }

    if (action === 'get_api_key' || action === 'regen_api_key') {
      if (action === 'regen_api_key') await sb.from('project_api_keys').delete().eq('project_id', projectId)
      const { data: existing } = await sb.from('project_api_keys').select('key').eq('project_id', projectId).single()
      if (existing && action === 'get_api_key') return json({ api_key: existing.key })
      const key = randomApiKey()
      const { error } = await sb.from('project_api_keys').insert({ project_id: projectId, key })
      if (error) { console.error('[project-db] api_key', error.message); return json({ error: 'Não foi possível gerar a chave.' }, 500) }
      return json({ api_key: key })
    }

    // ── Dados (sessão do dono OU chave de API) ──
    // Resolve a tabela por id (chamadas normais) ou por projectId+nome (o
    // formato mais natural para quem chama de fora com a chave de API,
    // sem nunca ter visto o id interno).
    async function resolveTable(): Promise<{ id: string; project_id: string; columns: any[]; is_public: boolean } | null> {
      if (body.tableId) {
        const { data } = await sb.from('project_data_tables').select('id, project_id, columns, is_public').eq('id', body.tableId).single()
        return data ?? null
      }
      if (body.table && projectId) {
        const { data } = await sb.from('project_data_tables').select('id, project_id, columns, is_public').eq('project_id', projectId).eq('name', String(body.table)).single()
        return data ?? null
      }
      return null
    }

    const table = await resolveTable()
    if (!table) return json({ error: 'Tabela não encontrada.' }, 404)
    // Uma chave de API só serve para a tabela do MESMO projeto a que
    // pertence — nunca para "adivinhar" um tableId de outro projeto. Uma
    // sessão só pode escrever se for mesmo o dono DESTE projeto — verificar
    // isOwnerSession sozinho não chega, porque essa flag foi calculada
    // contra o `projectId` do corpo, que tem de bater certo com o da
    // tabela resolvida (senão um tableId de outro projeto passava).
    const canWrite = (apiKey && table.project_id === projectId) || (isOwnerSession && table.project_id === projectId)

    if (action === 'list_rows') {
      // Leitura sem credenciais: só quando o dono marcou a tabela como
      // pública — é o "demo público" que um recrutador vê sem chave nenhuma.
      if (!canWrite && !table.is_public) return json({ error: 'Esta tabela é privada.' }, 403)
      const limit = Math.min(200, Math.max(1, Number(body.limit) || 50))
      const { data: rows, error } = await sb.from('project_data_rows').select('id, data, created_at, updated_at').eq('table_id', table.id).order('created_at', { ascending: false }).limit(limit)
      if (error) return json({ error: 'Não foi possível ler as linhas.' }, 500)
      return json({ rows })
    }

    // Escrita exige sempre ser o dono (sessão) ou a chave de API do
    // projeto — nunca é público, mesmo em tabelas de leitura pública.
    if (!canWrite) return json({ error: 'Sem permissão para escrever nesta tabela.' }, 403)

    if (action === 'insert_row') {
      const { data: limitsRes } = await sb.rpc('get_db_plan_limits', { p_project_id: table.project_id })
      const limits = limitsRes as { max_rows_per_table: number; max_rows_total: number } | null
      const { count: rowsInTable } = await sb.from('project_data_rows').select('id', { count: 'exact', head: true }).eq('table_id', table.id)
      if (limits && (rowsInTable ?? 0) >= limits.max_rows_per_table) {
        return json({ error: `O teu plano permite até ${limits.max_rows_per_table} linhas por tabela.` }, 403)
      }
      if (limits) {
        const { data: projectTables } = await sb.from('project_data_tables').select('id').eq('project_id', table.project_id)
        const { count: totalRows } = await sb.from('project_data_rows').select('id', { count: 'exact', head: true }).in('table_id', (projectTables ?? []).map(t => t.id))
        if ((totalRows ?? 0) >= limits.max_rows_total) {
          return json({ error: `O teu plano permite até ${limits.max_rows_total} linhas no total, em todas as tabelas.` }, 403)
        }
      }
      let coerced
      try { coerced = coerceRow(body.data, table.columns) } catch (e) { return json({ error: (e as Error).message }, 400) }
      const { data: inserted, error } = await sb.from('project_data_rows').insert({ table_id: table.id, data: coerced }).select().single()
      if (error) { console.error('[project-db] insert_row', error.message); return json({ error: 'Não foi possível guardar a linha.' }, 500) }
      return json({ row: inserted })
    }

    if (action === 'update_row') {
      const rowId = String(body.rowId ?? '')
      const { data: existingRow } = await sb.from('project_data_rows').select('id, table_id').eq('id', rowId).single()
      if (!existingRow || existingRow.table_id !== table.id) return json({ error: 'Linha não encontrada.' }, 404)
      let coerced
      try { coerced = coerceRow(body.data, table.columns) } catch (e) { return json({ error: (e as Error).message }, 400) }
      const { data: updated, error } = await sb.from('project_data_rows').update({ data: coerced, updated_at: new Date().toISOString() }).eq('id', rowId).select().single()
      if (error) return json({ error: 'Não foi possível atualizar a linha.' }, 500)
      return json({ row: updated })
    }

    if (action === 'delete_row') {
      const rowId = String(body.rowId ?? '')
      const { data: existingRow } = await sb.from('project_data_rows').select('id, table_id').eq('id', rowId).single()
      if (!existingRow || existingRow.table_id !== table.id) return json({ error: 'Linha não encontrada.' }, 404)
      await sb.from('project_data_rows').delete().eq('id', rowId)
      return json({ ok: true })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (e) {
    console.error('[project-db]', e)
    return json({ error: 'Não foi possível processar o pedido.' }, 500)
  }
})
