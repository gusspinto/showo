import { useState, useEffect, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Briefcase, ArrowRight, Zap, ChevronDown, BookOpen, Search, Building2, FileText, Share2 } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import Onboarding from '../components/Onboarding'
import CreateProjectModal from '../components/CreateProjectModal'
import { looksLikeSpam } from '../lib/score'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const colors = {
  bg:           'var(--color-bg)',
  card:         'var(--color-surface)',
  border:       'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue:         'var(--color-primary)',
  yellow:       'var(--color-warning)',
  green:        'var(--color-success)',
  text:         'var(--color-text)',
  muted:        'var(--color-text-secondary)',
  subtle:       'var(--color-text-tertiary)',
}

function StaticHero({ theme }) {
  return (
    <h1 className="hero-h1 home-hero-heading" style={{
      fontSize: 'clamp(40px, 6.2vw, 72px)', fontWeight: 400,
      lineHeight: 1.12, margin: '0 auto 28px',
      letterSpacing: '-1px', maxWidth: 1100,
      fontFamily: 'var(--font-heading)',
      textAlign: 'center',
    }}>
      Da defesa da PAP{' '}
      <em style={{ fontStyle: 'italic', color: 'var(--color-primary)' }}>à tua primeira oportunidade.</em>
    </h1>
  )
}

// ── Hero aurora — soft ambient backdrop made of plain radial-gradients (no
// filter:blur, no animated transform on huge elements) so it stays cheap to
// paint/composite even on lower-powered GPUs. Dark theme: blue blobs on the
// near-black brand gradient. Light theme: the hero itself goes full brand-blue,
// so the aurora flips to soft white blobs for contrast. ──
function HeroAurora({ theme }) {
  const light = theme === 'light'
  const rgb = light ? '255,255,255' : '27,120,247'
  const rgb2 = light ? '255,255,255' : '13,58,150'
  const rgb3 = light ? '255,255,255' : '94,147,255'
  const a = light ? 0.24 : 0.30
  const b = light ? 0.16 : 0.22
  const c = light ? 0.12 : 0.16
  return (
    <div aria-hidden="true" className="hero-aurora" style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: `
        radial-gradient(46% 42% at 14% 10%, rgba(${rgb},${a}) 0%, rgba(${rgb},0) 70%),
        radial-gradient(42% 38% at 88% 28%, rgba(${rgb2},${b}) 0%, rgba(${rgb2},0) 70%),
        radial-gradient(38% 36% at 46% 92%, rgba(${rgb3},${c}) 0%, rgba(${rgb3},0) 70%)
      `,
    }} />
  )
}

// ── Roles panel — second horizontal slide, reached by swiping/clicking the peek tab ──
const ROLE_CARDS = [
  { Icon: GraduationCap, label: 'Aluno',      plural: 'alunos',      color: 'var(--color-primary)', desc: 'Mostra os teus projetos escolares numa página profissional.' },
  { Icon: BookOpen,      label: 'Professor',  plural: 'professores', color: 'var(--color-success)', desc: 'Acompanha as turmas e o progresso dos teus alunos.' },
  { Icon: Search,        label: 'Recrutador', plural: 'recrutadores',color: 'var(--color-accent)', desc: 'Encontra talento real através de projetos, não só CVs.' },
  { Icon: Building2,     label: 'Empresa',    plural: 'empresas',    color: 'var(--color-warning)', desc: 'Publica vagas e estágios para quem já mostra trabalho.' },
]

const ROLE_PHRASES = [
  { lead: 'Mostra o teu trabalho como',    role: 'aluno',      color: 'var(--color-primary)' },
  { lead: 'Acompanha as tuas turmas como', role: 'professor',  color: 'var(--color-success)' },
  { lead: 'Encontra talento como',         role: 'recrutador', color: 'var(--color-accent)' },
  { lead: 'Publica vagas como',            role: 'empresa',    color: 'var(--color-warning)' },
]

