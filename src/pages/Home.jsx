import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, FileText, Trophy, Share2, Eye, Mail } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { claimAnonymousProjects } from '../lib/claimAnonymousProjects'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'

const colors = {
  bg:           'var(--color-bg)',
  card:         'var(--color-surface)',
  border:       'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue:         'var(--color-primary)',
  text:         'var(--color-text)',
  muted:        'var(--color-text-secondary)',
  subtle:       'var(--color-text-tertiary)',
}

const HOW_IT_WORKS = [
  { Icon: FileText, step: '1', title: 'Descreve o teu projeto', desc: 'Em poucas frases: o que fizeste, que problema resolve, que tecnologias usaste.' },
  { Icon: Trophy,    step: '2', title: 'Ganha o teu score', desc: 'Score automático, sugestões de melhoria e uma página pronta a partilhar.' },
  { Icon: Share2,    step: '3', title: 'Partilha com o mundo', desc: 'Um link para o CV ou LinkedIn — mostra o que fizeste a professores e recrutadores.' },
]

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

const AREA_COLORS = {
  'Tecnologias de Informação': '#1b78f7',
  'Design':                    '#7c3aed',
  'Marketing':                 '#f59e0b',
  'Gestão':                    '#10b981',
  'Saúde':                     '#ef4444',
  'Engenharia':                '#06b6d4',
}

