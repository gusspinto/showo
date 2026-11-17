import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlanGateModal } from '../components/PlanGate'
import { planThatUnlocks, nextPaidPlan } from '../lib/plans'
import { GalleryWideIcon as ImageIcon } from '@solar-icons/react/bold/gallery-wide'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'

const C = {
  bg: 'var(--color-bg)', card: 'var(--color-surface)', border: 'var(--color-border)',
  blue: 'var(--color-primary)', muted: 'var(--color-text-secondary)', text: 'var(--color-text)',
  glass: 'var(--color-glass)', glassBorder: 'var(--color-glass-border)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

// Pré-visualização de quem ainda não desbloqueou: não temos exemplos reais
// prontos a mostrar aqui, por isso cada "capa" é composta (várias manchas
// radiais sobrepostas + nome do projeto a simular o resultado final com
// texto por cima), não um retângulo de cor sólida, para dar uma ideia mais
// próxima do que a ferramenta gera de verdade, não só um tapete de cor.
const MOCK_BANNERS = [
  {
    title: 'FitTrack', category: 'App de fitness',
    background: `radial-gradient(circle at 15% 18%, rgba(255,255,255,0.22), transparent 35%),
      radial-gradient(circle at 85% 12%, #60a5fa, transparent 45%),
      radial-gradient(circle at 78% 88%, #a78bfa, transparent 50%),
      radial-gradient(circle at 8% 90%, #1d4ed8, transparent 45%),
      linear-gradient(135deg, #0b1120, #1e293b)`,
  },
  {
    title: 'Lumen Studio', category: 'Portefólio de design',
    background: `radial-gradient(circle at 20% 15%, #fde68a, transparent 40%),
      radial-gradient(circle at 82% 22%, #fb7185, transparent 45%),
      radial-gradient(circle at 72% 88%, #f97316, transparent 50%),
      radial-gradient(circle at 12% 85%, #be185d, transparent 45%),
      linear-gradient(135deg, #1a0a12, #3b0a1c)`,
  },
  {
    title: 'Noir Editions', category: 'Editorial minimalista',
    background: `radial-gradient(circle at 25% 18%, rgba(255,255,255,0.16), transparent 35%),
      radial-gradient(circle at 82% 70%, #94a3b8, transparent 50%),
      radial-gradient(circle at 14% 82%, #475569, transparent 45%),
      linear-gradient(135deg, #0a0a0a, #27272a)`,
  },
  {
    title: 'Raiz Verde', category: 'Startup sustentável',
    background: `radial-gradient(circle at 20% 18%, #bbf7d0, transparent 40%),
      radial-gradient(circle at 82% 28%, #2dd4bf, transparent 45%),
      radial-gradient(circle at 70% 88%, #15803d, transparent 50%),
      linear-gradient(135deg, #03140d, #042f1f)`,
  },
]

// Pedido direto do Gustavo depois de confusão real: o Coach apontava para
// "o separador Imagem", mas isso vivia só dentro da edição de um projeto
// específico, sem acesso direto na barra lateral. Esta página dá acesso
// imediato à mesma feature (mesmo endpoint, mesmo limite), sem precisar de
// abrir um projeto primeiro. Para pôr como capa, ainda é preciso escolher
// a qual projeto aplicar, por isso o picker de projeto aqui em baixo.
export default function GenerateImage() {
  const navigate = useNavigate()
  const { user, checkGate, planId } = useAuth()
  const [myProjects, setMyProjects] = useState([])
  const [genPrompt, setGenPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [genGateMsg, setGenGateMsg] = useState(null)
  const [preview, setPreview] = useState(null) // { blob, url }
  const [copied, setCopied] = useState(false)
  const [coverProjectId, setCoverProjectId] = useState('')
  const [usingAsCover, setUsingAsCover] = useState(false)
  const [coverDone, setCoverDone] = useState(false)
  // Histórico (generated_images, migração 234): o generate-image grava lá
  // toda a imagem gerada, mesmo que a pessoa só descarregue ou copie, nunca
  // use como capa, antes disto essa imagem perdia-se ao sair da página.
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const gate = checkGate('generateImage')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase.from('projects').select('id, name, slug').eq('user_id', user.id).eq('entry_kind', 'full')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyProjects(data || []))
  }, [user])

  function loadHistory() {
    if (!user) return
    supabase.from('generated_images').select('id, prompt, image_url, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setHistory(data || []); setLoadingHistory(false) })
  }
  useEffect(loadHistory, [user])

  async function handleDownloadFromHistory(item) {
    setDownloadingId(item.id)
    try {
      const res = await fetch(item.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `showo-imagem-${item.id}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setGenError('Não foi possível descarregar esta imagem.')
    }
    setDownloadingId(null)
  }

  function b64ToBlob(b64, mime) {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) { setGenError('Descreve o que queres na imagem.'); return }
    setGenerating(true)
    setGenError(null)
    setCoverDone(false)
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setCopied(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt: genPrompt.trim() }),
      })
      const body = await res.json()
      if (!res.ok) { setGenError(body.error || 'Não foi possível gerar a imagem.'); setGenerating(false); return }
      const blob = b64ToBlob(body.image_b64, 'image/png')
      setPreview({ blob, url: URL.createObjectURL(blob) })
      loadHistory()
    } catch {
      setGenError('Não foi possível gerar a imagem. Tenta novamente.')
    }
    setGenerating(false)
  }

  function handleDownload() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview.url
    a.download = `showo-imagem-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function handleCopy() {
    if (!preview) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': preview.blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setGenError('O teu navegador não permite copiar a imagem. Descarrega-a em alternativa.')
    }
  }

  async function handleUseAsCover() {
    if (!preview || !coverProjectId) return
    const project = myProjects.find(p => p.id === coverProjectId)
    if (!project) return
    setUsingAsCover(true)
    setGenError(null)
    try {
      const path = `${project.slug}-ia-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, preview.blob, { upsert: true, contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      const { error: updErr } = await supabase.from('projects').update({ cover_url: publicUrl }).eq('id', project.id)
      if (updErr) throw updErr
      setCoverDone(true)
    } catch {
      setGenError('Não foi possível usar esta imagem como capa. Tenta novamente.')
    }
    setUsingAsCover(false)
  }

  if (!user) return null

  const upgrade = planThatUnlocks('generateImage', planId) || nextPaidPlan(planId)

  const pillPrimary = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '11px 22px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    background: C.blue, color: '#fff', boxShadow: '0 2px 10px var(--color-primary-subtle)',
  }
  const pillGhost = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', cursor: 'pointer',
    background: 'transparent', color: C.text,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content">
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: 'clamp(16px,3vw,24px)' }}>

          {!gate.allowed ? (
            <>
              {/* Um cartão só, em vez de cabeçalho + caixa de upsell a repetir o
                  mesmo ícone e quase o mesmo texto uma a seguir à outra. */}
              <div style={{ textAlign: 'center', ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-xl)', padding: 'clamp(36px,7vw,52px) 28px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <ImageIcon size={28} color={C.blue} />
                </div>
                <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px', color: C.text }}>Gerar imagem com IA</h1>
                <p style={{ margin: '0 auto 24px', maxWidth: 360, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                  {gate.message?.body || 'Capas, ilustrações e imagens para os teus projetos.'}
                </p>
                <button type="button" onClick={() => setGenGateMsg(gate.message)} style={pillPrimary}>
                  <Sparkles size={14} /> {upgrade ? `Desbloquear com o ${upgrade.name}` : 'Ver planos'}
                </button>
                {genGateMsg && (
                  <PlanGateModal
                    message={genGateMsg}
                    forcedPlan={planThatUnlocks('generateImage', planId)}
                    onClose={() => setGenGateMsg(null)}
                  />
                )}
              </div>

              {/* Ninguém desbloqueou ainda viu o resultado real, por isso um
                  preview do tipo de capas que a ferramenta gera, para dar uma
                  ideia concreta do que está a pagar antes de decidir. */}
              <div style={{ marginTop: 28 }}>
                <p style={{ margin: '0 0 12px', fontSize: 12.5, fontWeight: 700, color: C.muted, textAlign: 'center' }}>
                  Alguns exemplos do que dá para gerar
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {MOCK_BANNERS.map(m => (
                    <div key={m.title} style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid ${C.border}`, background: m.background }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)' }} />
                      <span style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
                        <Sparkles size={12} color="#fff" />
                      </span>
                      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 10 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>{m.title}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{m.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={21} color={C.blue} />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 19, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', color: C.text }}>Gerar imagem com IA</h1>
                    <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>Capas, ilustrações e imagens para os teus projetos</p>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, background: 'var(--color-primary-subtle)', padding: '5px 12px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {gate.remaining} de {gate.limit} este mês
                </span>
              </div>

              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-lg)', padding: 20 }}>
                <textarea
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                  placeholder="Ex: capa minimalista para um projeto de PAP sobre gestão de tarefas, tons de azul"
                  rows={3}
                  disabled={generating}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12,
                    background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)',
                    padding: '12px 14px', fontSize: 13.5, color: C.text, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                {genError && <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--color-error)' }}>{genError}</p>}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !genPrompt.trim()}
                  style={{ ...pillPrimary, opacity: generating || !genPrompt.trim() ? 0.6 : 1, cursor: generating || !genPrompt.trim() ? 'default' : 'pointer' }}
                >
                  <Sparkles size={14} /> {generating ? 'A gerar...' : 'Gerar imagem'}
                </button>
              </div>

              {preview && (
                <div style={{ marginTop: 20, ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <img src={preview.url} alt="Imagem gerada" style={{ width: '100%', borderRadius: 'var(--radius-md)', border: `1px solid ${C.border}`, display: 'block' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleDownload} style={pillGhost}>Descarregar</button>
                    <button type="button" onClick={handleCopy} style={pillGhost}>{copied ? 'Copiada!' : 'Copiar imagem'}</button>
                  </div>

                  {myProjects.length > 0 && (
                    <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: C.muted }}>Usar como capa de um projeto</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          value={coverProjectId}
                          onChange={e => { setCoverProjectId(e.target.value); setCoverDone(false) }}
                          style={{ flex: 1, minWidth: 180, background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: 13, color: C.text, fontFamily: 'inherit' }}
                        >
                          <option value="">Escolhe um projeto...</option>
                          {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={handleUseAsCover}
                          disabled={!coverProjectId || usingAsCover}
                          style={{ ...pillPrimary, padding: '9px 18px', opacity: !coverProjectId || usingAsCover ? 0.6 : 1, cursor: !coverProjectId || usingAsCover ? 'default' : 'pointer' }}
                        >{usingAsCover ? 'A usar...' : 'Usar como capa'}</button>
                      </div>
                      {coverDone && (
                        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--color-success)' }}>
                          Capa atualizada. <button type="button" onClick={() => navigate(`/editar/${myProjects.find(p => p.id === coverProjectId)?.slug}`)} style={{ background: 'none', border: 'none', padding: 0, color: C.blue, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, textDecoration: 'underline' }}>Ver projeto</button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!loadingHistory && history.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.text }}>Imagens anteriores</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                {history.map(item => (
                  <div key={item.id} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    <img
                      src={item.image_url}
                      alt={item.prompt || 'Imagem gerada'}
                      title={item.prompt || ''}
                      loading="lazy"
                      style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDownloadFromHistory(item)}
                      disabled={downloadingId === item.id}
                      title="Descarregar"
                      aria-label="Descarregar"
                      style={{
                        position: 'absolute', bottom: 8, right: 8, width: 30, height: 30,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 'var(--radius-full)', border: 'none', cursor: downloadingId === item.id ? 'default' : 'pointer',
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff',
                        opacity: downloadingId === item.id ? 0.6 : 1,
                      }}
                    ><Download size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
