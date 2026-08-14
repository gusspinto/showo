import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Navbar } from '../components/Navbar'
import { Loader, Check, X, AlertTriangle, Camera, ArrowLeft, GraduationCap, BookOpen, Search, Building2, Lock, Briefcase, Sun, Moon, BarChart2, Bell, Mail, Megaphone, Rocket, FolderOpen, Eye, EyeOff, Globe, Shield, CreditCard } from 'lucide-react'
import { CropModal } from '../components/CropModal'
import { containsProfanity } from '../lib/profanity'
import SkillsPicker from '../components/SkillsPicker'
import { Select } from '../components/ui'
import './Settings.css'

function Input({ label, value, onChange, placeholder, hint, type = 'text', prefix }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      <div className="flex items-center" style={{ position: 'relative' }}>
        {prefix && <span className="settings-prefix">{prefix}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`settings-input${prefix ? ' has-prefix' : ''}`}
        />
      </div>
      {hint && <p className="settings-hint">{hint}</p>}
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        className="settings-textarea"
      />
      {hint && <p className="settings-hint">{hint}</p>}
    </div>
  )
}

const PLAN_META = {
  free:   { name: 'Grátis',  color: 'var(--color-text-tertiary)', desc: 'O plano base, sem custos.' },
  build:  { name: 'Build',   color: '#2B7EF5', desc: 'IA sem limites em cada projeto.' },
  launch: { name: 'Launch',  color: '#C49A20', desc: 'Do projeto à oportunidade de carreira.' },
}

function PlanSection({ planId, navigate }) {
  const meta = PLAN_META[planId] ?? PLAN_META.free
  const [portalLoading, setPortalLoading] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const stripeSuccess = params.get('stripe') === 'success'

  async function openPortal() {
    setPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal')
      if (error || !data?.url) return
      window.location.href = data.url
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <SectionCard title="Plano">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {stripeSuccess && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--color-success)', fontWeight: 600,
          }}>
            Pagamento confirmado! O teu plano foi atualizado.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '4px 14px', borderRadius: 100,
            background: meta.color + '22', color: meta.color,
            border: `1px solid ${meta.color}44`,
            fontSize: 13, fontWeight: 700,
          }}>
            {meta.name}
          </span>
          <span className="settings-hint" style={{ margin: 0 }}>{meta.desc}</span>
        </div>

        {planId !== 'launch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="settings-save-btn" onClick={() => navigate('/pricing')}>
              {planId === 'free' ? 'Fazer upgrade' : 'Upgrade para Launch'}
            </button>
          </div>
        )}

        {planId !== 'free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="settings-save-btn"
              onClick={openPortal}
              disabled={portalLoading}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              {portalLoading ? 'A abrir…' : 'Gerir subscrição'}
            </button>
            <p className="settings-hint">Altera o método de pagamento, vê faturas ou cancela.</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="settings-card">
      <h2 className="settings-card-title">{title}</h2>
      {children}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <>
      <div className="skel settings-card settings-skeleton-card">
        <div className="skel-line w-40 h-xl mb-6" />
        <div className="flex items-center gap-5 mb-6">
          <div className="skel-circle" style={{ width: 72, height: 72 }} />
          <div className="flex-col gap-2 flex-1">
            <div className="skel-line w-40 h-lg" />
            <div className="skel-line w-60" />
          </div>
        </div>
        <div className="skel-line w-full h-lg" />
        <div className="skel-line w-full h-lg" />
        <div className="skel-line w-80 h-lg" />
      </div>
      <div className="skel settings-card settings-skeleton-card" style={{ animationDelay: '0.15s' }}>
        <div className="skel-line w-40 h-xl mb-6" />
        <div className="skel-line w-full h-lg" />
        <div className="skel-line w-full h-lg" />
      </div>
    </>
  )
}

