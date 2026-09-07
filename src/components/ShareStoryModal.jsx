import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { ShareIcon as Share2 } from '@solar-icons/react/bold/share'
import { supabase } from '../lib/supabase'

/**
 * ShareStoryModal — gera um cartão em formato story (9:16) a partir do
 * percurso real de um projeto (diário → heatmap semanal, via
 * get_project_timeline) para partilha no Instagram/WhatsApp. A prova de
 * trabalho é o próprio percurso do aluno, não uma métrica da plataforma.
 *
 * Props:
 *   project   { id, slug, name, creator_name, score, project_type }
 *   onClose   Callback para fechar
 */
export function ShareStoryModal({ project, onClose }) {
  const cardRef = useRef(null)
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

  async function exportCanvas() {
    const { default: html2canvas } = await import('html2canvas')
    return html2canvas(cardRef.current, { scale: 2.5, backgroundColor: '#0a0a0c', useCORS: true, logging: false })
  }

  async function handleDownload() {
    setExporting(true)
    try {
      const canvas = await exportCanvas()
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
      const canvas = await exportCanvas()
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

  // Últimas 22 semanas com atividade, mais recentes primeiro invertidas —
  // um heatmap tipo GitHub, não um gráfico exato: o que importa é a
  // sensação de "trabalho constante", não o número preciso.
  const cells = Array.from({ length: 22 }, (_, i) => {
    const w = weekly[weekly.length - 22 + i]
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

        <div style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 90px)', borderRadius: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
          <div
            ref={cardRef}
            style={{
              width: 340, minHeight: 604, background: '#111114', position: 'relative',
              display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body, sans-serif)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '24px 0 0' }}>
              <img src="/darkmode_icon_logo.png" alt="" style={{ height: 15, opacity: 0.9 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6b6b74' }}>Showo</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#4a8fff', textTransform: 'uppercase' }}>
                {project.score >= 75 ? 'Projeto certificado' : 'Percurso em curso'}
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '10px 26px 0' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.15, letterSpacing: '-0.4px' }}>{project.name}</div>
              <div style={{ fontSize: 12.5, color: '#8b8b93', marginTop: 8, fontWeight: 500 }}>
                {TYPE_LABEL[project.project_type] || 'Projeto'}{project.creator_name ? ` · ${project.creator_name}` : ''}
              </div>
            </div>

            <div style={{ margin: '26px 22px 0', padding: '16px 14px', background: '#161619', borderRadius: 16, border: '1px solid #232328' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6b6b74', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 11 }}>Percurso do projeto</div>
              {loading ? (
                <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#5a5a62' }}>a carregar…</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(22,1fr)', gap: 3 }}>
                  {cells.map((c, i) => {
                    const opacity = c === 0 ? 0.08 : 0.28 + (c / maxCount) * 0.72
                    return <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: `rgba(74,143,255,${opacity.toFixed(2)})` }} />
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
              {months && (
                <>
                  <Stat value={months} label={months === 1 ? 'mês' : 'meses'} />
                  <Divider />
                </>
              )}
              <Stat value={timeline?.entry_count ?? 0} label={timeline?.entry_count === 1 ? 'registo' : 'registos'} />
              {project.score > 0 && (
                <>
                  <Divider />
                  <Stat value={project.score} label="score" color="#4ade80" />
                </>
              )}
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 22px', borderTop: '1px solid #1c1c20', marginTop: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#5a5a62', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Ver o projeto</div>
                <div style={{ fontSize: 11, color: '#c9c9cf', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectUrl.replace(/^https?:\/\//, '')}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 7, padding: 5, flexShrink: 0 }}>
                <QRCodeSVG value={projectUrl} size={40} level="M" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleShare}
            disabled={exporting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', color: '#0a0a0c', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Share2 size={15} /> Partilhar</button>
          <button
            onClick={handleDownload}
            disabled={exporting || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1, fontFamily: 'inherit' }}
          ><Download size={15} /> Descarregar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Stat({ value, label, color = '#f5f5f7' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 19, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#8b8b93', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, background: '#232328' }} />
}
