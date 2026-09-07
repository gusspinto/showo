import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CreateTurmaModal from '../components/CreateTurmaModal'
import { Navbar } from '../components/Navbar'
import { UsersGroupTwoRoundedIcon as Users2 } from '@solar-icons/react/bold/users-group-two-rounded'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { FolderIcon as Folder } from '@solar-icons/react/bold/folder'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

const C = {
  bg: 'var(--color-bg)',
  bgAlt: 'var(--color-bg-alt)',
  card: 'var(--color-surface)',
  cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  blue: 'var(--color-primary)',
  green: 'var(--color-success)',
  yellow: 'var(--color-warning)',
  red: 'var(--color-error)',
  glass: 'var(--color-glass)',
  glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)',
  glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

function TurmaCard({ turma }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const nameRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {turma.name}
      </div>
      {turma.academic_year && (
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.muted, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 6px' }}>{turma.academic_year}</span>
      )}
    </div>
  )

  return (
    <div
      className="turmas-card-actions"
      onClick={() => navigate(`/turma/${turma.code}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...C.glassStyle,
        background: hov ? C.glassHover : C.glass,
        border: `1px solid ${hov ? C.glassBorderBright : C.glassBorder}`,
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
        background: 'var(--color-primary-subtle)',
        border: '1px solid var(--color-primary-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users2 size={20} color="var(--color-primary)" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 3 }}>{nameRow}</div>
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
            background: joined.verified ? 'var(--color-success-subtle)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${joined.verified ? 'var(--color-success-subtle)' : 'rgba(251,191,36,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={24} color={joined.verified ? 'var(--color-success)' : 'var(--color-warning)'} />
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
          <button onClick={onClose} className="icon-btn-ghost">
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
            background: C.bg, border: `1px solid ${error ? 'var(--color-error)' : C.border}`,
            borderRadius: 8, padding: '12px 14px',
            fontSize: 18, fontWeight: 700, letterSpacing: '0.1em',
            color: C.text, outline: 'none', textAlign: 'center',
            fontFamily: 'inherit', marginBottom: error ? 8 : 20,
          }}
        />

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 12, margin: '0 0 16px', textAlign: 'center' }}>{error}</p>
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
            boxShadow: '0 2px 8px var(--color-primary-subtle)',
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
  const [showCreate, setShowCreate] = useState(false)
  const [yearFilter, setYearFilter] = useState('all')
  const isTeacher = profile?.role === 'professor'

  const isSchoolStudent = profile?.role === 'aluno' && profile?.account_type === 'school'

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    // Teachers and school-account students can access this page. Dois
    // sinais de "conta de escola" coexistem: organization_id (mais antigo,
    // usado em todo o resto da app) e account_type==='school' (novo, do
    // registo institucional). Sem confirmar que o registo novo também
    // preenche organization_id, o seguro é aceitar qualquer um dos dois.
    if (profile && !isTeacher && !profile?.organization_id && !isSchoolStudent) { navigate('/dashboard'); return }

    async function load() {
      if (isTeacher) {
        const { data } = await supabase
          .from('classes')
          .select('id, name, code, teacher_name, academic_year, created_at')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
        setTurmas(data || [])
      } else {
        const lsKey = `showo_turmas_${user.id}`
        let cached = []
        try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}

        const classIdSet = new Set()

        const { data: memberships } = await supabase.from('class_members').select('class_id').eq('user_id', user.id)
        if (memberships?.length) memberships.forEach(m => classIdSet.add(m.class_id))

        const { data: myProjs } = await supabase.from('projects').select('id').eq('user_id', user.id)
        if (myProjs?.length) {
          const { data: cp } = await supabase.from('class_projects').select('class_id').in('project_id', myProjs.map(p => p.id))
          if (cp?.length) cp.forEach(r => classIdSet.add(r.class_id))
        }

        let dbTurmas = []
        if (classIdSet.size > 0) {
          const { data: classes } = await supabase.from('classes').select('id, name, code, teacher_name, academic_year').in('id', [...classIdSet])
          dbTurmas = classes || []
        }
        const dbIds = new Set(dbTurmas.map(t => t.id))
        setTurmas([...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))])
      }
      setLoading(false)
    }

    load()
  }, [user, profile, isTeacher])

  function handleJoined(turma) {
    setTurmas(prev => {
      if (prev.find(t => t.id === turma.id)) return prev
      return [turma, ...prev]
    })
    setShowJoin(false)
  }

  function handleCreated(turma) {
    setTurmas(prev => [turma, ...prev])
    setShowCreate(false)
    navigate(`/turma/${turma.code}`)
  }

  if (!user || (profile && !isTeacher && !profile?.organization_id && !isSchoolStudent)) return null

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

          <button
            onClick={() => (isTeacher ? setShowCreate(true) : setShowJoin(true))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.blue, border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 700,
              padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 8px var(--color-primary-subtle)',
            }}
          >
            <Plus size={15} />
            {isTeacher ? 'Nova turma' : 'Entrar numa turma'}
          </button>
        </div>

        {/* Ano letivo filter */}
        {!loading && (() => {
          const years = [...new Set(turmas.map(t => t.academic_year).filter(Boolean))].sort().reverse()
          if (years.length < 2) return null
          return (
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              {['all', ...years].map(y => (
                <button
                  key={y}
                  onClick={() => setYearFilter(y)}
                  style={{
                    background: yearFilter === y ? 'var(--color-primary-subtle)' : 'transparent',
                    border: `1px solid ${yearFilter === y ? 'var(--color-primary-subtle)' : C.border}`,
                    borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                    color: yearFilter === y ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {y === 'all' ? 'Todos os anos' : y}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 82, borderRadius: 12, background: C.glass, border: `1px solid ${C.glassBorder}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : turmas.length === 0 ? (
          <div style={{
            ...C.glassStyle,
            background: C.glass, border: `1px solid ${C.glassBorder}`,
            borderRadius: 12, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
              background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users2 size={26} color="var(--color-primary)" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: C.text }}>
              {isTeacher ? 'Ainda não criaste turmas' : 'Ainda não estás em nenhuma turma'}
            </p>
            {isTeacher ? (
              <>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>
                  Cria uma turma e partilha o código de 6 letras com os teus alunos.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: C.blue, border: 'none', borderRadius: 8,
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    padding: '11px 22px', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 2px 8px var(--color-primary-subtle)',
                  }}
                >
                  <Plus size={15} /> Nova turma
                </button>
              </>
            ) : (
              <>
                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '18px auto 20px', textAlign: 'left' }}>
                  {[
                    { n: 1, text: 'Pede o código de 6 letras ao teu professor' },
                    { n: 2, text: 'Insere-o aqui e junta-te à turma' },
                  ].map(s => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.blue }}>
                        {s.n}
                      </div>
                      <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{s.text}</span>
                    </div>
                  ))}
                </div>

                {/* Code preview boxes */}
                <div
                  onClick={() => setShowJoin(true)}
                  style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22, cursor: 'pointer' }}
                >
                  {'XXXXXX'.split('').map((ch, i) => (
                    <div key={i} style={{
                      width: 38, height: 44, borderRadius: 9,
                      background: C.bgAlt, border: `1.5px dashed ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, fontWeight: 800, color: C.subtle,
                      fontFamily: 'var(--font-heading)',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}>
                      {ch}
                    </div>
                  ))}
                </div>
              </>
            )}
            {!isTeacher && (
              <button
                onClick={() => setShowJoin(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: C.blue, border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  padding: '11px 22px', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px var(--color-primary-subtle)',
                }}
              >
                Tenho um código
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {turmas
              .filter(t => yearFilter === 'all' || t.academic_year === yearFilter)
              .map(t => (
                <TurmaCard key={t.id} turma={t} />
              ))}
          </div>
        )}
      </div>

      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={handleJoined} navigate={navigate} />}
      {showCreate && <CreateTurmaModal user={user} profile={profile} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  )
}
