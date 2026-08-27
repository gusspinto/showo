import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import {
  Medal, Lock, Star, Trophy, Zap, Award, Rocket,
  Users, Globe, TrendingUp, Folder, BookOpen, Target,
  Lightbulb, Crown, Heart, CheckCircle2, Swords, ArrowRight,
} from 'lucide-react'

const C = {
  bg: 'var(--color-bg)',
  bgAlt: 'var(--color-bg-alt)',
  card: 'var(--color-surface)',
  cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  blue: 'var(--color-primary)',
  green: 'var(--color-success)',
  yellow: 'var(--color-warning)',
  purple: '#a78bfa',
  red: 'var(--color-error)',
  orange: 'var(--color-warning)',
  glass: 'var(--color-glass)', glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)', glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

export const ACHIEVEMENTS = [
  // Tier: Bronze
  {
    id: 'first_step',
    title: 'Primeiro Passo',
    description: 'Criaste o teu primeiro projeto.',
    icon: Rocket,
    color: '#cd7f32',
    tier: 'Bronze',
    condition: (p) => p.length >= 1,
  },
  {
    id: 'rising_star',
    title: 'Estrela em Ascensão',
    description: 'Atingiste um score de 40 num projeto.',
    icon: Star,
    color: '#cd7f32',
    tier: 'Bronze',
    condition: (p) => p.some(x => (x.score ?? 0) >= 40),
  },
  {
    id: 'visible',
    title: 'Na Mira',
    description: 'O teu projeto foi visto 10 vezes.',
    icon: Globe,
    color: '#cd7f32',
    tier: 'Bronze',
    condition: (p) => p.reduce((s, x) => s + (x.views ?? 0), 0) >= 10,
  },
  // Tier: Prata
  {
    id: 'portfolio_start',
    title: 'Portfólio',
    description: 'Tens 2 projetos publicados.',
    icon: Folder,
    color: C.subtle,
    tier: 'Prata',
    condition: (p) => p.length >= 2,
  },
  {
    id: 'quality_seeker',
    title: 'Qualidade',
    description: 'Atingiste um score de 70 num projeto.',
    icon: Target,
    color: C.subtle,
    tier: 'Prata',
    condition: (p) => p.some(x => (x.score ?? 0) >= 70),
  },
  {
    id: 'trending',
    title: 'Em Tendência',
    description: '100 visualizações acumuladas.',
    icon: TrendingUp,
    color: C.subtle,
    tier: 'Prata',
    condition: (p) => p.reduce((s, x) => s + (x.views ?? 0), 0) >= 100,
  },
  {
    id: 'collaborator',
    title: 'Trabalho em Equipa',
    description: 'Adicionaste um colaborador a um projeto.',
    icon: Users,
    color: C.subtle,
    tier: 'Prata',
    condition: (p) => p.some(x => (x.collaborator_count ?? 0) > 0),
  },
  // Tier: Ouro
  {
    id: 'triple_project',
    title: 'Trilogia',
    description: 'Tens 3 projetos publicados.',
    icon: BookOpen,
    color: C.yellow,
    tier: 'Ouro',
    condition: (p) => p.length >= 3,
  },
  {
    id: 'excellence',
    title: 'Excelência',
    description: 'Atingiste um score de 90 num projeto.',
    icon: Award,
    color: C.yellow,
    tier: 'Ouro',
    condition: (p) => p.some(x => (x.score ?? 0) >= 90),
  },
  {
    id: 'viral',
    title: 'Viral',
    description: '500 visualizações acumuladas.',
    icon: Zap,
    color: C.yellow,
    tier: 'Ouro',
    condition: (p) => p.reduce((s, x) => s + (x.views ?? 0), 0) >= 500,
  },
  {
    id: 'ai_powered',
    title: 'Potenciado por IA',
    description: 'Analisaste um projeto com IA.',
    icon: Lightbulb,
    color: C.yellow,
    tier: 'Ouro',
    condition: (p) => p.some(x => x.ai_feedback),
  },
  // Tier: Platina
  {
    id: 'legend',
    title: 'Lenda',
    description: 'Tens 5 projetos com score acima de 70.',
    icon: Crown,
    color: C.purple,
    tier: 'Platina',
    condition: (p) => p.filter(x => (x.score ?? 0) >= 70).length >= 5,
  },
  {
    id: 'influencer',
    title: 'Influencer',
    description: '2000 visualizações acumuladas.',
    icon: Heart,
    color: C.purple,
    tier: 'Platina',
    condition: (p) => p.reduce((s, x) => s + (x.views ?? 0), 0) >= 2000,
  },
  {
    id: 'champion',
    title: 'Campeão',
    description: 'Atingiste 100 pontos de score.',
    icon: Trophy,
    color: C.purple,
    tier: 'Platina',
    condition: (p) => p.some(x => (x.score ?? 0) >= 100),
  },
]

const TIER_ORDER = ['Platina', 'Ouro', 'Prata', 'Bronze']
const TIER_COLORS = {
  Bronze: '#cd7f32',
  Prata: '#9ca3af',
  Ouro: 'var(--color-warning)',
  Platina: '#a78bfa',
}

