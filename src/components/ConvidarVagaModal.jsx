import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'

const C = {
  bg:           'var(--color-bg)',
  card:         'var(--color-surface)',
  border:       'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue:         'var(--color-text)',
  text:         'var(--color-text)',
  muted:        'var(--color-text-secondary)',
  green:        'var(--color-success)',
}

export default function ConvidarVagaModal({ studentId, studentName, vagas, onClose, onSent }) {
  const { user } = useAuth()
  const [selectedVaga, setSelectedVaga] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    if (!selectedVaga || !user) return
    setSending(true)
    setError(null)
    const { error: err } = await supabase.from('vaga_invites').insert({
      vaga_id: selectedVaga,
      recruiter_id: user.id,
      student_id: studentId,
      message: message.trim() || null,
      status: 'pendente',
    })
    if (err) {
      if (err.code === '23505') setError('Já enviaste um convite para esta vaga a este estudante.')
      else setError('Erro ao enviar convite. Tenta novamente.')
      setSending(false)
      return
    }
    setSent(true)
    setSending(false)
    if (onSent) onSent()
    setTimeout(onClose, 2200)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeUp 0.22s ease',
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{
          padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Convidar para vaga</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{studentName}</div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn-ghost"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Check size={24} color={C.green} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 5 }}>Convite enviado!</div>
              <div style={{ fontSize: 13, color: C.muted }}>{studentName} foi notificado por mensagem e notificação.</div>
            </div>
          ) : vagas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Briefcase size={32} color={C.muted} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Sem vagas ativas</div>
              <div style={{ fontSize: 13, color: C.muted }}>
                Cria uma vaga na página <strong>Vagas</strong> antes de convidar estudantes.
              </div>
            </div>
          ) : (
            <>
              {/* Vaga picker */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: C.muted,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  display: 'block', marginBottom: 8,
                }}>
                  Seleciona a vaga
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {vagas.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVaga(v.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                        background: selectedVaga === v.id ? 'var(--color-surface-hover)' : C.bg,
                        border: `1.5px solid ${selectedVaga === v.id ? 'var(--color-surface-hover)' : C.border}`,
                        cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.15s',
                      }}
                    >
                      <Briefcase size={14} color={selectedVaga === v.id ? C.blue : C.muted} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: selectedVaga === v.id ? C.blue : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.title}
                        </div>
                        {(v.location || v.type) && (
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                            {[v.type, v.location].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional message */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: C.muted,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  display: 'block', marginBottom: 8,
                }}>
                  Mensagem (opcional)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Olá! Vi o teu projeto e achei que podes ser uma boa fit para esta vaga…"
                  rows={3}
                  style={{
                    width: '100%', background: C.bg, border: `1.5px solid ${C.border}`,
                    borderRadius: 10, color: C.text, fontSize: 13, padding: '10px 12px',
                    resize: 'none', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s', lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = C.blue}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  fontSize: 12, color: 'var(--color-error)', marginBottom: 12,
                  padding: '8px 12px', background: 'var(--color-error-subtle)',
                  borderRadius: 8, border: '1px solid var(--color-error-subtle)',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={send}
                disabled={!selectedVaga || sending}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10,
                  background: selectedVaga
                    ? 'var(--color-text)'
                    : C.border,
                  border: 'none',
                  color: selectedVaga ? 'var(--color-bg)' : C.muted,
                  fontSize: 14, fontWeight: 700,
                  cursor: selectedVaga ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                  boxShadow: selectedVaga ? '0 4px 16px var(--color-surface-hover)' : 'none',
                }}
              >
                <Send size={14} />
                {sending ? 'A enviar…' : 'Enviar convite'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
