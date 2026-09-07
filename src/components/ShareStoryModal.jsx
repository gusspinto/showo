import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { ShareIcon as Share2 } from '@solar-icons/react/bold/share'
import { supabase } from '../lib/supabase'

// Cores fixas do logótipo (tokens.css --brand-gradient) — escritas em bruto
// porque html2canvas nem sempre resolve var() com fallback de fontes/cores
// de forma fiável, e porque isto é a marca, não deve mudar com o tema.
const BRAND = { blue: '#2478f0', red: '#db4a3d', gold: '#cc9a1e' }
const FONT_HEADING = "'Geist', 'Helvetica World', Helvetica, Arial, sans-serif"
const FONT_BODY = "'Montserrat', 'Inter', system-ui, sans-serif"
// A fonte de destaque da marca (já usada no Score do dashboard, na Home) —
// dá ao título uma voz própria em vez do geométrico Geist em tudo, que era
// parte do porquê disto parecer "feito por template".
const FONT_DISPLAY = "'Croogla', 'Poppins', system-ui, sans-serif"

/**
 * ShareStoryModal — um autocolante para stories (fundo transparente à volta
 * de um cartão redondo), não um ecrã cheio. É assim que o Strava/Duolingo
 * fazem: o cartão pousa por cima da foto do próprio aluno, não a substitui.
 * A identidade é só o logótipo (3 blocos de cor), sem escrever "Showo" —
 * reconhece-se pela forma, como o resto destas apps.
 *
 * Props:
 *   project   { id, slug, name, creator_name, score, project_type }
 *   onClose   Callback para fechar
 */
