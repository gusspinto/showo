import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import JSZip from 'npm:jszip@3.10.1'
import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   IMPORTAR PROJETO A PARTIR DE UM TRABALHO QUE JÁ EXISTE
   ──────────────────────────────────────────────────────────────────────────
   A maior fricção de entrada na Showo é esta: o aluno já fez o trabalho — o
   relatório da PAP, os slides da apresentação — e a app pedia-lhe para
   escrever tudo outra vez. Aqui ele envia o ficheiro e a IA devolve o que
   encontrou, campo a campo, para ele CONFIRMAR. Nunca cria nada sozinha:
   quem decide o que fica no projeto continua a ser o aluno.

   Formatos: PDF e imagens vão diretos para o modelo (que os lê nativamente);
   .docx/.pptx são descompactados aqui e reduzidos a texto; .txt/.md são
   descodificados. Cobre tudo o que um aluno português entrega na escola.
   ══════════════════════════════════════════════════════════════════════════ */

const TYPE_LABELS: Record<string, string> = {
  school:   'Projeto de Escola',
  pap:      'PAP (Projeto de Aptidão Profissional)',
  personal: 'Projeto Pessoal',
}

const MAX_TOTAL_BYTES = 12 * 1024 * 1024   // 12 MB somados
const MAX_FILES = 5
const MAX_TEXT_PER_FILE = 24_000           // caracteres, depois de extraído

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function xmlToText(xml: string): string {
  return xml
    // Quebras que o Word/PowerPoint marcam com tags próprias.
    .replace(/<\/w:p>|<\/a:p>|<w:br\s*\/>|<a:br\s*\/>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function officeToText(bytes: Uint8Array, kind: 'docx' | 'pptx'): Promise<string> {
  // JSZip trata de todas as variantes de ZIP (data descriptors, etc.) — o
  // parser à mão de antes rebentava com ficheiros do Word/LibreOffice reais.
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return ''
  }

  const wanted = kind === 'docx'
    ? (n: string) => n === 'word/document.xml'
    : (n: string) => /^ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/.test(n)

  const names = Object.keys(zip.files).filter(wanted).sort((a, b) => {
    const na = Number(a.match(/(\d+)\.xml$/)?.[1] ?? 0)
    const nb = Number(b.match(/(\d+)\.xml$/)?.[1] ?? 0)
    return na - nb
  })
  if (!names.length) return ''

  const parts: string[] = []
  for (const n of names) {
    try {
      parts.push(xmlToText(await zip.files[n].async('string')))
    } catch { /* entrada corrompida: ignora */ }
  }
  return parts.join('\n\n').slice(0, MAX_TEXT_PER_FILE)
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function extOf(name: string) {
  return (name.split('.').pop() ?? '').toLowerCase()
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Autenticação necessária.' }, 401)

  if (!(await checkRateLimit(req, 'import-project', 12))) {
    return json({ error: 'Demasiados pedidos. Tenta daqui a pouco.' }, 429)
  }

  const planCheck = await checkPlanLimit(req, 'createProject', user.id)
  if (planCheck && !planCheck.allowed) {
    return json({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }, 403)
  }

  try {
    const { files, projectType, notes } = await req.json()
    if (!Array.isArray(files) || files.length === 0) {
      return json({ error: 'Nenhum ficheiro recebido.' }, 400)
    }
    if (files.length > MAX_FILES) {
      return json({ error: `Máximo de ${MAX_FILES} ficheiros de cada vez.` }, 400)
    }

    const content: unknown[] = []
    const readNames: string[] = []
    const skipped: { name: string; reason: string }[] = []
    let totalBytes = 0

    for (const f of files) {
      const name = String(f?.name ?? 'ficheiro')
      const b64 = String(f?.data ?? '')
      if (!b64) { skipped.push({ name, reason: 'vazio' }); continue }

      const bytes = b64ToBytes(b64)
      totalBytes += bytes.length
      if (totalBytes > MAX_TOTAL_BYTES) {
        skipped.push({ name, reason: 'demasiado grande' })
        continue
      }

      const mime = String(f?.type ?? '')
      const ext = extOf(name)

      if (mime === 'application/pdf' || ext === 'pdf') {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
        readNames.push(name)
      } else if (IMAGE_TYPES.includes(mime)) {
        content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
        readNames.push(name)
      } else if (ext === 'docx' || ext === 'pptx') {
        const text = await officeToText(bytes, ext as 'docx' | 'pptx')
        if (!text) { skipped.push({ name, reason: 'não foi possível ler' }); continue }
        content.push({ type: 'text', text: `--- Conteúdo de ${name} ---\n${text}` })
        readNames.push(name)
      } else if (ext === 'txt' || ext === 'md' || mime.startsWith('text/')) {
        const text = new TextDecoder().decode(bytes).slice(0, MAX_TEXT_PER_FILE)
        if (!text.trim()) { skipped.push({ name, reason: 'vazio' }); continue }
        content.push({ type: 'text', text: `--- Conteúdo de ${name} ---\n${text}` })
        readNames.push(name)
      } else {
        // .doc/.ppt antigos e afins: dizemos porquê, em vez de falhar em silêncio.
        skipped.push({ name, reason: 'formato não suportado' })
      }
    }

    if (content.length === 0) {
      return json({
        error: 'Não conseguimos ler estes ficheiros. Exporta o trabalho como PDF e tenta outra vez.',
        skipped,
      }, 422)
    }

    const typeLabel = TYPE_LABELS[projectType] ?? 'Projeto'
    const extraNotes = String(notes ?? '').trim().slice(0, 600)

    content.push({
      type: 'text',
      text: `Estes ficheiros são o trabalho já feito por um estudante português. Tipo de projeto: ${typeLabel}.${extraNotes ? `\n\nO estudante acrescentou: "${extraNotes}"` : ''}

Lê o trabalho e extrai o que lá está para preencher a ficha de projeto da Showo. Regras:
- Português de Portugal ("utilizador", "ecrã", "equipa"). Nunca "usuário" nem "tela".
- Escreve texto corrido e natural, como o aluno escreveria sobre o próprio trabalho, não tópicos telegráficos.
- Nunca uses travessões (—) nem enchimento tipo "de forma eficaz", "no âmbito de", "revolucionário".
- NÃO INVENTES. Se o trabalho não diz qual foi o problema, devolve "" nesse campo. Um campo vazio é melhor do que um campo errado: o aluno vai rever isto campo a campo.
- "confidence": para cada campo preenchido, "alta" quando está escrito no trabalho, "media" quando o inferiste do contexto.
- "summary": uma frase, na segunda pessoa, a dizer ao aluno o que encontraste no trabalho dele (ex: "Encontrámos um relatório de PAP sobre uma app de gestão de tarefas, com objetivos, tecnologias e resultados.").
- "missing": lista dos campos importantes que o trabalho não permite preencher, pelo nome legível (ex: ["Público-alvo", "Resultados"]).

Devolve APENAS este JSON, sem markdown à volta:
{
  "summary": "<uma frase>",
  "prefill": {
    "name": "", "area": "", "goal": "", "problem": "", "solution": "",
    "target_audience": "", "features": "", "technologies": "",
    "challenges": "", "results": "", "learnings": ""
  },
  "confidence": { "<campo>": "alta|media" },
  "missing": []
}`,
    })

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      messages: [{ role: 'user', content: content as never }],
    })

    const rawText = (message.content[0] as { type: string; text: string }).text.trim()
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Resposta inválida do modelo')
    const parsed = JSON.parse(match[0])

    return json({
      summary: parsed.summary ?? '',
      prefill: parsed.prefill ?? {},
      confidence: parsed.confidence ?? {},
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      read: readNames,
      skipped,
    })
  } catch (err) {
    console.error('[import-project]', err)
    return json({ error: 'Não foi possível analisar o trabalho. Tenta novamente.' }, 500)
  }
})
