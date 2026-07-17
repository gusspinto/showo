import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import {
  Swords, Lock, CheckCircle2, Circle, ChevronRight,
  Zap, Star, Target, BookOpen, Users, Globe, TrendingUp,
  Folder, Award, Lightbulb, ArrowRight, Medal, Send, Eye,
} from 'lucide-react'

const C = {
  bg: 'var(--c-bg)',
  bgAlt: 'var(--c-bg-alt)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  blue: '#1b78f7',
  green: '#22c55e',
  yellow: '#fbbf24',
  purple: '#a78bfa',
  red: '#ef4444',
  glass: 'var(--c-glass)', glassHover: 'var(--c-glass-hover)',
  glassBorder: 'var(--c-glass-border)', glassBorderBright: 'var(--c-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

// Mission definitions — keyed so ProjectPage can also reference them
export const MISSIONS = [
  {
    id: 'first_project',
    title: 'Primeiro projeto',
    description: 'Cria o teu primeiro projeto na plataforma.',
    xp: 20,
    icon: Folder,
    color: C.blue,
    category: 'Início',
  },
  {
    id: 'complete_profile',
    title: 'Perfil completo',
    description: 'Preenche o teu perfil com foto, bio e escola.',
    xp: 15,
    icon: Star,
    color: C.yellow,
    category: 'Perfil',
  },
  {
    id: 'score_60',
    title: 'Score 60+',
    description: 'Alcança um score de 60 ou mais num projeto.',
    xp: 25,
    icon: Target,
    color: C.green,
    category: 'Qualidade',
  },
  {
    id: 'score_90',
    title: 'Score 90+',
    description: 'Alcança um score de 90 ou mais num projeto.',
    xp: 50,
    icon: Zap,
    color: '#f97316',
    category: 'Qualidade',
  },
  {
    id: 'share_project',
    title: 'Partilhado',
    description: 'Partilha o link do teu projeto com alguém.',
    xp: 10,
    icon: Globe,
    color: '#06b6d4',
    category: 'Partilha',
  },
  {
    id: '50_views',
    title: '50 Visualizações',
    description: 'O teu projeto foi visto 50 vezes.',
    xp: 20,
    icon: TrendingUp,
    color: C.purple,
    category: 'Alcance',
  },
  {
    id: '200_views',
    title: '200 Visualizações',
    description: 'O teu projeto foi visto 200 vezes.',
    xp: 40,
    icon: TrendingUp,
    color: C.purple,
    category: 'Alcance',
  },
  {
    id: 'add_collaborator',
    title: 'Equipa',
    description: 'Adiciona um colaborador ao teu projeto.',
    xp: 15,
    icon: Users,
    color: '#10b981',
    category: 'Colaboração',
  },
  {
    id: 'ai_analysis',
    title: 'Análise IA',
    description: 'Usa a análise de IA num dos teus projetos.',
    xp: 10,
    icon: Lightbulb,
    color: '#f59e0b',
    category: 'IA',
  },
  {
    id: 'three_projects',
    title: 'Portfólio',
    description: 'Cria 3 projetos diferentes.',
    xp: 30,
    icon: BookOpen,
    color: C.blue,
    category: 'Portfólio',
  },
  {
    id: 'internship_ready',
    title: 'Pronto para estágio',
    description: 'Um dos teus projetos atinge "Pronto para estágio".',
    xp: 60,
    icon: Award,
    color: '#f59e0b',
    category: 'Carreira',
  },

  // ── Discovery missions — nudge toward profile/app features that raise
  // visibility to recruiters, not just project-building. ──
  {
    id: 'available_for_work',
    title: 'Disponível para trabalho',
    description: 'Ativa "Disponível para trabalho" no teu perfil.',
    xp: 10,
    icon: Zap,
    color: C.green,
    category: 'Perfil',
  },
  {
    id: 'link_linkedin',
    title: 'LinkedIn ligado',
    description: 'Adiciona o link do teu LinkedIn ao perfil.',
    xp: 10,
    icon: Globe,
    color: '#0a66c2',
    category: 'Perfil',
  },
  {
    id: 'add_skills',
    title: 'Competências',
    description: 'Adiciona pelo menos 3 competências ao teu perfil.',
    xp: 15,
    icon: Lightbulb,
    color: '#f59e0b',
    category: 'Perfil',
  },
  {
    id: 'apply_vaga',
    title: 'Primeira candidatura',
    description: 'Candidata-te a uma vaga ou estágio em Vagas.',
    xp: 15,
    icon: Send,
    color: '#06b6d4',
    category: 'Carreira',
  },

  // ── Repeatable-feel missions — same one-time-unlock mechanism as the rest
  // (no separate completion tracking), but framed as the next tier of an
  // action a student can keep doing, so the list doesn't run dry after the
  // first project. ──
  {
    id: 'three_candidaturas',
    title: 'Candidato ativo',
    description: 'Candidata-te a 3 vagas ou estágios.',
    xp: 30,
    icon: Send,
    color: '#06b6d4',
    category: 'Carreira',
  },
  {
    id: 'five_projects',
    title: 'Portfólio expandido',
    description: 'Cria 5 projetos diferentes.',
    xp: 45,
    icon: BookOpen,
    color: C.blue,
    category: 'Portfólio',
  },
  {
    id: '500_views',
    title: '500 Visualizações',
    description: 'O teu portfólio foi visto 500 vezes no total.',
    xp: 60,
    icon: TrendingUp,
    color: C.purple,
    category: 'Alcance',
  },
]

// extra carries signals that aren't part of the core projects/profile shape
// every caller already has on hand (e.g. candidaturas count) — callers that
// don't pass it just get `false` for the missions that need it, which only
// Dashboard.jsx's XP total/toast detector needs to stay in sync for.
export function checkMissionProgress(mission, projects, profile, user, extra = {}) {
  if (!projects) return false

  switch (mission.id) {
    case 'first_project':
      return projects.length >= 1

    case 'complete_profile':
      return !!(
        profile?.avatar_url &&
        profile?.bio
      )

    case 'score_60':
      return projects.some(p => (p.score ?? 0) >= 60)

    case 'score_90':
      return projects.some(p => (p.score ?? 0) >= 90)

    case 'share_project':
      // Done when at least one project has been viewed by someone (views > 0 means was shared/visited)
      return projects.some(p => (p.views ?? 0) > 0)

    case '50_views':
      return projects.reduce((s, p) => s + (p.views ?? 0), 0) >= 50

    case '200_views':
      return projects.reduce((s, p) => s + (p.views ?? 0), 0) >= 200

    case 'add_collaborator':
      return projects.some(p => (p.collaborator_count ?? 0) > 0)

    case 'ai_analysis':
      return projects.some(p => p.ai_feedback)

    case 'three_projects':
      return projects.length >= 3

    case 'internship_ready':
      // Needs: score ≥ 75 + cover image + AI analysis — project looks polished enough for employers
      return projects.some(p => (p.score ?? 0) >= 75 && p.cover_url && p.ai_feedback)

    case 'available_for_work':
      return !!profile?.available_for_work

    case 'link_linkedin':
      return !!profile?.linkedin_url

    case 'add_skills':
      return (profile?.skills?.length ?? 0) >= 3

    case 'apply_vaga':
      return (extra.candidaturaCount ?? 0) >= 1

    case 'three_candidaturas':
      return (extra.candidaturaCount ?? 0) >= 3

    case 'five_projects':
      return projects.length >= 5

    case '500_views':
      return projects.reduce((s, p) => s + (p.views ?? 0), 0) >= 500

    default:
      return false
  }
}

// Returns { current, max } for missions with measurable progress, null for binary ones
function getMissionProgress(missionId, projects, extra = {}) {
  if (!projects) return null
  const totalViews = projects.reduce((s, p) => s + (p.views ?? 0), 0)
  const bestScore  = projects.length ? Math.max(0, ...projects.map(p => p.score ?? 0)) : 0
  switch (missionId) {
    case 'score_60':      return { current: Math.min(bestScore, 60),  max: 60  }
    case 'score_90':      return { current: Math.min(bestScore, 90),  max: 90  }
    case '50_views':      return { current: Math.min(totalViews, 50), max: 50  }
    case '200_views':     return { current: Math.min(totalViews, 200), max: 200 }
    case '500_views':     return { current: Math.min(totalViews, 500), max: 500 }
    case 'three_projects':return { current: Math.min(projects.length, 3), max: 3 }
    case 'five_projects': return { current: Math.min(projects.length, 5), max: 5 }
    case 'three_candidaturas': return { current: Math.min(extra.candidaturaCount ?? 0, 3), max: 3 }
    default:              return null
  }
}

function MissionCard({ mission, done, progress }) {
  const [hov, setHov] = useState(false)
  const Icon = mission.icon
  const accent = mission.color
  const pct = progress ? Math.round((progress.current / progress.max) * 100) : 0

  if (done) {
    return (
      <div
        className="missoes-card"
        style={{
          background: C.glass,
          border: `1px solid ${C.glassBorder}`,
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          opacity: 0.5,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: C.bgAlt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={C.subtle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, textDecoration: 'line-through' }}>{mission.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.subtle }}>+{mission.xp} XP</span>
          <CheckCircle2 size={15} color={C.subtle} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="missoes-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.glassHover : C.glass,
        border: `1px solid ${hov ? C.glassBorderBright : C.glassBorder}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={accent} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{mission.title}</div>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginBottom: progress ? 6 : 0 }}>
          {mission.description}
        </div>
        {progress && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: C.subtle, fontWeight: 600 }}>{progress.current} / {progress.max}</span>
              <span style={{ fontSize: 10, color: pct >= 75 ? accent : C.subtle, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: `${accent}20`, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: `linear-gradient(90deg, ${accent}bb, ${accent})`,
                borderRadius: 99, transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* XP + Status */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginBottom: 3 }}>+{mission.xp} XP</div>
        <Circle size={15} color={C.subtle} />
      </div>
    </div>
  )
}

export default function Missoes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState(null)
  const [profile, setProfile] = useState(null)
  const [candidaturaCount, setCandidaturaCount] = useState(0)
  const [recruiterInviteCount, setRecruiterInviteCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    async function load() {
      const [{ data: projs }, { data: prof }, { count: candCount }, { count: inviteCount }] = await Promise.all([
        supabase.from('projects')
          .select('id, score, views, ai_feedback, cover_url, collaborator_count:project_collaborators(count)')
          .eq('user_id', user.id),
        supabase.from('profiles')
          .select('avatar_url, bio, skills, linkedin_url, available_for_work')
          .eq('id', user.id)
          .single(),
        supabase.from('candidaturas').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('vaga_invites').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
      ])

      // Flatten collaborator_count from aggregate
      const normalized = (projs || []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count)
          ? (p.collaborator_count[0]?.count ?? 0)
          : (p.collaborator_count ?? 0),
      }))

      setProjects(normalized)
      setProfile(prof)
      setCandidaturaCount(candCount ?? 0)
      setRecruiterInviteCount(inviteCount ?? 0)
      setLoading(false)
    }

    load()
  }, [user])

  if (!user) return null

  const missionExtra = { candidaturaCount }
  const missions = MISSIONS.map(m => ({
    ...m,
    done: loading ? false : checkMissionProgress(m, projects, profile, user, missionExtra),
  }))

  const doneMissions = missions.filter(m => m.done)
  const pendingMissions = missions.filter(m => !m.done)
  const totalXP = missions.reduce((s, m) => s + m.xp, 0)
  const earnedXP = doneMissions.reduce((s, m) => s + m.xp, 0)
  const pct = totalXP > 0 ? Math.round((earnedXP / totalXP) * 100) : 0

  const categories = [...new Set(MISSIONS.map(m => m.category))]

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`
        @media (max-width: 480px) { .missoes-hd { gap: 10px !important; } .missoes-hd h1 { font-size: clamp(22px, 5vw, 32px) !important; } }
        @media (max-width: 480px) { .missoes-stats { flex-direction: column !important; gap: 8px !important; } }
        @media (max-width: 380px) { .missoes-card { gap: 10px !important; padding: 12px !important; } }
      `}</style>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="missoes-hd" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Swords size={24} color="#1b78f7" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: C.text, letterSpacing: '-1px', fontFamily: 'var(--font-heading)' }}>
              Missões
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Completa missões para ganhar XP e desbloquear conquistas
            </p>
          </div>
          <button
            onClick={() => navigate('/conquistas')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              padding: '6px 12px', borderRadius: 7,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
          >
            <Medal size={13} color="currentColor" />
            Conquistas
          </button>
        </div>

        {/* XP Progress card */}
        <div style={{
          ...C.glassStyle,
          background: C.glass, border: `1px solid ${C.glassBorder}`,
          borderRadius: 12, padding: '20px 24px', marginBottom: 28, marginTop: 24,
        }}>
          <div className="missoes-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>XP Total</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.blue, letterSpacing: '-1px' }}>
                {loading ? '—' : earnedXP}
                <span style={{ fontSize: 14, color: C.subtle, fontWeight: 500 }}>/{totalXP} XP</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Completas</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.green, letterSpacing: '-1px' }}>
                {loading ? '—' : doneMissions.length}
                <span style={{ fontSize: 14, color: C.subtle, fontWeight: 500 }}>/{missions.length}</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: C.bgAlt, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${loading ? 0 : pct}%`,
              background: pct >= 80 ? C.green : pct >= 50 ? C.blue : C.yellow,
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.subtle, marginTop: 6, fontWeight: 600 }}>{pct}% concluído</div>
        </div>

        {/* Visibilidade — informational, not tied to XP. Missions reward
            building a portfolio; this shows whether anyone is actually
            looking at it, using signals we already track (project views,
            recruiter invites) instead of inventing new tracking. */}
        {!loading && projects && (
          <div style={{
            ...C.glassStyle,
            background: C.glass, border: `1px solid ${C.glassBorder}`,
            borderRadius: 12, padding: '18px 24px', marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Eye size={13} color={C.muted} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Visibilidade</span>
            </div>
            <div className="missoes-stats" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
                  {projects.reduce((s, p) => s + (p.views ?? 0), 0)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Visualizações totais</div>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: C.border }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: recruiterInviteCount > 0 ? C.purple : C.text, letterSpacing: '-0.5px' }}>
                  {recruiterInviteCount}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Convites de recrutadores</div>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: C.border }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
                  {candidaturaCount}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Candidaturas enviadas</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 76, borderRadius: 10, background: C.glass, border: `1px solid ${C.glassBorder}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Pending */}
            {pendingMissions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Por completar · {pendingMissions.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingMissions.map(m => (
                    <MissionCard key={m.id} mission={m} done={false} progress={getMissionProgress(m.id, projects, missionExtra)} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {doneMissions.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Concluídas · {doneMissions.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {doneMissions.map(m => (
                    <MissionCard key={m.id} mission={m} done={true} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
