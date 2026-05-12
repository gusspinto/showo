const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const slug = req.query.slug || ''
  let title = 'Showo'
  let description = 'Transforma projetos em páginas profissionais.'

  if (slug && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=name,ai_tagline&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [project] = await r.json()
      if (project) {
        title = `${project.name} — Showo`
        description = project.ai_tagline || description
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
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<link rel="stylesheet" crossorigin href="/assets/index.css"/>
<script type="module" crossorigin src="/assets/index.js"></script>
</head>
<body>
<div id="root"></div>
</body>
</html>`

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
}
