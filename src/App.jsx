import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import NewProject from './pages/NewProject'
import ProjectPage from './pages/ProjectPage'
import EditProject from './pages/EditProject'
import Ranking from './pages/Ranking'
import Explore from './pages/Explore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SplashScreen from './components/SplashScreen'

// Animation timeline:
// 1.9s  — splash animation plays
// 1.0s  — hold at final state so the user can read it
// 0.65s — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1900 + 1800   // when to start fading (3700ms)
const UNMOUNT_MS = HOLD_MS + 700 // when to remove from DOM (4400ms)

export default function App() {
  const [splashVisible,  setSplashVisible]  = useState(true)
  const [splashMounted,  setSplashMounted]  = useState(true)

  useEffect(() => {
    const fadeTimer    = setTimeout(() => setSplashVisible(false), HOLD_MS)
    const unmountTimer = setTimeout(() => setSplashMounted(false), UNMOUNT_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(unmountTimer) }
  }, [])

  return (
    <AuthProvider>
      {splashMounted && <SplashScreen visible={splashVisible} />}
      <BrowserRouter>
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
