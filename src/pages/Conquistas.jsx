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
  orange: '#f97316',
}

const ACHIEVEMENTS = [
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
  Ouro: '#fbbf24',
  Platina: '#a78bfa',
}

function AchievementCard({ achievement, unlocked }) {
  const [hov, setHov] = useState(false)
  const Icon = achievement.icon
  const accent = unlocked ? achievement.color : C.subtle

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov && unlocked ? C.cardHover : C.card,
        border: `1px solid ${unlocked ? accent + '55' : C.border}`,
        borderRadius: 16,
        padding: '20px',
        textAlign: 'center',
        transition: 'all 0.18s',
        transform: hov && unlocked ? 'translateY(-3px)' : 'none',
        boxShadow: hov && unlocked ? `0 8px 28px ${accent}22` : 'none',
        opacity: unlocked ? 1 : 0.5,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,${accent}99,${accent}22)`,
          borderRadius: '16px 16px 0 0',
        }} />
      )}

      {/* Icon circle */}
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
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
            background: accent, border: '2px solid var(--c-card)',
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
      const { data: projs } = await supabase
        .from('projects')
        .select('id, score, views, ai_feedback, collaborator_count:project_members(count)')
        .eq('user_id', user.id)

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
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Medal size={24} color="#fbbf24" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
              Conquistas
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Desbloqueia conquistas ao evoluir os teus projetos
            </p>
          </div>
        </div>

        {/* Progress card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '20px 24px', marginBottom: 32, marginTop: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Desbloqueadas</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow, letterSpacing: '-1px' }}>
                {loading ? '—' : totalUnlocked}
                <span style={{ fontSize: 14, color: C.subtle, fontWeight: 500 }}>/{achievements.length}</span>
              </div>
            </div>
            {/* Tier counts */}
            <div style={{ display: 'flex', gap: 12 }}>
              {TIER_ORDER.map(tier => {
                const count = achievements.filter(a => a.tier === tier && a.unlocked).length
                const total = achievements.filter(a => a.tier === tier).length
                return (
                  <div key={tier} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: TIER_COLORS[tier], fontWeight: 700, marginBottom: 2 }}>{tier}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: count > 0 ? TIER_COLORS[tier] : C.subtle }}>
                      {loading ? '—' : `${count}/${total}`}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{ height: 150, borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          /* ── Cross-link to Missões ── */
          <div
            onClick={() => navigate('/missoes')}
            style={{
              marginBottom: 28, padding: '16px 20px',
              background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.18)',
              borderRadius: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.1)'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.06)'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.18)' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Swords size={20} color={C.blue} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>Ver missões por completar</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                Completa missões para ganhar XP e desbloquear novas conquistas.
              </div>
            </div>
            <ArrowRight size={16} color={C.muted} style={{ flexShrink: 0 }} />
          </div>,

          groupedByTier.map(({ tier, items }) => (
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                {items.map(a => (
                  <AchievementCard key={a.id} achievement={a} unlocked={a.unlocked} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
