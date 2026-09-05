import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { CloseIcon as XIcon } from '@solar-icons/react/bold/close'
import { SadCircleIcon as Frown } from '@solar-icons/react/bold/sad-circle'
import { RefreshCircleIcon as RefreshCw } from '@solar-icons/react/bold/refresh-circle'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { PhoneIcon as Phone } from '@solar-icons/react/bold/phone'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'
import RestReminder from './components/RestReminder'
import CookieConsent from './components/CookieConsent'
import SplashScreen from './components/SplashScreen'
import { Analytics } from '@vercel/analytics/react'
import { captureError } from './lib/errorTracking'
import { trackPageview } from './lib/analytics'
import { pushRoute } from './lib/routeHistory'
import { supabase } from './lib/supabase'
import { OCCUPATIONS } from './lib/occupations'
import { Select } from './components/ui'
import ComingSoon from './pages/ComingSoon'

// Shows the "coming soon" cover only on the public domain, and only before
// launch — so testers can keep using the .vercel.app URL meanwhile, and
// showo.pt flips to the real app on its own at launch time, no deploy needed.
// Capture referral code from any entry page
const refParam = new URLSearchParams(window.location.search).get('ref')
if (refParam) localStorage.setItem('showo_ref', refParam)

const COMING_SOON_HOSTS = ['showo.pt', 'www.showo.pt']
const LAUNCH_AT = new Date('2026-07-01T08:00:00Z') // já passou — countdown desativado

function useIsComingSoon() {
  const [isComingSoon, setIsComingSoon] = useState(
    () => COMING_SOON_HOSTS.includes(window.location.hostname) && new Date() < LAUNCH_AT
  )
  useEffect(() => {
    if (!isComingSoon) return
    const id = setInterval(() => {
      if (new Date() >= LAUNCH_AT) setIsComingSoon(false)
    }, 30_000)
    return () => clearInterval(id)
  }, [isComingSoon])
  return isComingSoon
}

// Eagerly loaded — visible on first paint
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

// Lazy loaded — only fetched when the route is actually visited
const RecuperarPassword = lazy(() => import('./pages/RecuperarPassword'))
const NewProject   = lazy(() => import('./pages/NewProject'))
const ProjectPage  = lazy(() => import('./pages/ProjectPage'))
const EditProject  = lazy(() => import('./pages/EditProject'))
const Explore      = lazy(() => import('./pages/Explore'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Biblioteca   = lazy(() => import('./pages/Biblioteca'))
const Settings     = lazy(() => import('./pages/Settings'))
const UserProfile  = lazy(() => import('./pages/UserProfile'))
const Admin        = lazy(() => import('./pages/Admin'))
const TurmaPage    = lazy(() => import('./pages/TurmaPage'))
const TurmaAluno   = lazy(() => import('./pages/TurmaAluno'))
const Turmas       = lazy(() => import('./pages/Turmas'))
const Certificate  = lazy(() => import('./pages/Certificate'))
const Mensagens    = lazy(() => import('./pages/Mensagens'))
const ProjectManage  = lazy(() => import('./pages/ProjectManage'))
const Privacidade    = lazy(() => import('./pages/Privacidade'))
const Termos         = lazy(() => import('./pages/Termos'))
const GoogleCalendarCallback = lazy(() => import('./pages/GoogleCalendarCallback'))
const DiaryCanvas  = lazy(() => import('./pages/DiaryCanvas'))
const AprendeAUsar = lazy(() => import('./pages/AprendeAUsar'))
const Pricing      = lazy(() => import('./pages/Pricing'))
const Welcome      = lazy(() => import('./pages/Welcome'))
const Feedback     = lazy(() => import('./pages/Feedback'))

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <style>{`@keyframes pg-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
      {[120, 80, 100].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `pg-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
      ))}
    </div>
  )
}

// Holds the router (and every route) until auth state is resolved, so pages
// never need their own "if (authLoading) show a spinner" check that used to
// render right after this same PageLoader — that produced two back-to-back
// spinners (this one, then the page's own) on a direct/deep navigation.
function AuthGate({ children }) {
  const { loading } = useAuth()
  if (loading) return <PageLoader />
  return children
}

const PUBLIC_PATHS = new Set(['/', '/home', '/login', '/register', '/recuperar-password', '/explorar', '/explore', '/privacidade', '/termos', '/pricing', '/welcome'])
const PUBLIC_PREFIXES = ['/u/', '/projeto/', '/certificado/', '/empresa/', '/oauth/']