function RoleCyclerHeadline() {
  const [idx, setIdx] = useState(0)
  const ref = useRef(null)
  const current = ROLE_PHRASES[idx]

  // Stays on "aluno" until the roles panel actually becomes visible (the
  // "Perfis" peek tab is the trigger) — then cycles on a timer.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let id = null
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !id) {
          id = setInterval(() => setIdx(i => (i + 1) % ROLE_PHRASES.length), 2000)
        } else if (!entry.isIntersecting && id) {
          clearInterval(id)
          id = null
          setIdx(0)
        }
      },
      { threshold: 0.6 }
    )
    obs.observe(el)
    return () => { obs.disconnect(); if (id) clearInterval(id) }
  }, [])

  return (
    <h2 ref={ref} className="roles-cycle-phrase" style={{
      fontSize: 'clamp(24px, 3.4vw, 36px)', fontWeight: 400, fontFamily: 'var(--font-heading)',
      color: colors.text, margin: '0 0 40px', textAlign: 'center', letterSpacing: '-0.5px',
    }}>
      {current.lead}{' '}
      <span className="roles-cycle-highlight" key={idx} style={{ background: current.color }}>
        {current.role.split('').map((ch, i) => (
          <span key={i} className="roles-cycle-letter" style={{ animationDelay: `${i * 0.03}s` }}>{ch}</span>
        ))}
      </span>
    </h2>
  )
}

function RolesPanel({ onBack, theme }) {
  const cardBg = theme === 'light'
    ? 'rgba(13,58,150,0.32)'
    : 'color-mix(in srgb, var(--color-surface) 70%, #000 30%)'
  // The brand blue (var(--color-primary)) used for "Aluno" reads poorly as text/icon directly on
  // top of this dark-navy card in the light/blue hero — lighten just that one for contrast.
  const accent = c => (theme === 'light' && c === 'var(--color-primary)') ? '#9fc6ff' : c
  return (
    <div className="roles-panel" style={{
      flex: '0 0 100%', minWidth: '100%', scrollSnapAlign: 'start',
      minHeight: 'calc(100vh - 62px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '64px 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      <button
        onClick={onBack}
        className="hero-peek-tab hero-peek-tab-left"
        title="Voltar ao início"
      >
        <ChevronDown size={17} style={{ transform: 'rotate(90deg)' }} />
        <span>Início</span>
      </button>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <RoleCyclerHeadline />
        <div className="roles-card-stack" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560, width: '100%' }}>
          {ROLE_CARDS.map(r => (
            <div key={r.label} className="roles-id-card" style={{
              background: cardBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              // Fixed light border (not the theme-toggling --c-glass-border-bright token) — cardBg
              // stays a dark-navy overlay in both themes, so a dark border would vanish in light mode.
              border: '1px solid rgba(255,255,255,0.22)', borderRadius: 14,
              padding: '18px 22px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 18,
              borderLeft: `3px solid ${r.color}`,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: `${r.color}1f`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <r.Icon size={24} color={accent(r.color)} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: accent(r.color), marginBottom: 3 }}>{r.label}</div>
                <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile back — same position/style as forward hint in first slide */}
        <button className="mob-slide-nav" onClick={onBack}>
          <ChevronDown size={13} style={{ transform: 'rotate(90deg)', flexShrink: 0 }} />
          <span>Swipe para voltar</span>
        </button>
      </div>
    </div>
  )
}

function MiniScoreRing({ score, size = 72 }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 86 ? 'var(--color-success)' : score >= 51 ? 'var(--color-primary)' : 'var(--color-warning)'
  return (
    <div style={{ position: 'relative', width: size, height: size, filter: `drop-shadow(0 0 5px ${color}70)` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{score}</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 }}>score</span>
      </div>
    </div>
  )
}

// ── Reveal — fades + slides an element in once it scrolls into view. ──
function Reveal({ children, style }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal-on-scroll${visible ? ' is-visible' : ''}`} style={style}>
      {children}
    </div>
  )
}

const FeatureRow = memo(function FeatureRow({ reverse, tag, tagColor, title, desc, bullets, bulletColor, mockup }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 80,
      alignItems: 'center',
      marginBottom: 120,
    }} className="feature-row">
      {/* Text side */}
      <div style={{ order: reverse ? 2 : 1 }}>
        <span style={{
          display: 'inline-block',
          background: `${tagColor}18`,
          color: tagColor,
          border: `1px solid ${tagColor}30`,
          borderRadius: 6, padding: '4px 12px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 20,
        }}>{tag}</span>
        <h3 style={{
          fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 900,
          letterSpacing: '-0.8px', lineHeight: 1.15,
          margin: '0 0 16px', fontFamily: 'var(--font-heading)',
          color: 'var(--color-text)',
        }}>{title}</h3>
        {desc && <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 0 24px' }}>{desc}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: bulletColor, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Mockup side */}
      <div style={{ order: reverse ? 1 : 2 }}>
        {mockup}
      </div>
    </div>
  )
})

const MOCKUP_COLORS = {
  dark:  { bg: '#0c1422', bgAlt: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#f1f5f9', muted: '#94a3b8' },
  light: { bg: '#ffffff', bgAlt: '#f4f6fa', border: '#e1e6ef', text: '#0f172a', muted: '#64748b' },
}

const MockupPortfolio = memo(function MockupPortfolio({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 64, background: 'var(--color-primary)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -16, left: 20, width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary)', border: `3px solid ${c.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>J</div>
      </div>
      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: c.muted, fontWeight: 600 }}>PAP · Tecnologias de Informação</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)' }}>88 pts</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 400, color: c.text, letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>StockFlow Pro</div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>João Silva · Escola Profissional do Porto</div>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={12} color="var(--color-primary)" />
          <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'monospace' }}>showo.pt/p/stockflow-pro</span>
        </div>
      </div>
    </div>
  )
})

