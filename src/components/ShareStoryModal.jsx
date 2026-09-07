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
    // se esperava. O caminho certo é um ficheiro fisicamente pequeno —
    // scale baixo compensado por um cartão mais estreito (ver largura do
    // cartão abaixo) para não ficar granulado.
    return html2canvas(canvasRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
  }

  async function handleDownload() {
    setExporting(true)
    try {
      const canvas = await renderCanvas()
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `showo-${project.slug}.png`
      a.click()
    } catch (e) {
      console.error('Export falhou', e)
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

  // Últimas 20 semanas com atividade — um heatmap tipo GitHub, não um
  // gráfico exato: o que importa é a sensação de trabalho constante.
  const cells = Array.from({ length: 20 }, (_, i) => {
    const w = weekly[weekly.length - 20 + i]
    return w ? w.count : 0
  })
  const maxCount = Math.max(1, ...cells)

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
            exportação real (backgroundColor: null) é transparente à volta
            dos cantos redondos. O ref aponta directamente ao cartão: a
            imagem exportada tem o formato do PRÓPRIO cartão, não um ecrã
            9:16 inteiro — é isso que faz o Instagram tratá-la como imagem a
            inserir/redimensionar em vez de esticar como fundo da story. */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 90px)', background: 'repeating-conic-gradient(#242428 0% 25%, #1a1a1d 0% 50%) 0 0/24px 24px', borderRadius: 8, padding: 18 }}>

          <div
            ref={canvasRef}
            style={{
              width: 260, background: '#17171b', borderRadius: 42,
              boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
              overflow: 'hidden', position: 'relative',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: FONT_BODY,
            }}
          >
            {/* fio de marca no topo — a única referência de cor da app,
                sem precisar de escrever o nome */}
            <div style={{ height: 6, background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.red} 62%, ${BRAND.gold})` }} />

            <div style={{ padding: '22px 20px 18px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#7c7c86', textTransform: 'uppercase' }}>
                {TYPE_LABEL[project.project_type] || 'Projeto'}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#f7f7f8', lineHeight: 1.18, marginTop: 6, fontFamily: FONT_HEADING, letterSpacing: '-0.3px' }}>
                {project.name}
              </div>
              {project.creator_name && (
                <div style={{ fontSize: 11, color: '#9494a0', marginTop: 5, fontWeight: 500 }}>{project.creator_name}</div>
              )}
            </div>

            {/* Heatmap solto no corpo do cartão, sem caixa dentro da caixa */}
            <div style={{ padding: '0 20px' }}>
              {loading ? (
                <div style={{ height: 40 }} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20,1fr)', gap: 2.5 }}>
                  {cells.map((c, i) => {
                    const opacity = c === 0 ? 0.07 : 0.3 + (c / maxCount) * 0.7
                    return <div key={i} style={{ aspectRatio: '1', borderRadius: 1.5, background: `${BRAND.blue}`, opacity: opacity.toFixed(2) }} />
                  })}
                </div>
              )}
            </div>

            {/* Estatísticas — um número herói, o resto secundário */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '18px 20px 20px' }}>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800, color: '#f7f7f8', lineHeight: 1, fontFamily: FONT_HEADING, fontVariantNumeric: 'tabular-nums' }}>
                  {timeline?.entry_count ?? 0}
                </div>
                <div style={{ fontSize: 10, color: '#9494a0', marginTop: 3, fontWeight: 600 }}>registos no diário</div>
              </div>
              {months && (
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#d5d5da' }}>{months} {months === 1 ? 'mês' : 'meses'}</div>
                  {project.score > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gold, marginTop: 2 }}>score {project.score}</div>}
                </div>
              )}
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
