import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Briefcase, MapPin, Globe, Plus, X, Check, Clock, Building2, ChevronRight, Pencil, Trash2, ExternalLink } from 'lucide-react'

const C = {
  bg:     'var(--c-bg)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  blue:   '#1b78f7',
  muted:  'var(--c-muted)',
  text:   'var(--c-text)',
  subtle: 'var(--c-subtle)',
  green:  '#22c55e',
  red:    '#ef4444',
  amber:  '#f59e0b',
  purple: '#8b5cf6',
}

const TIPO_INFO = {
  estagio:   { label: 'Estágio',       color: C.blue,   bg: 'rgba(27,120,247,0.1)'  },
  part_time: { label: 'Part-time',     color: C.purple, bg: 'rgba(139,92,246,0.1)'  },
  full_time: { label: 'Full-time',     color: C.green,  bg: 'rgba(34,197,94,0.1)'   },
  freelance: { label: 'Freelance',     color: C.amber,  bg: 'rgba(245,158,11,0.1)'  },
}

function daysDiff(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return null
  const days = daysDiff(deadline)
  const expired = days < 0
  const urgent = days >= 0 && days <= 5
  const color = expired ? C.red : urgent ? C.amber : C.muted
  const label = expired ? 'Expirado' : days === 0 ? 'Último dia' : `${days}d restantes`
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Clock size={11} /> {label}
    </span>
  )
}

function RecruiterCard({ vaga, onEdit, onToggle, onDelete }) {
  const tipo = TIPO_INFO[vaga.tipo] ?? TIPO_INFO.estagio
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tipo.color, background: tipo.bg, borderRadius: 6, padding: '2px 8px' }}>{tipo.label}</span>
            {!vaga.is_active && <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: 'rgba(128,128,128,0.1)', borderRadius: 6, padding: '2px 8px' }}>Pausada</span>}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{vaga.titulo}</h3>
          {vaga.area && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>{vaga.area}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onEdit(vaga)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }} title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={() => onToggle(vaga)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: vaga.is_active ? C.amber : C.green, display: 'flex', alignItems: 'center' }} title={vaga.is_active ? 'Pausar' : 'Ativar'}>
            {vaga.is_active ? <X size={13} /> : <Check size={13} />}
          </button>
          <button onClick={() => onDelete(vaga.id)} style={{ background: 'transparent', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center' }} title="Apagar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {vaga.localizacao && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{vaga.localizacao}</span>}
        {vaga.is_remote && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />Remoto</span>}
        <DeadlineBadge deadline={vaga.deadline} />
      </div>
      {vaga.descricao && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{vaga.descricao}</p>}
    </div>
  )
}

function PublicCard({ vaga, recruiterProfile }) {
  const navigate = useNavigate()
  const tipo = TIPO_INFO[vaga.tipo] ?? TIPO_INFO.estagio
  const days = daysDiff(vaga.deadline)
  if (vaga.deadline && days < 0) return null // hide expired

  return (
    <div
      onClick={() => recruiterProfile?.username && navigate(`/u/${recruiterProfile.username}`)}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', cursor: recruiterProfile?.username ? 'pointer' : 'default', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', gap: 12 }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-bright)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      {/* Company header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${tipo.color}22`, border: `1px solid ${tipo.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Building2 size={16} color={tipo.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recruiterProfile?.company || recruiterProfile?.full_name || 'Empresa'}
          </div>
          {recruiterProfile?.company_role && <div style={{ fontSize: 11, color: C.muted }}>{recruiterProfile.company_role}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: tipo.color, background: tipo.bg, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>{tipo.label}</span>
      </div>

      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>{vaga.titulo}</h3>
        {vaga.area && <p style={{ margin: 0, fontSize: 13, color: C.blue, fontWeight: 600 }}>{vaga.area}</p>}
      </div>

      {vaga.descricao && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{vaga.descricao}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {vaga.localizacao && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{vaga.localizacao}</span>}
          {vaga.is_remote && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={11} />Remoto</span>}
          <DeadlineBadge deadline={vaga.deadline} />
        </div>
        {recruiterProfile?.username && (
          <span style={{ fontSize: 12, color: C.blue, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
            Ver empresa <ChevronRight size={12} />
          </span>
        )}
      </div>
    </div>
  )
}

const EMPTY_FORM = { titulo: '', tipo: 'estagio', area: '', descricao: '', requisitos: '', localizacao: '', is_remote: false, deadline: '' }

function VagaModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{initial ? 'Editar vaga' : 'Publicar vaga'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        {[
          { label: 'Título*', key: 'titulo', placeholder: 'Ex: Estágio em Desenvolvimento Web' },
          { label: 'Área', key: 'area', placeholder: 'Ex: Tecnologia, Design, Marketing...' },
          { label: 'Localização', key: 'localizacao', placeholder: 'Ex: Lisboa, Porto...' },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</label>
            <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
              style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
              {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Candidaturas até</label>
            <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
              style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Remote toggle */}
        <div style={{ marginBottom: 16 }}>
          <button type="button" onClick={() => set('is_remote', !form.is_remote)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: form.is_remote ? 'rgba(27,120,247,0.07)' : 'transparent', border: `1.5px solid ${form.is_remote ? 'rgba(27,120,247,0.3)' : C.border}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: form.is_remote ? C.blue : 'var(--c-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: form.is_remote ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: form.is_remote ? C.blue : C.text }}>Permite trabalho remoto</span>
          </button>
        </div>

        {[
          { label: 'Descrição', key: 'descricao', placeholder: 'Descreve a vaga, o projeto, o ambiente de trabalho...' },
          { label: 'Requisitos', key: 'requisitos', placeholder: 'Ex: Conhecimentos de React, interesse em startups...' },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</label>
            <textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3}
              style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', minHeight: 80 }} />
          </div>
        ))}

        <button onClick={() => onSave(form)} disabled={saving || !form.titulo.trim()}
          style={{ width: '100%', background: saving || !form.titulo.trim() ? C.border : `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '13px 0', color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving || !form.titulo.trim() ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 16px rgba(27,120,247,0.3)' }}>
          {saving ? 'A guardar...' : initial ? 'Guardar alterações' : 'Publicar vaga'}
        </button>
      </div>
    </div>
  )
}

