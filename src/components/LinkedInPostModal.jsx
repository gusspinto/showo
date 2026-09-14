import { useState, useEffect, useRef } from 'react'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { RefreshCircleIcon as Refresh } from '@solar-icons/react/bold/refresh-circle'
import { SquareArrowRightUpIcon as External } from '@solar-icons/react/bold/square-arrow-right-up'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { supabase } from '../lib/supabase'
import { generateLinkedInPost, copyAndOpenLinkedIn } from '../lib/social'

/* Rascunho de post para o LinkedIn. Gera UMA vez ao abrir; a pessoa edita,
   copia e abre o compositor (o LinkedIn não aceita texto pré-preenchido sem
   OAuth, por isso copiamos e ela cola).

   mode='weekly'  — o caller passa o payload completo (dados da semana).
   mode='project' — o caller passa só { projectId }; o modal vai buscar os
                    campos do projeto e verifica que está público.

   A geração está atrás de um ref para não repetir quando o componente
   re-renderiza (mudar de aba e voltar remontava o efeito e gastava tokens à
   toa). Só "Gerar outra vez" volta a chamar a IA. */
export default function LinkedInPostModal({ mode, payload, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const startedRef = useRef(false)

  async function buildProjectPayload() {
    const { data: p } = await supabase
      .from('projects')
      .select('name, slug, visibility, goal, problem, solution, technologies, ai_tagline, ai_highlights')
      .eq('id', payload.projectId)
      .maybeSingle()
    if (!p) throw new Error('Projeto não encontrado.')
    if (p.visibility && p.visibility !== 'public') {
      throw new Error('Torna o projeto público primeiro — senão o link do post não abre nada.')
    }
    return {
      projectName: p.name,
      projectUrl: `${window.location.origin}/projeto/${p.slug}`,
      tagline: p.ai_tagline, goal: p.goal, problem: p.problem,
      solution: p.solution, technologies: p.technologies,
      highlights: Array.isArray(p.ai_highlights) ? p.ai_highlights : [],
    }
  }

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const body = mode === 'project' && payload?.projectId ? await buildProjectPayload() : payload
      const result = await generateLinkedInPost({ mode, ...body })
      setText(result)
    } catch (e) {
      setError(e.message || 'Não foi possível gerar o post.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* sem permissão — a pessoa seleciona e copia à mão */ }
  }

  async function handleOpen() {
    const didCopy = await copyAndOpenLinkedIn(text)
    if (didCopy) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <Modal
      onClose={onClose}
      width={520}
      title="Post para o LinkedIn"
      subtitle={mode === 'weekly' ? 'A partir do que registaste esta semana' : 'A partir do teu projeto'}
    >
      <style>{`
        @keyframes lip-spin { to { transform: rotate(360deg); } }
        .lip-textarea { transition: border-color 0.15s, box-shadow 0.15s; }
        .lip-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-subtle);
        }
      `}</style>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '36px 0', color: 'var(--color-text-secondary)' }}>
          <span
            aria-hidden="true"
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'conic-gradient(from 0deg, #2478f0, #db4a3d, #cc9a1e, #2478f0)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
              animation: 'lip-spin 0.9s linear infinite',
            }}
          />
          <span style={{ fontSize: 'var(--text-sm)' }}>A escrever o rascunho…</span>
        </div>
      ) : error ? (
        <div style={{ padding: '8px 0' }}>
          <p style={{ margin: '0 0 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{error}</p>
          <Button variant="secondary" size="sm" icon={<Refresh size={14} />} onClick={generate}>Tentar outra vez</Button>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={11}
            aria-label="Texto do post"
            className="lip-textarea"
            style={{
              width: '100%', resize: 'vertical', minHeight: 200,
              padding: '12px 14px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
            }}
          />
          <p style={{ margin: '8px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
            Lê e ajusta antes de publicar. O botão Abrir LinkedIn copia o texto e abre o compositor para colares.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <Button
              variant="primary" size="sm"
              icon={copied ? <Check size={14} /> : <External size={14} />}
              onClick={handleOpen}
            >
              {copied ? 'Copiado' : 'Abrir LinkedIn'}
            </Button>
            <Button
              variant="secondary" size="sm"
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={handleCopy}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="ghost" size="sm" icon={<Refresh size={14} />} onClick={generate}>
              Gerar outra vez
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
