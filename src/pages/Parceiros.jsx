import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import {
  Building2, Plus, X, ChevronDown, ChevronRight, Mail, Phone, Globe2,
  UserPlus, Trash2, Pencil, ExternalLink, Send, CheckCircle2,
} from 'lucide-react'

const C = {
  bg: 'var(--color-bg)', bgAlt: 'var(--color-bg-alt)', card: 'var(--color-surface)', cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)', borderBright: 'var(--color-border-hover)',
  blue: 'var(--color-primary)', text: 'var(--color-text)', muted: 'var(--color-text-secondary)', subtle: 'var(--color-text-tertiary)',
  green: 'var(--color-success)', yellow: 'var(--color-warning)', red: 'var(--color-error)', purple: 'var(--color-accent)',
  glass: 'var(--color-glass)', glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)', glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

const STATUS_META = {
  interessado: { label: 'Interessado', color: C.subtle },
  contactado:  { label: 'Contactado',  color: C.blue },
  resposta:    { label: 'Resposta',    color: C.purple },
  entrevista:  { label: 'Entrevista',  color: C.yellow },
  aceite:      { label: 'Aceite',      color: C.green },
  recusado:    { label: 'Recusado',    color: C.red },
}
const STATUS_ORDER = Object.keys(STATUS_META)

function CompanyModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [sector, setSector] = useState(initial?.sector || '')
  const [contactName, setContactName] = useState(initial?.contact_name || '')
  const [contactEmail, setContactEmail] = useState(initial?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone || '')
  const [website, setWebsite] = useState(initial?.website || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [saving, setSaving] = useState(false)

  const inputStyle = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      sector: sector.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
            {initial ? 'Editar empresa' : 'Nova empresa parceira'}
          </h3>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome da empresa *</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Acme Software" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Setor</label>
            <input value={sector} onChange={e => setSector(e.target.value)} placeholder="ex: Desenvolvimento Web" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Contacto</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nome" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+351..." style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contacto@empresa.pt" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="ex: Costumam receber estagiários no 2º período." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={saving || !name.trim()} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4, boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
            {saving ? 'A guardar…' : initial ? 'Guardar alterações' : 'Criar empresa'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LeadModal({ students, onClose, onSave }) {
  const [studentId, setStudentId] = useState('')
  const [status, setStatus] = useState('interessado')
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!studentId) return
    setSaving(true)
    await onSave(studentId, status)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 380, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Associar aluno</h3>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aluno</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} required
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
              <option value="">Seleciona um aluno…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} {s.turmaName ? `— ${s.turmaName}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving || !studentId} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !studentId ? 0.6 : 1, fontFamily: 'inherit', marginTop: 4 }}>
            {saving ? 'A guardar…' : 'Associar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LeadRow({ lead, onChangeStatus, onRemove }) {
  const meta = STATUS_META[lead.status] || STATUS_META.interessado
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {lead.studentName}
      </div>
      <select
        value={lead.status}
        onChange={e => onChangeStatus(lead.id, e.target.value)}
        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40`, borderRadius: 6, padding: '4px 8px', color: meta.color, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
      >
        {STATUS_ORDER.map(s => <option key={s} value={s} style={{ background: C.card, color: C.text }}>{STATUS_META[s].label}</option>)}
      </select>
      <button onClick={() => onRemove(lead.id)} className="icon-btn-ghost" title="Remover" style={{ padding: 4 }}>
        <Trash2 size={13} color={C.subtle} />
      </button>
    </div>
  )
}