export default function Vagas() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'

  const [vagas, setVagas] = useState([])
  const [myVagas, setMyVagas] = useState([])
  const [profiles, setProfiles] = useState({}) // recruiter_id → profile
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editVaga, setEditVaga] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(isRecruiter ? 'minhas' : 'todas')

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    // All active vagas
    const { data: all } = await supabase
      .from('vagas')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (all?.length) {
      // Fetch recruiter profiles
      const ids = [...new Set(all.map(v => v.recruiter_id))]
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, username, company, company_role, avatar_url, company_website, linkedin_url')
        .in('id', ids)
      const profMap = {}
      profs?.forEach(p => { profMap[p.id] = p })
      setProfiles(profMap)
      setVagas(all)
    } else {
      setVagas([])
    }

    // My vagas (includes inactive)
    if (user && isRecruiter) {
      const { data: mine } = await supabase
        .from('vagas')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false })
      setMyVagas(mine ?? [])
    }

    setLoading(false)
  }

  async function saveVaga(form) {
    if (!user) return
    setSaving(true)
    const payload = {
      ...form,
      recruiter_id: user.id,
      deadline: form.deadline || null,
    }
    if (editVaga) {
      await supabase.from('vagas').update(payload).eq('id', editVaga.id)
    } else {
      await supabase.from('vagas').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    setEditVaga(null)
    load()
  }

  async function toggleVaga(vaga) {
    await supabase.from('vagas').update({ is_active: !vaga.is_active }).eq('id', vaga.id)
    load()
  }

  async function deleteVaga(id) {
    if (!confirm('Tens a certeza que queres apagar esta vaga?')) return
    await supabase.from('vagas').delete().eq('id', id)
    load()
  }

  const accentColor = profile?.role === 'empresa' ? '#f59e0b' : C.blue

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Vagas</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              {isRecruiter ? 'Gere as tuas ofertas e encontra candidatos' : 'Ofertas de estágio e emprego de empresas e recrutadores'}
            </p>
          </div>
          {isRecruiter && (
            <button onClick={() => { setEditVaga(null); setShowModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '11px 20px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${accentColor}55`, flexShrink: 0 }}>
              <Plus size={16} /> Nova vaga
            </button>
          )}
        </div>

        {/* Tabs */}
        {isRecruiter && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--c-card)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 5, width: 'fit-content' }}>
            {[
              { id: 'minhas', label: `As minhas (${myVagas.length})` },
              { id: 'todas',  label: 'Todas as vagas' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', background: activeTab === t.id ? accentColor : 'transparent', color: activeTab === t.id ? '#fff' : C.muted, transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, height: 160, opacity: 0.5 }} />
            ))}
          </div>
        ) : isRecruiter && activeTab === 'minhas' ? (
          myVagas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Briefcase size={40} color={C.muted} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ color: C.muted, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Ainda não tens vagas publicadas</p>
              <p style={{ color: C.subtle, fontSize: 13, margin: '0 0 20px' }}>Publica a tua primeira oferta e começa a receber candidatos</p>
              <button onClick={() => setShowModal(true)}
                style={{ background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Publicar primeira vaga
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myVagas.map(v => (
                <RecruiterCard key={v.id} vaga={v}
                  onEdit={v => { setEditVaga(v); setShowModal(true) }}
                  onToggle={toggleVaga}
                  onDelete={deleteVaga}
                />
              ))}
            </div>
          )
        ) : vagas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Briefcase size={40} color={C.muted} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ color: C.muted, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Sem vagas de momento</p>
            <p style={{ color: C.subtle, fontSize: 13, margin: 0 }}>Quando empresas publicarem ofertas aparecem aqui</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {vagas.map(v => (
              <PublicCard key={v.id} vaga={v} recruiterProfile={profiles[v.recruiter_id]} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <VagaModal
          initial={editVaga ? { titulo: editVaga.titulo, tipo: editVaga.tipo, area: editVaga.area ?? '', descricao: editVaga.descricao ?? '', requisitos: editVaga.requisitos ?? '', localizacao: editVaga.localizacao ?? '', is_remote: editVaga.is_remote ?? false, deadline: editVaga.deadline ?? '' } : undefined}
          onSave={saveVaga}
          onClose={() => { setShowModal(false); setEditVaga(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}
