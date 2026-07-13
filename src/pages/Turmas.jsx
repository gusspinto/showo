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
      className="turmas-card-actions"
      onClick={() => navigate(`/turma/${turma.code}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHover : C.card,
        border: `1px solid ${hov ? C.borderBright : C.border}`,
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 10, flexShrink: 0,
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

function JoinModal({ onClose, onJoin, navigate }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(null) // { turma, verified }
  const { user } = useAuth()

  async function handleJoin() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    // join_class both validates the code and registers membership
    // server-side — a direct client upsert into class_members isn't
    // reliable here since that table's INSERT policy was never captured in
    // a tracked migration.
    const { data: rows, error: err } = await supabase.rpc('join_class', { p_code: code.trim().toUpperCase() })
    const data = rows?.[0]

    if (err || !data) {
      // Surface the real error instead of always blaming the code — a
      // silent RPC/permission failure once looked identical to a typo.
      setError(err && err.message !== 'class_not_found' ? err.message : 'Turma não encontrada. Verifica o código.')
      setLoading(false)
      return
    }

    // join_class verifies the row itself (inside the same transaction) and
    // returns that result directly — a separate follow-up SELECT from a
    // fresh connection isn't reliable (read-after-write timing between two
    // independent requests, confirmed while debugging this).

    // Save to localStorage
    const lsKey = `showo_turmas_${user.id}`
    let cached = []
    try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}
    if (!cached.find(t => t.id === data.id)) {
      cached.push(data)
      localStorage.setItem(lsKey, JSON.stringify(cached))
    }

    setLoading(false)
    setJoined({ turma: data, verified: !!data.verified })
    onJoin(data)
  }

  if (joined) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="turmas-modal-content" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 28px 24px', width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: joined.verified ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${joined.verified ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={24} color={joined.verified ? '#22c55e' : '#fbbf24'} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>
            {joined.verified ? 'Entraste na turma!' : 'Pedido enviado'}
          </h3>
          <p style={{ margin: '0 0 22px', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            {joined.verified
              ? <>Já és membro de <strong style={{ color: C.text }}>{joined.turma.name}</strong> — confirmado.</>
              : <>A turma <strong style={{ color: C.text }}>{joined.turma.name}</strong> foi encontrada, mas não consegui confirmar o teu registo como membro. Tenta abrir a turma — se não apareceres na lista de alunos, avisa.</>}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fechar
            </button>
            <button onClick={() => { onClose(); navigate?.(`/turma/${joined.turma.code}`) }} style={{ flex: 1, background: C.blue, border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver turma
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="turmas-modal-content" style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: '28px 28px 24px',
        width: '100%', maxWidth: 420,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>Entrar numa turma</h3>
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
            borderRadius: 8, padding: '12px 14px',
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
            background: C.blue, border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !code.trim() ? 0.6 : 1,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
            boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
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
        <style>{`
          @media (max-width: 600px) {
            .turmas-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
            .turmas-modal-content { padding: 20px 16px !important; }
            .turmas-card-actions { flex-wrap: wrap !important; }
          }
        `}</style>

        {/* Header */}
        <div className="turmas-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: C.text, letterSpacing: '-1px', fontFamily: 'var(--font-heading)' }}>
              Turmas
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              {isTeacher ? 'Turmas que geres' : 'Turmas em que participas'}
            </p>
          </div>

          {!isTeacher && (
            <button
              onClick={() => setShowJoin(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.blue, border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 13, fontWeight: 700,
                padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
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
              <div key={i} style={{ height: 82, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : turmas.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
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
                  background: C.blue, border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
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

      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={handleJoined} navigate={navigate} />}
    </div>
  )
}