export default function Settings() {
  const { user, profile, loading: authLoading, refreshProfile, planId } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return t || 'perfil'
  })
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('aluno')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const debounceRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarCropFile, setAvatarCropFile] = useState(null)
  const avatarInputRef = useRef(null)
  const [availableForWork, setAvailableForWork] = useState(false)
  const [monthlyReportOptIn, setMonthlyReportOptIn] = useState(false)
  const [company, setCompany] = useState('')
  const [companyRole, setCompanyRole] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [companyLocation, setCompanyLocation] = useState('')
  const [companyIndustry, setCompanyIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [area, setArea] = useState('')
  const [skills, setSkills] = useState([])
  const [phone, setPhone] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [notifyNewsletter, setNotifyNewsletter] = useState(true)
  const [notifyMarketing, setNotifyMarketing] = useState(true)
  const [notifyProductUpdates, setNotifyProductUpdates] = useState(true)
  const [notifyProjectActivity, setNotifyProjectActivity] = useState(true)
  const [profileVisibility, setProfileVisibility] = useState('public')
  const [showEmailPublicly, setShowEmailPublicly] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [ambassadorStats, setAmbassadorStats] = useState(null)
  const [connectLoading, setConnectLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    setFullName(user.user_metadata?.full_name ?? '')
    supabase.from('profiles').select('username, bio, role, avatar_url, available_for_work, monthly_report_opt_in, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, skills, area, phone, notify_newsletter, notify_marketing, notify_product_updates, notify_project_activity, profile_visibility, show_email_publicly').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? '')
        setOriginalUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setRole(data.role ?? 'aluno')
        setAvatarUrl(data.avatar_url ?? '')
        setAvailableForWork(data.available_for_work ?? false)
        setMonthlyReportOptIn(data.monthly_report_opt_in ?? false)
        setCompany(data.company ?? '')
        setCompanyRole(data.company_role ?? '')
        setCompanyWebsite(data.company_website ?? '')
        setLinkedinUrl(data.linkedin_url ?? '')
        setLookingFor(data.looking_for ?? '')
        setCompanyDescription(data.company_description ?? '')
        setCompanyLocation(data.company_location ?? '')
        setCompanyIndustry(data.company_industry ?? '')
        setCompanySize(data.company_size ?? '')
        setSkills(data.skills ?? [])
        setArea(data.area ?? '')
        setPhone(data.phone ?? '')
        setNotifyNewsletter(data.notify_newsletter ?? true)
        setNotifyMarketing(data.notify_marketing ?? true)
        setNotifyProductUpdates(data.notify_product_updates ?? true)
        setNotifyProjectActivity(data.notify_project_activity ?? true)
        setProfileVisibility(data.profile_visibility ?? 'public')
        setShowEmailPublicly(data.show_email_publicly ?? false)
      }
    })
    supabase.rpc('get_ambassador_stats').then(({ data }) => {
      if (data && Object.keys(data).length > 0) setAmbassadorStats(data)
    })
  }, [user])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const trimmed = username.trim()
    if (!trimmed || trimmed === originalUsername) { setUsernameStatus(null); return }
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', trimmed).single()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [username, originalUsername])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 10 * 1024 * 1024) { setSaveMsg({ type: 'err', text: 'A imagem não pode ter mais de 10 MB.' }); return }
    setAvatarCropFile(file)
    if (e.target) e.target.value = ''
  }

  async function handleAvatarCropConfirm(blob) {
    setAvatarCropFile(null)
    if (!user) return
    setAvatarUploading(true); setSaveMsg(null)
    const path = `${user.id}/avatar.jpg`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) { setSaveMsg({ type: 'err', text: 'Erro ao carregar imagem.' }); setAvatarUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const bustedUrl = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: bustedUrl }).eq('id', user.id)
    setAvatarUrl(bustedUrl); refreshProfile()
    setSaveMsg({ type: 'ok', text: 'Foto de perfil atualizada.' }); setAvatarUploading(false)
  }

  async function handleRemoveAvatar() {
    if (!user) return
    setAvatarUploading(true)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    setAvatarUrl(''); refreshProfile()
    setSaveMsg({ type: 'ok', text: 'Foto removida.' }); setAvatarUploading(false)
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true); setSaveMsg(null)
    if (containsProfanity(fullName) || containsProfanity(bio)) {
      setSaveMsg({ type: 'err', text: 'Linguagem inapropriada detetada. A Showo é uma plataforma para estudantes — mantém o perfil respeitoso.' })
      setSaving(false); return
    }
    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setSaveMsg({ type: 'err', text: 'Username só pode ter letras minúsculas, números e _ (3–30 caracteres).' })
      setSaving(false); return
    }
    if (usernameStatus === 'taken') {
      setSaveMsg({ type: 'err', text: 'Este username já está a ser usado.' })
      setSaving(false); return
    }
    try {
      const safeRole = (profile?.role === 'professor' || profile?.role === 'recrutador' || profile?.role === 'empresa') ? profile.role : role
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim(), role: safeRole } })
      if (metaError) throw metaError
      const { error: profileError } = await supabase.rpc('upsert_own_profile', {
        p_full_name:               fullName.trim() || null,
        p_username:                username.trim() || null,
        p_bio:                     bio.trim() || null,
        p_phone:                   phone.trim() || null,
        p_role:                    safeRole,
        p_available_for_work:      availableForWork,
        p_skills:                  (role === 'aluno' || role === 'professor') ? skills : [],
        p_area:                    role === 'aluno' ? (area || null) : null,
        p_monthly_report_opt_in:   role === 'professor' ? monthlyReportOptIn : false,
        p_notify_newsletter:       notifyNewsletter,
        p_notify_marketing:        notifyMarketing,
        p_notify_product_updates:  notifyProductUpdates,
        p_notify_project_activity: notifyProjectActivity,
        p_profile_visibility:      profileVisibility,
        p_show_email_publicly:     showEmailPublicly,
        ...(role === 'recrutador' || role === 'empresa' ? {
          p_company:             company.trim() || null,
          p_company_role:        companyRole.trim() || null,
          p_company_website:     companyWebsite.trim() || null,
          p_linkedin_url:        linkedinUrl.trim() || null,
          p_looking_for:         lookingFor.trim() || null,
          p_company_description: companyDescription.trim() || null,
          p_company_location:    companyLocation.trim() || null,
          p_company_industry:    companyIndustry.trim() || null,
          p_company_size:        companySize.trim() || null,
        } : {}),
      })
      if (profileError) {
        if (profileError.message?.includes('23505') || profileError.message?.includes('unique')) {
          setSaveMsg({ type: 'err', text: 'Este username já está a ser usado.' }); setSaving(false); return
        }
        throw profileError
      }
      setOriginalUsername(username.trim()); setUsernameStatus(null); refreshProfile()
      setSaveMsg({ type: 'ok', text: 'Perfil guardado.' })
    } catch (err) {
      const raw = err.message ?? ''
      const text = raw.includes('row-level security') || raw.includes('RLS')
        ? 'Não foi possível guardar o perfil. O teu username pode já estar a ser usado, ou tenta fechar sessão e entrar de novo.'
        : raw.includes('duplicate') || raw.includes('23505')
        ? 'Este username já está a ser usado.'
        : raw || 'Erro ao guardar. Tenta novamente.'
      setSaveMsg({ type: 'err', text })
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    setPwMsg(null)
    if (!newPw || newPw.length < 6) { setPwMsg({ type: 'err', text: 'A nova password deve ter pelo menos 6 caracteres.' }); return }
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'As passwords não coincidem.' }); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setPwMsg({ type: 'err', text: error.message ?? 'Erro ao alterar password.' }) }
    else { setPwMsg({ type: 'ok', text: 'Password alterada com sucesso.' }); setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    setPwSaving(false)
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true); setDeleteError(null)
    try {
      const { error } = await supabase.rpc('delete_account_transfer')
      if (error) throw error
      await supabase.auth.signOut(); navigate('/')
    } catch (err) { setDeleteError(err.message ?? 'Erro ao eliminar conta. Tenta novamente.'); setDeleteLoading(false) }
  }

  if (authLoading) return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="page-content"><SettingsSkeleton /></div>
    </div>
  )
  if (!user) return null

  const isRecruiter = role === 'recrutador' || role === 'empresa'
  const accentColor = role === 'empresa' ? 'var(--color-warning)' : 'var(--color-accent)'

  const baseTabs = isRecruiter ? [
    { id: 'perfil', label: 'Perfil', icon: <Camera size={16} /> },
    { id: 'empresa', label: 'Empresa', icon: <Building2 size={16} /> },
    { id: 'recrutamento', label: 'Recrutamento', icon: <Search size={16} /> },
    { id: 'notificacoes', label: 'Notificações', icon: <Bell size={16} /> },
    { id: 'privacidade', label: 'Privacidade', icon: <Shield size={16} /> },
    { id: 'aparencia', label: 'Aparência', icon: theme === 'dark' ? <Moon size={16} /> : <Sun size={16} /> },
    { id: 'conta', label: 'Conta', icon: <Lock size={16} /> },
  ] : [
    { id: 'perfil', label: 'Perfil', icon: <Camera size={16} /> },
    { id: 'plano', label: 'Plano', icon: <CreditCard size={16} /> },
    { id: 'notificacoes', label: 'Notificações', icon: <Bell size={16} /> },
    { id: 'privacidade', label: 'Privacidade', icon: <Shield size={16} /> },
    { id: 'aparencia', label: 'Aparência', icon: theme === 'dark' ? <Moon size={16} /> : <Sun size={16} /> },
    { id: 'conta', label: 'Conta', icon: <Lock size={16} /> },
  ]
  const sidebarTabs = ambassadorStats
    ? [...baseTabs.slice(0, -1), { id: 'embaixador', label: 'Embaixador', icon: <Megaphone size={16} /> }, baseTabs[baseTabs.length - 1]]
    : baseTabs

  const avatarBlock = (
    <div className="settings-avatar-wrap">
      <div className="settings-avatar-container">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="settings-avatar-img" />
        ) : (
          <div className="settings-avatar-fallback" style={{ background: `linear-gradient(135deg,${accentColor},#4f46e5)` }}>
            {fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
          className="settings-avatar-edit" style={{ background: accentColor }}>
          <Camera size={13} color="#fff" />
        </button>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
        {avatarCropFile && <CropModal file={avatarCropFile} circular={true} onConfirm={handleAvatarCropConfirm} onCancel={() => setAvatarCropFile(null)} />}
      </div>
      <div>
        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="settings-avatar-change">
          {avatarUploading ? 'A carregar…' : 'Alterar foto'}
        </button>
        {avatarUrl && <button type="button" onClick={handleRemoveAvatar} disabled={avatarUploading} className="settings-avatar-remove">Remover foto</button>}
        <p className="settings-hint mt-2">JPG, PNG ou WebP · máx. 5 MB</p>
      </div>
    </div>
  )

  const saveBlock = (
    <>
      {saveMsg && <div className={`settings-msg ${saveMsg.type}`}>{saveMsg.text}</div>}
      <button onClick={handleSaveProfile} disabled={saving} className="settings-save-btn">
        {saving ? 'A guardar...' : 'Guardar'}
      </button>
    </>
  )

  const ROLE_INFO = {
    aluno:      { icon: <GraduationCap size={18} />, label: 'Aluno',      color: 'var(--color-primary)' },
    professor:  { icon: <BookOpen size={18} />,      label: 'Professor',  color: '#10b981' },
    recrutador: { icon: <Search size={18} />,        label: 'Recrutador', color: 'var(--color-accent)' },
    empresa:    { icon: <Building2 size={18} />,     label: 'Empresa',    color: 'var(--color-warning)' },
  }
  const r = ROLE_INFO[role] ?? ROLE_INFO.aluno

  const roleBadge = (
    <div className="settings-field">
      <label className="settings-label">Tipo de conta</label>
      <div className="settings-role-badge" style={{ background: `${r.color}0d`, border: `1px solid ${r.color}30` }}>
        <span className="flex items-center" style={{ color: r.color }}>{r.icon}</span>
        <span className="text-base font-bold" style={{ color: r.color }}>{r.label}</span>
        <span className="settings-role-locked"><Lock size={11} /> Definido no registo</span>
      </div>
    </div>
  )

  const usernameHint =
    usernameStatus === 'checking'  ? <span className="flex items-center gap-1"><Loader size={12} /> A verificar...</span> :
    usernameStatus === 'available' ? <span className="flex items-center gap-1"><Check size={12} /> Disponível!</span> :
    usernameStatus === 'taken'     ? <span className="flex items-center gap-1"><X size={12} /> Já está a ser usado.</span> :
    usernameStatus === 'invalid'   ? <span className="flex items-center gap-1"><AlertTriangle size={12} /> Só letras minúsculas, números e _.</span> :
    `${window.location.origin}/u/${username || 'username'}`

  const themeBlock = (
    <div className="settings-theme-row">
      <div>
        <div className="text-base font-semibold mb-1">{theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'}</div>
        <div className="text-sm text-muted">Tema</div>
      </div>
      <button onClick={toggleTheme} className={`settings-theme-btn ${theme}`}>
        {theme === 'dark' ? <><Sun size={14} /> Modo claro</> : <><Moon size={14} /> Modo escuro</>}
      </button>
    </div>
  )

  const passwordBlock = (
    <>
      <Input label="Nova password" type="password" value={newPw} onChange={setNewPw} placeholder="Mínimo 6 caracteres" />
      <Input label="Confirmar nova password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repete a nova password" />
      {pwMsg && <div className={`settings-msg ${pwMsg.type}`}>{pwMsg.text}</div>}
      <button onClick={handleChangePassword} disabled={pwSaving} className="settings-secondary-btn">
        {pwSaving ? 'A alterar...' : 'Alterar password'}
      </button>
    </>
  )

  const dangerZone = (
    <>
      <p className="text-base text-muted mb-4" style={{ lineHeight: 1.65 }}>
        Ao eliminares a conta, todos os teus dados são apagados permanentemente.
        Se os teus projetos tiverem colaboradores, o primeiro colaborador adicionado torna-se o novo dono.
        Se não tiverem, os projetos são eliminados.
      </p>
      {!deleteConfirm ? (
        <button onClick={() => setDeleteConfirm(true)} className="settings-danger-outline">Eliminar conta</button>
      ) : (
        <div className="settings-delete-box">
          <p className="text-base font-bold text-error mb-3">Tens a certeza? Esta ação é irreversível.</p>
          {deleteError && <p className="text-sm text-error mb-3 p-2 rounded-md" style={{ background: 'rgba(239,68,68,0.08)' }}>{deleteError}</p>}
          <div className="flex gap-2">
            <button onClick={handleDeleteAccount} disabled={deleteLoading} className="settings-confirm-delete">
              {deleteLoading ? 'A eliminar...' : 'Sim, eliminar conta'}
            </button>
            <button onClick={() => { setDeleteConfirm(false); setDeleteError(null) }} disabled={deleteLoading} className="settings-cancel-delete">Cancelar</button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="page-content">
        <div className="settings-header">
          <div>
            <h1 className="settings-title">Definições</h1>
            <p className="settings-subtitle">Gere o teu perfil e conta</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="settings-back-btn">
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>

        <div className="settings-layout">
          <nav className="settings-sidebar">
            {sidebarTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`settings-sidebar-item${activeTab === t.id ? ' active' : ''}`}>
                {t.icon} <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="settings-main">
            {activeTab === 'perfil' && (
              <>
                <SectionCard title="Perfil público">
                  {avatarBlock}
                  <Input label="Nome" value={fullName} onChange={setFullName} placeholder="O teu nome" />
                  <Input label="Username" value={username} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder={isRecruiter ? 'ex: rh_empresa' : 'ex: gustavo_silva'} prefix="@" hint={usernameHint} />
                  <Textarea label={isRecruiter ? 'Apresentação' : 'Bio'} value={bio} onChange={setBio} placeholder={isRecruiter ? 'Apresenta a tua empresa ou o teu trabalho como recrutador...' : 'Conta um pouco sobre ti e os teus projetos...'} hint="Aparece no teu perfil público." />

                  <Input label="Telemóvel (opcional)" value={phone} onChange={setPhone} placeholder="912 345 678" hint="Para te contactarmos sobre o teu portfolio e oportunidades. Nunca partilhado publicamente." />

                  {role === 'aluno' && (
                    <div className="settings-field">
                      <label className="settings-label">Área</label>
                      <Select value={area} onChange={setArea} placeholder="Seleciona a tua área"
                        options={['Programação e Informática','Design e Multimédia','Marketing e Comunicação','Gestão e Administração','Eletrónica e Automação','Audiovisual e Cinema','Turismo e Hotelaria','Saúde','Desporto','Artes e Espetáculo','Construção e Engenharia','Outra']} />
                      <p className="settings-hint">Permite que recrutadores filtrem por área.</p>
                    </div>
                  )}

                  {role === 'aluno' && (
                    <div className="settings-field">
                      <label className="settings-label">Disponibilidade</label>
                      <button type="button" onClick={() => setAvailableForWork(v => !v)} className={`settings-toggle${availableForWork ? ' active' : ''}`}>
                        <div className={`settings-toggle-track ${availableForWork ? 'on' : 'off'}`}>
                          <div className={`settings-toggle-knob ${availableForWork ? 'on' : 'off'}`} />
                        </div>
                        <div>
                          <div className="settings-toggle-title" style={{ color: availableForWork ? 'var(--color-success)' : undefined }}>
                            <Briefcase size={14} className="flex-shrink-0" />
                            {availableForWork ? 'Disponível para estágio' : 'Não disponível para estágio'}
                          </div>
                          <div className="settings-toggle-desc">
                            {availableForWork ? 'O teu perfil aparece nos resultados de recrutadores e empresas.' : 'Ativa para aparecer em pesquisas de recrutadores.'}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {role === 'professor' && (
                    <div className="settings-field">
                      <label className="settings-label">Relatório mensal</label>
                      <button type="button" onClick={() => setMonthlyReportOptIn(v => !v)} className={`settings-toggle${monthlyReportOptIn ? ' active' : ''}`}>
                        <div className={`settings-toggle-track ${monthlyReportOptIn ? 'on' : 'off'}`}>
                          <div className={`settings-toggle-knob ${monthlyReportOptIn ? 'on' : 'off'}`} />
                        </div>
                        <div>
                          <div className="settings-toggle-title" style={{ color: monthlyReportOptIn ? 'var(--color-success)' : undefined }}>
                            <BarChart2 size={14} className="flex-shrink-0" />
                            {monthlyReportOptIn ? 'Relatório mensal ativo' : 'Relatório mensal desativado'}
                          </div>
                          <div className="settings-toggle-desc">
                            Recebe por email, uma vez por mês, um resumo da atividade das tuas turmas (projetos submetidos, scores, turma mais ativa).
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="settings-field">
                    <SkillsPicker value={skills} onChange={setSkills} max={12} label="Competências" />
                  </div>

                  {roleBadge}
                  {saveBlock}
                </SectionCard>
              </>
            )}

            {activeTab === 'empresa' && isRecruiter && (
              <SectionCard title="Dados da empresa">
                <div className="settings-info-banner" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}33` }}>
                  <Building2 size={14} color={accentColor} />
                  <span className="text-sm font-semibold" style={{ color: accentColor }}>Estes dados ficam visíveis no teu perfil público</span>
                </div>
                <Input label="Nome da empresa" value={company} onChange={setCompany} placeholder="Ex: Google, NOS, Altice..." />
                <Input label="O teu cargo" value={companyRole} onChange={setCompanyRole} placeholder="Ex: Talent Acquisition, HR Manager, CEO..." />
                <Textarea label="Sobre a empresa" value={companyDescription} onChange={setCompanyDescription} placeholder="Descreve a empresa, a cultura, os projetos, o ambiente de trabalho..." hint="Aparece na página pública da empresa." />
                <div className="settings-2col">
                  <Input label="Localização" value={companyLocation} onChange={setCompanyLocation} placeholder="Ex: Lisboa, Porto, Remote..." />
                  <Input label="Setor / Indústria" value={companyIndustry} onChange={setCompanyIndustry} placeholder="Ex: Tecnologia, Saúde..." />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Dimensão da empresa</label>
                  <div className="settings-size-chips">
                    {['1–10', '11–50', '51–200', '201–500', '500+'].map(s => (
                      <button key={s} type="button" onClick={() => setCompanySize(s)}
                        className={`settings-size-chip${companySize === s ? ' active' : ''}`}
                        style={companySize === s ? { borderColor: accentColor, background: `${accentColor}15`, color: accentColor } : undefined}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Website" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://empresa.com" />
                <Input label="LinkedIn" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/..." hint="O LinkedIn da empresa ou o teu perfil pessoal." />
                {saveBlock}
              </SectionCard>
            )}

            {activeTab === 'recrutamento' && isRecruiter && (
              <SectionCard title="O que procuras">
                <div className="settings-info-banner" style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}33` }}>
                  <Search size={14} color={accentColor} />
                  <span className="text-sm font-semibold" style={{ color: accentColor, lineHeight: 1.4 }}>
                    Esta informação ajuda os alunos a perceber se o teu perfil é relevante para eles
                  </span>
                </div>
                <Textarea label="Perfil que procuras" value={lookingFor} onChange={setLookingFor} placeholder="Ex: Procuro estagiários de Engenharia Informática com projetos na área de mobile ou web..." hint="Aparece no teu perfil público. Quanto mais detalhe deres, mais facilmente os alunos percebem se se encaixam." />
                {saveBlock}
              </SectionCard>
            )}

            {activeTab === 'notificacoes' && (
              <SectionCard title="Notificações por email">
                <p className="text-sm text-muted mb-4">Escolhe que comunicações queres receber por email.</p>
                {[
                  { key: 'notifyProjectActivity', state: notifyProjectActivity, setter: setNotifyProjectActivity, icon: <FolderOpen size={14} />, title: 'Atividade nos projetos', desc: isRecruiter ? 'Novos candidatos, atualizações de perfis e projetos relevantes.' : 'Comentários, convites de colaboração e atualizações nos teus projetos.' },
                  { key: 'notifyProductUpdates', state: notifyProductUpdates, setter: setNotifyProductUpdates, icon: <Rocket size={14} />, title: 'Novidades do produto', desc: 'Novas funcionalidades, melhorias e atualizações da plataforma.' },
                  { key: 'notifyNewsletter', state: notifyNewsletter, setter: setNotifyNewsletter, icon: <Mail size={14} />, title: 'Newsletter', desc: 'Dicas, casos de sucesso e conteúdo educativo — enviado ocasionalmente.' },
                  { key: 'notifyMarketing', state: notifyMarketing, setter: setNotifyMarketing, icon: <Megaphone size={14} />, title: 'Promoções e ofertas', desc: 'Ofertas especiais, eventos e oportunidades exclusivas.' },
                ].map(n => (
                  <div key={n.key} className="settings-field" style={{ marginBottom: 8 }}>
                    <button type="button" onClick={() => n.setter(v => !v)} className={`settings-toggle${n.state ? ' active' : ''}`}>
                      <div className={`settings-toggle-track ${n.state ? 'on' : 'off'}`}>
                        <div className={`settings-toggle-knob ${n.state ? 'on' : 'off'}`} />
                      </div>
                      <div>
                        <div className="settings-toggle-title" style={{ color: n.state ? 'var(--color-success)' : undefined }}>
                          {n.icon} {n.title}
                        </div>
                        <div className="settings-toggle-desc">{n.desc}</div>
                      </div>
                    </button>
                  </div>
                ))}
                {saveBlock}
              </SectionCard>
            )}

            {activeTab === 'privacidade' && (
              <SectionCard title="Privacidade">
                <div className="settings-field">
                  <label className="settings-label">Visibilidade do perfil</label>
                  <div className="settings-visibility-options">
                    {[
                      { value: 'public', icon: <Globe size={16} />, label: 'Público', desc: 'Qualquer pessoa pode ver o teu perfil e projetos.' },
                      { value: 'registered', icon: <Eye size={16} />, label: 'Apenas utilizadores', desc: 'Só quem tem conta no Showo pode ver o teu perfil.' },
                      { value: 'private', icon: <EyeOff size={16} />, label: 'Privado', desc: 'Só tu consegues ver o teu perfil.' },
                    ].map(v => (
                      <button key={v.value} type="button" onClick={() => setProfileVisibility(v.value)}
                        className={`settings-visibility-option${profileVisibility === v.value ? ' active' : ''}`}>
                        <div className="settings-visibility-icon" style={{ color: profileVisibility === v.value ? 'var(--color-accent)' : undefined }}>{v.icon}</div>
                        <div>
                          <div className="text-base font-semibold">{v.label}</div>
                          <div className="text-sm text-muted">{v.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-field" style={{ marginBottom: 8 }}>
                  <button type="button" onClick={() => setShowEmailPublicly(v => !v)} className={`settings-toggle${showEmailPublicly ? ' active' : ''}`}>
                    <div className={`settings-toggle-track ${showEmailPublicly ? 'on' : 'off'}`}>
                      <div className={`settings-toggle-knob ${showEmailPublicly ? 'on' : 'off'}`} />
                    </div>
                    <div>
                      <div className="settings-toggle-title" style={{ color: showEmailPublicly ? 'var(--color-success)' : undefined }}>
                        <Mail size={14} /> Mostrar email no perfil
                      </div>
                      <div className="settings-toggle-desc">Permite que outros utilizadores vejam o teu email no teu perfil público.</div>
                    </div>
                  </button>
                </div>
                {saveBlock}
              </SectionCard>
            )}

            {activeTab === 'plano' && (
              <PlanSection planId={planId} navigate={navigate} />
            )}

            {activeTab === 'embaixador' && ambassadorStats && (
              <SectionCard title="Programa de Embaixador">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="settings-label">O teu link de referral</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input readOnly value={`https://showo.pt/?ref=${ambassadorStats.referral_code}`}
                        className="settings-input" style={{ flex: 1, fontSize: 13 }} />
                      <button onClick={() => { navigator.clipboard.writeText(`https://showo.pt/?ref=${ambassadorStats.referral_code}`); setSaveMsg('Link copiado!'); setTimeout(() => setSaveMsg(null), 2000) }}
                        className="settings-save-btn" style={{ whiteSpace: 'nowrap' }}>Copiar</button>
                    </div>
                    <p className="settings-hint">Código: <strong>{ambassadorStats.referral_code}</strong></p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Registos', value: ambassadorStats.total_signups },
                      { label: 'Conversões pagas', value: ambassadorStats.paid_conversions },
                      { label: 'Comissões ativas', value: ambassadorStats.active_commissions },
                      { label: 'Total ganho', value: `€${Number(ambassadorStats.total_earned || 0).toFixed(2)}` },
                    ].map(s => (
                      <div key={s.label} style={{
                        background: 'var(--color-bg-secondary)', borderRadius: 10, padding: '14px 16px',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="settings-label">Pagamentos (Stripe Connect)</label>
                    {ambassadorStats.stripe_connect_onboarded ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontSize: 14, fontWeight: 600 }}>
                        <Check size={16} /> Pagamentos configurados
                      </div>
                    ) : (
                      <button disabled={connectLoading} onClick={async () => {
                        setConnectLoading(true)
                        try {
                          const { data, error } = await supabase.functions.invoke('ambassador-connect-onboard')
                          if (data?.url) window.location.href = data.url
                        } finally { setConnectLoading(false) }
                      }} className="settings-save-btn">
                        {connectLoading ? 'A abrir...' : 'Configurar pagamentos'}
                      </button>
                    )}
                    <p className="settings-hint">Configura a tua conta Stripe para receber comissões automaticamente.</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeTab === 'aparencia' && (
              <SectionCard title="Aparência">{themeBlock}</SectionCard>
            )}

            {activeTab === 'conta' && (
              <>
                <SectionCard title="Conta">
                  <div className="settings-field">
                    <label className="settings-label">Email</label>
                    <div className="settings-static-field">{user.email}</div>
                    <p className="settings-hint">O email não pode ser alterado.</p>
                  </div>
                </SectionCard>
                <SectionCard title="Alterar password">{passwordBlock}</SectionCard>
                <SectionCard title="Sessão">
                  <p className="text-base text-muted mb-3" style={{ lineHeight: 1.65 }}>Terminar sessão em todos os dispositivos.</p>
                  <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} className="settings-danger-btn">Terminar sessão</button>
                </SectionCard>
                <SectionCard title="Zona de perigo">{dangerZone}</SectionCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
