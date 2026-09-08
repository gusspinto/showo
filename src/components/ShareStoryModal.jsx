import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { ShareIcon as Share2 } from '@solar-icons/react/bold/share'

const BRAND = { blue: '#2478f0', red: '#db4a3d', gold: '#cc9a1e' }
const FONT_BODY = "'Montserrat', 'Inter', system-ui, sans-serif"
const FONT_DISPLAY = "'Croogla', 'Poppins', system-ui, sans-serif"

const TYPE_LABEL = {
  pap: 'PAP', internship: 'Estágio', group: 'Trabalho de grupo',
  personal: 'Projeto pessoal', competition: 'Competição', presentation: 'Apresentação',
}

/**
 * ShareStoryModal — autocolante para stories.
 *
 * Regra de ouro: quem vê isto é um amigo no Instagram que nunca ouviu falar
 * da Showo e olha 2 segundos. Por isso o cartão mostra só o que é legível
 * sem contexto — a capa do projeto (é o "mapa do percurso" do Strava: vê-se
 * e percebe-se), o nome, uma linha a dizer o que é, e quem fez.
 *
 * Fora de propósito (tentado e removido): heatmap do diário — um estranho
 * não sabe o que são os quadrados; métricas internas (registos, score) —
 * fazem o trabalho parecer pequeno e não significam nada por fora; QR code —
 * inútil numa story, quem vê está a segurar o telemóvel que a mostra.
 *
 * Dois cartões: "Projeto" (o que é) e "Destaque" (porque tem valor).
 *
 * O segundo começou como cartão de progresso e foi refeito: percentagem de
 * conclusão é mentira (o trabalho é aberto, e muita gente adiciona projetos
 * já acabados há meses), "Semana N" mente nesses mesmos projetos, e uma
 * entrada de diário é demasiado mundana para alguém publicar. Os
 * ai_highlights resolvem os três problemas — são reconhecimento escrito na
 * terceira pessoa ("Construiu X, mostrando Y"), existem em 86% dos
 * projetos, não afirmam nada sobre datas, e é isso que dá orgulho.
 *
 * Props:
 *   project   { slug, name, creator_name, project_type, cover_url, ai_tagline, ai_highlights }
 *   onClose   Callback para fechar
 */
