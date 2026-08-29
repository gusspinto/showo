import { useState } from 'react'
import { Sparkle as Sparkles, MagicWand as Wand2, X, CaretRight as ChevronRight } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

const PROJECT_TYPES = [
  { id: 'personal',    label: 'Pessoal'     },
  { id: 'pap',         label: 'PAP'         },
  { id: 'group',       label: 'Grupo'       },
  { id: 'internship',  label: 'Estágio'     },
  { id: 'competition', label: 'Competição'  },
]

export default function AIInterview({ onComplete, onDismiss }) {
  const [step, setStep]               = useState('input')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState('personal')
  const [interview, setInterview]     = useState(null)
  const [currentQ, setCurrentQ]       = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [answers, setAnswers]         = useState({})
  const [error, setError]             = useState('')

  async function startInterview() {
    if (!description.trim()) return
    setStep('loading')
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('interview-project', {
        body: { description, projectType },
      })
      if (fnErr || !data?.questions?.length) throw new Error()
      setInterview(data)
      setCurrentQ(0)
      setAnswers({})
      setStep('interview')
    } catch {
      setError('Não foi possível iniciar. Tenta novamente.')
      setStep('input')
    }
  }

  async function startPrefill() {
    if (!description.trim()) return
    setStep('loading')
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('prefill-project', {
        body: { text: description, projectType },
      })
      if (fnErr) throw new Error()
      onComplete({ ...(data?.prefill ?? {}), project_type: projectType })
    } catch {
      setError('Não foi possível pré-preencher. Tenta novamente.')
      setStep('input')
    }
  }

  function advance(val = currentAnswer.trim()) {
    const q = interview.questions[currentQ]
    const next = { ...answers, [q.field]: val }
    setAnswers(next)
    setCurrentAnswer('')
    if (currentQ + 1 >= interview.questions.length) {
      onComplete({ ...next, project_type: projectType })
    } else {
      setCurrentQ(i => i + 1)
    }
  }

  /* ── Loading ── */
  if (step === 'loading') {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <style>{`@keyframes ai-sh{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes ai-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-secondary)' }}>A IA está a analisar o teu projeto…</p>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 18px', animation: `ai-in 0.3s ease-out ${i*120}ms both` }}>
            <div style={{ height: 11, width: `${45+i*12}%`, borderRadius: 5, marginBottom: 10, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ai-sh 1.5s ease-in-out infinite` }} />
            <div style={{ height: 9, width: '85%', borderRadius: 5, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ai-sh 1.5s ease-in-out infinite 0.15s` }} />
          </div>
        ))}
      </div>
    )
  }

  /* ── Interview questions ── */
  if (step === 'interview' && interview) {
    const q    = interview.questions[currentQ]
    const total = interview.questions.length
    const pct  = Math.round(((currentQ + 1) / total) * 100)
    const isLast = currentQ + 1 >= total

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {currentQ === 0 && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--color-primary-subtle)',
            border: '1px solid rgba(27,120,247,0.18)',
            borderLeft: '3px solid var(--color-primary)',
            borderRadius: 10, fontSize: 13, lineHeight: 1.65, color: 'var(--color-text)',
          }}>
            {interview.understanding}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            {currentQ + 1}/{total}
          </span>
          <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: 2 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: 'var(--color-primary)', borderRadius: 2,
              transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5 }}>
            {q.question}
          </p>
          {q.suggestions?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {q.suggestions.map((s, i) => (
                <button key={i} type="button"
                  onClick={() => setCurrentAnswer(a => a ? `${a}, ${s}` : s)}
                  style={{
                    padding: '4px 10px', borderRadius: 20,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'border-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <textarea
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            placeholder={q.placeholder || ''}
            rows={3}
            style={{
              width: '100%', background: 'var(--color-input-bg)',
              border: '1.5px solid var(--color-input-border)', borderRadius: 8,
              color: 'var(--color-text)', fontSize: 14, padding: '10px 12px',
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.6,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-input-border)'; e.currentTarget.style.boxShadow = 'none' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim()) {
                e.preventDefault(); advance()
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => advance()}
            disabled={!currentAnswer.trim()}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: currentAnswer.trim() ? 'var(--color-primary)' : 'var(--color-border)',
              color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0',
              fontSize: 14, fontWeight: 700,
              cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {isLast ? <><Sparkles size={14} /> Concluir</> : <>Próxima <ChevronRight size={14} /></>}
          </button>
          <button type="button" onClick={() => advance('')}
            style={{
              padding: '11px 14px', background: 'transparent',
              border: '1px solid var(--color-border)', borderRadius: 8,
              color: 'var(--color-text-tertiary)', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Saltar
          </button>
        </div>
      </div>
    )
  }

  /* ── Input (default) ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          Descreve o teu projeto em 2-3 frases e a IA ajuda-te a preencher os campos.
        </p>
        <button type="button" onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Ex: Fiz uma app mobile em Flutter para ajudar estudantes a gerir tarefas e receber lembretes personalizados."
        rows={3}
        style={{
          width: '100%', background: 'var(--color-input-bg)',
          border: '1.5px solid var(--color-input-border)', borderRadius: 8,
          color: 'var(--color-text)', fontSize: 14, padding: '10px 12px',
          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-input-border)' }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PROJECT_TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setProjectType(t.id)}
            style={{
              padding: '5px 12px', borderRadius: 20,
              border: `1.5px solid ${projectType === t.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: projectType === t.id ? 'var(--color-primary-subtle)' : 'transparent',
              color: projectType === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: projectType === t.id ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p style={{ margin: 0, color: 'var(--color-error)', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={startInterview} disabled={!description.trim()}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: description.trim() ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', border: 'none', borderRadius: 8, padding: '11px 14px',
            fontSize: 13, fontWeight: 700,
            cursor: description.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          <Sparkles size={14} /> Entrevista guiada
        </button>
        <button type="button" onClick={startPrefill} disabled={!description.trim()}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'transparent',
            border: `1.5px solid ${description.trim() ? 'var(--color-primary)' : 'var(--color-border)'}`,
            color: description.trim() ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600,
            cursor: description.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          <Wand2 size={14} /> Pré-preencher
        </button>
      </div>
    </div>
  )
}
