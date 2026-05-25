import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Briefcase, MapPin, Globe, Plus, X, Check, Clock, Building2, ChevronRight, Pencil, Trash2, ExternalLink, Send, Users, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import SkillsPicker from '../components/SkillsPicker'

// % de compatibilidade: skills do aluno vs skills requeridas pela vaga
function matchScore(studentSkills, vagaSkills) {
  if (!vagaSkills?.length || !studentSkills?.length) return null
  const student = new Set((studentSkills).map(s => s.toLowerCase().trim()))
  const matches = vagaSkills.filter(s => student.has(s.toLowerCase().trim())).length
  return Math.round((matches / vagaSkills.length) * 100)
}

function MatchBadge({ score }) {
  if (score === null) return null
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#7d93b0'
  const bg    = score >= 70 ? 'rgba(34,197,94,0.1)' : score >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(125,147,176,0.1)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
      <Zap size={10} />{score}% match
    </span>
  )
}

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

function RecruiterCard({ vaga, cands, onEdit, onToggle, onDelete, expanded, onToggleExpand, onStatusChange, navigate }) {
  const tipo = TIPO_INFO[vaga.tipo] ?? TIPO_INFO.estagio
  const candList = cands || []
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <button onClick={() => onEdit(vaga)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }} title="Editar"><Pencil size={13} /></button>
            <button onClick={() => onToggle(vaga)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: vaga.is_active ? C.amber : C.green, display: 'flex', alignItems: 'center' }} title={vaga.is_active ? 'Pausar' : 'Ativar'}>
              {vaga.is_active ? <X size={13} /> : <Check size={13} />}
            </button>
            <button onClick={() => onDelete(vaga.id)} style={{ background: 'transparent', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center' }} title="Apagar"><Trash2 size={13} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {vaga.localizacao && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{vaga.localizacao}</span>}
            {vaga.is_remote && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} />Remoto</span>}
            <DeadlineBadge deadline={vaga.deadline} />
          </div>
          <button onClick={onToggleExpand}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: candList.length > 0 ? 'rgba(27,120,247,0.08)' : 'transparent', border: `1px solid ${candList.length > 0 ? 'rgba(27,120,247,0.2)' : C.border}`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer', color: candList.length > 0 ? C.blue : C.muted, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            <Users size={12} /> {candList.length} candidatura{candList.length !== 1 ? 's' : ''}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Candidaturas list */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, background: 'var(--c-bg-alt)' }}>
          {candList.length === 0 ? (
            <p style={{ margin: 0, padding: '16px 20px', fontSize: 13, color: C.muted, textAlign: 'center' }}>Ainda não há candidaturas</p>
          ) : candList.map(c => {
            const p = c.profiles
            const st = STATUS_INFO[c.status] ?? STATUS_INFO.pendente
            return (
              <div key={c.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1b78f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(p?.full_name || p?.username || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p?.full_name || p?.username || 'Candidato'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 5, padding: '1px 7px' }}>{st.label}</span>
                    <MatchBadge score={matchScore(p?.skills, vaga.skills)} />
                  </div>
                  {c.message && <p style={{ margin: '0 0 8px', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{c.message}</p>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(p?.username ? `/u/${p.username}` : `/u/${p?.id}`)}
                      style={{ fontSize: 12, fontWeight: 600, color: C.blue, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Ver perfil</button>
                    <button onClick={() => navigate(`/mensagens?to=${p?.id}`)}
                      style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Mensagem</button>
                    {c.status === 'pendente' && <>
                      <button onClick={() => onStatusChange(c.id, vaga.id, 'aceite')}
                        style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Aceitar</button>
                      <button onClick={() => onStatusChange(c.id, vaga.id, 'recusada')}
                        style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Recusar</button>
                    </>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PublicCard({ vaga, recruiterProfile, myStatus, onCandidatar, isAluno, userSkills }) {
  const navigate = useNavigate()
  const tipo = TIPO_INFO[vaga.tipo] ?? TIPO_INFO.estagio
  const days = daysDiff(vaga.deadline)
  if (vaga.deadline && days < 0) return null

  const st = myStatus ? STATUS_INFO[myStatus] : null
  const score = matchScore(userSkills, vaga.skills)

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', gap: 12 }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-bright)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: tipo.color, background: tipo.bg, borderRadius: 6, padding: '2px 8px' }}>{tipo.label}</span>
          {score !== null && <MatchBadge score={score} />}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>{vaga.titulo}</h3>
        {vaga.area && <p style={{ margin: 0, fontSize: 13, color: C.blue, fontWeight: 600 }}>{vaga.area}</p>}
      </div>

      {vaga.descricao && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{vaga.descricao}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {vaga.localizacao && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{vaga.localizacao}</span>}
          {vaga.is_remote && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={11} />Remoto</span>}
          <DeadlineBadge deadline={vaga.deadline} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {recruiterProfile?.username && (
            <button onClick={() => navigate(`/u/${recruiterProfile.username}`)}
              style={{ fontSize: 12, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver empresa <ChevronRight size={11} />
            </button>
          )}
          {isAluno && (
            st ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={11} /> {st.label}
              </span>
            ) : (
              <button onClick={() => onCandidatar(vaga)}
                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(27,120,247,0.3)' }}>
                <Send size={11} /> Candidatar
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = { titulo: '', tipo: 'estagio', area: '', descricao: '', requisitos: '', localizacao: '', is_remote: false, deadline: '', skills: [] }

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
          { label: 'Requisitos (texto livre)', key: 'requisitos', placeholder: 'Ex: Conhecimentos de React, interesse em startups...' },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</label>
            <textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3}
              style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', minHeight: 80 }} />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <SkillsPicker
            label="Skills requeridas (para matching automático)"
            value={form.skills ?? []}
            onChange={v => set('skills', v)}
            max={15}
          />
        </div>

        <button onClick={() => onSave(form)} disabled={saving || !form.titulo.trim()}
          style={{ width: '100%', background: saving || !form.titulo.trim() ? C.border : `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '13px 0', color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving || !form.titulo.trim() ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 16px rgba(27,120,247,0.3)' }}>
          {saving ? 'A guardar...' : initial ? 'Guardar alterações' : 'Publicar vaga'}
        </button>
      </div>
    </div>
  )
}

const STATUS_INFO = {
  pendente:  { label: 'Pendente',  color: '#7d93b0', bg: 'rgba(125,147,176,0.1)' },
  vista:     { label: 'Vista',     color: '#1b78f7', bg: 'rgba(27,120,247,0.1)'  },
  aceite:    { label: 'Aceite',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  recusada:  { label: 'Recusada',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
}

function CandidatarModal({ vaga, recruiterProfile, onClose, onSubmit, sending }) {
  const [msg, setMsg] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 460, zIndex: 1 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: C.text }}>Candidatar a esta vaga</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>{vaga.titulo} · {recruiterProfile?.company || recruiterProfile?.full_name}</p>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>Mensagem de apresentação</label>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
          placeholder="Apresenta-te brevemente e explica porque és uma boa escolha para esta vaga..."
          style={{ width: '100%', background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', minHeight: 110 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 0', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={() => onSubmit(msg)} disabled={sending}
            style={{ flex: 1, background: sending ? C.border : `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {sending ? 'A enviar...' : <><Send size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Candidatar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Vagas() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const isAluno = profile?.role === 'aluno'

  const [vagas, setVagas] = useState([])
  const [myVagas, setMyVagas] = useState([])
  const [profiles, setProfiles] = useState({}) // recruiter_id → profile
  const [candidaturas, setCandidaturas] = useState({}) // vaga_id → [candidatura]
  const [myCandidaturas, setMyCandidaturas] = useState({}) // vaga_id → candidatura (for students)
  const [expandedVaga, setExpandedVaga] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editVaga, setEditVaga] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(isRecruiter ? 'minhas' : 'todas')
  const [candidatarVaga, setCandidatarVaga] = useState(null)
  const [sendingCandidatura, setSendingCandidatura] = useState(false)

  useEffect(() => { load() }, [user, profile])

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

    // My vagas (includes inactive) + their candidaturas
    if (user && isRecruiter) {
      const { data: mine } = await supabase
        .from('vagas')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false })
      setMyVagas(mine ?? [])

      // Load candidaturas for each vaga
      if (mine?.length) {
        const vagaIds = mine.map(v => v.id)
        const { data: cands } = await supabase
          .from('candidaturas')
          .select('*, profiles:student_id(id, full_name, username, avatar_url, bio, available_for_work, skills)')
          .in('vaga_id', vagaIds)
          .order('created_at', { ascending: false })
        const map = {}
        cands?.forEach(c => { if (!map[c.vaga_id]) map[c.vaga_id] = []; map[c.vaga_id].push(c) })
        setCandidaturas(map)
      }
    }

    // Student: load their own candidaturas
    if (user && isAluno) {
      const { data: mine } = await supabase
        .from('candidaturas')
        .select('vaga_id, status')
        .eq('student_id', user.id)
      const map = {}
      mine?.forEach(c => { map[c.vaga_id] = c })
      setMyCandidaturas(map)
    }

    setLoading(false)
  }

  async function submitCandidatura(msg) {
    if (!user || !candidatarVaga) return
    setSendingCandidatura(true)
    await supabase.from('candidaturas').upsert({
      vaga_id: candidatarVaga.id,
      student_id: user.id,
      message: msg.trim() || null,
      status: 'pendente',
    }, { onConflict: 'vaga_id,student_id' })
    setMyCandidaturas(prev => ({ ...prev, [candidatarVaga.id]: { status: 'pendente' } }))
    setSendingCandidatura(false)
    setCandidatarVaga(null)
  }

  async function updateCandidaturaStatus(candidaturaId, vagaId, status) {
    await supabase.from('candidaturas').update({ status }).eq('id', candidaturaId)
    setCandidaturas(prev => ({
      ...prev,
      [vagaId]: (prev[vagaId] || []).map(c => c.id === candidaturaId ? { ...c, status } : c)
    }))
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
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Briefcase size={24} color="#1b78f7" />
            </div>
            <div>
              <h1 style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Vagas</h1>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {isRecruiter ? 'Gere as tuas ofertas e encontra candidatos' : 'Ofertas de estágio e emprego de empresas e recrutadores'}
              </p>
            </div>
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
                  cands={candidaturas[v.id]}
                  expanded={expandedVaga === v.id}
                  onToggleExpand={() => setExpandedVaga(prev => prev === v.id ? null : v.id)}
                  onEdit={v => { setEditVaga(v); setShowModal(true) }}
                  onToggle={toggleVaga}
                  onDelete={deleteVaga}
                  onStatusChange={updateCandidaturaStatus}
                  navigate={navigate}
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
              <PublicCard key={v.id} vaga={v} recruiterProfile={profiles[v.recruiter_id]}
                myStatus={myCandidaturas[v.id]?.status}
                isAluno={isAluno}
                onCandidatar={setCandidatarVaga}
                userSkills={profile?.skills}
              />
            ))}
          </div>
        )}
      </div>

      {candidatarVaga && (
        <CandidatarModal
          vaga={candidatarVaga}
          recruiterProfile={profiles[candidatarVaga.recruiter_id]}
          onClose={() => setCandidatarVaga(null)}
          onSubmit={submitCandidatura}
          sending={sendingCandidatura}
        />
      )}

      {showModal && (
        <VagaModal
          initial={editVaga ? { titulo: editVaga.titulo, tipo: editVaga.tipo, area: editVaga.area ?? '', descricao: editVaga.descricao ?? '', requisitos: editVaga.requisitos ?? '', localizacao: editVaga.localizacao ?? '', is_remote: editVaga.is_remote ?? false, deadline: editVaga.deadline ?? '', skills: editVaga.skills ?? [] } : undefined}
          onSave={saveVaga}
          onClose={() => { setShowModal(false); setEditVaga(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}
