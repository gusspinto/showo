import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA DE CREDIBILIDADE — separada de propósito do /admin de análise.
   O /admin é feito para nós (Gustavo/Bruno) decidirmos coisas. Esta é feita
   para ser mostrada a outras pessoas: um screenshot direto.

   2026-11-16, 2ª versão: a 1ª (grelha de cartões todos iguais, etiqueta em
   maiúsculas + número gigante) parecia o template genérico de "dashboard
   de IA", o Gustavo apontou isso diretamente. Refeito como página
   editorial: um número hero sozinho, uma faixa de factos finos sem
   caixas, e um projeto real em destaque com citação, em vez de mais
   cartões iguais.

   Números sempre em janela móvel de 7 dias, nunca "esta semana" por
   calendário (dá 0 numa segunda de manhã, seria falso postar assim).
   ══════════════════════════════════════════════════════════════════════════ */

const BG = '#1C2333'
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
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      const [
        totalUsersRes,
        newUsersRes,
        totalProjectsRes,
        newProjectsRes,
        retentionRes,
        activityRes,
        topProjectRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.rpc('admin_get_retention_snapshot'),
        supabase.rpc('admin_get_activity_stats', { p_days: 7 }),
        supabase.from('projects')
          .select('name, slug, score, creator_name')
          .eq('visibility', 'public')
          .not('score', 'is', null)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle(),
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
        activeUsers7d: activityRes.data?.active_range?.length ?? null,
        returning: snap?.month_prior_returned ?? null,
        returningOf: snap?.month_prior_count ?? null,
        retentionRate,
        topProject: topProjectRes.data ?? null,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  if (authLoading || !isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '48px 24px 100px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            padding: 0, marginBottom: 48, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Voltar ao Admin
        </button>

        {loading && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>A carregar...</div>}

        {!loading && stats && (
          <>
            {/* Hero: um número sozinho, sem caixa, sem etiqueta em
                maiúsculas. É o que se lê primeiro num screenshot. */}
            <div style={{ marginBottom: 56 }}>
              <div style={{
                fontSize: 'clamp(72px, 14vw, 128px)', fontWeight: 800, color: '#fff',
                lineHeight: 0.95, letterSpacing: '-3px', fontFamily: 'var(--font-heading)',
              }}>
                {stats.totalUsers.toLocaleString('pt-PT')}
              </div>
              <div style={{ fontSize: 19, color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>
                pessoas já construíram o seu portefólio no Showo
                {stats.newUsers7d > 0 && <span style={{ color: BLUE, fontWeight: 600 }}> · +{stats.newUsers7d} esta semana</span>}
              </div>
            </div>

            {/* Faixa de factos: linhas finas, não caixas repetidas. Cada um
                tem um peso visual diferente, de propósito. */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <FactRow
                value={stats.totalProjects.toLocaleString('pt-PT')}
                label="projetos publicados"
                detail={stats.newProjects7d > 0 ? `${stats.newProjects7d} novos nos últimos 7 dias` : null}
              />
              {stats.activeUsers7d != null && (
                <FactRow
                  value={stats.activeUsers7d.toLocaleString('pt-PT')}
                  label="pessoas ativas nos últimos 7 dias"
                />
              )}
              {stats.retentionRate != null && (
                <FactRow
                  value={`${stats.retentionRate}%`}
                  label="voltam ao mês seguinte"
                  detail={stats.returningOf != null ? `${stats.returning} de ${stats.returningOf} analisados` : null}
                />
              )}
            </div>

            {/* Projeto real em destaque, como uma citação, não um cartão de
                estatística. É o que mais convence quem nunca ouviu falar do
                Showo: ver uma pessoa real a sério, não um número abstrato. */}
            {stats.topProject && (
              <div style={{ marginTop: 56, paddingLeft: 20, borderLeft: `3px solid ${BLUE}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
                  Projeto com melhor score no Showo
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 6 }}>
                  {stats.topProject.name}
                </div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>
                  {stats.topProject.creator_name ? `${stats.topProject.creator_name} · ` : ''}score {stats.topProject.score}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 64, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Tira o screenshot só do conteúdo acima, não da barra do navegador.
        </div>
      </div>
    </div>
  )
}

function FactRow({ value, label, detail }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap',
      padding: '22px 0', borderBottom: '1px solid rgba(255,255,255,0.12)',
    }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)', minWidth: 100 }}>
        {value}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)' }}>{label}</div>
        {detail && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{detail}</div>}
      </div>
    </div>
  )
}
