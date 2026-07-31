import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

import ConvidarVagaModal from '../components/ConvidarVagaModal'
import { getCurrentAcademicYear, academicYearOptions } from '../lib/academicYear'
import { calculatePotential } from '../lib/score'
import SkillsPicker from '../components/SkillsPicker'
import {
  Folder, Trophy, BarChart2, Rocket, Eye, GraduationCap, Plus, X, Users, Users2,
  ChevronRight, ChevronDown, User, Globe, TrendingUp, MessageSquare, Star, Mail,
  Search, Trash2, Check, Calendar, ArrowRight, Target, Zap, Sparkles, Building2,
  Send, Copy, Share2, Link, HelpCircle, AlertTriangle, ListChecks, Circle,
  Pencil, ExternalLink, Compass, Medal, BookOpen, Briefcase, Settings, LogOut,
} from 'lucide-react'
import {
  Button, Card, CardHeader, CardTitle, SectionLabel, Badge, Modal, ModalActions,
  EmptyState, PageLayout, PageHeader, ProgressBar, ProgressRing,
} from '../components/ui'
import './Dashboard.css'

/* ══════════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════════ */

function getScoreColor(score) {
  if (score == null) return 'var(--color-text-tertiary)'
  if (score >= 86) return 'var(--color-success)'
  if (score >= 71) return 'var(--color-primary)'
  if (score >= 51) return 'var(--color-info)'
  if (score >= 31) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]
  return user?.email?.split('@')[0] ?? ''
}

