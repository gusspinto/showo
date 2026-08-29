import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, FileText, Trophy, Share2, Eye, Mail } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { claimAnonymousProjects } from '../lib/claimAnonymousProjects'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'
import './Home.css'

const TITLE_FONT_CSS = {
  croogla:  'Croogla, sans-serif',
  syne:     'Syne, sans-serif',
  playfair: '"Playfair Display", serif',
  space:    '"Space Grotesk", sans-serif',
  fredoka:  '"Fredoka One", cursive',
  inter:    'Inter, sans-serif',
}

const HOW_IT_WORKS = [
  { Icon: FileText, step: '1', title: 'Descreve o teu projeto', desc: 'Em poucas frases: o que fizeste, que problema resolve, que tecnologias usaste.' },
  { Icon: Trophy,    step: '2', title: 'Ganha o teu score', desc: 'Score automático, sugestões de melhoria e uma página pronta a partilhar.' },
  { Icon: Share2,    step: '3', title: 'Partilha com o mundo', desc: 'Um link para o CV ou LinkedIn — mostra o que fizeste a professores e recrutadores.' },
]

const AREA_COLORS = {
  'Tecnologias de Informação': 'var(--color-primary)',
  'Design':                    'var(--color-accent)',
  'Marketing':                 'var(--color-warning)',
  'Gestão':                    'var(--color-success)',
  'Saúde':                     'var(--color-error)',
  'Engenharia':                'var(--color-info)',
}

