import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, X as XIcon, Frown, RefreshCw, ArrowLeft } from 'lucide-react'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'
import RestReminder from './components/RestReminder'
import SplashScreen from './components/SplashScreen'

// Eagerly loaded — visible on first paint
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

// Lazy loaded — only fetched when the route is actually visited
const NewProject   = lazy(() => import('./pages/NewProject'))
const ProjectPage  = lazy(() => import('./pages/ProjectPage'))
const EditProject  = lazy(() => import('./pages/EditProject'))
const Ranking      = lazy(() => import('./pages/Ranking'))
const Explore      = lazy(() => import('./pages/Explore'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Settings     = lazy(() => import('./pages/Settings'))
const UserProfile  = lazy(() => import('./pages/UserProfile'))
const Admin        = lazy(() => import('./pages/Admin'))
const TurmaPage    = lazy(() => import('./pages/TurmaPage'))
const Missoes      = lazy(() => import('./pages/Missoes'))
const Turmas       = lazy(() => import('./pages/Turmas'))
const Conquistas   = lazy(() => import('./pages/Conquistas'))
const AIInterview  = lazy(() => import('./pages/AIInterview'))
const Certificate  = lazy(() => import('./pages/Certificate'))
const Vagas        = lazy(() => import('./pages/Vagas'))
const Estagio       = lazy(() => import('./pages/Estagio'))
const Mensagens    = lazy(() => import('./pages/Mensagens'))
const Candidatos   = lazy(() => import('./pages/Candidatos'))
const Pipeline     = lazy(() => import('./pages/Pipeline'))
const EmpresaPage    = lazy(() => import('./pages/EmpresaPage'))
const ProjectManage  = lazy(() => import('./pages/ProjectManage'))

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--c-border)', borderTop: '2px solid #1b78f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  render() {
    if (!this.state.hasError) return this.props.children
    return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: null })} />
  }
}

function ErrorFallback({ error, onReset }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Frown size={26} color="#ef4444" />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Algo correu mal
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado. Tenta recarregar a página.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { onReset(); window.location.href = '/' }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--c-muted)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Início
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1b78f7',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
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
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <div style={{
        fontSize: 'clamp(64px, 12vw, 96px)', fontWeight: 900,
        fontFamily: 'var(--font-heading)', letterSpacing: '-4px', lineHeight: 1,
        background: '#1b78f7',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>404</div>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Página não encontrada
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.6 }}>
          A página que procuras não existe ou foi movida.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--c-muted)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#1b78f7',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Ir para o início
        </button>
      </div>
    </div>
  )
}

// ── Animation timeline ────────────────────────────────────────────────────────
// 1.9s  — splash animation plays
// 1.0s  — hold at final state so the user can read it
// 0.65s — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1900 + 1800   // when to start fading (3700ms)
const UNMOUNT_MS = HOLD_MS + 700 // when to remove from DOM (4400ms)
const SPLASH_KEY = 'showo_seen_splash'

function HomeRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Home />
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
      background: '#1a0e0e', border: '1px solid rgba(239,68,68,0.35)',
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
  // Skip splash on repeat visits — only show it the first time
  const firstVisit = !localStorage.getItem(SPLASH_KEY)
  const [splashVisible,  setSplashVisible]  = useState(firstVisit)
  const [splashMounted,  setSplashMounted]  = useState(firstVisit)

  useEffect(() => {
    if (!firstVisit) return
    localStorage.setItem(SPLASH_KEY, '1')
    const fadeTimer    = setTimeout(() => setSplashVisible(false), HOLD_MS)
    const unmountTimer = setTimeout(() => setSplashMounted(false), UNMOUNT_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(unmountTimer) }
  }, [])

  return (
    <HelmetProvider>
      <ThemeProvider>
        <SidebarProvider>
        <AuthProvider>
          <AuthErrorBanner />
          {splashMounted && <SplashScreen visible={splashVisible} />}
          <RestReminder />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<HomeRoute />}   />
              <Route path="/novo"          element={<NewProject />}  />
              <Route path="/projeto/:slug" element={<ProjectPage />} />
              <Route path="/editar/:slug"  element={<EditProject />} />
              <Route path="/ranking"       element={<Ranking />}     />
              <Route path="/explorar"      element={<Explore />}     />
              <Route path="/login"         element={<Login />}       />
              <Route path="/register"      element={<Register />}    />
              <Route path="/dashboard"     element={<Dashboard />}   />
              <Route path="/settings"      element={<Settings />}    />
              <Route path="/u/:username"   element={<UserProfile />} />
              <Route path="/admin"         element={<Admin />}       />
              <Route path="/turma/:code"   element={<TurmaPage />}   />
              <Route path="/missoes"       element={<Missoes />}     />
              <Route path="/turmas"        element={<Turmas />}      />
              <Route path="/conquistas"    element={<Conquistas />}  />
              <Route path="/interview"          element={<AIInterview />}  />
              <Route path="/certificado/:slug"  element={<Certificate />}  />
              <Route path="/vagas"              element={<Vagas />}        />
              <Route path="/estagio"            element={<Estagio />}      />
              <Route path="/mensagens"          element={<Mensagens />}    />
              <Route path="/candidatos"         element={<Candidatos />}   />
              <Route path="/pipeline"           element={<Pipeline />}     />
              <Route path="/empresa/:id"        element={<EmpresaPage />}   />
              <Route path="/projeto/:slug/gerir" element={<ProjectManage />} />
              <Route path="*"                   element={<NotFound />}      />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