function PhoneGate({ children }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPublic = PUBLIC_PATHS.has(location.pathname) || PUBLIC_PREFIXES.some(p => location.pathname.startsWith(p))
  const needsPhone = !isPublic && user && profile && profile.role !== 'professor' && !profile.phone

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim()) { setError('Introduz o teu número de telemóvel.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id)
    if (err) { setError('Erro ao guardar. Tenta novamente.'); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
  }

  if (!needsPhone) return children

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: '32px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <img src="/darkmode_icon_logo.png" alt="Showo" style={{ height: 24, width: 'auto', objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 4 }} />
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Uma última coisa
          </p>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Deixa o teu telemóvel para activarmos o teu acesso gratuito. Nunca partilhado, só usado pela nossa equipa.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
          }}>
            <span style={{
              padding: '9px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)',
              borderRight: '1px solid var(--color-border)', flexShrink: 0, userSelect: 'none',
            }}>+351</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="912 345 678"
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '0.88rem', color: 'var(--color-text)', fontFamily: 'inherit',
                padding: '9px 14px',
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-error)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)', border: 'none',
                background: saving ? 'var(--color-border)' : 'var(--color-text)',
                color: 'var(--color-bg)', fontWeight: 600, fontSize: '0.85rem',
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? 'A guardar…' : 'Activar acesso gratuito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Só a conta Individual (role 'aluno' sem organization_id — quem tem
// organization_id é aluno institucional, já sabe "o que faz") vê isto,
// e só quem já não tem occupation preenchida — para quem já respondeu no
// registo, ou já respondeu aqui uma vez, nunca mais aparece.
function OccupationGate({ children }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [occupation, setOccupation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPublic = PUBLIC_PATHS.has(location.pathname) || PUBLIC_PREFIXES.some(p => location.pathname.startsWith(p))
  const needsOccupation = !isPublic && user && profile
    && profile.role === 'aluno' && !profile.organization_id && !profile.occupation

  async function handleSubmit(e) {
    e.preventDefault()
    if (!occupation) return
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.from('profiles').update({ occupation }).eq('id', user.id)
      if (err) { setSaving(false); setError(err.message); return }
      await refreshProfile()
    } catch (ex) {
      setError(String(ex?.message || ex))
    }
    setSaving(false)
  }

  if (!needsOccupation) return children

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: '32px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <img src="/darkmode_icon_logo.png" alt="Showo" style={{ height: 24, width: 'auto', objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 4 }} />
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Mais uma coisa
          </p>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Diz-nos o que fazes para aparecer no teu perfil público.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select value={occupation} onChange={setOccupation} options={OCCUPATIONS} placeholder="Seleciona uma opção" />

          {error && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-error)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving || !occupation}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)', border: 'none',
                background: (saving || !occupation) ? 'var(--color-border)' : 'var(--color-text)',
                color: 'var(--color-bg)', fontWeight: 600, fontSize: '0.85rem',
                cursor: (saving || !occupation) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: null })} />
  }
}

function ErrorFallback({ error, onReset }) {
  useEffect(() => {
    document.body.classList.remove('has-sidebar', 'sidebar-collapsed')
    return () => {}
  }, [])
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Frown size={26} color="var(--color-error)" />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Algo correu mal
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado. Tenta recarregar a página.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { onReset(); window.location.href = '/' }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Início
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-primary)',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px var(--color-primary-subtle)',
          }}
        >
          <RefreshCw size={14} /> Recarregar
        </button>
      </div>
    </div>
  )
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────
function NotFound() {
  const navigate = useNavigate()
  useEffect(() => {
    document.body.classList.remove('has-sidebar', 'sidebar-collapsed')
  }, [])
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <div style={{
        fontSize: 'clamp(64px, 12vw, 96px)', fontWeight: 900,
        fontFamily: 'var(--font-heading)', letterSpacing: '-4px', lineHeight: 1,
        background: 'var(--color-primary)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>404</div>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Página não encontrada
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          A página que procuras não existe ou foi movida.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--color-primary)',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px var(--color-primary-subtle)',
          }}
        >
          Ir para o início
        </button>
      </div>
    </div>
  )
}

// ── Animation timeline ────────────────────────────────────────────────────────
// 0.5s  — logo fades/scales in
// 0.6s  — hold at final state
// 0.6s  — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1100           // when to start fading (1100ms)
const UNMOUNT_MS = HOLD_MS + 700  // when to remove from DOM (1800ms)
const SPLASH_KEY = 'showo_seen_splash'

function HomeRoute() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return <Home />
}

function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageview(location.pathname + location.search)
    pushRoute(location.pathname)
  }, [location.pathname, location.search])
  return null
}

// Forces anyone arriving via a password-recovery link onto /recuperar-password
// before they can touch the rest of the app — a recovery link shouldn't be
// able to silently sign someone in without them actually setting a new
// password. Wraps the whole route tree instead of relying on the
// /recuperar-password page alone, so it holds regardless of where the
// email's redirect actually lands.
function RecoveryGate({ pwRecovery, children }) {
  const location = useLocation()
  if (pwRecovery && location.pathname !== '/recuperar-password') {
    return <Navigate to="/recuperar-password" replace />
  }
  return children
}

