const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = 'https://showo.pt'

// Mesmo padrão do api/og.js (projetos), aplicado aos perfis públicos
// (/u/:username). Sem isto, qualquer crawler que não corra JavaScript
// (GPTBot, ClaudeBot, PerplexityBot e CCBot, nenhum deles corre JS) via
// a mesma shell genérica da homepage para todos os perfis, confirmado ao
// vivo em 19/11 com curl direto. Pedido do Gustavo: estas páginas acabam
// partilhadas em LinkedIn/CV, por isso valem o mesmo tratamento que já
// existia só para projetos.
const MIN_DESCRIPTION_LENGTH = 100

function ensureMinDescription(text, projectCount) {
  const filler = [
    projectCount > 0
      ? `${projectCount} ${projectCount === 1 ? 'projeto' : 'projetos'} documentados no Showo.`
      : 'Portfolio criado no Showo.',
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
  const username = req.query.username || ''
  let title = 'Showo — Do projeto à oportunidade'
  let description = 'Portfolio e gestão de projetos com IA — assistente pessoal, diário de bordo, treino de defesa, relatórios, score automático e página profissional para partilhar.'
  let image = `${BASE}/icon_social.png`
  let canonical = `${BASE}/u/${username}`
  let jsonLd = null

  if (username && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id,full_name,bio,profile_headline,avatar_url,banned_at,profile_visibility,company,area&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [p] = await r.json()
      // banned_at / profile_visibility='private': nunca servir conteúdo
      // real a crawlers para estas contas, fica no genérico por omissão.
      if (p && !p.banned_at && p.profile_visibility !== 'private') {
        const name = p.full_name || username

        let projectCount = 0
        try {
          const pr = await fetch(
            `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${p.id}&entry_kind=eq.full&or=(visibility.eq.public,visibility.is.null)&select=id`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
          )
          const rows = await pr.json()
          projectCount = Array.isArray(rows) ? rows.length : 0
        } catch {}

        title = `${name} — Showo`
        description = p.profile_headline || p.bio?.slice(0, 160) || `Perfil de ${name}${p.company ? ` na ${p.company}` : ''} no Showo`
        description = ensureMinDescription(description, projectCount)
        if (p.avatar_url) image = p.avatar_url

        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          mainEntity: {
            '@type': 'Person',
            name,
            description,
            image,
            url: canonical,
            ...(p.company ? { worksFor: { '@type': 'Organization', name: p.company } } : {}),
          },
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
<meta property="og:type" content="profile"/>
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
