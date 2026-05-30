import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Star, Users, MessageSquare, Trash2, Search, Briefcase } from 'lucide-react'

const C = {
  bg:     'var(--c-bg)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  blue:   '#1b78f7',
  muted:  'var(--c-muted)',
  text:   'var(--c-text)',
  subtle: 'var(--c-subtle)',
  amber:  '#f59e0b',
  green:  '#22c55e',
}

function Avatar({ profile, size = 44 }) {
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

const ROLE_LABELS = {
  aluno:      { label: 'Aluno',      color: '#1b78f7' },
  professor:  { label: 'Professor',  color: '#10b981' },
  recrutador: { label: 'Recrutador', color: '#8b5cf6' },
  empresa:    { label: 'Empresa',    color: '#f59e0b' },
}

export default function Candidatos() {
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuth()
  const isRecruiter = myProfile?.role === 'recrutador' || myProfile?.role === 'empresa'

  const [saved, setSaved]     = useState([]) // { id, student_id, profile }
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!isRecruiter) { navigate('/explorar?tab=pessoas'); return }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('saved_candidates')
      .select('id, student_id, created_at')
      .eq('recruiter_id', user.id)
      .order('created_at', { ascending: false })

    if (!rows?.length) { setSaved([]); setLoading(false); return }

    const ids = rows.map(r => r.student_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, bio, role, available_for_work, company, company_role')
      .in('id', ids)

    const profMap = {}
    profiles?.forEach(p => { profMap[p.id] = p })

    setSaved(rows.map(r => ({ ...r, profile: profMap[r.student_id] ?? null })))
    setLoading(false)
  }

  async function remove(id, studentId) {
    setRemoving(studentId)
    await supabase.from('saved_candidates').delete().eq('id', id)
    setSaved(prev => prev.filter(s => s.id !== id))
    setRemoving(null)
  }

  const accentColor = myProfile?.role === 'empresa' ? C.amber : C.blue

  const filtered = saved.filter(s => {
    if (!search) return true
    const p = s.profile
    return (p?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
           (p?.username || '').toLowerCase().includes(search.toLowerCase()) ||
           (p?.bio || '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <style>{`
        @media (max-width: 360px) { .candidatos-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .candidatos-hd { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; } .candidatos-hd input { max-width: 100% !important; } }
      `}</style>
      <Navbar />
      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: C.text, fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Candidatos guardados
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            {saved.length} perfil{saved.length !== 1 ? 'is' : ''} guardado{saved.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        {saved.length > 0 && (
          <div className="candidatos-hd" style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
            <Search size={15} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar candidatos..."
              style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px 11px 40px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        )}

        {loading ? (
          <div className="candidatos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 140, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0' }}>
            <Star size={40} color={C.muted} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ color: C.muted, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
              {saved.length === 0 ? 'Ainda não guardaste nenhum candidato' : 'Sem resultados'}
            </p>
            <p style={{ color: C.subtle, fontSize: 13, margin: '0 0 20px' }}>
              {saved.length === 0 ? 'Pesquisa por candidatos e clica na estrela para os guardar' : 'Tenta outro termo de pesquisa'}
            </p>
            {saved.length === 0 && (
              <button onClick={() => navigate('/explorar?tab=pessoas')}
                style={{ background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Explorar candidatos
              </button>
            )}
          </div>
        ) : (
          <div className="candidatos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
            {filtered.map(s => {
              const p = s.profile
              if (!p) return null
              const roleInfo = ROLE_LABELS[p.role] ?? ROLE_LABELS.aluno
              return (
                <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <button onClick={() => navigate(p.username ? `/u/${p.username}` : `/u/${p.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                      <Avatar profile={p} size={44} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button onClick={() => navigate(p.username ? `/u/${p.username}` : `/u/${p.id}`)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block', width: '100%' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.full_name || p.username || 'Utilizador'}
                        </div>
                        {p.username && <div style={{ fontSize: 12, color: C.muted }}>@{p.username}</div>}
                      </button>
                    </div>
                    {/* Remove star */}
                    <button onClick={() => remove(s.id, p.id)} disabled={removing === p.id}
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: C.amber, display: 'flex', flexShrink: 0 }}
                      title="Remover dos guardados">
                      <Star size={14} fill={C.amber} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: roleInfo.color, background: `${roleInfo.color}18`, borderRadius: 6, padding: '2px 8px' }}>{roleInfo.label}</span>
                    {p.available_for_work && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: 'rgba(34,197,94,0.1)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Briefcase size={10} /> Disponível
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {p.bio && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.bio}</p>}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate(`/mensagens?to=${p.id}`)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`, border: 'none', borderRadius: 8, padding: '8px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <MessageSquare size={13} /> Mensagem
                    </button>
                    <button onClick={() => navigate(p.username ? `/u/${p.username}` : `/u/${p.id}`)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 0', color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Ver perfil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
