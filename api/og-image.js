import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

const interRegular = fetch(new URL('./fonts/Inter-Regular.ttf', import.meta.url)).then(r => r.arrayBuffer())
const interBold = fetch(new URL('./fonts/Inter-Bold.ttf', import.meta.url)).then(r => r.arrayBuffer())

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || ''

  let name = 'Showo'
  let area = ''
  let coverUrl = null
  let tableCount = 0

  if (slug && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=id,name,area,cover_url&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [p] = await r.json()
      if (p) {
        name = p.name
        area = p.area || ''
        coverUrl = p.cover_url

        const tr = await fetch(
          `${SUPABASE_URL}/rest/v1/project_data_tables?project_id=eq.${p.id}&is_public=eq.true&select=id`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        )
        const tables = await tr.json()
        tableCount = Array.isArray(tables) ? tables.length : 0
      }
    } catch { /* mantém os valores por omissão */ }
  }

  const [regular, bold] = await Promise.all([interRegular, interBold])

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
          backgroundColor: '#0b0b0f',
          backgroundImage: coverUrl ? `url(${coverUrl})` : 'linear-gradient(135deg,#12121a,#1c1c28)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          position: 'relative', fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex',
                background: 'linear-gradient(180deg, rgba(10,10,14,0.35) 0%, rgba(10,10,14,0.94) 100%)',
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: 48, left: 64, display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 30, color: '#fff', fontWeight: 700,
              },
              children: 'Showo',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'relative', display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', height: '100%', padding: '56px 64px',
              },
              children: [
                area && {
                  type: 'div',
                  props: {
                    style: { fontSize: 26, color: '#a5a5f0', fontWeight: 700, marginBottom: 10 },
                    children: area,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 60, color: '#fff', fontWeight: 800, lineHeight: 1.12, marginBottom: 26, maxWidth: 980, display: 'flex' },
                    children: name,
                  },
                },
                tableCount > 0 && {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex', alignItems: 'center', gap: 14, alignSelf: 'flex-start',
                      background: 'rgba(16,185,129,0.16)',
                      border: '2px solid rgba(52,211,153,0.55)',
                      borderRadius: 999, padding: '14px 30px',
                    },
                    children: [
                      {
                        type: 'svg',
                        props: {
                          width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none',
                          stroke: '#34d399', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
                          style: { display: 'flex' },
                          children: [
                            { type: 'path', props: { d: 'M12 22v-5' } },
                            { type: 'path', props: { d: 'M9 8V2' } },
                            { type: 'path', props: { d: 'M15 8V2' } },
                            { type: 'path', props: { d: 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z' } },
                          ],
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: 28, color: '#34d399', fontWeight: 800, letterSpacing: 0.5, display: 'flex' },
                          children: `API ATIVA · ${tableCount} ${tableCount === 1 ? 'TABELA PÚBLICA' : 'TABELAS PÚBLICAS'}`,
                        },
                      },
                    ],
                  },
                },
              ].filter(Boolean),
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: bold, weight: 800, style: 'normal' },
      ],
    }
  )
}
