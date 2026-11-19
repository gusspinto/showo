// Página estática (sem dados do utilizador), mesmo problema das outras:
// sem isto, um crawler sem JavaScript só via a shell genérica da
// homepage, nunca o FAQ real que já existe em src/pages/Pricing.jsx.
// O FAQPage schema só é verdadeiro se bater certo com o texto visível na
// página, por isso o texto aqui tem de ficar sempre igual ao array FAQ de
// Pricing.jsx, nunca inventado à parte. Corrigido 19/11 depois do
// Gustavo confirmar que a resposta antiga sobre privacidade estava
// errada (um projeto só entra em motores de busca depois de o dono o
// marcar como público, nunca só por existir).
const BASE = 'https://showo.pt'

const TITLE = 'Preços — Showo'
const DESCRIPTION = 'Planos do Showo: grátis para sempre, Plus a partir de 4,49€/mês e Pro a partir de 8,99€/mês (preço de lançamento). Portfolio, diário de bordo, treino de defesa e análise de IA.'

const FAQ = [
  {
    q: 'O que acontece quando esgoto os limites de um mês?',
    a: 'As gerações com IA dessa funcionalidade ficam bloqueadas até ao início do mês seguinte, quando renovam sozinhas. O resto da plataforma continua disponível sem limite: editor, portfólio, diário e agenda.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, nas definições da conta, a qualquer momento. Continuas com acesso ao plano até ao fim do período já pago, sem penalização nenhuma.',
  },
  {
    q: 'A minha escola paga por mim?',
    a: 'Se a tua escola tiver conta institucional no Showo, és promovido automaticamente assim que entras na turma com o código dela. Não pagas nada.',
  },
  {
    q: 'Podem pagar por mim?',
    a: 'Sim. O checkout aceita qualquer cartão, não precisa de estar em teu nome.',
  },
  {
    q: 'Os meus projetos ficam visíveis publicamente?',
    a: 'Um projeto novo começa sempre privado. Só fica visível a quem tem o link, e só entra em motores de busca como o Google, depois de tu próprio o marcares como público nas definições do projeto.',
  },
]

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function handler(req, res) {
  const canonical = `${BASE}/pricing`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
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