export function ShareStoryModal({ project, onClose }) {
  const canvasRef = useRef(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    supabase.rpc('get_project_timeline', { p_project_id: project.id }).then(({ data }) => {
      setTimeline(data)
      setLoading(false)
    })
  }, [project.id])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  async function renderCanvas() {
    // Espera as fontes reais carregarem — sem isto o html2canvas por vezes
    // captura antes do Geist/Montserrat estarem prontos e cai para a fonte
    // do sistema, que foi exatamente o que pareceu "não é a fonte certa".
    if (document.fonts?.ready) await document.fonts.ready
    const { default: html2canvas } = await import('html2canvas')
    // Testado em telemóvel real: MAIS pixels fez o Instagram inserir a
    // imagem MAIOR (cobria o ecrã, cortada em cima/baixo), o oposto do que
    // se esperava — o tamanho final parece seguir sobretudo a resolução em
    // pixels, não só a proporção. scale baixo aqui de propósito; o padding
    // à volta do cartão (ver abaixo) é só estética, não compensa isto.
    return html2canvas(canvasRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
  }

  async function handleDownload() {
    setExporting(true)
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    // No iOS o window.open() tem de acontecer já, dentro do mesmo gesto de
    // toque — se esperar pelo html2canvas primeiro, o Safari bloqueia como
    // pop-up. Abre já uma aba com uma mensagem de espera e preenche-a
    // depois de a imagem estar pronta.
    const preOpened = isIOS ? window.open() : null
    if (preOpened) {
      preOpened.document.write('<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#fff;font-family:sans-serif;font-size:14px">A preparar a imagem…</body>')
    }
    try {
      const canvas = await renderCanvas()
      const url = canvas.toDataURL('image/png')
      if (isIOS) {
        // Safari no iOS ignora o atributo `download` em links — não faz
        // nada visível, parece que "não dá para descarregar". Abrir a
        // imagem numa aba deixa guardar com toque longo → Guardar Imagem.
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

  const projectUrl = `${window.location.origin}/projeto/${project.slug}`
  const weekly = timeline?.weekly || []

  // Últimas 20 semanas, dispostas em grelha 4x5 (preenchida por coluna, como
  // o gráfico de contribuições do GitHub) em vez de uma faixa fina — é o
  // elemento visual principal do cartão, tem de ter peso.
  const GRID_ROWS = 4, GRID_COLS = 5
  const cells = Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
    const w = weekly[weekly.length - GRID_ROWS * GRID_COLS + i]
    return w ? w.count : 0
  })
  const maxCount = Math.max(1, ...cells)
  function heatColor(intensity) {
    if (intensity <= 0) return 'rgba(255,255,255,0.07)'
    const r = Math.round(36 + intensity * (204 - 36))
    const g = Math.round(120 + intensity * (154 - 120))
    const b = Math.round(240 + intensity * (30 - 240))
    return `rgb(${r},${g},${b})`
  }

  const months = timeline?.first_entry && timeline?.last_entry
    ? Math.max(1, Math.round((new Date(timeline.last_entry) - new Date(timeline.first_entry)) / (1000 * 60 * 60 * 24 * 30)))
    : null

  const TYPE_LABEL = { pap: 'PAP', internship: 'Estágio', group: 'Trabalho de grupo', personal: 'Projeto pessoal', competition: 'Competição', presentation: 'Apresentação' }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxHeight: '92vh' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><X size={16} /></button>

        {/* Fundo cinza-escuro só para se ver o recorte contra algo — a
            exportação real (backgroundColor: null) é transparente. O ref
            aponta ao CONTENTOR com padding, não ao cartão sozinho: a margem
            transparente à volta é o que dá o efeito de autocolante "com
            respiro", mas a proporção final continua bem diferente de um
            ecrã 9:16 inteiro, para o Instagram continuar a tratar isto como
            imagem a inserir/redimensionar, não como fundo da story. */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 90px)', background: 'repeating-conic-gradient(#242428 0% 25%, #1a1a1d 0% 50%) 0 0/24px 24px', borderRadius: 8, padding: 18 }}>

          <div ref={canvasRef} style={{ padding: 34 }}>
          <div
            style={{
              width: 280, borderRadius: 26,
              background: '#151517',
              boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
              overflow: 'hidden', position: 'relative',
              transform: 'rotate(-2deg)',
              fontFamily: FONT_BODY,
            }}
          >
            {/* fio de marca no topo — a única referência de cor da app,
                sem precisar de escrever o nome */}
            <div style={{ height: 5, background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.red} 62%, ${BRAND.gold})` }} />

            <div style={{ padding: '22px 22px 6px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#8a8a94', textTransform: 'uppercase' }}>
                {TYPE_LABEL[project.project_type] || 'Projeto'}
              </div>
              <div style={{ fontSize: 25, fontWeight: 400, color: '#fbfbfc', lineHeight: 1.12, marginTop: 6, fontFamily: FONT_DISPLAY, letterSpacing: '-0.2px' }}>
                {project.name}
              </div>
              {project.creator_name && (
                <div style={{ fontSize: 11, color: '#9c9ca6', marginTop: 5, fontWeight: 500 }}>{project.creator_name}</div>
              )}
            </div>

            {/* Heatmap — o elemento visual principal, não um detalhe */}
            <div style={{ padding: '18px 22px 4px' }}>
              {loading ? (
                <div style={{ height: 92 }} />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                  gridAutoFlow: 'column',
                  gridAutoColumns: '1fr',
                  gap: 5, height: 92,
                }}>
                  {cells.map((c, i) => (
                    <div key={i} style={{ borderRadius: 4, background: heatColor(c / maxCount) }} />
                  ))}
                </div>
              )}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#6d6d78', textTransform: 'uppercase', marginTop: 10 }}>
                Percurso do projeto
              </div>
            </div>

            {/* Estatísticas — discretas, o heatmap já é o herói visual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 22px 22px' }}>
              <Metric value={timeline?.entry_count ?? 0} label={(timeline?.entry_count ?? 0) === 1 ? 'registo' : 'registos'} />
              {months && <Metric value={months} label={months === 1 ? 'mês' : 'meses'} />}
              {project.score > 0 && <Metric value={project.score} label="score" accent={BRAND.gold} />}
            </div>

            {/* Rodapé: só a marca (3 blocos), sem palavra — reconhece-se
                pela forma, como o swoosh do Strava */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="13" height="13" rx="3" fill={BRAND.blue} />
                <rect x="14" y="8" width="7" height="13" rx="2.5" fill={BRAND.red} />
                <rect x="9" y="14" width="7" height="7" rx="2" fill={BRAND.gold} />
              </svg>
              <div style={{ background: '#fff', borderRadius: 6, padding: 4 }}>
                <QRCodeSVG value={projectUrl} size={34} level="M" />
              </div>
            </div>
          </div>
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 280, margin: 0, lineHeight: 1.5 }}>
          Para aparecer como autocolante por cima da tua foto: guarda a imagem, depois na story escolhe "adicionar do rolo" em vez de partilhar direto.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleShare}
            disabled={exporting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Share2 size={15} /> Partilhar</button>
          <button
            onClick={handleDownload}
            disabled={exporting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', color: '#0a0a0c', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Download size={15} /> Descarregar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Metric({ value, label, accent = '#fbfbfc' }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1, fontFamily: FONT_HEADING, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#8a8a94', marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  )
}
