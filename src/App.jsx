import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { CloseIcon as XIcon } from '@solar-icons/react/bold/close'
import { RefreshIcon as RefreshCw } from '@solar-icons/react/bold/refresh'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { CompassIcon as Compass } from '@solar-icons/react/bold/compass'
import { Folder2Icon as FolderOpen } from '@solar-icons/react/bold/folder-2'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'
import { ChatRoundDotsIcon as ChatDots } from '@solar-icons/react/bold/chat-round-dots'
import { QuestionCircleIcon as QuestionCircle } from '@solar-icons/react/bold/question-circle'
import { ShowoMark } from './components/icons/ShowoMark'
import { PhoneIcon as Phone } from '@solar-icons/react/bold/phone'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'
import RestReminder from './components/RestReminder'
import CookieConsent from './components/CookieConsent'
import SplashScreen from './components/SplashScreen'
import { Analytics } from '@vercel/analytics/react'
import { captureError } from './lib/errorTracking'
import { trackPageview } from './lib/analytics'
import { pushRoute } from './lib/routeHistory'
import { supabase } from './lib/supabase'
import { OCCUPATIONS } from './lib/occupations'
import ComingSoon from './pages/ComingSoon'

// Shows the "coming soon" cover only on the public domain, and only before
// launch — so testers can keep using the .vercel.app URL meanwhile, and
// showo.pt flips to the real app on its own at launch time, no deploy needed.
// Capture referral code from any entry page
const refParam = new URLSearchParams(window.location.search).get('ref')
if (refParam) localStorage.setItem('showo_ref', refParam)

// Capture first-touch attribution (utm_source + referrer) na primeira página
// vista, não em Register.jsx — quem chega à homepage, navega, e só depois
// clica em "Registar" perde o ?utm_source= (não sobrevive à navegação
// interna) e o document.referrer original (passa a ser a própria Showo).
// Só grava na primeira visita da sessão: não deixar uma navegação interna
// pisar a origem real de quem entrou.
if (!localStorage.getItem('showo_utm_source') && !localStorage.getItem('showo_referrer')) {
  const utmSource = new URLSearchParams(window.location.search).get('utm_source')
  localStorage.setItem('showo_utm_source', utmSource || '')
  localStorage.setItem('showo_referrer', document.referrer || 'direct')
}

const COMING_SOON_HOSTS = ['showo.pt', 'www.showo.pt']
const LAUNCH_AT = new Date('2026-07-01T08:00:00Z') // já passou — countdown desativado

function useIsComingSoon() {
  const [isComingSoon, setIsComingSoon] = useState(
    () => COMING_SOON_HOSTS.includes(window.location.hostname) && new Date() < LAUNCH_AT
  )
  useEffect(() => {
    if (!isComingSoon) return
    const id = setInterval(() => {
      if (new Date() >= LAUNCH_AT) setIsComingSoon(false)
    }, 30_000)
    return () => clearInterval(id)
  }, [isComingSoon])
  return isComingSoon
}

// Eagerly loaded — visible on first paint
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

// Lazy loaded — only fetched when the route is actually visited.
// Depois de um deploy, os chunks antigos que a aba já tinha deixam de
// existir com o mesmo hash — o import() falha e cai no ErrorBoundary
// ("algo correu mal"). Aqui, se um import falhar, recarrega a página uma
// vez (traz o index.html novo com os hashes certos). O guard evita loop.
function lazyPage(factory) {
  return lazy(() =>
    factory().catch(err => {
      const KEY = 'showo_chunk_reload_at'
      const last = Number(sessionStorage.getItem(KEY) || 0)
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()))
        window.location.reload()
        return new Promise(() => {})   // nunca resolve; a página recarrega
      }
      throw err
    }),
  )
}

