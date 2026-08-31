import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { BellIcon as Bell } from '@solar-icons/react/bold/bell'
import { LinkIcon as Link2 } from '@solar-icons/react/bold/link'
import { LockKeyholeIcon as Lock } from '@solar-icons/react/bold/lock-keyhole'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import './Estagio.css'

/* ══════════════════════════════════════════════════════════════════════════
   ESTÁGIO
   ──────────────────────────────────────────────────────────────────────────
   Esta rota existia sem estar em lado nenhum da navegação: um "Kit de
   Estágio" solto, alcançável só por URL. Passa a ser uma ÁREA identificável,
   com duas camadas honestas:

     · O produto Estágio ainda não existe → está marcado como Em breve, com
       o que ele vai ser dito em três linhas e um sítio para deixar interesse.
       Não inventamos ecrãs de uma funcionalidade que não construímos.
     · O que já existe hoje (link, email de candidatura, QR) fica por baixo,
       como "já podes usar", em vez de ser vendido como o produto final.

   Não anunciar nada seria desperdiçar a expectativa; anunciar como pronto
   seria mentir. Isto é o meio-termo.
   ══════════════════════════════════════════════════════════════════════════ */

const WHAT_IS_COMING = [
  'Empresas parceiras a publicar vagas de estágio para alunos da Showo.',
  'Candidatura com o teu portfólio, sem CV nem carta a começar do zero.',
  'Acompanhamento do estágio dentro da app, como já fazes com os projetos.',
]

export default function Estagio() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState(null)
  const [emailText, setEmailText] = useState('')
  const [interest, setInterest] = useState('idle') // idle | saving | done
  const qrRef = useRef(null)

  useEffect(() => {
    if (!user) return
    supabase.from('projects').select('id, score').eq('user_id', user.id)
      .then(({ data }) => { setProjects(data || []); setLoading(false) })
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    try {
      if (localStorage.getItem(`showo_estagio_interest_${user.id}`)) setInterest('done')
    } catch { /* storage indisponível */ }
  }, [user?.id])

  const displayName = profile?.full_name || profile?.username || 'O teu nome'
  const username = profile?.username || profile?.id || ''
  const profileUrl = username ? `https://showo.pt/u/${username}` : ''

  useEffect(() => {
    setEmailText(
`Assunto: Candidatura a estágio de ${displayName}

Olá,

Chamo-me ${displayName} e estou a candidatar-me a uma oportunidade de estágio na vossa empresa. Desenvolvi ${projects.length} projeto${projects.length !== 1 ? 's' : ''} que pode consultar no meu portfólio: ${profileUrl}

Fico disponível para qualquer questão.

Cumprimentos,
${displayName}`)
  }, [displayName, profileUrl, projects.length])

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2200)
  }

  /* Reaproveita a tabela de feedback que já existe em vez de criar um sistema
     de waitlist paralelo para uma única funcionalidade. */
  async function registerInterest() {
    if (interest !== 'idle') return
    setInterest('saving')
    try {
      await supabase.from('feedback').insert({
        message: 'INTERESSE_ESTAGIO — quer ser avisado quando a área de Estágio abrir.',
        page_url: '/estagio',
        user_id: user?.id ?? null,
      })
    } catch { /* mesmo que falhe, não vale a pena bloquear o utilizador */ }
    try { if (user?.id) localStorage.setItem(`showo_estagio_interest_${user.id}`, '1') } catch {}
    setInterest('done')
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement('a')
      link.download = `showo-qr-${username}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (!user) {
    navigate('/login')
    return null
  }

  const hasProjects = !loading && projects.length > 0

  return (
    <div className="est-page">
      <Helmet><title>Estágio — Showo</title></Helmet>
      <Navbar />

      <div className="est-wrap">

        {/* ── Em breve ── */}
        <section className="est-hero">
          <span className="est-eyebrow">
            <span className="est-eyebrow-dot" />
            Em breve
          </span>
          <h1 className="est-title">Estágio</h1>
          <p className="est-lead">
            O passo a seguir aos teus projetos. Estamos a construir a ponte entre o que
            já fizeste na escola e as empresas que procuram quem sabe fazer.
          </p>

          <ul className="est-coming">
            {WHAT_IS_COMING.map(line => (
              <li key={line}><span className="est-coming-bullet" />{line}</li>
            ))}
          </ul>

          <button
            className={`est-notify${interest === 'done' ? ' is-done' : ''}`}
            onClick={registerInterest}
            disabled={interest !== 'idle'}
          >
            {interest === 'done'
              ? <><Check size={16} /> Ficas a saber primeiro</>
              : interest === 'saving'
              ? 'A registar…'
              : <><Bell size={16} /> Avisa-me quando abrir</>}
          </button>
          <p className="est-notify-note">
            Sem spam. Um email quando a área abrir, mais nada.
          </p>
        </section>

        {/* ── O que já dá para fazer hoje ──
            Sem isto, a página seria só uma promessa. Com isto, o aluno sai
            daqui com alguma coisa na mão. */}
        <section className="est-now">
          <header className="est-now-head">
            <h2>Enquanto isso, já te podes candidatar</h2>
            <p>Estas três coisas chegam para enviares uma candidatura hoje.</p>
          </header>

          {loading ? (
            <div className="est-skel-group">
              {[0, 1, 2].map(i => <div key={i} className="est-skel" style={{ animationDelay: `${i * 0.12}s` }} />)}
            </div>
          ) : !hasProjects ? (
            <div className="est-empty">
              <Lock size={22} className="est-empty-icon" />
              <p className="est-empty-title">Precisas de um projeto primeiro</p>
              <p className="est-empty-sub">
                O kit de candidatura é construído a partir do teu portfólio. Sem projetos, não há nada para mostrar.
              </p>
              <button className="est-btn-primary" onClick={() => navigate('/novo')}>
                Criar projeto <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="est-kit">

              <div className="est-block">
                <span className="est-block-label"><Link2 size={12} /> O teu link</span>
                <div className="est-link-row">
                  <span className="est-link">{profileUrl}</span>
                  <button className={`est-copy${copiedField === 'profile' ? ' is-done' : ''}`} onClick={() => copy(profileUrl, 'profile')}>
                    {copiedField === 'profile' ? <><Check size={13} /> Copiado</> : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="est-block">
                <span className="est-block-label"><Mail size={12} /> Email de candidatura</span>
                <textarea
                  className="est-email"
                  value={emailText}
                  onChange={e => setEmailText(e.target.value)}
                  rows={10}
                />
                <button className={`est-copy est-copy--wide${copiedField === 'email' ? ' is-done' : ''}`} onClick={() => copy(emailText, 'email')}>
                  {copiedField === 'email' ? <><Check size={13} /> Copiado</> : <><Mail size={13} /> Copiar email</>}
                </button>
              </div>

              <div className="est-block">
                <span className="est-block-label">QR do teu perfil</span>
                <div className="est-qr-row">
                  <div ref={qrRef} className="est-qr">
                    <QRCodeSVG value={profileUrl} size={104} />
                  </div>
                  <div className="est-qr-side">
                    <button className="est-copy" onClick={downloadQR}>
                      <Download size={14} /> Descarregar
                    </button>
                    <p className="est-qr-note">Para imprimir e pôr no CV em papel.</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  )
}
