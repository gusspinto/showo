import { useEffect, useState, useRef, useMemo, memo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { getVisitorCity } from '../lib/geolocation'
import { useIsMobile } from '../lib/useIsMobile'
import { calculateScore, looksLikeSpam } from '../lib/score'
import { containsProfanity } from '../lib/profanity'
import { hasPlaceholder } from '../lib/textQuality'
import { topLanguages, commitSpanMonths, repoAgeMonths } from '../lib/social'
import { listPublicTables, publicCurlExample, listRows, listTables } from '../lib/projectDb'
import { DatabaseIcon as Database } from '@solar-icons/react/bold/database'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { getProjectField } from '../lib/projectFields'
import { getProjectState } from '../lib/projectState'
import { Navbar } from '../components/Navbar'
import SegmentedTabs from '../components/SegmentedTabs'
import { PlanGateModal, AiUsageBadge, ConfirmUseModal } from '../components/PlanGate'
import { chatProjectCoach } from '../lib/chatProjectCoach'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
// pptxgenjs (usado só pelo Modo de Defesa) é uma biblioteca pesada — carregada
// à parte para não entrar no bundle de todas as visitas a um projeto, quando
// a esmagadora maioria nunca abre este modo.
const DefenseMode = lazy(() => import('../components/DefenseMode'))
import ProjectComments from '../components/ProjectComments'
import ProjectTimeline from '../components/ProjectTimeline'
import ProjectTimelineBadge from '../components/ProjectTimelineBadge'
import { ShareStoryModal } from '../components/ShareStoryModal'
import { logFieldFilled } from '../lib/autoJournal'
import { analyzeProject } from '../lib/analyzeProject'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { RefreshCircleIcon as Loader } from '@solar-icons/react/bold/refresh-circle'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { DisketteIcon as Save } from '@solar-icons/react/bold/diskette'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { BotIcon as Bot } from '@solar-icons/react/bold/bot'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { TargetIcon as Target } from '@solar-icons/react/bold/target'
import { SettingsMinimalisticIcon as Wrench } from '@solar-icons/react/bold/settings-minimalistic'
import { LightningIcon as Zap } from '@solar-icons/react/bold/lightning'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { UsersGroupRoundedIcon as Users } from '@solar-icons/react/bold/users-group-rounded'
import { RocketIcon as Rocket } from '@solar-icons/react/bold/rocket'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { Chart2Icon as BarChart2 } from '@solar-icons/react/bold/chart-2'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { EyeClosedIcon as EyeOff } from '@solar-icons/react/bold/eye-closed'
import { UserPlusRoundedIcon as UserPlus } from '@solar-icons/react/bold/user-plus-rounded'
import { CalendarIcon as Calendar } from '@solar-icons/react/bold/calendar'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { RoundAltArrowRightIcon as TourNextArrow } from '@solar-icons/react/linear/round-alt-arrow-right'
import { AltArrowLeftIcon as ChevronLeft } from '@solar-icons/react/bold/alt-arrow-left'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { GalleryWideIcon as Image } from '@solar-icons/react/bold/gallery-wide'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { ChatRoundLineIcon as Quote } from '@solar-icons/react/bold/chat-round-line'
import { TextBoldIcon as Type } from '@solar-icons/react/bold/text-bold'
import { LinkIcon as Link } from '@solar-icons/react/bold/link'
import { SortVerticalIcon as GripVertical } from '@solar-icons/react/bold/sort-vertical'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { AlignLeftIcon as AlignLeft } from '@solar-icons/react/bold/align-left'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { CameraIcon as Camera } from '@solar-icons/react/bold/camera'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { ClipboardTextIcon as ClipboardList } from '@solar-icons/react/bold/clipboard-text'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { MonitorIcon as Monitor } from '@solar-icons/react/bold/monitor'
import { TabletIcon as Tablet } from '@solar-icons/react/bold/tablet'
import { SmartphoneIcon as Smartphone } from '@solar-icons/react/bold/smartphone'
import { MinusCircleIcon as Minus } from '@solar-icons/react/bold/minus-circle'
import { VideocameraIcon as Video } from '@solar-icons/react/bold/videocamera'
import { AlignHorizontalCenterIcon as AlignCenter } from '@solar-icons/react/bold/align-horizontal-center'
import { AlignRightIcon as AlignRight } from '@solar-icons/react/bold/align-right'
import { Palette2Icon as Palette } from '@solar-icons/react/bold/palette-2'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { UserIcon as User } from '@solar-icons/react/bold/user'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'
import { PaintRollerIcon as Paintbrush } from '@solar-icons/react/bold/paint-roller'
import { WindowFrameIcon as LayoutTemplate } from '@solar-icons/react/bold/window-frame'

import {
  ANON_PROJECT_COLUMNS, AUTH_PROJECT_COLUMNS, ApiProof, DbSetupNudge, GithubProof, colors,
  PROJECT_TYPE_LABELS, TYPE_HERO, PROFILE_SCORE_FIELDS, SECTION_GROUPS,
  humanizeFieldKey, FeedbackCommentText, progBar, progTrack, getAreaGradient,
  getLevelInfo, ScoreRing, Section, MissionRow, Toast, Confetti,
  SECTION_LABELS, TITLE_FONT_OPTIONS, PublicView,
} from '../components/project/ProjectPageParts'

function MembersPanel({ ownerName, members, colors, isOwner }) {
  if (!ownerName && members.length === 0) return null
  const displayOwner = ownerName || 'Dono'

  const statusCfg = {
    accepted: { label: 'Colaborador', color: 'var(--color-success)', bg: 'var(--color-success-subtle)', border: 'var(--color-success-subtle)', avatar: 'var(--color-success)', dim: false },
    pending:  { label: 'Pendente', color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-subtle)',  avatar: '#ca8a04', dim: true  },
    declined: { label: 'Recusou',  color: 'var(--color-error)', bg: 'var(--color-error-subtle)', border: 'var(--color-error-subtle)', avatar: 'var(--color-error)', dim: true  },
  }

  // For non-owners, only show accepted; already filtered at query level but guard here too
  const visibleMembers = isOwner ? members : members.filter(m => m.status === 'accepted')

  // Solo project — no team card; the detailed "Autor" card below handles this
  if (visibleMembers.length === 0) return null

  // Team project — show full Equipa card
  return (
    <div className="proj-card">
      <h3 className="proj-sec-label">Equipa</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {displayOwner[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayOwner}</span>
          <span style={{ fontSize: 11, flexShrink: 0, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 5, padding: '2px 8px', color: colors.blue, fontWeight: 700 }}>Dono</span>
        </div>
        {/* Collaborators */}
        {visibleMembers.map(m => {
          const name = m.profiles?.full_name || m.profiles?.username || 'Colaborador'
          const sections = (m.sections ?? []).map(s => SECTION_LABELS[s]).filter(Boolean)
          const cfg = statusCfg[m.status] || statusCfg.accepted
          const hasSubRow = m.status === 'accepted' && sections.length > 0
          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: hasSubRow ? 'flex-start' : 'center', gap: 10, opacity: cfg.dim ? 0.65 : 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: cfg.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {name[0]?.toUpperCase()}
              </div>
              {hasSubRow ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{name}</span>
                    <span style={{ fontSize: 11, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 8px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {sections.map(s => (
                      <span key={s} style={{ fontSize: 11, color: colors.muted, background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '1px 6px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontSize: 11, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 8px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderMd(text) {
  const lines = text.split('\n')
  const out = []
  let listItems = []
  let k = 0
  function flush() {
    if (!listItems.length) return
    out.push(<ul key={k++} style={{ margin: '4px 0 4px 4px', paddingLeft: 16, listStyleType: 'disc' }}>{listItems}</ul>)
    listItems = []
  }
  function inline(line) {
    const parts = []
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
    let last = 0, m
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index))
      if (m[0].startsWith('**')) parts.push(<strong key={m.index}>{m[2]}</strong>)
      else parts.push(<em key={m.index}>{m[3]}</em>)
      last = m.index + m[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return parts
  }
  for (const line of lines) {
    const isBullet = line.startsWith('- ') || line.startsWith('• ')
    if (isBullet) { listItems.push(<li key={k++}>{inline(line.slice(2))}</li>); continue }
    flush()
    if (line === '') { out.push(<br key={k++} />); continue }
    out.push(<span key={k++} style={{ display: 'block' }}>{inline(line)}</span>)
  }
  flush()
  return out
}

/* ── Spotlight Tour ─────────────────────────────────────────────────────────── */

function MacWindow({ title, children }) {
  return (
    <div style={{
      borderRadius:10, overflow:'hidden',
      boxShadow:'0 10px 32px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
      border:'1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        background:'#2c2c2c', padding:'7px 10px',
        display:'flex', alignItems:'center', gap:5,
        borderBottom:'1px solid rgba(0,0,0,0.35)',
      }}>
        <span style={{width:9,height:9,borderRadius:'50%',background:'#E04848',flexShrink:0}} />
        <span style={{width:9,height:9,borderRadius:'50%',background:'#C49A20',flexShrink:0}} />
        <span style={{width:9,height:9,borderRadius:'50%',background:'#2a9d6a',flexShrink:0}} />
        {title && <span style={{flex:1,textAlign:'center',fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:500,marginRight:23,letterSpacing:'0.01em'}}>{title}</span>}
      </div>
      <div style={{background:'#0e0e0e'}}>{children}</div>
    </div>
  )
}

function TourVisualScore() {
  const r = 18, circ = 2 * Math.PI * r
  return (
    <MacWindow title="MonteSado — Score">
      <div style={{padding:'14px 16px', display:'flex', alignItems:'center', gap:14}}>
        <svg width={44} height={44} style={{flexShrink:0}}>
          <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
          <circle cx={22} cy={22} r={r} fill="none" stroke="#2a9d6a" strokeWidth={4}
            strokeDasharray={`${0.88*circ} ${circ}`} strokeLinecap="round"
            style={{transform:'rotate(-90deg)',transformOrigin:'22px 22px'}}
          />
          <text x={22} y={27} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2a9d6a">88</text>
        </svg>
        <div style={{flex:1}}>
          <div style={{fontSize:8,fontWeight:800,color:'#2a9d6a',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>Nível Profissional</div>
          <div style={{height:3,width:'100%',borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden',marginBottom:7}}>
            <div style={{height:'100%',width:'88%',background:'#2a9d6a',borderRadius:2}} />
          </div>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>Avaliado pela IA · Só tu vês</div>
        </div>
      </div>
    </MacWindow>
  )
}

function TourVisualDefense() {
  const cards = [
    {
      n: 1, practiced: true,
      q: 'Quais foram os principais desafios técnicos do projeto?',
    },
    {
      n: 2, practiced: false, revealed: true,
      q: 'Que tecnologias usaste e porquê essa escolha?',
      a: 'Utilizei React para o frontend pela componentização e Supabase pelo backend em tempo real, evitando construir APIs de raiz.',
    },
    {
      n: 3, practiced: false, revealed: false,
      q: 'Como apresentarias o projeto a alguém sem conhecimentos técnicos?',
    },
  ]
  return (
    <MacWindow title="Preparar Defesa — MonteSado">
      <div style={{display:'flex', flexDirection:'column'}}>
        {/* Tabs */}
        <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0}}>
          {[{l:'Notas',a:false},{l:'Juri',a:true},{l:'No dia',a:false}].map(t => (
            <div key={t.l} style={{
              padding:'6px 13px', fontSize:10, fontWeight:700,
              color:t.a?'#C49A20':'rgba(255,255,255,0.3)',
              borderBottom:t.a?'2px solid #C49A20':'2px solid transparent',
            }}>{t.l}</div>
          ))}
        </div>
        {/* Progress */}
        <div style={{padding:'8px 12px 5px', display:'flex', alignItems:'center', gap:7}}>
          <span style={{fontSize:9,color:'rgba(255,255,255,0.5)',flexShrink:0}}>
            <span style={{color:'rgba(255,255,255,0.75)',fontWeight:700}}>1</span>/6 treinadas
          </span>
          <div style={{flex:1, height:3, borderRadius:2, background:'rgba(255,255,255,0.07)', overflow:'hidden'}}>
            <div style={{height:'100%', width:'16%', borderRadius:2, background:'linear-gradient(90deg,#2B7EF5,#2a9d6a)'}} />
          </div>
        </div>
        {/* Flashcards */}
        <div style={{padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:5}}>
          {cards.map(c => (
            <div key={c.n} style={{
              borderRadius:7, overflow:'hidden',
              background: c.practiced ? 'rgba(42,157,106,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${c.practiced ? 'rgba(42,157,106,0.25)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <div style={{padding:'7px 10px', display:'flex', gap:8, alignItems:'flex-start'}}>
                {/* Badge */}
                <div style={{
                  width:20, height:20, borderRadius:6, flexShrink:0,
                  background: c.practiced ? 'rgba(42,157,106,0.15)' : 'rgba(196,154,32,0.1)',
                  border: `1px solid ${c.practiced ? 'rgba(42,157,106,0.3)' : 'rgba(196,154,32,0.25)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:700, color: c.practiced ? '#2a9d6a' : '#C49A20',
                }}>
                  {c.practiced
                    ? <svg width={10} height={10} viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 4-4" stroke="#2a9d6a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    : c.n
                  }
                </div>
                <p style={{margin:0, fontSize:9.5, fontWeight:600, color: c.practiced ? '#6ee7b7' : 'rgba(255,255,255,0.7)', lineHeight:1.45, flex:1}}>{c.q}</p>
              </div>
              {/* Revealed answer */}
              {c.revealed && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.05)', padding:'6px 10px 6px 38px', background:'rgba(0,0,0,0.15)'}}>
                  <p style={{margin:0, fontSize:8.5, color:'rgba(255,255,255,0.4)', lineHeight:1.5}}>{c.a}</p>
                </div>
              )}
              {/* Actions */}
              {!c.practiced && (
                <div style={{padding:'0 10px 7px 38px', display:'flex', gap:5}}>
                  {!c.revealed && (
                    <div style={{border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,padding:'3px 8px',fontSize:8,color:'rgba(255,255,255,0.4)'}}>Ver resposta sugerida</div>
                  )}
                  <div style={{background:'rgba(42,157,106,0.12)',border:'1px solid rgba(42,157,106,0.25)',borderRadius:5,padding:'3px 8px',fontSize:8,fontWeight:600,color:'#2a9d6a'}}>Marcar como treinada</div>
                </div>
              )}
              {c.practiced && (
                <div style={{padding:'0 10px 7px 38px'}}>
                  <span style={{fontSize:8,color:'rgba(255,255,255,0.2)'}}>Desfazer</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MacWindow>
  )
}

function TourVisualAI() {
  const sections = [
    {label:'Problema', status:'ok', note:'Bem definido com contexto claro.'},
    {label:'Solução', status:'ok', note:'Abordagem técnica bem descrita.'},
    {label:'Funcionalidades', status:'warn', note:'Podes detalhar mais cada feature.'},
    {label:'Resultados', status:'missing', note:'Secção em falta — adiciona impacto.'},
  ]
  function StatusIcon({status}) {
    const c = status==='ok'?'#2a9d6a':status==='warn'?'#C49A20':'#E04848'
    if (status === 'ok') return (
      <svg width={14} height={14} viewBox="0 0 14 14" style={{flexShrink:0,marginTop:1}}>
        <circle cx={7} cy={7} r={6} fill="none" stroke={c} strokeWidth={1.5}/>
        <path d="M4 7l2 2 4-4" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
    if (status === 'warn') return (
      <svg width={14} height={14} viewBox="0 0 14 14" style={{flexShrink:0,marginTop:1}}>
        <path d="M7 2L12.5 11.5H1.5L7 2Z" fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round"/>
        <line x1={7} y1={5.5} x2={7} y2={8.5} stroke={c} strokeWidth={1.5} strokeLinecap="round"/>
        <circle cx={7} cy={10.2} r={0.7} fill={c}/>
      </svg>
    )
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" style={{flexShrink:0,marginTop:1}}>
        <circle cx={7} cy={7} r={6} fill="none" stroke={c} strokeWidth={1.5}/>
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke={c} strokeWidth={1.5} strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <MacWindow title="Análise IA — MonteSado">
      <div style={{padding:'10px 14px'}}>
        <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10}}>
          <span style={{fontSize:9,fontWeight:800,background:'var(--color-primary)',color:'#fff',padding:'3px 7px',borderRadius:3}}>✦ IA</span>
          <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
            <div style={{height:'100%',width:'64%',background:'var(--color-primary)',borderRadius:2}} />
          </div>
          <span style={{fontSize:9,fontWeight:700,color:'var(--color-primary)'}}>64%</span>
        </div>
        {sections.map(s => (
          <div key={s.label} style={{borderTop:'1px solid rgba(255,255,255,0.05)', padding:'7px 0', display:'flex', gap:8, alignItems:'flex-start'}}>
            <StatusIcon status={s.status}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.75)', marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:9, color:'rgba(255,255,255,0.35)', lineHeight:1.4}}>{s.note}</div>
            </div>
          </div>
        ))}
      </div>
    </MacWindow>
  )
}

function TourVisualPreview() {
  const sideIcons = [
    {active:true, path:'M9 2L13 6L5.5 13.5L2 14L2.5 10.5L9 2Z'},
    {active:false, path:'M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8ZM8 5v3l2 2'},
    {active:false, path:'M8 2l1.5 4h4l-3 2.5 1 4-3.5-2.5L4.5 12.5l1-4-3-2.5h4Z'},
    {active:false, path:'M2 3h12M2 7h8M2 11h10'},
    {active:false, path:'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2ZM5 8l2 2 4-4'},
  ]
  const bgOptions = ['Padrão','Midnight','Navy','Ardósia','Papel','Cinza']
  const fontOptions = ['Croogla','Syne','Playfair','Inter']
  return (
    <div style={{display:'flex', flexDirection:'column', gap:6}}>
      {/* Workspace — the actual editor */}
      <MacWindow title="Workspace — Editor de estilo">
        <div style={{display:'flex', height:148}}>
          {/* Left icon sidebar */}
          <div style={{
            width:28, background:'#080808', borderRight:'1px solid rgba(255,255,255,0.06)',
            display:'flex', flexDirection:'column', alignItems:'center', paddingTop:8, gap:7,
          }}>
            {sideIcons.map((ic,i) => (
              <div key={i} style={{
                width:18,height:18,borderRadius:4,flexShrink:0,
                background:ic.active?'rgba(43,126,245,0.18)':'transparent',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <svg width={11} height={11} viewBox="0 0 14 14" fill="none">
                  <path d={ic.path} stroke={ic.active?'#2B7EF5':'rgba(255,255,255,0.25)'} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
          {/* Project view */}
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={{
              height:52, background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, flexShrink:0,
            }}>
              <div style={{fontSize:13,fontWeight:900,color:'rgba(255,255,255,0.85)',letterSpacing:'-0.5px'}}>MONTESADO</div>
              <div style={{fontSize:7.5,color:'rgba(255,255,255,0.3)'}}>Bruno Silva · Turismo</div>
            </div>
            <div style={{padding:'7px 9px', display:'flex', flexDirection:'column', gap:3}}>
              {[85,70,90,62].map((w,i) => (
                <div key={i} style={{height:3,width:`${w}%`,borderRadius:1,background:'rgba(255,255,255,0.07)'}} />
              ))}
            </div>
          </div>
          {/* Right style panel */}
          <div style={{
            width:98, background:'#141414', borderLeft:'1px solid rgba(255,255,255,0.06)',
            display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0,
          }}>
            {/* Panel tabs */}
            <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0}}>
              {['Estilo','Blocos','IA'].map((t,i) => (
                <div key={t} style={{
                  flex:1, padding:'4px 0', textAlign:'center', fontSize:7, fontWeight:700,
                  color:i===0?'#2B7EF5':'rgba(255,255,255,0.28)',
                  borderBottom:i===0?'1.5px solid #2B7EF5':'1.5px solid transparent',
                }}>{t}</div>
              ))}
            </div>
            <div style={{padding:'5px 7px', overflowY:'hidden', display:'flex', flexDirection:'column', gap:5}}>
              {/* Color swatches */}
              <div>
                <div style={{fontSize:6.5,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Cor de destaque</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:2}}>
                  {['#E8A020','#9333ea','#ec4899','#16a34a','#2B7EF5','#E04848','#06b6d4','#f59e0b'].map((c,i) => (
                    <div key={i} style={{height:9,borderRadius:2,background:c,outline:i===4?'1.5px solid #fff':'none',outlineOffset:1}} />
                  ))}
                </div>
              </div>
              {/* Background */}
              <div>
                <div style={{fontSize:6.5,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Fundo</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
                  {bgOptions.map((l,i) => (
                    <div key={l} style={{
                      background:['#0e0e0e','#0d1424','#0a1220','#1e2530','#f5f0e8','#2a2a2a'][i],
                      border:i===3?'1px solid rgba(43,126,245,0.6)':'1px solid rgba(255,255,255,0.08)',
                      borderRadius:2, padding:'2px 1px', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <div style={{fontSize:5.5,color:i>=4?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.4)',textAlign:'center'}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Typography */}
              <div>
                <div style={{fontSize:6.5,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Tipografia</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:2}}>
                  {fontOptions.map((f,i) => (
                    <div key={f} style={{
                      background:i===0?'rgba(43,126,245,0.12)':'rgba(255,255,255,0.04)',
                      border:i===0?'1px solid rgba(43,126,245,0.35)':'1px solid rgba(255,255,255,0.07)',
                      borderRadius:2, padding:'2px 4px', fontSize:6.5, color:i===0?'#2B7EF5':'rgba(255,255,255,0.35)', textAlign:'center',
                    }}>{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MacWindow>
      {/* Public view */}
      <MacWindow title="showo.pt/p/montesado — Vista pública">
        <div style={{padding:'9px 12px', display:'flex', flexDirection:'column', gap:5}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{height:8, width:75, borderRadius:2, background:'rgba(255,255,255,0.6)', marginBottom:4}} />
              <div style={{height:4, width:42, borderRadius:1, background:'rgba(255,255,255,0.18)'}} />
            </div>
            <svg width={32} height={32}>
              <circle cx={16} cy={16} r={12} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3}/>
              <circle cx={16} cy={16} r={12} fill="none" stroke="#2a9d6a" strokeWidth={3}
                strokeDasharray={`${0.88*2*Math.PI*12} ${2*Math.PI*12}`} strokeLinecap="round"
                style={{transform:'rotate(-90deg)',transformOrigin:'16px 16px'}}
              />
              <text x={16} y={20} textAnchor="middle" fontSize={8} fontWeight={700} fill="#2a9d6a">88</text>
            </svg>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:3}}>
            {[88,70,92,60].map((w,i) => (
              <div key={i} style={{height:3, width:`${w}%`, borderRadius:1, background:'rgba(255,255,255,0.07)'}} />
            ))}
          </div>
        </div>
      </MacWindow>
    </div>
  )
}

function TourVisualCoach() {
  return (
    <MacWindow title="Assistente IA">
      <div style={{padding:'10px 12px', display:'flex', flexDirection:'column', gap:5}}>
        <div style={{display:'flex', gap:6, alignItems:'flex-start'}}>
          <div style={{
            flexShrink:0, width:18, height:18, borderRadius:'50%',
            background:'var(--color-primary)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:8, color:'#fff', fontWeight:800,
          }}>✦</div>
          <div style={{
            background:'rgba(255,255,255,0.05)', borderRadius:'0 7px 7px 7px',
            padding:'5px 8px', fontSize:10, color:'rgba(255,255,255,0.7)', lineHeight:1.4,
          }}>Como posso ajudar-te com o projeto hoje?</div>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end'}}>
          <div style={{
            background:'var(--color-primary)', borderRadius:'7px 0 7px 7px',
            padding:'5px 8px', fontSize:10, color:'#fff', lineHeight:1.4, maxWidth:'80%',
          }}>Como melhoro a minha secção de Problema?</div>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'flex-start'}}>
          <div style={{width:18,height:18,flexShrink:0}} />
          <div style={{
            background:'rgba(255,255,255,0.05)', borderRadius:'0 7px 7px 7px',
            padding:'5px 8px', fontSize:10, color:'rgba(255,255,255,0.5)', lineHeight:1.4,
          }}>Tenta incluir dados concretos e citar fontes...</div>
        </div>
      </div>
    </MacWindow>
  )
}

function TourVisualMissions() {
  const pending = [
    { label:'Score 60+', desc:'Alcança um score de 60 num projeto', xp:25, color:'#2a9d6a', prog:{cur:42,max:60},
      icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={16}/><line x1={8} y1={12} x2={16} y2={12}/></svg> },
    { label:'Portfólio', desc:'Cria 3 projetos diferentes', xp:30, color:'#2B7EF5', prog:null,
      icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
    { label:'Partilhado', desc:'Partilha o link do teu projeto', xp:10, color:'#06b6d4', prog:null,
      icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={2} y1={12} x2={22} y2={12}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  ]
  const done = [
    { label:'Primeiro projeto', xp:20 },
    { label:'Perfil completo', xp:15 },
  ]
  const earnedXP = done.reduce((s,m)=>s+m.xp,0)
  const totalXP = [...pending,...done].reduce((s,m)=>s+m.xp,0)
  const pct = Math.round(earnedXP/totalXP*100)
  return (
    <MacWindow title="Missões">
      <div style={{padding:'10px 12px', display:'flex', flexDirection:'column', gap:8}}>
        {/* XP progress card */}
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:'8px 10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <div>
              <div style={{fontSize:8,color:'rgba(255,255,255,0.4)',fontWeight:600,marginBottom:2}}>XP Total</div>
              <div style={{fontSize:14,fontWeight:900,color:'var(--color-primary)',letterSpacing:'-0.5px'}}>
                {earnedXP}<span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:500}}>/{totalXP}</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:8,color:'rgba(255,255,255,0.4)',fontWeight:600,marginBottom:2}}>Completas</div>
              <div style={{fontSize:14,fontWeight:900,color:'#2a9d6a',letterSpacing:'-0.5px'}}>
                {done.length}<span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:500}}>/{pending.length+done.length}</span>
              </div>
            </div>
          </div>
          <div style={{height:3,background:'rgba(255,255,255,0.07)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:'var(--color-primary)',borderRadius:99}} />
          </div>
        </div>
        {/* Pending */}
        <div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Por completar · {pending.length}</div>
        {pending.map((m,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:7}}>
            <div style={{width:26,height:26,borderRadius:6,flexShrink:0,background:`${m.color}18`,border:`1px solid ${m.color}30`,display:'flex',alignItems:'center',justifyContent:'center',color:m.color}}>{m.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.8)',marginBottom:1}}>{m.label}</div>
              <div style={{fontSize:8,color:'rgba(255,255,255,0.35)',lineHeight:1.3,marginBottom:m.prog?4:0}}>{m.desc}</div>
              {m.prog && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:7,color:'rgba(255,255,255,0.3)',fontWeight:600}}>{m.prog.cur}/{m.prog.max}</span>
                    <span style={{fontSize:7,color:m.color,fontWeight:700}}>{Math.round(m.prog.cur/m.prog.max*100)}%</span>
                  </div>
                  <div style={{height:2,background:`${m.color}20`,borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round(m.prog.cur/m.prog.max*100)}%`,background:m.color,borderRadius:99}} />
                  </div>
                </div>
              )}
            </div>
            <div style={{fontSize:10,fontWeight:800,color:m.color,flexShrink:0}}>+{m.xp}</div>
          </div>
        ))}
        {/* Done */}
        <div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Concluídas · {done.length}</div>
        {done.map((m,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:7,opacity:0.5}}>
            <div style={{width:26,height:26,borderRadius:6,flexShrink:0,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.3)',textDecoration:'line-through'}}>{m.label}</span>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.25)',flexShrink:0}}>+{m.xp}</div>
          </div>
        ))}
      </div>
    </MacWindow>
  )
}

function TourVisualInvite() {
  const members = [
    {name:'Bruno Silva', initial:'B', color:'#2B7EF5', role:'Autor'},
    {name:'Ana Costa', initial:'A', color:'#C49A20', role:'Colaborador'},
    {name:'Carlos M.', initial:'C', color:'#E04848', role:'Colaborador'},
  ]
  return (
    <MacWindow title="Colaboradores — MonteSado">
      <div style={{padding:'12px 14px', display:'flex', flexDirection:'column', gap:8}}>
        {members.map((m,i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{
              width:32, height:32, borderRadius:'50%', background:m.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color:'#fff', flexShrink:0,
            }}>{m.initial}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)'}}>{m.name}</div>
              <div style={{fontSize:9, color:'rgba(255,255,255,0.3)'}}>{m.role}</div>
            </div>
            {i === 0 && <div style={{fontSize:9,fontWeight:700,color:'#2a9d6a',background:'rgba(42,157,106,0.12)',padding:'2px 7px',borderRadius:3}}>Tu</div>}
          </div>
        ))}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:8, display:'flex', alignItems:'center', gap:8}}>
          <div style={{
            width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.05)',
            border:'1.5px dashed rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, color:'rgba(255,255,255,0.25)', flexShrink:0,
          }}>+</div>
          <div style={{fontSize:10, color:'rgba(255,255,255,0.3)'}}>Convidar colega por email...</div>
        </div>
      </div>
    </MacWindow>
  )
}

function TourVisualEdit() {
  const fields = [
    { label: 'Nome', value: 'Gestão de Horários', w: '82%' },
    { label: 'Área', value: 'Programação e Informática', w: '100%' },
    { label: 'Objetivo', value: 'Automatizar a gestão de horários...', w: '90%' },
  ]
  return (
    <MacWindow title="Editar projeto">
      <div style={{padding:'10px 14px', display:'flex', flexDirection:'column', gap:8}}>
        {fields.map(f => (
          <div key={f.label}>
            <div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{f.label}</div>
            <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'6px 9px',fontSize:10,color:'rgba(255,255,255,0.65)',width:f.w}}>
              {f.value}
            </div>
          </div>
        ))}
        <div style={{marginTop:2,display:'flex',justifyContent:'flex-end'}}>
          <div style={{background:'var(--color-primary)',borderRadius:6,padding:'5px 12px',fontSize:10,fontWeight:700,color:'#fff'}}>Guardar</div>
        </div>
      </div>
    </MacWindow>
  )
}

function TourVisualDiary() {
  const entries = [
    { date: 'Hoje', text: 'Finalizei o módulo de exportação PDF. Falta testar em mobile.', tag: 'Progresso' },
    { date: 'Ontem', text: 'Reunião com o orientador — feedback positivo na estrutura.', tag: 'Reunião' },
    { date: 'Seg', text: 'Problema com a biblioteca de charts. Mudei para Recharts.', tag: 'Bloqueio' },
  ]
  const tagColor = { Progresso: '#2a9d6a', Reunião: '#2B7EF5', Bloqueio: '#E04848' }
  return (
    <MacWindow title="Diário do projeto">
      <div style={{padding:'10px 12px', display:'flex', flexDirection:'column', gap:6}}>
        {entries.map((e, i) => (
          <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:7,padding:'7px 9px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:8,color:'rgba(255,255,255,0.3)',fontWeight:600}}>{e.date}</span>
              <span style={{fontSize:7,fontWeight:700,color:tagColor[e.tag],background:`${tagColor[e.tag]}18`,padding:'2px 6px',borderRadius:3}}>{e.tag}</span>
            </div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.6)',lineHeight:1.45}}>{e.text}</div>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:7,cursor:'pointer'}}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>
          <span style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>Nova entrada…</span>
        </div>
      </div>
    </MacWindow>
  )
}

const TOUR_STEPS_PAP = [
  {
    target: 'score',
    title: 'O teu Score',
    visual: <TourVisualScore />,
    bullets: [
      'Gerado pela IA com base no que preencheste',
      'Serve para te orientar, não é uma nota',
    ],
  },
  {
    target: 'edit',
    title: 'Editar projeto',
    visual: <TourVisualEdit />,
    bullets: [
      'Atualiza o nome, área, descrição e todas as secções',
      'As alterações refletem-se imediatamente na página pública',
    ],
  },
  {
    target: 'diary',
    title: 'Diário do projeto',
    visual: <TourVisualDiary />,
    bullets: [
      'Regista o teu progresso, bloqueios e decisões ao longo do tempo',
      'As entradas contribuem para o score do projeto',
    ],
  },
  {
    target: 'defense',
    title: 'Modo Defesa',
    visual: <TourVisualDefense />,
    bullets: [
      'A IA simula a banca com perguntas reais sobre o teu projeto',
      'Quanto mais treinares, mais confiante chegas à apresentação',
    ],
  },
  {
    target: 'ai',
    title: 'Análise IA',
    visual: <TourVisualAI />,
    bullets: [
      'Revisão completa de cada secção com feedback concreto',
      'Aponta o que falta e o que podes melhorar antes de entregar',
    ],
  },
  {
    target: 'preview',
    title: 'Modo Preview',
    visual: <TourVisualPreview />,
    bullets: [
      'Alterna entre a tua vista de edição e o que o público vê',
    ],
  },
  {
    target: 'coach',
    title: 'Assistente IA',
    visual: <TourVisualCoach />,
    bullets: [
      'Conhece o teu projeto e ajuda a melhorar qualquer secção',
    ],
  },
  {
    target: 'missions',
    title: 'Missões',
    visual: <TourVisualMissions />,
    bullets: [
      'Tarefas geradas automaticamente para subires o score',
    ],
  },
  {
    target: 'invite',
    title: 'Convidar colegas',
    visual: <TourVisualInvite />,
    bullets: [
      'Cada colaborador regista o seu trabalho separadamente',
    ],
  },
]
const TOUR_STEPS_OTHER = TOUR_STEPS_PAP.filter(s => s.target !== 'defense')

// Mobile tour — simpler flow that matches the mobile UI layout
const TOUR_STEPS_MOBILE_PAP = [
  {
    target: 'score',
    title: 'O teu Score',
    bullets: [
      'Gerado pela IA com base no que preencheste',
      'Serve para te orientar, não é uma nota',
    ],
  },
  {
    target: 'edit',
    title: 'Editar projeto',
    bullets: [
      'Atualiza o nome, área, descrição e todas as secções do projeto',
    ],
  },
  {
    target: 'diary',
    title: 'Diário do projeto',
    bullets: [
      'Regista o teu progresso, bloqueios e decisões ao longo do tempo',
    ],
  },
  {
    target: 'missions',
    title: 'Missões',
    bullets: [
      'Tarefas geradas automaticamente para subires o score',
      'Toca no tab Missões para as ver todas',
    ],
  },
  {
    target: 'coach',
    title: 'Assistente IA',
    bullets: [
      'Toca neste botão para abrir o chat com o teu assistente',
      'Conhece o teu projeto e ajuda a melhorar qualquer secção',
    ],
  },
  {
    target: 'preview',
    title: 'Menu do projeto',
    bullets: [
      'Toca aqui para aceder a: Editar, Diário, Modo Defesa, Análise IA, Preview e Convidar colegas',
    ],
  },
]
// Projeto pessoal/de escola não tem Modo Defesa (é só para Projeto Final/
// PAP, gerido no menu por project_type === 'pap') — o passo do menu tinha
// exatamente o mesmo texto do PAP, a mencionar uma funcionalidade que
// estes projetos nem mostram.
const TOUR_STEPS_MOBILE_OTHER = TOUR_STEPS_MOBILE_PAP.map(s =>
  s.target === 'preview'
    ? { ...s, bullets: ['Toca aqui para aceder a: Editar, Diário, Análise IA, Preview e Convidar colegas'] }
    : s
)

function ProjectTour({ isPap, onClose, onStep }) {
  const isMobileSteps = window.innerWidth < 640
  const steps = isMobileSteps
    ? (isPap ? TOUR_STEPS_MOBILE_PAP : TOUR_STEPS_MOBILE_OTHER)
    : (isPap ? TOUR_STEPS_PAP : TOUR_STEPS_OTHER)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const skipRef = useRef(false)

  // Junta dois retângulos no menor que envolve os dois — usado para o
  // destaque do passo "preview" cobrir o botão E o menu aberto por baixo
  // dele, não só o botão sozinho com o menu a espreitar por fora da luz.
  function unionRect(a, b) {
    if (!a) return b
    if (!b) return a
    const left = Math.min(a.left, b.left)
    const top = Math.min(a.top, b.top)
    const right = Math.max(a.right, b.right)
    const bottom = Math.max(a.bottom, b.bottom)
    return { left, top, right, bottom, width: right - left, height: bottom - top }
  }

  function measureStep(idx, stepsArr) {
    const step = stepsArr[idx]
    const isMob = window.innerWidth < 640
    // On mobile, defense/ai/invite all fall back to the paintbrush button (data-tour="preview")
    const mobileAliasToPaintbrush = ['defense', 'ai', 'invite']
    const targets = isMob && mobileAliasToPaintbrush.includes(step.target)
      ? ['preview']
      : [step.target]
    for (const t of targets) {
      const els = document.querySelectorAll(`[data-tour="${t}"]`)
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 || r.height > 0) {
          if (t !== 'preview' || !isMob) return r
          // "Gerir projeto" — o menu que este passo descreve fica aberto
          // por baixo do botão (ver forceMenuOpen, só no telemóvel); o
          // destaque tem de abranger o menu inteiro, não só o botão que
          // o abre. No desktop "preview" é outro botão, sem menu nenhum.
          const menuEl = document.querySelector('.mob-proj-menu')
          const menuRect = menuEl?.getBoundingClientRect()
          return menuRect && (menuRect.width > 0 || menuRect.height > 0) ? unionRect(r, menuRect) : r
        }
      }
    }
    return null
  }

  function advanceToVisible(fromIdx) {
    for (let i = fromIdx; i < steps.length; i++) {
      const r = measureStep(i, steps)
      if (r) return { idx: i, rect: r }
    }
    return null
  }

  function resolveEl(target) {
    const isMob = window.innerWidth < 640
    const alias = ['defense', 'ai', 'invite']
    const targets = isMob && alias.includes(target) ? ['preview'] : [target]
    for (const t of targets) {
      const els = document.querySelectorAll(`[data-tour="${t}"]`)
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 || r.height > 0) return el
      }
    }
    return null
  }

  useEffect(() => {
    skipRef.current = false
    onStep?.(steps[stepIdx].target)
    const el = resolveEl(steps[stepIdx].target)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })

    let raf1, raf2, remeasureTimer
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (skipRef.current) return
        const found = advanceToVisible(stepIdx)
        if (!found) { onClose(); return }
        if (found.idx !== stepIdx) { setStepIdx(found.idx); return }
        setRect(found.rect)
      })
    })
    // O passo "preview" abre o menu real (forceMenuOpen) — isso atravessa
    // Context + outro componente (Navbar), pode não estar montado ainda
    // aos 2 frames daqui. Remede um pouco depois, só para apanhar o menu
    // já aberto e alargar o destaque a ele.
    if (steps[stepIdx].target === 'preview') {
      remeasureTimer = setTimeout(() => {
        if (skipRef.current) return
        const r = measureStep(stepIdx, steps)
        if (r) setRect(r)
      }, 150)
    }
    return () => { skipRef.current = true; cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(remeasureTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  useEffect(() => {
    function onResize() {
      const el = resolveEl(steps[stepIdx].target)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 || r.height > 0) setRect(r)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [stepIdx, steps])

  const step = steps[stepIdx]
  const PAD = 10
  const spotlight = rect ? {
    left: rect.left - PAD, top: rect.top - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  } : null

  function tooltipPos() {
    if (!rect) return { left: -999, top: -999 }
    const TW = 320, TH = 540, P = 16
    const vw = window.innerWidth, vh = window.innerHeight
    const cy = rect.top + rect.height / 2
    const centeredTop = Math.max(P, Math.min(cy - TH / 2, vh - TH - P))
    const cx = Math.max(P, Math.min(rect.left + rect.width / 2 - TW / 2, vw - TW - P))
    const aboveTop = rect.top - 20 - TH

    // Elements in the bottom 40%: always go above
    if (rect.top > vh * 0.6 && aboveTop >= P) return { left: cx, top: aboveTop }
    if (rect.right + P + TW <= vw) return { left: rect.right + P, top: centeredTop }
    if (rect.left - P - TW >= 0) return { left: rect.left - P - TW, top: centeredTop }
    if (aboveTop >= P) return { left: cx, top: aboveTop }
    return { left: cx, top: Math.max(P, vh - TH - P) }
  }

  const tp = tooltipPos()
  const isLast = stepIdx === steps.length - 1
  const isMobile = window.innerWidth < 640
  const mobileSheetAtBottom = rect ? (rect.top + rect.height / 2) < window.innerHeight / 2 : true

  const tooltipContent = (
    <>
      <span style={{ fontSize: isMobile ? 13 : 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
        {stepIdx + 1} / {steps.length}
      </span>
      <p style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: isMobile ? 20 : 15, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
        {step.title}
      </p>
      {step.visual && !isMobile && (
        <div style={{ borderRadius: 10, overflow: 'hidden' }}>
          {step.visual}
        </div>
      )}
      <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 5 }}>
        {step.bullets.map((b, i) => (
          <li key={i} style={{ fontSize: isMobile ? 16 : 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>{b}</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
        {steps.map((_, i) => (
          <span key={i} style={{
            width: i === stepIdx ? 18 : 6, height: 6, borderRadius: 3,
            background: i === stepIdx ? 'var(--color-primary)' : 'var(--color-border)',
            transition: 'width 0.2s, background 0.2s',
            flexShrink: 0,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        {/* No mobile, "Saltar tour" precisa de se notar — antes era texto
            cinzento quase invisível ao lado de um botão gradiente que
            dominava tudo; agora tem contorno e peso próprios. */}
        <button onClick={onClose} style={isMobile ? {
          background: 'none', border: '1.5px solid var(--color-border)', borderRadius: 8,
          padding: '8px 14px', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'inherit',
        } : {
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'inherit',
        }}>
          Saltar tour
        </button>
        <button
          onClick={() => isLast ? onClose() : setStepIdx(i => i + 1)}
          aria-label={isLast ? 'Começar' : 'Próximo'}
          style={{
            backgroundImage: 'var(--brand-gradient)', border: 'none',
            borderRadius: isLast ? 8 : 12,
            width: isLast ? 'auto' : 42, height: isLast ? 'auto' : 42,
            padding: isLast ? '9px 18px' : 0, flexShrink: 0, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {isLast ? 'Começar' : <TourNextArrow size={19} strokeWidth={2.5} />}
        </button>
      </div>
    </>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, pointerEvents: 'none' }}>
      {spotlight && (
        <div style={{
          position: 'fixed',
          left: spotlight.left, top: spotlight.top,
          width: spotlight.width, height: spotlight.height,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px color-mix(in srgb, var(--color-bg) 87%, transparent)',
          outline: '2.5px solid var(--color-primary)',
          outlineOffset: 1,
          transition: 'left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease',
          pointerEvents: 'none',
          zIndex: 9101,
        }} />
      )}
      {rect && (
        isMobile ? (
          mobileSheetAtBottom ? (
            /* target in top half → sheet at bottom */
            <div style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              borderRadius: '16px 16px 0 0',
              padding: `20px 20px calc(20px + env(safe-area-inset-bottom, 0px))`,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: 10,
              zIndex: 9102, pointerEvents: 'all',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto' }} />
              {tooltipContent}
            </div>
          ) : (
            /* target in bottom half → sheet at top */
            <div style={{
              position: 'fixed', left: 0, right: 0, top: 0,
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              borderRadius: '0 0 16px 16px',
              padding: `calc(env(safe-area-inset-top, 0px) + 16px) 20px 20px`,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: 10,
              zIndex: 9102, pointerEvents: 'all',
            }}>
              {tooltipContent}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto' }} />
            </div>
          )
        ) : (
          /* ── Desktop: floating tooltip ── */
          <div style={{
            position: 'fixed',
            left: tp.left, top: tp.top,
            width: 320,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '20px 20px 16px',
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 10,
            zIndex: 9102,
            pointerEvents: 'all',
          }}>
            {tooltipContent}
          </div>
        )
      )}
    </div>,
    document.body
  )
}

export default function ProjectPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, loading: authLoading, checkGate, consumeAI } = useAuth()
  const [project, setProject] = useState(() => location.state?.projectData ?? null)
  const [projectJournalEntries, setProjectJournalEntries] = useState([])
  const [loading, setLoading] = useState(!location.state?.projectData)
  const [copied, setCopied] = useState(false)
  const [score, setScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [contentTargetField, setContentTargetField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const [showConfetti, setShowConfetti] = useState(false)
  const [defenseMode, setDefenseMode] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [collaboratorSections, setCollaboratorSections] = useState(null) // null = not a collaborator
  const [members, setMembers] = useState([]) // [{ user_id, status, sections, profiles }]
  // A professor only gets evaluation tools on projects submitted by a student
  // in one of their own turmas — everywhere else they see the same public
  // preview a visitor would. Defaults to false (not yet confirmed) so there's
  // no flash of professor-only UI before the check resolves.
  const [isMyClassProject, setIsMyClassProject] = useState(false)
  useEffect(() => {
    if (!project?.id || profile?.role !== 'professor') { setIsMyClassProject(false); return }
    let cancelled = false
    supabase.rpc('is_project_in_my_class', { p_project_id: project.id }).then(({ data, error }) => {
      if (cancelled) return
      if (error) console.error('is_project_in_my_class failed:', error)
      setIsMyClassProject(!!data)
    })
    return () => { cancelled = true }
  }, [project?.id, profile?.role])
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [analyzeGateMsg, setAnalyzeGateMsg] = useState(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [completudeOpen, setCompletudeOpen] = useState(true)
  const [tipsOpen, setTipsOpen] = useState(true)
  const [viewsExpanded, setViewsExpanded] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  // "Como subir o score" e "Missões" começam fechados no mobile — logo
  // após o scroll para a tab Melhorar já vinha muita informação de uma vez.
  const [scoreOpen, setScoreOpen] = useState(false)
  const [missionsOpenMobile, setMissionsOpenMobile] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null) // { type: 'success'|'error', text }
  const [inviteSearchResults, setInviteSearchResults] = useState([])
  const [inviteSelectedUser, setInviteSelectedUser] = useState(null)
  const [inviteShowDropdown, setInviteShowDropdown] = useState(false)
  const inviteSearchTimerRef = useRef(null)
  const [milestoneCard, setMilestoneCard] = useState(null) // { score, tier }
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(() => !!location.state?.newProject)
  const [launchCopied, setLaunchCopied] = useState(false)
  const [showTour, setShowTour] = useState(false)
  // Passo final do tour mobile ("Menu do projeto") aponta para o pincel
  // mas o menu real ficava fechado, escondido atrás do overlay escuro do
  // tour — o utilizador via só um botão a piscar, não o menu que estava a
  // ser descrito. Isto força o menu a abrir a sério nesse passo.
  const [tourMenuOpen, setTourMenuOpen] = useState(false)
  const tourPendingRef = useRef(false)
  const [claimBannerDismissed, setClaimBannerDismissed] = useState(false)
  const [defenseDate, setDefenseDate] = useState('')
  const [savingDefense, setSavingDefense] = useState(false)
  const [teacherFeedback, setTeacherFeedback] = useState([])
  const [showFeedbackForm, setShowFeedbackForm] = useState(true)
  const [fbComment, setFbComment] = useState('')
  const [fbFieldKey, setFbFieldKey] = useState('geral')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbError, setFbError] = useState('')
  const [fbEditing, setFbEditing] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [showDefensePopup, setShowDefensePopup] = useState(false)
  // Sem isto, a página por trás continua a dar scroll com o popup aberto,
  // e no telemóvel isso arrasta o popup com ela (não fica fixo ao ecrã a
  // sério) — o mesmo problema já corrigido no chat da IA e no Modo Defesa.
  useEffect(() => {
    if (!showDefensePopup) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [showDefensePopup])

  const { setExtras } = useSidebar()
  const { theme } = useTheme()
  const [showRegisterPopup, setShowRegisterPopup] = useState(false)
  const [registerPopupConfirm, setRegisterPopupConfirm] = useState(false)
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [anonEditCount, setAnonEditCount] = useState(0)
  /* ── Separadores mobile ──
     Eram cinco: Projeto, Melhorar, História, Explorar, Missões. Três deles
     queriam dizer a mesma coisa ("lê o conteúdo do projeto") e um aluno tinha
     de conhecer a nossa arquitetura de informação para adivinhar onde estava
     o que procurava. Passam a três grupos com uma pergunta cada:
        projeto  → o que este projeto é
        melhorar → o que falta fazer (score, missões, IA)
        partilha → mostrar a alguém (link, QR, autor, nota do professor)
     Os blocos ficaram exatamente onde estavam; só mudou quem os agrupa. */
  const [mobileTab, setMobileTab] = useState('projeto')
  // Chat da IA (mobile): o teclado a abrir não redimensiona o viewport de
  // layout em todos os browsers — um overlay com `inset: 0` fica então
  // por baixo do teclado, com o input escondido. A visualViewport API dá
  // a altura visível a sério, e é isso que usamos para o overlay, em vez
  // de depender só de 100dvh.
  const [iaViewportH, setIaViewportH] = useState(null)
  useEffect(() => {
    if (mobileTab !== 'ia' || typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => setIaViewportH(vv.height)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [mobileTab])
  const MOBILE_TAB_GROUP = {
    historia: 'projeto', explorar: 'projeto',
    melhorar: 'melhorar', missoes: 'melhorar',
    overview: 'partilha',
  }
  const tabActive = (id) => MOBILE_TAB_GROUP[id] === mobileTab
  const [coachMessages, setCoachMessages] = useState([])
  const [coachAllMessages, setCoachAllMessages] = useState([])
  const [coachSessionId, setCoachSessionId] = useState(null)
  const [coachInput, setCoachInput] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [coachSessionsOpen, setCoachSessionsOpen] = useState(false)
  const coachBottomRef = useRef(null)

  const coachSessions = useMemo(() => {
    if (!coachAllMessages.length) return []
    const map = new Map()
    for (const m of coachAllMessages) {
      const sid = m.session_id || 'default'
      if (!map.has(sid)) map.set(sid, [])
      map.get(sid).push(m)
    }
    return Array.from(map.entries()).map(([sid, msgs]) => ({ id: sid, messages: msgs }))
  }, [coachAllMessages])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generatingNarrative, setGeneratingNarrative] = useState(false)
  const [narrativePreview, setNarrativePreview]       = useState(null)
  const [narrativeError, setNarrativeError]           = useState('')
  const [narrativeSaved, setNarrativeSaved]           = useState(false)
  const [confirmNarrativeUse, setConfirmNarrativeUse] = useState(null)
  // ?workspace=1 abre o editor visual (Estilo/Blocos/Secções) direto, sem
  // passar pelo "Preview visitante" — é o link usado pela secção "Aparência"
  // do /editar/:slug, para o editor visual deixar de só ser alcançável a
  // partir do preview (onde ninguém o ia procurar).
  const openWorkspaceOnLoad = new URLSearchParams(window.location.search).get('workspace') === '1'
  const [viewAsPublic, setViewAsPublic] = useState(openWorkspaceOnLoad)
  const [previewEditing, setPreviewEditing] = useState(openWorkspaceOnLoad)
  const [wsExpanded, setWsExpanded] = useState(openWorkspaceOnLoad)
  const [previewBlocks, setPreviewBlocks] = useState([])
  const [previewStyle, setPreviewStyle] = useState({})
  // Guardar o workspace a partir do botão da navbar (mobile) — substitui o
  // pincel lá em cima, que só abria/fechava o painel; isso já é feito pela
  // barra de tabs fixa no fundo, o pincel deixou de ser preciso para isso.
  const [wsSaving, setWsSaving] = useState(false)
  const [wsSaved, setWsSaved] = useState(false)
  const [wsSaveError, setWsSaveError] = useState(false)
  async function handleSaveWorkspace() {
    if (!project?.id || wsSaving) return
    setWsSaving(true)
    const { error } = await supabase.from('projects')
      .update({ preview_blocks: previewBlocks, preview_style: previewStyle })
      .eq('id', project.id)
    setWsSaving(false)
    if (!error) { setWsSaved(true); setTimeout(() => setWsSaved(false), 2000) }
    else { setWsSaveError(true); setTimeout(() => setWsSaveError(false), 4000) }
  }
  // Partilhado entre o "Sair" da PublicView e o botão de voltar da navbar
  // mobile — sem isto, entrar em preview a partir do pincel (que troca o
  // ícone para só abrir/fechar o painel) deixava o dono sem nenhuma forma
  // de voltar ao editar o projeto.
  function exitPreview() {
    if (!user && isAnonCreator && anonEditCount >= 3) {
      setShowRegisterPopup(true)
      return
    }
    if (openWorkspaceOnLoad) { navigate(`/editar/${project.slug}`); return }
    setViewAsPublic(false); setPreviewEditing(false); setContentTargetField(null)
  }
  // Entrar no preview (ex: a partir de uma missão) não navega para uma
  // página nova, é só um estado local — sem isto, "voltar" no telemóvel/
  // browser saltava o preview por completo e ia parar à página anterior
  // (ex: Dashboard), em vez de primeiro sair do preview e voltar ao
  // projeto normal. Empurra uma entrada de histórico "vazia" (mesmo URL)
  // enquanto o preview está aberto, para o browser ter algo para desfazer.
  useEffect(() => {
    if (!viewAsPublic) return
    window.history.pushState({ projectPreviewGuard: true }, '')
    const onPopState = () => {
      if (!user && isAnonCreator && anonEditCount >= 3) {
        setShowRegisterPopup(true)
        window.history.pushState({ projectPreviewGuard: true }, '')
        return
      }
      if (openWorkspaceOnLoad) { navigate(`/editar/${project.slug}`); return }
      setViewAsPublic(false); setPreviewEditing(false); setContentTargetField(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [viewAsPublic])
  const [previewDevice, setPreviewDevice] = useState('desktop')
  // Professor grade state (0-20, sum of 5 criteria x 0-4) — lives on the project itself
  // (project.teacher_score / _note / _ratings), not in teacher_feedback.
  const [juryRatings, setJuryRatings] = useState({})        // { criteriaId: 0-4 }
  const [juryNote, setJuryNote] = useState('')
  const [jurySaving, setJurySaving] = useState(false)
  const [jurySaved, setJurySaved] = useState(false)
  const [juryError, setJuryError] = useState('')
  const [juryEditing, setJuryEditing] = useState(false)
  // Hydrate from the saved grade once the project loads, and default to the
  // collapsed summary if a grade already exists, or straight to the form if not.
  const juryHydrated = useRef(false)
  useEffect(() => {
    if (juryHydrated.current || !project) return
    // teacher_score* já não vem no fetch inicial do projeto (ver
    // AUTH_PROJECT_COLUMNS) — só chega a seguir, via get_project_grades,
    // que o servidor só responde a dono/professor/admin. Espera por isso
    // chegar antes de hidratar, senão isto corria cedo de mais com
    // undefined e nunca mais corria (o ref já ficava marcado).
    if (project.teacher_score === undefined) return
    if (project.teacher_score_ratings) setJuryRatings(project.teacher_score_ratings)
    if (project.teacher_score_note) setJuryNote(project.teacher_score_note)
    setJuryEditing(project.teacher_score == null)
    juryHydrated.current = true
  }, [project])

  // Spotlight tour: only on ?tour=1 (dev) or when the user just created their very first project
  const tourCheckedRef = useRef(false)
  useEffect(() => {
    if (!project?.id || !profile?.id) return
    if (tourCheckedRef.current) return
    tourCheckedRef.current = true
    if (profile.id !== project.user_id) return

    const params = new URLSearchParams(window.location.search)
    const isTourParam = params.get('tour') === '1'
    const isNewProject = !!location.state?.newProject

    function triggerTour() {
      if (showLaunchOverlay) tourPendingRef.current = true
      else setShowTour(true)
    }

    if (isTourParam) { triggerTour(); return }
    if (!isNewProject) return

    // Only show for their very first project
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .then(({ count }) => { if (count === 1) triggerTour() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, profile?.id])

  // Class-defined evaluation criteria (fetched when the page is opened from a turma)
  const [classCriteria, setClassCriteria] = useState([])   // [{id, name, weight}]
  const [criterionScores, setCriterionScores] = useState({}) // {criterionId: 0-20}
  useEffect(() => {
    const turmaId = location.state?.turmaId
    if (!turmaId || !project?.id) return
    let cancelled = false
    async function fetchClassCriteria() {
      const [{ data: crit }, { data: existingScores }] = await Promise.all([
        supabase.from('class_evaluation_criteria').select('id, name, weight').eq('class_id', turmaId).order('sort_order'),
        supabase.from('project_criterion_scores').select('criterion_id, score').eq('project_id', project.id),
      ])
      if (cancelled) return
      if (crit?.length) {
        setClassCriteria(crit)
        const map = {}
        if (existingScores) existingScores.forEach(s => { map[s.criterion_id] = s.score })
        setCriterionScores(map)
        if (existingScores?.length === crit.length) setJuryEditing(false)
      }
    }
    fetchClassCriteria()
    return () => { cancelled = true }
  }, [location.state?.turmaId, project?.id])

  // Grade history — fetched lazily when the professor/owner opens it
  const [scoreHistory, setScoreHistory] = useState(null)
  const [showScoreHistory, setShowScoreHistory] = useState(false)
  async function toggleScoreHistory() {
    if (showScoreHistory) { setShowScoreHistory(false); return }
    setShowScoreHistory(true)
    if (scoreHistory == null) {
      const { data } = await supabase
        .from('project_score_history')
        .select('id, score, note, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
      setScoreHistory(data || [])
    }
  }

  // Load persisted coach messages for this project
  useEffect(() => {
    if (!project?.id || !user?.id) return
    let cancelled = false
    supabase
      .from('coach_messages')
      .select('role, content, created_at, session_id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (cancelled || !data?.length) return
        const all = data.map(m => ({ role: m.role, content: m.content, created_at: m.created_at, session_id: m.session_id }))
        setCoachAllMessages(all)
        const savedSid = localStorage.getItem(`coach_session_${project.id}`)
        if (savedSid === 'new') {
          setCoachMessages([])
          setCoachSessionId(null)
        } else {
          const lastSid = savedSid || all[all.length - 1]?.session_id
          const sessionMsgs = all.filter(m => m.session_id === lastSid)
          setCoachMessages(sessionMsgs.map(m => ({ role: m.role, content: m.content })))
          setCoachSessionId(lastSid)
        }
      })
    return () => { cancelled = true }
  }, [project?.id, user?.id])

  async function sendCoach(e) {
    e?.preventDefault()
    const msg = coachInput.trim()
    if (!msg || coachLoading) return
    const gate = checkGate('coach')
    if (!gate.allowed) {
      setCoachMessages(prev => [...prev, { role: 'assistant', isGate: true, content: gate.message?.body ?? gate.message }])
      return
    }
    const next = [...coachMessages, { role: 'user', content: msg }]
    setCoachMessages(next)
    setCoachInput('')
    setCoachLoading(true)
    try {
      const reply = await chatProjectCoach({ project: { ...project, journal: projectJournalEntries, teacher_feedback: teacherFeedback }, messages: coachMessages, message: msg })
      consumeAI('coach')
      const now = new Date().toISOString()
      setCoachMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setTimeout(() => coachBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      const sid = coachSessionId || crypto.randomUUID()
      if (!coachSessionId) {
        setCoachSessionId(sid)
        if (project?.id) localStorage.setItem(`coach_session_${project.id}`, sid)
      }
      setCoachAllMessages(prev => [...prev, { role: 'user', content: msg, created_at: now, session_id: sid }, { role: 'assistant', content: reply, created_at: now, session_id: sid }])
      if (user?.id && project?.id) {
        // A conversa já apareceu no ecrã e já consumiu quota de IA
        // (consumeAI acima) — se isto falhar em silêncio, a próxima vez que
        // o histórico é recarregado tem menos mensagens do que a pessoa
        // realmente teve, como se o coach se tivesse "esquecido".
        supabase.from('coach_messages').insert([
          { project_id: project.id, user_id: user.id, role: 'user', content: msg, session_id: sid },
          { project_id: project.id, user_id: user.id, role: 'assistant', content: reply, session_id: sid },
        ]).then(({ error }) => { if (error) console.error('[coach_messages]', error.message) })
      }
    } catch (err) {
      setCoachMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro. Tenta novamente.' }])
    }
    setCoachLoading(false)
  }

  // Student: mark teacher-flagged revisions as done — notifies the teacher
  const [resubmitting, setResubmitting] = useState(false)
  async function handleMarkResubmitted() {
    if (!project || resubmitting) return
    setResubmitting(true)
    const { error } = await supabase.rpc('mark_project_resubmitted', { p_project_id: project.id })
    if (!error) {
      setProject(p => ({ ...p, review_status: 'resubmitted' }))
      setToast({ visible: true, message: 'O professor foi notificado das tuas correções.' })
      setTimeout(() => setToast({ visible: false, message: '' }), 3000)
    }
    setResubmitting(false)
  }

  // Estado do projeto (Em progresso/Concluído) — sem coluna nova, é só
  // project_finished_on a ter ou não valor. Update direto: é o dono a
  // escrever na sua própria linha, já coberto pela RLS existente.
  const [stateSaving, setStateSaving] = useState(false)

  // Trocar a capa direto no banner (mobile) — sem passar pelo formulário
  // de Editar Projeto, que noutro ecrã pedia para escolher a imagem antes
  // de gravar tudo o resto. Aqui é uma ação isolada e imediata: escolhe,
  // sobe, grava, pronto.
  const [coverUploading, setCoverUploading] = useState(false)
  const heroCoverInputRef = useRef(null)
  async function handleHeroCoverUpload(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file || !project) return
    if (file.size > 10 * 1024 * 1024) { triggerToast('Imagem demasiado grande (máx. 10MB)'); return }
    setCoverUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${project.slug}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      const { error } = await supabase.from('projects').update({ cover_url: publicUrl }).eq('id', project.id)
      if (error) throw error
      setProject(p => ({ ...p, cover_url: publicUrl }))
      triggerToast('Imagem atualizada')
    } catch {
      triggerToast('Não foi possível carregar a imagem — tenta outra vez')
    }
    setCoverUploading(false)
  }

  async function toggleProjectState() {
    if (!project || stateSaving) return
    setStateSaving(true)
    const next = project.project_finished_on ? null : new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('projects').update({ project_finished_on: next }).eq('id', project.id)
    if (!error) {
      setProject(p => ({ ...p, project_finished_on: next }))
      triggerToast(next ? 'Projeto marcado como concluído' : 'Projeto reaberto')
    } else {
      triggerToast('Não foi possível guardar — verifica a ligação e tenta outra vez')
    }
    setStateSaving(false)
  }

  // Quick "ready for defense" / "needs revision" flag
  const [reviewStatusSaving, setReviewStatusSaving] = useState(false)
  async function handleSetReviewStatus(status) {
    if (!project || reviewStatusSaving) return
    const next = project.review_status === status ? null : status
    setReviewStatusSaving(true)
    const { error } = await supabase.rpc('set_project_review_status', { p_project_id: project.id, p_status: next })
    if (!error) {
      setProject(p => ({ ...p, review_status: next }))
      if (next && project.user_id) {
        const msg = next === 'ready_for_defense'
          ? `O professor marcou "${project.name}" como pronto para defesa.`
          : `O professor marcou "${project.name}" como precisa de revisão.`
        supabase.rpc('create_notification', { p_user_id: project.user_id, p_type: 'TEACHER_FEEDBACK', p_message: msg, p_project_slug: project.slug })
          .then(({ error: notifError }) => { if (notifError) console.error('review_status notification failed:', notifError) })
      }
    } else {
      console.error('set_project_review_status failed:', error)
      setToast({ visible: true, message: 'Não foi possível guardar o estado.' })
      setTimeout(() => setToast({ visible: false, message: '' }), 3000)
    }
    setReviewStatusSaving(false)
  }

  // Batch review queue (started from the turma's "Avaliar todos")
  const reviewQueue = location.state?.reviewQueue
  const reviewIndex = location.state?.reviewIndex ?? 0
  function goToReviewIndex(i) {
    if (!reviewQueue || i < 0 || i >= reviewQueue.length) return
    navigate(`/projeto/${reviewQueue[i]}`, {
      state: { reviewQueue, reviewIndex: i, turmaCode: location.state?.turmaCode, turmaName: location.state?.turmaName, turmaId: location.state?.turmaId },
    })
  }
  // Likes
  const [likeCount, setLikeCount]   = useState(0)
  const [liked, setLiked]           = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  // Recruiter interest
  const [interestCount, setInterestCount]     = useState(0)
  const [hasInterest, setHasInterest]         = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestors, setInterestors]         = useState([])   // recruiter profiles for owner modal
  const [showInterestors, setShowInterestors] = useState(false)

  const prevScoreRef = useRef(null)
  const rafRef = useRef(null)
  const autoSaveRef = useRef(null)
  const toastTimerRef = useRef(null)
  const membersChannelRef = useRef(null) // realtime channel — must be cleaned up on unmount

  // ── Auto-save: debounce 1.5s quando previewBlocks ou previewStyle muda ──
  useEffect(() => {
    if (!previewEditing || !project?.id) return
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      await supabase.from('projects')
        .update({ preview_blocks: previewBlocks, preview_style: previewStyle })
        .eq('id', project.id)
    }, 1500)
    return () => clearTimeout(autoSaveRef.current)
  }, [previewBlocks, previewStyle]) // eslint-disable-line

  // Show launch overlay for newly created projects
  useEffect(() => {
    // Track that this is an anonymous creator (for gentle nudge banner)
    if (!user && (location.state?.justCreated || location.state?.newProject || location.state?.edit_token)) {
      setIsAnonCreator(true)
      if (location.state?.edit_token && project?.slug) {
        localStorage.setItem(`edit_token_${project.slug}`, location.state.edit_token)
      }
    }
  }, [])

  // Populate sidebar with project controls when this is the owner's project
  useEffect(() => {
    if (!project || !user) { setExtras(null); return }
    // When logged in, only user_id match counts. Token is fallback for anonymous (no user_id) projects only.
    const owned = user.id === project.user_id ||
      (!project.user_id && !!localStorage.getItem(`edit_token_${project.slug}`))
    if (owned) {
      setExtras({
        type: 'project',
        slug: project.slug,
        title: project.name,
        defenseDate: project.defense_date,
        aiScore: project.ai_score,
        analyzingAI,
        viewAsPublic,
        // O certificado (Certificate.jsx) exige score >= 75 — "Nível
        // Profissional" no próprio design do certificado. O botão tinha
        // 100, um limiar diferente do da página: entre 75 e 99 o
        // certificado existia e funcionava, mas ninguém via o botão para
        // lá chegar pela interface (só por URL direto).
        showCertificate: score >= 75,
        showDiary: true,
        onShareStory: () => setShowStoryModal(true),
        onDefense: project.project_type === 'pap' ? () => setDefenseMode(true) : null,
        onAnalyze: handleAIClick,
        // Entrar em "Preview visitante" já abre o workspace direto — é o
        // único sítio de onde o dono normalmente chega lá, não faz sentido
        // obrigar a um segundo clique (ex: em "Preencher" nalgum campo) só
        // para o editor aparecer. Se chegámos aqui a editar a aparência
        // (?workspace=1), fechar volta para /editar, não deixa a pessoa
        // pendurada numa "vista de visitante" sem contexto nenhum.
        onTogglePublicView: () => {
          if (openWorkspaceOnLoad && viewAsPublic) { navigate(`/editar/${project.slug}`); return }
          setViewAsPublic(v => {
            const next = !v
            if (next) { setPreviewEditing(true); setWsExpanded(true) }
            return next
          })
        },
        editingAppearance: openWorkspaceOnLoad,
        previewEditing,
        onEditWorkspace: () => { setPreviewEditing(true); setWsExpanded(e => !e) },
        previewDevice,
        setPreviewDevice,
        forceMenuOpen: tourMenuOpen,
      })
    } else {
      setExtras(null)
    }
    return () => setExtras(null)
  }, [project?.id, project?.project_type, project?.defense_date, project?.ai_score, user?.id, analyzingAI, aiFeedback, viewAsPublic, score, previewEditing, previewDevice, tourMenuOpen])

  const pageUrl = window.location.href

  // Effect 1: fetch project + public data — runs only when slug changes (never re-runs due to auth)
  useEffect(() => {
    if (authLoading) return
    async function fetchProject() {
      // `select('*')` exige grant em TODAS as colunas da tabela — quem não
      // tem sessão só tem grant numa lista explícita (065_security_hardening,
      // esconde notas do professor), por isso `*` falha por inteiro para
      // anon. Usa a lista explícita só quando não há sessão; autenticado
      // mantém `*` como sempre, sem mudar nada do que já funcionava.
      // currentUser vem do AuthContext (já resolvido antes desta página montar
      // na navegação normal) em vez de um supabase.auth.getUser() próprio —
      // essa chamada faz sempre um pedido de rede para validar o JWT contra o
      // servidor, e duplicava exatamente o que o AuthContext já tinha acabado
      // de fazer. Era um dos saltos na fila de pedidos sequenciais que fazia
      // abrir um projeto demorar segundos a mais.
      const currentUser = user
      const { data, error } = await supabase
        .from('projects')
        .select(currentUser ? AUTH_PROJECT_COLUMNS : ANON_PROJECT_COLUMNS)
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      // Itens da Biblioteca (entry_kind='library') não têm ficha nenhuma —
      // são só um ficheiro + nome + descrição breve. Nunca faz sentido esta
      // página renderizar isso (ficaria tudo vazio); manda sempre para a
      // Biblioteca, mesmo para o dono.
      if (data.entry_kind === 'library') {
        navigate('/biblioteca', { replace: true })
        return
      }

      // Visibility gate: private projects are owner-only — mais o professor
      // da turma onde o aluno o adicionou (senão via "não existe" ao abrir
      // um projeto privado a partir da turma).
      if (data.visibility === 'private') {
        const isOwner = currentUser?.id === data.user_id
        const hasToken = data.edit_token && localStorage.getItem(`edit_token_${data.slug}`) === data.edit_token
        let teacherOfClass = false
        let isCollaborator = false
        if (!isOwner && !hasToken && currentUser?.id) {
          const [{ data: inClass }, { data: collabRow }] = await Promise.all([
            supabase.rpc('is_project_in_my_class', { p_project_id: data.id }),
            // Este gate corria só no frontend e nunca olhava para
            // project_collaborators — um colaborador aceite num projeto
            // privado passava a RLS (que já sabe disto) mas ficava preso
            // aqui, a ver "este projeto não existe".
            supabase.from('project_collaborators').select('status').eq('project_id', data.id).eq('user_id', currentUser.id).eq('status', 'accepted').maybeSingle(),
          ])
          teacherOfClass = !!inClass
          isCollaborator = !!collabRow
        }
        if (!isOwner && !hasToken && !teacherOfClass && !isCollaborator) {
          setLoading(false)
          return
        }
      }

      // Fetch diary entries to include in score calculation
      const { data: journalEntries } = await supabase
        .from('project_journal_entries')
        .select('created_at, kind, content')
        .eq('project_id', data.id)

      const entries = journalEntries || []
      setProjectJournalEntries(entries)
      const { score: s } = calculateScore(data, entries)
      setProject(data)
      setScore(s)
      setDisplayScore(s)
      prevScoreRef.current = s
      setLoading(false)

      if (s > 0 && (!data.score || data.score !== s)) {
        // Sem tratar o erro, uma falha aqui era invisível: o ecrã já mostra
        // `s` (via setScore acima), e a base ficava presa no valor antigo —
        // confirmado a acontecer em produção, com o certificado e outras
        // vistas a lerem `projects.score` diretamente da base e a mostrar
        // um número diferente do que o dono via na própria página.
        supabase.from('projects').update({ score: s }).eq('id', data.id)
          .then(({ error }) => { if (error) console.error('[score sync]', error.message) })
      }

      // Fetch grades via RPC (only returns data for owner/teacher/admin)
      supabase.rpc('get_project_grades', { p_project_id: data.id }).then(({ data: grades }) => {
        if (grades) setProject(p => p ? { ...p, ...grades } : p)
      }).catch(() => {})

      if (data.ai_feedback) setAiFeedback(data.ai_feedback)
      if (data.defense_date) setDefenseDate(data.defense_date)
      if (Array.isArray(data.preview_blocks)) setPreviewBlocks(data.preview_blocks)
      if (data.preview_style && typeof data.preview_style === 'object') setPreviewStyle(data.preview_style)

      // Public likes count (no user needed)
      supabase.from('project_likes').select('user_id', { count: 'exact' }).eq('project_id', data.id).then(({ count }) => {
        setLikeCount(count || 0)
      })

      setInterestCount(data.interest_count || 0)

      // Members + realtime channel
      async function loadMembers(projectId, isOwner) {
        const q = supabase.from('project_collaborators').select('user_id, status, sections').eq('project_id', projectId)
        const { data: rows } = isOwner ? await q : await q.eq('status', 'accepted')
        if (!rows?.length) { setMembers([]); return }
        const userIds = [...new Set(rows.map(r => r.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
        const profileMap = {}
        profiles?.forEach(p => { profileMap[p.id] = p })
        setMembers(rows.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })))
      }
      // isOwner unknown at this point (user not yet resolved) — load accepted members only
      loadMembers(data.id, false)

      if (membersChannelRef.current) supabase.removeChannel(membersChannelRef.current)
      membersChannelRef.current = supabase
        .channel(`members-${data.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_collaborators', filter: `project_id=eq.${data.id}` },
          () => loadMembers(data.id, false))
        .subscribe()

      // Owner profile
      if (data.user_id) {
        supabase.from('profiles').select('id, username, full_name, avatar_url, available_for_work').eq('id', data.user_id).single()
          .then(({ data: prof }) => { if (prof) setOwnerProfile(prof) })
      }
    }

    fetchProject()
    return () => {
      if (membersChannelRef.current) {
        supabase.removeChannel(membersChannelRef.current)
        membersChannelRef.current = null
      }
    }
  }, [slug, authLoading])

  // Effect 2: user-specific data — runs when auth resolves, never re-fetches the project
  useEffect(() => {
    if (!user?.id || !project?.id) return
    const pid = project.id
    const isOwner = user.id === project.user_id

    // User's own like
    supabase.from('project_likes').select('user_id').eq('project_id', pid).eq('user_id', user.id).maybeSingle()
      .then(({ data: l }) => setLiked(!!l))

    if (isOwner) {
      // Owner sees recruiter profiles
      supabase.from('recruiter_interests')
        .select('recruiter_id, profiles!recruiter_id(id, full_name, username, avatar_url, company, role)')
        .eq('project_id', pid)
        .then(({ data: rows }) => {
          setInterestCount(rows?.length || 0)
          setInterestors((rows || []).map(r => r.profiles).filter(Boolean))
        })
    } else {
      // Non-owner: check own recruiter interest + collaborator sections
      supabase.from('recruiter_interests').select('recruiter_id').eq('project_id', pid).eq('recruiter_id', user.id).single()
        .then(({ data: ri }) => setHasInterest(!!ri))

      supabase.from('project_collaborators').select('sections').eq('project_id', pid).eq('user_id', user.id).eq('status', 'accepted').single()
        .then(({ data: collab }) => { if (collab) setCollaboratorSections(collab.sections ?? []) })
    }

    // Teacher feedback
    supabase.from('teacher_feedback').select('*').eq('project_id', pid)
      .then(({ data: fb }) => { if (fb) setTeacherFeedback(fb) })
  }, [user?.id, project?.id])

  // View tracking + PROJECT_VIEW / COMPANY_VIEW notifications
  useEffect(() => {
    if (!project) return
    if (authLoading) return
    if (!user?.id) return
    // Logged-in users: only real owner skips view count. Token is irrelevant when authenticated.
    const isOwner = !!(project.user_id && user.id === project.user_id)
    if (isOwner) return

    const viewKey = `viewed_${project.slug}`
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1')
      // keepalive ensures the POST reaches the DB even if the user refreshes immediately
      fetch(`${supabaseUrl}/rest/v1/rpc/increment_project_views`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ project_id: project.id }),
      })
      setProject(prev => prev ? { ...prev, views: (prev.views ?? 0) + 1 } : prev)
    }

    // PROJECT_VIEW notification after 15s (max once per hour per project)
    const notifKey = `notified_view_${project.slug}`
    let t1 = null
    let t2 = null
    if (!sessionStorage.getItem(notifKey)) {
      t1 = setTimeout(() => {
        sessionStorage.setItem(notifKey, '1')
        // Get city first, then notify
        getVisitorCity().then(city => {
          const visitor_role = profile?.role ?? null
          supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'PROJECT_VIEW', city, visitor_role } })
        })
      }, 15000)
    }

    // COMPANY_VIEW after 30s (max once per day per project)
    const companyKey = `company_view_${project.slug}`
    if (!sessionStorage.getItem(companyKey)) {
      t2 = setTimeout(() => {
        sessionStorage.setItem(companyKey, '1')
        supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'COMPANY_VIEW', visitor_role: profile?.role ?? null } })
      }, 30000)
    }

    return () => {
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [project?.id, user?.id, authLoading])

  useEffect(() => {
    if (prevScoreRef.current === null || prevScoreRef.current === score) return
    const from = prevScoreRef.current
    const to = score
    prevScoreRef.current = to
    // Show score-gain toast when score increases during the session
    if (to > from) {
      const gain = to - from
      setTimeout(() => triggerToast(`Score subiu +${gain} ${gain === 1 ? 'ponto' : 'pontos'}`), 900)
    }
    cancelAnimationFrame(rafRef.current)
    const duration = 800
    const startTime = performance.now()
    function animate(now) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(from + (to - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  // ── Memoised derived values — must be before any early returns ──
  const level = useMemo(() => getLevelInfo(displayScore), [displayScore])
  const internshipReady = useMemo(
    () => !!(project && score > 80 && project.technologies?.trim() && project.results?.trim()),
    [score, project]
  )
  const sortedChallenges = useMemo(() => {
    if (!project) return [...CHALLENGES]
    return [...CHALLENGES].sort((a, b) => {
      const aCompleted = getChallengeStatus(a, project) === 'completed' ? 1 : 0
      const bCompleted = getChallengeStatus(b, project) === 'completed' ? 1 : 0
      return aCompleted - bCompleted
    })
  }, [project])
  const completedCount = useMemo(
    () => project ? CHALLENGES.filter(c => getChallengeStatus(c, project) === 'completed').length : 0,
    [project]
  )
  const earnedXP = useMemo(
    () => project ? CHALLENGES.reduce((sum, c) => sum + (getChallengeStatus(c, project) === 'completed' ? c.scoreGain : 0), 0) : 0,
    [project]
  )
  const totalXP = useMemo(() => CHALLENGES.reduce((sum, c) => sum + c.scoreGain, 0), [])
  // Missões todas feitas não quer dizer nada por fazer — um campo pode
  // continuar com o texto do rascunho (ex: "[contexto]") e passar a
  // verificação de tamanho sem problema. Sem isto, o cartão de estado
  // ficava sem nenhuma ação a seguir a 100% de missões, mesmo quando
  // metade do projeto ainda era só o modelo por preencher.
  const placeholderFieldCount = useMemo(() => {
    if (!project) return 0
    return ['problem','solution','target_audience','features','technologies','challenges','results','learnings']
      .filter(fk => hasPlaceholder(project[fk])).length
  }, [project])

  function triggerToast(message) {
    clearTimeout(toastTimerRef.current)
    setToast({ visible: true, message })
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500)
  }

  async function handleSave(challenge, fieldValue) {
    setSaving(true)
    const oldScore = score
    const wasCompleted = getChallengeStatus(challenge, project) === 'completed'

    const updatedProject = { ...project, [challenge.field]: fieldValue }
    const { score: newScore } = calculateScore(updatedProject, projectJournalEntries)

    const { error } = await supabase
      .from('projects')
      .update({ [challenge.field]: fieldValue, score: newScore })
      .eq('id', project.id)

    if (error) {
      setSaving(false)
      triggerToast('Não foi possível guardar — verifica a ligação e tenta outra vez')
      return false
    }

    setProject(updatedProject)
    setScore(newScore)

    // Regista sozinho no diário que esta secção passou a estar preenchida —
    // sem isto o diário fica vazio e a timeline/progresso não têm dados.
    // Esperamos pelo resultado para o aviso só falar do diário quando algo
    // foi mesmo lá parar (o mesmo campo duas vezes no dia não repete).
    let loggedToDiary = false
    if (user?.id) {
      loggedToDiary = await logFieldFilled({
        projectId: project.id,
        userId: user.id,
        field: challenge.field,
        before: project[challenge.field],
        after: fieldValue,
      })
      if (loggedToDiary) {
        supabase.from('project_journal_entries')
          .select('created_at, kind, content')
          .eq('project_id', project.id)
          .then(({ data }) => { if (data) setProjectJournalEntries(data) })
      }
    }
    const diaryNote = loggedToDiary ? ' · registado no diário' : ''

    const isNowCompleted = getChallengeStatus(challenge, updatedProject) === 'completed'
    if (!wasCompleted && isNowCompleted) {
      triggerToast(`+${challenge.scoreGain} XP! Score: ${oldScore} → ${newScore}${diaryNote}`)
      if (newScore === 100) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
      if (user?.id) {
        supabase.rpc('award_xp', { p_reason: 'mission_complete' })
        supabase.rpc('create_notification', {
          p_user_id: user.id,
          p_type: 'MISSION_COMPLETE',
          p_message: `Missão completa: ${challenge.fieldLabel} +${challenge.scoreGain} XP`,
          p_project_slug: project.slug,
        })
      }
    } else {
      triggerToast(`Guardado! Score atual: ${newScore}${diaryNote}`)
    }

    // SCORE_MILESTONE notification
    const MILESTONES = [50, 70, 85, 90]
    const current = updatedProject.notified_milestones ?? []
    const newMilestones = MILESTONES.filter(m => newScore >= m && oldScore < m && !current.includes(m))
    if (newMilestones.length && user?.id) {
      const m = newMilestones[newMilestones.length - 1]
      supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_type: 'SCORE_MILESTONE',
        p_message: `O teu projeto "${project.name}" atingiu ${m} pontos!`,
        p_project_slug: project.slug,
      })
      const updatedMilestones = [...current, ...newMilestones]
      // Sem tratar o erro, uma falha aqui era invisível — e o milestone já
      // notificado (create_notification, acima) voltava a disparar na
      // próxima visita, porque a base nunca ficava a saber que já foi
      // avisado. O ecrã já assume sucesso (setProject abaixo); isto só
      // torna uma falha real visível em vez de silenciosa.
      supabase.from('projects').update({ notified_milestones: updatedMilestones }).eq('id', project.id)
        .then(({ error }) => { if (error) console.error('[milestones]', error.message) })
      setProject(p => ({ ...p, notified_milestones: updatedMilestones }))
      // Show shareable milestone card
      const tier = m >= 90 ? 'Excelente' : m >= 70 ? 'Profissional' : 'Em progresso'
      setMilestoneCard({ score: m, tier })
    }

    if (!user && isAnonCreator) {
      const next = anonEditCount + 1
      setAnonEditCount(next)
      if (next >= 3) setShowRegisterPopup(true)
    }
    setSaving(false)
    return true
  }

  async function handleSaveField(fieldKey, fieldValue) {
    const challenge = CHALLENGES.find(c => c.field === fieldKey)
    if (!challenge) return false
    return handleSave(challenge, fieldValue)
  }

  function openContentEditor(challenge) {
    setContentTargetField(challenge.field)
    setViewAsPublic(true)
    setPreviewEditing(true)
    setWsExpanded(true)
  }

  function handleCopy() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleGenerateNarrative() {
    if (!project) return
    const gate = checkGate('narrative')
    if (!gate.allowed) { setNarrativeError(gate.message?.body ?? gate.message); return }
    if (gate.remaining <= 2 && gate.remaining !== Infinity) {
      setConfirmNarrativeUse({ remaining: gate.remaining, limit: gate.limit })
      return
    }
    doGenerateNarrative()
  }

  async function doGenerateNarrative() {
    setConfirmNarrativeUse(null)
    setGeneratingNarrative(true)
    setNarrativeError('')
    setNarrativePreview(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-project', {
        body: { data: project, feature: 'narrative' },
      })
      if (fnErr || !data?.tagline) throw new Error(data?.error || 'Resposta inválida')
      consumeAI('narrative')
      setNarrativePreview(data)
    } catch {
      setNarrativeError('Não foi possível gerar agora. Tenta novamente.')
    } finally {
      setGeneratingNarrative(false)
    }
  }

  async function handleAcceptNarrative() {
    if (!narrativePreview) return
    const ai_description = Array.isArray(narrativePreview.historia)
      ? narrativePreview.historia.join('\n\n')
      : (narrativePreview.description ?? null)
    await supabase.from('projects').update({
      ai_tagline:     narrativePreview.tagline ?? null,
      ai_description,
      ai_highlights:  narrativePreview.highlights ?? null,
    }).eq('id', project.id)
    // Reflect locally
    setProject(p => ({
      ...p,
      ai_tagline:     narrativePreview.tagline ?? p.ai_tagline,
      ai_description: ai_description ?? p.ai_description,
      ai_highlights:  narrativePreview.highlights ?? p.ai_highlights,
    }))
    setNarrativePreview(null)
    setNarrativeSaved(true)
    setTimeout(() => setNarrativeSaved(false), 3000)
  }

  async function handleAnalyzeAI() {
    if (!project) return
    const gate = checkGate('analyzeProject')
    if (!gate.allowed) { setAnalyzeGateMsg(gate.message); return }
    setAnalyzingAI(true)
    setAnalyzeError(null)
    try {
      const result = await analyzeProject(project)
      consumeAI('analyzeProject')
      setAiFeedback(result)
      await supabase.from('projects').update({ ai_feedback: result }).eq('id', project.id)
    } catch (e) {
      console.error('[analyze]', e)
      setAnalyzeError(e?.message || 'Erro ao analisar. Tenta novamente.')
    }
    setAnalyzingAI(false)
  }


  function handleAIClick() {
    setAiModalOpen(true)
  }

  function handleInviteSearchInput(e) {
    const val = e.target.value
    setInviteInput(val)
    setInviteSelectedUser(null)
    setInviteMsg(null)
    clearTimeout(inviteSearchTimerRef.current)
    if (!val.trim()) { setInviteSearchResults([]); setInviteShowDropdown(false); return }
    inviteSearchTimerRef.current = setTimeout(async () => {
      const q = val.trim()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(8)
      setInviteSearchResults(data || [])
      setInviteShowDropdown(true)
    }, 250)
  }

  function selectInviteUser(u) {
    setInviteSelectedUser(u)
    setInviteInput(u.full_name || u.username)
    setInviteShowDropdown(false)
    setInviteSearchResults([])
  }

  function closeInviteModal() {
    setShowInvite(false)
    setInviteInput('')
    setInviteSelectedUser(null)
    setInviteSearchResults([])
    setInviteShowDropdown(false)
    setInviteMsg(null)
    document.body.style.overflow = ''
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!project?.id) return
    let found = inviteSelectedUser
    if (!found) {
      const val = inviteInput.trim()
      if (!val) return
      const { data } = await supabase.from('profiles').select('id, full_name, username').or(`username.ilike.${val},full_name.ilike.${val}`).limit(1)
      found = data?.[0] || null
    }
    if (!found) { setInviteMsg({ type: 'error', text: 'Utilizador não encontrado.' }); return }
    if (found.id === user?.id) { setInviteMsg({ type: 'error', text: 'Não podes convidar-te a ti próprio.' }); return }
    setInviting(true); setInviteMsg(null)
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .upsert({ project_id: project.id, user_id: found.id, status: 'pending', sections: [] }, { onConflict: 'project_id,user_id' })
      if (error) throw error
      setInviteMsg({ type: 'success', text: `Convite enviado para ${found.full_name || found.username}!` })
      setInviteInput(''); setInviteSelectedUser(null)
      setTimeout(closeInviteModal, 1800)
    } catch {
      setInviteMsg({ type: 'error', text: 'Erro ao enviar convite. Tenta novamente.' })
    }
    setInviting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)', overflowX: 'clip' }}>
        <Navbar />
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.4; }
            50%       { opacity: 0.85; }
          }
          .sk { background: ${colors.card}; border-radius: 10px; animation: shimmer 1.6s ease-in-out infinite; }
          .sk-wrap { max-width: 720px; margin: 0 auto; padding: 0 16px 80px; box-sizing: border-box; }
        `}</style>
        <div className="sk-wrap">
          {/* Cover */}
          <div className="sk" style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 24 }} />
          {/* Title */}
          <div className="sk" style={{ height: 30, width: '60%', marginTop: 28 }} />
          {/* Tagline */}
          <div className="sk" style={{ height: 16, width: '88%', marginTop: 14, animationDelay: '0.1s' }} />
          <div className="sk" style={{ height: 16, width: '72%', marginTop: 10, animationDelay: '0.15s' }} />
          {/* Score bar */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <div className="sk" style={{ height: 48, flex: 1, animationDelay: '0.2s' }} />
            <div className="sk" style={{ height: 48, flex: 1, animationDelay: '0.25s' }} />
          </div>
          {/* Card block */}
          <div className="sk" style={{ height: 140, width: '100%', marginTop: 20, borderRadius: 12, animationDelay: '0.3s' }} />
          <div className="sk" style={{ height: 100, width: '100%', marginTop: 14, borderRadius: 12, animationDelay: '0.35s' }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24, height: 'calc(100dvh - 62px)', color: colors.text, fontFamily: 'var(--font-body)' }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>Este projeto não existe ou foi removido</h2>
          <p style={{ color: colors.muted, margin: 0 }}>O link pode estar incorrecto ou o projeto foi eliminado.</p>
          {profile?.role !== 'professor' && (
            <button
              onClick={() => navigate('/novo')}
              style={{ background: colors.text, color: colors.bg, border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}
            >
              <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '10px 22px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    )
  }

  const highlights = Array.isArray(project.ai_highlights) ? project.ai_highlights : []
  const isPap = project.is_pap || project.project_type === 'pap'
  // Partilhado entre o card "Data de defesa" da sidebar (desktop/tablet) e o
  // botão compacto do telemóvel — os dois mostram a mesma urgência.
  const defenseToday = new Date(); defenseToday.setHours(0, 0, 0, 0)
  const defenseTarget = defenseDate ? new Date(defenseDate + 'T00:00:00') : null
  const defenseDaysLeft = defenseTarget ? Math.ceil((defenseTarget - defenseToday) / 86400000) : null
  const defenseUrgentColor = defenseDaysLeft != null && defenseDaysLeft <= 7 ? 'var(--color-error)' : defenseDaysLeft != null && defenseDaysLeft <= 30 ? 'var(--color-warning)' : 'var(--color-primary)'
  const defenseLabel = defenseDaysLeft === null ? 'Data de defesa' :
    defenseDaysLeft < 0 ? 'Defesa concluída' :
    defenseDaysLeft === 0 ? 'Defesa é hoje!' :
    defenseDaysLeft === 1 ? 'Defesa é amanhã!' :
    `${defenseDaysLeft} dias para a defesa`

  async function handleSaveDefenseDate(dateStr) {
    setDefenseDate(dateStr)
    setSavingDefense(true)
    await supabase.from('projects').update({ defense_date: dateStr || null }).eq('id', project.id)
    setProject(p => ({ ...p, defense_date: dateStr || null }))
    setSavingDefense(false)
  }

  const isOwner = user?.id
    ? (user.id === project.user_id)  // logged-in: only user_id match
    : !!localStorage.getItem(`edit_token_${project.slug}`)  // anonymous: token fallback
  const isProfessor = profile?.role === 'professor' && !isOwner && !!user?.id && isMyClassProject
  const isRecruiterRole = profile?.role === 'recrutador' || profile?.role === 'empresa'

  async function handleLike() {
    if (!user) { navigate('/login'); return }
    if (likeLoading) return
    setLikeLoading(true)
    if (liked) {
      await supabase.from('project_likes').delete().eq('project_id', project.id).eq('user_id', user.id)
      setLiked(false)
      setLikeCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('project_likes').insert({ project_id: project.id, user_id: user.id })
      setLiked(true)
      setLikeCount(c => c + 1)
      // Notificação gerada automaticamente pelo trigger notify_on_like() na DB
    }
    setLikeLoading(false)
  }

  async function handleInterest() {
    if (!user) { navigate('/login'); return }
    if (interestLoading) return
    setInterestLoading(true)
    if (hasInterest) {
      await supabase.from('recruiter_interests').delete().eq('project_id', project.id).eq('recruiter_id', user.id)
      setHasInterest(false)
      setInterestCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('recruiter_interests').insert({ project_id: project.id, recruiter_id: user.id })
      setHasInterest(true)
      setInterestCount(c => c + 1)
      // mensagem + bell notification geradas automaticamente pelo trigger notify_on_recruiter_interest()
    }
    setInterestLoading(false)
  }

  async function handleFbSave() {
    if (!fbComment.trim() || !project) return
    setFbSaving(true)
    setFbError('')
    if (fbEditing) {
      const { data: updated, error } = await supabase.from('teacher_feedback').update({ comment: fbComment.trim() }).eq('id', fbEditing).select().single()
      if (error || !updated) {
        console.error('teacher_feedback update failed:', error)
        setFbError('Não foi possível guardar. Tenta de novo.')
        setFbSaving(false)
        return
      }
      setTeacherFeedback(prev => prev.map(f => f.id === fbEditing ? updated : f))
      setFbEditing(null)
    } else {
      const { data: created, error } = await supabase.from('teacher_feedback')
        .upsert({ project_id: project.id, teacher_id: user.id, field_key: fbFieldKey, comment: fbComment.trim() }, { onConflict: 'project_id,teacher_id,field_key' })
        .select().single()
      if (error || !created) {
        console.error('teacher_feedback save failed:', error)
        setFbError(error?.message?.includes('row-level security') ? 'Sem permissão para comentar este projeto.' : 'Não foi possível guardar. Tenta de novo.')
        setFbSaving(false)
        return
      }
      setTeacherFeedback(prev => { const idx = prev.findIndex(f => f.field_key === fbFieldKey && f.teacher_id === user.id); return idx >= 0 ? prev.map((f, i) => i === idx ? created : f) : [...prev, created] })
      if (project.user_id) {
        supabase.rpc('create_notification', {
          p_user_id: project.user_id,
          p_type: 'TEACHER_FEEDBACK',
          p_message: `O teu professor deixou feedback no projeto "${project.name}".`,
          p_project_slug: project.slug,
        })
      }
    }
    setFbComment(''); setFbSaving(false)
  }

  async function handleFbDelete(id) {
    await supabase.from('teacher_feedback').delete().eq('id', id)
    setTeacherFeedback(prev => prev.filter(f => f.id !== id))
  }

  async function handleFbResolve(id, note) {
    const { error } = await supabase.rpc('resolve_teacher_feedback', { p_feedback_id: id, p_note: note || null })
    if (error) return
    setTeacherFeedback(prev => prev.map(f => f.id === id
      ? { ...f, status: 'resolved', resolved_at: new Date().toISOString(), resolution_note: note || null }
      : f))
  }

  async function handleFbReopen(id) {
    const { error } = await supabase.rpc('reopen_teacher_feedback', { p_feedback_id: id })
    if (error) return
    setTeacherFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'pending', resolved_at: null, resolution_note: null } : f))
  }

  const scoreSuffix = score > 0 ? ` · Score ${score}` : (project.score != null ? ` · Score ${project.score}` : '')
  const shareTitle = `${project.name} · Showo${scoreSuffix}`
  const shareDescription = project.ai_tagline || project.goal || `Projeto de ${project.creator_name || 'estudante'} no Showo`

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)', overflowX: 'clip' }}>
      <Helmet>
        <title>{shareTitle}</title>
        <meta name="description" content={shareDescription} />
        {/* Open Graph — WhatsApp, Facebook, LinkedIn */}
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Showo" />
        {project.cover_url
          ? <meta property="og:image" content={project.cover_url} />
          : <meta property="og:image" content={`${window.location.origin}/og-default.png`} />}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter / X */}
        <meta name="twitter:card" content={project.cover_url ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={shareTitle} />
        <meta name="twitter:description" content={shareDescription} />
        {project.cover_url && <meta name="twitter:image" content={project.cover_url} />}
      </Helmet>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:.4 } 30% { transform:translateY(-5px); opacity:1 } }
        @keyframes coachPop { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes sparkle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--color-accent-subtle); }
          50%       { box-shadow: 0 0 0 10px rgba(139,92,246,0); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        /* ── Design system ── */
        /* Base card: use on all proj-body cards */
        .proj-card {
          background: ${colors.glass};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid ${colors.glassBorder};
          border-radius: 12px;
          padding: 20px 22px;
          box-shadow: none;
        }
        /* Consistent section label (11px uppercase muted with icon) */
        .proj-sec-label {
          font-size: 11px; font-weight: 700; color: ${colors.muted};
          text-transform: uppercase; letter-spacing: 0.08em;
          display: flex; align-items: center; gap: 7px;
          margin: 0 0 14px;
        }

        /* Body: flex column with uniform gap */
        .proj-body {
          display: flex; flex-direction: column; gap: 16px;
        }
        /* Sections within the accordion body */
        .proj-sections-body {
          display: flex; flex-direction: column; gap: 12px;
        }

        /* Barra de saltos entre grupos — discreta, sem competir com o
           conteúdo, só um atalho para não precisar de scroll cego. */
        .proj-anchor-nav {
          display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
          padding-bottom: 2px; margin-bottom: 22px;
        }
        .proj-anchor-nav::-webkit-scrollbar { display: none; }
        .proj-anchor-chip {
          flex-shrink: 0; white-space: nowrap;
          background: ${colors.card}; border: 1px solid ${colors.border};
          color: ${colors.muted}; font-size: 12px; font-weight: 600;
          font-family: inherit; padding: 7px 13px; border-radius: 999px;
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .proj-anchor-chip:hover { border-color: ${colors.borderBright}; color: ${colors.text}; }

        /* Grupo de secções — um cabeçalho só para 2 campos relacionados,
           em vez de cada campo repetir a mesma moldura sem nada a dizer
           que pertencem ao mesmo assunto. */
        .proj-section-group { display: flex; flex-direction: column; gap: 10px; }
        .proj-section-group + .proj-section-group { margin-top: 22px; }
        .proj-section-group-label {
          font-size: 13px; font-weight: 700; color: ${colors.text};
          font-family: var(--font-heading); letter-spacing: -0.1px;
        }
        .proj-section-group-body { display: flex; flex-direction: column; gap: 10px; }

        .proj-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 28px;
          align-items: start;
        }
        .proj-highlights-grid { }
        @media (max-width: 700px) {
          .proj-highlights-grid { grid-template-columns: 1fr !important; }
        }
        .proj-layout > * { min-width: 0; }
        /* Divisória simples entre secções empilhadas (Missões/Percurso,
           Partilhar/Comentários) */
        .proj-section-divider { border-top: 1px solid ${colors.border}; margin: 4px 0; }
        /* No desktop, Comentários aparece fisicamente a seguir a Percurso no
           código (para partilhar a tab "Melhorar" no telemóvel), mas
           visualmente deve ficar depois do Partilhar — só CSS order
           consegue isto sem duplicar o agrupamento por tab do telemóvel. */
        @media (min-width: 861px) {
          .proj-comments-tabsec { order: 10; border-top: 1px solid ${colors.border}; margin-top: 4px; padding-top: 20px; }
        }
        .proj-sidebar {
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--color-border) transparent;
          padding-right: 4px;
          padding-bottom: 8px;
        }
        .proj-sidebar::-webkit-scrollbar { width: 6px; }
        .proj-sidebar::-webkit-scrollbar-track { background: transparent; }
        .proj-sidebar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 99px; }
        @media (max-width: 860px) {
          /* Dissolve proj-main so hero / body / sidebar can be individually ordered */
          .proj-layout { grid-template-columns: 1fr; }
          .proj-main   { display: contents; }
          .proj-hero   { order: 1; min-width: 0; }
          .proj-sidebar{ position: static; order: 2; min-width: 0; }
          .proj-body   { order: 3; min-width: 0; }
        }
        /* Edit button always visible next to title */
        .proj-edit-inline    { display: flex; }
        .proj-h1-row         { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: nowrap; }
        .proj-dashboard      { display: none; }
        .proj-ai-fab         { display: none; }
        .proj-ai-fab-label   { display: inline; }
        /* FABs: visible on mobile, hidden on desktop (controls are in sidebar) */
        .proj-fab-area       { display: none; }
        .proj-fab-defense-label { display: inline; }
        .proj-invite-label   { display: inline; }
        /* Sidebar section toggles */
        .sidebar-section-toggle { display: flex; }
        .sidebar-section-body.collapsed { display: none; }
        /* Mobile-only accordion for sections */
        .proj-sections-toggle { display: none; }
        .proj-share-qr-label { display: inline; }
        /* Views widget — hover to reveal count on desktop */
        .proj-views-count { opacity: 0; max-width: 0; overflow: hidden; transition: opacity 0.18s, max-width 0.18s; }
        .proj-views-widget:hover .proj-views-count,
        .proj-views-widget.expanded .proj-views-count { opacity: 1; max-width: 80px; }
        @media (max-width: 860px) {
          /* Edit button proportional to mobile title */
          .proj-edit-inline { width: 36px !important; height: 36px !important; border-radius: 9px !important; }
          .proj-h1-row { margin-bottom: 6px !important; gap: 8px !important; align-items: center !important; }
          .proj-tagline { margin-top: 4px !important; margin-bottom: 14px !important; font-size: 15px !important; }
          /* AI FAB hidden on mobile/tablet — AI card in body is sufficient */
          .proj-ai-fab { display: none !important; }
          .proj-ai-fab-label { display: none !important; }
          /* QR code centered on mobile */
          .proj-share-qr { align-self: center !important; }
          /* Completude + tips: full-width stacked on tablet */
          .proj-completude-grid { display: flex !important; flex-direction: column; gap: 12px; }
          .proj-sections-toggle {
            display: flex !important;
            align-items: center; gap: 14px; text-align: left;
            width: 100%; background: ${colors.card};
            border: 1px solid ${colors.borderBright};
            border-radius: 14px; padding: 16px 20px;
            cursor: pointer; font-family: inherit;
            margin-bottom: 12px;
            transition: background 0.15s;
          }
          .proj-sections-toggle:active { background: ${colors.cardHover} !important; }
          .proj-sections-body.collapsed { display: none !important; }
          .proj-nav-btns     { display: none !important; }
          /* FABs visible on mobile (no sidebar available) */
          .proj-fab-area     { display: flex !important; }
          .proj-ai-fab       { display: flex !important; }
          /* Defense FAB — pill com label no tablet */
          .proj-fab-defense-label { display: inline !important; }
          /* Invite button: icon only on tablet */
          .proj-invite-label { display: none !important; }
          /* Author: centered on tablet/mobile */
          .proj-author-bottom {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .proj-author-bottom > div[style*="flex: 1"] { text-align: center; }
          .proj-author-links { justify-content: center !important; }
          /* Body gap override on tablet */
          .proj-body { gap: 14px; }
          .proj-share-qr-label { display: none; }
        }
        @media (max-width: 600px) {
          .proj-wrap         { padding: 0 14px calc(60px + env(safe-area-inset-bottom, 0px)) !important; overflow-x: hidden !important; }
          .proj-cover        { height: 180px !important; margin-top: 0 !important; border-radius: 12px !important; }
          .proj-hero         { padding: 16px 0 12px !important; }
          .proj-h1           { font-size: 32px !important; }
          .proj-score-abs    { display: none !important; }
          .proj-dashboard    { display: flex !important; }
          /* Título, subtítulo e identidade centrados — mais elegante que
             tudo alinhado à esquerda numa hero já sem CTA a dominar. */
          .proj-h1-row       { justify-content: center !important; text-align: center; }
          .proj-tagline      { font-size: 14px !important; margin-bottom: 12px !important; text-align: center !important; margin-left: auto !important; margin-right: auto !important; }
          .proj-card-pad, .proj-card { padding: 14px 16px !important; border-radius: 12px !important; }
          /* Tipo de projeto e tags saem do herói no telemóvel: são metadados,
             e estavam a empurrar o título para baixo da dobra.
             A linha de identidade FICA — escondê-la tirava a um visitante que
             chega de um link partilhado a única resposta a "quem fez isto?".
             Fica compacta, numa linha, sem quebrar. */
          .proj-badges       { display: none !important; }
          .proj-identity-row {
            gap: 6px !important;
            margin-bottom: 14px !important;
            font-size: 12px;
            overflow-x: auto;
            flex-wrap: nowrap !important;
            justify-content: center !important;
            scrollbar-width: none;
          }
          .proj-identity-row::-webkit-scrollbar { display: none; }
          .proj-identity-row > span { white-space: nowrap; flex-shrink: 0; }
          /* Tighter hero on mobile */
          .proj-hero { padding: 10px 0 6px !important; }
          /* Ginásio/Outro (a linha de identidade, sem o nome — já não faz
             sentido no meio do título e do subtítulo) sobe para cima do
             título, e o score fica mais compacto logo a seguir. */
          .proj-hero-content { display: flex !important; flex-direction: column; }
          .proj-identity-row { order: -1; margin-bottom: 8px !important; }
          .proj-type-badge-mobile { display: inline-flex !important; }
          .proj-cover-edit-fab { display: flex !important; }
          .proj-views-widget-desktop { display: none !important; }
          .proj-dashboard { align-items: center; text-align: center; }
          .proj-dashboard > div { justify-content: center !important; }
          /* Highlights: stack on mobile */
          .proj-highlights-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          /* Mini dashboard inner grids: 2 cols on mobile */
          .proj-mini-dash > div[style*="grid"] { grid-template-columns: 1fr 1fr !important; }
          /* Mobile: AI FAB hidden, Defense FAB circular */
          .proj-ai-fab       { display: none !important; }
          .proj-ai-fab-label { display: none !important; }
          .proj-fab-defense-label { display: none !important; }
          .proj-fab-defense { display: none !important; }
          /* Invite: icon only on mobile */
          .proj-invite-label { display: none !important; }
          /* Author: centered on mobile */
          .proj-author-bottom {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .proj-author-bottom-text { text-align: center; }
          .proj-author-links { justify-content: center !important; }
          /* Body gap on mobile */
          .proj-body { gap: 0; padding-top: 8px; }
          /* Sidebar hidden on mobile — content moves into tabs */
          .proj-sidebar { display: none !important; }
          /* Sem sidebar no telemóvel, o card "Data de defesa" fica um
             botão compacto que abre um popup, em vez do card inteiro. */
          .proj-defense-mobile-btn { display: flex !important; }
          /* In Explorar tab: always show sections, hide the toggle button */
          .proj-mobile-active .proj-sections-toggle { display: none !important; }
          .proj-mobile-active .proj-sections-body.collapsed { display: flex !important; flex-direction: column; gap: 12px; }
          /* Percurso e Comentários usam os 32px de padding lateral no
             desktop para respirar dentro de um layout mais largo; no
             mobile isso só os deixava mais estreitos que o card de
             Missões ao lado. Aqui ficam à mesma largura, sem padding
             próprio — herdam o inset do .proj-body como tudo o resto. */
          .proj-timeline-wrap, .proj-comments-wrap { padding-left: 0 !important; padding-right: 0 !important; }
          /* Mesmo espaçamento entre todos os cards empilhados de "Melhorar"
             (score, missões, percurso, comentários) — cada um tinha a sua
             própria margem improvisada e ficavam a distâncias diferentes
             umas das outras. .ptl-card tem margem própria (8px/14px) usada
             no resto da app; aqui é anulada a favor do valor único. */
          .proj-timeline-wrap { margin-bottom: 14px; }
          .proj-timeline-wrap .ptl-card { margin: 0 !important; }
          /* Linha de separação entre Percurso e Comentários — os dois cards
             ficavam encostados sem nenhuma quebra visual entre eles. */
          .proj-comments-wrap { border-top: 1px solid var(--color-border); padding-top: 14px !important; }
          .proj-comments-wrap > div:first-child { padding-top: 0 !important; }
          /* proj-body comes before sidebar on mobile */
          .proj-body   { order: 2 !important; }
          /* Tab bar — pílula com fundo a deslizar, como o resto do editor
             (workspace usa o mesmo padrão), em vez de texto solto com
             sublinhado — três separadores fixos não precisam de scroll. */
          .proj-mobile-tabs {
            display: flex !important;
            margin: 0 -14px 16px;
            padding: 10px 14px;
            position: sticky;
            top: 62px;
            background: var(--color-bg);
            z-index: 10;
            flex-shrink: 0;
          }
          /* Três separadores fixos, sempre a dividir a barra toda —
             ao contrário da variante "compact" por omissão (que dá só o
             espaço que o conteúdo pede, para caber tabs de tamanhos
             desiguais como as do editor de projeto). */
          .proj-mobile-segtabs { width: 100%; background: var(--color-bg-alt); }
          .proj-mobile-segtabs .seg-btn { flex: 1; }
          /* Tab content sections */
          .proj-mobile-section { display: none !important; }
          .proj-mobile-active  { display: flex !important; flex-direction: column; gap: 10px; }
          /* Sem barra de separadores (visitante): tudo num scroll só. */
          .proj-body--flat .proj-mobile-section { display: flex !important; flex-direction: column; gap: 10px; }
          .proj-body--flat .proj-sections-toggle { display: none !important; }
          .proj-body--flat .proj-sections-body.collapsed { display: flex !important; flex-direction: column; gap: 12px; }
          /* A barra vive por cima do conteúdo e por baixo da nav do topo. */
          .proj-mobile-tabs { top: 62px; }
          /* Mobile-only items hidden on desktop — shown inside active tabs on mobile */
          .proj-mobile-only { display: block; }
        }
        @media (min-width: 601px) {
          .proj-mobile-tabs { display: none !important; }
          .proj-mobile-section { display: contents; }
          .proj-mobile-only { display: none !important; }
        }
        @media (max-width: 600px) {
          .proj-coach-fab { display: none !important; }
          .proj-coach-panel { display: none !important; }
          .proj-ia-mobile-fab { display: flex !important; }
        }
        @media (min-width: 601px) {
          .proj-ia-mobile-fab { display: none !important; }
        }
        body.pv-active .proj-ia-mobile-fab { display: none !important; }
        @media (min-width: 701px) {
          .proj-coach-panel { width: 280px !important; right: 20px !important; }
        }
        ${viewAsPublic ? `
          /* ── Preview mode no desktop: a sidebar fica visível (o dono
             continua a navegar a app por ela) — .pv-outer já desloca o
             conteúdo para a deixar livre, por isso a .top-nav de cima
             ficava a duplicar a navegação. No mobile não há sidebar
             nenhuma a substituir isto, por isso a navbar de cima
             (logo + hamburguer) continua a aparecer. ── */
          @media (min-width: 601px) {
            .top-nav        { display: none !important; }
          }
          .bottom-nav       { display: none !important; }
        ` : ''}
      `}</style>

      {defenseMode && (
        <Suspense fallback={null}>
          <DefenseMode
            project={{ ...project, journal: projectJournalEntries, teacher_feedback: teacherFeedback }}
            isOwner={isOwner}
            collaboratorSections={collaboratorSections}
            onClose={() => setDefenseMode(false)}
          />
        </Suspense>
      )}

      {showStoryModal && <ShareStoryModal project={project} onClose={() => setShowStoryModal(false)} />}

      {showConfetti && <Confetti />}
      <Toast message={toast.message} visible={toast.visible} />


      {/* ── Launch overlay (shown once after project creation) ── */}
      {showLaunchOverlay && project && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            background: 'color-mix(in srgb, var(--color-bg) 72%, transparent)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={() => { setShowLaunchOverlay(false); window.history.replaceState({}, ''); if (tourPendingRef.current) { tourPendingRef.current = false; setShowTour(true) } }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              padding: '36px 32px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Check size={22} color="var(--color-success)" />
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--color-text)',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}>
                O teu projeto está no ar
              </h2>
            </div>

            {location.state?.clearedFields?.length > 0 ? (
              <p style={{
                margin: '0 0 24px',
                fontSize: 14,
                color: 'var(--color-warning)',
                lineHeight: 1.6,
                background: 'var(--color-warning-subtle)',
                border: '1px solid var(--color-warning-subtle)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                A IA não tinha a certeza sobre {location.state.clearedFields.join(', ')} — ficou em branco. Preenche quando quiseres.
              </p>
            ) : (
              <p style={{
                margin: '0 0 24px',
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                Partilha com alguém que importa.
              </p>
            )}

            {/* URL copy field */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                readOnly
                value={`${window.location.origin}/projeto/${project.slug}`}
                style={{
                  flex: 1,
                  background: 'var(--color-bg-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'monospace',
                  outline: 'none',
                  cursor: 'text',
                  minWidth: 0,
                }}
                onFocus={e => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/projeto/${project.slug}`)
                  setLaunchCopied(true)
                  setTimeout(() => setLaunchCopied(false), 2500)
                }}
                style={{
                  background: launchCopied ? 'var(--color-success-subtle)' : 'var(--color-bg-alt)',
                  border: `1px solid ${launchCopied ? 'var(--color-success-subtle)' : 'var(--color-border)'}`,
                  borderRadius: 10,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  color: launchCopied ? 'var(--color-success)' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {launchCopied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* CTA button */}
            <button
              onClick={() => { setShowLaunchOverlay(false); window.history.replaceState({}, ''); if (tourPendingRef.current) { tourPendingRef.current = false; setShowTour(true) } }}
              style={{
                display: 'block',
                width: '100%',
                background: 'var(--color-text)',
                border: 'none',
                borderRadius: 10,
                padding: '13px 24px',
                color: 'var(--color-bg)',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Ver a minha página
            </button>

            {!user && (
              <div style={{
                marginTop: 18, paddingTop: 18,
                borderTop: '1px solid var(--color-border)',
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Criaste este projeto sem conta. Se perderes o link, não há forma de o recuperar.
                  Cria uma conta para o guardar.
                </p>
                <button
                  onClick={() => navigate('/register', { state: { claimSlug: project.slug } })}
                  style={{
                    display: 'block', width: '100%',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '11px 24px',
                    color: 'var(--color-text)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-alt)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Criar conta e guardar projeto
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Spotlight Tour ── */}
      {showTour && (
        <ProjectTour
          isPap={isPap}
          onClose={() => { setShowTour(false); setTourMenuOpen(false) }}
          onStep={target => {
            if (window.innerWidth < 640) {
              if (target === 'missions') setMobileTab('melhorar')
              else setMobileTab('projeto')
              // Só no telemóvel: no desktop "preview" é o botão real de
              // Modo Preview, não o menu do pincel — forçar o menu mobile
              // a abrir aí é que estava a mostrar coisas de telemóvel
              // (o dropdown "Gerir projeto") por cima do layout de desktop.
              setTourMenuOpen(target === 'preview')
            } else {
              setTourMenuOpen(false)
            }
          }}
        />
      )}

      {/* ── Milestone shareable card overlay ── */}
      {milestoneCard && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => setMilestoneCard(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-primary-subtle)',
              borderRadius: 14,
              padding: '36px 32px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, var(--color-primary-subtle) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,70,229,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Icon */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {milestoneCard.score >= 90
                ? <Trophy size={52} color="var(--color-success)" />
                : milestoneCard.score >= 70
                ? <Rocket size={52} color={colors.blue} />
                : <Target size={52} color="var(--color-warning)" />}
            </div>

            {/* Title */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, position: 'relative' }}>
              Marco desbloqueado
            </div>
            <div style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-heading)', color: colors.text, letterSpacing: '-0.02em', marginBottom: 6, position: 'relative' }}>
              {milestoneCard.score} pontos!
            </div>
            <div style={{ fontSize: 15, color: colors.muted, marginBottom: 24, position: 'relative' }}>
              {project.name}
            </div>

            {/* Score badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: milestoneCard.score >= 90 ? 'var(--color-success-subtle)' : milestoneCard.score >= 70 ? 'var(--color-primary-subtle)' : 'rgba(251,191,36,0.12)',
              border: `1px solid ${milestoneCard.score >= 90 ? 'var(--color-success-subtle)' : milestoneCard.score >= 70 ? 'var(--color-primary-subtle)' : 'rgba(251,191,36,0.3)'}`,
              borderRadius: 8, padding: '6px 20px', marginBottom: 28,
              color: milestoneCard.score >= 90 ? 'var(--color-success)' : milestoneCard.score >= 70 ? colors.blue : 'var(--color-warning)',
              fontSize: 13, fontWeight: 800, position: 'relative',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {milestoneCard.tier}
            </div>

            {/* URL pill */}
            <div style={{ fontSize: 11, color: colors.subtle, marginBottom: 24, position: 'relative' }}>
              showo.vercel.app/p/{project.slug}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/${project.slug}`)
                  triggerToast('Link copiado!')
                  setMilestoneCard(null)
                }}
                style={{
                  flex: 1,
                  background: 'var(--color-primary)',
                  border: 'none', borderRadius: 10,
                  padding: '13px 0', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px var(--color-primary-subtle)',
                }}
              >
                Copiar link
              </button>
              <button
                onClick={() => setMilestoneCard(null)}
                style={{
                  flex: 1,
                  background: 'var(--color-surface-hover)',
                  border: `1px solid ${colors.border}`, borderRadius: 10,
                  padding: '13px 0', color: colors.muted,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Register popup — shown to anonymous users after creating a project */}
      {showRegisterPopup && !user && project && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'fixed', zIndex: 701, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 540, padding: '0 16px', boxSizing: 'border-box' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 24, padding: '36px 36px 28px', boxShadow: '0 32px 100px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Rocket size={24} color="var(--color-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>Estás a ir bem!</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Cria uma conta gratuita para guardar o progresso e continuar a editar.</div>
                </div>
              </div>
              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {[
                  { icon: <Pencil size={16} color="var(--color-primary)" />, label: 'Editar a qualquer momento', sub: 'Volta sempre que quiseres para atualizar o projeto.' },
                  { icon: <Globe size={16} color="var(--color-accent)" />, label: 'Partilhar com um link', sub: 'Envia o link a recrutadores, professores e amigos.' },
                  { icon: <Star size={16} color="var(--color-warning)" />, label: 'Guardar permanentemente', sub: 'O projeto fica na tua conta, seguro e sempre acessível.' },
                ].map(({ icon, label, sub }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Warning */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                <AlertTriangle size={14} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Sem conta, se perderes este link não há como recuperar o projeto.</span>
              </div>
              {/* CTA */}
              {!registerPopupConfirm ? (
                <>
                  <button
                    onClick={() => navigate('/register', { state: { claimSlug: project.slug } })}
                    style={{ display: 'block', width: '100%', background: 'var(--color-primary)', border: 'none', borderRadius: 12, padding: '14px 24px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 24px var(--color-primary-subtle)', marginBottom: 10 }}
                  >
                    Criar conta gratuita →
                  </button>
                  <button
                    onClick={() => {
                      if (anonEditCount >= 3) {
                        setShowRegisterPopup(false)
                        setViewAsPublic(true)
                      } else {
                        setRegisterPopupConfirm(true)
                      }
                    }}
                    style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' }}
                  >
                    {anonEditCount >= 3 ? 'Ver projeto sem editar' : 'Continuar sem conta'}
                  </button>
                </>
              ) : (
                <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 14, padding: '18px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-error)', marginBottom: 4 }}>Tens a certeza?</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>O projeto será <strong style={{ color: 'var(--color-text)' }}>eliminado permanentemente</strong>. Esta ação não pode ser desfeita.</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem(`edit_token_${project.slug}`)
                        if (token) await supabase.rpc('delete_anon_project', { p_slug: project.slug, p_token: token })
                        localStorage.removeItem(`edit_token_${project.slug}`)
                        navigate('/')
                      }}
                      style={{ flex: 1, background: 'var(--color-error)', border: 'none', borderRadius: 10, padding: '11px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Sim, eliminar
                    </button>
                    <button
                      onClick={() => setRegisterPopupConfirm(false)}
                      style={{ flex: 1, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '11px 0', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* AI Feedback Modal */}
      {aiModalOpen && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--sp-4)',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setAiModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${colors.borderBright}`,
              borderRadius: 14,
              padding: '28px',
              maxWidth: 660,
              width: '100%',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              boxShadow: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--sp-5)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', color: 'var(--color-text)' }}>Análise da IA</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Só existe "Reanalisar" aqui — a primeira análise faz-se
                    pelo botão principal no corpo do modal, para não haver
                    dois CTAs a fazer a mesma coisa ao mesmo tempo. */}
                {isOwner && aiFeedback && (
                  <button
                    onClick={handleAnalyzeAI}
                    disabled={analyzingAI}
                    style={{
                      background: 'var(--color-primary-subtle)',
                      border: `1px solid ${colors.blue}30`,
                      borderRadius: 8, padding: '8px 16px',
                      color: colors.blue,
                      fontSize: 12, fontWeight: 700,
                      cursor: analyzingAI ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: 'none',
                      display: 'flex', alignItems: 'center', gap: 7,
                      opacity: analyzingAI ? 0.6 : 1,
                    }}
                  >
                    <Sparkles size={13} />
                    {analyzingAI ? 'A analisar…' : 'Reanalisar'}
                  </button>
                )}
                <button
                  onClick={() => setAiModalOpen(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer', padding: 4, display: 'flex',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'color var(--duration-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                ><X size={18} /></button>
              </div>
            </div>

            {analyzeGateMsg && <PlanGateModal message={analyzeGateMsg} onClose={() => setAnalyzeGateMsg(null)} />}
            {confirmNarrativeUse && (
              <ConfirmUseModal
                feature="narrative"
                remaining={confirmNarrativeUse.remaining}
                limit={confirmNarrativeUse.limit}
                onConfirm={doGenerateNarrative}
                onCancel={() => setConfirmNarrativeUse(null)}
              />
            )}
            {analyzeError && (
              <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 10, padding: '12px 16px', color: 'var(--color-error)', fontSize: 13, marginBottom: 16 }}>
                {analyzeError}
              </div>
            )}

            {aiFeedback && !analyzingAI && (
              <div>
                {/* Summary */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resumo</div>
                    {aiFeedback.score != null && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: aiFeedback.score >= 7 ? 'var(--color-success-subtle, #e6f9e6)' : aiFeedback.score >= 4 ? 'var(--color-warning-subtle, #fff8e1)' : 'var(--color-error-subtle, #ffeaea)', border: `1px solid ${aiFeedback.score >= 7 ? colors.green : aiFeedback.score >= 4 ? colors.yellow : colors.orange}`, borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 800, color: aiFeedback.score >= 7 ? colors.green : aiFeedback.score >= 4 ? colors.yellow : colors.orange }}>
                        {aiFeedback.score}/10
                      </div>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.6 }}>
                    {aiFeedback.overall}
                  </p>
                  {aiFeedback.score_hint && (
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: colors.blue, fontWeight: 600, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '7px 10px' }}>
                      <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{aiFeedback.score_hint}</span>
                    </div>
                  )}
                </div>

                {aiFeedback.sections && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Por secção</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8 }}>
                      {Object.entries(aiFeedback.sections).map(([key, sec]) => {
                        const LABELS = { goal: 'Objetivo', problem: 'Problema', solution: 'Solução', target_audience: 'Público-alvo', features: 'Funcionalidades', technologies: 'Tecnologias', challenges: 'Desafios', results: 'Resultados', learnings: 'Aprendizagens' }
                        const ICONS = { goal: Target, problem: AlertTriangle, solution: Wrench, target_audience: Users, features: Zap, technologies: Wrench, results: TrendingUp, learnings: BookOpen }
                        const SecIcon = ICONS[key] || CheckCircle
                        const ratingColor = sec.rating === 'forte' ? colors.green : sec.rating === 'médio' ? colors.yellow : colors.orange
                        return (
                          <div key={key} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ratingColor, flexShrink: 0 }} />
                              <SecIcon size={13} color={colors.muted} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{LABELS[key] || key}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{sec.feedback}</p>
                            {sec.tip && (
                              <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.blue, lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 5, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                                <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{sec.tip}</span>
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {analyzingAI && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '44px 24px' }}>
                <style>{`@keyframes ai-dot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>A analisar o teu projeto</span>
                  <span style={{ fontSize: 13, color: colors.muted }}>A IA avalia cada secção com detalhe. Pode demorar uns segundos.</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.blue, animation: `ai-dot 1.5s ease-in-out ${i * 0.22}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {!aiFeedback && !analyzingAI && (
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: colors.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>
                  {isOwner ? 'O que é que um recrutador acharia?' : 'Ainda sem análise'}
                </h4>
                <p style={{ color: colors.muted, fontSize: 13.5, lineHeight: 1.55, margin: '0 auto 20px', maxWidth: 380 }}>
                  {isOwner
                    ? 'Lemos o teu projeto secção a secção, tal como um júri leria, e dizemos onde estás forte, o que falta e uma nota honesta de 0 a 10.'
                    : 'O dono do projeto ainda não gerou uma análise.'}
                </p>
                {isOwner && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
                      {[
                        { Icon: Target, label: 'Nota /10' },
                        { Icon: TrendingUp, label: 'Pontos fortes' },
                        { Icon: Lightbulb, label: 'O que melhorar' },
                      ].map(({ Icon, label }) => (
                        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: colors.muted }}>
                          <Icon size={12} color={colors.blue} /> {label}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={handleAnalyzeAI}
                      style={{ backgroundImage: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'filter 0.2s ease', boxShadow: '0 6px 18px -6px rgba(219,74,61,0.4)' }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)' }}
                      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                    >
                      Analisar projeto
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* FABs — visible on tablet + mobile via CSS (hidden on desktop) */}
      <div className="proj-fab-area" style={{
        position: 'fixed', bottom: 24, right: 16,
        flexDirection: 'column', gap: 10, zIndex: 90,
        pointerEvents: 'none',
      }}>
        {/* AI Analyse FAB */}
        {isOwner && (
          <button
            className="proj-ai-fab"
            data-tour="ai"
            onClick={handleAIClick}
            title="Análise com IA"
            disabled={analyzingAI}
            style={{
              height: 52, borderRadius: 999, padding: '0 18px',
              background: '#6d28d9',
              border: 'none',
              color: '#fff', cursor: analyzingAI ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: analyzingAI ? 'none' : 'sparkle-pulse 2s ease-in-out infinite',
              opacity: analyzingAI ? 0.7 : 1,
              boxShadow: 'none',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              pointerEvents: 'auto',
            }}
          >
            <Sparkles size={20} />
            <span className="proj-ai-fab-label">{analyzingAI ? 'A analisar…' : 'Análise IA'}</span>
          </button>
        )}
        {/* Defense FAB — circular on mobile, pill with text on tablet. PAP-only,
            tal como a entrada da barra lateral — a Defesa assume um contexto
            de júri que não faz sentido fora de um projeto de PAP. */}
        {(isOwner || collaboratorSections !== null) && project.project_type === 'pap' && (
          <button
            className="proj-fab-defense"
            data-tour="defense"
            onClick={() => setDefenseMode(true)}
            title="Preparar defesa"
            style={{
              borderRadius: 999,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.4)',
              color: 'var(--color-warning)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0 18px', height: 52, minWidth: 52,
              boxShadow: 'none',
              backdropFilter: 'blur(8px)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              pointerEvents: 'auto',
            }}
          >
            <GraduationCap size={22} />
            <span className="proj-fab-defense-label">Defesa</span>
          </button>
        )}
      </div>

      <Navbar
        showCreateProject={true}
        previewEditingMobile={isOwner && viewAsPublic}
        onExitWorkspace={exitPreview}
        onSaveWorkspace={handleSaveWorkspace}
        wsSaving={wsSaving}
        wsSaved={wsSaved}
        wsSaveError={wsSaveError}
      >
        <div className="proj-nav-btns" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <>
              <button
                data-tour="diary"
                onClick={() => navigate(`/projeto/${project.slug}/diario`)}
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.18)',
                  color: '#f59e0b',
                  borderRadius: 8, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
                title="Abrir diário do projeto"
              >
                <BookOpen size={15} /> Diário
              </button>
              <button
                data-tour="edit"
                onClick={() => navigate(`/editar/${project.slug}`)}
                style={{
                  background: 'var(--color-primary-subtle)',
                  border: '1px solid var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  borderRadius: 8, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
                title="Editar projeto"
              >
                <Settings size={15} /> Editar
              </button>
            </>
          )}
          {!isOwner && collaboratorSections !== null && (
            <button
              onClick={() => navigate(`/editar/${project.slug}`)}
              style={{
                background: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary-subtle)'}
              title="Editar projeto"
            >
              <Pencil size={15} /> Editar
            </button>
          )}
        </div>
      </Navbar>

      {isOwner && !user && !claimBannerDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          flexWrap: 'wrap', padding: '10px 20px',
          background: 'var(--color-primary-subtle)', borderBottom: '1px solid var(--color-primary-subtle)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Este projeto não tem conta associada. Se perderes o link, não há forma de o recuperar.
          </span>
          <button
            onClick={() => navigate('/register', { state: { claimSlug: project.slug } })}
            style={{
              background: 'var(--color-primary)', border: 'none', borderRadius: 7,
              padding: '6px 14px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            Criar conta e guardar
          </button>
          <button
            onClick={() => setClaimBannerDismissed(true)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >
            Agora não
          </button>
        </div>
      )}

      {/* ── Public visitor view (pure visitors + owners in preview mode) ── */}
      {((!isOwner && collaboratorSections === null && !isProfessor) || ((isOwner || isProfessor) && viewAsPublic)) && (
        <PublicView
          project={project}
          ownerProfile={ownerProfile}
          isOwner={isOwner}
          isProfessor={isProfessor}
          onExitPreview={exitPreview}
          editingAppearance={openWorkspaceOnLoad}
          contentTargetField={contentTargetField}
          onSaveField={handleSaveField}
          savingField={saving}
          previewBlocks={previewBlocks}
          setPreviewBlocks={setPreviewBlocks}
          previewStyle={previewStyle}
          setPreviewStyle={setPreviewStyle}
          previewEditing={previewEditing}
          setPreviewEditing={setPreviewEditing}
          liked={liked}
          likeCount={likeCount}
          likeLoading={likeLoading}
          onLike={handleLike}
          hasInterest={hasInterest}
          interestCount={interestCount}
          interestLoading={interestLoading}
          onInterest={handleInterest}
          isRecruiterRole={isRecruiterRole}
          wsExpanded={wsExpanded}
          setWsExpanded={setWsExpanded}
          onCoverChange={url => setProject(p => ({ ...p, cover_url: url }))}
          onProjectUpdate={fields => setProject(p => ({ ...p, ...fields }))}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
        />
      )}

      {/* ── Owner / collaborator / professor view ── */}
      {(isOwner || collaboratorSections !== null || isProfessor) && !viewAsPublic && (<>

      {/* Full-width hero — cover image or rich area gradient */}
      {(() => {
        const ag = getAreaGradient(project.area)
        return (
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            {isOwner && (
              <>
                <input
                  ref={heroCoverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleHeroCoverUpload}
                />
                {/* Trocar a capa direto no banner — só no mobile; no
                    formulário de Editar Projeto (desktop) fica como estava.
                    Sem capa, vira um pill com texto — um ícone sozinho
                    sobre um gradiente vazio passava por um erro de
                    carregamento, não por um espaço por preencher. */}
                <button
                  className="proj-cover-edit-fab"
                  onClick={() => heroCoverInputRef.current?.click()}
                  disabled={coverUploading}
                  aria-label="Alterar imagem de capa"
                  style={{
                    position: 'absolute', top: 12, right: 16, zIndex: 5,
                    height: 42, borderRadius: 12,
                    width: project.cover_url ? 42 : 'auto',
                    padding: project.cover_url ? 0 : '0 16px 0 14px',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
                    display: 'none', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: coverUploading ? 'default' : 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  {coverUploading ? <Loader size={16} /> : <Camera size={16} />}
                  {!project.cover_url && !coverUploading && 'Adicionar capa'}
                </button>
              </>
            )}
            {project.cover_url ? (
              <div className="proj-cover" style={{ width: '100%', height: 320, position: 'relative' }}>
                <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {/* Strong dark gradient overlay for text legibility */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%)` }} />
              </div>
            ) : (
              <div style={{
                width: '100%', height: 260,
                background: `linear-gradient(160deg, ${ag.g1} 0%, ${ag.g2} 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Large ambient glow blobs */}
                <div style={{ position: 'absolute', top: -80, left: '-5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent1}22 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -40, right: '-5%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent2}18 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent1}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
                {/* Fade to page background at bottom */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, var(--color-bg) 100%)' }} />
              </div>
            )}
          </div>
        )
      })()}

      <div className="proj-wrap page-content-wide" style={{ overflowX: 'clip', paddingTop: 24 }}>

        {/* Two-column layout: main content + sticky sidebar */}
        <div className="proj-layout">
        <div className="proj-main">

        {/* Hero */}
        <div className="proj-hero" style={{ padding: '24px 0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div className="proj-hero-content" style={{ flex: 1, minWidth: 0 }}>

          {/* Badges + invite */}
          {(() => {
            const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
            return (
              <div className="proj-badges" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (
                  <span style={{
                    color: hero.c1,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {hero.Icon && <hero.Icon size={12} />} {PROJECT_TYPE_LABELS[project.project_type].toUpperCase()}
                  </span>
                )}
                {project.area && (
                  <>
                    {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && <span style={{ color: colors.subtle, fontSize: 12 }}>·</span>}
                    <span style={{ color: colors.blue, fontSize: 12, fontWeight: 600 }}>
                      {project.area}
                    </span>
                  </>
                )}

                {/* Tags */}
                {project.tags && project.tags.length > 0 && project.tags.map((tag, i) => (
                  <span key={tag} style={{ color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(i > 0 || project.area || (project.project_type && PROJECT_TYPE_LABELS[project.project_type])) && <span style={{ color: colors.subtle }}>·</span>}
                    {tag}
                  </span>
                ))}

                {/* Invite collaborator — owner only */}
                {isOwner && !showInvite && (
                  <button
                    onClick={() => { setShowInvite(true); document.body.style.overflow = 'hidden' }}
                    title="Convida o teu colega"
                    data-tour="invite"
                    className="proj-invite-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8, padding: '5px 12px',
                      color: colors.subtle, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.muted }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.subtle }}
                  >
                    <UserPlus size={13} />
                    <span className="proj-invite-label">Convida o teu colega</span>
                  </button>
                )}

                {/* Invite modal — portal so position:fixed is never broken by ancestor transforms */}
                {isOwner && showInvite && createPortal(
                  <div onClick={e => e.target === e.currentTarget && closeInviteModal()} style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                    fontFamily: 'var(--font-body)',
                  }}>
                    <style>{`@keyframes ppInvFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
                    <div style={{
                      background: 'var(--color-surface)', border: `1px solid ${colors.border}`,
                      borderRadius: 16, width: '100%', maxWidth: 420,
                      boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                      animation: 'ppInvFade 0.2s ease',
                    }}>
                      {/* Header — neutro (preto/branco), como o resto da app
                          desde o redesign; o azul fica reservado para o
                          accent do projeto, não para cada ícone decorativo. */}
                      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserPlus size={15} color={colors.text} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>Convidar colaborador</div>
                            <div style={{ fontSize: 12, color: colors.muted }}>Pesquisa pelo nome ou username</div>
                          </div>
                        </div>
                        <button onClick={closeInviteModal} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><X size={17} /></button>
                      </div>
                      {/* Body */}
                      <form onSubmit={handleInvite} style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            value={inviteInput}
                            onChange={handleInviteSearchInput}
                            onFocus={e => { if (inviteSearchResults.length) setInviteShowDropdown(true); e.target.style.borderColor = colors.text }}
                            onBlur={e => { e.target.style.borderColor = colors.border; setTimeout(() => setInviteShowDropdown(false), 150) }}
                            placeholder="Pesquisar utilizador..."
                            style={{
                              width: '100%', background: 'var(--color-input-bg)', border: `1.5px solid ${colors.border}`,
                              borderRadius: 10, padding: '12px 14px', color: colors.text,
                              fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                              transition: 'border-color 0.2s, box-shadow 0.2s',
                            }}
                          />
                          {inviteShowDropdown && inviteSearchResults.length > 0 && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                              background: 'var(--color-surface)', border: `1.5px solid ${colors.border}`,
                              borderRadius: 10, zIndex: 50, overflowY: 'auto', maxHeight: 280,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                            }}>
                              {inviteSearchResults.map(u => (
                                <button key={u.id} type="button" onMouseDown={() => selectInviteUser(u)} style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 14px', background: 'transparent', border: 'none',
                                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                  transition: 'background 0.12s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{
                                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                    background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 700, color: colors.text, overflow: 'hidden',
                                  }}>
                                    {u.avatar_url
                                      ? <img src={u.avatar_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover' }} />
                                      : (u.full_name || u.username || '?')[0].toUpperCase()
                                    }
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.username}</div>
                                    {u.username && <div style={{ fontSize: 12, color: colors.muted }}>@{u.username}</div>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {inviteSelectedUser && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: colors.text, flexShrink: 0, overflow: 'hidden' }}>
                              {inviteSelectedUser.avatar_url
                                ? <img src={inviteSelectedUser.avatar_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                                : (inviteSelectedUser.full_name || inviteSelectedUser.username || '?')[0].toUpperCase()
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{inviteSelectedUser.full_name || inviteSelectedUser.username}</div>
                              {inviteSelectedUser.username && <div style={{ fontSize: 11, color: colors.muted }}>@{inviteSelectedUser.username}</div>}
                            </div>
                            <Check size={15} color="var(--color-success)" />
                          </div>
                        )}

                        {inviteMsg && (
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: inviteMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
                            {inviteMsg.text}
                          </p>
                        )}

                        <button type="submit" disabled={(!inviteInput.trim() && !inviteSelectedUser) || inviting} style={{
                          width: '100%', padding: '12px', background: 'var(--color-text)', border: 'none', borderRadius: 10,
                          color: 'var(--color-bg)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          boxShadow: '0 2px 8px color-mix(in srgb, var(--color-text) 20%, transparent)',
                          opacity: (!inviteInput.trim() && !inviteSelectedUser) ? 0.5 : 1,
                          transition: 'opacity 0.15s',
                        }}>
                          {inviting ? 'A convidar…' : 'Enviar convite'}
                        </button>
                      </form>
                    </div>
                  </div>
                , document.body)}
              </div>
            )
          })()}

          {/* Title row — uses titleFont + titleStyle from previewStyle.
              O ícone de vistas vivia aqui ao lado do título, mas com o h1
              a flex:1 isso empurrava o centro visual do texto para a
              esquerda no mobile (onde o título fica centrado) — passou
              para junto do score, que já é uma linha de estado, não de
              identidade. */}
          <div className="proj-h1-row" style={{ alignItems: 'flex-start' }}>
            <h1 className="proj-h1" style={{
              fontSize: 'clamp(34px, 5.5vw, 48px)',
              fontWeight: 500,
              margin: 0,
              lineHeight: 1.08,
              letterSpacing: (previewStyle.titleStyle === 'caps') ? '0.04em' : '-0.02em',
              flex: 1,
              fontFamily: (TITLE_FONT_OPTIONS.find(f => f.key === (previewStyle.titleFont || 'croogla'))?.css) || 'var(--font-heading)',
              textTransform: previewStyle.titleStyle === 'caps' ? 'uppercase' : 'none',
              color: colors.text,
            }}>
              {project.name}
            </h1>
            {/* Views — só no desktop; no mobile passou para a linha do
                score (o h1 a flex:1 ao lado deste ícone descentrava o
                título quando a hero fica centrada no telemóvel). */}
            <div
              className={`proj-views-widget proj-views-widget-desktop${viewsExpanded ? ' expanded' : ''}`}
              onClick={() => setViewsExpanded(v => !v)}
              title={`${project.views ?? 0} visualizações`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: colors.muted, flexShrink: 0, padding: '4px 6px', borderRadius: 6, marginTop: 8 }}
            >
              <Eye size={14} color={colors.muted} />
              <span className="proj-views-count" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {project.views ?? 0}
              </span>
            </div>
          </div>

          {project.ai_tagline && (
            <p className="proj-tagline" style={{ fontSize: 20, color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: '16px 0 18px', maxWidth: 600, fontWeight: 400, letterSpacing: '-0.1px' }}>
              {project.ai_tagline}
            </p>
          )}

          {/* Student identity line — name · area · course + status badges */}
          {(project.area || project.course || project.school_year || ownerProfile?.available_for_work || project.review_status) && (
            <div className="proj-identity-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {/* Tipo do projeto (Projeto Final/PAP) — no telemóvel, os
                  badges completos ficam escondidos (.proj-badges), por
                  isso isto é o único sítio onde a etiqueta ainda aparece,
                  agora na mesma linha que a área, à esquerda. */}
              {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (() => {
                const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
                return (
                  <span className="proj-type-badge-mobile" style={{ display: 'none', alignItems: 'center', gap: 5 }}>
                    {hero.Icon && <hero.Icon size={12} color={hero.c1} />}
                    <span style={{ color: hero.c1, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
                      {PROJECT_TYPE_LABELS[project.project_type].toUpperCase()}
                    </span>
                  </span>
                )
              })()}
              {/* "Disponível" — blue briefcase icon only */}
              {ownerProfile?.available_for_work && (
                <div
                  title="Disponível para trabalho / estágio"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28,
                    background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
                    border: '1px solid var(--color-primary-subtle)',
                    borderRadius: 999,
                    cursor: 'default',
                  }}
                >
                  <Briefcase size={13} strokeWidth={2.5} />
                </div>
              )}
              {project.review_status && (() => {
                const rs = project.review_status
                const cfg = rs === 'ready_for_defense'
                  ? { tone: '34,197,94', color: 'var(--color-success)', icon: <CheckCircle size={11} strokeWidth={2.5} />, label: 'Pronto para defesa', title: 'O professor marcou este projeto como pronto para defesa' }
                  : rs === 'resubmitted'
                  ? { tone: '27,120,247', color: 'var(--color-primary)', icon: <CheckCircle size={11} strokeWidth={2.5} />, label: 'Correções enviadas', title: 'O aluno marcou as correções como feitas. Aguarda nova revisão do professor' }
                  : { tone: '249,115,22', color: 'var(--color-warning)', icon: <AlertTriangle size={11} strokeWidth={2.5} />, label: 'Precisa de revisão', title: 'O professor marcou este projeto como precisando de revisão' }
                return (
                  <div
                    title={cfg.title}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: `rgba(${cfg.tone},0.1)`,
                      color: cfg.color,
                      border: `1px solid rgba(${cfg.tone},0.25)`,
                      borderRadius: 999, padding: '4px 12px',
                      fontSize: 11, fontWeight: 700, lineHeight: 1.5,
                      cursor: 'default',
                    }}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </div>
                )
              })()}
              {/* Sem o nome do criador — já aparece no cartão de autor mais
                  abaixo (tab Partilha); repeti-lo aqui, ainda por cima ao
                  lado do "Editar", era o mesmo dado três vezes na mesma
                  página. */}
              {/* project.course vem do perfil do próprio utilizador (o que
                  ele estuda/faz), não do projeto — mostrá-lo aqui ao lado
                  da área do projeto confundia as duas coisas. */}
              {[...new Set([project.area, project.school_year])]
                .filter(Boolean)
                .map((item, i) => (
                  <span key={i} style={{ fontSize: 13, color: colors.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i > 0 && <span style={{ color: colors.subtle, fontSize: 11 }}>·</span>}
                    {item}
                  </span>
                ))}
            </div>
          )}

          {/* Cartão de estado (mobile). Era o score a dominar o cartão — anel
              de 76px, número grande, barra de progresso — e a ação (a única
              coisa que o dono precisa mesmo de fazer) ficava reduzida a um
              botão no fim, do mesmo tamanho visual que o resto. Ao abrir o
              projeto, a primeira coisa a saltar à vista era "o teu score é
              70", não "isto é o que falta fazer". Invertido: o score e o
              estado de revisão encolhem para uma linha de leitura rápida, e
              a única ação possível é que ocupa o espaço e a cor do cartão. */}
          <div className="proj-dashboard" data-tour="score" style={{
            display: 'none', flexDirection: 'column', gap: 10, marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.1px' }}>
                Score {score}<span style={{ color: colors.muted, fontWeight: 600 }}>/100</span>
              </span>
              {isOwner && project.teacher_score != null && (
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.1px' }}>
                  · Nota {project.teacher_score}<span style={{ color: colors.muted, fontWeight: 600 }}>/20</span>
                </span>
              )}
              {getProjectState(project) === 'concluido' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success-subtle)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                  <Check size={11} /> Concluído
                </span>
              )}
              {/* Review state — só aparece quando há mesmo algo a dizer (nota
                  do professor). "A ganhar forma" (o nível genérico do score)
                  foi removido: não dizia nada de novo além do próprio número. */}
              {project.review_status && (() => {
                const rs = project.review_status
                const cfg = rs === 'ready_for_defense'
                  ? { tone: '34,197,94', color: 'var(--color-success)', label: 'Pronto para defesa' }
                  : rs === 'resubmitted'
                  ? { tone: '27,120,247', color: 'var(--color-primary)', label: 'Correções enviadas' }
                  : { tone: '245,158,11', color: 'var(--color-warning)', label: 'Precisa de revisão' }
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `rgba(${cfg.tone},0.12)`, color: cfg.color, border: `1px solid rgba(${cfg.tone},0.28)`, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                )
              })()}
              {/* Views — ícone do olho, antes ao lado do título (descentrava-o
                  no mobile); aqui é uma linha de estado, é o sítio certo. */}
              <div
                className={`proj-views-widget${viewsExpanded ? ' expanded' : ''}`}
                onClick={() => setViewsExpanded(v => !v)}
                title={`${project.views ?? 0} visualizações`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: colors.muted, flexShrink: 0, padding: '4px 6px', borderRadius: 6 }}
              >
                <Eye size={14} color={colors.muted} />
                <span className="proj-views-count" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {project.views ?? 0}
                </span>
              </div>
            </div>
          </div>

          </div>{/* end left flex column */}

          {/* Score ring — right flex column — hidden from professor view */}
          {!isProfessor && (
          <div className="proj-score-abs" data-tour="score" style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingTop: 4,
          }}>
            <ScoreRing score={displayScore} size={84} />
            <div style={{
              background: level.color + '12', color: level.color,
              borderRadius: 999, padding: '3px 10px',
              fontSize: 9, fontWeight: 700, border: `1px solid ${level.color}30`,
              textAlign: 'center', maxWidth: 120, lineHeight: 1.5, letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              {level.label}
            </div>
          </div>
          )}
          </div>{/* end flex row */}
        </div>{/* end proj-hero */}

        {/* proj-body: everything after hero — ordered after sidebar on tablet/mobile */}
        <div className={`proj-body${isOwner ? '' : ' proj-body--flat'}`}>

        {/* Prova de trabalho do GitHub/BD — antes da barra de separadores,
            não depois: é um empurrão contextual sobre o próprio projeto,
            não um separador de navegação, e ficava perdido lá abaixo. */}
        <DbSetupNudge project={project} isOwner={isOwner} />
        <GithubProof project={project} />
        <ApiProof project={project} />

        {/* ── Separadores mobile — só para o dono ──
            Quem chega de um link partilhado não quer navegar num produto:
            quer ler um projeto. Para visitantes, a página é um scroll só
            (a CSS trata de mostrar todas as secções quando não há barra). */}
        {isOwner && (
          <div className="proj-mobile-tabs" style={{ display: 'none' }}>
            <SegmentedTabs
              size="compact"
              className="proj-mobile-segtabs"
              value={mobileTab}
              onChange={id => {
                setMobileTab(id)
                if (id === 'projeto') setSectionsOpen(true)
              }}
              options={[
                { id: 'projeto',  label: 'Projeto',  icon: <BookOpen size={14} />, pillColor: '#fff', activeColor: '#111' },
                // "Melhorar" é a única tab de ação; Projeto e Partilha são de
                // leitura e não precisam de puxar o azul da marca para cima delas.
                { id: 'melhorar', label: 'Melhorar', icon: <Sparkles size={14} />, dataTour: 'missions', pillColor: 'var(--color-primary)', activeColor: '#fff' },
                { id: 'partilha', label: 'Partilha', icon: <Globe size={14} />, pillColor: '#fff', activeColor: '#111' },
              ]}
            />
          </div>
        )}

        {/* ── TAB: melhorar — mini-dashboard + completude + tips ── */}
        <div className={`proj-mobile-section${tabActive('melhorar') ? ' proj-mobile-active' : ''}`}>

        {/* Ação principal — a única coisa que importa decidir aqui. Vivia
            na hero, duplicando a própria razão de existir desta tab; agora
            é a primeira coisa que se vê ao entrar em "Melhorar". 100% das
            missões não é o mesmo que "não há nada por fazer": um campo
            pode ter só o texto do rascunho e a missão conta como feita na
            mesma. E quando estrutura + conteúdo estão mesmo feitos, a ação
            passa a ser pedir ajuda à IA para aprofundar — nunca fica sem
            nenhuma ação. */}
        {isOwner && (completedCount < CHALLENGES.length ? (
          <button
            onClick={() => {
              // Abre o dropdown, não só desloca até lá — arrastar o dono
              // para uma secção que continua fechada não é "ver o que
              // melhorar", é só um scroll sem propósito.
              setMissionsOpenMobile(true)
              requestAnimationFrame(() => {
                document.getElementById('missions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              })
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-subtle)',
              borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600,
              letterSpacing: '-0.1px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4,
            }}
          >
            Ver o que melhorar
            <span style={{ fontWeight: 500, opacity: 0.75 }}>· {CHALLENGES.length - completedCount} {CHALLENGES.length - completedCount === 1 ? 'campo' : 'campos'}</span>
          </button>
        ) : placeholderFieldCount > 0 ? (
          <button
            onClick={() => setMobileTab('projeto')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', background: 'var(--color-warning-subtle)', color: 'var(--color-warning)',
              border: '1px solid var(--color-warning-subtle)',
              borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800,
              letterSpacing: '-0.2px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4,
            }}
          >
            <Lightbulb size={17} />
            Acabar de preencher o projeto
            <span style={{ fontWeight: 600, fontSize: 12.5, opacity: 0.85 }}>· {placeholderFieldCount} {placeholderFieldCount === 1 ? 'secção' : 'secções'}</span>
          </button>
        ) : (
          <button
            onClick={() => setMobileTab('ia')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-subtle)',
              borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800,
              letterSpacing: '-0.2px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4,
            }}
          >
            <Bot size={17} />
            Pedir ajuda à IA para aprofundar
          </button>
        ))}

        {/* ── Owner mini-dashboard: defense / AI analysis / report ── */}
        {isOwner && (() => {
          const today = new Date(); today.setHours(0,0,0,0)
          const target = defenseDate ? new Date(defenseDate + 'T00:00:00') : null
          const daysLeft = target ? Math.ceil((target - today) / 86400000) : null
          const urgentColor = daysLeft != null && daysLeft <= 7 ? 'var(--color-error)' : daysLeft != null && daysLeft <= 30 ? 'var(--color-warning)' : 'var(--color-primary)'

          const miniCardBase = {
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
            cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left', transition: 'all 0.15s',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-alt)',
          }

          return (
            <div className="proj-mini-dash" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>

            {/* ── Actionable now ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>

              {/* Teacher flagged revisions — student confirms when done.
                  First in the grid so it's the first thing the student sees.
                  Spam-proof by design: mark_project_resubmitted only works while
                  review_status = 'needs_revision', so one notification per flag. */}
              {project.review_status === 'needs_revision' && (
                <button
                  onClick={handleMarkResubmitted}
                  disabled={resubmitting}
                  style={{ ...miniCardBase, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', opacity: resubmitting ? 0.6 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-warning-subtle)'; e.currentTarget.style.borderColor = 'var(--color-warning-subtle)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-warning-subtle)'; e.currentTarget.style.borderColor = 'var(--color-warning-subtle)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={13} color="var(--color-warning)" />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}>Revisão pedida</div>
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>
                    {resubmitting ? 'A notificar o professor…' : 'Já corrigiste? Marca como feito'}
                  </div>
                </button>
              )}
              {project.review_status === 'resubmitted' && (
                <div style={{ ...miniCardBase, cursor: 'default', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={13} color="var(--color-primary)" />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>Correções enviadas</div>
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>
                    O professor vai rever em breve
                  </div>
                </div>
              )}

            </div>{/* end actionable grid */}

            {/* Data de defesa — card completo vive na sidebar (desktop/
                tablet, em cima da Completude); no telemóvel, sem sidebar,
                fica este botão discreto que abre um popup com a data. */}
            {isPap && (
              <button
                className="proj-defense-mobile-btn"
                onClick={() => setShowDefensePopup(true)}
                style={{
                  display: 'none', alignItems: 'center', gap: 8, width: '100%',
                  background: `${defenseUrgentColor}0d`, border: `1px solid ${defenseUrgentColor}30`,
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <Calendar size={14} color={defenseUrgentColor} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: defenseDaysLeft != null && defenseDaysLeft <= 7 ? 'var(--color-error)' : colors.text }}>
                  {defenseLabel}
                </span>
                <ChevronRight size={14} color={colors.subtle} style={{ flexShrink: 0 }} />
              </button>
            )}
            </div>
          )
        })()}

        {/* Popup "Data de defesa" — telemóvel (sem sidebar). Mesmo estilo
            minimalista dos outros popups da página (QR code, análise IA). */}
        {showDefensePopup && createPortal(
          <div
            onClick={() => setShowDefensePopup(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: colors.card, border: `1px solid ${colors.borderBright}`,
                borderRadius: 14, padding: '24px 26px',
                display: 'flex', flexDirection: 'column', gap: 16,
                maxWidth: 320, width: '100%', position: 'relative',
              }}
            >
              <button
                onClick={() => setShowDefensePopup(false)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'var(--color-surface-hover)', border: `1px solid ${colors.border}`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.muted }}
              ><X size={14} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${defenseUrgentColor}15`, border: `1px solid ${defenseUrgentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color={defenseUrgentColor} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: defenseDaysLeft != null && defenseDaysLeft <= 7 ? 'var(--color-error)' : colors.text }}>
                  {defenseLabel}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={defenseDate}
                  onChange={e => handleSaveDefenseDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--color-surface)', border: `1px solid ${colors.border}`,
                    borderRadius: 8, padding: '10px 12px', color: colors.text,
                    fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                    colorScheme: theme === 'light' ? 'light' : 'dark',
                  }}
                />
                {savingDefense && <div style={{ position: 'absolute', top: 12, right: 12, width: 12, height: 12, border: `1.5px solid ${colors.border}`, borderTop: `1.5px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* AI Analysis teaser for non-owners */}
        {!isOwner && profile?.role !== 'professor' && (
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Bot size={20} color={colors.blue} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: colors.muted, lineHeight: 1.55 }}>
                Cria o teu projeto e recebe análise por IA com feedback personalizado.
              </p>
              <button
                onClick={() => navigate('/novo')}
                style={{
                  background: 'var(--color-accent)',
                  border: 'none', borderRadius: 8, padding: '7px 16px',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px var(--color-accent-subtle)',
                }}
              >
                <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile-only: completude — a clean, tappable checklist of what to fix to
            raise the score. Each incomplete field links straight to the editor. */}
        {isOwner && (() => {
          const fq = PROFILE_SCORE_FIELDS.map(f => {
            const val = String(project[f.key] || '').trim()
            const quality = val.length === 0 ? 'empty' : val.length < f.minLen ? 'short' : 'good'
            return { ...f, quality }
          })
          const goodCount = fq.filter(f => f.quality === 'good').length
          const pct = Math.round((goodCount / fq.length) * 100)
          return (
            <div className="proj-mobile-only proj-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
              <button
                onClick={() => setScoreOpen(o => !o)}
                style={{
                  display: 'flex', flexDirection: 'column', width: '100%',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  padding: '15px 16px 14px', borderBottom: scoreOpen ? `1px solid ${colors.border}` : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: colors.text }}>Como subir o score</div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                      {pct === 100 ? 'Perfil completo — bom trabalho.' : `${goodCount} de ${fq.length} campos · toca para editar`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>{pct}%</span>
                    <ChevronDown size={16} color={colors.muted} style={{ transition: 'transform 0.22s', transform: scoreOpen ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>
                <div style={{ height: 6, background: progTrack(pct), borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: progBar(pct), transition: 'width 0.5s' }} />
                </div>
              </button>
              {scoreOpen && <div>
                {fq.map((f, i) => {
                  const done = f.quality === 'good'
                  const tagColor = f.quality === 'short' ? 'var(--color-warning)' : 'var(--color-primary)'
                  return (
                    <button
                      key={f.key}
                      onClick={() => { if (!done) navigate(`/editar/${project.slug}`) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                        padding: '11px 16px', background: 'none', border: 'none',
                        borderTop: i === 0 ? 'none' : `1px solid ${colors.border}`,
                        cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--color-primary-subtle)' : f.quality === 'short' ? 'var(--color-warning-subtle)' : 'var(--color-bg-alt)', border: done ? 'none' : `1px solid ${colors.border}` }}>
                        {done ? <Check size={12} color="var(--color-primary)" strokeWidth={3} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: f.quality === 'short' ? 'var(--color-warning)' : colors.subtle }} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: done ? 500 : 600, color: done ? colors.muted : colors.text }}>{f.label}</span>
                      {!done && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: tagColor, background: `${tagColor}1f`, borderRadius: 999, padding: '2px 9px' }}>
                          {f.quality === 'short' ? 'Curto' : 'Em falta'}
                        </span>
                      )}
                      {!done && <ChevronRight size={15} color={colors.subtle} style={{ flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>}
            </div>
          )
        })()}

        </div>{/* end melhorar tab section */}

        {/* ── TAB: historia — PAP details (a narrativa AI foi cortada: decisão do Bruno/Gustavo — texto gerado, não o conteúdo real do dono) ── */}
        <div className={`proj-mobile-section${tabActive('historia') ? ' proj-mobile-active' : ''}`}>

        {/* PAP details */}
        {isPap && (project.pap_supervisor || project.pap_date) && (
          <div className="proj-card-pad proj-card" style={{ background: colors.yellowGlow, border: '1px solid var(--color-warning-subtle)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: colors.yellow, textTransform: 'uppercase', letterSpacing: 0.8 }}>Detalhes da PAP</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {project.pap_supervisor && (
                <div>
                  <div style={{ fontSize: 11, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Orientador</div>
                  <div style={{ fontSize: 15, color: colors.text, fontWeight: 500 }}>{project.pap_supervisor}</div>
                </div>
              )}
              {project.pap_date && (
                <div>
                  <div style={{ fontSize: 11, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Apresentação</div>
                  <div style={{ fontSize: 15, color: colors.text, fontWeight: 500 }}>{project.pap_date}</div>
                </div>
              )}
            </div>
          </div>
        )}

        </div>{/* end historia tab section */}

        {/* ── TAB: explorar — sections accordion ── */}
        <div className={`proj-mobile-section${tabActive('explorar') ? ' proj-mobile-active' : ''}`}>

        {/* Project sections — accordion on mobile/tablet, always visible on desktop */}
        <button
          className="proj-sections-toggle"
          onClick={() => setSectionsOpen(o => !o)}
        >
          <BookOpen size={18} color={colors.blue} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Explorar o projeto</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Problema · Solução · Resultados · e mais</div>
          </div>
          <ChevronDown size={16} color={colors.muted} style={{ flexShrink: 0, transition: 'transform 0.22s', transform: sectionsOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        <div className={`proj-sections-body${sectionsOpen ? '' : ' collapsed'}`}>
          {(() => {
            const canEditField = fk => isOwner || (collaboratorSections !== null && (collaboratorSections.length === 0 || collaboratorSections.includes(fk)))
            // Um grupo só entra na barra de saltos se tiver alguma coisa para
            // ler, ou se o dono ainda puder vir a preenchê-lo — a um visitante
            // não se oferece um salto para uma secção vazia que nunca vai ver.
            const relevantGroups = SECTION_GROUPS.filter(g =>
              g.fields.some(fk => (project[fk] || '').trim().length > 0 || canEditField(fk))
            )
            return (
              <>
                {relevantGroups.length > 1 && (
                  <div className="proj-anchor-nav">
                    {relevantGroups.map(g => (
                      <button
                        key={g.id}
                        className="proj-anchor-chip"
                        onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
                {SECTION_GROUPS.map(group => (
                  <div key={group.id} id={group.id} className="proj-section-group">
                    <div className="proj-section-group-label">{group.label}</div>
                    <div className="proj-section-group-body">
                      {group.fields.map(fk => (
                        <Section key={fk} fieldKey={fk} content={project[fk]} isOwner={isOwner}
                          canEdit={canEditField(fk)}
                          highlight={fk === 'results'}
                          onImprove={openContentEditor} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )
          })()}
        </div>

        {/* Estado — no fundo, depois de todo o conteúdo, não no topo antes
            de o dono ver seja o que for. Um botão grande logo à entrada
            dizia "isto devia estar concluído" antes de ter havido tempo de
            rever nada; aqui é um gesto discreto de fim de revisão, não uma
            declaração. Continua editável depois de concluído, só deixa de
            aparecer como "em construção" na Biblioteca. */}
        {isOwner && (
          <button
            onClick={toggleProjectState}
            disabled={stateSaving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              margin: '18px auto 4px', background: 'none',
              border: `1px solid ${getProjectState(project) === 'concluido' ? 'var(--color-success-subtle)' : colors.border}`,
              color: getProjectState(project) === 'concluido' ? 'var(--color-success)' : colors.subtle,
              borderRadius: 99, padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
              cursor: stateSaving ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: stateSaving ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            {stateSaving ? (
              <><Loader size={13} /> A guardar...</>
            ) : getProjectState(project) === 'concluido' ? (
              <><Loader size={13} /> Concluído · toca para reabrir</>
            ) : (
              <><Check size={13} /> Marcar como concluído</>
            )}
          </button>
        )}

        </div>{/* end explorar tab section */}

        {/* ── TAB: missoes — missions ── */}
        <div className={`proj-mobile-section${tabActive('missoes') ? ' proj-mobile-active' : ''}`}>

        {/* Missions — owner only */}
        {(isOwner || collaboratorSections !== null) && (() => {
          const missionsPct = Math.round((earnedXP / totalXP) * 100)
          return (
          <div id="missions-section" data-tour="missions" className="proj-card proj-missions-card" style={{ scrollMarginTop: 88, marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          {/* Header — clicável, mesma organização do "Como subir o score":
              título + descrição à esquerda, número em destaque + seta à
              direita, barra de progresso por baixo. Eram dois cards com
              layouts completamente diferentes (um em linha, outro em coluna
              com uma caixa pesada do lado); agora leem-se como a mesma
              família. */}
          <button
            onClick={() => setMissionsOpenMobile(o => !o)}
            style={{
              display: 'flex', flexDirection: 'column', width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              padding: '15px 16px 14px', borderBottom: missionsOpenMobile ? `1px solid ${colors.border}` : 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: colors.text }}>Missões</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>{completedCount}/{CHALLENGES.length} completas</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: colors.blue, letterSpacing: '-0.5px', lineHeight: 1 }}>{earnedXP}<span style={{ fontSize: 12, fontWeight: 600, color: colors.subtle }}>/{totalXP}</span></span>
                <ChevronDown size={16} color={colors.muted} style={{ transition: 'transform 0.22s', transform: missionsOpenMobile ? 'rotate(180deg)' : 'none' }} />
              </div>
            </div>
            <div style={{ height: 6, background: progTrack(missionsPct), borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${missionsPct}%`, background: progBar(missionsPct), transition: 'width 0.6s ease-out' }} />
            </div>
          </button>

          {missionsOpenMobile && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px 16px' }}>
            {sortedChallenges.map(c => (
              <MissionRow key={c.id} challenge={c} project={project} onImprove={openContentEditor} isOwner={isOwner} />
            ))}
          </div>}
          </div>
          )
        })()}

        </div>{/* end missoes tab section */}

      {/* Percurso e Comentários deixam de ficar depois de "Criado com Showo"
          no fim da tab Projeto — não são parte do pitch do projeto, são
          sinal de progresso/engajamento, por isso mudam-se para a tab
          Melhorar no telemóvel. No desktop e para visitantes (que não têm
          separadores) o wrapper é invisível e isto continua a aparecer
          sempre, sem qualquer mudança de posição.
          Percurso e Comentários são dois <div> irmãos (não um só) para que,
          no desktop, os Comentários possam ser reordenados para depois do
          Partilhar via CSS `order` sem mexer no agrupamento por tab do
          telemóvel — os dois continuam a aparecer juntos na tab Melhorar. */}
      <div className={`proj-mobile-section${tabActive('missoes') ? ' proj-mobile-active' : ''}`}>

      {/* Divisória entre Missões e Percurso */}
      <div className="proj-section-divider" />

      {/* ── Percurso / timeline — na vista de dono/professor. Na vista pública
             (visitante ou preview) o timeline vem dentro do PublicView. ── */}
      {project && project.user_id && (isOwner || isProfessor || collaboratorSections !== null) && !viewAsPublic && (
        <div className="proj-timeline-wrap">
          <ProjectTimeline project={project} isOwner={isOwner} />
        </div>
      )}

      </div>{/* end proj-mobile-section (missoes) — Percurso */}

      {/* ── Likes + Interest + Comments — visible to ALL (owners, recruiters, visitors) ── */}
      <div className={`proj-mobile-section proj-comments-tabsec${tabActive('missoes') ? ' proj-mobile-active' : ''}`}>
      {project && (
        <div className="proj-comments-wrap">

          {/* Barra de gostos / interesse (owner view) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 8px', flexWrap: 'wrap' }}>


            {/* Contador de interesse — dono do projeto (clicável) */}
            {isOwner && interestCount > 0 && (
              <button onClick={() => setShowInterestors(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)',
                borderRadius: 10, padding: '8px 14px',
                color: 'var(--color-warning)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-warning-subtle)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-warning-subtle)' }}
              >
                <Star size={14} color="var(--color-warning)" />
                {interestCount} recrutador{interestCount !== 1 ? 'es' : ''} com interesse
              </button>
            )}
          </div>

          {/* Modal: lista de recrutadores com interesse */}
          {showInterestors && createPortal(
            <div onClick={() => setShowInterestors(false)} style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 14, padding: '28px 28px 24px', maxWidth: 440, width: '90%',
                maxHeight: '70vh', overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={18} color="var(--color-warning)" />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Recrutadores interessados</span>
                  </div>
                  <button onClick={() => setShowInterestors(false)} className="icon-btn-ghost">
                    <X size={18} />
                  </button>
                </div>
                {interestors.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Ainda nenhum recrutador.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {interestors.map(rec => (
                      <div key={rec.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--color-border)',
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {rec.avatar_url
                            ? <img src={rec.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={18} color="var(--color-text-secondary)" />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.full_name || rec.username || 'Recrutador'}
                          </div>
                          {rec.company && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{rec.company}</div>
                          )}
                        </div>
                        <a href={`/u/${rec.username || rec.id}`} style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
                          color: 'var(--color-text)', textDecoration: 'none', flexShrink: 0,
                        }}>Ver perfil</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

          {/* Comments */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '22px 24px',
          }}>
            <ProjectComments projectId={project.id} projectAuthorId={project.user_id} />
          </div>
        </div>
      )}

      </div>{/* end proj-mobile-section (missoes) — Comentários */}

        {/* ── TAB: ia — project coach chatbot (mobile) ── */}
        {/* IA — full-screen chat overlay (messages-thread style) instead of a
            loose tab section that left half the screen empty. Opened by the "IA"
            tab; the back button returns to the project.
            Portal para document.body: dentro da árvore normal, um ancestral
            qualquer com transform/filter cria um "containing block" novo e
            o `position: fixed` deixa de se ancorar ao viewport a sério —
            era por isso que a capa do projeto aparecia por cima do chat. */}
        {isOwner && mobileTab === 'ia' && createPortal(
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--color-bg)',
            height: iaViewportH ? `${iaViewportH}px` : '100dvh',
            display: 'flex', flexDirection: 'column',
            animation: 'proj-ia-sheet-in 0.28s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <style>{`@keyframes proj-ia-sheet-in { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
              <button onClick={() => setMobileTab('projeto')} aria-label="Voltar ao projeto" style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
                <ChevronLeft size={22} />
              </button>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={18} color="var(--color-primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>Assistente IA</div>
                <div style={{ fontSize: 12, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                {coachSessions.length >= 1 && (
                  <button onClick={() => setCoachSessionsOpen(v => !v)} style={{ background: coachSessionsOpen ? 'var(--color-primary-subtle)' : 'none', border: 'none', cursor: 'pointer', color: coachSessionsOpen ? colors.blue : colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 6 }} title="Conversas">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="7.25" width="12" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="11.5" width="12" height="1.5" rx=".75" fill="currentColor"/></svg>
                  </button>
                )}
                <button onClick={() => { setCoachMessages([]); setCoachSessionId(null); setCoachSessionsOpen(false); if (project?.id) localStorage.setItem(`coach_session_${project.id}`, 'new') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 6 }} title="Nova conversa">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            {/* Sessions panel (mobile) */}
            {coachSessionsOpen && (
              <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'var(--color-bg)', overflowY: 'auto', padding: '8px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 4px 12px' }}>Conversas anteriores</div>
                {coachSessions.map((sess) => {
                  const firstUserM = sess.messages.find(m => m.role === 'user')
                  const previewM = firstUserM ? firstUserM.content.slice(0, 55) + (firstUserM.content.length > 55 ? '...' : '') : 'Conversa'
                  const dateM = sess.messages[0]?.created_at ? new Date(sess.messages[0].created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : ''
                  const cntM = sess.messages.filter(m => m.role === 'user').length
                  return (
                    <button key={sess.id} onClick={() => { setCoachMessages(sess.messages.map(m => ({ role: m.role, content: m.content }))); setCoachSessionId(sess.id); setCoachSessionsOpen(false); if (project?.id) localStorage.setItem(`coach_session_${project.id}`, sess.id) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '11px 14px', marginBottom: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{dateM}</span>
                        <span style={{ fontSize: 10, color: colors.muted }}>{cntM} {cntM === 1 ? 'msg' : 'msgs'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewM}</div>
                    </button>
                  )
                })}
                {coachSessions.length === 0 && <div style={{ textAlign: 'center', color: colors.muted, fontSize: 13, padding: 20 }}>Sem conversas anteriores.</div>}
              </div>
            )}
            {/* Messages — quando a conversa está vazia, a saudação e as
                sugestões ficam encostadas ao input (como o resto da
                conversa vai crescer), em vez de ficarem no topo com um
                vazio enorme por baixo até à caixa de escrever. */}
            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
              justifyContent: coachMessages.length === 0 ? 'flex-end' : 'flex-start',
              gap: 12, padding: '16px 14px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            }}>
              {coachMessages.length === 0 && (() => {
                const empty = []
                const weak = []
                const FIELD_LABELS = { goal: 'objetivo', problem: 'problema', solution: 'solução', target_audience: 'público-alvo', features: 'funcionalidades', technologies: 'tecnologias', challenges: 'desafios', results: 'resultados', learnings: 'aprendizagens' }
                for (const [k, label] of Object.entries(FIELD_LABELS)) {
                  const v = (project[k] || '').trim()
                  if (!v) empty.push(label)
                  else if (v.length < 30) weak.push(label)
                }
                const suggestions = []
                if (empty.length) suggestions.push(`Tenho ${empty.length === 1 ? 'o campo' : 'os campos'} ${empty.slice(0, 2).join(' e ')} ${empty.length === 1 ? 'vazio' : 'vazios'}. Ajuda-me a preencher.`)
                if (weak.length) suggestions.push(`A secção de ${weak[0]} está curta. Podes ajudar-me a desenvolvê-la?`)
                if (suggestions.length < 3) suggestions.push('O que está mais fraco no meu projeto?')
                if (suggestions.length < 3) suggestions.push('Escreve-me um texto para a secção de resultados.')
                const greetingDetail = empty.length > 0
                  ? ` Vi que tens ${empty.length} ${empty.length === 1 ? 'campo vazio' : 'campos vazios'}${weak.length ? ` e ${weak.length} ${weak.length === 1 ? 'secção curta' : 'secções curtas'}` : ''}. Posso ajudar-te a preencher cada um.`
                  : weak.length > 0
                  ? ` Tens ${weak.length} ${weak.length === 1 ? 'secção que podia estar mais desenvolvida' : 'secções que podiam estar mais desenvolvidas'}. Vamos melhorá-las?`
                  : ' Posso ajudar-te a tornar cada secção mais convincente para um júri ou recrutador.'
                const botAvatar = (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={12} color="#fff" />
                  </div>
                )
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '92%' }}>
                    {botAvatar}
                    <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: '4px 18px 18px 18px', padding: '13px 16px', fontSize: 15.5, color: colors.text, lineHeight: 1.65 }}>
                      Olá! Sou o teu assistente para melhorar o <strong>{project.name}</strong>.{greetingDetail}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 32 }}>
                    {suggestions.slice(0, 3).map(q => (
                      <button
                        key={q}
                        onClick={() => { setCoachInput(q); setTimeout(() => document.getElementById('coach-input')?.focus(), 50) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 15px', fontSize: 14.5, color: colors.text, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
                      ><Sparkles size={14} color={colors.blue} style={{ flexShrink: 0 }} />{q}</button>
                    ))}
                  </div>
                </div>
                )})()}
              {coachMessages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-end',
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                }}>
                  {m.role !== 'user' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: m.isGate ? 'var(--color-warning)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={12} color="#fff" />
                    </div>
                  )}
                  <div style={{
                    background: m.isGate ? 'rgba(245,158,11,0.1)' : m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-alt)',
                    border: m.isGate ? '1px solid rgba(245,158,11,0.35)' : m.role === 'user' ? 'none' : `1px solid ${colors.border}`,
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    padding: '12px 16px',
                    fontSize: 15.5,
                    color: m.isGate ? '#B45309' : m.role === 'user' ? '#fff' : colors.text,
                    lineHeight: 1.65,
                    whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
                    minWidth: 0,
                  }}>{m.role === 'assistant' ? renderMd(m.content) : m.content}</div>
                </div>
              ))}
              {coachLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={12} color="#fff" />
                  </div>
                  <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: '4px 16px 16px 16px', padding: '10px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.muted, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={coachBottomRef} />
            </div>
            {/* Input — pinned to the bottom */}
            <form onSubmit={sendCoach} style={{ display: 'flex', gap: 8, padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
              <input
                id="coach-input"
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCoach() } }}
                placeholder="Pergunta sobre o teu projeto..."
                disabled={coachLoading}
                style={{
                  flex: 1, background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`,
                  borderRadius: 12, padding: '13px 15px', fontSize: 16,
                  color: colors.text, fontFamily: 'inherit', outline: 'none',
                  opacity: coachLoading ? 0.6 : 1,
                }}
              />
              <button
                type="submit"
                disabled={!coachInput.trim() || coachLoading}
                aria-label="Enviar"
                style={{
                  background: coachInput.trim() && !coachLoading ? 'var(--color-primary)' : 'var(--color-bg-alt)',
                  border: `1px solid ${coachInput.trim() && !coachLoading ? 'var(--color-primary)' : colors.border}`,
                  borderRadius: 12, padding: '0 18px', minWidth: 50,
                  color: coachInput.trim() && !coachLoading ? '#fff' : colors.muted,
                  cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'default',
                  fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700,
                  transition: 'all 0.15s', flexShrink: 0,
                }}
              >Enviar</button>
            </form>
          </div>,
          document.body
        )}

        {/* ── TAB: overview — nota professor + share + author ── */}
        <div className={`proj-mobile-section${tabActive('overview') ? ' proj-mobile-active' : ''}`}>

        {/* Teacher's written note — the scores themselves now live in the status
            card at the top, so here we keep only the qualitative feedback. */}
        {isOwner && project.teacher_score_note && (
          <div className="proj-mobile-only proj-card" style={{ padding: '13px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nota do professor</div>
            <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.55 }}>{project.teacher_score_note}</div>
          </div>
        )}

        {/* Share — compact bar */}
        <div className="proj-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
            {isOwner ? 'Partilhar' : 'Partilha'}
          </span>
          {/* URL row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: colors.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageUrl}
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? `${colors.green}18` : `${colors.blue}18`,
                border: `1px solid ${copied ? colors.green + '35' : colors.blue + '30'}`,
                color: copied ? colors.green : colors.blue,
                borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {copied ? <><Check size={12} />Copiado</> : 'Copiar'}
            </button>
            <button
              onClick={() => setShowQR(true)}
              title="Ver QR Code"
              style={{
                background: 'var(--color-bg-alt)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8, padding: '7px 10px',
                color: colors.muted, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
              </svg>
              <span className="proj-share-qr-label">QR Code</span>
            </button>
          </div>
          {/* Social share row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Vê o meu projeto ${project.name} no Showo!\n${pageUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)',
                borderRadius: 9, padding: '9px 0',
                color: '#25d366', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.1)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.25)',
                borderRadius: 9, padding: '9px 0',
                color: '#0a66c2', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,102,194,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,102,194,0.1)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Vê o meu projeto: ${project.name}`)}&body=${encodeURIComponent(`Olá!\n\nQuero partilhar o meu projeto contigo no Showo:\n${pageUrl}`)}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: `rgba(125,147,176,0.1)`, border: `1px solid ${colors.border}`,
                borderRadius: 9, padding: '9px 0',
                color: colors.muted, fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(125,147,176,0.18)`}
              onMouseLeave={e => e.currentTarget.style.background = `rgba(125,147,176,0.1)`}
            >
              <Mail size={15} />
              Email
            </a>
          </div>
        </div>

        {/* QR Modal */}
        {showQR && createPortal(
          <div
            onClick={() => setShowQR(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 800,
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: colors.card, border: `1px solid ${colors.borderBright}`,
                borderRadius: 14, padding: '28px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                boxShadow: 'none',
                maxWidth: 320, width: '100%',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowQR(false)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'var(--color-surface-hover)', border: `1px solid ${colors.border}`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.muted }}
              ><X size={14} /></button>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 4 }}>{project.name}</div>
                <div style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>Aponta a câmara para abrir</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'none' }}>
                <QRCodeSVG value={pageUrl} size={180} />
              </div>
              <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, color: colors.subtle, textAlign: 'center', wordBreak: 'break-all', maxWidth: '100%' }}>
                {pageUrl}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Author — bottom of page */}
        {(project.creator_name || project.course || project.school_year || project.school) && (
          <div className="proj-author-bottom proj-card" style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            {ownerProfile?.avatar_url ? (
              <img
                src={ownerProfile.avatar_url}
                alt={project.creator_name}
                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: `2px solid ${colors.border}` }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: colors.blue,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff',
              }}>
                {project.creator_name ? project.creator_name[0].toUpperCase() : '?'}
              </div>
            )}
            <div className="proj-author-bottom-text" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: colors.text, fontWeight: 700, marginBottom: 2 }}>
                {project.creator_name || 'Autor'}
              </div>
              {[project.course, project.school_year, project.school].filter(Boolean).length > 0 && (
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 400 }}>
                  {[project.course, project.school_year, project.school].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            {(project.linkedin_url || project.github_url || project.portfolio_url) && (
              <div className="proj-author-links" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {project.linkedin_url && (
                  <a href={project.linkedin_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >LinkedIn</a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >GitHub</a>
                )}
                {project.portfolio_url && (
                  <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >Portfólio</a>
                )}
              </div>
            )}
          </div>
        )}


        </div>{/* end overview tab section */}

        <div style={{ textAlign: 'center', padding: '40px 0 0', color: colors.subtle, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          Criado com{' '}
          <img src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'} alt="Showo" style={{ height: 16, width: 'auto', verticalAlign: 'middle', opacity: 0.7 }} />
        </div>
        </div>{/* end proj-body */}
        </div>{/* end proj-main */}

        {/* Sidebar */}
        <aside className="proj-sidebar" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Professor: simple back-to-turma link when opened as a single project (no batch queue) */}
          {isProfessor && !(reviewQueue && reviewQueue.length > 0) && location.state?.turmaCode && (
            <button
              onClick={() => navigate(`/turma/${location.state.turmaCode}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '9px', color: 'var(--color-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <ChevronLeft size={13} /> Voltar {location.state?.turmaName ? `a "${location.state.turmaName}"` : 'à turma'}
            </button>
          )}

          {/* Professor: batch review queue, started from the turma's "Avaliar todos" */}
          {isProfessor && reviewQueue && reviewQueue.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '6px 8px' }}>
              <button
                onClick={() => goToReviewIndex(reviewIndex - 1)}
                disabled={reviewIndex === 0}
                className="icon-btn-ghost"
                style={{ opacity: reviewIndex === 0 ? 0.35 : 1, cursor: reviewIndex === 0 ? 'default' : 'pointer' }}
              ><ChevronLeft size={14} /></button>
              <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>
                  Projeto {reviewIndex + 1} de {reviewQueue.length}
                </div>
                {location.state?.turmaCode && (
                  <button
                    onClick={() => navigate(`/turma/${location.state.turmaCode}`)}
                    style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 10, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                  >Terminar avaliação</button>
                )}
              </div>
              <button
                onClick={() => goToReviewIndex(reviewIndex + 1)}
                disabled={reviewIndex === reviewQueue.length - 1}
                className="icon-btn-ghost"
                style={{ opacity: reviewIndex === reviewQueue.length - 1 ? 0.35 : 1, cursor: reviewIndex === reviewQueue.length - 1 ? 'default' : 'pointer' }}
              ><ChevronRight size={14} /></button>
            </div>
          )}

          {/* Professor: student marked their corrections as done */}
          {isProfessor && project.review_status === 'resubmitted' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)',
              borderRadius: 8, padding: '9px 12px',
            }}>
              <CheckCircle size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: colors.text, fontWeight: 600, lineHeight: 1.4 }}>
                O aluno marcou as correções como feitas. Revê e atualiza o estado.
              </span>
            </div>
          )}

          {/* Professor: quick "ready for defense" / "needs revision" flag */}
          {isProfessor && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleSetReviewStatus('ready_for_defense')}
                disabled={reviewStatusSaving}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: project.review_status === 'ready_for_defense' ? 'var(--color-success-subtle)' : 'transparent',
                  border: `1px solid ${project.review_status === 'ready_for_defense' ? 'var(--color-success-subtle)' : colors.border}`,
                  borderRadius: 8, padding: '8px 6px',
                  color: project.review_status === 'ready_for_defense' ? 'var(--color-success)' : colors.muted,
                  fontSize: 11, fontWeight: 700, cursor: reviewStatusSaving ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              ><CheckCircle size={13} /> Pronto</button>
              <button
                onClick={() => handleSetReviewStatus('needs_revision')}
                disabled={reviewStatusSaving}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: project.review_status === 'needs_revision' ? 'var(--color-warning-subtle)' : 'transparent',
                  border: `1px solid ${project.review_status === 'needs_revision' ? 'var(--color-warning-subtle)' : colors.border}`,
                  borderRadius: 8, padding: '8px 6px',
                  color: project.review_status === 'needs_revision' ? 'var(--color-warning)' : colors.muted,
                  fontSize: 11, fontWeight: 700, cursor: reviewStatusSaving ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              ><AlertTriangle size={13} /> Revisão</button>
            </div>
          )}

          {/* Professor: contact the student, and switch between the public-visitor preview and the evaluation view */}
          {isProfessor && (
            <div style={{ display: 'flex', gap: 6 }}>
              {project.user_id && (
                <button
                  onClick={() => navigate(`/mensagens?to=${project.user_id}`, {
                    state: {
                      returnTo: {
                        pathname: `/projeto/${project.slug}`,
                        state: { reviewQueue, reviewIndex, turmaCode: location.state?.turmaCode, turmaName: location.state?.turmaName, turmaId: location.state?.turmaId },
                        label: project.name,
                      },
                    },
                  })}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8,
                    padding: '9px', color: colors.muted, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                >
                  <MessageSquare size={13} /> Contactar
                </button>
              )}
              <button
                data-tour="preview"
                onClick={() => setViewAsPublic(v => !v)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8,
                  padding: '9px', color: colors.muted, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
              >
                <Globe size={13} /> Visitante
              </button>
            </div>
          )}
          <MembersPanel
            ownerName={ownerProfile?.full_name || ownerProfile?.username || project.creator_name}
            members={members}
            colors={colors}
            isOwner={isOwner}
          />

          {/* ── Evaluation card, 0-20 scale (professors only) ── */}
          {isProfessor && (() => {
            const useClassCriteria = classCriteria.length > 0
            const JURY_CRITERIA = [
              { id: 'problem',        label: 'Problema',        desc: 'Clareza e relevância' },
              { id: 'solution',       label: 'Solução',         desc: 'Adequação e criatividade' },
              { id: 'tech',           label: 'Tecnologia',      desc: 'Profundidade técnica' },
              { id: 'results',        label: 'Resultados',      desc: 'Evidência e impacto' },
              { id: 'presentation',   label: 'Apresentação',    desc: 'Qualidade do projeto' },
            ]
            // Legacy bar system (no class criteria)
            const totalRated = JURY_CRITERIA.filter(c => juryRatings[c.id] != null).length
            const allRated   = totalRated === JURY_CRITERIA.length
            const totalScore = allRated ? JURY_CRITERIA.reduce((s, c) => s + juryRatings[c.id], 0) : null
            // Class-criteria weighted system
            const critRatedCount = classCriteria.filter(c => criterionScores[c.id] != null).length
            const allCritRated   = critRatedCount === classCriteria.length && classCriteria.length > 0
            const critWeightSum  = classCriteria.reduce((s, c) => s + Number(c.weight), 0)
            const critWeightsValid = !useClassCriteria || Math.abs(critWeightSum - 100) < 0.1
            const weightedTotal  = (() => {
              if (!allCritRated) return null
              const sumW = critWeightSum
              if (!sumW) return null
              const sumWS = classCriteria.reduce((s, c) => s + Number(c.weight) * Number(criterionScores[c.id]), 0)
              return Math.round((sumWS / sumW) * 10) / 10
            })()
            const scoreColorFor = s => s >= 16 ? 'var(--color-success)' : s >= 10 ? 'var(--color-primary)' : 'var(--color-warning)'
            const hasSavedScore = project.teacher_score != null
            const finalScore    = useClassCriteria ? weightedTotal : totalScore
            const canSave       = useClassCriteria ? (allCritRated && critWeightsValid) : allRated

            return (
              <div style={{ ...colors.glassStyle, background: colors.glass, border: `1px solid ${colors.glassBorder}`, borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                {/* Header */}
                <div style={{ padding: '13px 16px 10px', borderBottom: (juryEditing || hasSavedScore) ? '1px solid var(--color-primary-subtle)' : 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <ClipboardList size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, flex: 1 }}>Avaliação</span>
                  {juryEditing && hasSavedScore && (
                    <button onClick={() => setJuryEditing(false)} style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Cancelar</button>
                  )}
                </div>

                {!juryEditing && hasSavedScore ? (
                  /* ── Collapsed summary ── */
                  <div style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: scoreColorFor(project.teacher_score), letterSpacing: '-0.5px', flexShrink: 0 }}>
                        {project.teacher_score}<span style={{ fontSize: 12, color: colors.muted, fontWeight: 500 }}>/20</span>
                      </span>
                      {project.teacher_score_note && (
                        <span style={{ flex: 1, fontSize: 12, color: colors.muted, lineHeight: 1.4, minWidth: 0 }}>{project.teacher_score_note}</span>
                      )}
                      <button
                        onClick={() => setJuryEditing(true)}
                        style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--color-primary-subtle)', borderRadius: 7, padding: '6px 10px', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <Pencil size={11} /> Reavaliar
                      </button>
                    </div>
                    <button
                      onClick={toggleScoreHistory}
                      style={{ marginTop: 10, background: 'none', border: 'none', color: colors.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
                    >
                      {showScoreHistory ? 'Ocultar histórico' : 'Ver histórico'}
                    </button>
                    {showScoreHistory && (
                      scoreHistory == null ? (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.muted }}>A carregar…</p>
                      ) : scoreHistory.length === 0 ? (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.muted }}>Ainda não há avaliações anteriores.</p>
                      ) : (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {scoreHistory.map(h => (
                            <div key={h.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
                              <span style={{ fontWeight: 800, color: colors.muted }}>{h.score}/20</span>
                              <span style={{ color: colors.subtle, fontSize: 11 }}>{new Date(h.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {h.note && <span style={{ color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.note}</span>}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <>
                    {/* Criteria rating */}
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {useClassCriteria ? classCriteria.map(c => {
                        const val = criterionScores[c.id]
                        return (
                          <div key={c.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{c.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-subtle)', borderRadius: 4, padding: '1px 5px' }}>{c.weight}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="number" min="0" max="20" step="1"
                                value={val ?? ''}
                                onChange={e => {
                                  const n = e.target.value === '' ? undefined : Math.min(20, Math.max(0, Number(e.target.value)))
                                  setCriterionScores(s => ({ ...s, [c.id]: n }))
                                }}
                                placeholder="—"
                                style={{ width: 52, background: 'var(--color-bg)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 8px', color: colors.text, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                              />
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-bg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${((val ?? 0) / 20) * 100}%`, background: val >= 16 ? 'var(--color-success)' : val >= 10 ? 'var(--color-primary)' : 'var(--color-warning)', borderRadius: 3, transition: 'width 0.15s' }} />
                              </div>
                              <span style={{ fontSize: 11, color: colors.muted, minWidth: 22, textAlign: 'right' }}>/20</span>
                            </div>
                          </div>
                        )
                      }) : JURY_CRITERIA.map(c => (
                        <div key={c.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{c.label}</span>
                            <span style={{ fontSize: 10, color: colors.muted }}>{c.desc}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0,1,2,3,4].map(n => {
                              const val = juryRatings[c.id]
                              const active = val != null && n <= val
                              return (
                                <button
                                  key={n}
                                  onClick={() => setJuryRatings(r => ({ ...r, [c.id]: n }))}
                                  style={{
                                    flex: 1, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
                                    background: active ? (val >= 4 ? 'var(--color-success)' : val >= 2 ? 'var(--color-primary)' : 'var(--color-warning)') : 'var(--color-bg)',
                                    transition: 'background 0.1s',
                                  }}
                                  title={`${n}/4`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Running total */}
                    <div style={{ padding: '0 16px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      {useClassCriteria
                        ? <span style={{ fontSize: 11, color: colors.muted }}>{critRatedCount}/{classCriteria.length} critérios avaliados</span>
                        : <span style={{ fontSize: 11, color: colors.muted }}>{totalRated}/{JURY_CRITERIA.length} critérios avaliados</span>
                      }
                      {finalScore != null && (
                        <span style={{ fontSize: 15, fontWeight: 900, color: scoreColorFor(finalScore) }}>{finalScore}<span style={{ fontSize: 10, color: colors.muted, fontWeight: 500 }}>/20</span></span>
                      )}
                    </div>

                    {useClassCriteria && !critWeightsValid && (
                      <div style={{ padding: '0 16px 8px' }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-warning)' }}>
                          Os critérios da turma somam {critWeightSum.toFixed(0)}%. Ajusta para 100% na página da turma antes de avaliar.
                        </p>
                      </div>
                    )}

                    {/* Note */}
                    <div style={{ padding: '8px 16px 12px' }}>
                      <textarea
                        value={juryNote}
                        onChange={e => setJuryNote(e.target.value)}
                        placeholder="Nota geral para o aluno (opcional)…"
                        rows={2}
                        style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 10px', color: colors.text, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* Save button */}
                    <div style={{ padding: '0 16px 14px' }}>
                      <button
                        disabled={jurySaving || !canSave}
                        onClick={async () => {
                          if (!canSave || finalScore == null) return
                          setJurySaving(true)
                          setJuryError('')
                          const ratings = useClassCriteria ? criterionScores : juryRatings
                          const { error } = await supabase.rpc('set_project_teacher_score', {
                            p_project_id: project.id, p_score: finalScore, p_note: juryNote || null, p_ratings: ratings,
                          })
                          if (!error) {
                            if (useClassCriteria) {
                              const upsertRows = classCriteria.map(c => ({
                                project_id: project.id, criterion_id: c.id, score: Number(criterionScores[c.id]),
                              }))
                              const { error: critErr } = await supabase.from('project_criterion_scores').upsert(upsertRows, { onConflict: 'project_id,criterion_id' })
                              if (critErr) console.error('criterion scores upsert failed:', critErr)
                            }
                            setProject(p => ({ ...p, teacher_score: finalScore, teacher_score_note: juryNote || null, teacher_score_ratings: ratings }))
                            if (project.user_id) {
                              supabase.rpc('create_notification', {
                                p_user_id: project.user_id, p_type: 'TEACHER_FEEDBACK',
                                p_message: `O professor avaliou o teu projeto "${project.name}": ${finalScore}/20`,
                                p_project_slug: project.slug,
                              }).then(({ error: notifError }) => { if (notifError) console.error('teacher_score notification failed:', notifError) })
                            }
                            setJurySaved(true)
                            setJuryEditing(false)
                            setTimeout(() => setJurySaved(false), 3000)
                          } else {
                            console.error('set_project_teacher_score failed:', error)
                            setJuryError(error.message === 'Not authorized'
                              ? 'Sem permissão para avaliar este projeto.'
                              : 'Não foi possível guardar. Tenta de novo.')
                          }
                          setJurySaving(false)
                        }}
                        style={{
                          width: '100%', padding: '10px', borderRadius: 8,
                          background: jurySaved ? 'var(--color-success-subtle)' : 'var(--color-primary)',
                          border: jurySaved ? '1px solid var(--color-success-subtle)' : 'none',
                          color: jurySaved ? 'var(--color-success)' : '#fff',
                          fontSize: 13, fontWeight: 700, cursor: !canSave || jurySaving ? 'default' : 'pointer',
                          opacity: !canSave ? 0.5 : 1, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {jurySaved ? <><Check size={13} /> Avaliação guardada</> : jurySaving ? 'A guardar…' : <><ClipboardList size={13} /> Guardar avaliação</>}
                      </button>
                      {juryError && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--color-error)', textAlign: 'center' }}>{juryError}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* ── Score Showo + Nota Professor side by side — owner only ── */}
          {isOwner && project.teacher_score != null && (() => {
            const gradeColor = project.teacher_score >= 16 ? 'var(--color-success)' : project.teacher_score >= 10 ? 'var(--color-primary)' : 'var(--color-warning)'
            const scoreColor2 = score >= 86 ? 'var(--color-success)' : score >= 51 ? 'var(--color-primary)' : 'var(--color-warning)'
            return (
              <div style={{ ...colors.glassStyle, background: colors.glass, border: `1px solid ${colors.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, padding: '14px 16px', borderRight: `1px solid ${colors.glassBorder}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Score Showo</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor2, letterSpacing: '-1px', lineHeight: 1 }}>{score}</span>
                      <span style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>/100</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nota Professor</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: gradeColor, letterSpacing: '-1px', lineHeight: 1 }}>{project.teacher_score}</span>
                      <span style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>/20</span>
                    </div>
                  </div>
                </div>
                {project.teacher_score_note && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${colors.glassBorder}`, fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
                    {project.teacher_score_note}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Teacher feedback — sidebar: desktop first/second slot, mobile above author */}
          {(isOwner || isProfessor) && (teacherFeedback.some(f => f.field_key !== 'jury_eval') || isProfessor) && (() => {
            const FB_SECTION_LABELS = {
              geral: 'Nota geral', description: 'Descrição', tech: 'Tecnologias',
              metodologia: 'Metodologia', resultados: 'Resultados', apresentacao: 'Apresentação',
              links: 'Links', demo: 'Demo', team: 'Equipa', gallery: 'Galeria',
            }
            const visibleFeedback = teacherFeedback.filter(f => f.field_key !== 'jury_eval')
            const myFeedback = isProfessor ? visibleFeedback.filter(f => f.teacher_id === user?.id) : visibleFeedback
            return (
              <div style={{ ...colors.glassStyle, background: colors.glass, border: `1px solid ${colors.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 14px', borderBottom: myFeedback.length > 0 || showFeedbackForm ? '1px solid var(--color-primary-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <GraduationCap size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Feedback do professor</span>
                  </div>
                  {isProfessor && (
                    <button
                      onClick={() => setShowFeedbackForm(f => !f)}
                      title={showFeedbackForm ? 'Fechar' : 'Editar'}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--color-primary-subtle)', background: showFeedbackForm ? 'var(--color-primary-subtle)' : 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}
                    >
                      {showFeedbackForm ? <X size={12} /> : <><Pencil size={11} /> Editar</>}
                    </button>
                  )}
                </div>

                {/* Nota geral — highlighted at top if it exists */}
                {(() => {
                  const geral = myFeedback.find(f => f.field_key === 'geral')
                  if (!geral) return null
                  const resolved = geral.status === 'resolved'
                  return (
                    <div style={{ padding: '12px 16px', background: 'var(--color-primary-subtle)', borderBottom: '1px solid var(--color-primary-subtle)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Nota geral do professor</div>
                      <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.6, textDecoration: resolved ? 'line-through' : 'none', textDecorationColor: 'rgba(148,163,184,0.5)', fontStyle: 'italic' }}>
                        <FeedbackCommentText comment={geral.comment} textColor={colors.text} />
                      </p>
                      {isProfessor && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button onClick={() => { setFbEditing(geral.id); setFbFieldKey('geral'); setFbComment(geral.comment); setShowFeedbackForm(true) }} className="icon-btn-ghost" title="Editar nota geral"><Pencil size={11} /></button>
                          <button onClick={() => handleFbDelete(geral.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4 }} title="Apagar"><X size={11} /></button>
                        </div>
                      )}
                      {isOwner && !resolved && (
                        <button onClick={() => setResolvingId(geral.id)} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
                          <Check size={12} /> Marcar como resolvido
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Feedback items — each on one compact row */}
                {(() => {
                  const sectionFeedback = myFeedback.filter(f => f.field_key !== 'geral')
                  if (!sectionFeedback.length) return null
                  return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sectionFeedback.map((f, idx) => {
                      const resolved = f.status === 'resolved'
                      const isResolving = resolvingId === f.id
                      return (
                      <div
                        key={f.id}
                        style={{ padding: '10px 16px', borderBottom: idx < sectionFeedback.length - 1 ? '1px solid var(--color-primary-subtle)' : 'none', opacity: resolved && !isProfessor ? 0.75 : 1 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-primary)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
                            {FB_SECTION_LABELS[f.field_key] || humanizeFieldKey(f.field_key)}
                          </span>
                          <span style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 1.5, textDecoration: resolved ? 'line-through' : 'none', textDecorationColor: 'rgba(148,163,184,0.5)' }}><FeedbackCommentText comment={f.comment} textColor={colors.text} /></span>
                          {resolved && (
                            <span title="Resolvido" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }}>
                              <Check size={11} /> Resolvido
                            </span>
                          )}
                          {isProfessor && (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 1 }}>
                              <button
                                onClick={() => { setFbEditing(f.id); setFbFieldKey(f.field_key); setFbComment(f.comment); setShowFeedbackForm(true) }}
                                title="Editar"
                                className="icon-btn-ghost"
                              ><Pencil size={11} /></button>
                              <button
                                onClick={() => handleFbDelete(f.id)}
                                title="Apagar"
                                style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                              ><X size={11} /></button>
                            </div>
                          )}
                        </div>

                        {f.resolution_note && (
                          <p style={{ margin: '6px 0 0 0', paddingLeft: 4, fontSize: 12, color: colors.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
                            &ldquo;{f.resolution_note}&rdquo;
                          </p>
                        )}

                        {/* Owner: mark resolved */}
                        {isOwner && !resolved && (
                          isResolving ? (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <input
                                value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                                placeholder="O que mudaste? (opcional)"
                                style={{ background: 'var(--color-bg)', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 9px', color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => { handleFbResolve(f.id, resolveNote); setResolvingId(null); setResolveNote('') }}
                                  style={{ background: 'var(--color-success)', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                                >Confirmar</button>
                                <button
                                  onClick={() => { setResolvingId(null); setResolveNote('') }}
                                  style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '5px 10px', color: colors.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                                >Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResolvingId(f.id)}
                              style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
                            ><Check size={12} /> Marcar como resolvido</button>
                          )
                        )}

                        {/* Professor: reopen */}
                        {isProfessor && resolved && (
                          <button
                            onClick={() => handleFbReopen(f.id)}
                            style={{ marginTop: 6, background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
                          >Reabrir</button>
                        )}
                      </div>
                      )
                    })}
                  </div>
                  )
                })()}

                {/* Feedback form */}
                {isProfessor && showFeedbackForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', borderTop: myFeedback.length > 0 ? '1px solid var(--color-primary-subtle)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {Object.entries(FB_SECTION_LABELS).map(([k, l]) => (
                        <button key={k} onClick={() => setFbFieldKey(k)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid ${fbFieldKey === k ? 'var(--color-primary)' : colors.border}`, background: fbFieldKey === k ? 'var(--color-primary-subtle)' : 'transparent', color: fbFieldKey === k ? 'var(--color-primary)' : colors.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fbFieldKey === k ? 700 : 400 }}>{l}</button>
                      ))}
                    </div>
                    <textarea
                      value={fbComment} onChange={e => setFbComment(e.target.value)}
                      placeholder={fbFieldKey === 'geral' ? 'Nota geral sobre o projeto: avaliação, observações, pontos a melhorar…' : `Feedback sobre ${FB_SECTION_LABELS[fbFieldKey]}…`}
                      rows={fbFieldKey === 'geral' ? 4 : 3}
                      style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 11px', color: colors.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                    />
                    {fbError && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-error)' }}>{fbError}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleFbSave} disabled={fbSaving || !fbComment.trim()} style={{ flex: 1, background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '9px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: fbSaving || !fbComment.trim() ? 'default' : 'pointer', opacity: fbSaving || !fbComment.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
                        {fbSaving ? 'A guardar…' : fbEditing ? 'Atualizar' : 'Guardar'}
                      </button>
                      {fbEditing && <button onClick={() => { setFbEditing(null); setFbComment('') }} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 12px', color: colors.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Data de defesa — card próprio no topo da sidebar (desktop/
              tablet), acima da Completude: é a informação mais urgente
              para quem está a preparar um projeto final. No telemóvel
              (sem sidebar) isto não aparece — o botão compacto no corpo
              do projeto abre o popup equivalente. */}
          {isOwner && isPap && (
            <div className="proj-card" style={{
              padding: '16px 18px', position: 'relative',
              background: `linear-gradient(135deg, ${defenseUrgentColor}12, ${defenseUrgentColor}03)`,
              border: `1px solid ${defenseUrgentColor}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${defenseUrgentColor}18`, border: `1px solid ${defenseUrgentColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={15} color={defenseUrgentColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projeto final</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: defenseDaysLeft != null && defenseDaysLeft <= 7 ? 'var(--color-error)' : colors.text, letterSpacing: '-0.1px' }}>
                    {defenseLabel}
                  </div>
                </div>
                {savingDefense && <div style={{ width: 12, height: 12, flexShrink: 0, border: `1.5px solid ${colors.border}`, borderTop: `1.5px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              </div>
              <input
                type="date"
                value={defenseDate}
                onChange={e => handleSaveDefenseDate(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-surface)', border: `1px solid ${colors.border}`,
                  borderRadius: 8, padding: '8px 10px', color: colors.text,
                  fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                  colorScheme: theme === 'light' ? 'light' : 'dark',
                }}
              />
            </div>
          )}

          {/* Profile completeness + tips */}
          <div className="proj-completude-grid" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isOwner && (() => {
            const fieldQuality = PROFILE_SCORE_FIELDS.map(f => {
              const val = String(project[f.key] || '').trim()
              const len = val.length
              const quality = len === 0 ? 'empty' : len < f.minLen ? 'short' : 'good'
              return { ...f, val, len, quality }
            })
            const goodCount  = fieldQuality.filter(f => f.quality === 'good').length
            const pct = Math.round((goodCount / fieldQuality.length) * 100)

            const isComplete = pct === 100
            return (
              <div className="proj-card" style={isComplete ? {} : {}}>
                {isComplete ? (
                  /* ── Completude 100%: redirect focus to diary ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <BookOpen size={14} color="#f59e0b" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 1 }}>Perfil completo</div>
                        <div style={{ fontSize: 11, color: colors.subtle, lineHeight: 1.4 }}>O diário aumenta o score. Regista notas e ideias regularmente.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/projeto/${project.slug}/diario`)}
                      style={{
                        width: '100%', padding: '7px 0', border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 8, background: 'rgba(245,158,11,0.07)', color: '#f59e0b',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Abrir diário do projeto →
                    </button>
                  </div>
                ) : (
                  /* ── Normal state: collapsible checklist ── */
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: completudeOpen ? 14 : 0 }}>
                      <h3 className="proj-sec-label" style={{ margin: 0 }}>Completude</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: pct > 60 ? colors.blue : colors.yellow }}>{pct}%</span>
                        <button
                          className="sidebar-section-toggle"
                          onClick={() => setCompletudeOpen(o => !o)}
                          style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: '2px 4px', alignItems: 'center' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: completudeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M2 4l4 4 4-4"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className={`sidebar-section-body${completudeOpen ? '' : ' collapsed'}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {fieldQuality.map(f => (
                          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: f.quality === 'good' ? '#10b981' : f.quality === 'short' ? colors.yellow : colors.subtle }} />
                            <span style={{ flex: 1, fontSize: 12, color: f.quality === 'good' ? colors.text : f.quality === 'short' ? '#d4a820' : colors.subtle, fontWeight: f.quality === 'good' ? 600 : 400 }}>{f.label}</span>
                            {f.quality === 'good'  && <Check size={11} color="#10b981" strokeWidth={3} />}
                            {f.quality === 'short' && <span style={{ fontSize: 10, color: colors.yellow, fontWeight: 700 }}>curto</span>}
                            {f.quality === 'empty' && <span style={{ fontSize: 11, color: colors.subtle }}>—</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, height: 4, background: progTrack(pct), borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: progBar(pct), transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* How to improve — owner only */}
          {isOwner && (() => {
            const needsWork = PROFILE_SCORE_FIELDS.map(f => {
              const val = String(project[f.key] || '').trim()
              const len = val.length
              const quality = len === 0 ? 'empty' : len < f.minLen ? 'short' : 'good'
              return { ...f, quality }
            }).filter(f => f.quality !== 'good').slice(0, 3)

            if (needsWork.length === 0) return null // completude card already shows 100% state

            return (
              <div className="proj-card" style={{ background: colors.glass, border: `1px solid ${colors.glassBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tipsOpen ? 14 : 0 }}>
                  <h3 className="proj-sec-label" style={{ margin: 0, color: '#5a9ff5', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a9ff5" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Como aumentar o score</span>
                  </h3>
                  <button
                    className="sidebar-section-toggle"
                    onClick={() => setTipsOpen(o => !o)}
                    style={{ background: 'none', border: 'none', color: '#5a9ff5', cursor: 'pointer', padding: '2px 4px', alignItems: 'center' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tipsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M2 4l4 4 4-4"/>
                    </svg>
                  </button>
                </div>
                <div className={`sidebar-section-body${tipsOpen ? '' : ' collapsed'}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {needsWork.map(f => (
                      <div key={f.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.quality === 'short' ? colors.yellow : 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: f.quality === 'short' ? colors.yellow : '#5a9ff5', display: 'block', marginBottom: 2 }}>
                            {f.label} {f.quality === 'short' ? '· muito curto' : '· em falta'}
                          </span>
                          <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>{f.tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setMissionsOpenMobile(true)
                        requestAnimationFrame(() => {
                          document.getElementById('missions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        })
                      }}
                      style={{ marginTop: 14, width: '100%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', color: '#5a9ff5', borderRadius: 10, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>Ver missões <ChevronDown size={14} /></span>
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
          </div>{/* end proj-completude-grid */}
        </aside>
        </div>{/* end proj-layout */}

      </div>

      </>)}{/* end owner/collaborator conditional */}


      {/* ── Desktop AI Coach: floating button + slide-in panel ── */}
      {/* Mobile-only AI FAB — canto inferior direito. O botão de feedback
          que estava aqui foi para a sidebar, por isso este ancora agora ao
          canto em vez de flutuar ao lado de nada. */}
      {isOwner && mobileTab !== 'ia' && (
        <button
          className="proj-ia-mobile-fab"
          data-tour="coach"
          onClick={() => setMobileTab('ia')}
          style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            right: 16,
            zIndex: 200,
            width: 42, height: 42, borderRadius: 12,
            background: 'var(--color-primary)',
            border: 'none',
            boxShadow: '0 4px 20px rgba(27,120,247,0.35)',
            cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="Assistente IA"
          aria-label="Assistente IA"
        >
          <Bot size={22} color="#fff" />
        </button>
      )}

      {isOwner && !previewEditing && (<>
        {/* Floating button — only shown when panel is closed */}
        {!coachOpen && (
          <button
            data-tour="coach"
            onClick={() => setCoachOpen(true)}
            className="proj-coach-fab"
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 200,
              width: 42, height: 42, borderRadius: 12,
              background: 'var(--color-primary)',
              border: '2px solid transparent',
              boxShadow: '0 4px 20px var(--color-primary-subtle)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Assistente IA"
          >
            <Bot size={20} color="#fff" />
          </button>
        )}

        {/* Floating chat widget */}
        {coachOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 199 }}
              onClick={() => setCoachOpen(false)}
            />
          <div
            className="proj-coach-panel"
            style={{
              position: 'fixed', bottom: 20, right: 20,
              width: 360, height: 'calc(100dvh - 100px)',
              maxHeight: 560,
              zIndex: 200,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
              animation: 'coachPop 0.18s ease-out',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'var(--color-bg-alt)', borderRadius: '16px 16px 0 0' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={15} color="var(--color-primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Assistente IA</div>
                <div style={{ fontSize: 11, color: colors.muted, display: 'flex', alignItems: 'center', gap: 6 }}>Tutor do teu projeto <AiUsageBadge feature="coach" compact /></div>
              </div>
              {coachSessions.length >= 1 && (
                <button
                  onClick={() => setCoachSessionsOpen(v => !v)}
                  style={{ background: coachSessionsOpen ? 'var(--color-primary-subtle)' : 'none', border: 'none', cursor: 'pointer', color: coachSessionsOpen ? colors.blue : colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 6, transition: 'all 0.15s' }}
                  title="Conversas"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="7.25" width="12" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="11.5" width="12" height="1.5" rx=".75" fill="currentColor"/></svg>
                </button>
              )}
              <button
                onClick={() => { setCoachMessages([]); setCoachSessionId(null); setCoachSessionsOpen(false); if (project?.id) localStorage.setItem(`coach_session_${project.id}`, 'new') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 6 }}
                title="Nova conversa"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
              <button
                onClick={() => { setCoachOpen(false); setCoachSessionsOpen(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 6 }}
                title="Fechar"
              ><X size={16} /></button>
            </div>

            {/* Sessions panel */}
            {coachSessionsOpen && (
              <div style={{ position: 'absolute', top: 58, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'var(--color-surface)', overflowY: 'auto', padding: '8px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 6px 12px' }}>Conversas anteriores</div>
                {coachSessions.map((sess) => {
                  const firstUser = sess.messages.find(m => m.role === 'user')
                  const preview = firstUser ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '...' : '') : 'Conversa sem mensagens'
                  const date = sess.messages[0]?.created_at ? new Date(sess.messages[0].created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : ''
                  const msgCount = sess.messages.filter(m => m.role === 'user').length
                  return (
                    <button
                      key={sess.id}
                      onClick={() => {
                        setCoachMessages(sess.messages.map(m => ({ role: m.role, content: m.content })))
                        setCoachSessionId(sess.id)
                        setCoachSessionsOpen(false)
                        if (project?.id) localStorage.setItem(`coach_session_${project.id}`, sess.id)
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 13px', marginBottom: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{date}</span>
                        <span style={{ fontSize: 10, color: colors.muted }}>{msgCount} {msgCount === 1 ? 'msg' : 'msgs'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                    </button>
                  )
                })}
                {coachSessions.length === 0 && <div style={{ textAlign: 'center', color: colors.muted, fontSize: 13, padding: 20 }}>Sem conversas anteriores.</div>}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px' }}>
              {coachMessages.length === 0 && (() => {
                const emptyD = []
                const weakD = []
                const FIELD_LABELS_D = { goal: 'objetivo', problem: 'problema', solution: 'solução', target_audience: 'público-alvo', features: 'funcionalidades', technologies: 'tecnologias', challenges: 'desafios', results: 'resultados', learnings: 'aprendizagens' }
                for (const [k, label] of Object.entries(FIELD_LABELS_D)) {
                  const v = (project[k] || '').trim()
                  if (!v) emptyD.push(label)
                  else if (v.length < 30) weakD.push(label)
                }
                const suggestionsD = []
                if (emptyD.length) suggestionsD.push(`Tenho ${emptyD.length === 1 ? 'o campo' : 'os campos'} ${emptyD.slice(0, 2).join(' e ')} ${emptyD.length === 1 ? 'vazio' : 'vazios'}. Ajuda-me a preencher.`)
                if (weakD.length) suggestionsD.push(`A secção de ${weakD[0]} está curta. Podes ajudar-me a desenvolvê-la?`)
                if (suggestionsD.length < 3) suggestionsD.push('O que está mais fraco no meu projeto?')
                if (suggestionsD.length < 3) suggestionsD.push('Como me preparo para a defesa?')
                const greetingD = emptyD.length > 0
                  ? ` Vi que tens ${emptyD.length} ${emptyD.length === 1 ? 'campo vazio' : 'campos vazios'}${weakD.length ? ` e ${weakD.length} ${weakD.length === 1 ? 'secção curta' : 'secções curtas'}` : ''}. Posso ajudar-te a preencher cada um.`
                  : weakD.length > 0
                  ? ` Tens ${weakD.length} ${weakD.length === 1 ? 'secção que podia estar mais desenvolvida' : 'secções que podiam estar mais desenvolvidas'}. Vamos melhorá-las?`
                  : ' Posso ajudar-te a melhorar cada secção, pensar na estrutura, ou preparar a apresentação.'
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Assistente IA</span>
                    Olá! Sou o teu assistente para o <strong>{project.name}</strong>.{greetingD}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {suggestionsD.slice(0, 3).map(q => (
                      <button
                        key={q}
                        onClick={() => { setCoachInput(q); setTimeout(() => document.getElementById('coach-input-desktop')?.focus(), 50) }}
                        style={{ textAlign: 'left', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '9px 13px', fontSize: 12, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'; e.currentTarget.style.color = colors.text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                      >{q}</button>
                    ))}
                  </div>
                </div>
                )})()}
              {coachMessages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '87%',
                  background: m.isGate ? 'rgba(245,158,11,0.1)' : m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-alt)',
                  border: m.isGate ? '1px solid rgba(245,158,11,0.35)' : m.role === 'user' ? 'none' : `1px solid ${colors.border}`,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: m.isGate ? '#B45309' : m.role === 'user' ? '#fff' : colors.text,
                  lineHeight: 1.6,
                  whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
                }}>{m.role === 'assistant' ? renderMd(m.content) : m.content}</div>
              ))}
              {coachLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--color-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.muted, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              )}
              <div ref={coachBottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendCoach} style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: 'var(--color-bg-alt)', boxSizing: 'border-box', width: '100%' }}>
              <input
                id="coach-input-desktop"
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCoach() } }}
                placeholder="Pergunta sobre o teu projeto..."
                disabled={coachLoading}
                autoFocus
                style={{
                  flex: 1, minWidth: 0, background: 'var(--color-bg)', border: `1px solid ${colors.border}`,
                  borderRadius: 10, padding: '9px 12px', fontSize: 13,
                  color: colors.text, fontFamily: 'inherit', outline: 'none',
                  opacity: coachLoading ? 0.6 : 1,
                }}
              />
              <button
                type="submit"
                disabled={!coachInput.trim() || coachLoading}
                title="Enviar"
                style={{
                  flexShrink: 0, width: 36, height: 36,
                  background: coachInput.trim() && !coachLoading ? 'var(--color-primary)' : 'transparent',
                  border: `1px solid ${coachInput.trim() && !coachLoading ? 'var(--color-primary)' : colors.border}`,
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: coachInput.trim() && !coachLoading ? '#fff' : colors.muted,
                  cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              ><ArrowRight size={15} /></button>
            </form>
          </div>
          </>
        )}
      </>)}

    </div>
  )
}