function CompanyCard({ company, leads, students, onEdit, onDelete, onAddLead, onChangeLeadStatus, onRemoveLead, onInvite }) {
  const [open, setOpen] = useState(false)
  const [hov, setHov] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const claimed = !!company.claimed_by
  const invited = !!company.invited_at

  return (
    <div style={{ ...C.glassStyle, background: hov ? C.glassHover : C.glass, border: `1px solid ${hov ? C.glassBorderBright : C.glassBorder}`, borderRadius: 12, transition: 'background 0.15s, border-color 0.15s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Building2 size={16} color="var(--color-primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
            {company.sector && <span style={{ fontSize: 12, color: C.muted }}>{company.sector}</span>}
            {leads.length > 0 && <span style={{ fontSize: 11, color: C.subtle }}>{leads.length} aluno{leads.length !== 1 ? 's' : ''}</span>}
            {claimed ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: C.green }}><CheckCircle2 size={11} /> Conta criada</span>
            ) : invited ? (
              <span style={{ fontSize: 11, color: C.subtle }}>Convite enviado</span>
            ) : null}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onEdit(company) }} className="icon-btn-ghost" title="Editar"><Pencil size={14} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(company) }} className="icon-btn-ghost" title="Remover"><Trash2 size={14} color={C.subtle} /></button>
        {open ? <ChevronDown size={16} color={C.subtle} /> : <ChevronRight size={16} color={C.subtle} />}
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {(company.contact_name || company.contact_email || company.contact_phone || company.website) && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: C.muted, marginBottom: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              {company.contact_name && <span>{company.contact_name}</span>}
              {company.contact_email && <a href={`mailto:${company.contact_email}`} style={{ color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{company.contact_email}</a>}
              {company.contact_phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{company.contact_phone}</span>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe2 size={12} />Site<ExternalLink size={10} /></a>}
            </div>
          )}
          {company.notes && <p style={{ fontSize: 12, color: C.subtle, margin: '0 0 10px', lineHeight: 1.5 }}>{company.notes}</p>}

          {claimed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 12 }}>
              <CheckCircle2 size={13} /> A empresa já tem conta no Showo e vê estes alunos diretamente.
            </div>
          ) : company.contact_email ? (
            <button
              onClick={async e => { e.stopPropagation(); setInviting(true); await onInvite(company); setInviting(false) }}
              disabled={inviting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '8px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: inviting ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 12, opacity: inviting ? 0.6 : 1 }}
            >
              <Send size={12} /> {inviting ? 'A enviar…' : invited ? 'Reenviar convite' : 'Convidar empresa para o Showo'}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: C.subtle, margin: '0 0 12px' }}>Adiciona um email de contacto para poderes convidar esta empresa.</p>
          )}

          <div>
            {leads.map(lead => (
              <LeadRow key={lead.id} lead={lead} onChangeStatus={onChangeLeadStatus} onRemove={onRemoveLead} />
            ))}
          </div>
          <button
            onClick={() => setShowLeadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px dashed ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: leads.length ? 10 : 0, width: '100%', justifyContent: 'center' }}
          >
            <UserPlus size={13} /> Associar aluno
          </button>
        </div>
      )}

      {showLeadModal && (
        <LeadModal
          students={students}
          onClose={() => setShowLeadModal(false)}
          onSave={async (studentId, status) => { await onAddLead(company.id, studentId, status); setShowLeadModal(false) }}
        />
      )}
    </div>
  )
}

