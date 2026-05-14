import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import RestReminder from './components/RestReminder'
import Home from './pages/Home'
import NewProject from './pages/NewProject'
import ProjectPage from './pages/ProjectPage'
import EditProject from './pages/EditProject'
import Ranking from './pages/Ranking'
import Explore from './pages/Explore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import UserProfile from './pages/UserProfile'
import SplashScreen from './components/SplashScreen'

// Animation timeline:
// 1.9s  — splash animation plays
// 1.0s  — hold at final state so the user can read it
// 0.65s — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1900 + 1800   // when to start fading (3700ms)
const UNMOUNT_MS = HOLD_MS + 700 // when to remove from DOM (4400ms)

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
      background: '#1a0e0e', border: '1px solid rgba(248,113,113,0.35)',
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#fca5a5', lineHeight: 1.5 }}>{msg}</p>
      </div>
      <button
        onClick={() => setMsg('')}
        style={{ background: 'none', border: 'none', color: '#7d93b0', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}
      >✕</button>
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
      <AuthProvider>
        <AuthErrorBanner />
        {splashMounted && <SplashScreen visible={splashVisible} />}
        <RestReminder />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/"              element={<Home />}        />
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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  )
}
