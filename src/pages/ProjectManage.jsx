import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateProject } from '../lib/updateProject'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { calculateScore, looksLikeSpam } from '../lib/score'
import { containsProfanity } from '../lib/profanity'
import SkillsPicker from '../components/SkillsPicker'
import { Select } from '../components/ui'
import {
  Eye, Users, Sparkles, Settings, ArrowLeft, ExternalLink,
  Check, Lock, Image, X, Trash2, Copy, Link2, AlertTriangle,
  UserPlus, Send, Monitor, Search, ChevronRight, Globe,
  TrendingUp, Star, Zap, BarChart2, RefreshCw, GraduationCap,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          'var(--color-bg)',
  bgAlt:       'var(--color-bg-alt)',
  card:        'var(--color-surface)',
  cardHover:   'var(--color-surface-hover)',
  border:      'var(--color-border)',
  borderBright:'var(--color-border-hover)',
  blue:        'var(--color-primary)',
  text:        'var(--color-text)',
  muted:       'var(--color-text-secondary)',
  subtle:      'var(--color-text-tertiary)',
  green:       'var(--color-success)',
  red:         'var(--color-error)',
  yellow:      'var(--color-warning)',
  glass: 'var(--color-glass)', glassBorder: 'var(--color-glass-border)',
}

const inputStyle = {
  width: '100%', background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10, padding: '11px 14px',
  color: C.text, fontSize: 15,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

const inputHandlers = {
  onFocus: e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)' },
  onBlur:  e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none' },
}

// ── Nav sections ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'preview',  Icon: Eye,      label: 'Preview',      color: 'var(--color-accent)', desc: 'Personalização da página pública' },
  { id: 'team',     Icon: Users,    label: 'Colaboradores', color: '#10b981', desc: 'Equipa e convites' },
  { id: 'ai',       Icon: Sparkles, label: 'Análise IA',   color: 'var(--color-warning)', desc: 'Feedback e sugestões inteligentes' },
  { id: 'settings', Icon: Settings, label: 'Definições',   color: '#6b7280', desc: 'Links, partilha e zona de perigo' },
]

const PROJECT_TYPES = [
  { value: '', label: 'Selecionar tipo...' },
  { value: 'pap',          label: 'PAP / Projeto final' },
  { value: 'personal',     label: 'Projeto pessoal' },
  { value: 'group',        label: 'Trabalho de grupo' },
  { value: 'competition',  label: 'Competição / Hackathon' },
  { value: 'internship',   label: 'Estágio' },
  { value: 'presentation', label: 'Apresentação' },
]

const CONTENT_FIELDS = [
  { key: 'name',            label: 'Nome do projeto',           type: 'text',     required: true },
  { key: 'area',            label: 'Área / Tecnologia principal', type: 'text',   required: true },
  { key: 'problem',         label: 'Problema que resolve',      type: 'textarea' },
  { key: 'solution',        label: 'Solução desenvolvida',      type: 'textarea' },
  { key: 'target_audience', label: 'Público-alvo',             type: 'text' },
  { key: 'features',        label: 'Funcionalidades principais', type: 'textarea' },
  { key: 'technologies',    label: 'Tecnologias utilizadas',    type: 'text' },
  { key: 'challenges',      label: 'Desafios encontrados',      type: 'textarea' },
  { key: 'results',         label: 'Resultados obtidos',        type: 'textarea' },
  { key: 'learnings',       label: 'O que aprendeste',          type: 'textarea' },
]

function getScoreColor(s) {
  if (s >= 86) return 'var(--color-success)'
  if (s >= 71) return 'var(--color-accent)'
  if (s >= 51) return 'var(--color-primary)'
  if (s >= 31) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function ScoreRing({ score }) {
  const size = 64, stroke = 5, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = ((score ?? 0) / 100) * circ
  const color = getScoreColor(score ?? 0)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 900, color, letterSpacing: '-0.5px' }}>
        {score ?? '—'}
      </div>
    </div>
  )
}

function SectionLabel({ text, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.subtle,
      marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 }}>
      {text}{required && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
    </label>
  )
}

