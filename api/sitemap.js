const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = 'https://showo.app'

export default async function handler(req, res) {
  const staticUrls = [
    { loc: BASE, priority: '1.0', changefreq: 'daily' },
    { loc: `${BASE}/explorar`, priority: '0.8', changefreq: 'daily' },
    { loc: `${BASE}/ranking`, priority: '0.8', changefreq: 'daily' },
  ]

  let projectUrls = []
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?select=slug,updated_at&order=updated_at.desc&limit=1000`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const projects = await r.json()
      if (Array.isArray(projects)) {
        projectUrls = projects.map(p => ({
          loc: `${BASE}/projeto/${p.slug}`,
          lastmod: p.updated_at ? p.updated_at.split('T')[0] : undefined,
          priority: '0.7',
          changefreq: 'weekly',
        }))
      }
    } catch {}
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
