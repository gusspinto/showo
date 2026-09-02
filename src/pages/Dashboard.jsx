import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

import ConvidarVagaModal from '../components/ConvidarVagaModal'
import { getCurrentAcademicYear, academicYearOptions } from '../lib/academicYear'
import { calculatePotential } from '../lib/score'
import SkillsPicker from '../components/SkillsPicker'
import { FolderIcon as Folder } from '@solar-icons/react/bold/folder'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { Chart2Icon as BarChart2 } from '@solar-icons/react/bold/chart-2'
import { RocketIcon as Rocket } from '@solar-icons/react/bold/rocket'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { UsersGroupRoundedIcon as Users } from '@solar-icons/react/bold/users-group-rounded'
import { UsersGroupTwoRoundedIcon as Users2 } from '@solar-icons/react/bold/users-group-two-rounded'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { UserIcon as User } from '@solar-icons/react/bold/user'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CalendarIcon as Calendar } from '@solar-icons/react/bold/calendar'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { TargetIcon as Target } from '@solar-icons/react/bold/target'
import { LightningIcon as Zap } from '@solar-icons/react/bold/lightning'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { Buildings2Icon as Building2 } from '@solar-icons/react/bold/buildings-2'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { ShareIcon as Share2 } from '@solar-icons/react/bold/share'
import { LinkIcon as Link } from '@solar-icons/react/bold/link'
import { QuestionCircleIcon as HelpCircle } from '@solar-icons/react/bold/question-circle'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { ChecklistIcon as ListChecks } from '@solar-icons/react/bold/checklist'
import { RecordCircleIcon as Circle } from '@solar-icons/react/bold/record-circle'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { CompassIcon as Compass } from '@solar-icons/react/bold/compass'
import { MedalStarIcon as Medal } from '@solar-icons/react/bold/medal-star'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'
import { Logout2Icon as LogOut } from '@solar-icons/react/bold/logout-2'
import {
  Button, Card, CardHeader, CardTitle, SectionLabel, Badge, Modal, ModalActions,
  EmptyState, PageLayout, PageHeader, ProgressBar, ProgressRing, Select,
} from '../components/ui'
import MonthCalendar from '../components/dashboard/MonthCalendar'
import AddReminderModal from '../components/dashboard/AddReminderModal'
import CalendarSyncModal from '../components/dashboard/CalendarSyncModal'
import '../components/dashboard/MonthCalendar.css'
import './Dashboard.css'
import StudentDashboard from './StudentDashboard'
import TeacherEmptyState from '../components/TeacherEmptyState'
import SegmentedTabs from '../components/SegmentedTabs'
import AreaChart from '../components/AreaChart'

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
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users2 size={16} color="var(--color-text-secondary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--color-text)', fontSize: 'var(--text-base)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</span>
            {turma.academic_year && <Badge>{turma.academic_year}</Badge>}
          </div>
          {turma.subject && <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
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
      .select('id, name, subject, code, teacher_id, teacher_name, academic_year, created_at').single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data); onClose()
  }

  return (
    <Modal onClose={onClose} title="Nova turma">
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div>
          <SectionLabel>Nome da turma *</SectionLabel>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Turma A, 11º ano"
            style={{ width: '100%', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text)', fontSize: 'var(--text-base)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div>
          <SectionLabel>Disciplina</SectionLabel>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Programação e Sistemas de Informação"
            style={{ width: '100%', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text)', fontSize: 'var(--text-base)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div>
          <SectionLabel>Ano letivo</SectionLabel>
          <Select value={academicYear} onChange={setAcademicYear} options={academicYearOptions().map(y => ({ value: y, label: y }))} />
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
            {verified ? joined.name : `${joined.name}: não consegui confirmar o teu registo. Verifica na turma.`}
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
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(claimedSlug ? -1 : 0)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [area, setArea] = useState(profile?.area ?? '')
  const [skills, setSkills] = useState(profile?.skills ?? [])
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const usernameCheckRef = useRef(null)
  const resolvedUsername = username.trim() || profile?.username || user?.id
  const profileUrl = `${window.location.origin}/u/${resolvedUsername}`

  useEffect(() => {
    const val = username.trim()
    if (!val || val.length < 3) { setUsernameStatus(null); return }
    if (val === profile?.username) { setUsernameStatus('own'); return }
    clearTimeout(usernameCheckRef.current)
    setUsernameStatus('checking')
    usernameCheckRef.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', val).neq('id', user.id).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(usernameCheckRef.current)
  }, [username])

  async function saveProfile() {
    const val = username.trim()
    if (!val || val.length < 3) { setSaveErr('Escolhe um username com pelo menos 3 caracteres.'); return }
    if (usernameStatus === 'taken') { setSaveErr('Este username já está a ser usado.'); return }
    setSaving(true); setSaveErr(null)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username: val, bio: bio.trim() || null, area: area || null, skills,
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) { setSaveErr(error.code === '23505' ? 'Este username já está a ser usado.' : 'Erro ao guardar.'); return }
    await refreshProfile()
    setStep(1)
  }

  const TOTAL = 3
  const AREAS = ['Programação e Informática','Design e Multimédia','Marketing e Comunicação','Gestão e Administração','Eletrónica e Automação','Audiovisual e Cinema','Turismo e Hotelaria','Saúde','Desporto','Artes e Espetáculo','Construção e Engenharia','Outra']
  const inputStyle = { width: '100%', background: 'var(--color-primary-subtle)', border: '1.5px solid var(--color-primary-muted)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', fontSize: 'var(--text-base)', padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary-muted)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', animation: 'dash-fade-up 0.25s var(--ease-out)', position: 'relative' }}>
        <button onClick={onDismiss} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, zIndex: 1 }} aria-label="Fechar"><X size={18} /></button>

        {step === -1 && claimedSlug && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', opacity: 0.8 }}>
              <Check size={26} color="var(--color-success)" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
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
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Completa o teu perfil</h2>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>O teu perfil é o teu cartão de visita.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
              <div>
                <SectionLabel>Username</SectionLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }}>@</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="o_teu_username" maxLength={30} style={{ ...inputStyle, paddingLeft: 30, borderColor: usernameStatus === 'taken' ? 'var(--color-error)' : usernameStatus === 'available' ? 'var(--color-success)' : undefined }} />
                </div>
                {usernameStatus === 'taken' && <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>Este username já está a ser usado.</p>}
                {usernameStatus === 'available' && <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>Username disponível ✓</p>}
                {usernameStatus === 'checking' && <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>A verificar...</p>}
              </div>
              <div>
                <SectionLabel>Bio (opcional)</SectionLabel>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Estudante de Informática…" rows={3} maxLength={200} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div>
                <SectionLabel>Área (opcional)</SectionLabel>
                <Select value={area} onChange={setArea} placeholder="Seleciona a tua área" options={AREAS} inputStyle={inputStyle} />
              </div>
              <div><SkillsPicker label="Competências (opcional)" value={skills} onChange={setSkills} max={8} /></div>
            </div>
            {saveErr && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', padding: '8px 12px', background: 'var(--color-error-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-3)' }}>{saveErr}</div>}
            <Button onClick={saveProfile} disabled={saving || !username.trim() || username.trim().length < 3 || usernameStatus === 'taken' || usernameStatus === 'checking'} loading={saving} fullWidth iconRight={<ArrowRight size={15} />}>Guardar perfil</Button>
          </div>
        )}

        {step === 1 && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Rocket size={24} color="var(--color-primary)" />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Cria o teu primeiro projeto</h2>
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
            <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Partilha a tua página</h2>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary-muted)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', width: '100%', maxWidth: 440 }}>
        {step === 0 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src="/icon.png" alt="Showo" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
              <h2 style={{ color: 'var(--color-text)', fontSize: 'var(--text-xl)', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-heading)' }}>{cfg.title}</h2>
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
              <h2 style={{ color: 'var(--color-text)', fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-heading)' }}>Pronto para começar?</h2>
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

  const isBlueCTA = step.iconColor === 'var(--color-primary)' || step.iconColor === 'var(--color-warning)'

  if (isBlueCTA) {
    return (
      <div style={{
        padding: '16px', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-primary)', color: '#fff',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: 8 }}>{step.label}</div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, lineHeight: 1.35, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.title}</div>
        {step.desc && <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7, marginBottom: 10 }}>{step.desc}</div>}
        {step.action && (
          <button onClick={step.action} style={{
            width: '100%', padding: '8px 0', borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer',
          }}>{step.actionLabel}</button>
        )}
      </div>
    )
  }

  return (
    <Card padding="md" style={{ borderLeft: `3px solid ${step.iconColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)', background: step.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: step.iconColor,
        }}>
          {step.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: step.iconColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{step.label}</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.title}</div>
          {step.desc && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{step.desc}</div>}
        </div>
      </div>
      {step.action && (
        <Button size="sm" variant="secondary" onClick={step.action} style={{ marginTop: 10, width: '100%' }}>{step.actionLabel}</Button>
      )}
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
                <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor }}>{project.score ?? '--'}</span>
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
  const { user, profile, loading: authLoading, isAdmin, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [claimedSlug] = useState(() => location.state?.claimedSlug ?? null)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [turmaYearFilter, setTurmaYearFilter] = useState('all')
  const [teacherTab, setTeacherTab] = useState('progresso') // 'progresso' | 'rever'
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
  const [personalReminders, setPersonalReminders] = useState([])
  const [showAddReminder, setShowAddReminder] = useState(null) // holds initial Date or null
  const [showCalendarSync, setShowCalendarSync] = useState(false)
  const [icsToken, setIcsToken] = useState(null)

  /* ── Admin redirect ── */
  useEffect(() => {
    if (!authLoading && isAdmin) navigate('/admin', { replace: true })
  }, [authLoading, isAdmin, navigate])

  /* Para alunos este componente devolve <StudentDashboard/>, que faz os seus
     próprios pedidos. Sem esta guarda, cada abertura da dashboard de um aluno
     disparava duas vezes as mesmas oito queries — e nenhuma das cópias daqui
     chega sequer a ser desenhada. */
  const isStaffView = profile?.role === 'professor'
    || profile?.role === 'recrutador'
    || profile?.role === 'empresa'

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
      if (!profile.username || !localStorage.getItem(`showo_onb_v2_${user.id}`)) setShowOnboardingAluno(true)
    } else {
      if (!localStorage.getItem(`showo_onboarded_${user.id}`)) setShowOnboarding(true)
    }
  }, [user, profile])

  /* ── Load student's own projects ── */
  useEffect(() => {
    if (!user || !isStaffView) return
    async function load() {
      // entry_kind='library' fica de fora — esses vivem na Biblioteca, não
      // na lista de Portfólio da Dashboard.
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .eq('entry_kind', 'full')
        .order('created_at', { ascending: false })
      if (error) {
        const fallback = await supabase.from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type')
          .eq('user_id', user.id).eq('entry_kind', 'full').order('created_at', { ascending: false })
        data = fallback.data; error = fallback.error
      }
      setProjects((data || []).map(p => ({
        ...p, collaborator_count: Array.isArray(p.collaborator_count) ? (p.collaborator_count[0]?.count ?? 0) : (p.collaborator_count ?? 0),
      })))
      setLoadingProjects(false)
    }
    load()
  }, [user, isStaffView])

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast('Projeto eliminado.')
  }

  /* ── Load collab projects ── */
  useEffect(() => {
    if (!user || !isStaffView) return
    async function loadCollabProjects() {
      const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('user_id', user.id).eq('status', 'accepted')
      if (!collabs?.length) return
      const { data: projs } = await supabase.from('projects').select('id, name, slug, score, area, ai_tagline, creator_name, created_at, views').in('id', collabs.map(c => c.project_id)).order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    loadCollabProjects()
  }, [user, isStaffView])

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
    if (!user || !isStaffView) { setLoadingStudentTurmas(false); return }
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
    if (!user || !isStaffView) return
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
    if (!user || !isStaffView) return
    supabase.from('notifications').select('id, message, project_slug, created_at').eq('user_id', user.id).eq('type', 'TEACHER_FEEDBACK').eq('read', false).order('created_at', { ascending: false }).limit(5).then(({ data }) => { if (data) setProfNotifs(data) })
  }, [user, profile?.role])

  /* ── Personal reminders + ics token ── */
  useEffect(() => {
    if (!user || !isStaffView) return
    supabase.from('personal_reminders')
      .select('id, title, reminder_date, notes, done')
      .eq('user_id', user.id).eq('done', false)
      .order('reminder_date', { ascending: true })
      .then(({ data }) => { if (data) setPersonalReminders(data) })
    supabase.rpc('get_my_ics_token')
      .then(({ data }) => { if (data) setIcsToken(data) })
  }, [user, profile?.role])

  async function toggleReminderDone(id) {
    setPersonalReminders(prev => prev.filter(r => r.id !== id))
    await supabase.from('personal_reminders').update({ done: true }).eq('id', id)
  }

  /* ── All feedback notifications (for chart) ── */
  useEffect(() => {
    if (!user || !isStaffView) return
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

  if (authLoading || (user && !profile)) {
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

  if (!isTeacher && !isRecruiter) {
    return <StudentDashboard user={user} profile={profile} />
  }

  return (
    <div className="dashboard-root" style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
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
        // join_class promove a conta a 'school' no servidor — sem isto o
        // profile em memória fica 'individual' e a TurmaPage devolve ao dashboard.
        refreshProfile?.()
      }} />}
      {showTurmasModal && <TurmasListModal turmas={studentTurmas} onClose={() => setShowTurmasModal(false)} navigate={navigate} onJoin={() => setShowJoinModal(true)} />}
      {showAddReminder && <AddReminderModal userId={user.id} initialDate={showAddReminder}
        onClose={() => setShowAddReminder(null)}
        onCreated={(r) => setPersonalReminders(prev => [...prev, r].sort((a, b) => a.reminder_date < b.reminder_date ? -1 : 1))} />}
      {showCalendarSync && icsToken && <CalendarSyncModal userId={user.id} icsToken={icsToken}
        onClose={() => setShowCalendarSync(false)}
        onTokenRotated={(t) => setIcsToken(t)} />}

      {/* Brand accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, var(--color-primary) 35%, var(--color-accent) 65%, transparent 100%)', opacity: 0.4 }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 80px', boxSizing: 'border-box' }}>

        {/* ══════════════════════ HEADER ══════════════════════ */}
        {(() => {
          const dateStr = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
          const roleLabel = { aluno: 'Aluno', professor: 'Professor', recrutador: 'Recrutador', empresa: 'Empresa' }[profile?.role] ?? 'Aluno'
          return (
            <header className="dash-hero">
              <div className="dash-hero-main">
                <span className="dash-hero-date">{dateStr}</span>
                <h1 className="dash-hero-greeting">
                  {greeting}
                  <Badge variant={isTeacher ? 'success' : isRecruiter ? 'accent' : 'primary'} style={{ verticalAlign: 'middle', marginLeft: 12 }}>{roleLabel}</Badge>
                </h1>
              </div>
            </header>
          )
        })()}

        {/* ══════════════════════ TEACHER DASHBOARD ══════════════════════ */}
        {isTeacher && turmas.length === 0 && <TeacherEmptyState onCreate={() => setShowCreateTurma(true)} />}
        {isTeacher && turmas.length > 0 && (
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
                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: stat.accent ? 'var(--color-error)' : 'var(--color-text)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 6 }}>{stat.label}</div>
                  </Card>
                ))}
              </div>
            )}

            {/* Segmento: Progresso / A rever */}
            <div className="dash-section" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-5)' }}>
              <SegmentedTabs
                value={teacherTab}
                onChange={setTeacherTab}
                options={[
                  { id: 'progresso', label: 'Progresso', icon: <TrendingUp size={14} /> },
                  { id: 'rever', label: 'A rever', icon: <MessageSquare size={14} /> },
                ]}
              />
            </div>

            {/* ── Progresso ── */}
            {teacherTab === 'progresso' && (
              <>
                {weeklyActivity.some(w => w.count > 0) && (
                  <Card padding="md" style={{ marginBottom: 'var(--sp-5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
                      <BarChart2 size={13} color="var(--color-text-tertiary)" />
                      <SectionLabel style={{ marginBottom: 0 }}>Projetos submetidos, últimas 8 semanas</SectionLabel>
                    </div>
                    <AreaChart
                      height={130}
                      color="var(--color-primary)"
                      valueSuffix=" projetos"
                      data={weeklyActivity.map(w => ({ label: w.label, value: w.count }))}
                    />
                    {!profile?.monthly_report_opt_in && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Recebe este resumo por email todos os meses.</span>
                        <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>Ativar</Button>
                      </div>
                    )}
                  </Card>
                )}

                <div className="dash-section">
                  <div className="dash-sec-header">
                    <div className="dash-sec-label"><Users2 size={13} /> Turmas <span className="dash-sec-count">{turmas.length}</span></div>
                    <Button size="sm" variant="secondary" iconRight={<ChevronRight size={13} />} onClick={() => navigate('/turmas')}>Gerir</Button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {turmas.map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
                  </div>
                </div>
              </>
            )}

            {/* ── A rever ── */}
            {teacherTab === 'rever' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                {resubmitted.length === 0 && needsReview.length === 0 && flaggedForRevision.length === 0 && upcomingDefenses.length === 0 && recentActivity.length === 0 && (
                  <EmptyState icon={<Check size={24} />} title="Nada por rever agora" description="Quando os alunos submeterem projetos ou pedirem revisão, aparece aqui." />
                )}
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
            )}
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
                        <Select value={l.status} onChange={v => updatePartnerLeadStatus(l.id, v)}
                          options={['interessado', 'contactado', 'resposta', 'entrevista', 'aceite', 'recusado'].map(k => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))}
                          inputStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 'var(--text-xs)', fontWeight: 700 }} />
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
