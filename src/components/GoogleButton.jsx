import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Google's 4-colour "G" mark (official proportions).
function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

// Shared "Continuar com Google" button — used on both Login and Register.
// Supabase handles the OAuth handshake; on success the browser redirects to
// Google and back to `redirectTo`, so we don't reset loading on the happy path.
const VARIANTS = {
  default: {
    background: '#fff',
    color: '#1f2937',
    border: '1px solid #dadce0',
  },
  subtle: {
    background: 'rgba(27,120,247,0.07)',
    color: 'var(--color-primary)',
    border: '1px solid rgba(27,120,247,0.22)',
  },
}

export default function GoogleButton({ label = 'Continuar com Google', redirectTo, variant = 'default', intent }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const s = VARIANTS[variant] ?? VARIANTS.default

  async function go() {
    setErr('')
    setLoading(true)
    // Carrega o papel/categoria escolhidos no /register através do redirect do
    // OAuth (o localStorage sobrevive à ida e volta ao Google). É isto que o
    // /welcome lê à chegada para dar seguimento certo — individual vai direto
    // para a dashboard, escola pede código de turma, etc. Sem intent (Google
    // a partir da Home ou do Login) o /welcome mostra o seletor normal.
    try {
      if (intent) localStorage.setItem('showo_google_intent', JSON.stringify(intent))
      else localStorage.removeItem('showo_google_intent')
    } catch { /* localStorage indisponível — o /welcome cai no seletor */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo || `${window.location.origin}/welcome` },
    })
    if (error) {
      setErr('Não foi possível continuar com o Google. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="google-btn"
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: s.background, color: s.color,
          border: s.border, borderRadius: 8,
          padding: '12px', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s, box-shadow 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <GoogleG /> {loading ? 'A abrir o Google…' : label}
      </button>
      {err && <p style={{ color: 'var(--color-error)', fontSize: 13, textAlign: 'center', margin: '8px 0 0' }}>{err}</p>}
    </>
  )
}