function AchievementCard({ achievement, unlocked }) {
  const [hov, setHov] = useState(false)
  const Icon = achievement.icon
  const accent = unlocked ? achievement.color : C.subtle

  return (
    <div
      className="conquistas-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...C.glassStyle,
        background: hov && unlocked ? C.glassHover : C.glass,
        border: `1px solid ${unlocked ? accent + '55' : C.glassBorder}`,
        borderRadius: 12,
        padding: '20px',
        textAlign: 'center',
        transition: 'background 0.15s, border-color 0.15s',
        opacity: unlocked ? 1 : 0.5,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,${accent}99,${accent}22)`,
          borderRadius: '12px 12px 0 0',
        }} />
      )}

      {/* Icon circle */}
      <div style={{
        width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px',
        background: `${accent}18`,
        border: `1.5px solid ${accent}${unlocked ? '55' : '22'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {unlocked
          ? <Icon size={26} color={accent} />
          : <Lock size={22} color={C.subtle} />
        }
        {unlocked && (
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: accent, border: '2px solid var(--color-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={10} color="#fff" />
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? C.text : C.subtle, marginBottom: 4 }}>
        {achievement.title}
      </div>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
        {achievement.description}
      </div>
    </div>
  )
}

export default function Conquistas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    async function load() {
      let { data: projs, error } = await supabase
        .from('projects')
        .select('id, score, views, ai_feedback, collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)

      if (error) {
        const fallback = await supabase
          .from('projects')
          .select('id, score, views, ai_feedback')
          .eq('user_id', user.id)
        projs = fallback.data
      }

      const normalized = (projs || []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count)
          ? (p.collaborator_count[0]?.count ?? 0)
          : (p.collaborator_count ?? 0),
      }))

      setProjects(normalized)
      setLoading(false)
    }

    load()
  }, [user])

  if (!user) return null

  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: loading ? false : a.condition(projects || []),
  }))

  const unlocked = achievements.filter(a => a.unlocked)
  const locked = achievements.filter(a => !a.unlocked)

  const groupedByTier = TIER_ORDER.map(tier => ({
    tier,
    items: achievements.filter(a => a.tier === tier),
  }))

  const totalUnlocked = unlocked.length
  const pct = Math.round((totalUnlocked / achievements.length) * 100)

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`
        @media (max-width: 420px) { .conquistas-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 300px) { .conquistas-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 400px) { .conquistas-tier-row { flex-wrap: wrap !important; gap: 8px !important; } }
        @media (max-width: 350px) { .conquistas-card { flex-direction: column !important; text-align: center !important; align-items: center !important; } }
      `}</style>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="conquistas-hd" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Medal size={24} color="var(--color-warning)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: C.text, letterSpacing: '-1px', fontFamily: 'var(--font-heading)' }}>
              Conquistas
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Desbloqueia conquistas ao evoluir os teus projetos
            </p>
          </div>
          <button
            onClick={() => navigate('/missoes')}
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
            <Swords size={13} color="currentColor" />
            Missões
          </button>
        </div>

        {/* Progress card */}
        <div style={{
          ...C.glassStyle,
          background: C.glass, border: `1px solid ${C.glassBorder}`,
          borderRadius: 12, padding: '20px 24px', marginBottom: 32, marginTop: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Desbloqueadas</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, letterSpacing: '-1px' }}>
                {loading ? '--' : totalUnlocked}
                <span style={{ fontSize: 14, color: C.subtle, fontWeight: 500 }}>/{achievements.length}</span>
              </div>
            </div>
            {/* Tier counts */}
            <div className="conquistas-tier-row" style={{ display: 'flex', gap: 12 }}>
              {TIER_ORDER.map(tier => {
                const count = achievements.filter(a => a.tier === tier && a.unlocked).length
                const total = achievements.filter(a => a.tier === tier).length
                return (
                  <div key={tier} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: TIER_COLORS[tier], fontWeight: 700, marginBottom: 2 }}>{tier}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: count > 0 ? TIER_COLORS[tier] : C.subtle }}>
                      {loading ? '...' : `${count}/${total}`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ height: 6, background: C.bgAlt, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${loading ? 0 : pct}%`,
              background: `linear-gradient(90deg, ${C.yellow}, ${C.purple})`,
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.subtle, marginTop: 6, fontWeight: 600 }}>{pct}% desbloqueado</div>
        </div>

        {/* Tiers */}
        {loading ? (
          <div className="conquistas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{ height: 150, borderRadius: 12, background: C.glass, border: `1px solid ${C.glassBorder}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <>
            {groupedByTier.map(({ tier, items }) => (
              <div key={tier} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    color: TIER_COLORS[tier], textTransform: 'uppercase',
                  }}>
                    {tier}
                  </div>
                  <div style={{ flex: 1, height: 1, background: `${TIER_COLORS[tier]}28` }} />
                  <div style={{ fontSize: 11, color: C.subtle, fontWeight: 600 }}>
                    {items.filter(a => a.unlocked).length}/{items.length}
                  </div>
                </div>
                <div className="conquistas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  {items.map(a => (
                    <AchievementCard key={a.id} achievement={a} unlocked={a.unlocked} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
