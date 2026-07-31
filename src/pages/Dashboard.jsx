import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'
import './Dashboard.css'

export default function Dashboard() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAdmin) navigate('/admin', { replace: true })
  }, [authLoading, isAdmin, navigate])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  if (authLoading || !user || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <Navbar />
        <div className="dash-accent-line" />
        <div className="page-content dash-skel-page">
          <div className="skel skel-line" style={{ height: 48, width: '60%', marginBottom: 24 }} />
          <div className="skel skel-line" style={{ height: 16, width: '30%', marginBottom: 40 }} />
          <div className="dash-col-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skel skel-card" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="dash-row-3" style={{ padding: '14px 16px' }}>
                  <div className="skel skel-block" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }} />
                  <div style={{ flex: 1 }} className="dash-col-2">
                    <div className="skel skel-line" style={{ height: 12, width: '40%' }} />
                    <div className="skel skel-line" style={{ height: 10, width: '65%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isAdmin) return null
  if (profile.role === 'professor') return <TeacherDashboard user={user} profile={profile} />
  return <StudentDashboard user={user} profile={profile} />
}