const RecuperarPassword = lazyPage(() => import('./pages/RecuperarPassword'))
const NewProject   = lazyPage(() => import('./pages/NewProject'))
const ProjectPage  = lazyPage(() => import('./pages/ProjectPage'))
const EditProject  = lazyPage(() => import('./pages/EditProject'))
const Explore      = lazyPage(() => import('./pages/Explore'))
const Dashboard    = lazyPage(() => import('./pages/Dashboard'))
const Biblioteca   = lazyPage(() => import('./pages/Biblioteca'))
const Vagas        = lazyPage(() => import('./pages/Vagas'))
const Settings     = lazyPage(() => import('./pages/Settings'))
const UserProfile  = lazyPage(() => import('./pages/UserProfile'))
const Admin        = lazyPage(() => import('./pages/Admin'))
const TurmaPage    = lazyPage(() => import('./pages/TurmaPage'))
const TurmaAluno   = lazyPage(() => import('./pages/TurmaAluno'))
const Turmas       = lazyPage(() => import('./pages/Turmas'))
const Certificate  = lazyPage(() => import('./pages/Certificate'))
const Mensagens    = lazyPage(() => import('./pages/Mensagens'))
const Privacidade    = lazyPage(() => import('./pages/Privacidade'))
const Termos         = lazyPage(() => import('./pages/Termos'))
const GoogleCalendarCallback = lazyPage(() => import('./pages/GoogleCalendarCallback'))
const DiaryCanvas  = lazyPage(() => import('./pages/DiaryCanvas'))
const AprendeAUsar = lazyPage(() => import('./pages/AprendeAUsar'))
const Pricing      = lazyPage(() => import('./pages/Pricing'))
const Welcome      = lazyPage(() => import('./pages/Welcome'))
const Feedback     = lazyPage(() => import('./pages/Feedback'))
const PostSemana   = lazyPage(() => import('./pages/PostSemana'))

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <style>{`@keyframes pg-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
      {[120, 80, 100].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `pg-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
      ))}
    </div>
  )
}

// Holds the router (and every route) until auth state is resolved, so pages
// never need their own "if (authLoading) show a spinner" check that used to
// render right after this same PageLoader — that produced two back-to-back
// spinners (this one, then the page's own) on a direct/deep navigation.
function AuthGate({ children }) {
  const { loading } = useAuth()
  if (loading) return <PageLoader />
  return children
}

/* ── Onde as comportas (telemóvel, ocupação) NÃO aparecem ──
   Não é a mesma lista das rotas públicas. Uma rota ser pública diz quem a
   pode ver sem sessão; isto diz onde é aceitável interromper quem JÁ tem
   sessão. Usar a lista pública para ambos abria uma fuga: um aluno que
   entrasse pelo link do próprio projeto (/projeto/…) nunca via a comporta e
   ficava para sempre sem número — 10 alunos ficaram assim.

   Ficam de fora, e cada um por uma razão:
   - fluxos de autenticação: interromper a meio parte o próprio login
   - páginas legais: não se pode pedir dados pessoais e ao mesmo tempo
     bloquear o documento que explica o que se faz com eles
   - preços: nunca bloquear quem está a tentar pagar
   Visitantes anónimos nunca veem comporta nenhuma — ela exige `user`. */

// Logótipos monocromáticos (TikTok/Instagram) para o HeardFromGate — o
// pacote de ícones (Solar) não tem marcas, só ícones genéricos. Mesmo
// padrão do GoogleG em GoogleButton.jsx: SVG inline, currentColor para
// herdar a cor do estado selecionado/não selecionado do cartão.
function TikTokIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-1.36-1.15-1.86-2.54-1.94-4.32h-3.06v13.6c0 1.44-1.18 2.6-2.6 2.6-1.44 0-2.6-1.18-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.65c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01c1.22.87 2.71 1.38 4.3 1.38V7.3c0-.01-1.95.03-3.38-1.48z" />
    </svg>
  )
}
function InstagramIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92 1.27-.06 1.64-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  )
}
const GATE_EXEMPT_PATHS = new Set(['/login', '/register', '/recuperar-password', '/privacidade', '/termos', '/pricing', '/welcome'])
const GATE_EXEMPT_PREFIXES = ['/oauth/']
const isGateExempt = (pathname) =>
  GATE_EXEMPT_PATHS.has(pathname) || GATE_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))