function timeAgoLabel(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 3600) return `há ${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — Project Row
   ══════════════════════════════════════════════════════════════════════════ */

function ProjectRow({ project, onView, onEdit, onDelete, onCopy, copied }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
  const scoreColor = getScoreColor(project.score)

  return (
    <Card padding="none" hoverable onClick={(e) => { if (window.innerWidth <= 600 && !e.target.closest('button')) onView() }} style={{ overflow: 'hidden' }}>
      <div className="dash-project-row" style={{ display: 'flex', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', gap: 'var(--sp-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span onClick={onView} style={{ color: 'var(--color-text)', fontSize: 'var(--text-base)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {project.name}
            </span>
            {project.area && (
              <Badge variant="default" className="dash-proj-area">{project.area}</Badge>
            )}
          </div>
          {project.ai_tagline && (
            <p className="dash-proj-tagline" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
              {project.ai_tagline}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>{date}</span>
            {project.views > 0 && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={10} /> {project.views}</span>}
            {project.collaborator_count > 0 && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {project.collaborator_count}</span>}
          </div>
        </div>

        <ProgressRing value={project.score ?? 0} size={42} strokeWidth={3.5} color={scoreColor}>
          <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor }}>{project.score ?? '—'}</span>
        </ProgressRing>

        <div className="dash-project-actions">
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Apagar?</span>
              <Button size="sm" variant="danger" onClick={() => { onDelete(project.id); setConfirmDelete(false) }}>Sim</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Não</Button>
            </>
          ) : (
            <>
              <button onClick={onView} title="Ver projeto" className="dash-ghost-btn"><ExternalLink size={15} /></button>
              <button onClick={onEdit} title="Editar" className="dash-ghost-btn"><Pencil size={15} /></button>
              <button onClick={onCopy} title={copied ? 'Copiado!' : 'Copiar link'} className="dash-ghost-btn" style={copied ? { color: 'var(--color-success)' } : undefined}>{copied ? <Check size={15} /> : <Link size={15} />}</button>
              <button onClick={() => setConfirmDelete(true)} title="Apagar" className="dash-ghost-btn dash-ghost-btn-danger"><Trash2 size={15} /></button>
            </>
          )}
        </div>

        <div className="dash-proj-actions-mobile">
          {confirmDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={e => { e.stopPropagation(); onDelete(project.id); setConfirmDelete(false) }}>Sim</Button>
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}>Não</Button>
            </>
          ) : (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit() }} className="dash-ghost-btn" style={{ opacity: 0.6 }}><Pencil size={14} /></button>
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} className="dash-ghost-btn dash-ghost-btn-danger" style={{ opacity: 0.6 }}><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — Feed Item (teacher lists)
   ══════════════════════════════════════════════════════════════════════════ */

function FeedItem({ icon, iconBg, iconColor, title, subtitle, rightContent, onClick }) {
  return (
    <div className="dash-feed-item" onClick={onClick}>
      <div className="dash-feed-icon" style={{ background: iconBg, border: `1px solid ${iconColor}40` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {rightContent || <ChevronRight size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — TurmaCard (teacher)
   ══════════════════════════════════════════════════════════════════════════ */

function TurmaCard({ turma, navigate }) {
  return (
    <Card hoverable onClick={() => navigate(`/turma/${turma.code}`)} padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users2 size={16} color="var(--color-primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--color-text)', fontSize: 'var(--text-base)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</span>
            {turma.academic_year && <Badge>{turma.academic_year}</Badge>}
          </div>
          {turma.subject && <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
            {turma.member_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{turma.member_count} aluno{turma.member_count !== 1 ? 's' : ''}</span>}
            {turma.project_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Folder size={10} />{turma.project_count} projeto{turma.project_count !== 1 ? 's' : ''}</span>}
            {turma.avg_score != null && <span style={{ color: getScoreColor(turma.avg_score), fontWeight: 700 }}>⌀ {turma.avg_score}</span>}
          </div>
        </div>
        <ChevronRight size={16} color="var(--color-text-tertiary)" />
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — Modals
   ══════════════════════════════════════════════════════════════════════════ */

function CreateTurmaModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError('')
    const code = generateCode()
    const teacherName = profile?.full_name || user?.user_metadata?.full_name || ''
    const { data, error: err } = await supabase
      .from('classes')
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName, academic_year: academicYear })
      .select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data); onClose()
  }

  return (
    <Modal onClose={onClose} title="Nova turma">
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div>
          <SectionLabel>Nome da turma *</SectionLabel>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Turma A — 11º ano"
            style={{ width: '100%', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text)', fontSize: 'var(--text-base)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div>
          <SectionLabel>Disciplina</SectionLabel>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Programação e Sistemas de Informação"
            style={{ width: '100%', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text)', fontSize: 'var(--text-base)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div>
          <SectionLabel>Ano letivo</SectionLabel>
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            style={{ width: '100%', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text)', fontSize: 'var(--text-base)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
            {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-base)', margin: 0 }}>{error}</p>}
        <Button type="submit" disabled={saving || !name.trim()} loading={saving} fullWidth style={{ marginTop: 'var(--sp-1)' }}>
          {saving ? 'A criar…' : 'Criar turma'}
        </Button>
      </form>
    </Modal>
  )
}

function JoinTurmaModal({ onClose, navigate, onJoined }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [joined, setJoined] = useState(null)
  const [verified, setVerified] = useState(null)

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true); setError('')
    try {
      const { data: rows, error: sbErr } = await supabase.rpc('join_class', { p_code: trimmed })
      const data = rows?.[0]
      if (sbErr || !data) {
        setError(sbErr && sbErr.message !== 'class_not_found' ? sbErr.message : 'Código inválido. Verifica com o professor.')
        return
      }
      setVerified(!!data.verified)
      setJoined(data)
      onJoined?.(data)
    } catch {
      setError('Erro de ligação. Tenta novamente.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Modal onClose={onClose} title={joined ? undefined : 'Entrar numa turma'} subtitle={joined ? undefined : 'Pede o código de 6 letras ao teu professor'}>
      {joined ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', margin: '0 auto var(--sp-4)', background: verified ? 'var(--color-success-subtle)' : 'var(--color-warning-subtle)', border: `1px solid ${verified ? 'var(--color-success)' : 'var(--color-warning)'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={28} color={verified ? 'var(--color-success)' : 'var(--color-warning)'} />
          </div>
          <h3 style={{ color: 'var(--color-text)', margin: '0 0 6px', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            {verified ? 'Entraste na turma!' : 'Turma encontrada'}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--sp-5)', fontSize: 'var(--text-base)', lineHeight: 1.5 }}>
            {verified ? joined.name : `${joined.name} — não consegui confirmar o teu registo. Verifica na turma.`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <Button fullWidth icon={<ArrowRight size={15} />} onClick={() => { navigate(`/turma/${joined.code}`); onClose() }}>
              Ir para a turma
            </Button>
            <Button variant="secondary" fullWidth onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <input
            value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="CÓDIGO" maxLength={6} autoFocus
            style={{
              width: '100%', background: 'var(--color-input-bg)',
              border: `2px solid ${error ? 'var(--color-error)' : code.length === 6 ? 'var(--color-primary)' : 'var(--color-input-border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 18, color: 'var(--color-text)',
              fontSize: 28, fontWeight: 900, outline: 'none', letterSpacing: 10,
              textAlign: 'center', fontFamily: 'inherit', boxSizing: 'border-box',
              transition: 'border-color var(--duration-fast)',
            }}
          />
          {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-base)', margin: 0, textAlign: 'center' }}>{error}</p>}
          <Button type="submit" disabled={checking || code.trim().length < 2} loading={checking} fullWidth>
            {checking ? 'A verificar…' : 'Confirmar código'}
          </Button>
        </form>
      )}
    </Modal>
  )
}

function TurmasListModal({ turmas, onClose, navigate, onJoin }) {
  return (
    <Modal onClose={onClose} title="As minhas turmas" subtitle={`${turmas.length} turma${turmas.length !== 1 ? 's' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {turmas.map(t => (
          <Card key={t.id} hoverable onClick={() => { navigate(`/turma/${t.code}`); onClose() }} padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users2 size={16} color="var(--color-primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                {t.teacher_name && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 1 }}>{t.teacher_name}</div>}
              </div>
              <Badge variant="primary">{t.code}</Badge>
              <ChevronRight size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
            </div>
          </Card>
        ))}
      </div>
      <Button variant="secondary" fullWidth icon={<Plus size={14} />} onClick={() => { onClose(); onJoin() }}>
        Entrar noutra turma
      </Button>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — Onboarding Modals
   ══════════════════════════════════════════════════════════════════════════ */

const ONBOARDING = {
  aluno: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'O teu portfólio profissional começa aqui.',
    steps: [
      { icon: <Pencil size={20} color="var(--color-text-secondary)" />, title: 'Cria o teu projeto', desc: 'Preenche os campos sobre o teu trabalho e constrói a tua página profissional.' },
      { icon: <Globe size={20} color="var(--color-text-secondary)" />, title: 'Partilha a tua página', desc: 'Cada projeto ganha uma página pública pronta a enviar a recrutadores e professores.' },
      { icon: <TrendingUp size={20} color="var(--color-text-secondary)" />, title: 'Acompanha o crescimento', desc: 'Vê o score, visualizações e feedback em tempo real.' },
    ],
    cta: 'Criar o meu primeiro projeto', ctaPath: '/novo', ctaState: { type: 'personal', description: '' },
  },
  professor: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Acompanha e avalia os projetos dos teus alunos.',
    steps: [
      { icon: <GraduationCap size={20} color="var(--color-text-secondary)" />, title: 'Cria uma turma', desc: 'Gera um código único e partilha-o com os teus alunos para que se juntem.' },
      { icon: <BarChart2 size={20} color="var(--color-text-secondary)" />, title: 'Acompanha o progresso', desc: 'Vê scores, completude e evolução de cada aluno numa tabela clara.' },
      { icon: <MessageSquare size={20} color="var(--color-text-secondary)" />, title: 'Dá feedback', desc: 'Deixa comentários por secção diretamente nos projetos dos alunos.' },
    ],
    cta: 'Criar a minha primeira turma', ctaAction: 'createTurma',
  },
  recrutador: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Descobre talentos reais com projetos reais.',
    steps: [
      { icon: <Compass size={20} color="var(--color-text-secondary)" />, title: 'Explora projetos', desc: 'Navega por projetos de estudantes organizados por área e score.' },
      { icon: <Star size={20} color="var(--color-text-secondary)" />, title: 'Perfis completos', desc: 'Cada aluno tem uma página com links, tecnologias e contexto do projeto.' },
      { icon: <Mail size={20} color="var(--color-text-secondary)" />, title: 'Contacta diretamente', desc: 'Encontra o LinkedIn ou email de cada candidato no perfil.' },
    ],
    cta: 'Explorar projetos', ctaPath: '/explorar',
  },
  empresa: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Encontra o talento certo para a tua empresa.',
    steps: [
      { icon: <Search size={20} color="var(--color-text-secondary)" />, title: 'Descobre talento jovem', desc: 'Acede a projetos reais de estudantes do ensino profissional e universitário.' },
      { icon: <Trophy size={20} color="var(--color-text-secondary)" />, title: 'Filtra pelos melhores', desc: 'Os scores ajudam-te a identificar rapidamente os candidatos de destaque.' },
      { icon: <Users size={20} color="var(--color-text-secondary)" />, title: 'Estabelece contacto', desc: 'Cada perfil inclui links de contacto direto com o estudante.' },
    ],
    cta: 'Explorar projetos', ctaPath: '/explorar',
  },
}

function OnboardingAlunoModal({ user, profile, onDismiss, firstProject, claimedSlug }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(claimedSlug ? -1 : 0)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [area, setArea] = useState(profile?.area ?? '')
  const [skills, setSkills] = useState(profile?.skills ?? [])
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const resolvedUsername = username.trim() || profile?.username || user?.id
  const profileUrl = `${window.location.origin}/u/${resolvedUsername}`

  async function saveProfile() {
    setSaving(true); setSaveErr(null)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username: username.trim() || null, bio: bio.trim() || null, area: area || null, skills,
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) { setSaveErr(error.code === '23505' ? 'Este username já está a ser usado.' : 'Erro ao guardar.'); return }
    setStep(1)
  }

  const TOTAL = 3
  const AREAS = ['Programação e Informática','Design e Multimédia','Marketing e Comunicação','Gestão e Administração','Eletrónica e Automação','Audiovisual e Cinema','Turismo e Hotelaria','Saúde','Desporto','Artes e Espetáculo','Construção e Engenharia','Outra']
  const inputStyle = { width: '100%', background: 'var(--color-primary-subtle)', border: '1.5px solid var(--color-primary-muted)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', fontSize: 'var(--text-base)', padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary-muted)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', animation: 'dash-fade-up 0.25s var(--ease-out)' }}>

        {step === -1 && claimedSlug && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', opacity: 0.8 }}>
              <Check size={26} color="var(--color-success)" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              Olá{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! O teu projeto está guardado.
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              O projeto que criaste sem conta foi guardado na tua conta.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate(`/projeto/${claimedSlug}`) }}>Ir para o projeto</Button>
              <Button variant="secondary" fullWidth onClick={() => setStep(0)}>Saltar por agora</Button>
            </div>
          </div>
        )}

        {step === 0 && (
          <div style={{ padding: '36px 30px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <User size={24} color="var(--color-primary)" />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Completa o teu perfil</h2>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>O teu perfil é o teu cartão de visita.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
              <div>
                <SectionLabel>Username</SectionLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }}>@</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="o_teu_username" maxLength={30} style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
              </div>
              <div>
                <SectionLabel>Bio (opcional)</SectionLabel>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Estudante de Informática…" rows={3} maxLength={200} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div>
                <SectionLabel>Área (opcional)</SectionLabel>
                <select value={area} onChange={e => setArea(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Seleciona a tua área</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div><SkillsPicker label="Competências (opcional)" value={skills} onChange={setSkills} max={8} /></div>
            </div>
            {saveErr && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', padding: '8px 12px', background: 'var(--color-error-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-3)' }}>{saveErr}</div>}
            <Button onClick={saveProfile} disabled={saving} loading={saving} fullWidth iconRight={<ArrowRight size={15} />}>Guardar perfil</Button>
            <button onClick={() => { if (step < 2) setStep(s => s + 1); else onDismiss() }} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', cursor: 'pointer', marginTop: 12, fontFamily: 'inherit', padding: 0 }}>Saltar por agora</button>
          </div>
        )}

        {step === 1 && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Rocket size={24} color="var(--color-primary)" />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Cria o teu primeiro projeto</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 340 }}>
              Conta-nos o que fizeste, em poucas frases. Tratamos do resto.
            </p>
            <Card padding="md" style={{ textAlign: 'left', marginBottom: 'var(--sp-4)' }}>
              {[
                { icon: <Pencil size={15} color="var(--color-primary)" />, text: 'Formulário guiado passo a passo' },
                { icon: <Sparkles size={15} color="var(--color-primary)" />, text: 'IA analisa e melhora cada resposta' },
                { icon: <Globe size={15} color="var(--color-primary)" />, text: 'Página pública partilhável em segundos' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: i < 2 ? 8 : 0 }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>{item.text}
                </div>
              ))}
            </Card>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate('/novo') }}>Criar projeto</Button>
            <Button variant="secondary" fullWidth onClick={() => setStep(2)} style={{ marginTop: 'var(--sp-2)' }}>Já tenho projeto, avançar</Button>
            <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-base)', cursor: 'pointer', marginTop: 12, fontFamily: 'inherit', padding: 0 }}>Saltar</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', opacity: 0.8 }}>
              <Share2 size={24} color="var(--color-success)" />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Partilha a tua página</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 340 }}>
              A tua página de perfil está pronta. Envia-a a quem quiseres.
            </p>
            <Card padding="sm" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-5)', textAlign: 'left' }}>
              <Link size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--text-base)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileUrl}</span>
              <Button size="sm" variant={copied ? 'ghost' : 'secondary'} icon={copied ? <Check size={12} /> : <Copy size={12} />}
                onClick={() => { navigator.clipboard.writeText(profileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }) }}
                style={copied ? { color: 'var(--color-success)' } : undefined}>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </Card>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate(`/u/${resolvedUsername}`) }}>Ver a minha página</Button>
            <Button variant="secondary" fullWidth onClick={onDismiss} style={{ marginTop: 'var(--sp-2)' }}>Ir para o dashboard</Button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 22 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--color-primary)' : 'var(--color-border)', transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function OnboardingModal({ user, profile, onDismiss, onCreateTurma }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const role = profile?.role || 'aluno'
  const cfg = ONBOARDING[role] || ONBOARDING.aluno

  function handleCta() {
    onDismiss()
    if (cfg.ctaAction === 'createTurma') onCreateTurma()
    else if (cfg.ctaPath) navigate(cfg.ctaPath, cfg.ctaState ? { state: cfg.ctaState } : undefined)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary-muted)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', width: '100%', maxWidth: 440 }}>
        {step === 0 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src="/icon.png" alt="Showo" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
              <h2 style={{ color: 'var(--color-text)', fontSize: 'var(--text-xl)', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>{cfg.title}</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)', margin: 0, lineHeight: 1.5 }}>{cfg.subtitle}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 28 }}>
              {cfg.steps.map((s, i) => (
                <Card key={i} padding="md">
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ display: 'flex', flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                    <div>
                      <div style={{ color: 'var(--color-text)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.4 }}>{s.desc}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => setStep(1)}>Continuar</Button>
            <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-base)', cursor: 'pointer', marginTop: 14, fontFamily: 'inherit', padding: 0 }}>Saltar introdução</button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Rocket size={44} color="var(--color-primary)" /></div>
              <h2 style={{ color: 'var(--color-text)', fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Pronto para começar?</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', margin: 0, lineHeight: 1.55, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
                {role === 'aluno' && 'Cria o teu primeiro projeto e transforma o teu trabalho numa página profissional.'}
                {role === 'professor' && 'Cria a tua turma agora e partilha o código com os teus alunos.'}
                {role === 'recrutador' && 'Explora os projetos e descobre os talentos que procuras.'}
                {role === 'empresa' && 'Explora os projetos e encontra o teu próximo talento.'}
              </p>
            </div>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={handleCta}>{cfg.cta}</Button>
            <Button variant="secondary" fullWidth onClick={onDismiss} style={{ marginTop: 'var(--sp-2)' }}>Explorar primeiro</Button>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--color-primary)' : 'var(--color-border)', transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — Insights Block (student sidebar)
   ══════════════════════════════════════════════════════════════════════════ */

const SCORE_BREAKDOWN = [
  { label: 'Nome do projeto', pts: 5 },
  { label: 'Área do projeto', pts: 5 },
  { label: 'Problema descrito', pts: 15 },
  { label: 'Solução descrita', pts: 15 },
  { label: 'Público-alvo', pts: 10 },
  { label: 'Funcionalidades', pts: 10 },
  { label: 'Tecnologias / Ferramentas', pts: 8 },
  { label: 'Desafios encontrados', pts: 8 },
  { label: 'Resultados obtidos', pts: 12 },
  { label: 'Aprendizagens', pts: 12 },
  { label: 'Imagem de capa', pts: 10 },
]

const POTENTIAL_DIMS = [
  { key: 'quality',     label: 'Qualidade',    max: 30 },
  { key: 'depth',       label: 'Profundidade', max: 20 },
  { key: 'profile',     label: 'Perfil',       max: 15 },
  { key: 'validation',  label: 'Validação',    max: 20 },
  { key: 'consistency', label: 'Consistência', max: 15 },
]

function InsightsBlock({ projects, profile, username, copiedSlug, setCopiedSlug }) {
  const withScore = projects.filter(p => p.score != null)
  if (!withScore.length) return null
  const best = Math.max(...withScore.map(p => p.score))
  const avg = Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length)
  const { potential, breakdown } = profile ? calculatePotential({ projects, profile }) : { potential: 0, breakdown: {} }
  const bestColor = getScoreColor(best)

  return (
    <Card padding="md" style={{ overflow: 'hidden' }}>
      {/* Hero score */}
      <div style={{ textAlign: 'center', padding: '8px 0 16px', borderBottom: '1px solid var(--color-border)', marginBottom: 14 }}>
        <div style={{ fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-display)', color: bestColor, lineHeight: 1, letterSpacing: '-2px' }}>{best}</div>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Melhor score</div>
        {withScore.length > 1 && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
            Média <span style={{ fontWeight: 700, color: getScoreColor(avg) }}>{avg}</span> · {withScore.length} projetos
          </div>
        )}
      </div>

      {/* Potential ring + dims */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <ProgressRing value={potential} size={54} strokeWidth={4} color="var(--color-primary)">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-primary)', lineHeight: 1 }}>{potential}</div>
          </div>
        </ProgressRing>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Potencial</div>
          <ProgressBar value={potential} max={100} size="sm" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {POTENTIAL_DIMS.map(d => {
          const val = breakdown[d.key] ?? 0
          return (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 72, flexShrink: 0 }}>{d.label}</span>
              <ProgressBar value={val} max={d.max} size="sm" style={{ flex: 1 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', width: 24, textAlign: 'right', flexShrink: 0 }}>{val}</span>
            </div>
          )
        })}
      </div>

      {username && (
        <div style={{ padding: 'var(--sp-3) 0 0', marginTop: 'var(--sp-3)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link size={12} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            showo.pt/u/{username}
          </span>
          <Button size="sm" variant="ghost"
            icon={copiedSlug === '__profile__' ? <Check size={11} /> : <Copy size={11} />}
            style={copiedSlug === '__profile__' ? { color: 'var(--color-success)' } : undefined}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/u/${username}`).then(() => {
                setCopiedSlug('__profile__')
                setTimeout(() => setCopiedSlug(null), 1500)
              })
            }}>
            {copiedSlug === '__profile__' ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-component — Contextual next action
   ══════════════════════════════════════════════════════════════════════════ */

function NextStepBlock({ profNotifs, pendingTasks, myInterests, projects, profile, navigate, onDismissNotif }) {
  const hasDraft = profile?.project_draft && Object.keys(profile.project_draft).length > 0
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date())
  const revisionProject = projects.find(p => p.review_status === 'needs_revision')

  let step = null
  if (hasDraft) {
    const draftName = profile.project_draft?.name || 'o teu projeto'
    step = {
      icon: <Pencil size={16} />, iconColor: 'var(--color-warning)', iconBg: 'var(--color-warning-subtle)',
      label: 'Rascunho por terminar',
      title: `Continua "${draftName}"`,
      desc: 'Tens um projeto por completar. Retoma onde ficaste.',
      action: () => navigate('/novo'), actionLabel: 'Continuar',
    }
  } else if (profNotifs.length > 0) {
    step = {
      icon: <GraduationCap size={16} />, iconColor: 'var(--color-success)', iconBg: 'var(--color-success-subtle)',
      label: profNotifs.length === 1 ? '1 novidade do professor' : `${profNotifs.length} novidades`,
      title: profNotifs[0].message,
      desc: timeAgoLabel(profNotifs[0].created_at),
      action: () => onDismissNotif(profNotifs[0].id, profNotifs[0].project_slug), actionLabel: 'Ver feedback',
    }
  } else if (overdueTasks.length > 0) {
    const t = overdueTasks[0]
    step = {
      icon: <AlertTriangle size={16} />, iconColor: 'var(--color-error)', iconBg: 'var(--color-error-subtle)',
      label: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}`,
      title: t.title, desc: t.classes?.name,
      action: null, actionLabel: null,
    }
  } else if (revisionProject) {
    step = {
      icon: <AlertTriangle size={16} />, iconColor: 'var(--color-warning)', iconBg: 'var(--color-warning-subtle)',
      label: 'Projeto para rever',
      title: `"${revisionProject.name}" precisa de melhorias`,
      desc: 'O teu professor pediu alterações.',
      action: () => navigate(`/editar/${revisionProject.slug}`), actionLabel: 'Ver projeto',
    }
  } else if (myInterests.length > 0) {
    const rec = myInterests[0].recruiterProfile
    step = {
      icon: <Star size={16} />, iconColor: 'var(--color-warning)', iconBg: 'var(--color-warning-subtle)',
      label: 'Interesse de empresa',
      title: `${rec?.company || rec?.full_name || 'Uma empresa'} tem interesse no teu trabalho`,
      desc: myInterests[0].project?.name,
      action: () => navigate(`/mensagens?to=${myInterests[0].recruiter_id}`), actionLabel: 'Responder',
    }
  } else if (projects.length === 0) {
    step = {
      icon: <Rocket size={16} />, iconColor: 'var(--color-primary)', iconBg: 'var(--color-primary-subtle)',
      label: 'Começa aqui',
      title: 'Cria o teu primeiro projeto',
      desc: 'O teu portfólio começa com um projeto. Leva menos de 5 minutos.',
      action: () => navigate('/novo'), actionLabel: 'Criar projeto',
    }
  }

  if (!step) return null
  return (
    <Card padding="md" style={{ borderLeft: `3px solid ${step.iconColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: step.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: step.iconColor }}>
          {step.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: step.iconColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{step.label}</div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.title}</div>
          {step.desc && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 1 }}>{step.desc}</div>}
        </div>
        {step.action && (
          <Button size="sm" variant="secondary" onClick={step.action} style={{ flexShrink: 0 }}>{step.actionLabel}</Button>
        )}
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-component — Featured project card
   ══════════════════════════════════════════════════════════════════════════ */

function FeaturedProjectCard({ project, navigate, myInterests }) {
  if (!project) return null
  const scoreColor = getScoreColor(project.score)
  const interestCount = myInterests.filter(i => i.project?.id === project.id).length
  return (
    <Card padding="none" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', minHeight: 160 }}>
        {/* Cover — fixed width sidebar */}
        <div style={{ width: 160, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {project.cover_url
            ? <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, rgba(26,138,122,0.15) 100%)' }}>
                <Folder size={32} color="var(--color-primary)" style={{ opacity: 0.35 }} />
              </div>
          }
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Projeto principal</div>
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-text)', margin: '0 0 3px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</h2>
                {project.ai_tagline && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.ai_tagline}</p>}
              </div>
              <ProgressRing value={project.score ?? 0} size={44} strokeWidth={3.5} color={scoreColor}>
                <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor }}>{project.score ?? '—'}</span>
              </ProgressRing>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              {project.views > 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={10} />{project.views}</span>}
              {project.teacher_score != null && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}><GraduationCap size={10} />{project.teacher_score}/20</span>}
              {interestCount > 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} />{interestCount} empresa{interestCount > 1 ? 's' : ''}</span>}
              {project.review_status === 'needs_revision' && <Badge variant="warning">Rever</Badge>}
              {project.review_status === 'ready_for_defense' && <Badge variant="success">Pronto</Badge>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Button size="sm" variant="secondary" icon={<Pencil size={12} />} onClick={() => navigate(`/editar/${project.slug}`)}>Melhorar</Button>
            <Button size="sm" variant="ghost" icon={<ExternalLink size={12} />} onClick={() => navigate(`/projeto/${project.slug}`)}>Ver</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-component — 8-week activity chart (stacked bars, no lib)
   ══════════════════════════════════════════════════════════════════════════ */

function ActivityChart({ myInterests, feedbackHistory }) {
  const weeks = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const end = new Date(now); end.setDate(end.getDate() - i * 7); end.setHours(23, 59, 59, 999)
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
    const label = start.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace(/ de /g, ' ')
    weeks.push({ label, start, end, interests: 0, feedback: 0 })
  }
  myInterests.forEach(item => {
    const d = new Date(item.created_at)
    const w = weeks.find(w => d >= w.start && d <= w.end)
    if (w) w.interests++
  })
  feedbackHistory.forEach(item => {
    const d = new Date(item.created_at)
    const w = weeks.find(w => d >= w.start && d <= w.end)
    if (w) w.feedback++
  })
  const totalEvents = weeks.reduce((s, w) => s + w.interests + w.feedback, 0)
  if (totalEvents < 2) return null
  const max = Math.max(1, ...weeks.map(w => w.interests + w.feedback))
  const chartH = 140
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Atividade</div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginTop: 1 }}>Últimas 8 semanas</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-primary)', display: 'inline-block', flexShrink: 0 }} /> Empresas
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block', flexShrink: 0 }} /> Feedback
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: chartH }}>
        {weeks.map((w, i) => {
          const total = w.interests + w.feedback
          const iH = Math.max(total > 0 ? 4 : 0, (w.interests / max) * (chartH - 20))
          const fH = Math.max(total > 0 && w.feedback > 0 ? 4 : 0, (w.feedback / max) * (chartH - 20))
          const isLast = i === weeks.length - 1
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
              {total > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{total}</span>}
              <div style={{ width: '100%', maxWidth: 28, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {fH > 0 && (
                  <div style={{
                    width: '100%', height: fH,
                    background: 'var(--color-success)',
                    borderRadius: iH > 0 ? '4px 4px 0 0' : '4px',
                    transition: 'height 0.5s var(--ease-out)',
                    opacity: isLast ? 1 : 0.85,
                  }} />
                )}
                {iH > 0 && (
                  <div style={{
                    width: '100%', height: iH,
                    background: 'var(--color-primary)',
                    borderRadius: fH > 0 ? '0 0 4px 4px' : '4px',
                    transition: 'height 0.5s var(--ease-out)',
                    opacity: isLast ? 1 : 0.85,
                  }} />
                )}
                {total === 0 && <div style={{ width: '100%', height: 3, background: 'var(--color-border)', borderRadius: 3 }} />}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
        {weeks.map((w, i) => <span key={i} style={{ flex: 1, fontSize: 9, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.2 }}>{w.label}</span>)}
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD — Main Component
   ══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [claimedSlug] = useState(() => location.state?.claimedSlug ?? null)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [turmaYearFilter, setTurmaYearFilter] = useState('all')
  const [needsReview, setNeedsReview] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [upcomingDefenses, setUpcomingDefenses] = useState([])
  const [flaggedForRevision, setFlaggedForRevision] = useState([])
  const [resubmitted, setResubmitted] = useState([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [studentTurmas, setStudentTurmas] = useState([])
  const [loadingStudentTurmas, setLoadingStudentTurmas] = useState(true)
  const [profNotifs, setProfNotifs] = useState([])
  const [pendingTasks, setPendingTasks] = useState([])
  const [showCreateTurma, setShowCreateTurma] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [toast, setToast] = useState('')
  const [copiedSlug, setCopiedSlug] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showOnboardingAluno, setShowOnboardingAluno] = useState(false)

  const [collabProjects, setCollabProjects] = useState([])
  const [savedTalents, setSavedTalents] = useState([])
  const [savedTalentsLoading, setSavedTalentsLoading] = useState(true)
  const [savedTalentsKey, setSavedTalentsKey] = useState(0)
  const [myInterests, setMyInterests] = useState([])
  const [myInterestsLoading, setMyInterestsLoading] = useState(false)
  const [recruiterVagas, setRecruiterVagas] = useState([])
  const [partnerLeads, setPartnerLeads] = useState([])
  const [partnerLeadsLoading, setPartnerLeadsLoading] = useState(true)
  const [inviteTarget, setInviteTarget] = useState(null)
  const [resumoOpen, setResumoOpen] = useState(false)
  const [feedbackHistory, setFeedbackHistory] = useState([])

  /* ── Admin redirect ── */
  useEffect(() => {
    if (!authLoading && isAdmin) navigate('/admin', { replace: true })
  }, [authLoading, isAdmin, navigate])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function copyProjectLink(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/projeto/${slug}`).then(() => {
      setCopiedSlug(slug); setTimeout(() => setCopiedSlug(null), 2500)
    })
  }

  function dismissOnboarding() { localStorage.setItem(`showo_onboarded_${user.id}`, '1'); setShowOnboarding(false) }
  function dismissOnboardingAluno() { localStorage.setItem(`showo_onb_v2_${user.id}`, '1'); setShowOnboardingAluno(false) }

  /* ── Auth guard ── */
  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [user, authLoading, navigate])

  /* ── Onboarding trigger ── */
  useEffect(() => {
    if (!user || !profile) return
    const isAluno = !profile.role || profile.role === 'aluno'
    if (isAluno) {
      if (!localStorage.getItem(`showo_onb_v2_${user.id}`)) setShowOnboardingAluno(true)
    } else {
      if (!localStorage.getItem(`showo_onboarded_${user.id}`)) setShowOnboarding(true)
    }
  }, [user, profile])

  /* ── Load student's own projects ── */
  useEffect(() => {
    if (!user) return
    async function load() {
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        const fallback = await supabase.from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        data = fallback.data; error = fallback.error
      }
      setProjects((data || []).map(p => ({
        ...p, collaborator_count: Array.isArray(p.collaborator_count) ? (p.collaborator_count[0]?.count ?? 0) : (p.collaborator_count ?? 0),
      })))
      setLoadingProjects(false)
    }
    load()
  }, [user])

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast('Projeto eliminado.')
  }

  /* ── Load collab projects ── */
  useEffect(() => {
    if (!user) return
    async function loadCollabProjects() {
      const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('user_id', user.id).eq('status', 'accepted')
      if (!collabs?.length) return
      const { data: projs } = await supabase.from('projects').select('id, name, slug, score, area, ai_tagline, creator_name, created_at, views').in('id', collabs.map(c => c.project_id)).order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    loadCollabProjects()
  }, [user])

  /* ── Saved talents (recruiter/empresa) ── */
  useEffect(() => {
    if (!user) return
    if (profile?.role !== 'recrutador' && profile?.role !== 'empresa') { setSavedTalentsLoading(false); return }
    setSavedTalentsLoading(true)
    async function loadSavedTalents() {
      const { data: interests } = await supabase.from('recruiter_interests').select('project_id, created_at').eq('recruiter_id', user.id).order('created_at', { ascending: false }).limit(20)
      if (!interests?.length) { setSavedTalents([]); setSavedTalentsLoading(false); return }
      const { data: projects } = await supabase.from('projects').select('id, name, slug, score, area, creator_name, course, school_year, avatar_url, user_id, ai_tagline').in('id', interests.map(i => i.project_id))
      if (!projects?.length) { setSavedTalents([]); setSavedTalentsLoading(false); return }
      const ownerIds = [...new Set(projects.map(p => p.user_id).filter(Boolean))]
      let profileMap = {}
      if (ownerIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ownerIds)
        profs?.forEach(p => { profileMap[p.id] = p })
      }
      setSavedTalents(interests.map(i => { const p = projects.find(pr => pr.id === i.project_id); return p ? { ...p, savedAt: i.created_at, ownerProfile: profileMap[p.user_id] } : null }).filter(Boolean))
      setSavedTalentsLoading(false)
    }
    loadSavedTalents()
  }, [user, profile?.role, savedTalentsKey])

  /* ── Student's recruiter interests ── */
  useEffect(() => {
    const role = profile?.role
    if (!user || role === 'professor' || role === 'recrutador' || role === 'empresa') return
    setMyInterestsLoading(true)
    async function loadMyInterests() {
      const { data: myProjs } = await supabase.from('projects').select('id, name, slug').eq('user_id', user.id)
      if (!myProjs?.length) { setMyInterests([]); setMyInterestsLoading(false); return }
      const projMap = {}; myProjs.forEach(p => { projMap[p.id] = p })
      const { data: interests } = await supabase.from('recruiter_interests').select('recruiter_id, project_id, created_at').in('project_id', myProjs.map(p => p.id)).order('created_at', { ascending: false })
      if (!interests?.length) { setMyInterests([]); setMyInterestsLoading(false); return }
      const recruiterIds = [...new Set(interests.map(i => i.recruiter_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url, company, role').in('id', recruiterIds)
      const profMap = {}; profs?.forEach(p => { profMap[p.id] = p })
      setMyInterests(interests.map(i => ({ ...i, recruiterProfile: profMap[i.recruiter_id], project: projMap[i.project_id] })).filter(i => i.recruiterProfile && i.project))
      setMyInterestsLoading(false)
    }
    loadMyInterests()
  }, [user, profile?.role])

  /* ── Recruiter vagas ── */
  useEffect(() => {
    if (!user || (profile?.role !== 'recrutador' && profile?.role !== 'empresa')) return
    supabase.from('vagas').select('id, title:titulo, location:localizacao, type:tipo').eq('recruiter_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).then(({ data }) => setRecruiterVagas(data || []))
  }, [user, profile?.role])

  /* ── Partner leads (empresa) ── */
  useEffect(() => {
    if (!user || profile?.role !== 'empresa') { setPartnerLeadsLoading(false); return }
    async function loadPartnerLeads() {
      const { data: companies } = await supabase.from('partner_companies').select('id, name').eq('claimed_by', user.id)
      if (!companies?.length) { setPartnerLeads([]); setPartnerLeadsLoading(false); return }
      const companyNameById = {}; companies.forEach(c => { companyNameById[c.id] = c.name })
      const { data: leadRows } = await supabase.from('internship_leads').select('id, student_id, company_id, status, created_at').in('company_id', companies.map(c => c.id)).order('created_at', { ascending: false })
      if (!leadRows?.length) { setPartnerLeads([]); setPartnerLeadsLoading(false); return }
      const studentIds = [...new Set(leadRows.map(l => l.student_id))]
      const { data: students } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', studentIds)
      const studentById = {}; (students || []).forEach(s => { studentById[s.id] = s })
      setPartnerLeads(leadRows.map(l => ({ ...l, companyName: companyNameById[l.company_id], student: studentById[l.student_id] })))
      setPartnerLeadsLoading(false)
    }
    loadPartnerLeads()
  }, [user, profile?.role])

  async function updatePartnerLeadStatus(leadId, status) {
    setPartnerLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    await supabase.from('internship_leads').update({ status }).eq('id', leadId)
  }

  /* ── Teacher turmas + review data ── */
  useEffect(() => {
    if (!user || profile?.role !== 'professor') return
    async function loadTurmas() {
      const { data: cls } = await supabase.from('classes').select('id, name, subject, code, academic_year, created_at').eq('teacher_id', user.id).order('created_at', { ascending: false })
      if (!cls?.length) { setTurmas([]); setNeedsReview([]); setFlaggedForRevision([]); setResubmitted([]); setTotalMembers(0); setWeeklyActivity([]); return }

      const [{ data: cp }, { data: members }] = await Promise.all([
        supabase.from('class_projects').select('class_id, project_id').in('class_id', cls.map(c => c.id)),
        supabase.from('class_members').select('class_id, user_id').in('class_id', cls.map(c => c.id)),
      ])
      setTotalMembers(new Set((members || []).map(m => m.user_id)).size)

      const counts = {}; const classProjects = {}
      cp?.forEach(r => { counts[r.class_id] = (counts[r.class_id] || 0) + 1; if (!classProjects[r.class_id]) classProjects[r.class_id] = []; classProjects[r.class_id].push(r.project_id) })

      const allProjectIds = cp?.map(r => r.project_id) ?? []
      let scoreMap = {}
      const classNameByProject = {}
      Object.entries(classProjects).forEach(([classId, ids]) => { const cls_ = cls.find(c => c.id === classId); ids.forEach(pid => { classNameByProject[pid] = cls_?.name }) })

      if (allProjectIds.length) {
        const [{ data: projDetails }, { data: myFeedback }] = await Promise.all([
          supabase.from('projects').select('id, name, slug, creator_name, score, created_at, defense_date, review_status').in('id', allProjectIds),
          supabase.from('teacher_feedback').select('project_id').eq('teacher_id', user.id).in('project_id', allProjectIds),
        ])
        const projs = projDetails || []
        projs.forEach(p => { scoreMap[p.id] = p.score })
        const reviewedIds = new Set((myFeedback || []).map(f => f.project_id))
        setNeedsReview(projs.filter(p => !reviewedIds.has(p.id)).map(p => ({ ...p, className: classNameByProject[p.id] })))
        setFlaggedForRevision(projs.filter(p => p.review_status === 'needs_revision').map(p => ({ ...p, className: classNameByProject[p.id] })))
        setResubmitted(projs.filter(p => p.review_status === 'resubmitted').map(p => ({ ...p, className: classNameByProject[p.id] })))
        setRecentActivity([...projs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(p => ({ ...p, className: classNameByProject[p.id] })))

        const weeks = []
        const now = new Date()
        const mondayOf = d => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x }
        const thisMonday = mondayOf(now)
        for (let i = 7; i >= 0; i--) { const start = new Date(thisMonday); start.setDate(start.getDate() - i * 7); const end = new Date(start); end.setDate(end.getDate() + 7); weeks.push({ start, end, label: start.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }), count: 0 }) }
        projs.forEach(p => { const created = new Date(p.created_at); const bucket = weeks.find(w => created >= w.start && created < w.end); if (bucket) bucket.count++ })
        setWeeklyActivity(weeks.map(w => ({ label: w.label, count: w.count })))

        const today = new Date(); today.setHours(0, 0, 0, 0)
        setUpcomingDefenses(projs.filter(p => p.defense_date && new Date(p.defense_date + 'T00:00:00') >= today).map(p => ({ ...p, className: classNameByProject[p.id], daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000) })).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5))
      } else {
        setNeedsReview([]); setRecentActivity([]); setUpcomingDefenses([]); setFlaggedForRevision([]); setResubmitted([]); setWeeklyActivity([])
      }

      const memberCounts = {}; members?.forEach(m => { memberCounts[m.class_id] = (memberCounts[m.class_id] || 0) + 1 })
      setTurmas(cls.map(c => {
        const ids = classProjects[c.id] ?? []
        const scores = ids.map(id => scoreMap[id]).filter(s => s != null)
        const avg_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
        return { ...c, project_count: counts[c.id] ?? 0, member_count: memberCounts[c.id] ?? 0, avg_score }
      }))
    }
    loadTurmas()
  }, [user, profile?.role])

  /* ── Student turmas ── */
  useEffect(() => {
    if (!user || profile?.role === 'professor') { setLoadingStudentTurmas(false); return }
    async function loadStudentTurmas() {
      const lsKey = `showo_turmas_${user.id}`
      let cached = []; try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}
      let dbTurmas = []
      const { data: myProjs } = await supabase.from('projects').select('id').eq('user_id', user.id)
      if (myProjs?.length) {
        const { data: cp } = await supabase.from('class_projects').select('class_id').in('project_id', myProjs.map(p => p.id))
        if (cp?.length) {
          const classIds = [...new Set(cp.map(r => r.class_id))]
          const { data: classes } = await supabase.from('classes').select('id, name, code, teacher_name').in('id', classIds)
          dbTurmas = classes || []
        }
      }
      const dbIds = new Set(dbTurmas.map(t => t.id))
      setStudentTurmas([...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))])
      setLoadingStudentTurmas(false)
    }
    loadStudentTurmas()
  }, [user, profile?.role])

  /* ── Pending tasks (aluno) ── */
  useEffect(() => {
    if (!user || profile?.role === 'professor') return
    async function loadPendingTasks() {
      const { data: memberships } = await supabase.from('class_members').select('class_id').eq('user_id', user.id)
      if (!memberships?.length) { setPendingTasks([]); return }
      const classIds = [...new Set(memberships.map(m => m.class_id))]
      const { data: taskRows } = await supabase.from('class_tasks').select('id, title, due_date, class_id, classes(name, teacher_id)').in('class_id', classIds)
      if (!taskRows?.length) { setPendingTasks([]); return }
      const { data: myCompletions } = await supabase.from('class_task_completions').select('task_id').eq('user_id', user.id).in('task_id', taskRows.map(t => t.id))
      const doneIds = new Set((myCompletions || []).map(c => c.task_id))
      setPendingTasks(taskRows.filter(t => !doneIds.has(t.id)).sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1))
    }
    loadPendingTasks()
  }, [user, profile?.role])

  async function completePendingTask(taskId) {
    const task = pendingTasks.find(t => t.id === taskId)
    setPendingTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('class_task_completions').insert({ task_id: taskId, user_id: user.id })
    if (task?.classes?.teacher_id) {
      const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Um aluno'
      supabase.rpc('create_notification', { p_user_id: task.classes.teacher_id, p_type: 'TASK_COMPLETED', p_message: `${studentName} concluiu a tarefa "${task.title}" em "${task.classes.name}".` })
    }
  }

  /* ── Professor notifications (aluno) ── */
  useEffect(() => {
    if (!user || profile?.role === 'professor') return
    supabase.from('notifications').select('id, message, project_slug, created_at').eq('user_id', user.id).eq('type', 'TEACHER_FEEDBACK').eq('read', false).order('created_at', { ascending: false }).limit(5).then(({ data }) => { if (data) setProfNotifs(data) })
  }, [user, profile?.role])

  /* ── All feedback notifications (for chart) ── */
  useEffect(() => {
    if (!user || profile?.role === 'professor') return
    supabase.from('notifications').select('id, created_at').eq('user_id', user.id).eq('type', 'TEACHER_FEEDBACK').order('created_at', { ascending: false }).limit(60).then(({ data }) => { if (data) setFeedbackHistory(data) })
  }, [user, profile?.role])

  async function dismissProfNotif(id, slug) {
    setProfNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (slug) navigate(`/projeto/${slug}`)
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <Navbar />
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, var(--color-primary) 35%, var(--color-accent) 65%, transparent 100%)', opacity: 0.4 }} />
        <div className="page-content" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
          <div className="dash-skeleton" style={{ height: 48, width: '60%', marginBottom: 24 }} />
          <div className="dash-skeleton" style={{ height: 16, width: '30%', marginBottom: 40 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="dash-skeleton" style={{ height: 72, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${i * 0.15}s` }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                  <div style={{ height: 10, width: '65%', borderRadius: 4, background: 'var(--color-bg-alt, rgba(255,255,255,0.04))' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null
  if (isAdmin) return null

  const firstName = getDisplayName(user)
  const scores = projects.map(p => p.score).filter(s => s != null)
  const bestScore = scores.length ? Math.max(...scores) : null
  const totalViews = projects.reduce((sum, p) => sum + (p.views ?? 0), 0)
  const isTeacher = profile?.role === 'professor'
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 20) return `Boa tarde, ${firstName}`
    if (h >= 20 && h < 23) return `Boa noite, ${firstName}`
    if (h >= 23 || h < 1) return `Ainda aqui, ${firstName}?`
    return `A acabar à última da hora, ${firstName}?`
  })()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <Navbar />

      {showOnboardingAluno && (
        <OnboardingAlunoModal user={user} profile={profile} onDismiss={dismissOnboardingAluno} firstProject={projects[0] ?? null} claimedSlug={claimedSlug} />
      )}
      {showOnboarding && (
        <OnboardingModal user={user} profile={profile} onDismiss={dismissOnboarding} onCreateTurma={() => { dismissOnboarding(); setShowCreateTurma(true) }} />
      )}

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s var(--ease-out)',
        background: 'var(--color-surface)', border: '1px solid var(--color-border-hover)', borderRadius: 'var(--radius-lg)',
        padding: '12px 24px', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)',
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-lg)',
      }}>{toast}</div>

      {showCreateTurma && <CreateTurmaModal onClose={() => setShowCreateTurma(false)} onCreated={turma => setTurmas(prev => [{ ...turma, project_count: 0 }, ...prev])} />}
      {showJoinModal && <JoinTurmaModal onClose={() => setShowJoinModal(false)} navigate={navigate} onJoined={(turma) => {
        setStudentTurmas(prev => prev.find(t => t.id === turma.id) ? prev : [...prev, turma])
        try { const lsKey = `showo_turmas_${user.id}`; const existing = JSON.parse(localStorage.getItem(lsKey) || '[]'); if (!existing.find(t => t.id === turma.id)) localStorage.setItem(lsKey, JSON.stringify([...existing, turma])) } catch {}
      }} />}
      {showTurmasModal && <TurmasListModal turmas={studentTurmas} onClose={() => setShowTurmasModal(false)} navigate={navigate} onJoin={() => setShowJoinModal(true)} />}

      {/* Brand accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, var(--color-primary) 35%, var(--color-accent) 65%, transparent 100%)', opacity: 0.4 }} />

      <div style={{ padding: '24px 20px 40px', boxSizing: 'border-box' }}>

        {/* ══════════════════════ HEADER ══════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px', lineHeight: 1.15, margin: '0 0 4px', color: 'var(--color-text)' }}>{greeting}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant="primary">
                {{ aluno: 'Aluno', professor: 'Professor', recrutador: 'Recrutador', empresa: 'Empresa' }[profile?.role] ?? 'Aluno'}
              </Badge>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>{user.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isTeacher && !isRecruiter && (
              <>
                <Button variant="secondary" size="sm" icon={<User size={14} />} onClick={() => navigate(`/u/${profile?.username || ''}`)}>Perfil</Button>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate('/novo')}>Novo projeto</Button>
              </>
            )}
            {isTeacher && (
              <Button variant="secondary" size="sm" icon={<User size={14} />} onClick={() => navigate(`/u/${profile?.username || ''}`)}>Perfil</Button>
            )}
          </div>
        </div>

        {/* ══════════════════════ STUDENT DASHBOARD ══════════════════════ */}
        {!isTeacher && !isRecruiter && (
          <>
            {/* Defense countdown — only shown if within 7 days */}
            {!loadingProjects && (() => {
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const upcoming = projects.filter(p => p.defense_date).map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000) })).sort((a, b) => a.daysLeft - b.daysLeft)
              const next = upcoming[0]
              if (!next || next.daysLeft < 0 || next.daysLeft > 7) return null
              const urgentVariant = next.daysLeft === 0 ? 'error' : 'warning'
              const defenseDate = new Date(next.defense_date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'long' })
              return (
                <Card hoverable onClick={() => navigate(`/projeto/${next.slug}`)} padding="md" style={{ marginBottom: 14, borderColor: `var(--color-${urgentVariant})` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Badge variant={urgentVariant} dot style={{ marginBottom: 4 }}>{next.daysLeft === 0 ? 'Defesa hoje!' : `Defesa em ${next.daysLeft} dias`}</Badge>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>{next.name} — {defenseDate}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)', color: `var(--color-${urgentVariant})`, lineHeight: 1 }}>{next.daysLeft}</div>
                      <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: `var(--color-${urgentVariant})`, textTransform: 'uppercase' }}>dias</div>
                    </div>
                  </div>
                </Card>
              )
            })()}

            {/* ─── Bento grid ─── */}
            <div className="dash-bento">

              {/* LEFT col — score + project list */}
              <div className="dash-bento-col">
                {!loadingProjects && (
                  projects.length > 0
                    ? <InsightsBlock projects={projects} profile={profile} username={profile?.username} copiedSlug={copiedSlug} setCopiedSlug={setCopiedSlug} />
                    : (
                      <Card padding="md" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 52, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-tertiary)', lineHeight: 1, marginBottom: 8 }}>—</div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Score</div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>Cria o primeiro projeto para ver o teu score</p>
                      </Card>
                    )
                )}

                {!loadingProjects && projects.length > 0 && (
                  <Card padding="none" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projetos · {projects.length}</span>
                      <Button size="sm" variant="ghost" icon={<Plus size={11} />} onClick={() => navigate('/novo')}>Novo</Button>
                    </div>
                    {projects.slice(0, 5).map((p, i) => {
                      const sc = getScoreColor(p.score)
                      return (
                        <div key={p.id} className="dash-mini-proj-row"
                          style={{ borderBottom: i < Math.min(projects.length, 5) - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onClick={() => navigate(`/projeto/${p.slug}`)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>{p.area || '—'}{p.views > 0 ? ` · ${p.views} views` : ''}</div>
                          </div>
                          <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, fontFamily: 'var(--font-display)', color: sc, flexShrink: 0 }}>{p.score ?? '—'}</span>
                        </div>
                      )
                    })}
                  </Card>
                )}

                {collabProjects.length > 0 && (
                  <Card padding="none" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <Users size={12} color="var(--color-text-tertiary)" />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Partilhados · {collabProjects.length}</span>
                    </div>
                    {collabProjects.slice(0, 3).map((p, i) => {
                      const sc = getScoreColor(p.score)
                      return (
                        <div key={p.id} className="dash-mini-proj-row"
                          style={{ borderBottom: i < Math.min(collabProjects.length, 3) - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onClick={() => navigate(`/projeto/${p.slug}`)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{p.area || '—'}</div>
                          </div>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, fontFamily: 'var(--font-display)', color: sc }}>{p.score ?? '—'}</span>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </div>

              {/* CENTER col — featured + chart + interests */}
              <div className="dash-bento-col">
                {loadingProjects
                  ? <div className="dash-skeleton" style={{ height: 280 }} />
                  : projects.length > 0
                    ? <FeaturedProjectCard project={projects.reduce((b, p) => ((p.score ?? 0) >= (b?.score ?? 0) ? p : b), projects[0])} navigate={navigate} myInterests={myInterests} />
                    : (
                      <Card padding="lg" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 220 }}>
                        <Rocket size={40} color="var(--color-primary)" style={{ opacity: 0.35 }} />
                        <div>
                          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 8 }}>O teu portfólio começa aqui</div>
                          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Cria o teu primeiro projeto e partilha o que estás a construir.</p>
                          <Button variant="primary" icon={<Plus size={14} />} onClick={() => navigate('/novo')}>Criar projeto</Button>
                        </div>
                      </Card>
                    )
                }

                <ActivityChart myInterests={myInterests} feedbackHistory={feedbackHistory} />

                {myInterests.length > 0 && (
                  <Card padding="none" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <Star size={12} color="var(--color-warning)" />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>Empresas interessadas</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning-subtle)', borderRadius: 'var(--radius-full)', padding: '1px 7px' }}>{myInterests.length}</span>
                    </div>
                    {myInterests.map((item, idx) => {
                      const rec = item.recruiterProfile
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: idx < myInterests.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--color-warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {rec.avatar_url ? <img src={rec.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={14} color="var(--color-warning)" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.company || rec.full_name || 'Recrutador'}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.project?.name}</div>
                          </div>
                          <Button size="sm" variant="secondary" icon={<MessageSquare size={11} />} onClick={() => navigate(`/mensagens?to=${item.recruiter_id}`)}>Mensagem</Button>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </div>

              {/* RIGHT col — next step + turma + tasks + prof notifs */}
              <div className="dash-bento-col dash-bento-right">
                {!loadingProjects && (
                  <NextStepBlock profNotifs={profNotifs} pendingTasks={pendingTasks} myInterests={myInterests} projects={projects} profile={profile} navigate={navigate} onDismissNotif={dismissProfNotif} />
                )}
                {/* Fallback: profile share card when there's no contextual action */}
                {!loadingProjects && projects.length > 0 && (() => {
                  const hasDraft = profile?.project_draft && Object.keys(profile.project_draft).length > 0
                  const hasAnyAction = hasDraft || profNotifs.length > 0 || pendingTasks.some(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()) || projects.some(p => p.review_status === 'needs_revision') || myInterests.length > 0
                  if (hasAnyAction || !profile?.username) return null
                  return (
                    <Card padding="md">
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>O teu perfil</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
                        Partilha a tua página com recrutadores e professores.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 10 }}>
                        <Link size={11} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>showo.pt/u/{profile.username}</span>
                      </div>
                      <Button size="sm" variant="secondary" fullWidth icon={<Copy size={11} />}
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)}>
                        Copiar link
                      </Button>
                    </Card>
                  )
                })()}

                {!loadingStudentTurmas && (
                  studentTurmas.length > 0 ? (
                    <Card hoverable onClick={() => studentTurmas.length === 1 ? navigate(`/turma/${studentTurmas[0].code}`) : setShowTurmasModal(true)} padding="md">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users2 size={15} color="var(--color-primary)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {studentTurmas.length === 1 ? studentTurmas[0].name : `${studentTurmas.length} turmas`}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 1 }}>
                            {studentTurmas.length === 1 ? (studentTurmas[0].teacher_name || 'Ver turma') : studentTurmas.map(t => t.name).join(' · ')}
                          </div>
                        </div>
                        <ChevronRight size={13} color="var(--color-text-tertiary)" />
                      </div>
                    </Card>
                  ) : (
                    <Card hoverable onClick={() => setShowJoinModal(true)} padding="md">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users2 size={15} color="var(--color-primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>Junta-te a uma turma</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 1 }}>Código de 6 letras do professor</div>
                        </div>
                        <Badge variant="primary">Entrar</Badge>
                      </div>
                    </Card>
                  )
                )}

                {pendingTasks.length > 0 && (
                  <Card padding="sm">
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ListChecks size={11} /> Tarefas · {pendingTasks.length}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pendingTasks.slice(0, 4).map(t => {
                        const overdue = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => completePendingTask(t.id)} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
                              <Circle size={14} color="var(--color-text-tertiary)" />
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                              {t.due_date && <div style={{ fontSize: 'var(--text-xs)', color: overdue ? 'var(--color-error)' : 'var(--color-text-tertiary)', fontWeight: overdue ? 700 : 400 }}>{new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}{overdue ? ' — atrasada' : ''}</div>}
                            </div>
                          </div>
                        )
                      })}
                      {pendingTasks.length > 4 && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', paddingLeft: 22 }}>+{pendingTasks.length - 4} mais</div>}
                    </div>
                  </Card>
                )}

                {profNotifs.length > 0 && (
                  <Card padding="none" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <GraduationCap size={12} color="var(--color-success)" />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>Professor</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', borderRadius: 'var(--radius-full)', padding: '1px 7px' }}>{profNotifs.length}</span>
                    </div>
                    {profNotifs.map((n, i) => (
                      <FeedItem key={n.id} onClick={() => dismissProfNotif(n.id, n.project_slug)}
                        icon={<GraduationCap size={13} color="var(--color-success)" />}
                        iconBg="var(--color-success-subtle)" iconColor="var(--color-success)"
                        title={n.message} subtitle={timeAgoLabel(n.created_at)}
                        style={i < profNotifs.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : undefined}
                      />
                    ))}
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════ TEACHER DASHBOARD ══════════════════════ */}
        {isTeacher && (
          <>
            {/* Stats */}
            {turmas.length > 0 && (
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
                {[
                  { label: 'Alunos', value: totalMembers },
                  { label: 'Projetos', value: turmas.reduce((s, t) => s + (t.project_count || 0), 0) },
                  { label: 'Score médio', value: (() => { const ws = turmas.filter(t => t.avg_score != null); return ws.length ? Math.round(ws.reduce((s, t) => s + t.avg_score, 0) / ws.length) : '—' })() },
                  { label: 'Por rever', value: needsReview.length, accent: needsReview.length > 0 },
                ].map(stat => (
                  <Card key={stat.label} padding="md" style={stat.accent ? { borderColor: 'var(--color-error)' } : undefined}>
                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.accent ? 'var(--color-error)' : 'var(--color-primary)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 6 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>
            )}

            {/* Weekly activity chart */}
            {turmas.length > 0 && weeklyActivity.some(w => w.count > 0) && (
              <Card padding="md" style={{ marginBottom: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)' }}>
                  <BarChart2 size={13} color="var(--color-text-tertiary)" />
                  <SectionLabel style={{ marginBottom: 0 }}>Projetos submetidos — últimas 8 semanas</SectionLabel>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
                  {(() => {
                    const max = Math.max(1, ...weeklyActivity.map(w => w.count))
                    return weeklyActivity.map(w => (
                      <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: w.count > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>{w.count > 0 ? w.count : ''}</span>
                        <div style={{ width: '100%', maxWidth: 28, height: `${Math.max(4, (w.count / max) * 56)}px`, background: w.count > 0 ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: 'var(--radius-xs)', transition: 'height 0.3s var(--ease-out)' }} />
                      </div>
                    ))
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {weeklyActivity.map(w => <span key={w.label} style={{ flex: 1, fontSize: 9, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>{w.label}</span>)}
                </div>
                {!profile?.monthly_report_opt_in && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Recebe este resumo por email todos os meses.</span>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/settings')}>Ativar relatório mensal</Button>
                  </div>
                )}
              </Card>
            )}

            {/* Teacher onboarding steps */}
            {(() => {
              const done = (turmas.length > 0 ? 1 : 0) + (totalMembers > 0 ? 1 : 0)
              if (done >= 2) return null
              const step = turmas.length === 0
                ? { Icon: Users2, title: 'Cria a tua primeira turma', desc: 'Gera um código e partilha-o com os teus alunos.', cta: 'Criar turma', action: () => setShowCreateTurma(true) }
                : { Icon: Users, title: 'Convida os teus alunos', desc: `Partilha o código de ${turmas[0]?.name ?? 'uma turma'}.`, cta: 'Ver turma', action: () => navigate(`/turma/${turmas[0]?.code}`) }
              return (
                <div style={{ marginBottom: 'var(--sp-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-2)' }}>
                    <SectionLabel style={{ marginBottom: 0 }}>Primeiros passos</SectionLabel>
                    <ProgressBar value={done} max={2} size="sm" style={{ width: 60 }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{done}/2</span>
                  </div>
                  <Card padding="md" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <step.Icon size={20} color="var(--color-primary)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{step.title}</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{step.desc}</div>
                      </div>
                      <Button onClick={step.action}>{step.cta}</Button>
                    </div>
                  </Card>
                </div>
              )
            })()}

            {/* Teacher 2-column */}
            <div className="dash-teacher-grid">
              {/* Left: turmas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                <div className="dash-section">
                  <div className="dash-sec-header">
                    <div className="dash-sec-label"><Users2 size={13} /> As minhas turmas {turmas.length > 0 && <span className="dash-sec-count">{turmas.length}</span>}</div>
                    <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setShowCreateTurma(true)}>Nova turma</Button>
                  </div>
                  {(() => {
                    const years = [...new Set(turmas.map(t => t.academic_year).filter(Boolean))].sort().reverse()
                    if (years.length >= 2) return (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
                        {['all', ...years].map(y => (
                          <Button key={y} size="sm" variant={turmaYearFilter === y ? 'primary' : 'ghost'} onClick={() => setTurmaYearFilter(y)}>
                            {y === 'all' ? 'Todos' : y}
                          </Button>
                        ))}
                      </div>
                    )
                    return null
                  })()}
                  {turmas.length === 0 ? (
                    <EmptyState icon={<Users2 size={24} />} title="Ainda não tens turmas" description="Cria uma turma e partilha o código com os teus alunos." action={() => setShowCreateTurma(true)} actionLabel="Criar primeira turma" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      {turmas.filter(t => turmaYearFilter === 'all' || t.academic_year === turmaYearFilter).map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: review feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                {resubmitted.length > 0 && (
                  <div className="dash-section">
                    <div className="dash-sec-header">
                      <div className="dash-sec-label"><Check size={13} /> Correções enviadas <span className="dash-sec-count">{resubmitted.length}</span></div>
                    </div>
                    <Card padding="none" style={{ overflow: 'hidden', borderColor: 'var(--color-info)' }}>
                      {resubmitted.slice(0, 5).map((p, i) => (
                        <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                          icon={<Check size={14} color="var(--color-info)" />}
                          iconBg="var(--color-info-subtle)" iconColor="var(--color-info)"
                          title={p.name}
                          subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''} · pronto para nova revisão`}
                        />
                      ))}
                      {resubmitted.length > 5 && <div style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>+{resubmitted.length - 5} mais</div>}
                    </Card>
                  </div>
                )}

                {needsReview.length > 0 && (
                  <div className="dash-section">
                    <div className="dash-sec-header">
                      <div className="dash-sec-label"><MessageSquare size={13} /> Precisa da tua atenção <span className="dash-sec-count">{needsReview.length}</span></div>
                    </div>
                    <Card padding="none" style={{ overflow: 'hidden' }}>
                      {needsReview.slice(0, 5).map(p => (
                        <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                          icon={<Folder size={14} color="var(--color-warning)" />}
                          iconBg="var(--color-warning-subtle)" iconColor="var(--color-warning)"
                          title={p.name}
                          subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''} · sem feedback teu`}
                        />
                      ))}
                      {needsReview.length > 5 && <div style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>+{needsReview.length - 5} mais</div>}
                    </Card>
                  </div>
                )}

                {flaggedForRevision.length > 0 && (
                  <div className="dash-section">
                    <div className="dash-sec-header">
                      <div className="dash-sec-label"><AlertTriangle size={13} /> A aguardar revisão <span className="dash-sec-count">{flaggedForRevision.length}</span></div>
                    </div>
                    <Card padding="none" style={{ overflow: 'hidden' }}>
                      {flaggedForRevision.slice(0, 5).map(p => (
                        <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                          icon={<AlertTriangle size={14} color="var(--color-accent)" />}
                          iconBg="var(--color-accent-subtle)" iconColor="var(--color-accent)"
                          title={p.name}
                          subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''} · a aguardar correções`}
                        />
                      ))}
                    </Card>
                  </div>
                )}

                {upcomingDefenses.length > 0 && (
                  <div className="dash-section">
                    <div className="dash-sec-header">
                      <div className="dash-sec-label"><Calendar size={13} /> Próximas defesas <span className="dash-sec-count">{upcomingDefenses.length}</span></div>
                    </div>
                    <Card padding="none" style={{ overflow: 'hidden' }}>
                      {upcomingDefenses.map(p => {
                        const urgentVariant = p.daysLeft <= 7 ? 'error' : p.daysLeft <= 30 ? 'warning' : 'primary'
                        return (
                          <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                            icon={<Calendar size={14} color={`var(--color-${urgentVariant})`} />}
                            iconBg={`var(--color-${urgentVariant}-subtle)`} iconColor={`var(--color-${urgentVariant})`}
                            title={p.name}
                            subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''}`}
                            rightContent={
                              <Badge variant={urgentVariant}>
                                {p.daysLeft === 0 ? 'Hoje' : p.daysLeft === 1 ? 'Amanhã' : `${p.daysLeft} dias`}
                              </Badge>
                            }
                          />
                        )
                      })}
                    </Card>
                  </div>
                )}

                {recentActivity.length > 0 && (
                  <div className="dash-section">
                    <div className="dash-sec-header">
                      <div className="dash-sec-label"><TrendingUp size={13} /> Atividade recente</div>
                    </div>
                    <Card padding="none" style={{ overflow: 'hidden' }}>
                      {recentActivity.map(p => (
                        <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                          icon={<Folder size={14} color="var(--color-success)" />}
                          iconBg="var(--color-success-subtle)" iconColor="var(--color-success)"
                          title={p.name}
                          subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''} · ${timeAgoLabel(p.created_at)}`}
                          rightContent={p.score != null ? <Badge variant={p.score >= 71 ? 'success' : p.score >= 40 ? 'warning' : 'error'}>{p.score}</Badge> : undefined}
                        />
                      ))}
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════ RECRUITER / EMPRESA ══════════════════════ */}
        {isRecruiter && (
          <div className="dash-section">
            {/* Saved talents */}
            <div className="dash-sec-header">
              <div className="dash-sec-label"><Star size={14} color="var(--color-warning)" /> Talentos guardados {savedTalents.length > 0 && <span className="dash-sec-count">{savedTalents.length}</span>}</div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <Button size="sm" variant="ghost" onClick={() => setSavedTalentsKey(k => k + 1)}>↻</Button>
                <Button size="sm" variant="ghost" iconRight={<ChevronRight size={13} />} onClick={() => navigate('/explorar')}>Explorar</Button>
              </div>
            </div>

            {savedTalentsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: 72, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', opacity: 1 - i * 0.15 }} />)}
              </div>
            ) : savedTalents.length === 0 ? (
              <EmptyState icon={<Star size={28} />} title="Ainda sem talentos guardados" description="Abre um projeto e clica em 'Tenho interesse' para guardar." action={() => navigate('/explorar')} actionLabel="Explorar projetos" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {savedTalents.map(p => {
                  const ownerName = p.ownerProfile?.full_name || p.creator_name || 'Sem nome'
                  const ownerUsername = p.ownerProfile?.username
                  return (
                    <Card key={p.id} hoverable onClick={() => navigate(`/projeto/${p.slug}`)} padding="md">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        <ProgressRing value={p.score ?? 0} size={38} strokeWidth={3} color={getScoreColor(p.score)}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: getScoreColor(p.score) }}>{p.score ?? '—'}</span>
                        </ProgressRing>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                            {ownerName}{p.area ? ` · ${p.area}` : ''}{p.course ? ` · ${p.course}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {ownerUsername && <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/u/${ownerUsername}`) }}>Perfil</Button>}
                          <Button size="sm" variant="secondary" icon={<MessageSquare size={12} />} onClick={e => { e.stopPropagation(); navigate(`/mensagens?to=${p.user_id}`) }}>Mensagem</Button>
                          <Button size="sm" variant="accent" icon={<Send size={12} />} onClick={e => { e.stopPropagation(); setInviteTarget({ studentId: p.user_id, studentName: ownerName }) }}>Convidar</Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Partner leads (empresa) */}
            {profile?.role === 'empresa' && !partnerLeadsLoading && partnerLeads.length > 0 && (
              <div style={{ marginTop: 'var(--sp-8)' }}>
                <div className="dash-sec-header">
                  <div className="dash-sec-label"><Building2 size={14} color="var(--color-primary)" /> Alunos recomendados <span className="dash-sec-count">{partnerLeads.length}</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {partnerLeads.map(l => (
                    <Card key={l.id} padding="md">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => l.student?.username && navigate(`/u/${l.student.username}`)}
                            style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', cursor: l.student?.username ? 'pointer' : 'default' }}>
                            {l.student?.full_name || l.student?.username || 'Aluno'}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>via {l.companyName}</div>
                        </div>
                        <select value={l.status} onChange={e => updatePartnerLeadStatus(l.id, e.target.value)}
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', color: 'var(--color-text)', fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                          {['interessado', 'contactado', 'resposta', 'entrevista', 'aceite', 'recusado'].map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                        </select>
                        {l.student?.username && <Button size="sm" variant="ghost" icon={<ChevronRight size={15} />} onClick={() => navigate(`/u/${l.student.username}`)} />}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

{inviteTarget && <ConvidarVagaModal studentId={inviteTarget.studentId} studentName={inviteTarget.studentName} vagas={recruiterVagas} onClose={() => setInviteTarget(null)} />}
    </div>
  )
}
