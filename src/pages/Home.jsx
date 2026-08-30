import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { ShareIcon as Share2 } from '@solar-icons/react/bold/share'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { RefreshCircleIcon as RefreshCw } from '@solar-icons/react/bold/refresh-circle'
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

function Reveal({ children, className, id }) {
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
    <div ref={ref} id={id} className={`reveal-on-scroll${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
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
  const location = useLocation()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  // "Email não confirmado" precisa de mais do que uma frase — precisa de um
  // botão para reenviar, senão quem clicou num link expirado fica preso sem
  // saída nenhuma. Mesmo padrão já usado em Login.jsx e Register.jsx.
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [resendState, setResendState] = useState('idle') // idle | sending | sent
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(null)
  const [animatedCount, setAnimatedCount] = useState(0)
  // Email primeiro, como o Claude — só pede a password depois de sabermos
  // que a conta já existe (handleContinueWithEmail).
  const [heroAuthStep, setHeroAuthStep] = useState('email')
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

  /* Suporte genérico para /#id — o hambúrguer já não aponta para cá (passou
     a linkar /aprende, a página a sério, não este scroll), mas a secção
     "Como funciona" mantém o id, e qualquer link futuro que aponte para
     /#como-funciona continua a funcionar sem precisar de mexer aqui outra
     vez. Depende de location.hash, não só do mount, porque quem já está na
     home não remonta a página — só muda o hash. */
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [location.hash])

  /* Passo 1 do herói mobile: só o email. Verificamos se a conta já existe
     para decidir o resto — se sim, pedimos a password aqui mesmo (sem sair
     da página); se não, o registo em si precisa de mais do que um email
     (nome, papel, termos), por isso segue para /register já com o email
     preenchido, em vez de fingir que dava para fazer tudo num campo só. */
  async function handleContinueWithEmail(e) {
    e.preventDefault()
    if (!email.trim() || authLoading) return
    setAuthError('')
    setAuthLoading(true)
    const { data: exists, error: checkErr } = await supabase.rpc('check_email_exists', { p_email: email.trim() })
    setAuthLoading(false)
    if (checkErr) {
      // check_email_exists (024) limita a 5 pedidos por IP por hora — de
      // propósito, para não virar um oráculo de "que emails existem". Um
      // "erro de ligação" para isto era enganador: não é a rede, é o
      // limite. Mesmo texto que o Login.jsx já usa para o mesmo caso.
      setAuthError('Demasiadas tentativas. Aguarda um pouco e tenta novamente.')
      return
    }
    if (exists) {
      setHeroAuthStep('password')
    } else {
      navigate(`/register?email=${encodeURIComponent(email.trim())}`)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setNotConfirmed(false)
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
      setNotConfirmed(true)
      return
    }

    const { data: emailExists } = await emailExistsPromise
    if (!emailExists) {
      setAuthError('Esta conta não existe.')
    } else {
      setAuthError('Palavra-passe incorreta.')
    }
  }

  async function resendConfirmation() {
    setResendState('sending')
    await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setResendState('sent')
  }

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar hideSidebar />

      {/* ── home-content: envolve tudo o que não é a barra de navegação.
          No telemóvel vira flex-column com order, e a ordem visual deixa de
          ser a ordem do DOM: "o que é" → "como funciona" → prova → última
          ação. No desktop fica igual a hoje — nenhuma order é aplicada fora
          da media query de mobile. ── */}
      <div className="home-content">

      {/* ══ Hero ══ */}
      <div className="home-hero">

        <div className="home-hero-grid">
          {/* Left — copy */}
          <div className="home-hero-copy">
            {/* Mesma frase em qualquer ecrã agora — sem cor nem pontuação a
                fechar, em duas linhas simples. Era só assim no telemóvel;
                o desktop mantinha o "." e o azul em itálico, tirados agora
                por pedido, para bater com a simplicidade pretendida para
                menus/ecrãs de entrada (preto e branco; cor fica para dentro
                da app, sobretudo a dashboard). O subtítulo também saiu — a
                explicação já está no "Como funciona", logo a seguir. */}
            <h1 className="home-hero-h1">
              Mostra o que<br />construíste
            </h1>

            <div className="home-hero-stats">
              <span className="home-hero-stats-number">
                {projectCount == null ? '—' : animatedCount}
              </span>
              <span className="home-hero-stats-label">
                projetos criados<br />por estudantes portugueses
              </span>
            </div>
          </div>

          {/* ── Arranque ── Mesmo bloco em qualquer ecrã, já não só no
              telemóvel: auth em primeiro plano, como o Claude — mas com uma
              saída que o Claude não tem, "Continuar a explorar", sempre
              visível para quem não quer entrar já. Email primeiro, password
              só depois de sabermos que a conta existe
              (handleContinueWithEmail); sem conta, segue para /register com
              o email já preenchido. Ocupa a coluna direita do grid onde
              antes vivia um formulário à parte, só para desktop. */}
          <div className="home-hero-start">
            <GoogleButton />

            <div className="home-start-divider"><span>ou</span></div>

            {heroAuthStep === 'email' ? (
              <form onSubmit={handleContinueWithEmail} className="home-start-form">
                <input
                  type="email"
                  className="home-start-input"
                  placeholder="O teu email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                {authError && <p className="home-start-error">{authError}</p>}
                <button type="submit" className="home-start-email-btn" disabled={authLoading}>
                  {authLoading ? 'A verificar…' : 'Continuar com email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="home-start-form">
                <p className="home-start-email-echo">{email}</p>
                <input
                  type="password"
                  className="home-start-input"
                  placeholder="Palavra-passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                />
                {authError && <p className="home-start-error">{authError}</p>}
                {notConfirmed && (
                  <div className="home-start-confirm">
                    <p className="home-start-error">Email não confirmado. Verifica a tua caixa de entrada.</p>
                    <button
                      type="button"
                      className="home-start-retry"
                      onClick={resendConfirmation}
                      disabled={resendState === 'sending'}
                    >
                      <RefreshCw size={13} className={resendState === 'sending' ? 'home-start-retry-spin' : ''} />
                      {resendState === 'sent' ? 'Reenviado' : 'Tentar outra vez'}
                    </button>
                  </div>
                )}
                <button type="submit" className="home-start-email-btn" disabled={authLoading}>
                  {authLoading ? 'A entrar…' : 'Entrar'}
                </button>
                <div className="home-start-form-links">
                  <button type="button" className="home-start-back" onClick={() => { setHeroAuthStep('email'); setAuthError(''); setNotConfirmed(false) }}>
                    Usar outro email
                  </button>
                  <Link to="/recuperar-password" className="home-start-back">Esqueceste a password?</Link>
                </div>
              </form>
            )}

            <p className="home-start-privacy">
              Ao continuares, aceitas a{' '}
              <button type="button" onClick={() => navigate('/privacidade')}>Política de Privacidade</button>.
            </p>

            <button className="home-start-explore" onClick={() => navigate('/explorar')}>
              Continuar a explorar
            </button>
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

          {/* Sem cartão — só o botão, direto a seguir aos projetos. Nenhuma
              frase a introduzi-lo; o herói já não usa nenhuma, esta é a
              mesma lógica. */}
          {!user && (
            <button className="home-cta-btn" onClick={() => navigate('/novo')}>
              Começa a criar <ArrowRight size={15} />
            </button>
          )}
        </div>
      </Reveal>

      {/* ══ Como funciona ══ */}
      <Reveal className="home-how-section" id="como-funciona">
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
    </div>
  )
}
