const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = 'https://showo.pt'

export default async function handler(req, res) {
  // Rotas reais em src/App.jsx — /ranking e /empresa nunca existiram como
  // páginas (dava 404 a crawlers), e /aprende-a-usar está errado (a rota é
  // /aprende). /pricing faltava por completo apesar de ser uma página com
  // intenção comercial clara, que devia mesmo estar indexada.
  const staticUrls = [
    { loc: BASE, priority: '1.0', changefreq: 'daily' },
    { loc: `${BASE}/explorar`, priority: '0.8', changefreq: 'daily' },
    { loc: `${BASE}/pricing`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${BASE}/aprende`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${BASE}/login`, priority: '0.5', changefreq: 'monthly' },
  ]

  let projectUrls = []
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      // Mesmo filtro que o Explore.jsx usa nas suas queries — a RLS de
      // `projects` deixa ler qualquer entry_kind='full' (migração 105), o
      // filtro de visibilidade é responsabilidade de quem faz a query, não
      // da base de dados. Sem isto, um projeto marcado como privado entrava
      // no sitemap público na mesma.
      //
      // A tabela `projects` nunca teve `updated_at` (só `created_at`, ver
      // migração 001) — a versão anterior deste ficheiro pedia essa coluna
      // e ordenava por ela, o que fazia a query falhar sempre (confirmado
      // com curl direto à API: "column projects.updated_at does not
      // exist"). Com o catch{} vazio que havia antes, isto nunca apareceu
      // em lado nenhum: o sitemap ficou meses a devolver só as 5 páginas
      // estáticas, sem nenhum projeto, e ninguém deu por isso.
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?select=slug,created_at&entry_kind=eq.full&or=(visibility.eq.public,visibility.is.null)&order=created_at.desc&limit=1000`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      if (!r.ok) {
        console.error('sitemap: Supabase respondeu', r.status, await r.text())
      } else {
        const projects = await r.json()
        if (Array.isArray(projects)) {
          projectUrls = projects.map(p => ({
            loc: `${BASE}/projeto/${p.slug}`,
            lastmod: p.created_at ? p.created_at.split('T')[0] : undefined,
            priority: '0.7',
            changefreq: 'weekly',
          }))
        }
      }
    } catch (err) {
      // Antes ficava em silêncio (catch vazio) — foi assim que o sitemap
      // ficou meses sem nenhuma página de projeto sem ninguém dar por isso.
      console.error('sitemap: falha ao buscar projetos', err)
    }
  } else {
    console.error('sitemap: SUPABASE_URL/SUPABASE_ANON_KEY em falta nas env vars do Vercel')
  }

  const allUrls = [...staticUrls, ...projectUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  res.end(xml)
}
