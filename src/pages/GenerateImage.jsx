import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlanGateModal } from '../components/PlanGate'
import { planThatUnlocks, nextPaidPlan } from '../lib/plans'
import { GalleryWideIcon as ImageIcon } from '@solar-icons/react/bold/gallery-wide'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'

const C = {
  bg: 'var(--color-bg)', card: 'var(--color-surface)', border: 'var(--color-border)',
  blue: 'var(--color-primary)', muted: 'var(--color-text-secondary)', text: 'var(--color-text)',
}

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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content">
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: 'clamp(16px,3vw,24px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={19} color={C.blue} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Gerar imagem com IA</h1>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Capas, ilustrações e imagens para os teus projetos</p>
            </div>
          </div>

          {!gate.allowed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-primary-subtle)', border: `1px solid ${C.blue}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={15} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>{gate.message?.title || 'Gerar imagens com IA'}</p>
                  {gate.message?.body && <p style={{ margin: '1px 0 0', fontSize: 12, color: C.muted, lineHeight: 1.35 }}>{gate.message.body}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setGenGateMsg(gate.message)}
                  style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', border: 'none', borderRadius: 8, cursor: 'pointer', background: C.blue, color: '#fff', flexShrink: 0 }}
                >{upgrade ? upgrade.name : 'Ver planos'}</button>
              </div>
              {genGateMsg && (
                <PlanGateModal
                  message={genGateMsg}
                  forcedPlan={planThatUnlocks('generateImage', planId)}
                  onClose={() => setGenGateMsg(null)}
                />
              )}
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: C.muted }}>
                Tens {gate.remaining} de {gate.limit} imagens este mês.
              </p>
              <textarea
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
                placeholder="Ex: capa minimalista para um projeto de PAP sobre gestão de tarefas, tons de azul"
                rows={3}
                disabled={generating}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 10,
                  background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '12px 14px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none',
                }}
              />
              {genError && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-error)' }}>{genError}</p>}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !genPrompt.trim()}
                style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  border: 'none', borderRadius: 8, cursor: generating ? 'default' : 'pointer',
                  background: C.blue, color: '#fff', opacity: generating || !genPrompt.trim() ? 0.6 : 1,
                }}
              >{generating ? 'A gerar...' : 'Gerar imagem'}</button>

              {preview && (
                <div style={{ marginTop: 20 }}>
                  <img src={preview.url} alt="Imagem gerada" style={{ width: '100%', borderRadius: 10, border: `1px solid ${C.border}`, display: 'block' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleDownload}
                      style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: C.text }}
                    >Descarregar</button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: C.text }}
                    >{copied ? 'Copiada!' : 'Copiar imagem'}</button>
                  </div>

                  {myProjects.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12.5, color: C.muted }}>Usar como capa de um projeto</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          value={coverProjectId}
                          onChange={e => { setCoverProjectId(e.target.value); setCoverDone(false) }}
                          style={{ flex: 1, minWidth: 180, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: C.text, fontFamily: 'inherit' }}
                        >
                          <option value="">Escolhe um projeto...</option>
                          {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={handleUseAsCover}
                          disabled={!coverProjectId || usingAsCover}
                          style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', border: 'none', borderRadius: 8, cursor: !coverProjectId || usingAsCover ? 'default' : 'pointer', background: C.blue, color: '#fff', opacity: !coverProjectId || usingAsCover ? 0.6 : 1 }}
                        >{usingAsCover ? 'A usar...' : 'Usar como capa'}</button>
                      </div>
                      {coverDone && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-success)' }}>
                          Capa atualizada. <button type="button" onClick={() => navigate(`/editar/${myProjects.find(p => p.id === coverProjectId)?.slug}`)} style={{ background: 'none', border: 'none', padding: 0, color: C.blue, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline' }}>Ver projeto</button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
