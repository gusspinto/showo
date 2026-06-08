import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Navbar } from '../components/Navbar'
import { Loader, Check, X, AlertTriangle, Camera, ArrowLeft, GraduationCap, BookOpen, Search, Building2, Lock, Briefcase, Sun, Moon } from 'lucide-react'
import { CropModal } from '../components/CropModal'
import { containsProfanity } from '../lib/profanity'
import SkillsPicker from '../components/SkillsPicker'

const C = {
  bg:          'var(--c-bg)',
  bgAlt:       'var(--c-bg-alt)',
  card:        'var(--c-card)',
  cardHover:   'var(--c-card-hover)',
  border:      'var(--c-border)',
  borderBright:'var(--c-border-bright)',
  borderFocus: '#1b78f7',
  blue:        '#1b78f7',
  blueHover:   '#1564d4',
  muted:       'var(--c-muted)',
  text:        'var(--c-text)',
  subtle:      'var(--c-subtle)',
  inputBg:     'var(--c-bg)',
  red:         '#ef4444',
  green:       '#22c55e',
}

function Input({ label, value, onChange, placeholder, hint, type = 'text', prefix }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: 14, fontSize: 14, color: C.subtle,
            pointerEvents: 'none', userSelect: 'none',
          }}>{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: C.inputBg,
            border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
            borderRadius: 10,
            color: C.text,
            fontSize: 14,
            padding: prefix ? '12px 14px 12px 32px' : '12px 14px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px rgba(27,120,247,0.12)` : 'none',
          }}
        />
      </div>
      {hint && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.subtle, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          background: C.inputBg,
          border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
          borderRadius: 10,
          color: C.text,
          fontSize: 14,
          padding: '12px 14px',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          resize: 'vertical',
          minHeight: 90,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? `0 0 0 3px rgba(27,120,247,0.12)` : 'none',
        }}
      />
      {hint && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.subtle, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '28px 28px 22px',
      marginBottom: 20,
    }}>
      <h2 style={{ margin: '0 0 22px', fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, loading: authLoading, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]         = useState('perfil')

  const [fullName, setFullName]           = useState('')
  const [username, setUsername]           = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio]                     = useState('')
  const [role, setRole]                   = useState('aluno')
  const [saving, setSaving]               = useState(false)
  const [saveMsg, setSaveMsg]             = useState(null)

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const debounceRef = useRef(null)

  const [avatarUrl, setAvatarUrl]     = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarCropFile, setAvatarCropFile] = useState(null)
  const avatarInputRef = useRef(null)

  const [availableForWork, setAvailableForWork] = useState(false)

  // Recruiter fields
  const [company, setCompany]                   = useState('')
  const [companyRole, setCompanyRole]           = useState('')
  const [companyWebsite, setCompanyWebsite]     = useState('')
  const [linkedinUrl, setLinkedinUrl]           = useState('')
  const [lookingFor, setLookingFor]             = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [companyLocation, setCompanyLocation]   = useState('')
  const [companyIndustry, setCompanyIndustry]   = useState('')
  const [companySize, setCompanySize]           = useState('')

  // Skills (aluno/professor)
  const [skills, setSkills] = useState([])

  const [currentPw, setCurrentPw]     = useState('')
  const [newPw, setNewPw]             = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwMsg, setPwMsg]             = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    // Pre-fill from user_metadata
    setFullName(user.user_metadata?.full_name ?? '')
    // Load profile
    supabase.from('profiles').select('username, bio, role, avatar_url, available_for_work, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, skills').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? '')
        setOriginalUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setRole(data.role ?? 'aluno')
        setAvatarUrl(data.avatar_url ?? '')
        setAvailableForWork(data.available_for_work ?? false)
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
      }
    })
  }, [user])

  // Real-time username availability check
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const trimmed = username.trim()

    if (!trimmed || trimmed === originalUsername) {
      setUsernameStatus(null)
      return
    }
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .single()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [username, originalUsername])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 10 * 1024 * 1024) {
      setSaveMsg({ type: 'err', text: 'A imagem não pode ter mais de 10 MB.' })
      return
    }
    setAvatarCropFile(file)
    if (e.target) e.target.value = ''
  }

  async function handleAvatarCropConfirm(blob) {
    setAvatarCropFile(null)
    if (!user) return
    setAvatarUploading(true)
    setSaveMsg(null)
    const path = `${user.id}/avatar.jpg`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) {
      setSaveMsg({ type: 'err', text: 'Erro ao carregar imagem.' })
      setAvatarUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const bustedUrl = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: bustedUrl }).eq('id', user.id)
    setAvatarUrl(bustedUrl)
    refreshProfile()
    setSaveMsg({ type: 'ok', text: 'Foto de perfil atualizada.' })
    setAvatarUploading(false)
  }

  async function handleRemoveAvatar() {
    if (!user) return
    setAvatarUploading(true)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    setAvatarUrl('')
    refreshProfile()
    setSaveMsg({ type: 'ok', text: 'Foto removida.' })
    setAvatarUploading(false)
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)

    // Profanity check on name and bio
    if (containsProfanity(fullName) || containsProfanity(bio)) {
      setSaveMsg({ type: 'err', text: 'Linguagem inapropriada detetada. A Showo é uma plataforma para estudantes — mantém o perfil respeitoso.' })
      setSaving(false)
      return
    }

    // Validate username
    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setSaveMsg({ type: 'err', text: 'Username só pode ter letras minúsculas, números e _ (3–30 caracteres).' })
      setSaving(false)
      return
    }
    if (usernameStatus === 'taken') {
      setSaveMsg({ type: 'err', text: 'Este username já está a ser usado.' })
      setSaving(false)
      return
    }

    try {
      // Update auth metadata (full_name + role kept in sync)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), role }
      })
      if (metaError) throw metaError

      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        role,
        available_for_work: availableForWork,
        ...((role === 'aluno' || role === 'professor') ? {
          skills,
        } : {}),
        ...(role === 'recrutador' || role === 'empresa' ? {
          company: company.trim() || null,
          company_role: companyRole.trim() || null,
          company_website: companyWebsite.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          looking_for: lookingFor.trim() || null,
          company_description: companyDescription.trim() || null,
          company_location: companyLocation.trim() || null,
          company_industry: companyIndustry.trim() || null,
          company_size: companySize.trim() || null,
        } : {}),
      })
      if (profileError) {
        if (profileError.code === '23505') {
          setSaveMsg({ type: 'err', text: 'Este username já está a ser usado.' })
          setSaving(false)
          return
        }
        throw profileError
      }

      setOriginalUsername(username.trim())
      setUsernameStatus(null)
      refreshProfile()
      setSaveMsg({ type: 'ok', text: 'Perfil guardado.' })
    } catch (err) {
      setSaveMsg({ type: 'err', text: err.message ?? 'Erro ao guardar.' })
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    setPwMsg(null)
    if (!newPw || newPw.length < 6) {
      setPwMsg({ type: 'err', text: 'A nova password deve ter pelo menos 6 caracteres.' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'err', text: 'As passwords não coincidem.' })
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwMsg({ type: 'err', text: error.message ?? 'Erro ao alterar password.' })
    } else {
      setPwMsg({ type: 'ok', text: 'Password alterada com sucesso.' })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setPwSaving(false)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!user) return null

  const isRecruiter = role === 'recrutador' || role === 'empresa'
  const accentColor = role === 'empresa' ? '#f59e0b' : '#8b5cf6'

  // Tab definitions for recruiter/empresa
  const recruiterTabs = [
    { id: 'perfil',       label: 'Perfil',       icon: <Camera size={15} /> },
    { id: 'empresa',      label: 'Empresa',       icon: <Building2 size={15} /> },
    { id: 'recrutamento', label: 'Recrutamento',  icon: <Search size={15} /> },
    { id: 'conta',        label: 'Conta',         icon: <Lock size={15} /> },
  ]

  /* ── shared: avatar block ── */
  const avatarBlock = (
    <div className="settings-profile-hd" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.border}` }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${accentColor},#4f46e5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', border: `2px solid ${C.border}` }}>
            {fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
          style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: accentColor, border: `2px solid ${C.inputBg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'default' : 'pointer', opacity: avatarUploading ? 0.6 : 1 }}>
          <Camera size={13} color="#fff" />
        </button>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
        {avatarCropFile && <CropModal file={avatarCropFile} circular={true} onConfirm={handleAvatarCropConfirm} onCancel={() => setAvatarCropFile(null)} />}
      </div>
      <div>
        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
          style={{ display: 'block', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', color: C.text, fontSize: 13, fontWeight: 600, cursor: avatarUploading ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: avatarUploading ? 0.6 : 1 }}>
          {avatarUploading ? 'A carregar…' : 'Alterar foto'}
        </button>
        {avatarUrl && (
          <button type="button" onClick={handleRemoveAvatar} disabled={avatarUploading}
            style={{ display: 'block', background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Remover foto
          </button>
        )}
        <p style={{ margin: '8px 0 0', fontSize: 12, color: C.subtle }}>JPG, PNG ou WebP · máx. 5 MB</p>
      </div>
    </div>
  )

  /* ── shared: save button + msg ── */
  const saveBlock = (
    <>
      {saveMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: saveMsg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${saveMsg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: saveMsg.type === 'ok' ? C.green : C.red, fontSize: 13 }}>
          {saveMsg.text}
        </div>
      )}
      <button onClick={handleSaveProfile} disabled={saving}
        style={{ background: saving ? C.border : `linear-gradient(135deg, ${accentColor}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : `0 4px 16px ${accentColor}55`, transition: 'background 0.2s' }}>
        {saving ? 'A guardar...' : 'Guardar'}
      </button>
    </>
  )

  /* ── role badge ── */
  const ROLE_INFO = {
    aluno:      { icon: <GraduationCap size={18} />, label: 'Aluno',      color: '#1b78f7' },
    professor:  { icon: <BookOpen size={18} />,      label: 'Professor',  color: '#10b981' },
    recrutador: { icon: <Search size={18} />,        label: 'Recrutador', color: '#8b5cf6' },
    empresa:    { icon: <Building2 size={18} />,     label: 'Empresa',    color: '#f59e0b' },
  }
  const r = ROLE_INFO[role] ?? ROLE_INFO.aluno
  const roleBadge = (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 10 }}>Tipo de conta</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${r.color}0d`, border: `1.5px solid ${r.color}40`, borderRadius: 10, padding: '12px 16px' }}>
        <span style={{ color: r.color, display: 'flex', alignItems: 'center' }}>{r.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{r.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.subtle, display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={11} /> Definido no registo</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (max-width: 600px) { .settings-2col { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .settings-tab-row { gap: 3px !important; } .settings-tab-row button { min-width: 0 !important; padding: 9px 10px !important; font-size: 12px !important; } }
        @media (max-width: 400px) { .settings-profile-hd { flex-direction: column; align-items: flex-start !important; gap: 12px !important; } }
        @media (max-width: 500px) { .settings-security-row { flex-direction: column; align-items: flex-start !important; } }
      `}</style>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Definições</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Gere o teu perfil e conta</p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginTop: 4, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-border-bright)'; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>

        {/* ═══ RECRUITER / EMPRESA: tabbed layout ═══ */}
        {isRecruiter ? (
          <>
            {/* Tab bar */}
            <div className="settings-tab-row" style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 5, overflowX: 'auto' }}>
              {recruiterTabs.map(t => {
                const active = activeTab === t.id
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.18s', background: active ? accentColor : 'transparent', color: active ? '#fff' : C.muted, boxShadow: active ? `0 2px 8px ${accentColor}44` : 'none', whiteSpace: 'nowrap' }}>
                    {t.icon} {t.label}
                  </button>
                )
              })}
            </div>

            {/* ── Tab: Perfil ── */}
            {activeTab === 'perfil' && (
              <SectionCard title="Perfil público">
                {avatarBlock}
                <Input label="Nome" value={fullName} onChange={setFullName} placeholder="O teu nome" />
                <Input label="Username" value={username} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="ex: rh_empresa" prefix="@"
                  hint={
                    usernameStatus === 'checking'  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader size={12} /> A verificar...</span> :
                    usernameStatus === 'available' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Disponível!</span> :
                    usernameStatus === 'taken'     ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={12} /> Já está a ser usado.</span> :
                    usernameStatus === 'invalid'   ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Só letras minúsculas, números e _.</span> :
                    `showo.vercel.app/u/${username || 'username'}`
                  }
                />
                <Textarea label="Apresentação" value={bio} onChange={setBio} placeholder="Apresenta a tua empresa ou o teu trabalho como recrutador..." hint="Aparece no teu perfil público — os alunos vêem isto." />
                {roleBadge}
                {saveBlock}
              </SectionCard>
            )}

            {/* ── Tab: Empresa ── */}
            {activeTab === 'empresa' && (
              <SectionCard title="Dados da empresa">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '10px 14px', background: `${accentColor}0d`, border: `1px solid ${accentColor}33`, borderRadius: 10 }}>
                  <Building2 size={14} color={accentColor} />
                  <span style={{ fontSize: 13, color: accentColor, fontWeight: 600 }}>
                    Estes dados ficam visíveis no teu perfil público
                  </span>
                </div>
                <Input label="Nome da empresa" value={company} onChange={setCompany} placeholder="Ex: Google, NOS, Altice..." />
                <Input label="O teu cargo" value={companyRole} onChange={setCompanyRole} placeholder="Ex: Talent Acquisition, HR Manager, CEO..." />
                <Textarea label="Sobre a empresa" value={companyDescription} onChange={setCompanyDescription} placeholder="Descreve a empresa, a cultura, os projetos, o ambiente de trabalho..." hint="Aparece na página pública da empresa." />
                <div className="settings-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input label="Localização" value={companyLocation} onChange={setCompanyLocation} placeholder="Ex: Lisboa, Porto, Remote..." />
                  <Input label="Setor / Indústria" value={companyIndustry} onChange={setCompanyIndustry} placeholder="Ex: Tecnologia, Saúde..." />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>Dimensão da empresa</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['1–10', '11–50', '51–200', '201–500', '500+'].map(s => (
                      <button key={s} type="button" onClick={() => setCompanySize(s)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${companySize === s ? accentColor : C.border}`, background: companySize === s ? `${accentColor}15` : 'transparent', color: companySize === s ? accentColor : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
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

            {/* ── Tab: Recrutamento ── */}
            {activeTab === 'recrutamento' && (
              <SectionCard title="O que procuras">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '10px 14px', background: `${accentColor}0d`, border: `1px solid ${accentColor}33`, borderRadius: 10 }}>
                  <Search size={14} color={accentColor} />
                  <span style={{ fontSize: 13, color: accentColor, fontWeight: 600, lineHeight: 1.4 }}>
                    Esta informação ajuda os alunos a perceber se o teu perfil é relevante para eles
                  </span>
                </div>
                <Textarea label="Perfil que procuras" value={lookingFor} onChange={setLookingFor} placeholder="Ex: Procuro estagiários de Engenharia Informática com projetos na área de mobile ou web. Valorizamos iniciativa e projetos pessoais..." hint="Aparece no teu perfil público. Quanto mais detalhe deres, mais facilmente os alunos percebem se se encaixam." />
                {saveBlock}
              </SectionCard>
            )}

            {/* ── Tab: Conta ── */}
            {activeTab === 'conta' && (
              <>
                <SectionCard title="Email">
                  <div style={{ marginBottom: 4 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>Email</label>
                    <div style={{ background: C.inputBg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: C.subtle, fontSize: 14, fontFamily: 'inherit' }}>{user.email}</div>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: C.subtle }}>O email não pode ser alterado.</p>
                  </div>
                </SectionCard>

                <SectionCard title="Alterar password">
                  <Input label="Nova password" type="password" value={newPw} onChange={setNewPw} placeholder="Mínimo 6 caracteres" />
                  <Input label="Confirmar nova password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repete a nova password" />
                  {pwMsg && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: pwMsg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${pwMsg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: pwMsg.type === 'ok' ? C.green : C.red, fontSize: 13 }}>
                      {pwMsg.text}
                    </div>
                  )}
                  <button onClick={handleChangePassword} disabled={pwSaving}
                    style={{ background: pwSaving ? C.border : 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 24px', color: C.text, fontSize: 14, fontWeight: 600, cursor: pwSaving ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'border-color 0.2s, background 0.2s' }}
                    onMouseEnter={e => { if (!pwSaving) { e.currentTarget.style.borderColor = 'var(--c-border-bright)'; e.currentTarget.style.background = 'var(--c-bg-alt)' }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}>
                    {pwSaving ? 'A alterar...' : 'Alterar password'}
                  </button>
                </SectionCard>

                <SectionCard title="Aparência">
                  <div className="settings-security-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>Tema</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'}</div>
                    </div>
                    <button onClick={toggleTheme}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme === 'dark' ? 'rgba(27,120,247,0.1)' : 'rgba(251,191,36,0.1)', border: `1.5px solid ${theme === 'dark' ? 'rgba(27,120,247,0.3)' : 'rgba(251,191,36,0.3)'}`, borderRadius: 10, padding: '10px 18px', color: theme === 'dark' ? C.blue : '#d97706', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', flexShrink: 0 }}>
                      {theme === 'dark'
                        ? <><Sun size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Modo claro</>
                        : <><Moon size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Modo escuro</>}
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Sessão">
                  <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.65 }}>Terminar sessão em todos os dispositivos.</p>
                  <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '11px 24px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                    Terminar sessão
                  </button>
                </SectionCard>
              </>
            )}
          </>
        ) : (

        /* ═══ ALUNO / PROFESSOR: original single-page layout ═══ */
        <>
          {/* Profile */}
          <SectionCard title="Perfil público">
            {avatarBlock}
            <Input label="Nome" value={fullName} onChange={setFullName} placeholder="O teu nome" />
            <Input label="Username" value={username} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="ex: gustavo_silva" prefix="@"
              hint={
                usernameStatus === 'checking'  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> A verificar disponibilidade...</span> :
                usernameStatus === 'available' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Username disponível!</span> :
                usernameStatus === 'taken'     ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Este username já está a ser usado.</span> :
                usernameStatus === 'invalid'   ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Só letras minúsculas, números e _ (mín. 3 caracteres).</span> :
                `Link público: showo.vercel.app/u/${username || 'username'}`
              }
            />
            <Textarea label="Bio" value={bio} onChange={setBio} placeholder="Conta um pouco sobre ti e os teus projetos..." hint="Aparece no teu perfil público." />

            {/* Available for work toggle — aluno only */}
            {role === 'aluno' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 10 }}>Disponibilidade</label>
                <button type="button" onClick={() => setAvailableForWork(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: availableForWork ? 'rgba(34,197,94,0.07)' : C.inputBg, border: `1.5px solid ${availableForWork ? 'rgba(34,197,94,0.35)' : C.border}`, borderRadius: 10, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'left' }}>
                  <div style={{ width: 42, height: 24, borderRadius: 12, flexShrink: 0, background: availableForWork ? '#22c55e' : C.subtle, position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: availableForWork ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: availableForWork ? '#22c55e' : C.text, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Briefcase size={14} style={{ flexShrink: 0 }} />
                      {availableForWork ? 'Disponível para estágio' : 'Não disponível para estágio'}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
                      {availableForWork ? 'O teu perfil aparece nos resultados de recrutadores e empresas.' : 'Ativa para aparecer em pesquisas de recrutadores.'}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Skills picker — aluno & professor */}
            <div style={{ marginBottom: 20 }}>
              <SkillsPicker value={skills} onChange={setSkills} max={12} label="Competências" />
            </div>

            {roleBadge}
            {saveBlock}
          </SectionCard>

          {/* Email */}
          <SectionCard title="Conta">
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>Email</label>
              <div style={{ background: C.inputBg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: C.subtle, fontSize: 14, fontFamily: 'inherit' }}>{user.email}</div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: C.subtle }}>O email não pode ser alterado.</p>
            </div>
          </SectionCard>

          {/* Password */}
          <SectionCard title="Alterar password">
            <Input label="Nova password" type="password" value={newPw} onChange={setNewPw} placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar nova password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repete a nova password" />
            {pwMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: pwMsg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${pwMsg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: pwMsg.type === 'ok' ? C.green : C.red, fontSize: 13 }}>
                {pwMsg.text}
              </div>
            )}
            <button onClick={handleChangePassword} disabled={pwSaving}
              style={{ background: pwSaving ? C.border : 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 24px', color: C.text, fontSize: 14, fontWeight: 600, cursor: pwSaving ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { if (!pwSaving) { e.currentTarget.style.borderColor = 'var(--c-border-bright)'; e.currentTarget.style.background = 'var(--c-bg-alt)' }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}>
              {pwSaving ? 'A alterar...' : 'Alterar password'}
            </button>
          </SectionCard>

          {/* Appearance */}
          <SectionCard title="Aparência">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>Tema</div>
                <div style={{ fontSize: 13, color: C.muted }}>{theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'}</div>
              </div>
              <button onClick={toggleTheme}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme === 'dark' ? 'rgba(27,120,247,0.1)' : 'rgba(251,191,36,0.1)', border: `1.5px solid ${theme === 'dark' ? 'rgba(27,120,247,0.3)' : 'rgba(251,191,36,0.3)'}`, borderRadius: 10, padding: '10px 18px', color: theme === 'dark' ? C.blue : '#d97706', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', flexShrink: 0 }}>
                {theme === 'dark'
                  ? <><Sun size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Modo claro</>
                  : <><Moon size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Modo escuro</>}
              </button>
            </div>
          </SectionCard>

          {/* Danger zone */}
          <SectionCard title="Zona de perigo">
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.65 }}>Terminar sessão em todos os dispositivos.</p>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '11px 24px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
              Terminar sessão
            </button>
          </SectionCard>
        </>
        )}
      </div>
    </div>
  )
}