function PhoneGate({ children, reopenGate, setReopenGate }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const needsPhone = (!isGateExempt(location.pathname) && user && profile && profile.role !== 'professor' && !profile.phone)
    || reopenGate === 'phone'

  // Reabertura via "← Voltar" no OccupationGate — pré-preenche com o número
  // que já lá estava, para a pessoa só corrigir o que estava errado, não
  // escrever tudo de novo.
  useEffect(() => {
    if (reopenGate === 'phone' && profile?.phone) setPhone(profile.phone)
  }, [reopenGate, profile?.phone])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim()) { setError('Introduz o teu número de telemóvel.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id)
    if (err) { setError('Erro ao guardar. Tenta novamente.'); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
    setReopenGate(null)
  }

  if (!needsPhone) return children

  return (
    <div className="onboard-screen">
      <div className="onboard-body">
        <img src="/darkmode_icon_logo.png" alt="Showo" className="onboard-logo" />
        <div className="onboard-head">
          <h1 className="onboard-title">Deixa-nos o teu contacto</h1>
          {/* Texto sem marca temporal: esta comporta aparece a quem acabou de
              criar conta E a quem se registou há meses e só agora voltou. O
              "Uma última coisa" anterior soava a fim de registo e não fazia
              sentido para o segundo caso, que é a maioria de quem falta. */}
          <p className="onboard-subtitle">Usamos o teu número só para falar contigo sobre o teu percurso na Showo. Nunca é partilhado nem aparece no teu perfil.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <div className="onboard-input-wrap">
            <span className="onboard-input-prefix">+351</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="912 345 678"
              autoFocus
              className="onboard-input"
            />
          </div>

          {error && <p className="onboard-error">{error}</p>}

          <button type="submit" disabled={saving} className="onboard-cta">
            {saving ? 'A guardar…' : 'Activar acesso gratuito'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Só a conta Individual (role 'aluno' sem organization_id — quem tem
// organization_id é aluno institucional, já sabe "o que faz") vê isto,
// e só quem já não tem occupation preenchida — para quem já respondeu no
// registo, ou já respondeu aqui uma vez, nunca mais aparece.
function OccupationGate({ children, reopenGate, setReopenGate }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [occupation, setOccupation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const needsOccupation = (!isGateExempt(location.pathname) && user && profile
    && profile.role === 'aluno' && !profile.organization_id && !profile.occupation)
    || reopenGate === 'occupation'

  // Reabertura via "← Voltar" no IntentGate — pré-preenche com a ocupação já
  // guardada, mesma lógica do PhoneGate acima.
  useEffect(() => {
    if (reopenGate === 'occupation' && profile?.occupation) setOccupation(profile.occupation)
  }, [reopenGate, profile?.occupation])

  async function pick(value) {
    setOccupation(value)
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.from('profiles').update({ occupation: value }).eq('id', user.id)
      if (err) { setSaving(false); setError(err.message); return }
      await refreshProfile()
      setReopenGate(null)
    } catch (ex) {
      setError(String(ex?.message || ex))
    }
    setSaving(false)
  }

  if (!needsOccupation) return children

  return (
    <div className="onboard-screen">
      <button type="button" onClick={() => setReopenGate('phone')} className="onboard-back">
        <ArrowLeft size={13} /> Voltar
      </button>
      <div className="onboard-body">
        <img src="/darkmode_icon_logo.png" alt="Showo" className="onboard-logo" />
        <div className="onboard-head">
          <h1 className="onboard-title">O que fazes?</h1>
          <p className="onboard-subtitle">Aparece no teu perfil público, para quem vê saber quem és.</p>
        </div>

        {error && <p className="onboard-error">{error}</p>}

        <div className="onboard-list" style={{ opacity: saving ? 0.5 : 1, pointerEvents: saving ? 'none' : 'auto', maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
          {OCCUPATIONS.map(occ => (
            <button key={occ} type="button" onClick={() => pick(occ)} className={`onboard-row${occ === occupation ? ' is-selected' : ''}`}>
              {occ}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const HEARD_FROM_OPTIONS = [
  { id: 'tiktok',      label: 'TikTok',       icon: TikTokIcon },
  { id: 'instagram',   label: 'Instagram',    icon: InstagramIcon },
  { id: 'boca_a_boca', label: 'Boca a boca',  icon: ChatDots },
  { id: 'outro',       label: 'Outro',        icon: QuestionCircle },
]

// "Onde conheceste o Showo?" — entre o OccupationGate e o IntentGate, pedido
// do Gustavo à imagem do "Como você soube sobre StudyFetch?" deles. Só
// conta Individual, mesma condição dos outros gates desta stack.
function HeardFromGate({ children, reopenGate, setReopenGate }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [heardFrom, setHeardFrom] = useState('')
  const [saving, setSaving] = useState(false)

  const needsHeardFrom = (!isGateExempt(location.pathname) && user && profile
    && profile.role === 'aluno' && !profile.organization_id && !profile.heard_from)
    || reopenGate === 'heard_from'

  useEffect(() => {
    if (reopenGate === 'heard_from' && profile?.heard_from) setHeardFrom(profile.heard_from)
  }, [reopenGate, profile?.heard_from])

  async function pick(id) {
    setHeardFrom(id)
    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({ heard_from: id }).eq('id', user.id)
    if (!err) { await refreshProfile(); setReopenGate(null) }
    setSaving(false)
  }

  if (!needsHeardFrom) return children

  return (
    <div className="onboard-screen">
      <button type="button" onClick={() => setReopenGate('occupation')} className="onboard-back">
        <ArrowLeft size={13} /> Voltar
      </button>
      <div className="onboard-body" style={{ opacity: saving ? 0.5 : 1, pointerEvents: saving ? 'none' : 'auto' }}>
        <img src="/darkmode_icon_logo.png" alt="Showo" className="onboard-logo" />
        <div className="onboard-head">
          <h1 className="onboard-title">Onde conheceste o Showo?</h1>
        </div>
        <div className="onboard-grid">
          {HEARD_FROM_OPTIONS.map(opt => {
            const Icon = opt.icon
            const isSelected = heardFrom === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                disabled={saving}
                onClick={() => pick(opt.id)}
                className={`onboard-card${isSelected ? ' is-selected' : ''}`}
              >
                {isSelected && <span className="onboard-card-check"><CheckCircle size={13} /></span>}
                <span className="onboard-card-icon"><Icon size={22} /></span>
                <span className="onboard-card-label">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// "Para que vais usar o Showo agora?" — feedback recorrente dos áudios de
// outreach: quem chega pelo vídeo da PAP entra a pensar "isto é só para a
// PAP" e, se a PAP for só para o ano, nunca cria nada. Precisava de estar
// aqui, não num passo do /welcome: nem o registo por email/password nem a
// maioria dos registos por Google passam de forma fiável pelo /welcome (o
// próprio ficheiro já avisava que a flag "nem sempre chega a ser posto") —
// confirmado ao vivo, uma conta nova por email/password não via pergunta
// nenhuma. O IntentGate corre em qualquer página, como o PhoneGate e o
// OccupationGate, por isso apanha sempre, seja qual for o caminho de
// entrada. Mesma condição do OccupationGate: só conta Individual.
// Duas listas — quem é aluno a estudar vê PAP/trabalhos de disciplina, quem
// já trabalha (freelancer, à procura de emprego, developer, etc.) vê opções
// profissionais em vez disso. "A minha PAP" não fazia sentido para quem já
// nem anda na escola. `profile.occupation` já está sempre preenchido a esta
// altura — o OccupationGate corre antes deste, na mesma stack.
const STUDENT_INTENT_OPTIONS = [
  { id: 'pap',             label: 'PAP ou projeto final',                icon: GraduationCap },
  { id: 'trabalho_escola', label: 'Trabalhos',                           icon: BookOpen },
  { id: 'projetos_pessoais', label: 'Projetos pessoais',                 icon: Lightbulb },
  { id: 'explorar',        label: 'Ainda estou só a explorar',           icon: Compass },
]
const WORK_INTENT_OPTIONS = [
  { id: 'organizar',       label: 'Guardar e organizar o que já fiz',    icon: FolderOpen },
  { id: 'portfolio',       label: 'Portefólio para procurar oportunidades', icon: Briefcase },
  { id: 'projetos_pessoais', label: 'Projetos pessoais, fora do trabalho', icon: Lightbulb },
  { id: 'explorar',        label: 'Ainda estou só a explorar',           icon: Compass },
]
const PAP_TIMING_OPTIONS = [
  { id: 'este_ano',    label: 'Este ano letivo' },
  { id: 'proximo_ano', label: 'Só para o ano' },
  { id: 'nao_sei',     label: 'Ainda não sei' },
]

function IntentGate({ children, setReopenGate }) {
  const { user, profile, refreshProfile } = useAuth()
  const location = useLocation()
  const [step, setStep] = useState('intent') // 'intent' | 'pap_timing'
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const isStudent = profile?.occupation === 'Aluno / A estudar'

  const needsIntent = !isGateExempt(location.pathname) && user && profile
    && profile.role === 'aluno' && !profile.organization_id
    && (!profile.intended_use || profile.intended_use.length === 0)

  // Quem carrega em "← Voltar" e corrige a ocupação (ex: era "Freelancer",
  // afinal é "Aluno / A estudar") vê um conjunto de opções diferente ao
  // voltar aqui — uma seleção feita no conjunto anterior já não corresponde
  // a nada visível, por isso limpa-se.
  useEffect(() => { setSelected([]) }, [isStudent])

  async function save(fields) {
    setSaving(true)
    const { error: err } = await supabase.from('profiles').update(fields).eq('id', user.id)
    if (!err) await refreshProfile()
    setSaving(false)
  }

  if (!needsIntent) return children

  const INTENT_OPTIONS = isStudent ? STUDENT_INTENT_OPTIONS : WORK_INTENT_OPTIONS

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function confirmIntent() {
    if (!selected.length) return
    if (selected.includes('pap')) { setStep('pap_timing'); return }
    save({ intended_use: selected, pap_timing: null })
  }

  return (
    <div className="onboard-screen">
      <button
        type="button"
        onClick={() => step === 'pap_timing' ? setStep('intent') : setReopenGate('heard_from')}
        className="onboard-back"
      >
        <ArrowLeft size={13} /> Voltar
      </button>
      <div className="onboard-body" style={{ opacity: saving ? 0.5 : 1, pointerEvents: saving ? 'none' : 'auto' }}>
        <img src="/darkmode_icon_logo.png" alt="Showo" className="onboard-logo" />
        <div className="onboard-head">
          <h1 className="onboard-title">{step === 'pap_timing' ? 'Quando é a tua PAP?' : 'Para que vais usar o Showo?'}</h1>
          {step === 'intent' && <p className="onboard-subtitle">Escolhe tudo o que se aplica.</p>}
        </div>

        {step === 'pap_timing' ? (
          <div className="onboard-list">
            {PAP_TIMING_OPTIONS.map(opt => (
              <button key={opt.id} type="button" disabled={saving} onClick={() => save({ intended_use: selected, pap_timing: opt.id })} className="onboard-row">
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="onboard-grid">
              {INTENT_OPTIONS.map(opt => {
                const Icon = opt.icon
                const isSelected = selected.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={saving}
                    onClick={() => toggle(opt.id)}
                    className={`onboard-card${isSelected ? ' is-selected' : ''}`}
                  >
                    {isSelected && <span className="onboard-card-check"><CheckCircle size={13} /></span>}
                    <span className="onboard-card-icon"><Icon size={22} /></span>
                    <span className="onboard-card-label">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" disabled={saving || !selected.length} onClick={confirmIntent} className="onboard-cta">
              {saving ? 'A guardar…' : 'Continuar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: null })} />
  }
}

function ErrorFallback({ error, onReset }) {
  useEffect(() => {
    document.body.classList.remove('has-sidebar', 'sidebar-collapsed')
    return () => {}
  }, [])
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <ShowoMark size={30} style={{ color: 'var(--color-text-tertiary)' }} />
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Algo correu mal
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Ocorreu um erro inesperado. Tenta recarregar a página.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { onReset(); window.location.href = '/' }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Início
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-text)',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: 'var(--color-bg)', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} /> Recarregar
        </button>
      </div>
    </div>
  )
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────
function NotFound() {
  const navigate = useNavigate()
  useEffect(() => {
    document.body.classList.remove('has-sidebar', 'sidebar-collapsed')
  }, [])
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', gap: 20,
    }}>
      <div style={{
        fontSize: 'clamp(64px, 12vw, 96px)', fontWeight: 900,
        fontFamily: 'var(--font-heading)', letterSpacing: '-4px', lineHeight: 1,
        background: 'var(--color-primary)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>404</div>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
          Página não encontrada
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          A página que procuras não existe ou foi movida.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '10px 18px',
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--color-primary)',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px var(--color-primary-subtle)',
          }}
        >
          Ir para o início
        </button>
      </div>
    </div>
  )
}

// ── Animation timeline ────────────────────────────────────────────────────────
// 0.5s  — logo fades/scales in
// 0.6s  — hold at final state
// 0.6s  — fade out transition (handled by CSS on SplashScreen)
// 0.65s — unmount after fade completes

const HOLD_MS    = 1100           // when to start fading (1100ms)
const UNMOUNT_MS = HOLD_MS + 700  // when to remove from DOM (1800ms)
const SPLASH_KEY = 'showo_seen_splash'

function HomeRoute() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return <Home />
}

function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageview(location.pathname + location.search)
    pushRoute(location.pathname)
  }, [location.pathname, location.search])
  return null
}

// React Router não repõe o scroll ao mudar de página — o browser mantinha a
// posição da página anterior, por isso ao ir da Home (scrollada até ao
// fundo) para /termos aparecia-se a meio da página nova, não no topo.
// Só no pathname (não em query/hash), para não interferir com scroll para
// uma secção específica via #âncora.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// Forces anyone arriving via a password-recovery link onto /recuperar-password
// before they can touch the rest of the app — a recovery link shouldn't be
// able to silently sign someone in without them actually setting a new
// password. Wraps the whole route tree instead of relying on the
// /recuperar-password page alone, so it holds regardless of where the
// email's redirect actually lands.
function RecoveryGate({ pwRecovery, children }) {
  const location = useLocation()
  if (pwRecovery && location.pathname !== '/recuperar-password') {
    return <Navigate to="/recuperar-password" replace />
  }
  return children
}

function AuthErrorBanner() {
  const [msg, setMsg] = useState('')
  const [oauthRetry, setOauthRetry] = useState(false)

  useEffect(() => {
    // O Supabase devolve erros de auth ora na hash (#error=…, confirmação de
    // email) ora na query string (?error=…, callback OAuth do GoTrue) —
    // conferir as duas, senão erros como bad_oauth_state ficam sem feedback
    // nenhum e a página parece só ter "partido" sem explicação.
    const hash = window.location.hash.slice(1)
    const search = window.location.search.slice(1)
    const source = hash.includes('error=') ? hash : search.includes('error=') ? search : null
    if (!source) return
    const p = new URLSearchParams(source)
    const code = p.get('error_code')
    const desc = p.get('error_description')
    if (code === 'otp_expired' || desc?.includes('expired')) {
      setMsg('O link de confirmação expirou. Faz login e pede um novo email de confirmação.')
    } else if (code === 'bad_oauth_state') {
      setMsg('Não foi possível concluir o login com o Google. Tenta novamente — se estiveres em Navegação Privada, tenta num separador normal.')
      setOauthRetry(true)
    } else if (p.get('error')) {
      setMsg('Erro de autenticação. Tenta entrar novamente.')
    }
    // clean the hash/query from the URL
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, maxWidth: 480, width: 'calc(100% - 32px)',
      background: '#1a0e0e', border: '1px solid var(--color-error-subtle)',
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'inherit',
    }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><AlertTriangle size={18} /></span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#fca5a5', lineHeight: 1.5 }}>{msg}</p>
        {oauthRetry && (
          <button
            onClick={() => supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/welcome` },
            })}
            style={{
              marginTop: 10, background: 'none', border: '1px solid var(--color-error-subtle)',
              borderRadius: 8, padding: '6px 12px', color: '#fca5a5', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Tentar novamente com Google
          </button>
        )}
      </div>
      <button
        onClick={() => setMsg('')}
        style={{ background: 'none', border: 'none', color: '#7d93b0', cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
      ><XIcon size={16} /></button>
    </div>
  )
}

export default function App() {
  const isComingSoon = useIsComingSoon()

  // Skip splash on repeat visits — only show it the first time
  const firstVisit = !localStorage.getItem(SPLASH_KEY)
  const [splashVisible,  setSplashVisible]  = useState(firstVisit)
  const [splashMounted,  setSplashMounted]  = useState(firstVisit)

  // Detected synchronously on first render (before anything else mounts) so
  // there's no race with lazy-loaded pages for who sees the recovery hash
  // first. type=recovery is what Supabase appends to the redirect URL.
  const [pwRecovery, setPwRecovery] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  )

  // Partilhado entre Phone/Occupation/IntentGate — "← Voltar" num gate mais à
  // frente reabre o anterior mesmo já tendo dados guardados, para corrigir
  // um engano sem ter de ir aos Settings. null quando nenhum está reaberto.
  const [reopenGate, setReopenGate] = useState(null)

  useEffect(() => {
    if (!firstVisit) return
    localStorage.setItem(SPLASH_KEY, '1')
    const fadeTimer    = setTimeout(() => setSplashVisible(false), HOLD_MS)
    const unmountTimer = setTimeout(() => setSplashMounted(false), UNMOUNT_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(unmountTimer) }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPwRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (isComingSoon) return <ComingSoon />

  return (
    <HelmetProvider>
      <ThemeProvider>
        <SidebarProvider>
        <AuthProvider>
          <AuthErrorBanner />
          {splashMounted && <SplashScreen visible={splashVisible} />}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Analytics />
            <CookieConsent />
            {/* Precisa de useLocation (para não aparecer em /login, /register,
                etc.) — por isso mora dentro do Router, não fora. */}
            <RestReminder />
            <PageViewTracker />
            <ScrollToTop />
            <ErrorBoundary>
            <RecoveryGate pwRecovery={pwRecovery}>
            <AuthGate>
            <PhoneGate reopenGate={reopenGate} setReopenGate={setReopenGate}>
            <OccupationGate reopenGate={reopenGate} setReopenGate={setReopenGate}>
            <HeardFromGate reopenGate={reopenGate} setReopenGate={setReopenGate}>
            <IntentGate reopenGate={reopenGate} setReopenGate={setReopenGate}>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<HomeRoute />}   />
              <Route path="/home"          element={<Home />}        />
              <Route path="/novo"          element={<NewProject />}  />
              <Route path="/projeto/:slug" element={<ProjectPage />} />
              <Route path="/editar/:slug"  element={<EditProject />} />
              <Route path="/explorar"      element={<Explore />}     />
              <Route path="/explore"       element={<Navigate to="/explorar" replace />} />
              <Route path="/login"         element={<Login />}       />
              <Route path="/recuperar-password" element={<RecuperarPassword onDone={() => setPwRecovery(false)} />} />
              <Route path="/register"      element={<Register />}    />
              <Route path="/dashboard"     element={<Dashboard />}   />
              <Route path="/post-semana"   element={<PostSemana />}  />
              <Route path="/biblioteca"    element={<Biblioteca />}  />
              <Route path="/vagas"         element={<Vagas />}       />
              <Route path="/settings"      element={<Settings />}    />
              <Route path="/u/:username"   element={<UserProfile />} />
              <Route path="/admin"         element={<Admin />}       />
              <Route path="/turma/:code"   element={<TurmaPage />}   />
              <Route path="/turma/:code/aluno/:userId" element={<TurmaAluno />} />
              <Route path="/turmas"        element={<Turmas />}      />
              <Route path="/certificado/:slug"  element={<Certificate />}  />
              <Route path="/mensagens"          element={<Mensagens />}    />
              <Route path="/projeto/:slug/diario" element={<DiaryCanvas />}  />
              <Route path="/privacidade"        element={<Privacidade />}   />
              <Route path="/termos"             element={<Termos />}        />
              <Route path="/oauth/google-calendar" element={<GoogleCalendarCallback />} />
              <Route path="/aprende"            element={<AprendeAUsar />}  />
              <Route path="/pricing"            element={<Pricing />}       />
              <Route path="/welcome"            element={<Welcome />}       />
              <Route path="/feedback"           element={<Feedback />}      />
              <Route path="*"                   element={<NotFound />}      />
            </Routes>
            </Suspense>
            </IntentGate>
            </HeardFromGate>
            </OccupationGate>
            </PhoneGate>
            </AuthGate>
            </RecoveryGate>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