export default function Parceiros() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [leads, setLeads] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [deletingCompany, setDeletingCompany] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (profile && profile.role !== 'professor') { navigate('/dashboard'); return }
  }, [user, profile, navigate])

  useEffect(() => {
    if (!user || profile?.role !== 'professor') return
    async function load() {
      const [{ data: comps }, { data: ld }, { data: classes }] = await Promise.all([
        supabase.from('partner_companies').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
        supabase.from('internship_leads').select('*').eq('teacher_id', user.id),
        supabase.from('classes').select('id, name').eq('teacher_id', user.id),
      ])
      setCompanies(comps || [])
      setLeads(ld || [])

      let studentList = []
      if (classes?.length) {
        const classMap = {}
        classes.forEach(c => { classMap[c.id] = c.name })
        const { data: members } = await supabase.from('class_members').select('class_id, user_id').in('class_id', classes.map(c => c.id))
        const ids = [...new Set((members || []).map(m => m.user_id))]
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, username').in('id', ids)
          const profMap = {}
          ;(profiles || []).forEach(p => { profMap[p.id] = p })
          const seen = new Set()
          ;(members || []).forEach(m => {
            if (seen.has(m.user_id)) return
            seen.add(m.user_id)
            const p = profMap[m.user_id]
            studentList.push({ id: m.user_id, full_name: p?.full_name || p?.username || 'Aluno', turmaName: classMap[m.class_id] })
          })
        }
      }
      setStudents(studentList)
      setLoading(false)
    }
    load()
  }, [user, profile?.role])

  async function handleSaveCompany(fields) {
    if (editingCompany) {
      const { error } = await supabase.from('partner_companies').update(fields).eq('id', editingCompany.id)
      if (!error) setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...fields } : c))
    } else {
      const { data, error } = await supabase.from('partner_companies').insert({ ...fields, teacher_id: user.id }).select().single()
      if (!error && data) setCompanies(prev => [data, ...prev])
    }
    setShowCompanyModal(false)
    setEditingCompany(null)
  }

  async function handleDeleteCompany() {
    if (!deletingCompany) return
    const { error } = await supabase.from('partner_companies').delete().eq('id', deletingCompany.id)
    if (!error) {
      setCompanies(prev => prev.filter(c => c.id !== deletingCompany.id))
      setLeads(prev => prev.filter(l => l.company_id !== deletingCompany.id))
    }
    setDeletingCompany(null)
  }

  async function handleAddLead(companyId, studentId, status) {
    const { data, error } = await supabase
      .from('internship_leads')
      .upsert({ company_id: companyId, teacher_id: user.id, student_id: studentId, status }, { onConflict: 'company_id,student_id' })
      .select()
      .single()
    if (!error && data) setLeads(prev => [...prev.filter(l => !(l.company_id === companyId && l.student_id === studentId)), data])
  }

  async function handleChangeLeadStatus(leadId, status) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    await supabase.from('internship_leads').update({ status }).eq('id', leadId)
  }

  async function handleRemoveLead(leadId) {
    setLeads(prev => prev.filter(l => l.id !== leadId))
    await supabase.from('internship_leads').delete().eq('id', leadId)
  }

  async function handleSendInvite(company) {
    // Fixed to the production domain rather than window.location.origin —
    // an invite sent while testing from localhost/a preview deploy would
    // otherwise embed a link nobody but that machine could open.
    const inviteUrl = `https://showo.pt/register?empresa_convite=${company.invite_token}`
    const { data, error } = await supabase.functions.invoke('send-partner-invite', {
      body: { company_id: company.id, invite_url: inviteUrl },
    })
    if (error || data?.error) {
      showToast(data?.error || 'Erro ao enviar convite: ' + error?.message)
      return
    }
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, invited_at: new Date().toISOString() } : c))
    showToast(`Convite enviado para ${company.contact_email}`)
  }

  const studentNameById = {}
  students.forEach(s => { studentNameById[s.id] = s.full_name })

  if (!user || profile?.role !== 'professor') return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: C.text, letterSpacing: '-1px', fontFamily: 'var(--font-heading)' }}>
              Empresas parceiras
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Organiza contactos de estágio e acompanha o progresso dos teus alunos.</p>
          </div>
          <button
            onClick={() => { setEditingCompany(null); setShowCompanyModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}
          >
            <Plus size={15} /> Nova empresa
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 64, borderRadius: 12, background: C.glass, border: `1px solid ${C.glassBorder}`, opacity: 0.5 }} />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={26} color="var(--color-primary)" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: C.text }}>Ainda não tens empresas parceiras</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>Adiciona empresas que costumam receber estagiários e associa alunos interessados.</p>
            <button
              onClick={() => setShowCompanyModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}
            >
              <Plus size={15} /> Adicionar empresa
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {companies.map(c => (
              <CompanyCard
                key={c.id}
                company={c}
                leads={leads.filter(l => l.company_id === c.id).map(l => ({ ...l, studentName: studentNameById[l.student_id] || 'Aluno' }))}
                students={students}
                onEdit={comp => { setEditingCompany(comp); setShowCompanyModal(true) }}
                onDelete={comp => setDeletingCompany(comp)}
                onAddLead={handleAddLead}
                onChangeLeadStatus={handleChangeLeadStatus}
                onRemoveLead={handleRemoveLead}
                onInvite={handleSendInvite}
              />
            ))}
          </div>
        )}
      </div>

      {showCompanyModal && (
        <CompanyModal
          initial={editingCompany}
          onClose={() => { setShowCompanyModal(false); setEditingCompany(null) }}
          onSave={handleSaveCompany}
        />
      )}

      {deletingCompany && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setDeletingCompany(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '28px 28px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={22} color="var(--color-error)" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)' }}>Remover empresa?</h3>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{deletingCompany.name}</strong> e todos os alunos associados serão removidos.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletingCompany(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteCompany} style={{ flex: 1, background: 'var(--color-error)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'opacity 0.3s, transform 0.3s',
        background: 'var(--color-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 10,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center',
      }}>{toast}</div>
    </div>
  )
}