function FieldBlock({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel text={label} required={required} />
      {children}
      {hint && <p style={{ margin: '5px 0 0', fontSize: 12, color: C.subtle, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div className="pm-section-card" style={{ background: C.glass, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 12,
      padding: '24px 26px', marginBottom: 16, boxShadow: 'none', ...style }}>
      {children}
    </div>
  )
}

function CardTitle({ children, color }) {
  return (
    <h3 style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: color ?? C.subtle,
      textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 7 }}>
      {children}
    </h3>
  )
}

// ── Desktop-only notice (shown on mobile for complex sections) ─────────────────
function DesktopNotice({ section }) {
  return (
    <div className="pm-desktop-only-notice" style={{
      display: 'none', // hidden on desktop via CSS
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '48px 24px', gap: 16,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--color-primary-subtle)',
        border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Monitor size={26} color={C.blue} />
      </div>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: C.text }}>{section} requer ecrã maior</p>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Abre no computador ou tablet para aceder a esta funcionalidade.
        </p>
      </div>
    </div>
  )
}

// ── SECTION: Conteúdo ─────────────────────────────────────────────────────────
function ContentSection({ project, onSaved }) {
  const coverInputRef = useRef(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!project) return
    setForm({
      name:            project.name || '',
      area:            project.area || '',
      problem:         project.problem || '',
      solution:        project.solution || '',
      target_audience: project.target_audience || '',
      features:        project.features || '',
      technologies:    project.technologies || '',
      challenges:      project.challenges || '',
      results:         project.results || '',
      learnings:       project.learnings || '',
      creator_name:    project.creator_name || '',
      course:          project.course || '',
      school:          project.school || '',
      school_year:     project.school_year || '',
      project_type:    project.project_type || '',
      pap_supervisor:  project.pap_supervisor || '',
      pap_date:        project.pap_date || '',
      cover_url:       project.cover_url || '',
      linkedin_url:    project.linkedin_url || '',
      github_url:      project.github_url || '',
      portfolio_url:   project.portfolio_url || '',
      tags:            project.tags || [],
    })
  }, [project?.id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleCoverImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Imagem demasiado grande (máx. 10MB)'); return }
    set('cover_url', '__uploading__')
    try {
      const path = `${project.slug}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      set('cover_url', publicUrl)
    } catch {
      set('cover_url', '')
      setError('Erro ao carregar imagem. Tenta novamente.')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name?.trim() || !form.area?.trim()) return
    const textFields = ['name','area','problem','solution','target_audience','features','technologies','challenges','results','learnings']
    for (const key of textFields) {
      const v = String(form[key] || '')
      if (containsProfanity(v)) { setError('Linguagem inapropriada detetada.'); return }
      if (looksLikeSpam(v))     { setError('Texto inválido detetado. Escreve conteúdo real.'); return }
    }
    setSaving(true); setError(null)
    try {
      const editToken = !project.user_id ? localStorage.getItem(`edit_token_${project.slug}`) : null
      await updateProject(project.id, { ...form, is_pap: form.project_type === 'pap' }, editToken)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved?.()
    } catch {
      setError('Erro ao guardar. Tenta novamente.')
    }
    setSaving(false)
  }

  const isPap = form.project_type === 'pap'

  return (
    <form onSubmit={handleSave}>
      {/* Content fields */}
      <Card>
        <CardTitle>Conteúdo do projeto</CardTitle>
        {CONTENT_FIELDS.map(f => (
          <FieldBlock key={f.key} label={f.label} required={f.required}>
            {f.type === 'textarea' ? (
              <textarea value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} {...inputHandlers} />
            ) : (
              <input type="text" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                style={inputStyle} {...inputHandlers} />
            )}
          </FieldBlock>
        ))}
        <FieldBlock label="Tags">
          <SkillsPicker value={form.tags || []} onChange={v => set('tags', v)} max={8} label="" />
        </FieldBlock>
      </Card>

      {/* Tipo de projeto */}
      <Card>
        <CardTitle>Tipo de projeto</CardTitle>
        <FieldBlock label="Tipo">
          <Select value={form.project_type} onChange={v => set('project_type', v)}
            options={PROJECT_TYPES} inputStyle={inputStyle} />
        </FieldBlock>
        {isPap && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FieldBlock label="Orientador">
              <input type="text" value={form.pap_supervisor} onChange={e => set('pap_supervisor', e.target.value)}
                style={inputStyle} placeholder="Nome do orientador" {...inputHandlers} />
            </FieldBlock>
            <FieldBlock label="Data de apresentação">
              <input type="text" value={form.pap_date} onChange={e => set('pap_date', e.target.value)}
                style={inputStyle} placeholder="Ex: Junho 2025" {...inputHandlers} />
            </FieldBlock>
          </div>
        )}
      </Card>

      {/* Sobre o criador */}
      <Card>
        <CardTitle>Sobre o criador</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FieldBlock label="O teu nome">
            <input type="text" value={form.creator_name} onChange={e => set('creator_name', e.target.value)}
              style={inputStyle} placeholder="Ex: João Silva" {...inputHandlers} />
          </FieldBlock>
          <FieldBlock label="Curso">
            <input type="text" value={form.course} onChange={e => set('course', e.target.value)}
              style={inputStyle} placeholder="Ex: Informática" {...inputHandlers} />
          </FieldBlock>
          <FieldBlock label="Ano letivo">
            <input type="text" value={form.school_year} onChange={e => set('school_year', e.target.value)}
              style={inputStyle} placeholder="Ex: 2024/2025" {...inputHandlers} />
          </FieldBlock>
          <FieldBlock label="Escola">
            <input type="text" value={form.school} onChange={e => set('school', e.target.value)}
              style={inputStyle} placeholder="Ex: ESMAD" {...inputHandlers} />
          </FieldBlock>
        </div>
        <div style={{ marginTop: 8 }}>
          <SectionLabel text="Links e redes" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)}
              style={inputStyle} placeholder="LinkedIn (https://linkedin.com/in/...)" {...inputHandlers} />
            <input type="url" value={form.github_url} onChange={e => set('github_url', e.target.value)}
              style={inputStyle} placeholder="GitHub (https://github.com/...)" {...inputHandlers} />
            <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)}
              style={inputStyle} placeholder="Portfólio ou site pessoal" {...inputHandlers} />
          </div>
        </div>
      </Card>

      {/* Imagem de capa */}
      <Card>
        <CardTitle>Imagem de capa</CardTitle>
        {form.cover_url === '__uploading__' ? (
          <div style={{ height: 160, borderRadius: 10, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: 'pm-sh 1.5s ease-in-out infinite' }}>
            <style>{`@keyframes pm-sh{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
          </div>
        ) : form.cover_url ? (
          <div style={{ position: 'relative' }}>
            <img src={form.cover_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
            <button type="button" onClick={() => set('cover_url', '')} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
              Remover
            </button>
          </div>
        ) : (
          <div onClick={() => coverInputRef.current?.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = 'var(--color-primary-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}>
            <Image size={26} color={C.muted} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.muted }}>Clica para carregar uma imagem</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.subtle }}>PNG, JPG ou WEBP · máx. 10MB</p>
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverImage} style={{ display: 'none' }} />
      </Card>

      {error && (
        <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 10, padding: '12px 16px', color: C.red, fontSize: 14, marginBottom: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={saving || !form.name?.trim() || !form.area?.trim()} style={{
        width: '100%',
        background: saved ? C.green : (saving || !form.name?.trim() || !form.area?.trim()) ? C.border : C.blue,
        color: '#fff', border: 'none', borderRadius: 10,
        padding: '15px 0', fontSize: 16, fontWeight: 700,
        cursor: saving || !form.name?.trim() || !form.area?.trim() ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s', fontFamily: 'inherit',
        boxShadow: (!saving && form.name?.trim() && form.area?.trim()) ? '0 2px 8px var(--color-primary-subtle)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {saved ? <><Check size={16} /> Guardado!</> : saving ? 'A guardar…' : 'Guardar alterações'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}

// ── SECTION: Preview ──────────────────────────────────────────────────────────
function PreviewSection({ project }) {
  return (
    <>
      <DesktopNotice section="Preview" />
      <div className="pm-desktop-section">
        <Card>
          <CardTitle color="var(--color-accent)"><Eye size={13} /> Personalização da página pública</CardTitle>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
            O editor de preview permite personalizar a aparência da tua página pública — blocos de conteúdo, cores, tipografia e rodapé.
          </p>

          <div style={{ position: 'relative', marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {project?.cover_url ? (
              <img src={project.cover_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: 140, background: 'var(--color-bg-alt)' }} />
            )}
            {project?.score != null && (
              <div style={{
                position: 'absolute', top: 10, right: 10,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(5,9,18,0.65)', backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999,
                padding: '5px 12px 5px 9px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: getScoreColor(project.score) }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{project.score}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>score</span>
              </div>
            )}
          </div>

          {/* Feature list */}
          {[
            { icon: <BarChart2 size={14} />, label: 'Blocos de conteúdo — reorganiza e activa/desactiva secções' },
            { icon: <Zap size={14} />, label: 'Paleta de cores de destaque e fundo personalizável' },
            { icon: <Star size={14} />, label: 'Tipografia — choose entre vários estilos de letra' },
            { icon: <Globe size={14} />, label: 'Botão CTA e rodapé personalizados' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', flexShrink: 0 }}>
                {item.icon}
              </div>
              <span style={{ fontSize: 13, color: C.muted }}>{item.label}</span>
            </div>
          ))}

          <a href={`/projeto/${project?.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, padding: '13px 0', background: 'var(--color-accent)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(168,85,247,0.2)' }}>
            <Eye size={16} /> Abrir editor de preview
          </a>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: C.subtle, textAlign: 'center' }}>
            Abre a página do projeto e clica em "Personalizar preview" para editar.
          </p>
        </Card>
      </div>
    </>
  )
}

// ── SECTION: Colaboradores ────────────────────────────────────────────────────
function TeamSection({ project, isOwner }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  async function loadMembers() {
    if (!project?.id) return
    const { data: rows } = await supabase
      .from('project_collaborators')
      .select('user_id, status, sections')
      .eq('project_id', project.id)
    if (!rows?.length) { setMembers([]); setLoading(false); return }
    const ids = [...new Set(rows.map(r => r.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
    const map = {}; profiles?.forEach(p => { map[p.id] = p })
    setMembers(rows.map(r => ({ ...r, profile: map[r.user_id] || null })))
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [project?.id])

  async function handleRemove(userId) {
    setRemoving(userId)
    await supabase.from('project_collaborators').delete().eq('project_id', project.id).eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
    setRemoving(null)
  }

  const STATUS_CHIP = {
    accepted: { label: 'Aceite',   color: 'var(--color-success)' },
    pending:  { label: 'Pendente', color: 'var(--color-warning)' },
    declined: { label: 'Recusado', color: 'var(--color-error)'   },
  }

  return (
    <>
      {showInviteModal && (
        <InviteModal
          project={project}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => { loadMembers(); setShowInviteModal(false) }}
        />
      )}

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <CardTitle color="#10b981" style={{ margin: 0 }}><Users size={13} /> Equipa ({members.length})</CardTitle>
          {isOwner && (
            <button onClick={() => setShowInviteModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
              background: 'transparent', border: `1.5px solid #10b981`,
              borderRadius: 8, color: '#10b981', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <UserPlus size={13} /> Convidar
            </button>
          )}
        </div>
        {loading ? (
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>A carregar…</p>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted }}>
            <Users size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Sem colaboradores ainda.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map(m => {
              const chip = STATUS_CHIP[m.status] ?? STATUS_CHIP.pending
              const name = m.profile?.full_name || m.profile?.username || 'Utilizador'
              return (
                <div key={m.user_id} className="pm-team-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.bgAlt, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
                    {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {m.profile?.username && <div style={{ fontSize: 12, color: C.muted }}>@{m.profile.username}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: chip.color, flexShrink: 0 }}>
                    {chip.label}
                  </span>
                  {isOwner && (
                    <button onClick={() => handleRemove(m.user_id)} disabled={removing === m.user_id} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'color 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = C.red}
                      onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                      <X size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}

function InviteModal({ project, onClose, onInvited }) {
  const [inviteInput, setInviteInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  function handleSearchInput(e) {
    const val = e.target.value
    setInviteInput(val)
    setSelectedUser(null)
    setInviteMsg(null)
    clearTimeout(searchTimerRef.current)
    if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return }
    searchTimerRef.current = setTimeout(async () => {
      const q = val.trim()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(8)
      setSearchResults(data || [])
      setShowDropdown(true)
    }, 250)
  }

  function selectUser(u) {
    setSelectedUser(u)
    setInviteInput(u.full_name || u.username)
    setShowDropdown(false)
    setSearchResults([])
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!selectedUser && !inviteInput.trim()) return
    setInviting(true); setInviteMsg(null)
    let found = selectedUser
    if (!found) {
      const q = inviteInput.trim()
      const { data } = await supabase.from('profiles').select('id, username, full_name').or(`username.ilike.${q},full_name.ilike.${q}`).limit(1)
      found = data?.[0] || null
    }
    if (!found) { setInviteMsg({ type: 'error', text: 'Utilizador não encontrado.' }); setInviting(false); return }
    if (found.id === project.user_id) { setInviteMsg({ type: 'error', text: 'Não podes convidar o dono do projeto.' }); setInviting(false); return }
    const { error } = await supabase.from('project_collaborators').upsert({ project_id: project.id, user_id: found.id, status: 'pending', sections: [] }, { onConflict: 'project_id,user_id' })
    if (error) { setInviteMsg({ type: 'error', text: 'Erro ao convidar. Tenta novamente.' }); setInviting(false); return }
    setInviteMsg({ type: 'success', text: `Convite enviado para ${found.full_name || found.username}!` })
    setInviting(false)
    setTimeout(onInvited, 1200)
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`@keyframes pmFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        background: 'var(--color-surface)', border: `1px solid ${C.border}`,
        borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        animation: 'pmFadeUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={15} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Convidar colaborador</div>
              <div style={{ fontSize: 12, color: C.muted }}>Pesquisa pelo nome ou username</div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn-ghost"><X size={17} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleInvite} style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={inviteInput}
              onChange={handleSearchInput}
              onFocus={() => { if (searchResults.length) setShowDropdown(true) }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Pesquisar utilizador..."
              style={{ ...inputStyle }}
              {...inputHandlers}
            />
            {showDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--color-surface)', border: `1.5px solid ${C.border}`,
                borderRadius: 10, zIndex: 50, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              }}>
                {searchResults.map(u => (
                  <button key={u.id} type="button" onMouseDown={() => selectUser(u)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--color-primary-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: C.blue, overflow: 'hidden',
                    }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover' }} />
                        : (u.full_name || u.username || '?')[0].toUpperCase()
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.username}</div>
                      {u.username && <div style={{ fontSize: 12, color: C.muted }}>@{u.username}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.blue, flexShrink: 0, overflow: 'hidden' }}>
                {selectedUser.avatar_url
                  ? <img src={selectedUser.avatar_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                  : (selectedUser.full_name || selectedUser.username || '?')[0].toUpperCase()
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{selectedUser.full_name || selectedUser.username}</div>
                {selectedUser.username && <div style={{ fontSize: 11, color: C.muted }}>@{selectedUser.username}</div>}
              </div>
              <Check size={15} color="#10b981" />
            </div>
          )}

          {inviteMsg && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: inviteMsg.type === 'success' ? C.green : C.red }}>
              {inviteMsg.text}
            </p>
          )}

          <button type="submit" disabled={(!inviteInput.trim() && !selectedUser) || inviting} style={{
            width: '100%', padding: '12px', background: C.blue, border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: (!inviteInput.trim() && !selectedUser) ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}>
            <Send size={14} /> {inviting ? 'A convidar…' : 'Enviar convite'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── SECTION: Análise IA ───────────────────────────────────────────────────────
function AISection({ project }) {
  const feedback = project?.ai_feedback
  const aiScore  = project?.ai_score

  const CRITERIA = [
    { key: 'clareza',      label: 'Clareza',       icon: <Star size={13} /> },
    { key: 'impacto',      label: 'Impacto',        icon: <TrendingUp size={13} /> },
    { key: 'originalidade',label: 'Originalidade',  icon: <Zap size={13} /> },
    { key: 'completude',   label: 'Completude',     icon: <Check size={13} /> },
  ]

  return (
    <>
      <DesktopNotice section="Análise IA" />
      <div className="pm-desktop-section">
        {!feedback ? (
          <Card>
            <CardTitle color="var(--color-warning)"><Sparkles size={13} /> Análise IA</CardTitle>
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Sparkles size={24} color="var(--color-warning)" />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: C.text }}>Sem análise ainda</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Abre a página do projeto e usa o botão "Analisar com IA" para gerar feedback detalhado.
              </p>
              <a href={`/projeto/${project?.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: 'var(--color-warning)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                <Sparkles size={14} /> Ir para o projeto
              </a>
            </div>
          </Card>
        ) : (
          <>
            {aiScore != null && (
              <Card>
                <CardTitle color="var(--color-warning)"><Sparkles size={13} /> Score IA</CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--color-warning)', letterSpacing: '-2px', lineHeight: 1 }}>{aiScore}</div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: C.text }}>Score atribuído pela IA</p>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Baseado em clareza, impacto e completude</p>
                  </div>
                </div>
                {feedback?.scores && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {CRITERIA.filter(c => feedback.scores[c.key] != null).map(c => (
                      <div key={c.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>{c.icon} {c.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{feedback.scores[c.key]}/10</span>
                        </div>
                        <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(feedback.scores[c.key] / 10) * 100}%`, background: 'var(--color-warning)', borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
            {feedback?.suggestions?.length > 0 && (
              <Card>
                <CardTitle color="var(--color-warning)">Sugestões de melhoria</CardTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {feedback.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 10 }}>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {feedback?.summary && (
              <Card>
                <CardTitle color="var(--color-warning)">Sumário</CardTitle>
                <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{feedback.summary}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ── SECTION: Definições ───────────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  { value: 'public',   label: 'Público',       desc: 'Aparece no Explorar e na Home' },
  { value: 'unlisted', label: 'Só com link',   desc: 'Acessível apenas com o link direto' },
  { value: 'private',  label: 'Privado',       desc: 'Visível apenas para ti' },
]

function SettingsSection({ project, isOwner, navigate }) {
  const [copied, setCopied] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [visibility, setVisibility] = useState(project?.visibility || 'public')
  const [savingVis, setSavingVis] = useState(false)

  const publicUrl = `${window.location.origin}/projeto/${project?.slug}`
  const editToken = localStorage.getItem(`edit_token_${project?.slug}`)
  const editUrl   = editToken ? `${window.location.origin}/editar/${project?.slug}?token=${editToken}` : null

  async function saveVisibility(val) {
    setVisibility(val)
    setSavingVis(true)
    await supabase.from('projects').update({ visibility: val }).eq('id', project.id)
    setSavingVis(false)
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function handleDelete() {
    if (!project?.id) return
    setDeleting(true)
    await supabase.from('projects').delete().eq('id', project.id)
    localStorage.removeItem(`edit_token_${project.slug}`)
    navigate('/dashboard')
  }

  return (
    <>
      {/* Visibilidade */}
      {isOwner && (
        <Card>
          <CardTitle><Globe size={13} /> Visibilidade</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => saveVisibility(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: visibility === opt.value ? 'var(--color-primary-subtle)' : C.bgAlt,
                  border: `1.5px solid ${visibility === opt.value ? 'var(--color-primary-muted)' : C.border}`,
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${visibility === opt.value ? 'var(--color-primary)' : C.border}`,
                  background: visibility === opt.value ? 'var(--color-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {visibility === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{opt.desc}</div>
                </div>
                {savingVis && visibility === opt.value && <div style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>A guardar…</div>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Links de partilha */}
      <Card>
        <CardTitle><Globe size={13} /> Links do projeto</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</div>
            <button onClick={() => copy(publicUrl, 'public')} style={{ padding: '10px 16px', background: copied === 'public' ? C.green : C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
              {copied === 'public' ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 12px', background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
              <ExternalLink size={14} />
            </a>
          </div>

          {editUrl && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.yellow, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Lock size={11} /> Link privado de edição
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editUrl}</div>
                <button onClick={() => copy(editUrl, 'edit')} style={{ padding: '10px 16px', background: copied === 'edit' ? C.green : C.yellow, border: 'none', borderRadius: 8, color: 'var(--color-bg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                  {copied === 'edit' ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Zona de perigo */}
      {isOwner && (
        <Card style={{ border: '1px solid var(--color-error-subtle)', boxShadow: 'none' }}>
          <CardTitle color="var(--color-error)"><AlertTriangle size={13} /> Zona de perigo</CardTitle>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
            Eliminar o projeto é uma ação irreversível. Todos os dados, score e página pública serão apagados permanentemente.
          </p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 10, color: C.red, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-error-subtle)'; e.currentTarget.style.borderColor = 'var(--color-error-subtle)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-error-subtle)'; e.currentTarget.style.borderColor = 'var(--color-error-subtle)' }}>
              <Trash2 size={15} /> Eliminar projeto
            </button>
          ) : (
            <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.red }}>Tens a certeza? Esta ação não pode ser desfeita.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: C.red, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {deleting ? 'A eliminar…' : <><Trash2 size={14} /> Confirmar eliminação</>}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectManage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeSection, setActiveSection] = useState('preview')
  const [score, setScore] = useState(0)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).single()
      if (error || !data) { setLoading(false); return }

      const tokenFromUrl = searchParams.get('token')
      const tokenFromStorage = localStorage.getItem(`edit_token_${slug}`)
      const token = tokenFromUrl || tokenFromStorage

      const owned        = !!(user && data.user_id && user.id === data.user_id)
      const hasToken     = !!(data.edit_token && token === data.edit_token)
      const isLegacy     = !data.edit_token && !data.user_id

      let isCollaborator = false
      if (!owned && !hasToken && !isLegacy && user) {
        const { data: collab } = await supabase
          .from('project_collaborators')
          .select('id').eq('project_id', data.id).eq('user_id', user.id).eq('status', 'accepted').single()
        isCollaborator = !!collab
      }

      if (!owned && !hasToken && !isLegacy && !isCollaborator) {
        setAccessDenied(true); setLoading(false); return
      }

      if (tokenFromUrl) localStorage.setItem(`edit_token_${slug}`, tokenFromUrl)

      setProject(data)
      setIsOwner(owned || hasToken || isLegacy)
      const { score: s } = calculateScore(data)
      setScore(s)
      setLoading(false)
    }
    load()
  }, [slug, user?.id])

  function handleSaved() {
    // Refresh score after save
    supabase.from('projects').select('*').eq('slug', slug).single().then(({ data }) => {
      if (data) { const { score: s } = calculateScore(data); setScore(s); setProject(data) }
    })
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar showLinks={false} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 62px)' }}>
        <style>{`@keyframes pm2-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {[140, 90, 115].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `pm2-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ── Access denied ──────────────────────────────────────────────────────────
  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar showLinks={false} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', height: 'calc(100dvh - 62px)' }}>
        <Lock size={48} color={C.yellow} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', color: C.text }}>Acesso restrito</h2>
        <p style={{ color: C.muted, margin: 0, maxWidth: 380, lineHeight: 1.65, fontSize: 14 }}>
          Só o criador deste projeto pode gerir. Usa o link privado de edição que recebeste quando criaste o projeto.
        </p>
        <button onClick={() => navigate(`/projeto/${slug}`)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
          Ver o projeto
        </button>
      </div>
    </div>
  )

  if (!project) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar showLinks={false} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: 'calc(100dvh - 62px)' }}>
        <Search size={48} color={C.blue} />
        <h2 style={{ margin: 0, fontWeight: 400, fontFamily: 'var(--font-heading)', color: C.text }}>Projeto não encontrado</h2>
        <button onClick={() => navigate('/')} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>Ir para o início</button>
      </div>
    </div>
  )

  const scoreColor = getScoreColor(score)
  const activeNav  = NAV.find(n => n.id === activeSection)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Layout switches ── */
        @media (max-width: 768px) {
          .pm-sidebar           { display: none !important; }
          .pm-mobile-tabs       { display: flex !important; }
          .pm-layout            { flex-direction: column !important; gap: 0 !important; }
          .pm-main              { padding: 16px !important; padding-top: 0 !important; }
          .pm-desktop-section   { display: block !important; }
          .pm-desktop-only-notice { display: flex !important; }
        }
        @media (min-width: 769px) {
          .pm-sidebar           { display: flex !important; }
          .pm-mobile-tabs       { display: none !important; }
          .pm-desktop-section   { display: block !important; }
          .pm-desktop-only-notice { display: none !important; }
        }

        .pm-nav-item:hover { background: var(--color-bg-alt) !important; }
        .pm-nav-item.active { background: var(--color-bg-alt) !important; }
        .pm-tab-pill:hover { border-color: var(--color-border-hover) !important; }
        .pm-tab-pill.active { border-color: currentColor !important; }

        @media (max-width: 600px) {
          .pm-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap !important; padding-bottom: 4px; }
          .pm-section-card { padding: 16px !important; }
          .pm-page-hd { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .pm-team-row { flex-wrap: wrap !important; }
        }
        @media (max-width: 860px) {
          .pm-section-desc { display: none !important; }
        }
      `}</style>

      {/* Navbar */}
      <Navbar showLinks={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(`/projeto/${slug}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
            <ArrowLeft size={13} /> Projeto
          </button>
          <a href={`/projeto/${slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
            <ExternalLink size={13} /> Ver público
          </a>
        </div>
      </Navbar>

      {/* Page header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div className="pm-page-hd" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>A gerir</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.subtle, fontWeight: 600, marginBottom: 2 }}>Score</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: scoreColor, letterSpacing: '-0.5px' }}>{score}/100</div>
            </div>
            <ScoreRing score={score} />
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="pm-mobile-tabs pm-nav" style={{ display: 'none', overflowX: 'auto', padding: '12px 16px', gap: 8, borderBottom: `1px solid ${C.border}`, background: C.card, scrollbarWidth: 'none' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActiveSection(n.id)}
            className={`pm-tab-pill ${activeSection === n.id ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${activeSection === n.id ? n.color : C.border}`, background: activeSection === n.id ? `${n.color}15` : 'transparent', color: activeSection === n.id ? n.color : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}>
            <n.Icon size={13} /> {n.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="pm-layout" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0, minHeight: 'calc(100vh - 120px)' }}>

        {/* Left sidebar */}
        <aside className="pm-sidebar" style={{ display: 'flex', flexDirection: 'column', width: 252, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: '20px 12px', gap: 2, position: 'sticky', top: 0, height: 'calc(100vh - 64px)', overflowY: 'auto' }}>

          {/* Score card */}
          <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <ScoreRing score={score} />
            <div>
              <div style={{ fontSize: 11, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Score atual</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: scoreColor, letterSpacing: '-0.5px' }}>{score}<span style={{ fontSize: 12, fontWeight: 500, color: C.subtle }}>/100</span></div>
              <div style={{ height: 3, background: C.border, borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          {/* Nav items */}
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveSection(n.id)}
              className={`pm-nav-item ${activeSection === n.id ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11, border: 'none', background: activeSection === n.id ? C.bgAlt : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'background 0.15s', position: 'relative' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: activeSection === n.id ? `${n.color}18` : 'transparent', border: `1px solid ${activeSection === n.id ? `${n.color}40` : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <n.Icon size={15} color={activeSection === n.id ? n.color : C.muted} strokeWidth={activeSection === n.id ? 2.2 : 1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: activeSection === n.id ? C.text : C.muted, transition: 'color 0.15s' }}>{n.label}</div>
                <div style={{ fontSize: 11, color: C.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{n.desc}</div>
              </div>
              {activeSection === n.id && <div style={{ width: 3, height: 20, background: n.color, borderRadius: 99, position: 'absolute', left: 0 }} />}
            </button>
          ))}

          {/* Quick link to public page */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <a href={`/projeto/${slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: `${C.blue}10`, border: `1px solid ${C.blue}25`, color: C.blue, fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}18`; e.currentTarget.style.borderColor = `${C.blue}45` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}10`; e.currentTarget.style.borderColor = `${C.blue}25` }}>
              <ExternalLink size={13} /> Ver projeto público
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="pm-main" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', minWidth: 0 }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            {activeNav && (
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${activeNav.color}15`, border: `1px solid ${activeNav.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <activeNav.Icon size={18} color={activeNav.color} />
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>{activeNav?.label}</h2>
              <p className="pm-section-desc" style={{ margin: 0, fontSize: 12, color: C.muted }}>{activeNav?.desc}</p>
            </div>
          </div>

          {/* Section content */}

          {activeSection === 'preview'  && <PreviewSection  project={project} />}
          {activeSection === 'team'     && <TeamSection     project={project} isOwner={isOwner} />}
          {activeSection === 'ai'       && <AISection       project={project} />}
          {activeSection === 'settings' && <SettingsSection project={project} isOwner={isOwner} navigate={navigate} />}
        </main>
      </div>
    </div>
  )
}
