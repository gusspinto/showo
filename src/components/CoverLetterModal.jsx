import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Check, X, GraduationCap, Briefcase, Sparkles, Lightbulb, ArrowLeft } from 'lucide-react'

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  border: 'var(--c-border)',
  blue: '#1b78f7',
  muted: 'var(--c-muted)',
  text: 'var(--c-text)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  inputBg: '#060c16',
}

function Btn({ children, onClick, primary, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'var(--c-border)' : primary ? 'linear-gradient(135deg, #1b78f7, #4f46e5)' : 'transparent',
        border: primary ? 'none' : `1px solid ${C.border}`,
        borderRadius: 9, padding: '11px 20px',
        color: disabled ? 'var(--c-subtle)' : primary ? '#fff' : C.muted,
        fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        boxShadow: primary && !disabled ? '0 4px 16px rgba(27,120,247,0.3)' : 'none',
        transition: 'opacity 0.15s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled && primary) e.currentTarget.style.opacity = '0.88' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
        <button
          onClick={copy}
          style={{
            background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(27,120,247,0.1)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.2)'}`,
            borderRadius: 6, padding: '3px 10px',
            color: copied ? C.green : '#60a5fa',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {copied ? <><Check size={12} style={{ verticalAlign: 'middle' }} /> Copiado</> : 'Copiar'}
        </button>
      </div>
      <div style={{
        background: C.inputBg, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '12px 14px',
        color: C.text, fontSize: 14, lineHeight: 1.7,
        whiteSpace: 'pre-wrap', fontFamily: 'inherit',
      }}>
        {value}
      </div>
    </div>
  )
}

export default function CoverLetterModal({ projects, studentName, onClose }) {
  const [company, setCompany]   = useState('')
  const [sector, setSector]     = useState('')
  const [type, setType]         = useState('internship')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function generate() {
    if (!company.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    const { data, error: err } = await supabase.functions.invoke('cover-letter', {
      body: { projects, studentName, company: company.trim(), sector: sector.trim(), type },
    })
    if (err || data?.error) {
      setError('Erro ao gerar. Tenta novamente.')
    } else {
      setResult(data)
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9800,
        background: 'rgba(5,9,18,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', fontFamily: 'inherit',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--c-card)', border: `1px solid var(--c-border)`,
        borderRadius: 20, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text }}>Kit de Estágio</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Gerado com base nos teus projetos no Showo</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {!result ? (
            <>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {[
                  { val: 'internship', Icon: GraduationCap, label: 'Estágio' },
                  { val: 'job',        Icon: Briefcase,     label: 'Emprego' },
                ].map(({ val, Icon, label }) => (
                  <button
                    key={val}
                    onClick={() => setType(val)}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: type === val ? 'rgba(27,120,247,0.12)' : 'transparent',
                      border: `1.5px solid ${type === val ? '#1b78f7' : C.border}`,
                      borderRadius: 10, color: type === val ? '#60a5fa' : C.muted,
                      fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {/* Company */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Empresa / Organização *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="ex: NOS, Vodafone, startup local..."
                  onKeyDown={e => e.key === 'Enter' && generate()}
                  style={{
                    width: '100%', background: C.inputBg,
                    border: `1.5px solid ${C.border}`, borderRadius: 10,
                    color: C.text, fontSize: 15, padding: '11px 14px',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Sector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Setor <span style={{ color: C.subtle }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="ex: tecnologia, saúde, educação..."
                  style={{
                    width: '100%', background: C.inputBg,
                    border: `1.5px solid ${C.border}`, borderRadius: 10,
                    color: C.text, fontSize: 15, padding: '11px 14px',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Projects used */}
              <div style={{ background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Projetos incluídos
                </p>
                {projects.slice(0, 3).map((p, i) => (
                  <p key={i} style={{ margin: '3px 0', fontSize: 13, color: C.muted }}>· {p.name}</p>
                ))}
                {projects.length > 3 && <p style={{ margin: '3px 0', fontSize: 12, color: C.subtle }}>+{projects.length - 3} mais</p>}
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

              <Btn primary onClick={generate} disabled={!company.trim() || loading} style={{ width: '100%' }}>
                {loading ? 'A gerar...' : <><Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Gerar candidatura</>}
              </Btn>
            </>
          ) : (
            <>
              {result.highlight && (
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#22c55e', display: 'flex', alignItems: 'flex-start', gap: 6 }}><Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />{result.highlight}</p>
                </div>
              )}

              <CopyField label="Assunto do Email" value={result.email_subject} />
              <CopyField label="Corpo do Email" value={result.email_body} />
              <CopyField label="Mensagem LinkedIn" value={result.linkedin_message} />

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn onClick={() => setResult(null)} style={{ flex: 1 }}><ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Gerar outra</Btn>
                <Btn primary onClick={onClose} style={{ flex: 1 }}>Fechar</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
