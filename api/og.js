const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = 'https://showo.app'

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const slug = req.query.slug || ''
  let title = 'Showo — Portfolios profissionais para estudantes'
  let description = 'Transforma qualquer projeto escolar numa página profissional com IA.'
  let image = `${BASE}/icon_social.png`
  let canonical = `${BASE}/projeto/${slug}`
  let jsonLd = null

  if (slug && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=name,ai_tagline,ai_description,goal,area,cover_url,score,creator_name,created_at&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [p] = await r.json()
      if (p) {
        title = `${p.name} — Showo`
        description = p.ai_tagline || p.ai_description?.slice(0, 160) || p.goal || `Projeto de ${p.creator_name || 'estudante'} no Showo`
        if (p.cover_url) image = p.cover_url

        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: p.name,
          description: description,
          url: canonical,
          image: image,
          author: p.creator_name ? { '@type': 'Person', name: p.creator_name } : undefined,
          dateCreated: p.created_at,
          keywords: [p.area, 'projeto escolar', 'ensino profissional', 'PAP', 'Showo'].filter(Boolean).join(', '),
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