function getAreaColor(area) {
  return AREA_COLORS[area] || '#1b78f7'
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,ai_tagline,score,cover_url,views,project_type')
        .order('score', { ascending: false })
        .limit(6)
      if (data) setProjects(data)
      setProjectsLoading(false)

      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
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
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        .reveal-on-scroll {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
        .home-project-card {
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s !important;
          cursor: pointer;
        }
        .home-project-card:hover {
          transform: translateY(-3px) !important;
          border-color: var(--color-border-hover) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.2) !important;
        }
        .home-auth-btn {
          transition: opacity 0.15s !important;
        }
        .home-auth-btn:hover { opacity: 0.88 !important; }
        .home-auth-field {
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1.5px solid var(--color-border);
          transition: border-color 0.15s;
        }
        .home-auth-input,
        body.light .home-auth-input {
          flex: 1; width: 100%; background: transparent !important; border: none;
          color: #fff !important; font-size: 15px; outline: none; font-family: inherit;
          padding: 10px 0; box-sizing: border-box;
        }
        .home-auth-input::placeholder { color: rgba(255,255,255,0.35) !important; }
        .home-auth-input:-webkit-autofill,
        .home-auth-input:-webkit-autofill:hover,
        .home-auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
          background-color: transparent !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .google-btn { background: rgba(255,255,255,0.1) !important; color: #fff !important; border-color: rgba(255,255,255,0.2) !important; }
        .home-explore-link { transition: color 0.15s !important; }
        .home-explore-link:hover { color: var(--color-primary) !important; }
        @keyframes skeleton-shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
        .skeleton-shimmer { animation: skeleton-shimmer 1.5s ease-in-out infinite; }

        @media (max-width: 860px) {
          .home-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            gap: 32px !important;
          }
          .home-hero-auth { max-width: 420px !important; margin: 0 auto !important; order: 2 !important; }
          .home-hero-copy { order: 1 !important; }
          .home-hero-stats { justify-content: center !important; }
          .home-hero-sub { margin-left: auto !important; margin-right: auto !important; }
        }
        @media (max-width: 600px) {
          .home-hero { padding: 88px 20px 40px !important; }
          .home-hero-grid { gap: 28px !important; }
          .home-hero-copy { order: 1 !important; }
          .home-hero-auth { order: 2 !important; }
          .home-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; margin-bottom: 16px !important; }
          .home-hero-sub { font-size: 15px !important; margin-bottom: 0 !important; }
          .home-hero-stats { display: none !important; }
          .home-projects-grid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar hideSidebar />

      {/* Hero — headline + inline auth */}
      <div className="home-hero" style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(115deg, #000 0%, #050b1c 40%, #0e2249 85%, #143169 100%)',
        borderBottom: '1px solid #1e3050',
        padding: '120px 40px 80px',
        color: '#fff',
      }}>
        {/* Aurora blobs */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(46% 42% at 14% 10%, rgba(27,120,247,0.30) 0%, transparent 70%),
            radial-gradient(42% 38% at 88% 28%, rgba(13,58,150,0.22) 0%, transparent 70%),
            radial-gradient(38% 36% at 46% 92%, rgba(94,147,255,0.16) 0%, transparent 70%)
          `,
        }} />

        <div className="home-hero-grid" style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1060, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 400px', gap: 64,
          alignItems: 'center',
        }}>
          {/* Left — copy */}
          <div className="home-hero-copy" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="home-hero-h1" style={{
              fontSize: 'clamp(36px, 5.2vw, 60px)', fontWeight: 400,
              lineHeight: 1.08, margin: '0 0 24px',
              letterSpacing: '-1.5px', fontFamily: 'var(--font-heading)',
            }}>
              Mostra o que{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--color-primary)' }}>construíste.</em>
            </h1>
            <p className="home-hero-sub" style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: '0 0 36px', maxWidth: 420 }}>
              Transforma projetos escolares em páginas profissionais com score automático e análise por IA.
            </p>
            <div className="home-hero-stats" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(32px, 4vw, 48px)', color: 'var(--color-primary)', letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {projectCount == null ? '—' : animatedCount}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500, lineHeight: 1.35 }}>
                projetos criados<br />por estudantes portugueses
              </span>
            </div>
          </div>

          {/* Right — auth widget */}
          <div className="home-hero-auth" style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: '32px 28px',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#fff' }}>Entra na Showo</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 20px' }}>
              Cria a tua conta ou faz login para começar.
            </p>

            <GoogleButton />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="home-auth-field" style={{ borderBottomColor: emailFocused ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)' }}>
                <Mail size={16} color="rgba(255,255,255,0.35)" />
                <input
                  type="email" className="home-auth-input" placeholder="Email"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                  style={{ color: '#fff' }}
                />
              </div>
              <div className="home-auth-field" style={{ borderBottomColor: passFocused ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="home-auth-input" placeholder="Palavra-passe"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                  style={{ color: '#fff' }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: showPassword ? 'var(--color-primary)' : 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', flexShrink: 0 }}>
                  <EyeIcon visible={showPassword} />
                </button>
              </div>

              {authError && (
                <p style={{ color: 'var(--color-error)', fontSize: 13, fontWeight: 600, margin: 0 }}>{authError}</p>
              )}

              <button type="submit" className="home-auth-btn" disabled={authLoading} style={{
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 0', fontSize: 15, fontWeight: 700,
                cursor: authLoading ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: authLoading ? 0.7 : 1, marginTop: 4,
              }}>
                {authLoading ? 'A entrar...' : 'Entrar'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <Link to="/register" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none' }}>
                Criar conta
              </Link>
              <Link to="/login?forgot=1" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none' }}>
                Esqueci a palavra-passe
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Real projects */}
      <Reveal style={{ padding: '64px 24px 48px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{
              fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 900, letterSpacing: '-1px',
              margin: 0, fontFamily: 'var(--font-heading)', color: colors.text,
            }}>
              Projetos em destaque
            </h2>
            <button
              onClick={() => navigate('/explorar')}
              className="home-explore-link"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.muted, fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <div className="home-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {projectsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  background: colors.card, border: `1px solid ${colors.border}`,
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <div className="skeleton-shimmer" style={{ height: 100, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                  <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton-shimmer" style={{ height: 10, width: '50%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                    <div className="skeleton-shimmer" style={{ height: 14, width: '80%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                    <div className="skeleton-shimmer" style={{ height: 10, width: '100%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                    <div className="skeleton-shimmer" style={{ height: 10, width: '60%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                  </div>
                </div>
              ))
            ) : projects.map(p => (
              <div
                key={p.id}
                className="home-project-card"
                onClick={() => navigate(`/projeto/${p.slug}`)}
                style={{
                  background: colors.card, border: `1px solid ${colors.border}`,
                  borderRadius: 12, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{
                  height: p.cover_url ? 120 : 72,
                  background: p.cover_url ? undefined : getAreaColor(p.area),
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: p.cover_url ? 0 : '0 16px',
                }}>
                  {p.cover_url ? (
                    <>
                      <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(13,20,36,0.7) 100%)' }} />
                    </>
                  ) : (
                    <span style={{ fontSize: 32, fontWeight: 900, color: 'rgba(255,255,255,0.25)', userSelect: 'none', lineHeight: 1 }}>
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                  {p.score != null && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      fontSize: 12, fontWeight: 800, color: '#fff',
                      background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '3px 8px',
                      backdropFilter: 'blur(4px)',
                    }}>
                      {p.score} pts
                    </span>
                  )}
                </div>

                <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, marginBottom: 4 }}>
                    {p.creator_name || 'Estudante'}{p.area ? ` · ${p.area}` : ''}
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.3, letterSpacing: '-0.1px' }}>
                    {p.name}
                  </h3>
                  {p.ai_tagline && (
                    <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                      {p.ai_tagline}
                    </p>
                  )}
                  {p.views != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11, color: colors.subtle }}>
                      <Eye size={12} /> {p.views}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Como funciona */}
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

      {/* Footer links */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        padding: '48px 24px',
        borderTop: `1px solid ${colors.border}`,
        marginTop: 64,
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
    </div>
  )
}
