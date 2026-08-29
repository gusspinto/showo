import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { verifyPersonalAccount, exportSchoolProjects } from '../lib/exportProjects'
import { useAuth } from '../context/AuthContext'
import { X, GraduationCap, CheckSquare, Square, ArrowRight, Check, AlertTriangle } from 'lucide-react'

const C = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 24,
  },
  modal: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)', padding: '28px 24px',
    maxWidth: 460, width: '100%',
    display: 'flex', flexDirection: 'column', gap: 20,
    maxHeight: '90vh', overflowY: 'auto',
  },
  title: { margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  sub:   { margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 },
  input: {
    width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 8, padding: '10px 12px', fontSize: 14,
    color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  btn: (primary, disabled) => ({
    padding: '10px 18px', borderRadius: 'var(--radius-md)', border: primary ? 'none' : '1px solid var(--color-border)',
    background: disabled ? 'var(--color-border)' : primary ? 'var(--color-primary)' : 'transparent',
    color: primary ? '#fff' : 'var(--color-text)',
    fontWeight: 600, fontSize: '0.85rem', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }),
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function ExportProjectsModal({ onClose }) {
  const { user } = useAuth()

  // step: 'select' → 'auth' → 'confirm' → 'done'
  const [step, setStep] = useState('select')

  // Step 1 — project selection
  const [projects, setProjects]       = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selected, setSelected]       = useState([])

  // Step 2 — personal account auth
  const [personalEmail, setPersonalEmail] = useState('')
  const [personalPwd, setPersonalPwd]     = useState('')
  const [showPwd, setShowPwd]             = useState(false)
  const [verifying, setVerifying]         = useState(false)
  const [destUserId, setDestUserId]       = useState(null)

  // Step 3 — export
  const [exporting, setExporting]     = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('projects')
      .select('id, name, slug, cover_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoadingProjects(false)
      })
  }, [user])

  function toggleProject(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setVerifying(true)
    const { userId, error: err } = await verifyPersonalAccount(personalEmail.trim(), personalPwd)
    setVerifying(false)
    if (err) { setError(err); return }
    setDestUserId(userId)
    setStep('confirm')
  }

  async function handleExport() {
    setError('')
    setExporting(true)
    const { result, error: err } = await exportSchoolProjects(selected, destUserId)
    setExporting(false)
    if (err) { setError(err); return }
    setExportResult(result)
    setStep('done')
  }

  const copiedCount  = exportResult ? (exportResult.copied?.length ?? 0) : 0
  const skippedCount = exportResult?.skipped ?? 0
  const limitReached = exportResult?.limit_reached ?? false

  return (
    <div style={C.overlay} onClick={onClose}>
      <div style={C.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="var(--color-primary)" />
              <p style={C.title}>Exportar projetos</p>
            </div>
            <p style={C.sub}>
              {step === 'select' && 'Escolhe os projetos desta conta escolar que queres copiar para a tua conta pessoal.'}
              {step === 'auth'   && 'Entra com as credenciais da tua conta pessoal para confirmar o destino.'}
              {step === 'confirm' && 'Confirma a exportação. Os projetos serão copiados; a conta escolar não perde nada.'}
              {step === 'done'   && 'Exportação concluída.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0, padding: 0, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Step 1: select projects ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            {loadingProjects ? (
              <p style={C.sub}>A carregar projetos…</p>
            ) : projects.length === 0 ? (
              <p style={C.sub}>Não tens projetos nesta conta escolar.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map(p => {
                  const isSelected = selected.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: isSelected ? 'rgba(43,126,245,0.07)' : 'var(--color-bg)',
                        border: `1px solid ${isSelected ? 'rgba(43,126,245,0.4)' : 'var(--color-border)'}`,
                        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)', flexShrink: 0 }}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                      {p.cover_url && (
                        <img src={p.cover_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, flex: 1 }}>
                        {p.name || p.slug}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button style={C.btn(false, false)} onClick={onClose}>Cancelar</button>
              <button
                style={C.btn(true, selected.length === 0)}
                disabled={selected.length === 0}
                onClick={() => setStep('auth')}
              >
                Continuar <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: authenticate personal account ──────────────────────── */}
        {step === 'auth' && (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={C.label}>Email da conta pessoal</label>
              <input
                type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
                placeholder="tu@email.com" required style={C.input}
              />
            </div>
            <div>
              <label style={C.label}>Palavra-passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={personalPwd} onChange={e => setPersonalPwd(e.target.value)}
                  placeholder="Palavra-passe da conta pessoal" required
                  style={{ ...C.input, paddingRight: 40 }}
                />
                <button
                  type="button" onClick={() => setShowPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-secondary)', padding: 0, display: 'flex',
                  }}
                >
                  <EyeIcon visible={showPwd} />
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" style={C.btn(false, false)} onClick={() => { setStep('select'); setError('') }}>Voltar</button>
              <button type="submit" style={C.btn(true, verifying)} disabled={verifying}>
                {verifying ? 'A verificar…' : 'Verificar conta'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: confirm ─────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Destino confirmado: <strong style={{ color: 'var(--color-text)' }}>{personalEmail}</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Projetos a copiar: <strong style={{ color: 'var(--color-text)' }}>{selected.length}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                Os projetos são copiados; a conta escolar mantém os originais. Limites de plano da conta pessoal são respeitados.
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={C.btn(false, false)} onClick={() => { setStep('auth'); setError('') }}>Voltar</button>
              <button style={C.btn(true, exporting)} disabled={exporting} onClick={handleExport}>
                {exporting ? 'A exportar…' : 'Confirmar exportação'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: done ────────────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {copiedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: 'var(--color-success)', fontWeight: 600 }}>
                  <Check size={16} />
                  {copiedCount === 1 ? '1 projeto copiado' : `${copiedCount} projetos copiados`} com sucesso para a conta pessoal.
                </div>
              )}

              {limitReached && skippedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-warning)' }} />
                  <span>
                    {skippedCount === 1 ? '1 projeto não foi copiado' : `${skippedCount} projetos não foram copiados`}: a conta pessoal atingiu o limite do plano {exportResult?.dest_plan === 'free' ? 'Grátis (3 projetos)' : 'Build (10 projetos)'}. Faz upgrade para continuar.
                  </span>
                </div>
              )}

              {copiedCount === 0 && !limitReached && (
                <p style={C.sub}>Nenhum projeto foi copiado.</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={C.btn(true, false)} onClick={onClose}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
