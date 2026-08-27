import { useState, useEffect } from 'react'
import { Bell, Check, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getGeoInfo } from '../lib/geolocation'

const TARGET = new Date('2026-08-01T13:00:00Z') // 14:00 Lisboa

function getTimeLeft() {
  const diff = Math.max(0, TARGET - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function CountdownUnit({ value, label }) {
  const [flip, setFlip] = useState(false)
  const [prev, setPrev] = useState(value)

  useEffect(() => {
    if (value !== prev) {
      setFlip(true)
      const t = setTimeout(() => { setFlip(false); setPrev(value) }, 300)
      return () => clearTimeout(t)
    }
  }, [value, prev])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        position: 'relative',
        width: 'clamp(56px, 16vw, 72px)', height: 'clamp(64px, 18vw, 80px)',
        background: 'rgba(14,23,41,0.8)',
        border: '1px solid rgba(27,120,247,0.15)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        transform: flip ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
          background: 'rgba(27,120,247,0.08)',
        }} />
        <span style={{
          fontFamily: 'var(--font-heading, system-ui)', fontWeight: 800,
          fontSize: 'clamp(24px, 7vw, 32px)', color: '#e8f2ff', letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span style={{
        fontFamily: 'var(--font-body, system-ui)', fontWeight: 500,
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(125,147,176,0.5)',
      }}>
        {label}
      </span>
    </div>
  )
}

function NotifyMe() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    const params = new URLSearchParams(window.location.search)
    const geo = await getGeoInfo()
    const { error } = await supabase.from('waitlist_signups').insert({
      email: email.trim(),
      referrer: document.referrer || null,
      utm_source: params.get('utm_source') || null,
      country: geo?.country || null,
      city: geo?.city || null,
    })
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
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(27,120,247,0.5)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(125,147,176,0.25)'}
      >
        <Bell size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
        Avisa-me quando voltar
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
  const [time, setTime] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      position: 'relative', minHeight: '100vh', background: '#03060d',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 44, overflow: 'hidden', padding: '24px',
    }}>
      <style>{`@media (min-width: 601px) { body { padding-left: 0 !important; } .sidebar { display: none !important; } }`}</style>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(620px 660px at 50% 44%, rgba(18,60,140,0.18) 0%, rgba(18,60,140,0.05) 45%, rgba(3,6,13,0) 70%)',
      }} />

      <img
        src="/icon.png"
        alt=""
        style={{ width: 38, opacity: 0.5, filter: 'drop-shadow(0 0 18px rgba(27,120,247,0.3))' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
            letterSpacing: '0.08em', color: 'rgba(127,180,255,0.7)', textTransform: 'uppercase',
          }}>
            Nova versão
          </span>
        </div>

        <h1 style={{
          margin: 0, fontFamily: 'var(--font-heading, system-ui)', fontWeight: 800,
          fontSize: 'clamp(22px, 5vw, 32px)', color: '#e8f2ff',
          textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
        }}>
          Estamos a construir algo novo
        </h1>

        <p style={{
          margin: 0, fontFamily: 'var(--font-body)', fontWeight: 400,
          fontSize: 15, color: 'rgba(159,176,200,0.7)', textAlign: 'center',
          maxWidth: 360, lineHeight: 1.6,
        }}>
          O Showo vai voltar melhor do que nunca.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 'clamp(6px, 2vw, 12px)', position: 'relative',
      }}>
        <CountdownUnit value={time.days} label="dias" />
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28, color: 'rgba(27,120,247,0.3)', fontSize: 24, fontWeight: 700 }}>:</div>
        <CountdownUnit value={time.hours} label="horas" />
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28, color: 'rgba(27,120,247,0.3)', fontSize: 24, fontWeight: 700 }}>:</div>
        <CountdownUnit value={time.minutes} label="min" />
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28, color: 'rgba(27,120,247,0.3)', fontSize: 24, fontWeight: 700 }}>:</div>
        <CountdownUnit value={time.seconds} label="seg" />
      </div>

      <div style={{ marginTop: 4 }}>
        <NotifyMe />
      </div>
    </div>
  )
}
