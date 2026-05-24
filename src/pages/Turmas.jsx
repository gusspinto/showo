import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import {
  Users2, Plus, ChevronRight, Search, Copy, Check,
  BookOpen, Folder, ArrowRight, X,
} from 'lucide-react'

const C = {
  bg: 'var(--c-bg)',
  bgAlt: 'var(--c-bg-alt)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  blue: '#1b78f7',
  green: '#22c55e',
  yellow: '#fbbf24',
  red: '#ef4444',
}

function TurmaCard({ turma }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={() => navigate(`/turma/${turma.code}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHover : C.card,
        border: `1px solid ${hov ? C.borderBright : C.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.18s',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 28px rgba(0,0,0,0.3)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: 'rgba(27,120,247,0.12)',
        border: '1px solid rgba(27,120,247,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users2 size={20} color="#1b78f7" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {turma.name}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {turma.teacher_name ? `Prof. ${turma.teacher_name}` : 'Professor não atribuído'}
          {turma.code && (
            <span style={{
              marginLeft: 8,
              background: C.bgAlt, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: '1px 6px',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: C.subtle,
            }}>
              {turma.code}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} color={C.subtle} />
    </div>
  )
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  async function handleJoin() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('classes')
      .select('id, name, code, teacher_name')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (err || !data) {
      setError('Turma não encontrada. Verifica o código.')
      setLoading(false)
      return
    }

    // Save to localStorage
    const lsKey = `showo_turmas_${user.id}`
    let cached = []
    try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}
    if (!cached.find(t => t.id === data.id)) {
      cached.push(data)
      localStorage.setItem(lsKey, JSON.stringify(cached))
    }

    setLoading(false)
    onJoin(data)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: '28px 28px 24px',
        width: '100%', maxWidth: 420,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: C.text }}>Entrar numa turma</h3>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Introduz o código fornecido pelo professor</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="ex: ABC123"
          maxLength={8}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.bg, border: `1px solid ${error ? '#ef4444' : C.border}`,
            borderRadius: 10, padding: '12px 14px',
            fontSize: 18, fontWeight: 700, letterSpacing: '0.1em',
            color: C.text, outline: 'none', textAlign: 'center',
            fontFamily: 'inherit', marginBottom: error ? 8 : 20,
          }}
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          style={{
            width: '100%', padding: '12px',
            background: C.blue, border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !code.trim() ? 0.6 : 1,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'A verificar…' : 'Entrar na turma'}
        </button>
      </div>
    </div>
  )
}

export default function Turmas() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showJoin, setShowJoin] = useState(false)
  const isTeacher = profile?.role === 'professor'

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    async function load() {
      if (isTeacher) {
        // Teachers see classes they created
        const { data } = await supabase
          .from('classes')
          .select('id, name, code, teacher_name, created_at')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
        setTurmas(data || [])
      } else {
        // Students: localStorage + DB via project linkage
        const lsKey = `showo_turmas_${user.id}`
        let cached = []
        try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}

        const { data: myProjs } = await supabase.from('projects').select('id').eq('user_id', user.id)
        let dbTurmas = []
        if (myProjs?.length) {
          const { data: cp } = await supabase.from('class_projects').select('class_id').in('project_id', myProjs.map(p => p.id))
          if (cp?.length) {
            const classIds = [...new Set(cp.map(r => r.class_id))]
            const { data: classes } = await supabase.from('classes').select('id, name, code, teacher_name').in('id', classIds)
            dbTurmas = classes || []
          }
        }
        const dbIds = new Set(dbTurmas.map(t => t.id))
        setTurmas([...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))])
      }
      setLoading(false)
    }

    load()
  }, [user, isTeacher])

  function handleJoined(turma) {
    setTurmas(prev => {
      if (prev.find(t => t.id === turma.id)) return prev
      return [turma, ...prev]
    })
    setShowJoin(false)
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users2 size={24} color="#1b78f7" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>
                Turmas
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
                {isTeacher ? 'Turmas que geres' : 'Turmas em que participas'}
              </p>
            </div>
          </div>

          {!isTeacher && (
            <button
              onClick={() => setShowJoin(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.blue, border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 13, fontWeight: 700,
                padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={15} />
              Entrar numa turma
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 82, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : turmas.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users2 size={26} color="#1b78f7" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: C.text }}>
              {isTeacher ? 'Ainda não criaste turmas' : 'Ainda não estás em nenhuma turma'}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>
              {isTeacher
                ? 'Cria uma turma na tua área de professor.'
                : 'Pede o código da turma ao teu professor.'}
            </p>
            {!isTeacher && (
              <button
                onClick={() => setShowJoin(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: C.blue, border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Plus size={15} />
                Entrar numa turma
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {turmas.map(t => (
              <TurmaCard key={t.id} turma={t} />
            ))}
          </div>
        )}
      </div>

      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={handleJoined} />}
    </div>
  )
}