export function ShareStoryModal({ project, onClose }) {
  const canvasRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [mode, setMode] = useState('projeto')
  const [highlightIdx, setHighlightIdx] = useState(0)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  async function renderCanvas() {
    // Espera as fontes reais (Croogla/Montserrat) — sem isto o html2canvas
    // por vezes captura antes de estarem prontas e cai na fonte do sistema.
    if (document.fonts?.ready) await document.fonts.ready
    const { default: html2canvas } = await import('html2canvas')
    // scale baixo de propósito: testado em telemóvel, mais pixels faz o
    // Instagram inserir a imagem maior e cortada, não mais nítida.
    return html2canvas(canvasRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
  }

  async function handleDownload() {
    setExporting(true)
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    // No iOS o window.open() tem de acontecer dentro do mesmo gesto de toque
    // — depois de um await o Safari bloqueia como pop-up.
    const preOpened = isIOS ? window.open() : null
    if (preOpened) {
      preOpened.document.write('<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#fff;font-family:sans-serif;font-size:14px">A preparar a imagem…</body>')
    }
    try {
      const canvas = await renderCanvas()
      const url = canvas.toDataURL('image/png')
      if (isIOS) {
        // Safari no iOS ignora o atributo `download` — abrir numa aba deixa
        // guardar com toque longo → Guardar Imagem.
        if (preOpened) {
          preOpened.document.open()
          preOpened.document.write(`<title>showo-${project.slug}</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${url}" style="max-width:100%;height:auto" /><p style="position:fixed;bottom:16px;left:0;right:0;text-align:center;color:#fff;font-family:sans-serif;font-size:14px">Mantém o dedo na imagem e escolhe "Guardar Imagem"</p></body>`)
          preOpened.document.close()
        } else {
          window.location.href = url
        }
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `showo-${project.slug}.png`
        a.click()
      }
    } catch (e) {
      console.error('Export falhou', e)
      if (preOpened) preOpened.close()
    }
    setExporting(false)
  }

  async function handleShare() {
    setExporting(true)
    try {
      const canvas = await renderCanvas()
      canvas.toBlob(async blob => {
        if (!blob) { setExporting(false); return }
        const file = new File([blob], `showo-${project.slug}.png`, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: project.name })
          } catch { /* utilizador cancelou */ }
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `showo-${project.slug}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
        setExporting(false)
      }, 'image/png')
    } catch (e) {
      console.error('Partilha falhou', e)
      setExporting(false)
    }
  }

  const cover = project.cover_url
  const tagline = project.ai_tagline

  const highlights = (Array.isArray(project.ai_highlights) ? project.ai_highlights : [])
    .map(h => (typeof h === 'string' ? h : h?.text || ''))
    .map(h => h.trim())
    .filter(Boolean)
  const highlight = highlights[highlightIdx % Math.max(1, highlights.length)] || null

  return createPortal(
    <div
      className="ssm-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        .ssm-inner { width: 100%; max-width: 392px; }
        .ssm-checker { padding: 14px; }
        .ssm-canvas { padding: 30px; }
        .ssm-actions { display: flex; gap: 10px; }
        @media (max-width: 460px) {
          .ssm-overlay { padding: 12px; }
          .ssm-inner { gap: 12px !important; }
          .ssm-checker { padding: 7px; }
          .ssm-canvas { padding: 18px; }
          .ssm-actions { width: 100%; }
          .ssm-actions > button { flex: 1; justify-content: center; padding-left: 12px !important; padding-right: 12px !important; }
        }
      `}</style>
      <div className="ssm-inner" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxHeight: '92vh' }}>
        {/* Topo: toggle centrado, fechar encostado à direita do cartão */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 4 }}>
          {[['projeto', 'Projeto'], ['destaque', 'Destaque']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                background: mode === id ? '#fff' : 'transparent',
                color: mode === id ? '#0a0a0c' : 'rgba(255,255,255,0.7)',
                border: 'none', borderRadius: 7, padding: '7px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{label}</button>
          ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)', width: 36, height: 36, minWidth: 36, minHeight: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
          ><X size={16} /></button>
        </div>

        {/* Xadrez só na pré-visualização, para se ver que a margem à volta
            do cartão é mesmo transparente no PNG exportado. */}
        <div className="ssm-checker" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 190px)', background: 'repeating-conic-gradient(#242428 0% 25%, #1a1a1d 0% 50%) 0 0/24px 24px', borderRadius: 8 }}>

          <div ref={canvasRef} className="ssm-canvas">
            <div
              style={{
                width: 300, borderRadius: 24, background: '#141416',
                boxShadow: '0 14px 34px rgba(0,0,0,0.42)',
                overflow: 'hidden', transform: 'rotate(-1.5deg)',
                fontFamily: FONT_BODY,
              }}
            >
              {/* fio com as três cores da marca */}
              <div style={{ height: 5, background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.red} 62%, ${BRAND.gold})` }} />

              {mode === 'projeto' ? (
                <>
                  {/* A capa é o herói: é o que faz um estranho perceber, num
                      relance, o que a pessoa construiu. */}
                  {cover && (
                    <img
                      src={cover}
                      crossOrigin="anonymous"
                      alt=""
                      style={{ display: 'block', width: '100%', height: 200, objectFit: 'cover' }}
                    />
                  )}

                  <div style={{ padding: cover ? '18px 20px 18px' : '26px 20px 20px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#8a8a94', textTransform: 'uppercase' }}>
                      {TYPE_LABEL[project.project_type] || 'Projeto'}
                    </div>

                    <div style={{ fontSize: cover ? 24 : 30, fontWeight: 400, color: '#fbfbfc', lineHeight: 1.12, marginTop: 7, fontFamily: FONT_DISPLAY }}>
                      {project.name}
                    </div>

                    {tagline && (
                      <div style={{ fontSize: 12, color: '#a0a0aa', lineHeight: 1.45, marginTop: 9 }}>
                        {tagline}
                      </div>
                    )}

                    <Footer creatorName={project.creator_name} />
                  </div>
                </>
              ) : (
                <div style={{ padding: '26px 20px 20px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#8a8a94', textTransform: 'uppercase' }}>
                    {TYPE_LABEL[project.project_type] || 'Projeto'} · destaque
                  </div>

                  {/* O destaque é a coisa que dá orgulho: está escrito na
                      terceira pessoa, como reconhecimento, e percebe-se sem
                      saber o que é a Showo. */}
                  {highlight ? (
                    <div style={{ fontSize: 18, fontWeight: 400, color: '#fbfbfc', lineHeight: 1.34, marginTop: 14, fontFamily: FONT_DISPLAY }}>
                      {highlight}
                    </div>
                  ) : (
                    <div style={{ fontSize: 26, fontWeight: 400, color: '#fbfbfc', lineHeight: 1.15, marginTop: 12, fontFamily: FONT_DISPLAY }}>
                      {project.name}
                    </div>
                  )}

                  {highlight && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                      <span style={{ width: 18, height: 2, borderRadius: 2, background: BRAND.gold, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#d8d8de', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                      </span>
                    </div>
                  )}

                  <Footer creatorName={project.creator_name} />
                </div>
              )}
            </div>
          </div>
        </div>

        {mode === 'destaque' && highlights.length > 1 && (
          <button
            onClick={() => setHighlightIdx(i => (i + 1) % highlights.length)}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Outro destaque ({(highlightIdx % highlights.length) + 1}/{highlights.length})</button>
        )}

        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
          Guarda a imagem e adiciona-a à story por cima de uma foto tua. Para o link, usa o autocolante de link do Instagram.
        </p>

        <div className="ssm-actions">
          <button
            onClick={handleShare}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Share2 size={15} /> Partilhar</button>
          <button
            onClick={handleDownload}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', color: '#0a0a0c', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Download size={15} /> Descarregar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Footer({ creatorName }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#d8d8de', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {creatorName || ''}
      </span>
      {/* logótipo real da app, não uma recriação */}
      <img src="/darkmode_icon_logo.png" alt="Showo" style={{ height: 15, width: 'auto', flexShrink: 0, opacity: 0.95 }} />
    </div>
  )
}
