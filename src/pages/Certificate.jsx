import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { Link2, Check, Sparkles, Download, ArrowLeft } from 'lucide-react'

const C = {
  bg: 'var(--color-bg)',
  border: 'var(--color-border)',
  blue: 'var(--color-primary)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
}

export default function Certificate() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setExtras } = useSidebar()
  const certRef = useRef(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects')
        .select('name, creator_name, score, created_at, slug, ai_tagline')
        .eq('slug', slug)
        .single()
      setProject(data)
      setLoading(false)
    }
    load()
  }, [slug])

  // Keep sidebar project controls while on cert page (only if it's the user's project)
  useEffect(() => {
    if (!project || !user) return
    setExtras({ type: 'project', slug: project.slug, title: project.name, showBack: true })
    return () => setExtras(null)
  }, [project?.slug, user?.id])

  async function handleDownload() {
    if (!certRef.current) return
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#0a1020',
        useCORS: true,
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `certificado-${slug}.png`
      a.click()
    } catch (e) {
      console.error('Download failed', e)
    }
    setDownloading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const noSidebarStyle = <style>{`@media (min-width: 601px) { body { padding-left: 0 !important; } .sidebar { display: none !important; } }`}</style>

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {noSidebarStyle}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!project || project.score < 75) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, fontFamily: 'var(--font-body)' }}>
        {noSidebarStyle}
        <p style={{ fontSize: 18, color: C.muted, textAlign: 'center' }}>
          {!project ? 'Projeto não encontrado.' : 'Este projeto ainda não atingiu o score mínimo de 75 para certificado.'}
        </p>
        <button onClick={() => navigate(`/projeto/${slug}`)} style={{ background: C.blue, border: 'none', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Ver projeto
        </button>
      </div>
    )
  }

  const date = new Date(project.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  const projectUrl = `${window.location.origin}/projeto/${slug}`

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 80px' }}>
      {noSidebarStyle}
      <Helmet>
        <title>Certificado — {project.name}</title>
      </Helmet>
      <style>{`
        @keyframes shimmer-cert {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .cert-action-btn { transition: opacity 0.15s; }
        .cert-action-btn:hover { opacity: 0.85; }
        @media (max-width: 600px) {
          .cert-actions { flex-direction: column !important; }
          .cert-actions button { width: 100% !important; }
        }
      `}</style>

      {/* Back */}
      <button
        onClick={() => navigate(`/projeto/${slug}`)}
        style={{ alignSelf: 'flex-start', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={14} /> Voltar ao projeto
      </button>

      {/* Certificate card */}
      <div
        ref={certRef}
        style={{
          width: '100%', maxWidth: 800,
          background: 'linear-gradient(135deg, #0a1020 0%, #0d1a2e 50%, #0a1020 100%)',
          border: '1px solid var(--color-primary-subtle)',
          borderRadius: 16,
          padding: '52px 56px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'none',
        }}
      >
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, var(--color-primary-subtle) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Top line */}
        <div style={{ width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, var(--color-primary), #818cf8, transparent)', marginBottom: 40, borderRadius: 1 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5a9ff5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Certificado de Projeto Profissional
            </div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.06em' }}>Verificado por IA · Showo</div>
          </div>
          <img src="/logo.png" alt="Showo" style={{ height: 32, opacity: 0.9 }} />
        </div>

        {/* Main content */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 500 }}>Este certificado comprova que</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 20, fontFamily: 'var(--font-heading)' }}>
            {project.creator_name || 'Estudante'}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 8, fontWeight: 500 }}>concluiu com sucesso o projeto</div>
          <div style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 400, color: 'var(--color-primary)', letterSpacing: '-0.5px', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
            {project.name}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 12, padding: '14px 20px', minWidth: 100 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{project.score}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
          </div>
          <div style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success)', lineHeight: 1.2 }}>Nível Profissional</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 4 }}>Score ≥ 75</div>
          </div>
          <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>{date}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 4 }}>Data de emissão</div>
          </div>
        </div>

        {/* Bottom row: QR + bottom line */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 500 }}>Verifica este certificado em:</div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 8, display: 'inline-block' }}>
              <QRCodeSVG value={projectUrl} size={72} level="M" />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontFamily: 'monospace' }}>{projectUrl}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Autenticado por</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={13} /> Showo AI</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Análise automática por IA</div>
          </div>
        </div>

        {/* Bottom line */}
        <div style={{ width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, #4f46e5, var(--color-primary), transparent)', marginTop: 40, borderRadius: 1 }} />
      </div>

      {/* Actions */}
      <div className="cert-actions" style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button
          className="cert-action-btn"
          onClick={handleDownload}
          disabled={downloading}
          style={{
            background: 'var(--color-primary)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 28px', fontSize: 15, fontWeight: 700,
            cursor: downloading ? 'default' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 8px var(--color-primary-subtle)',
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading
            ? 'A exportar...'
            : <><Download size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Descarregar PNG</>
          }
        </button>
        <button
          className="cert-action-btn"
          onClick={handleCopy}
          style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            color: copied ? 'var(--color-success)' : C.muted, borderRadius: 10,
            padding: '14px 28px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {copied
            ? <><Check size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Link copiado</>
            : <><Link2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Partilhar link</>
          }
        </button>
      </div>
    </div>
  )
}
