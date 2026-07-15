import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { MessageSquare, User, X, ChevronRight, Briefcase } from 'lucide-react'

const C = {
  bg:     'var(--c-bg)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  blue:   '#1b78f7',
  muted:  'var(--c-muted)',
  text:   'var(--c-text)',
  subtle: 'var(--c-subtle)',
  glass: 'var(--c-glass)', glassBorder: 'var(--c-glass-border)',
}

const STAGES = [
  { id: 'novo',       label: 'Novo',        color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  { id: 'em_analise', label: 'Em análise',  color: '#1b78f7', bg: 'rgba(27,120,247,0.1)'  },
  { id: 'entrevista', label: 'Entrevista',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  { id: 'oferta',     label: 'Oferta',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  { id: 'aceite',     label: 'Aceite',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  { id: 'rejeitado',  label: 'Rejeitado',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
]

function Avatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initial = name[0].toUpperCase()
  const colors = ['#1b78f7','#8b5cf6','#0d9488','#f59e0b','#ec4899','#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (profile?.avatar_url) return (
    <img src={profile.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initial}
    </div>
  )
}

function CandidatoModal({ cand, vagas, onClose, onStageChange, navigate }) {
  const stage = STAGES.find(s => s.id === (cand.pipeline_stage || 'novo')) || STAGES[0]
  const vaga  = vagas.find(v => v.id === cand.vaga_id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="pipeline-modal" style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: '100%', maxWidth: 480, zIndex: 1, padding: 28, boxShadow: 'none' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}>
          <X size={16} />
        </button>

        {/* Candidate header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar profile={cand.profile} size={52} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text, letterSpacing: '-0.2px' }}>
              {cand.profile?.full_name || cand.profile?.username || 'Utilizador'}
            </div>
            {cand.profile?.username && <div style={{ fontSize: 12, color: C.muted }}>@{cand.profile.username}</div>}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: stage.color, background: stage.bg, borderRadius: 6, padding: '4px 10px' }}>
            {stage.label}
          </span>
        </div>

        {/* Vaga */}
        <div style={{ background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={14} color={C.muted} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Candidatou-se a</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{vaga?.title || 'Vaga'}</div>
          </div>
        </div>

        {/* Message */}
        {cand.message && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Mensagem de candidatura</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6, background: 'var(--c-bg-alt)', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
              {cand.message}
            </p>
          </div>
        )}

        {/* Stage picker */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Mover para fase</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STAGES.map(s => {
              const active = (cand.pipeline_stage || 'novo') === s.id
              return (
                <button key={s.id} onClick={() => onStageChange(cand.id, s.id)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? s.color : C.border}`, background: active ? s.bg : 'transparent', color: active ? s.color : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted } }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {cand.profile?.username && (
            <button onClick={() => { navigate(`/u/${cand.profile.username}`); onClose() }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 0', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <User size={14} /> Ver perfil
            </button>
          )}
          <button onClick={() => { navigate(`/mensagens?to=${cand.student_id}`); onClose() }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: C.blue, border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
            <MessageSquare size={14} /> Enviar mensagem
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const navigate  = useNavigate()
  const { user, profile } = useAuth()

  const [candidaturas, setCandidaturas] = useState([])
  const [vagas, setVagas]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [filterVaga, setFilterVaga]     = useState('all')

  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'

  useEffect(() => {
    if (!user) { navigate('/login'); return }
  }, [user])

  useEffect(() => {
    if (profile && !isRecruiter) { navigate('/dashboard'); return }
    if (user) loadData()
  }, [user, profile])

  async function loadData() {
    setLoading(true)

    const { data: vagasData } = await supabase
      .from('vagas')
      .select('id, title')
      .eq('recruiter_id', user.id)
      .order('created_at', { ascending: false })

    setVagas(vagasData ?? [])
    if (!vagasData?.length) { setLoading(false); return }

    const { data: cands } = await supabase
      .from('candidaturas')
      .select('*')
      .in('vaga_id', vagasData.map(v => v.id))
      .order('created_at', { ascending: false })

    if (!cands?.length) { setCandidaturas([]); setLoading(false); return }

    const studentIds = [...new Set(cands.map(c => c.student_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', studentIds)

    const profileMap = {}
    profs?.forEach(p => { profileMap[p.id] = p })

    setCandidaturas(cands.map(c => ({
      ...c,
      profile: profileMap[c.student_id],
      pipeline_stage: c.pipeline_stage || 'novo',
    })))
    setLoading(false)
  }

  async function updateStage(candId, stage) {
    const current = candidaturas.find(c => c.id === candId)
    const expectedStage = current?.pipeline_stage || 'novo'
    const { data, error } = await supabase
      .from('candidaturas')
      .update({ pipeline_stage: stage })
      .eq('id', candId)
      .eq('pipeline_stage', expectedStage)
      .select('id')
    if (error || !data?.length) {
      alert('Este candidato já foi movido por outra pessoa. A recarregar.')
      loadData()
      return
    }
    setCandidaturas(prev => prev.map(c => c.id === candId ? { ...c, pipeline_stage: stage } : c))
    setSelected(prev => prev?.id === candId ? { ...prev, pipeline_stage: stage } : prev)
  }

  const filtered = filterVaga === 'all' ? candidaturas : candidaturas.filter(c => c.vaga_id === filterVaga)

  const grouped = {}
  STAGES.forEach(s => { grouped[s.id] = [] })
  filtered.forEach(c => {
    const st = c.pipeline_stage || 'novo'
    if (grouped[st]) grouped[st].push(c)
  })

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <style>{`
        @media (max-width: 600px) {
          .pipeline-board { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .pipeline-col { min-width: 260px; }
          .pipeline-modal { padding: 20px 16px !important; }
        }
      `}</style>
      <Navbar />
      <div className="page-content" style={{ padding: 0 }}>
        <div style={{ padding: '28px clamp(8px,3vw,24px) 0' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ color: C.text, fontSize: 'clamp(22px,4vw,30px)', fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
                Pipeline
              </h1>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {candidaturas.length} candidatos · {vagas.length} vagas
              </p>
            </div>
            {vagas.length > 1 && (
              <select value={filterVaga} onChange={e => setFilterVaga(e.target.value)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, padding: '8px 12px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="all">Todas as vagas</option>
                {vagas.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            )}
          </div>

          {/* Empty state — no vagas */}
          {!loading && vagas.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gap: 12 }}>
              <Briefcase size={40} color={C.muted} style={{ opacity: 0.4 }} />
              <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>Ainda não tens vagas</p>
              <p style={{ color: C.subtle, fontSize: 13, margin: 0 }}>Cria uma vaga para começar a receber candidaturas</p>
              <button onClick={() => navigate('/vagas')}
                style={{ marginTop: 8, background: C.blue, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Gerir vagas
              </button>
            </div>
          )}

          {/* Empty state — has vagas but no candidates */}
          {!loading && vagas.length > 0 && candidaturas.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gap: 12 }}>
              <User size={40} color={C.muted} style={{ opacity: 0.4 }} />
              <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>Sem candidatos ainda</p>
              <p style={{ color: C.subtle, fontSize: 13, margin: 0 }}>As candidaturas às tuas vagas aparecem aqui</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--c-border)', borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Kanban board */}
          {!loading && candidaturas.length > 0 && (
            <div className="pipeline-board" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 32, alignItems: 'flex-start' }}>
              {STAGES.map(stage => (
                <div key={stage.id} className="pipeline-col" style={{ minWidth: 220, width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: stage.bg, borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: stage.color }}>
                      {grouped[stage.id].length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[stage.id].length === 0 && (
                      <div style={{ padding: '18px 12px', textAlign: 'center', border: `1.5px dashed ${C.border}`, borderRadius: 10, color: C.subtle, fontSize: 12 }}>
                        —
                      </div>
                    )}
                    {grouped[stage.id].map(c => {
                      const vaga = vagas.find(v => v.id === c.vaga_id)
                      return (
                        <button key={c.id} onClick={() => setSelected(c)}
                          style={{ width: '100%', background: C.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = stage.color; e.currentTarget.style.background = 'var(--c-glass-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.glassBorder; e.currentTarget.style.background = C.glass }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: vaga ? 8 : 0 }}>
                            <Avatar profile={c.profile} size={30} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.profile?.full_name || c.profile?.username || 'Utilizador'}
                              </div>
                              {c.profile?.username && (
                                <div style={{ fontSize: 11, color: C.muted }}>@{c.profile.username}</div>
                              )}
                            </div>
                            <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                          </div>
                          {vaga && (
                            <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--c-bg-alt)', padding: '4px 8px', borderRadius: 6 }}>
                              {vaga.title}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {selected && (
        <CandidatoModal
          cand={selected}
          vagas={vagas}
          onClose={() => setSelected(null)}
          onStageChange={updateStage}
          navigate={navigate}
        />
      )}
    </div>
  )
}
