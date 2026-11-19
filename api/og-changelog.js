// Página estática, mesmo padrão de og-pricing.js e og-aprende.js. Conteúdo
// tem de ficar sempre igual ao de Changelog.jsx, nunca inventado à parte.
const BASE = 'https://showo.pt'

const TITLE = 'Changelog — Showo'
const DESCRIPTION = 'O que mudou no Showo recentemente: novidades reais na plataforma, como pagamentos, personalização de projetos e o diário.'

const ENTRIES = [
  { date: 'Outubro de 2026', title: 'Plano anual com Multibanco e MB WAY' },
  { date: 'Outubro de 2026', title: 'Identidade visual do projeto' },
  { date: 'Outubro de 2026', title: 'Relatório integrado na página do projeto' },
  { date: 'Outubro de 2026', title: 'Diário de projeto mais completo' },
]

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function handler(req, res) {
  const canonical = `${BASE}/changelog`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Changelog do Showo',
    itemListElement: ENTRIES.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.title,
    })),
  }

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESCRIPTION)}"/>
<link rel="canonical" href="${esc(canonical)}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Showo"/>
<meta property="og:title" content="${esc(TITLE)}"/>
<meta property="og:description" content="${esc(DESCRIPTION)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${BASE}/icon_social.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:locale" content="pt_PT"/>

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(TITLE)}"/>
<meta name="twitter:description" content="${esc(DESCRIPTION)}"/>
<meta name="twitter:image" content="${BASE}/icon_social.png"/>

<!-- Favicon -->
<link rel="icon" type="image/png" href="/icon.png"/>

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

<link rel="stylesheet" crossorigin href="/assets/index.css"/>
<script type="module" crossorigin src="/assets/index.js"></script>
</head>
<body>
<div id="root"></div>
</body>
</html>`

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.end(html)
}