function Reveal({ children, className }) {
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
    <div ref={ref} className={`reveal-on-scroll${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function ProjectSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skel skel-card">
          <div className="skel-cover" />
          <div className="flex-col gap-2 p-4">
            <div className="skel-line w-40 h-sm" />
            <div className="skel-line w-80 h-lg" />
            <div className="skel-line w-full" />
            <div className="skel-line w-60" />
          </div>
        </div>
      ))}
    </>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(null)
  const [animatedCount, setAnimatedCount] = useState(0)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [projectOfMonth, setProjectOfMonth] = useState(null)

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7) // "2026-08"
    supabase
      .from('project_of_month')
      .select(`month, note, project:project_id (id, name, slug, area, ai_tagline, score, cover_url, preview_style, user_id, creator_name)`)
      .eq('month', currentMonth)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.project) return
        // Fetch owner profile
        supabase.from('profiles').select('full_name, username, avatar_url').eq('id', data.project.user_id).maybeSingle()
          .then(({ data: profile }) => {
            setProjectOfMonth({ ...data, profile: profile || null })
          })
      })
  }, [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,ai_tagline,score,cover_url,views,project_type,preview_style')
        .or('visibility.eq.public,visibility.is.null')
        .order('score', { ascending: false })
        .limit(6)
      if (data) setProjects(data)
      setProjectsLoading(false)

      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .or('visibility.eq.public,visibility.is.null')
      if (count != null) setProjectCount(count)
    }
    load()
  }, [])

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

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    const emailExistsPromise = supabase.rpc('check_email_exists', { p_email: email.trim() })
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setAuthLoading(false)

    if (!err) {
      const { data: { user: loggedUser } } = await supabase.auth.getUser()
      if (loggedUser) claimAnonymousProjects(loggedUser.id)
      navigate('/dashboard')
      return
    }

    if (err.message?.toLowerCase().includes('email not confirmed')) {
      setAuthError('Email não confirmado. Verifica a tua caixa de entrada.')
      return
    }

    const { data: emailExists } = await emailExistsPromise
    if (!emailExists) {
      setAuthError('Esta conta não existe.')
    } else {
      setAuthError('Palavra-passe incorreta.')
    }
  }

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar hideSidebar />

      {/* ══ Hero ══ */}
      <div className="home-hero">
        <div className="home-hero-aurora" aria-hidden="true" />

        <div className="home-hero-grid">
          {/* Left — copy */}
          <div className="home-hero-copy">
            <h1 className="home-hero-h1">
              Mostra o que <em>construíste.</em>
            </h1>
            <p className="home-hero-sub">
              Transforma projetos escolares em páginas profissionais com score automático e análise por IA.
            </p>
            <div className="home-hero-stats">
              <span className="home-hero-stats-number">
                {projectCount == null ? '—' : animatedCount}
              </span>
              <span className="home-hero-stats-label">
                projetos criados<br />por estudantes portugueses
              </span>
            </div>
          </div>

          {/* Right — auth widget */}
          <div className="home-hero-auth">
            <div className="home-auth-title">Entra na Showo</div>
            <p className="home-auth-subtitle">Cria a tua conta ou faz login para começar.</p>

            <GoogleButton />

            <div className="home-auth-divider"><span>ou</span></div>

            <form onSubmit={handleLogin} className="home-auth-form">
              <div className={`home-auth-field${emailFocused ? ' focused' : ''}`}>
                <Mail size={16} color="rgba(255,255,255,0.35)" />
                <input
                  type="email" className="home-auth-input" placeholder="Email"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                />
              </div>
              <div className={`home-auth-field${passFocused ? ' focused' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="home-auth-input" placeholder="Palavra-passe"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                />
                <button
                  type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                  className={`home-auth-eye${showPassword ? ' active' : ''}`}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>

              {authError && <p className="home-auth-error">{authError}</p>}

              <button type="submit" className="home-auth-submit" disabled={authLoading}>
                {authLoading ? 'A entrar...' : 'Entrar'}
              </button>
            </form>

            <div className="home-auth-links">
              <Link to="/novo">Criar conta</Link>
              <Link to="/recuperar-password">Esqueceste a password?</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Projeto do Mês ══ */}
      {projectOfMonth && (() => {
        const p = projectOfMonth.project
        const profile = projectOfMonth.profile
        const monthLabel = (() => {
          const [y, m] = projectOfMonth.month.split('-')
          return new Date(+y, +m - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
        })()
        const displayName = profile?.full_name || p.creator_name || 'Estudante'
        const avatar = profile?.avatar_url
        return (
          <Reveal className="home-pom-wrap">
            <div className="home-pom-inner">
              <div
                className="home-pom-card"
                onClick={() => navigate(`/projeto/${p.slug}`)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background cover or gradient */}
                <div className="home-pom-bg">
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" className="home-pom-cover-img" />
                    : <div className="home-pom-cover-gradient" style={{ background: AREA_COLORS[p.area] || 'var(--color-primary)' }} />
                  }
                  <div className="home-pom-overlay" />
                </div>

                {/* Content */}
                <div className="home-pom-content">
                  {/* Badge */}
                  <div className="home-pom-badge">
                    <Trophy size={13} />
                    Projeto do mês · {monthLabel}
                  </div>

                  {/* Title */}
                  <h2 className="home-pom-title" style={{
                    fontFamily: p.preview_style?.titleFont ? TITLE_FONT_CSS[p.preview_style.titleFont] : undefined,
                    textTransform: p.preview_style?.titleStyle === 'caps' ? 'uppercase' : undefined,
                  }}>
                    {p.name}
                  </h2>

                  {/* Tagline */}
                  {p.ai_tagline && (
                    <p className="home-pom-tagline">{p.ai_tagline}</p>
                  )}

                  {/* Author row */}
                  <div className="home-pom-author">
                    {avatar
                      ? <img src={avatar} alt="" className="home-pom-avatar" />
                      : <div className="home-pom-avatar home-pom-avatar-fallback">{displayName[0]?.toUpperCase()}</div>
                    }
                    <div>
                      <div className="home-pom-author-name">{displayName}</div>
                      {p.area && <div className="home-pom-author-area">{p.area}</div>}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="home-pom-footer">
                    <button className="home-pom-cta" onClick={e => { e.stopPropagation(); navigate(`/projeto/${p.slug}`) }}>
                      Ver projeto <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Optional admin note */}
                  {projectOfMonth.note && (
                    <p className="home-pom-note">"{projectOfMonth.note}"</p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        )
      })()}

      {/* ══ Projects ══ */}
      <Reveal className="home-section">
        <div className="home-section-inner">
          <div className="home-section-header">
            <h2 className="home-section-title">Projetos em destaque</h2>
            <button onClick={() => navigate('/explorar')} className="home-explore-link">
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <div className="home-projects-grid">
            {projectsLoading ? <ProjectSkeleton /> : projects.map(p => (
              <div key={p.id} className="home-project-card" onClick={() => navigate(`/projeto/${p.slug}`)}>
                <div
                  className="home-card-cover"
                  style={{
                    height: p.cover_url ? 120 : 72,
                    background: p.cover_url ? undefined : (AREA_COLORS[p.area] || 'var(--color-primary)'),
                    padding: p.cover_url ? 0 : '0 16px',
                  }}
                >
                  {p.cover_url ? (
                    <>
                      <img src={p.cover_url} alt="" />
                      <div className="home-card-cover-gradient" />
                    </>
                  ) : (
                    <span className="home-card-cover-letter">
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                <div className="home-card-body">
                  <div className="home-card-meta">
                    {p.creator_name || 'Estudante'}{p.area ? ` · ${p.area}` : ''}
                  </div>
                  <h3 className="home-card-name" style={{
                    ...(p.preview_style?.titleFont ? { fontFamily: TITLE_FONT_CSS[p.preview_style.titleFont] } : {}),
                    ...(p.preview_style?.titleStyle === 'caps' ? { textTransform: 'uppercase', letterSpacing: '0.04em' } : {}),
                  }}>{p.name}</h3>
                  {p.ai_tagline && <p className="home-card-tagline">{p.ai_tagline}</p>}
                  {p.views != null && (
                    <div className="home-card-views"><Eye size={12} /> {p.views}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!user && (
            <div className="home-cta-banner">
              <div className="home-cta-text">
                <span className="home-cta-label">O teu projeto também merece uma página assim.</span>
              </div>
              <button className="home-cta-btn" onClick={() => navigate('/novo')}>
                Cria o teu <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </Reveal>

      {/* ══ Como funciona ══ */}
      <Reveal className="home-how-section">
        <div className="home-how-inner">
          <h2 className="home-how-title">Como funciona a Showo</h2>
          <p className="home-how-subtitle">
            Descreves o teu projeto. Nós criamos a página. Em menos de dois minutos.
          </p>
          <div className="how-it-works-grid">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} className="home-how-card">
                <div className="home-how-icon">
                  <s.Icon size={19} color="var(--color-primary)" />
                </div>
                <span className="home-how-step">{s.step}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ══ Footer ══ */}
      <div className="home-footer">
        <button onClick={() => navigate('/termos')}>Termos de utilização</button>
        <button onClick={() => navigate('/privacidade')}>Política de privacidade</button>
      </div>
    </div>
  )
}
