import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   SINCRONIZA VAGAS REAIS DO EURES (Portugal) PARA A TABELA `vagas`
   ──────────────────────────────────────────────────────────────────────────
   O /vagas estava vazio — a infraestrutura (tabela, formulário, candidaturas)
   já existia e funcionava, só nunca ninguém tinha publicado nada real. Em
   vez de esperar por empresas parceiras, importa vagas reais já publicadas
   no EURES (portal oficial de emprego da UE), que autoriza reutilização:
   "Re-use is authorised, provided that ELA is acknowledged as the source
   of the material." (aviso legal do EURES, European Labour Authority).

   Endpoint descoberto ao vivo (não documentado publicamente, é o mesmo que
   o próprio portal usa para a pesquisa): POST .../jv-searchengine/public/
   jv-search/search, com locationCodes:['PT'] a filtrar por Portugal.

   Cada vaga fica com `source='eures'`, `external_id` (dedup — corre todos
   os dias, nunca duplica a mesma vaga), e `employer_name`/`employer_url`
   próprios (o empregador real, não a conta-sistema que faz de dono na
   tabela — a FK de recruiter_id exige sempre um utilizador real).

   Modo de teste: { test: true, limit: N } no corpo, para ver quantas
   vagas entrariam sem gravar nada.
   ══════════════════════════════════════════════════════════════════════════ */

const EURES_SEARCH_URL = 'https://europa.eu/eures/api/jv-searchengine/public/jv-search/search'

// Conta-sistema que "detém" as vagas importadas na FK — nunca aparece ao
// utilizador, porque employer_name/employer_url (por vaga) substituem
// sempre o nome da conta na interface (ver Vagas.jsx, source === 'eures').
const SYSTEM_RECRUITER_ID = 'bc6e9453-35a9-4e37-afc8-c7bedf057480'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const TIPO_MAP: Record<string, string> = {
  temporary: 'estagio',
  apprenticeship: 'estagio',
  directhire: 'full_time',
  other: 'freelance',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Lê sempre pela query string, nunca por req.json() — pedidos feitos via
    // net.http_post (pg_cron) por vezes fecham a ligação antes do corpo
    // chegar a ser lido pelo runtime ("error reading a body from
    // connection"), mesmo dentro de try/catch. A query string não tem esse
    // problema, e o cron nunca precisa de mais do que estes dois valores.
    const url = new URL(req.url)
    const isTest = url.searchParams.get('test') === 'true'
    const limitParam = Number(url.searchParams.get('limit'))
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20

    // O endpoint não é uma API pública documentada — é o que o próprio
    // portal usa. Sem cabeçalhos a parecer um pedido de browser real, a
    // ligação às vezes fecha a meio da resposta ("error reading a body
    // from connection"), por isso envia-se Accept/Origin/User-Agent como o
    // browser enviaria.
    let data: any
    try {
      const res = await fetch(EURES_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://europa.eu',
          'Referer': 'https://europa.eu/eures/portal/jv-se/search',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({ positionScheduleCodes: [], page: 1, resultsPerPage: limit, locationCodes: ['PT'] }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        return new Response(JSON.stringify({ error: 'EURES não respondeu como esperado.', status: res.status, detail: errText.slice(0, 300) }), { status: 502, headers: corsHeaders })
      }
      data = await res.json()
    } catch (fetchErr) {
      // Diagnóstico explícito — "error reading a body from connection" sem
      // isto escondia-se atrás de um genérico "Erro interno.".
      return new Response(JSON.stringify({ error: 'Falha a contactar o EURES.', detail: String(fetchErr?.message || fetchErr), name: fetchErr?.name }), { status: 502, headers: corsHeaders })
    }
    const jvs = Array.isArray(data.jvs) ? data.jvs : []

    const rows = jvs.map((j: any) => {
      const descHtml = j.translations?.pt?.description ?? j.description ?? ''
      const title = j.translations?.pt?.title ?? j.title ?? 'Vaga'
      const desc = stripHtml(descHtml)
      const fonteNote = '\n\n— Vaga importada do EURES (European Labour Authority), portal oficial de emprego da União Europeia.'
      return {
        recruiter_id: SYSTEM_RECRUITER_ID,
        titulo: title.slice(0, 200),
        tipo: TIPO_MAP[j.positionOfferingCode] ?? 'full_time',
        area: null,
        descricao: (desc.slice(0, 3000) + fonteNote).slice(0, 3000),
        requisitos: null,
        localizacao: 'Portugal',
        is_remote: false,
        is_active: true,
        skills: [],
        source: 'eures',
        external_id: `eures:${j.id}`,
        employer_name: j.employer?.name || null,
        employer_url: j.employer?.website || null,
      }
    }).filter((r: any) => r.titulo && r.external_id)

    if (isTest) {
      return new Response(JSON.stringify({ ok: true, test: true, candidates: rows.length, sample: rows.slice(0, 3) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: inserted, error } = await supabase
      .from('vagas')
      .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error('[sync-eures-jobs] upsert error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true, fetched: rows.length, inserted: inserted?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[sync-eures-jobs]', e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
