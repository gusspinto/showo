import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA DE CREDIBILIDADE — separada de propósito do /admin de análise.
   Feita para um screenshot, não para nós decidirmos coisas.

   2026-11-16, 3ª versão: a 2ª ainda parecia "AI slop" ao Gustavo (fundo
   azul-marinho tipo dashboard, números grandes a ocupar o ecrã todo).
   Pedido explícito: fundo quase preto (igual aos emails do Showo, #080808,
   não o #1C2333 do resto do produto), números pequenos lado a lado para
   caber tudo num só screenshot, e um gráfico real, não só números soltos.

   Gráfico: registos por dia, últimos 14 dias, dados reais (sem RPC nova,
   lido direto de profiles.created_at e agrupado no cliente, intervalo
   pequeno, só para admin).
   ══════════════════════════════════════════════════════════════════════════ */

const BG = '#080808'
const BLUE = '#3B82F6'

export default function AdminCredibilidade() {
  const navigate = useNavigate()
  const { isAdmin, loading: authLoading } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true })
  }, [authLoading, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)

      const [
        totalUsersRes,
        newUsersRes,
        totalProjectsRes,
        newProjectsRes,
        retentionRes,
        activityRes,
        topProjectRes,
        dailySignupsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.rpc('admin_get_retention_snapshot'),
        supabase.rpc('admin_get_activity_stats', { p_days: 7 }),
        supabase.from('projects')
          .select('name, slug, score, creator_name')
          .eq('visibility', 'public')
          .not('score', 'is', null)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('profiles').select('created_at').gte('created_at', fourteenDaysAgo.toISOString()),
      ])

      if (cancelled) return

      const snap = retentionRes.data
      const retentionRate = snap?.month_prior_count > 0
        ? Math.round((snap.month_prior_returned / snap.month_prior_count) * 100)
        : null

      // Agrupa por dia (14 barras, hoje incluído), no cliente. Período
      // curto e só para admin, não justifica uma RPC nova.
      const byDay = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        byDay[d.toISOString().slice(0, 10)] = 0
      }
      ;(dailySignupsRes.data ?? []).forEach(r => {
        const key = r.created_at.slice(0, 10)
        if (key in byDay) byDay[key]++
      })
      const dailySignups = Object.entries(byDay).map(([day, n]) => ({ day, n }))

      setStats({
        totalUsers: totalUsersRes.count ?? 0,
        newUsers7d: newUsersRes.count ?? 0,
        totalProjects: totalProjectsRes.count ?? 0,
        newProjects7d: newProjectsRes.count ?? 0,
        activeUsers7d: activityRes.data?.active_range?.length ?? null,
        retentionRate,
        topProject: topProjectRes.data ?? null,
        dailySignups,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  if (authLoading || !isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '36px 24px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            padding: 0, marginBottom: 32, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={13} /> Voltar ao Admin
        </button>

        {loading && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>A carregar...</div>}

        {!loading && stats && (
          <>
            {/* Tira pequena, lado a lado, para caber tudo num screenshot só.
                Nenhum número grande a dominar sozinho. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 36px', marginBottom: 32 }}>
              <Stat value={stats.totalUsers.toLocaleString('pt-PT')} label="utilizadores" />
              <Stat value={stats.totalProjects.toLocaleString('pt-PT')} label="projetos" />
              {stats.activeUsers7d != null && <Stat value={stats.activeUsers7d.toLocaleString('pt-PT')} label="ativos (7d)" />}
              <Stat value={`+${stats.newUsers7d}`} label="novos (7d)" accent />
              {stats.retentionRate != null && <Stat value={`${stats.retentionRate}%`} label="retenção" />}
            </div>

            <DailyChart data={stats.dailySignups} />

            {stats.topProject && (
              <div style={{ marginTop: 32, paddingLeft: 14, borderLeft: `2px solid ${BLUE}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Melhor score no Showo
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
                  {stats.topProject.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {stats.topProject.creator_name ? `${stats.topProject.creator_name} · ` : ''}score {stats.topProject.score}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 44, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          Tira o screenshot só do conteúdo acima, não da barra do navegador.
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? BLUE : '#fff', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function DailyChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.n))
  const w = 680
  const h = 120
  const barGap = 4
  const barW = (w - barGap * (data.length - 1)) / data.length

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Novos registos, últimos 14 dias
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        {data.map((d, i) => {
          const barH = (d.n / max) * (h - 18)
          const x = i * (barW + barGap)
          const isLast = i === data.length - 1
          return (
            <g key={d.day}>
              <rect
                x={x} y={h - barH - 16} width={barW} height={Math.max(barH, 2)}
                fill={isLast ? BLUE : 'rgba(59,130,246,0.45)'} rx={2}
              />
              <text x={x + barW / 2} y={h - 2} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">
                {Number(d.day.slice(8, 10))}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
