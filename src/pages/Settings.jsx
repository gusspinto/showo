import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Loader, Check, X, AlertTriangle } from 'lucide-react'

const C = {
  bg: '#0d1424',
  card: '#111827',
  border: '#1e3050',
  borderFocus: '#3b82f6',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  muted: '#7d93b0',
  text: '#e8f2ff',
  subtle: '#3d5270',
  inputBg: '#0a1118',
  red: '#f87171',
  green: '#34d399',
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
            fontSize: 15,
            padding: prefix ? '12px 14px 12px 32px' : '12px 14px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px rgba(59,130,246,0.12)` : 'none',
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
          fontSize: 15,
          padding: '12px 14px',
          outline: 'none',
          fontFamily: 'Inter, sans-serif',
          boxSizing: 'border-box',
          resize: 'vertical',
          minHeight: 90,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? `0 0 0 3px rgba(59,130,246,0.12)` : 'none',
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
  const navigate = useNavigate()

  const [fullName, setFullName]           = useState('')
  const [username, setUsername]           = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio]                     = useState('')
  const [saving, setSaving]               = useState(false)
  const [saveMsg, setSaveMsg]             = useState(null)

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const debounceRef = useRef(null)

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
    supabase.from('profiles').select('username, bio').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username ?? '')
        setOriginalUsername(data.username ?? '')
        setBio(data.bio ?? '')
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

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)

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
      // Update auth metadata (full_name)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      })
      if (metaError) throw metaError

      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '44px 24px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Definições</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Gere o teu perfil e conta</p>
        </div>

        {/* Profile */}
        <SectionCard title="Perfil público">
          <Input
            label="Nome"
            value={fullName}
            onChange={setFullName}
            placeholder="O teu nome"
          />
          <Input
            label="Username"
            value={username}
            onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="ex: gustavo_silva"
            prefix="@"
            hint={
              usernameStatus === 'checking'  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> A verificar disponibilidade...</span> :
              usernameStatus === 'available' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Username disponível!</span> :
              usernameStatus === 'taken'     ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Este username já está a ser usado.</span> :
              usernameStatus === 'invalid'   ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Só letras minúsculas, números e _ (mín. 3 caracteres).</span> :
              `Link público: showo.vercel.app/u/${username || 'username'}`
            }
          />
          <Textarea
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="Conta um pouco sobre ti e os teus projetos..."
            hint="Aparece no teu perfil público."
          />

          {saveMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: saveMsg.type === 'ok' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${saveMsg.type === 'ok' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
              color: saveMsg.type === 'ok' ? C.green : C.red,
              fontSize: 13,
            }}>
              {saveMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              background: saving ? C.border : `linear-gradient(135deg, ${C.blue}, #4f46e5)`,
              border: 'none', borderRadius: 10,
              padding: '12px 24px', color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'A guardar...' : 'Guardar perfil'}
          </button>
        </SectionCard>

        {/* Email */}
        <SectionCard title="Conta">
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 7 }}>Email</label>
            <div style={{
              background: C.inputBg, border: `1.5px solid ${C.border}`,
              borderRadius: 10, padding: '12px 14px',
              color: C.subtle, fontSize: 15, fontFamily: 'Inter, sans-serif',
            }}>
              {user.email}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.subtle }}>O email não pode ser alterado.</p>
          </div>
        </SectionCard>

        {/* Password */}
        <SectionCard title="Alterar password">
          <Input label="Nova password" type="password" value={newPw} onChange={setNewPw} placeholder="Mínimo 6 caracteres" />
          <Input label="Confirmar nova password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repete a nova password" />

          {pwMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: pwMsg.type === 'ok' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${pwMsg.type === 'ok' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
              color: pwMsg.type === 'ok' ? C.green : C.red,
              fontSize: 13,
            }}>
              {pwMsg.text}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={pwSaving}
            style={{
              background: pwSaving ? C.border : 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '11px 24px', color: C.text,
              fontSize: 14, fontWeight: 600,
              cursor: pwSaving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { if (!pwSaving) { e.currentTarget.style.borderColor = '#2a4275'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}
          >
            {pwSaving ? 'A alterar...' : 'Alterar password'}
          </button>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Zona de perigo">
          <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.65 }}>
            Terminar sessão em todos os dispositivos.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              navigate('/')
            }}
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 10, padding: '11px 24px',
              color: C.red, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          >
            Terminar sessão
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