function AuthErrorBanner() {
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash.includes('error=')) return
    const p = new URLSearchParams(hash)
    const code = p.get('error_code')
    const desc = p.get('error_description')
    if (code === 'otp_expired' || desc?.includes('expired')) {
      setMsg('O link de confirmação expirou. Faz login e pede um novo email de confirmação.')
    } else if (p.get('error')) {
      setMsg('Erro de autenticação. Tenta entrar novamente.')
    }
    // clean the hash from the URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, maxWidth: 480, width: 'calc(100% - 32px)',
      background: '#1a0e0e', border: '1px solid var(--color-error-subtle)',
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'inherit',
    }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><AlertTriangle size={18} /></span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#fca5a5', lineHeight: 1.5 }}>{msg}</p>
      </div>
      <button
        onClick={() => setMsg('')}
        style={{ background: 'none', border: 'none', color: '#7d93b0', cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
      ><XIcon size={16} /></button>
    </div>
  )
}

export default function App() {
  const isComingSoon = useIsComingSoon()

  // Skip splash on repeat visits — only show it the first time
  const firstVisit = !localStorage.getItem(SPLASH_KEY)
  const [splashVisible,  setSplashVisible]  = useState(firstVisit)
  const [splashMounted,  setSplashMounted]  = useState(firstVisit)

  // Detected synchronously on first render (before anything else mounts) so
  // there's no race with lazy-loaded pages for who sees the recovery hash
  // first. type=recovery is what Supabase appends to the redirect URL.
  const [pwRecovery, setPwRecovery] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  )

  useEffect(() => {
    if (!firstVisit) return
    localStorage.setItem(SPLASH_KEY, '1')
    const fadeTimer    = setTimeout(() => setSplashVisible(false), HOLD_MS)
    const unmountTimer = setTimeout(() => setSplashMounted(false), UNMOUNT_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(unmountTimer) }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPwRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (isComingSoon) return <ComingSoon />

  return (
    <HelmetProvider>
      <ThemeProvider>
        <SidebarProvider>
        <AuthProvider>
          <AuthErrorBanner />
          {splashMounted && <SplashScreen visible={splashVisible} />}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Analytics />
            <CookieConsent />
            {/* Precisa de useLocation (para não aparecer em /login, /register,
                etc.) — por isso mora dentro do Router, não fora. */}
            <RestReminder />
            <PageViewTracker />
            <ErrorBoundary>
            <RecoveryGate pwRecovery={pwRecovery}>
            <AuthGate>
            <PhoneGate>
            <OccupationGate>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<HomeRoute />}   />
              <Route path="/home"          element={<Home />}        />
              <Route path="/novo"          element={<NewProject />}  />
              <Route path="/projeto/:slug" element={<ProjectPage />} />
              <Route path="/editar/:slug"  element={<EditProject />} />
              <Route path="/explorar"      element={<Explore />}     />
              <Route path="/explore"       element={<Navigate to="/explorar" replace />} />
              <Route path="/login"         element={<Login />}       />
              <Route path="/recuperar-password" element={<RecuperarPassword onDone={() => setPwRecovery(false)} />} />
              <Route path="/register"      element={<Register />}    />
              <Route path="/dashboard"     element={<Dashboard />}   />
              <Route path="/biblioteca"    element={<Biblioteca />}  />
              <Route path="/settings"      element={<Settings />}    />
              <Route path="/u/:username"   element={<UserProfile />} />
              <Route path="/admin"         element={<Admin />}       />
              <Route path="/turma/:code"   element={<TurmaPage />}   />
              <Route path="/turma/:code/aluno/:userId" element={<TurmaAluno />} />
              <Route path="/turmas"        element={<Turmas />}      />
              <Route path="/certificado/:slug"  element={<Certificate />}  />
              <Route path="/mensagens"          element={<Mensagens />}    />
              <Route path="/projeto/:slug/gerir"  element={<ProjectManage />} />
              <Route path="/projeto/:slug/diario" element={<DiaryCanvas />}  />
              <Route path="/privacidade"        element={<Privacidade />}   />
              <Route path="/termos"             element={<Termos />}        />
              <Route path="/oauth/google-calendar" element={<GoogleCalendarCallback />} />
              <Route path="/aprende"            element={<AprendeAUsar />}  />
              <Route path="/pricing"            element={<Pricing />}       />
              <Route path="/welcome"            element={<Welcome />}       />
              <Route path="/feedback"           element={<Feedback />}      />
              <Route path="*"                   element={<NotFound />}      />
            </Routes>
            </Suspense>
            </OccupationGate>
            </PhoneGate>
            </AuthGate>
            </RecoveryGate>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
