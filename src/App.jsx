import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle, X as XIcon } from 'lucide-react'
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

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--c-border)', borderTop: '2px solid #1b78f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Animation timeline:
// 1.9s  — splash animation plays
// 1.0s  — hold at final state so the user can read it
// 0.65s — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1900 + 1800   // when to start fading (3700ms)
const UNMOUNT_MS = HOLD_MS + 700 // when to remove from DOM (4400ms)

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
  const [splashVisible,  setSplashVisible]  = useState(true)
  const [splashMounted,  setSplashMounted]  = useState(true)

  useEffect(() => {
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
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
