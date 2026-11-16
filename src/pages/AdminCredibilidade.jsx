import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA DE CREDIBILIDADE — separada de propósito do /admin de análise.
   O /admin é feito para nós (Gustavo/Bruno) decidirmos coisas, cheio de
   filtros e tabelas técnicas. Esta é feita para ser mostrada a outras
   pessoas: um screenshot direto, com o visual do próprio produto (fundo
   #1C2333, azul #3B82F6), não uma tabela de admin genérica.

   Números sempre reais e verificáveis, nunca "esta semana" por calendário
   (dá 0 numa segunda de manhã e seria falso postar assim) — sempre janelas
   móveis dos últimos N dias.
   ══════════════════════════════════════════════════════════════════════════ */

const BG = '#1C2333'
const BLUE = '#3B82F6'
const CARD_BG = 'rgba(255,255,255,0.04)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

function StatCard({ label, value, sub, big }) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 18,
      padding: big ? '32px 28px' : '26px 24px',
      gridColumn: big ? 'span 2' : 'span 1',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: big ? 64 : 48, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

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
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      const [
        totalUsersRes,
        newUsersRes,
        totalProjectsRes,
        newProjectsRes,
        retentionRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.rpc('admin_get_retention_snapshot'),
      ])

      if (cancelled) return

      const snap = retentionRes.data
      const retentionRate = snap?.month_prior_count > 0
        ? Math.round((snap.month_prior_returned / snap.month_prior_count) * 100)
        : null

      setStats({
        totalUsers: totalUsersRes.count ?? 0,
        newUsers7d: newUsersRes.count ?? 0,
        totalProjects: totalProjectsRes.count ?? 0,
        newProjects7d: newProjectsRes.count ?? 0,
        returning: snap?.month_prior_returned ?? null,
        returningOf: snap?.month_prior_count ?? null,
        retentionRate,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  if (authLoading || !isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '40px 24px 80px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            padding: 0, marginBottom: 28, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Voltar ao Admin
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <img src="/icon.png" alt="Showo" width={36} height={36} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Showo</span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Números reais, prontos a mostrar
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 36px', lineHeight: 1.6 }}>
          Esta página é só para screenshot. Pode ser mostrada a utilizadores, a parceiros, a quem quiseres. Para a análise interna a sério, usa o Admin normal.
        </p>

        {loading && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>A carregar...</div>}

        {!loading && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <StatCard
              big
              label="Utilizadores"
              value={stats.totalUsers.toLocaleString('pt-PT')}
              sub={`+${stats.newUsers7d} nos últimos 7 dias`}
            />
            <StatCard
              label="Projetos criados"
              value={stats.totalProjects.toLocaleString('pt-PT')}
              sub={`+${stats.newProjects7d} nos últimos 7 dias`}
            />
            <StatCard
              label="Taxa de retenção"
              value={stats.retentionRate != null ? `${stats.retentionRate}%` : '—'}
              sub="Voltaram ao mês seguinte"
            />
            <StatCard
              label="Pessoas que voltam"
              value={stats.returning != null ? stats.returning.toLocaleString('pt-PT') : '—'}
              sub={stats.returningOf != null ? `de ${stats.returningOf.toLocaleString('pt-PT')} analisados` : ''}
            />
          </div>
        )}

        <div style={{ marginTop: 40, padding: '16px 20px', background: 'rgba(59,130,246,0.1)', border: `1px solid rgba(59,130,246,0.25)`, borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Tira o screenshot só desta página, não da barra do navegador nem do botão "Voltar ao Admin" acima.
          </div>
        </div>
      </div>
    </div>
  )
}
