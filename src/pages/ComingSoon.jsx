import { useState } from 'react'
import { Bell, Check, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

function NotifyMe() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    const { error } = await supabase.from('waitlist_signups').insert({ email: email.trim() })
    setStatus(error ? 'error' : 'done')
  }

  if (status === 'done') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(125,200,160,0.85)',
      }}>
        <Check size={14} /> Vamos avisar-te
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: '1px solid rgba(125,147,176,0.25)',
          borderRadius: 999, padding: '9px 18px', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13,
          letterSpacing: '0.02em', color: 'rgba(214,224,238,0.75)',
        }}
      >
        <Bell size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
        Avisem-me quando estiver disponível
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(125,147,176,0.25)',
        borderRadius: 999, padding: '6px 6px 6px 18px',
      }}
    >
      <input
        type="email"
        required
        autoFocus
        placeholder="o-teu-email@exemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#e8f2ff',
          width: 190,
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        aria-label="Submeter"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(27,120,247,0.18)', border: '1px solid rgba(27,120,247,0.4)',
          cursor: status === 'loading' ? 'default' : 'pointer', opacity: status === 'loading' ? 0.5 : 1,
        }}
      >
        <ArrowRight size={13} color="#7fb4ff" />
      </button>
    </form>
  )
}

export default function ComingSoon() {
  return (
    <div style={{
      position: 'relative', minHeight: '100vh', background: '#03060d',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 40, overflow: 'hidden', padding: '24px',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(620px 660px at 50% 44%, rgba(18,60,140,0.18) 0%, rgba(18,60,140,0.05) 45%, rgba(3,6,13,0) 70%)',
      }} />

      <img
        src="/icon.png"
        alt=""
        style={{ width: 38, opacity: 0.5, filter: 'drop-shadow(0 0 18px rgba(27,120,247,0.3))' }}
      />

      <img
        src="/logo.png"
        alt="Showo"
        style={{ width: 168, opacity: 0.95, filter: 'drop-shadow(0 0 28px rgba(27,120,247,0.2))' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
          letterSpacing: '0.32em', color: 'rgba(125,147,176,0.5)', textTransform: 'uppercase',
        }}>
          Em breve
        </p>
        <div style={{ width: 22, height: 1, background: 'rgba(125,147,176,0.25)' }} />
        <p style={{
          margin: 0, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14,
          letterSpacing: '0.14em', color: 'rgba(214,224,238,0.62)',
        }}>
          1 de julho
        </p>
      </div>

      <div style={{ marginTop: 8 }}>
        <NotifyMe />
      </div>
    </div>
  )
}
