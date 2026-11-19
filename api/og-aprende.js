// Página estática, mesmo padrão de og-pricing.js. HowTo schema com os
// passos reais de "Criar um projeto" de AprendeAUsar.jsx (secção
// Projetos). Este texto tem de ficar sempre igual ao desse componente,
// nunca inventado à parte, senão o schema deixa de bater certo com o que
// a página mostra de verdade.
const BASE = 'https://showo.pt'

const TITLE = 'Como usar o Showo — Guia completo'
const DESCRIPTION = 'Guia de utilização do Showo: como criar e publicar um projeto, usar o diário de bordo, o preview público, o score e as missões.'

const HOWTO_STEPS = [
  'Abre a dashboard ou o menu de projetos.',
  'Clica em "Criar projeto" e escolhe o tipo e a área.',
  'Preenche os campos principais e define a visibilidade.',
  'Vai completando o projeto para aumentar o score e melhorar a apresentação.',
]

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function handler(req, res) {
  const canonical = `${BASE}/aprende`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Como criar um projeto no Showo',
    description: 'Passos para criar e publicar o primeiro projeto no Showo.',
    step: HOWTO_STEPS.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
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
