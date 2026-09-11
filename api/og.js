const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = 'https://showo.pt'

// Sobe este número sempre que api/og-image.js mudar visualmente — o
// LinkedIn e outras redes guardam a IMAGEM em cache pelo próprio URL,
// à parte da página, por isso sem isto continuam a mostrar a versão
// antiga mesmo depois de forçar um novo scrape da página.
const OG_IMAGE_VERSION = 2

const MIN_DESCRIPTION_LENGTH = 100

/** O LinkedIn (e outras redes) recomenda descrições com pelo menos 100
 * caracteres. Projetos sem tagline/descrição da IA ficam curtos demais —
 * aqui completamos com uma frase genérica da marca, só o suficiente para
 * passar o mínimo, sem repetir se já for longa que chegue. */
function ensureMinDescription(text, area) {
  const filler = [
    `Portfolio criado na Showo, com progresso documentado ao longo do tempo${area ? ` na área de ${area}` : ''}.`,
    'Página pública para partilhar com professores, colegas e recrutadores.',
  ]
  let out = text
  for (const sentence of filler) {
    if (out.length >= MIN_DESCRIPTION_LENGTH) break
    out += (out.endsWith('.') ? ' ' : '. ') + sentence
  }
  return out
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const slug = req.query.slug || ''
  let title = 'Showo — Do projeto à oportunidade'
  let description = 'Portfolio e gestão de projetos com IA — assistente pessoal, diário de bordo, treino de defesa, relatórios, score automático e página profissional para partilhar.'
  let image = `${BASE}/icon_social.png`
  let canonical = `${BASE}/projeto/${slug}`
  let jsonLd = null

  if (slug && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=id,name,ai_tagline,ai_description,goal,area,cover_url,score,creator_name,created_at&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [p] = await r.json()
      if (p) {
        title = `${p.name} — Showo`
        description = p.ai_tagline || p.ai_description?.slice(0, 160) || p.goal || `Projeto de ${p.creator_name || 'alguém'} no Showo`
        if (p.cover_url) image = p.cover_url

        try {
          const tr = await fetch(
            `${SUPABASE_URL}/rest/v1/project_data_tables?project_id=eq.${p.id}&is_public=eq.true&select=id`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
          )
          const publicTables = await tr.json()
          if (Array.isArray(publicTables) && publicTables.length) {
            const n = publicTables.length
            title = `${p.name} · API ativa — Showo`
            description += ` · API ativa (${n} ${n === 1 ? 'tabela pública' : 'tabelas públicas'})`
            image = `${BASE}/api/og-image?slug=${encodeURIComponent(slug)}&v=${OG_IMAGE_VERSION}`
          }
        } catch {}

        description = ensureMinDescription(description, p.area)

        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: p.name,
          description: description,
          url: canonical,
          image: image,
          author: p.creator_name ? { '@type': 'Person', name: p.creator_name } : undefined,
          dateCreated: p.created_at,
          keywords: [p.area, 'portfolio profissional', 'projeto', 'Showo'].filter(Boolean).join(', '),
          aggregateRating: p.score ? {
            '@type': 'AggregateRating',
            ratingValue: p.score,
            bestRating: 100,
            worstRating: 0,
            ratingCount: 1,
          } : undefined,
        }
      }
    } catch {}
  }

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${esc(canonical)}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Showo"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:locale" content="pt_PT"/>

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>

<!-- Favicon -->
<link rel="icon" type="image/png" href="/icon.png"/>

${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}

<link rel="stylesheet" crossorigin href="/assets/index.css"/>
<script type="module" crossorigin src="/assets/index.js"></script>
</head>
<body>
<div id="root"></div>
</body>
</html>`

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
  res.end(html)
}
