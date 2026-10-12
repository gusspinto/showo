import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'
import { getGithubToken } from '../_shared/githubAuth.ts'
import { syncProjectCommits } from '../_shared/githubSync.ts'

/* ══════════════════════════════════════════════════════════════════════════
   SINCRONIZAR COM O GITHUB
   ──────────────────────────────────────────────────────────────────────────
   Lê um repositório pela API do GitHub e traz para dentro do projeto o que
   já lá está datado: commits, linguagens e as datas do primeiro e último
   trabalho.

   Três decisões que definem o que isto é (e o que não é):

   1. OAuth é opcional. Sem conta ligada, só lê repositórios públicos (como
      sempre foi). Com a conta GitHub ligada (github_connections), lê também
      privados do próprio utilizador — nunca de outra pessoa, o GitHub só
      deixa o token aceder ao que o dono autorizou. Sem token nenhum (nem
      pessoal nem o GITHUB_TOKEN da app), cai no limite público de 60/h.

   2. Um dia = uma entrada, não um commit = uma entrada. Um dia de trabalho
      normal são 15 commits com mensagens como "fix" e "wip"; despejá-los no
      diário enterrava o que o aluno escreveu à mão debaixo de ruído.

   3. Entradas com kind='auto' e external_id. O kind impede que o
      generate-report as escreva na primeira pessoa como se fossem reflexões
      do aluno; o external_id impede que sincronizar duas vezes duplique o
      histórico.
   ══════════════════════════════════════════════════════════════════════════ */

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Precisas de sessão iniciada.' }, 401)

  // O limite é por IP, e uma turma inteira sai pela mesma linha da escola —
  // com 10/h a quinta pessoa a sincronizar levava com um erro sem perceber
  // porquê. 40/h continua a travar um ciclo a bater na API do GitHub.
  if (!(await checkRateLimit(req, 'github-sync', 40))) {
    return json({ error: 'Demasiadas sincronizações seguidas. Tenta daqui a pouco.' }, 429)
  }

  try {
    const { projectId, action = 'sync' } = await req.json()
    if (typeof projectId !== 'string' || !projectId) {
      return json({ error: 'Projeto em falta.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id, github_url')
      .eq('id', projectId)
      .single()

    if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
    // user_id em projects é TEXT, não uuid.
    if (String(project.user_id) !== String(user.id)) {
      return json({ error: 'Só o dono do projeto pode sincronizar.' }, 403)
    }

    // Com conta GitHub ligada (OAuth), lê também repositórios privados do
    // próprio utilizador — sem ligação, mantém-se só públicos (userToken null).
    const userToken = await getGithubToken(supabase, user.id)

    // ── Desfazer ──
    // Sincronizar o repositório errado deixava até 300 entradas para apagar
    // uma a uma. Isto tira todas as que vieram do GitHub (external_id
    // 'gh:…') — de qualquer repositório, porque o caso típico é ter trocado
    // o link — e limpa os números da página pública. As entradas escritas à
    // mão não têm external_id e nunca são tocadas.
    // Vem antes da validação do link de propósito: quem apagou o link do
    // repositório tem de continuar a conseguir limpar o que ele trouxe.
    if (action === 'remove') {
      const { data: gone, error: delErr } = await supabase
        .from('project_journal_entries')
        .delete()
        .eq('project_id', project.id)
        .like('external_id', 'gh:%')
        .select('id')
      if (delErr) {
        console.error('[github-sync] remove', delErr.message)
        return json({ error: 'Não foi possível remover as entradas.' }, 500)
      }
      await supabase
        .from('projects')
        .update({ github_stats: null, github_synced_at: null })
        .eq('id', project.id)
      return json({ ok: true, entries_removed: gone?.length ?? 0 })
    }
    if (action !== 'sync') return json({ error: 'Ação desconhecida.' }, 400)

    const result = await syncProjectCommits(supabase, project, user.id, userToken)
    if (!result.ok) return json({ error: result.error }, result.status)
    return json({ ok: true, stats: result.stats, entries_added: result.entries_added })
  } catch (e) {
    console.error('[github-sync]', e)
    return json({ error: 'Não foi possível sincronizar agora.' }, 500)
  }
})