const MockupPotencial = memo(function MockupPotencial({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const bars = [
    { label: 'Qualidade', value: 24, max: 30, color: 'var(--color-primary)' },
    { label: 'Profundidade', value: 14, max: 20, color: 'var(--color-primary)' },
    { label: 'Perfil', value: 10, max: 15, color: 'var(--color-primary)' },
    { label: 'Validação', value: 12, max: 20, color: 'var(--color-primary)' },
    { label: 'Consistência', value: 11, max: 15, color: 'var(--color-primary)' },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
          <svg width={48} height={48} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={24} cy={24} r={20} fill="none" stroke={c.border} strokeWidth={4} />
            <circle cx={24} cy={24} r={20} fill="none" stroke="var(--color-primary)" strokeWidth={4}
              strokeDasharray={`${(71 / 100) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
              strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>71</div>
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>Potencial</span>
          <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>Top 7% dos estudantes</div>
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bars.map(b => (
          <div key={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: c.muted }}>{b.label}</span>
              <span style={{ fontSize: 11, color: c.text, fontWeight: 600 }}>{b.value}/{b.max}</span>
            </div>
            <div style={{ height: 3, background: c.bgAlt, borderRadius: 99 }}>
              <div style={{ width: `${(b.value / b.max) * 100}%`, height: '100%', background: b.color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupVagas = memo(function MockupVagas({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const vagas = [
    { empresa: 'Codilink', cargo: 'Estágio em Desenvolvimento Web', tipo: 'Presencial · Lisboa', nova: true },
    { empresa: 'DataVision', cargo: 'Junior Backend Developer', tipo: 'Remoto · Full-time', nova: false },
    { empresa: 'UXLab', cargo: 'Estágio em Design de Produto', tipo: 'Híbrido · Porto', nova: true },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>Vagas para ti</span>
        <span style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 700 }}>3 novas</span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {vagas.map((v, i) => (
          <div key={v.empresa} style={{ padding: '11px 4px', borderTop: i > 0 ? `1px solid ${c.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Briefcase size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{v.cargo}</span>
                {v.nova && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)' }}>· Nova</span>}
              </div>
              <span style={{ fontSize: 11, color: c.muted }}>{v.empresa} · {v.tipo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupDefesa = memo(function MockupDefesa({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const perguntas = [
    'Qual foi o maior desafio técnico que enfrentaste?',
    'Como garantiste a qualidade do código produzido?',
    'Que tecnologias escolheste e porquê?',
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <GraduationCap size={16} color="#7c3aed" />
        <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>Treino de defesa PAP</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Perguntas prováveis do júri</div>
        {perguntas.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={13} color="var(--color-primary)" />
          <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>IA a gerar respostas sugeridas...</span>
        </div>
      </div>
    </div>
  )
})

const HOW_IT_WORKS = [
  { Icon: FileText, step: '1', title: 'Descreve o teu projeto', desc: 'Em poucas frases: o que fizeste, que problema resolve, que tecnologias usaste.' },
  { Icon: Trophy,    step: '2', title: 'Ganha o teu score', desc: 'Score automático, sugestões de melhoria e uma página pronta a partilhar.' },
  { Icon: Share2,    step: '3', title: 'Partilha com o mundo', desc: 'Um link para o CV ou LinkedIn — mostra o que fizeste a professores e recrutadores.' },
]

const QUICK_GOALS = [
  { id: 'pap',        label: 'PAP',              placeholder: 'Sobre o que foi a tua PAP?' },
  { id: 'internship', label: 'Estágio',          placeholder: 'O que fizeste no teu estágio?' },
  { id: 'group',      label: 'Trabalho de grupo', placeholder: 'Sobre o que foi o trabalho de grupo?' },
  { id: 'personal',   label: 'Projeto pessoal',  placeholder: 'O que construíste?' },
]


export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  // The hero always renders the moody dark-navy gradient regardless of the site
  // theme toggle — the light-mode "full brand-blue with white text" variant read
  // poorly (low-contrast borders, felt like a mismatched second dark mode rather
  // than an actual light hero), so it's simpler and better-looking to keep the
  // hero as one deliberate dark, high-contrast beat and let only the rest of the
  // page (below the hero) follow the user's light/dark preference.
  const heroTheme = 'dark'
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [inputText, setInputText] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('showo_seen_onboarding'))
  const [projectCount, setProjectCount] = useState(null)
  const [animatedCount, setAnimatedCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [spamError, setSpamError] = useState(false)
  const [featuresReady, setFeaturesReady] = useState(false)
  const featuresRef = useRef(null)
  const goalsRowRef = useRef(null)
  const pillRefs = useRef({})
  const prevGoalRef = useRef(null)
  const heroTrackRef = useRef(null)
  const [pillHighlight, setPillHighlight] = useState({ left: 0, width: 0, top: 0, height: 0, opacity: 0, moving: false })

  function scrollToHeroSlide(index) {
    const track = heroTrackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    const container = goalsRowRef.current
    const btn = selectedGoal ? pillRefs.current[selectedGoal] : null
    if (!container || !btn) {
      setPillHighlight(h => ({ ...h, opacity: 0, moving: false }))
      prevGoalRef.current = selectedGoal
      return
    }
    const cr = container.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    const cameFromAnotherGoal = !!prevGoalRef.current && prevGoalRef.current !== selectedGoal
    setPillHighlight({
      left: br.left - cr.left, width: br.width,
      top: br.top - cr.top, height: br.height,
      opacity: 1, moving: cameFromAnotherGoal,
    })
    prevGoalRef.current = selectedGoal
  }, [selectedGoal])

  useEffect(() => {
    const el = featuresRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setFeaturesReady(true); obs.disconnect() } },
      { rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
      if (count != null) setProjectCount(count)
    }
    fetchCount()
  }, [])

  // Count-up animation — runs every time the count loads (every page load).
  useEffect(() => {
    if (projectCount == null) return
    let raf
    const duration = 1100
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedCount(Math.round(eased * projectCount))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [projectCount])

  function handleStart(e) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text) return
    if (looksLikeSpam(text)) {
      setSpamError(true)
      return
    }
    setSpamError(false)
    navigate('/novo', {
      state: {
        type:        selectedGoal ?? 'personal',
        description: text,
      },
    })
  }

  const placeholder = selectedGoal
    ? QUICK_GOALS.find(g => g.id === selectedGoal)?.placeholder
    : 'O que já construíste? Ex: uma app de fitness, um site para a escola...'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
        @keyframes hero-obj-float {
          from { transform: translateY(0); }
          to   { transform: translateY(-16px); }
        }
        @keyframes hero-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(5px); }
        }
        @keyframes aurora-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        .hero-aurora { animation: aurora-pulse 9s ease-in-out infinite; will-change: opacity; }
        .reveal-on-scroll {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
        /* Bridges the seam between the sidebar (64px) and the page's sidebar-reserved
           padding (72px): the gradient/aurora box bleeds 72px left so its background
           reaches flush against the sidebar with no gap, while hero-bleed-offset
           cancels that shift for the actual content so nothing inside (buttons,
           slides, scroll math) moves from where it was. */
        @media (min-width: 861px) {
          .hero-bleed-box { margin-left: -72px; width: calc(100% + 72px); }
          .hero-bleed-offset { margin-left: 72px; width: calc(100% - 72px); }
        }
        .hero-track {
          display: flex; width: 100%;
          overflow-x: auto; scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
        }
        .hero-track::-webkit-scrollbar { display: none; }
        /* Peek tab — vertical glass pill, sits flush against the hero edge */
        .hero-peek-tab {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 38px; height: 116px; border-radius: 19px; border: 1px solid var(--color-border-hover);
          cursor: pointer; background: var(--color-surface);
          backdrop-filter: blur(8px);
          color: var(--color-primary); display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px; padding: 14px 0;
          z-index: 2; box-shadow: 0 8px 24px -8px rgba(0,0,0,0.25);
          transition: border-color 0.18s, color 0.18s, box-shadow 0.18s;
        }
        .hero-peek-tab span {
          writing-mode: vertical-rl; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .hero-peek-tab:hover {
          border-color: var(--color-primary);
          box-shadow: 0 10px 28px -6px rgba(27,120,247,0.35);
        }
        /* Blue (light) hero: brighter glass card means a brighter blue washes out —
           drop to a darker brand blue so the label stays crisp. */
        .hero-theme-blue .hero-peek-tab { color: #fff; border-color: rgba(255,255,255,0.4); }
        .hero-theme-blue .hero-peek-tab:hover { border-color: #fff; }
        .hero-peek-tab-right { right: 14px; }
        .hero-peek-tab-left  { left: 14px; }
        .hero-peek-tab-left span { transform: rotate(180deg); }
        @media (max-width: 700px) {
          .hero-peek-tab { display: none; }
        }
        .roles-cycle-phrase { animation: roles-cycle-fade 0.5s ease; }
        @keyframes roles-cycle-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .roles-cycle-highlight {
          color: #fff; padding: 2px 11px 6px; border-radius: 0 0 12px 12px;
          display: inline-block;
        }
        .roles-cycle-letter {
          display: inline-block;
          animation: roles-cycle-letter-rise 0.4s ease both;
        }
        @keyframes roles-cycle-letter-rise {
          from { opacity: 0; transform: translateY(60%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 600px) {
          .hero-scroll-cue { display: none !important; }
        }
        .goal-pill { transition: color 0.15s !important; cursor: pointer; display: inline-block; }
        .goal-pill:hover { color: var(--color-primary) !important; }
        .hero-theme-blue .goal-pill:hover { color: #fff !important; }
        .feature-card { transition: all 0.2s ease !important; cursor: default; }
        .feature-card:hover {
          border-color: var(--color-border-hover) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.25) !important;
          background: var(--color-surface-hover) !important;
        }
        .submit-btn:hover { opacity: 0.7 !important; }
        .submit-btn { transition: opacity 0.15s !important; }
        body.light .widget-input { background: transparent !important; }
        .home-cta-btn { transition: all 0.15s !important; }
        .home-cta-btn:hover { opacity: 0.88 !important; }
        .home-sec-link { transition: color 0.15s !important; }
        .home-sec-link:hover { color: var(--color-primary) !important; }

        .hero-mockup-col { display: block; }

        /* Tablet */
        @media (max-width: 960px) {
          .hero-mockup-col { display: none !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
        }

        /* Mobile slide nav — hidden by default, shown on mobile */
        .mob-slide-nav {
          display: none;
          align-items: center; gap: 7px;
          margin-top: 28px;
          background: transparent; border: none;
          color: var(--color-text-secondary); font-size: 12px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          opacity: 0.7; letter-spacing: 0.02em;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s;
        }
        .mob-slide-nav:active { opacity: 0.4; }

        @media (max-width: 600px) {
          /* ── Top navbar: hide the CTA — the sticky bottom nav already has "Entrar" and the hero has its own input ── */
          .home-nav-cta { display: none !important; }
          /* ── Hero track: slides stretch to the same height; content centers inside,
                 so the height difference between slides never shows as a dead gap ── */
          .hero-track { align-items: stretch !important; }
          /* ── Hero section: separate padding props to avoid shorthand conflict ── */
          .hero-section  { padding-top: 72px !important; padding-bottom: 40px !important; min-height: 0 !important; justify-content: center !important; }
          .hero-gap      { height: 28px !important; }
          .hero-inner    { padding-left: 20px !important; padding-right: 20px !important; }
          .hero-h1       { font-size: 28px !important; letter-spacing: -0.5px !important; margin-bottom: 12px !important; }
          .hero-sub      { font-size: 14px !important; margin-bottom: 24px !important; }
          .hero-widget   { margin-top: 20px !important; max-width: 100% !important; }
          .hero-scroll-cue { display: none !important; }
          /* Wrap the role pills onto as many rows as needed instead of the old
             horizontal-scroll row that sliced the last pill mid-word ("Projeto
             pe…") — the exact "off screen" cut the pilot flagged. All 5 options
             now show, centered, nothing hidden. */
          .goals-row     { flex-wrap: wrap !important; overflow-x: visible !important; justify-content: center !important; row-gap: 8px !important; padding-right: 0 !important; }
          .goal-pill     { font-size: 12px !important; padding: 6px 12px !important; }
          .widget-input  { font-size: 15px !important; }
          .social-strip  { gap: 10px !important; font-size: 12px !important; justify-content: center !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .feature-card  { padding: 20px 18px !important; }
          .hero-note     { font-size: 11px !important; }
          .home-features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .home-stats { flex-wrap: wrap !important; gap: 12px !important; justify-content: center !important; }
          /* ── Feature rows: stack ── */
          .feature-row { grid-template-columns: 1fr !important; gap: 32px !important; }
          .feature-row > div { order: unset !important; }
          .features-section { padding: 80px 20px 60px !important; }
          .features-title-section { margin-bottom: 48px !important; }
          /* ── Hero slide wrapper: flex so hero-section fills height and can center ── */
          .hero-slide-wrap { display: flex !important; flex-direction: column !important; }
          .hero-section { flex: 1 !important; }
          /* ── Roles panel: no forced height, tighter padding ── */
          .roles-panel { min-height: 0 !important; height: auto !important; padding: 64px 20px 48px !important; }
          /* ── Text consistency: roles headline matches hero scale ── */
          .roles-cycle-phrase { font-size: 22px !important; }
          .roles-id-card { padding: 14px 16px !important; gap: 14px !important; }
          .roles-id-card > div:last-child > div:first-child { font-size: 14px !important; }
          .roles-id-card > div:last-child > p { font-size: 12px !important; }
          .roles-card-stack { gap: 10px !important; }
          /* ── Slide nav: show ── */
          .mob-slide-nav { display: flex !important; }
        }
        @media (max-width: 380px) {
          .home-hero-heading { font-size: clamp(28px, 8vw, 42px) !important; }
        }
      `}</style>

      <Navbar>
        <button
          className="home-nav-cta"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'var(--color-primary)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '9px 20px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      {/* Hero — dark theme: near-black brand gradient (same as Login/Register).
          Light theme: full brand-blue gradient with white accents instead of the
          page's plain light background. Both forced via locally-scoped CSS vars
          so every themed descendant (text, cards, inputs) stays readable. */}
      <div style={{ position: 'relative' }} className={heroTheme === 'light' ? 'hero-theme-blue' : 'hero-theme-dark'}>
        <div className="hero-bleed-box" style={heroTheme === 'light' ? {
          position: 'relative', overflow: 'hidden', color: '#fff',
          background: 'linear-gradient(115deg, #1454c2 0%, var(--color-primary) 45%, #2f8bff 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.18)',
          '--c-bg': 'var(--color-primary)', '--c-bg-alt': '#1664d8',
          '--c-card': 'rgba(255,255,255,0.14)', '--c-card-hover': 'rgba(255,255,255,0.2)',
          '--c-border': 'rgba(255,255,255,0.28)', '--c-border-bright': 'rgba(255,255,255,0.45)',
          '--c-muted': 'rgba(255,255,255,0.75)', '--c-text': '#ffffff', '--c-subtle': 'rgba(255,255,255,0.6)',
          '--c-input-bg': 'rgba(255,255,255,0.12)',
        } : {
          position: 'relative', overflow: 'hidden', color: 'var(--color-text)',
          background: 'linear-gradient(115deg, #000 0%, #050b1c 40%, #0e2249 85%, #143169 100%)',
          borderBottom: '1px solid #1e3050',
          '--c-bg': '#060c18', '--c-bg-alt': '#111c32',
          '--c-card': '#152030', '--c-card-hover': '#1c2d44',
          '--c-border': '#1e3050', '--c-border-bright': '#2a4275',
          '--c-muted': '#7d93b0', '--c-text': '#e8f2ff', '--c-subtle': '#6b7f9e',
          '--c-input-bg': '#060c18',
        }}>
      <HeroAurora theme={heroTheme} />
      <div className="hero-bleed-offset">
      <div className="hero-track" ref={heroTrackRef}>
        <div className="hero-slide-wrap" style={{ flex: '0 0 100%', minWidth: '100%', scrollSnapAlign: 'start', position: 'relative' }}>
        <div className="hero-section hero-inner" style={{
          position: 'relative', zIndex: 1,
          minHeight: 'calc(100vh - 62px)',
          maxWidth: 1140, margin: '0 auto',
          padding: '140px 32px 64px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <StaticHero theme={heroTheme} />

          <div className="hero-gap" style={{ height: 56 }} />

          {/* Widget */}
          <form className="hero-widget" onSubmit={handleStart} style={{ width: '100%', maxWidth: 560 }}>
            <div ref={goalsRowRef} className="goals-row" style={{ position: 'relative', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              <span style={{
                position: 'absolute', borderRadius: 999,
                background: heroTheme === 'light' ? '#0d3a96' : 'rgba(27,120,247,0.12)',
                left: pillHighlight.left, width: pillHighlight.width,
                top: pillHighlight.top, height: pillHighlight.height,
                opacity: pillHighlight.opacity, pointerEvents: 'none',
                transition: pillHighlight.moving
                  ? 'left 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.15s'
                  : 'opacity 0.25s ease',
              }} />
              {QUICK_GOALS.map(g => (
                <button
                  key={g.id} type="button"
                  ref={el => { pillRefs.current[g.id] = el }}
                  className={`goal-pill${selectedGoal === g.id ? ' active' : ''}`}
                  onClick={() => setSelectedGoal(selectedGoal === g.id ? null : g.id)}
                  style={{
                    position: 'relative', background: 'transparent', border: 'none',
                    color: selectedGoal === g.id ? (heroTheme === 'light' ? '#ffffff' : 'var(--color-primary)') : colors.muted,
                    borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >{g.label}</button>
              ))}
            </div>
            <div
              className="widget-box"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--color-surface)',
                border: `1.5px solid ${heroTheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(27,120,247,0.22)'}`,
                borderRadius: 14, padding: '8px 8px 8px 20px',
                boxShadow: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = heroTheme === 'light' ? '#ffffff' : 'var(--color-primary)'
                e.currentTarget.style.boxShadow = heroTheme === 'light' ? '0 0 0 3px rgba(255,255,255,0.3)' : '0 0 0 3px rgba(27,120,247,0.15)'
              }}
              onBlurCapture={e => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  e.currentTarget.style.borderColor = heroTheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(27,120,247,0.22)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <input
                type="text" className="widget-input"
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--color-text)', fontSize: 17, fontFamily: 'inherit',
                  outline: 'none', minWidth: 0, padding: '12px 0',
                }}
              />
              <button
                type="submit" className="submit-btn"
                disabled={!inputText.trim()}
                style={{
                  background: inputText.trim() ? 'var(--color-primary)' : 'transparent',
                  border: inputText.trim() ? 'none' : '1px solid var(--color-border)',
                  color: inputText.trim() ? '#fff' : 'var(--color-text-tertiary)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  borderRadius: 9, padding: '11px 18px',
                  transition: 'opacity 0.15s, background 0.15s',
                }}
              >
                Começar
                <ArrowRight size={15} />
              </button>
            </div>
            {spamError && (
              <p style={{ color: 'var(--color-error)', fontSize: 13, marginTop: 12, fontWeight: 600, textAlign: 'center' }}>
                Texto inválido. Escreve uma descrição real do teu projeto.
              </p>
            )}
          </form>

          {/* Scroll cue — desktop only (hidden on mobile) */}
          <div className="hero-scroll-cue" style={{
            position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            opacity: 0.42, pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: colors.subtle, whiteSpace: 'nowrap',
            }}>Mais sobre a Showo</span>
            <ChevronDown size={14} color={colors.subtle} style={{ animation: 'hero-bounce 1.8s ease-in-out infinite' }} />
          </div>

          {/* Mobile swipe hint — bottom of hero slide, same position as roles back */}
          <button className="mob-slide-nav" onClick={() => scrollToHeroSlide(1)}>
            <span>Swipe para veres os perfis</span>
            <ChevronDown size={13} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} />
          </button>
        </div>

        <button
          className="hero-peek-tab hero-peek-tab-right"
          onClick={() => scrollToHeroSlide(1)}
          title="Para quem é a Showo"
        >
          <ChevronDown size={17} style={{ transform: 'rotate(-90deg)' }} />
          <span>Perfis</span>
        </button>
        </div>

        <RolesPanel theme={heroTheme} onBack={() => scrollToHeroSlide(0)} />
      </div>
      </div>
      </div>
      </div>

      {/* Social proof strip */}
      <Reveal>
      <div className="home-stats" style={{
        textAlign: 'center', padding: '40px 24px 28px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(34px, 4.4vw, 50px)', color: 'var(--color-primary)', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', minWidth: '1.4em', textAlign: 'right' }}>
            {projectCount == null ? '...' : animatedCount}
          </span>
          <span style={{ fontSize: 14, color: colors.muted, fontWeight: 500, maxWidth: 200, textAlign: 'left', lineHeight: 1.3 }}>
            projetos criados por estudantes portugueses
          </span>
        </div>
        <div className="social-strip" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 28, flexWrap: 'wrap',
        }}>
          {['Ranking público', 'Análise por IA', 'Certificados verificados'].map((text, i, arr) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <span style={{ fontSize: 12, color: colors.subtle, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{text}</span>
              {i < arr.length - 1 && <span style={{ color: 'rgba(27,120,247,0.35)', userSelect: 'none' }}>/</span>}
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      {/* Como funciona — 3 passos, para dar contexto imediato a quem chega */}
      <Reveal style={{ padding: '64px 24px 8px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 900, letterSpacing: '-1px',
            margin: '0 0 12px', fontFamily: 'var(--font-heading)', color: colors.text, textAlign: 'center',
          }}>
            Como funciona a Showo
          </h2>
          <p style={{ fontSize: 15, color: colors.muted, textAlign: 'center', margin: '0 0 40px', lineHeight: 1.6 }}>
            Software para transformar projetos escolares em páginas profissionais com análise por IA.
          </p>
          <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} style={{
                background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14,
                padding: '24px 22px', position: 'relative',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(27,120,247,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <s.Icon size={19} color="var(--color-primary)" />
                </div>
                <span style={{
                  position: 'absolute', top: 20, right: 22, fontSize: 12, fontWeight: 800,
                  color: colors.subtle, fontFamily: 'var(--font-heading)',
                }}>{s.step}</span>
                <h3 style={{
                  fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px', margin: '0 0 8px',
                  fontFamily: 'var(--font-heading)', color: colors.text,
                }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Features alternadas */}
      <div ref={featuresRef} className="features-section" style={{ maxWidth: 1100, margin: '0 auto', padding: '200px 40px 80px' }}>

        {/* Título da secção */}
        <div className="features-title-section">
        <Reveal style={{ textAlign: 'center', marginBottom: 96 }}>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', fontFamily: 'var(--font-heading)', color: colors.text }}>
            Tudo o que precisas, num só sítio
          </h2>
          <p style={{ fontSize: 17, color: colors.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Cria, melhora, apresenta e candidata-te. Tudo numa só plataforma.
          </p>
        </Reveal>
        </div>

        {featuresReady && <>
          {/* Feature 1 — Defesa PAP */}
          <Reveal>
          <FeatureRow
            reverse={false}
            tag="Defesa PAP"
            tagColor="var(--color-accent)"
            title="Treina a defesa. Prepara as respostas do júri."
            desc=""
            bullets={['Perguntas prováveis do júri', 'Treino de apresentação cronometrado', 'Guia do apresentador por secção']}
            bulletColor="var(--color-accent)"
            mockup={<MockupDefesa theme={theme} />}
          />
          </Reveal>

          {/* Feature 2 — Potencial */}
          <Reveal>
          <FeatureRow
            reverse={true}
            tag="Potencial"
            tagColor="var(--color-primary)"
            title="Descobre o potencial do teu projeto."
            desc=""
            bullets={['Score calculado por IA', 'Ranking público entre estudantes', 'Análise detalhada por categoria']}
            bulletColor="var(--color-primary)"
            mockup={<MockupPotencial theme={theme} />}
          />
          </Reveal>

          {/* Feature 3 — Portfólio */}
          <Reveal>
          <FeatureRow
            reverse={false}
            tag="Portfólio"
            tagColor="var(--color-success)"
            title="A tua página profissional em minutos"
            desc=""
            bullets={['Link único partilhável', 'Página personalizada com o teu estilo', 'Partilha com empresas e professores']}
            bulletColor="var(--color-success)"
            mockup={<MockupPortfolio theme={theme} />}
          />
          </Reveal>

          {/* Feature 4 — Vagas */}
          <Reveal>
          <FeatureRow
            reverse={true}
            tag="Vagas"
            tagColor="var(--color-warning)"
            title="Candidata-te com o teu projeto como portfólio"
            desc=""
            bullets={['Vagas filtradas para estudantes', 'Candidatura com link do projeto', 'Visibilidade directa para empresas']}
            bulletColor="var(--color-warning)"
            mockup={<MockupVagas theme={theme} />}
          />
          </Reveal>
        </>}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        padding: '32px 24px 48px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button onClick={() => navigate('/termos')} style={{
          background: 'none', border: 'none', color: colors.subtle,
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Termos de utilização</button>
        <button onClick={() => navigate('/privacidade')} style={{
          background: 'none', border: 'none', color: colors.subtle,
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Política de privacidade</button>
      </div>

      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
