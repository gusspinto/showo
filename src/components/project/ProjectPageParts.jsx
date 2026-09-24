// Extraído de ProjectPage.jsx (Fase 2, Parte E) — sem mudar comportamento,
// só o sítio onde o código vive. PublicView (o "workspace") e os cartões
// de prova que partilha com o ProjectPage principal (GithubProof, ApiProof,
// ScoreRing, Section, etc.) ficam todos aqui; o ProjectPage principal
// importa de volta só o que a função principal ainda usa.

import { useEffect, useState, useRef, useMemo, memo, lazy, Suspense } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase'
import { toWebP } from '../../lib/imageOptimize'
import { useIsMobile } from '../../lib/useIsMobile'
import { calculateScore } from '../../lib/score'
import { hasPlaceholder } from '../../lib/textQuality'
import { topLanguages, commitSpanMonths, repoAgeMonths } from '../../lib/social'
import { listPublicTables, publicCurlExample, listRows, listTables } from '../../lib/projectDb'
import { isTechnicalArea } from '../../lib/technologies'
import { occupationLabel } from '../../lib/occupations'
import { DatabaseIcon as Database } from '@solar-icons/react/bold/database'
import { CHALLENGES, getChallengeStatus } from '../../lib/challenges'
import { getProjectField, PROJECT_FIELDS } from '../../lib/projectFields'
import { useTheme } from '../../context/ThemeContext'
import ColorPicker from '../ColorPicker'
import SegmentedTabs from '../SegmentedTabs'
import { accentGradientFromHex, isLightHex, isValidHex, ensureReadable } from '../../lib/color'
import ProjectComments from '../ProjectComments'
import ProjectTimeline from '../ProjectTimeline'
import ProjectTimelineBadge from '../ProjectTimelineBadge'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { DisketteIcon as Save } from '@solar-icons/react/bold/diskette'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { BotIcon as Bot } from '@solar-icons/react/bold/bot'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
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
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { GalleryWideIcon as Image } from '@solar-icons/react/bold/gallery-wide'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { ChatRoundLineIcon as Quote } from '@solar-icons/react/bold/chat-round-line'
import { Widget4Icon as Layout } from '@solar-icons/react/bold/widget-4'
import { TextBoldIcon as Type } from '@solar-icons/react/bold/text-bold'
import { LinkIcon as Link } from '@solar-icons/react/bold/link'
import { SortVerticalIcon as GripVertical } from '@solar-icons/react/bold/sort-vertical'
import { AlignLeftIcon as AlignLeft } from '@solar-icons/react/bold/align-left'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { CameraIcon as Camera } from '@solar-icons/react/bold/camera'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { ClipboardTextIcon as ClipboardList } from '@solar-icons/react/bold/clipboard-text'
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
import { PaintRollerIcon as Paintbrush } from '@solar-icons/react/bold/paint-roller'
import { WindowFrameIcon as LayoutTemplate } from '@solar-icons/react/bold/window-frame'

// Colunas que quem não tem sessão tem grant para ler (065_security_hardening
// + 089_anon_project_select_columns) — sem notas do professor. Autenticado
// continua a usar select('*'), este só entra em jogo para visitantes.
export const ANON_PROJECT_COLUMNS = [
  'id', 'created_at', 'user_id', 'name', 'area', 'goal', 'problem', 'solution',
  'target_audience', 'features', 'technologies', 'challenges', 'results', 'learnings',
  'cover_url', 'slug', 'ai_tagline', 'ai_description', 'ai_highlights',
  'school_year', 'course', 'school', 'creator_name', 'is_pap', 'pap_supervisor', 'pap_date',
  'project_type', 'score', 'linkedin_url', 'github_url', 'portfolio_url',
  'views', 'defense_date', 'preview_style', 'tags', 'guide_config', 'preview_blocks',
  'likes_count', 'interest_count', 'review_status', 'review_status_updated_at',
  'visibility', 'edit_token', 'notified_milestones',
  'library_file_url', 'library_file_name', 'library_file_type', 'parent_project_id',
  'github_stats', 'github_synced_at', 'timeline_public',
  'project_started_on', 'project_finished_on',
].join(', ')

// Todas as colunas do projeto, exceto as notas/nota do professor. Usada em
// vez de `select('*')` para QUALQUER utilizador autenticado (dono incluído)
// — o grant de coluna de `teacher_score*` para `authenticated` não distingue
// "és o dono/professor" de "és só um colaborador aceite": a policy de RLS já
// deixa um colaborador ler a linha toda (para poder editar as suas secções),
// e sem esta lista explícita o `select('*')` trazia a nota privada do
// professor no JSON de resposta, mesmo que a interface nunca a mostrasse a
// quem não é dono/professor. get_project_grades (RPC, verifica no servidor
// quem pode ver) continua a repor estes campos a seguir, só para quem tem
// direito — dono/professor não perdem nada, só deixam de vir no pedido inicial.
export const AUTH_PROJECT_COLUMNS = [
  'id', 'created_at', 'user_id', 'name', 'area', 'goal', 'problem', 'solution',
  'target_audience', 'features', 'technologies', 'challenges', 'results', 'learnings',
  'cover_url', 'slug', 'ai_tagline', 'ai_description', 'ai_highlights',
  'school_year', 'course', 'school', 'creator_name', 'is_pap', 'pap_supervisor', 'pap_date',
  'project_type', 'score', 'linkedin_url', 'github_url', 'portfolio_url',
  'edit_token', 'ai_feedback', 'views', 'notified_milestones', 'defense_date',
  'preview_style', 'tags', 'guide_config', 'preview_blocks',
  'likes_count', 'interest_count', 'review_status', 'review_status_updated_at',
  'report_draft', 'report_updated_at', 'featured', 'featured_order', 'dashboard_pinned',
  'visibility', 'defense_ai_data', 'entry_kind',
  'library_description', 'library_file_url', 'library_file_name', 'library_file_type',
  'library_thumb_url', 'profile_featured', 'profile_featured_order', 'profile_layout',
  'library_pdf_url', 'parent_project_id', 'library_skills', 'skills', 'tech_stack',
  'timeline_public', 'github_stats', 'github_synced_at',
  'project_started_on', 'project_finished_on', 'featured_notified_at', 'evaluation_mode',
].join(', ')
// timeline_public entrou aqui porque o RPC get_project_timeline só protege
// os DADOS da timeline — o componente ProjectTimeline também lê este campo
// do lado do cliente para decidir se mostra a secção, e sem ele nunca
// aparecia a nenhum visitante anónimo, mesmo em projetos com a timeline
// tornada pública (a nota antiga assumia que o RPC bastava; não bastava).

/* ── Prova de trabalho do GitHub ───────────────────────────────────────────
   Um link para o repositório obriga quem lê a sair da página e a saber ler
   um repositório. Os números do trabalho — quantos dias, durante quanto
   tempo, em que linguagens — dizem a mesma coisa a alguém que nunca abriu o
   GitHub na vida, e ficam aqui.

   Só aparece depois de o dono sincronizar; não inventa nada quando não há
   dados. Os commits e os meses são sempre os reais do repositório; os dias
   de trabalho só se contam nos commits lidos, por isso quando `partial`
   levam "+" — são um mínimo, não um número exato. */

/* ── Prova de API ─────────────────────────────────────────────────────────
   Só mostra tabelas marcadas como PÚBLICAS pelo dono — nunca a existência
   de tabelas privadas, e nunca a chave de API real. O exemplo de curl que
   mostra funciona mesmo sem chave nenhuma, porque é exatamente isso que
   "pública" significa aqui: qualquer pessoa lê, ninguém escreve sem
   credenciais. Um recrutador pode copiar e colar isto num terminal e ver
   dados a sério, sem precisar de conta nenhuma. */
/* Formata um valor de célula consoante o tipo declarado da coluna — é o
 * que separa "aqui está o JSON" de "isto parece um mini-app a sério". */
export function formatCellValue(value, type) {
  if (value === null || value === undefined || value === '') return null
  if (type === 'boolean') {
    const on = value === true || value === 'true'
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
        color: on ? 'var(--color-success)' : 'var(--color-text-tertiary)',
        background: on ? 'rgba(16,185,129,0.12)' : 'var(--color-bg-alt)',
        border: `1px solid ${on ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
        borderRadius: 99, padding: '2px 9px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
        {on ? 'Sim' : 'Não'}
      </span>
    )
  }
  if (type === 'date') {
    const d = new Date(value)
    return isNaN(d) ? String(value) : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (type === 'number') {
    return <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{String(value)}</span>
  }
  return String(value)
}

/* Dados reais da tabela, mostrados como um mini-app (cartões), não uma
 * folha de cálculo — o "Testar API" só com curl provava a existência da
 * API a outro programador; quem contrata normalmente não abre um
 * terminal, e uma tabela em bruto também não impressiona ninguém. Isto
 * usa o mesmo pedido (list_rows, sem chave nenhuma) mas apresenta cada
 * linha como um cartão, com o primeiro campo como título e o resto como
 * etiquetas — para parecer o ecrã de um produto real, não dados crus. */
export function LiveDataTable({ projectId, table }) {
  const [state, setState] = useState({ loading: true, rows: null, error: null })

  useEffect(() => {
    let cancelled = false
    listRows(projectId, table.id, 10)
      .then(data => { if (!cancelled) setState({ loading: false, rows: data.rows || [], error: null }) })
      .catch(err => { if (!cancelled) setState({ loading: false, rows: null, error: err.message }) })
    return () => { cancelled = true }
  }, [projectId, table.id])

  if (state.loading) {
    return <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>A carregar dados…</p>
  }
  if (state.error) {
    return <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--color-error)' }}>Não foi possível carregar os dados: {state.error}</p>
  }
  if (!state.rows.length) {
    return <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>Esta tabela ainda não tem linhas.</p>
  }

  const [titleCol, ...restCols] = table.columns

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {state.rows.map(r => {
          const titleValue = titleCol ? r.data?.[titleCol.name] : null
          return (
            <div key={r.id} style={{
              border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 12px',
              background: 'var(--color-bg-alt)', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                {titleValue !== null && titleValue !== undefined && titleValue !== ''
                  ? String(titleValue)
                  : <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Sem {titleCol?.name || 'título'}</span>}
              </div>
              {restCols.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {restCols.map(c => {
                    const formatted = formatCellValue(r.data?.[c.name], c.type)
                    if (formatted === null) return null
                    return (
                      <span key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{c.name}:</span> {formatted}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {state.rows.length === 10 && (
        <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--color-text-tertiary)' }}>A mostrar as 10 mais recentes.</p>
      )}
    </div>
  )
}

// Bloco de conteúdo "Tabela de dados" — a mesma LiveDataTable que o cartão
// "API ativa" já mostra, mas insertável onde o dono quiser na página (como
// uma citação ou imagem), em vez de viver sempre isolada no fundo. O bloco
// só guarda o id da tabela (block.url); os dados/colunas vêm sempre em
// direto para nunca desincronizar com o schema real.
export function DbTableBlock({ projectId, tableId }) {
  const [table, setTable] = useState(undefined) // undefined = a carregar, null = não encontrada

  useEffect(() => {
    let cancelled = false
    if (!projectId || !tableId) { setTable(null); return }
    listPublicTables(projectId).then(data => {
      if (cancelled) return
      setTable((data.tables || []).find(t => t.id === tableId) || null)
    }).catch(() => { if (!cancelled) setTable(null) })
    return () => { cancelled = true }
  }, [projectId, tableId])

  if (table === undefined) {
    return <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>A carregar tabela…</p>
  }
  // Tabela apagada ou tornada privada depois de o bloco ter sido criado —
  // não mostrar um bloco partido, só desaparece silenciosamente.
  if (!table) return null

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Database size={14} color="var(--color-primary)" />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{table.label}</div>
      </div>
      <LiveDataTable projectId={projectId} table={table} />
    </div>
  )
}

export function ApiProof({ project }) {
  const [tables, setTables] = useState(null) // null = a carregar
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!project?.id) return
    listPublicTables(project.id).then(data => {
      if (!cancelled) setTables(data.tables || [])
    }).catch(() => { if (!cancelled) setTables([]) })
    return () => { cancelled = true }
  }, [project?.id])

  if (!tables || !tables.length) return null

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '20px 24px', marginBottom: 16,
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Database size={14} color="var(--color-primary)" />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          API ativa
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '2px 8px' }}>
          {tables.length === 1 ? '1 tabela pública' : `${tables.length} tabelas públicas`}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tables.map(t => (
          <div key={t.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setOpenId(id => id === t.id ? null : t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 12px', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{t.columns.length} {t.columns.length === 1 ? 'campo' : 'campos'}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-primary)' }}>{openId === t.id ? 'Fechar' : 'Testar API ↓'}</span>
            </button>
            {openId === t.id && (
              <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--color-border)' }}>
                <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Dados reais desta tabela, em direto:
                </p>
                <LiveDataTable projectId={project.id} table={t} />
                <p style={{ margin: '14px 0 8px', fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Sem chave nenhuma — copia e cola isto num terminal:
                </p>
                <pre style={{ margin: 0, background: '#0d0d10', color: '#d8d8de', borderRadius: 8, padding: '11px 13px', fontSize: 11, lineHeight: 1.6, overflowX: 'auto', fontFamily: 'monospace' }}>
                  {publicCurlExample(t.id)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* Empurrão para quem já tem tecnologia a sério mas ainda não descobriu a
 * base de dados — só o dono vê, só quando o campo "Tecnologias" tem
 * conteúdo (sinal de que há código a funcionar, não só teoria) e o
 * projeto ainda não tem nenhuma tabela criada. Sem IA nenhuma a decidir,
 * é só uma condição sobre um campo que já existe. Dispensável por sessão
 * (localStorage), para não martelar quem já viu e decidiu não usar. */
export function DbSetupNudge({ project, isOwner }) {
  const navigate = useNavigate()
  const [tableCount, setTableCount] = useState(null) // null = a verificar
  const dismissKey = `showo_db_nudge_dismissed_${project?.id}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === '1' } catch { return false }
  })

  const technical = isTechnicalArea(project?.area)

  useEffect(() => {
    if (!isOwner || !project?.id || !technical || !project?.technologies?.trim()) return
    let cancelled = false
    listTables(project.id).then(data => {
      if (!cancelled) setTableCount((data.tables || []).length)
    }).catch(() => { if (!cancelled) setTableCount(0) })
    return () => { cancelled = true }
  }, [isOwner, project?.id, technical, project?.technologies])

  if (!isOwner || dismissed || !technical || !project?.technologies?.trim() || tableCount === null || tableCount > 0) return null

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(dismissKey, '1') } catch { /* localStorage indisponível, não é crítico */ }
  }

  return (
    <div
      onClick={() => navigate(`/editar/${project.slug}?tab=database`)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/editar/${project.slug}?tab=database`) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border))',
        borderRadius: 12, padding: '10px 12px', marginBottom: 10, cursor: 'pointer',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}
    >
      <Database size={15} color="var(--color-primary)" style={{ flexShrink: 0 }} />
      <p style={{ margin: 0, flex: 1, fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>
        Liga uma base de dados própria em 2 minutos.
      </p>
      <button
        onClick={e => { e.stopPropagation(); dismiss() }}
        aria-label="Dispensar"
        style={{ flexShrink: 0, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
      ><X size={13} /></button>
    </div>
  )
}

function proofHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// Prova por link: um sítio onde o resultado já funciona (site publicado,
// demo, vídeo, protótipo). Usa a coluna portfolio_url que já existia; não
// entra no score.
export function LiveProof({ project, isOwner, onSave }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const url = project?.portfolio_url

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>A funcionar</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{proofHost(url)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>Ver ↗</span>
      </a>
    )
  }

  if (!isOwner || !onSave || !(project?.results || '').trim()) return null

  async function submit(e) {
    e.preventDefault()
    const raw = draft.trim()
    if (!raw) return
    let normalized
    try {
      if (/\s/.test(raw)) throw new Error('espaços')
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      if (!u.hostname.includes('.')) throw new Error('host sem ponto')
      normalized = u.toString()
    } catch { setError('Isto não parece um link válido.'); return }
    setSaving(true); setError('')
    const ok = await onSave(normalized)
    setSaving(false)
    if (!ok) setError('Não foi possível guardar. Tenta novamente.')
  }

  return (
    <form onSubmit={submit} style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
      borderRadius: 10, padding: '10px 16px', marginBottom: 16,
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', flex: '1 1 220px' }}>
        Tens os resultados escritos. Falta a prova: cola o link de algo que já funciona (site, demo, vídeo).
      </span>
      <input
        type="text" value={draft} onChange={e => setDraft(e.target.value)}
        placeholder="https://..." aria-label="Link da prova"
        style={{ flex: '1 1 180px', minWidth: 0, padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'inherit' }}
      />
      <button type="submit" disabled={saving || !draft.trim()} style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 700, borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving || !draft.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
        {saving ? 'A guardar…' : 'Guardar'}
      </button>
      {error && <span style={{ flexBasis: '100%', fontSize: 12, color: 'var(--color-error, #f43f5e)' }}>{error}</span>}
    </form>
  )
}

export function GithubProof({ project }) {
  const stats = project?.github_stats
  if (!stats?.commits) return null
  const compact = !!project?.preview_style?.githubCompact

  const langs = topLanguages(stats.languages, 3)
  // months vem sempre da mesma janela que "dias de trabalho" (ver
  // commitSpanMonths em lib/social.js) — os dois números ao lado um do
  // outro descrevem sempre o mesmo período, nunca períodos diferentes.
  const months = commitSpanMonths(stats)
  const trueAge = repoAgeMonths(stats)
  // Só vale a pena a frase extra quando a diferença é visível — um ou dois
  // meses de arredondamento não são "o repositório é mais antigo".
  const showAgeNote = stats.partial && trueAge && months && trueAge > months + 1

  const facts = [
    { label: stats.commits === 1 ? 'commit' : 'commits', value: stats.commits },
    { label: stats.active_days === 1 && !stats.partial ? 'dia de trabalho' : 'dias de trabalho', value: stats.partial ? `${stats.active_days}+` : stats.active_days },
    months ? { label: months === 1 ? 'mês de atividade' : 'meses de atividade', value: stats.partial ? `${months}+` : months } : null,
  ].filter(Boolean)

  if (compact) {
    // Uma linha só: mesmos números, sem linguagens nem nota de rodapé —
    // para quem prefere a página mais limpa.
    const summary = facts.map(f => `${f.value} ${f.label}`).join(' · ')
    return (
      <a href={stats.url} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>GitHub</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{stats.owner}/{stats.repo} ↗</span>
      </a>
    )
  }

  return (
    // Estilo explícito, não a classe .proj-card: este painel aparece nas
    // duas vistas (a do dono e a pública), e só uma delas carrega essa folha.
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '20px 24px', marginBottom: 16,
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Código no GitHub
        </div>
        <a href={stats.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', fontWeight: 600, textDecoration: 'none' }}>
          {stats.owner}/{stats.repo} ↗
        </a>
      </div>

      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
        {facts.map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{f.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{f.label}</div>
          </div>
        ))}
      </div>

      {langs.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {langs.map(l => (
            <span key={l.name} style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 7, padding: '5px 10px' }}>
              {l.name} <span style={{ opacity: 0.6 }}>{l.pct}%</span>
            </span>
          ))}
        </div>
      )}

      {showAgeNote && (
        <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
          O repositório tem {stats.commits} commits ao todo; os números acima cobrem só os mais recentes.
        </p>
      )}
    </div>
  )
}

export const colors = {
  bg: 'var(--color-bg)',
  bgAlt: 'var(--color-bg-alt)',
  card: 'var(--color-surface)',
  cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue: 'var(--color-primary)',
  blueHover: 'var(--color-primary-hover)',
  blueGlow: 'var(--color-primary-subtle)',
  blueSubtle: 'var(--color-primary-subtle)',
  blueBg: 'var(--color-primary-subtle)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  green: 'var(--color-success)',
  greenGlow: 'var(--color-success-subtle)',
  greenBg: 'var(--color-success-subtle)',
  yellow: 'var(--color-warning)',
  yellowGlow: 'var(--color-warning-subtle)',
  orange: 'var(--color-warning)',
  orangeGlow: 'var(--color-warning-subtle)',
  glass: 'var(--color-glass)',
  glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)',
  glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

export const CONFETTI_COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-warning)', 'var(--color-accent)', '#ec4899', '#06b6d4']

export const PROJECT_TYPE_LABELS = {
  group: 'Trabalho de grupo',
  pap: 'Projeto final',
  presentation: 'Apresentação',
  personal: 'Projeto pessoal',
  competition: 'Projeto de competição',
  internship: 'Estágio',
  other: 'Outro',
}

export const TYPE_HERO = {
  pap:         { c1: 'var(--color-primary)', c2: 'var(--color-primary)', Icon: GraduationCap },
  internship:  { c1: 'var(--color-success)', c2: 'var(--color-success)', Icon: Briefcase },
  group:       { c1: 'var(--color-warning)', c2: 'var(--color-warning)', Icon: Users },
  personal:    { c1: 'var(--color-primary)', c2: 'var(--color-accent)', Icon: Rocket },
  competition: { c1: 'var(--color-error)', c2: 'var(--color-error)', Icon: Trophy },
  presentation:{ c1: 'var(--color-accent)', c2: 'var(--color-accent)', Icon: BarChart2 },
}

// minLen vem de projectFields.js (a mesma fonte do score e das missões) —
// só o "tip" (conselho de escrita) é específico desta vista. Antes tinha
// os seus próprios números (60 para quase tudo) que não coincidiam com os
// 120/100/60 do score, por isso um campo podia passar aqui como "com
// detalhe suficiente" e continuar a não valer pontos nenhuns no score.
export const PROFILE_SCORE_FIELDS = [
  { key: 'problem',         label: getProjectField('problem').label,         minLen: getProjectField('problem').minLen,         tip: 'Descreve quem sofre com o problema, qual o impacto real e por que é urgente. Evita respostas de uma linha.' },
  { key: 'solution',        label: getProjectField('solution').label,        minLen: getProjectField('solution').minLen,        tip: 'Explica como funciona tecnicamente: a abordagem, a arquitetura, o que a torna única.' },
  { key: 'results',         label: getProjectField('results').label,         minLen: getProjectField('results').minLen,         tip: 'Acrescenta números concretos: %, tempo poupado, utilizadores impactados, métricas.' },
  { key: 'learnings',       label: getProjectField('learnings').label,       minLen: getProjectField('learnings').minLen,       tip: 'Explica o que foi difícil, o que farias diferente, e que competências reais ganhaste.' },
  { key: 'technologies',    label: getProjectField('technologies').label,    minLen: getProjectField('technologies').minLen,    tip: 'Lista linguagens, frameworks, bases de dados, APIs e ferramentas. Quanto mais completo, melhor.' },
  { key: 'target_audience', label: getProjectField('target_audience').label, minLen: getProjectField('target_audience').minLen, tip: 'Sê específico: perfil, faixa etária, contexto profissional, necessidades concretas.' },
  { key: 'features',        label: getProjectField('features').label,        minLen: getProjectField('features').minLen,        tip: 'Descreve cada funcionalidade com uma frase sobre o que faz e porquê é relevante.' },
  { key: 'challenges',      label: getProjectField('challenges').label,      minLen: getProjectField('challenges').minLen,      tip: 'Conta um obstáculo real e como o resolveste — é o que mostra que enfrentaste o problema, não só que o descreveste.' },
  { key: 'cover_url',       label: 'Foto de capa',   minLen: 1,           tip: 'Uma boa imagem de capa aumenta muito a impressão do projeto.' },
]

export const SECTION_META = {
  problem:         { Icon: Search,     label: 'Problema' },
  solution:        { Icon: Lightbulb,  label: 'Solução' },
  target_audience: { Icon: Target,     label: 'Público-alvo' },
  features:        { Icon: Wrench,     label: 'Funcionalidades' },
  technologies:    { Icon: Wrench,     label: 'Tecnologias' },
  challenges:      { Icon: Zap,        label: 'Desafios' },
  results:         { Icon: TrendingUp, label: 'Resultados' },
  learnings:       { Icon: Lightbulb,  label: 'Aprendizagens' },
}

// Oito cartões iguais em fila liam-se como um formulário impresso, não
// como uma página — agrupados por assunto, com um único cabeçalho por
// grupo, cortam a repetição visual sem esconder nenhum campo.
export const SECTION_GROUPS = [
  { id: 'grp-problema',  label: 'O problema e a solução',    fields: ['problem', 'solution'] },
  { id: 'grp-publico',   label: 'Para quem é, e o que tem',  fields: ['target_audience', 'features'] },
  { id: 'grp-processo',  label: 'Como foi feito',             fields: ['technologies', 'challenges'] },
  { id: 'grp-resultado', label: 'O que saiu daqui',           fields: ['results', 'learnings'] },
]

// Progress bar: semantic color based on completion
// <40% orange (needs attention), 40-89% blue (in progress), ≥90% green (done)
// field_key is free text at the DB level — rows written by other tools (an
// older AI-jury experiment left some with field_key='JURY_EVAL', for
// instance) fall outside FB_SECTION_LABELS. Humanize those instead of
// showing the raw snake/upper-case key.
export function humanizeFieldKey(key) {
  return key.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())
}

// Some legacy rows (same AI-jury origin) stored a JSON blob — ratings per
// criterion plus a free-text note — directly in the comment column instead
// of the plain text this page itself always saves. Render that shape nicely
// instead of dumping the raw JSON string.
export function FeedbackCommentText({ comment, textColor }) {
  const trimmed = (comment || '').trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && parsed.ratings && typeof parsed.ratings === 'object') {
        const note = Object.entries(parsed).find(([k, v]) => k !== 'ratings' && k !== 'avg' && typeof v === 'string')
        return (
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {Object.entries(parsed.ratings).map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 5, padding: '1px 6px', textTransform: 'capitalize' }}>
                {k}: {v}
              </span>
            ))}
            {parsed.avg != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 5, padding: '1px 6px' }}>
                média: {parsed.avg}
              </span>
            )}
            {note && <span style={{ color: textColor }}>{note[1]}</span>}
          </span>
        )
      }
    } catch {}
  }
  return comment
}

export function progBar(pct) {
  if (pct >= 90) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-primary)'
  return 'var(--color-warning)'
}
// Translucent track that matches the fill colour (~12% opacity)
export function progTrack(pct) {
  if (pct >= 90) return 'var(--color-success-subtle)'
  if (pct >= 40) return 'var(--color-primary-subtle)'
  return 'var(--color-warning-subtle)'
}

// Area-based gradient for the hero background (when no cover image)
// Uses CSS variables so it adapts to both dark and light themes
export function getAreaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software') || a.includes('digital') || a.includes('eletrónic'))
    return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-primary)', accent2: 'var(--color-info)' }
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas') || a.includes('gestão') || a.includes('negócio'))
    return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-accent)', accent2: 'var(--color-primary)' }
  if (a.includes('design') || a.includes('arte') || a.includes('visual') || a.includes('multimédia') || a.includes('gráfico'))
    return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-success)', accent2: 'var(--color-info)' }
  if (a.includes('saúde') || a.includes('saude') || a.includes('farmác') || a.includes('medicina') || a.includes('bio'))
    return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-success)', accent2: 'var(--color-success)' }
  if (a.includes('construção') || a.includes('civil') || a.includes('arquitet'))
    return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-warning)', accent2: 'var(--color-warning)' }
  return { g1: 'var(--color-surface)', g2: 'var(--color-surface-alt)', accent1: 'var(--color-primary)', accent2: 'var(--color-accent)' }
}

export function getLevelInfo(score) {
  if (score >= 86) return { label: 'Nível profissional', color: 'var(--color-success)' }
  if (score >= 71) return { label: 'Quase profissional', color: 'var(--color-accent)' }
  if (score >= 51) return { label: 'A ganhar forma', color: 'var(--color-primary)' }
  if (score >= 31) return { label: 'A começar', color: 'var(--color-warning)' }
  return { label: 'Rascunho', color: 'var(--color-error)' }
}

export function getScoreTips(project) {
  const v = (k) => String(project[k] || '').trim()
  const n = (k) => v(k).length
  const tips = []
  if (n('problem') < 100)        tips.push({ gain: 15, text: `Problema: ${n('problem')}/100 car.` })
  if (n('solution') < 100)       tips.push({ gain: 15, text: `Solução: ${n('solution')}/100 car.` })
  if (n('results') < 80)         tips.push({ gain: 12, text: `Resultados: ${n('results')}/80 car.` })
  if (n('learnings') < 80)       tips.push({ gain: 12, text: `Aprendizagens: ${n('learnings')}/80 car.` })
  if (!v('cover_url'))            tips.push({ gain: 10, text: 'Adiciona uma capa ao projeto' })
  if (n('target_audience') < 50) tips.push({ gain: 10, text: `Público-alvo: ${n('target_audience')}/50 car.` })
  if (n('features') < 100)       tips.push({ gain: 10, text: `Funcionalidades: ${n('features')}/100 car.` })
  if (!v('technologies'))         tips.push({ gain: 8,  text: 'Indica as tecnologias usadas' })
  if (n('challenges') < 50)      tips.push({ gain: 8,  text: `Desafios: ${n('challenges')}/50 car.` })
  if (!v('area'))                 tips.push({ gain: 5,  text: 'Define a área do projeto' })
  return tips.sort((a, b) => b.gain - a.gain).slice(0, 3)
}

export const ScoreRing = memo(function ScoreRing({ score, size = 108 }) {
  const stroke = size <= 80 ? 6 : 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const dasharray = `${dash} ${circ - dash}`
  const { color } = getLevelInfo(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, filter: `drop-shadow(0 0 6px ${color}80)` }}>
      {/* Outer glow ring */}
      <div style={{
        position: 'absolute', inset: -6, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
        filter: 'none',
      }} />
      <svg width={size} height={size} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative', zIndex: 1 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={dasharray} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.4s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size <= 80 ? 18 : 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{score}</span>
        <span style={{ fontSize: size <= 80 ? 7 : 9, color: colors.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>score</span>
      </div>
    </div>
  )
})

export const SECTION_CLAMP_LINES = 8  // max lines before "ver mais"
export const APPROX_CHARS_PER_LINE = 70

export const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C#': '#178600', 'C++': '#f34b7d', C: '#555555', Ruby: '#701516', Go: '#00ADD8',
  Rust: '#dea584', Swift: '#F05138', Kotlin: '#A97BFF', PHP: '#4F5D95', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Lua: '#000080', R: '#198CE7',
  Vue: '#41b883', SCSS: '#c6538c', Svelte: '#ff3e00',
}

export function parseGitHubUrl(url) {
  if (!url) return null
  const m = url.match(/github\.com\/([^/]+)\/([^/?\s#]+)/)
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null
}

export const GH_ICON = <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>

export const GH_VARIANTS = [
  { id: 'full', label: 'Completo' },
  { id: 'compact', label: 'Compacto' },
  { id: 'badge', label: 'Badge' },
  { id: 'langs', label: 'Linguagens' },
]

export function useGitHubRepo(githubUrl) {
  const [data, setData] = useState(null)
  const [langs, setLangs] = useState(null)
  const parsed = useMemo(() => parseGitHubUrl(githubUrl), [githubUrl])
  useEffect(() => {
    if (!parsed) return
    let cancelled = false
    const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`
    Promise.all([
      fetch(base).then(r => r.ok ? r.json() : null),
      fetch(`${base}/languages`).then(r => r.ok ? r.json() : null),
    ]).then(([repo, languages]) => {
      if (cancelled) return
      if (repo) setData(repo)
      if (languages) setLangs(languages)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [parsed])
  const totalBytes = langs ? Object.values(langs).reduce((a, b) => a + b, 0) : 0
  const topLangs = langs ? Object.entries(langs).slice(0, 6).map(([name, bytes]) => ({
    name, pct: Math.round(bytes / totalBytes * 100),
  })) : []
  return { parsed, data, topLangs }
}

export function LangBar({ topLangs }) {
  if (!topLangs.length) return null
  return (
    <>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        {topLangs.map(l => (
          <div key={l.name} style={{ width: `${l.pct}%`, background: LANG_COLORS[l.name] || '#8b8b8b', minWidth: l.pct > 0 ? 3 : 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {topLangs.map(l => (
          <span key={l.name} style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[l.name] || '#8b8b8b', display: 'inline-block' }} />
            {l.name} <span style={{ color: 'var(--color-text-tertiary)' }}>{l.pct}%</span>
          </span>
        ))}
      </div>
    </>
  )
}

export const GitHubCard = memo(function GitHubCard({ githubUrl, variant = 'full' }) {
  const { parsed, data, topLangs } = useGitHubRepo(githubUrl)
  if (!parsed || !data) return null

  const repoLink = <a href={githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{parsed.owner}/{parsed.repo}</a>
  const stats = (
    <span style={{ display: 'inline-flex', gap: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
      {data.stargazers_count > 0 && <span>⭐ {data.stargazers_count}</span>}
      {data.forks_count > 0 && <span>🍴 {data.forks_count}</span>}
    </span>
  )

  if (variant === 'badge') return (
    <a href={githubUrl} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8,
      padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none',
    }}>
      {GH_ICON} {parsed.owner}/{parsed.repo}
      {data.stargazers_count > 0 && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>⭐ {data.stargazers_count}</span>}
      {topLangs[0] && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[topLangs[0].name] || '#8b8b8b' }} />
          {topLangs[0].name}
        </span>
      )}
    </a>
  )

  if (variant === 'langs') return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
        {GH_ICON} {repoLink}
      </div>
      <LangBar topLangs={topLangs} />
    </div>
  )

  if (variant === 'compact') return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12,
      padding: 16, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ color: 'var(--color-text)', flexShrink: 0 }}>{GH_ICON}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{repoLink}</div>
        {data.description && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.description}</div>}
      </div>
      {stats}
      {topLangs.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {topLangs.slice(0, 4).map(l => (
            <span key={l.name} title={`${l.name} ${l.pct}%`} style={{ width: 10, height: 10, borderRadius: '50%', background: LANG_COLORS[l.name] || '#8b8b8b' }} />
          ))}
        </div>
      )}
    </div>
  )

  // full (default)
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ color: 'var(--color-text)' }}>{GH_ICON}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{repoLink}</span>
        {stats}
      </div>
      {data.description && (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>{data.description}</p>
      )}
      <LangBar topLangs={topLangs} />
      <div style={{ display: 'flex', gap: 16, marginTop: topLangs.length ? 14 : 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {data.updated_at && (
          <span>Último update: {new Date(data.pushed_at || data.updated_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        )}
        {data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' && <span>📄 {data.license.spdx_id}</span>}
      </div>
    </div>
  )
})

export const Section = memo(function Section({ fieldKey, content, isOwner, canEdit, onImprove, highlight = false }) {
  const meta    = SECTION_META[fieldKey] ?? { Icon: Wrench, label: fieldKey }
  const fieldCfg = PROFILE_SCORE_FIELDS.find(f => f.key === fieldKey)
  const len     = (content || '').trim().length
  const isEmpty = len === 0
  const isPlaceholder = !isEmpty && hasPlaceholder(content)
  const isShort = !isPlaceholder && len > 0 && len < (fieldCfg?.minLen ?? 60)
  const challenge = CHALLENGES.find(c => c.field === fieldKey)
  const isTruncatable = len > SECTION_CLAMP_LINES * APPROX_CHARS_PER_LINE
  const [expanded, setExpanded] = useState(false)

  const editable = canEdit ?? isOwner
  // Uma secção já feita (sem avisos) não precisa de continuar aberta a
  // ocupar espaço — só interessa mesmo abrir de novo quem está a gerir o
  // projeto, para rever ou editar. Um visitante lê sempre tudo aberto: é
  // o conteúdo que veio ver, não uma lista de tarefas para arrumar.
  const isComplete = !isEmpty && !isShort && !isPlaceholder
  const [collapsed, setCollapsed] = useState(() => editable && isComplete)

  if (isEmpty && !isOwner && !editable) return null

  // Um dos oito campos ganha um tratamento diferente — sem isto, a página
  // é oito caixas idênticas em fila, cada uma "mais uma parede de texto".
  // Só se aplica quando o conteúdo é mesmo real: um destaque a apontar
  // para texto vazio ou placeholder seria pior do que não ter nenhum.
  const showHighlight = highlight && isComplete && !collapsed

  return (
    <div className="proj-card-pad proj-card" style={{
      border: `1px solid ${isShort || isPlaceholder ? 'var(--color-warning-subtle)' : showHighlight ? 'var(--color-primary-subtle)' : isEmpty ? colors.subtle + '55' : isComplete ? 'var(--color-success-subtle)' : colors.border}`,
      background: showHighlight ? 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))' : undefined,
    }}>
      <div
        onClick={() => { if (editable && isComplete) setCollapsed(c => !c) }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: isEmpty || collapsed ? 0 : 12,
          cursor: editable && isComplete ? 'pointer' : 'default',
        }}
      >
        <h3 style={{
          margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: isShort || isPlaceholder ? colors.yellow : isEmpty ? colors.subtle : isComplete && !showHighlight ? 'var(--color-success)' : colors.muted,
          display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1,
        }}>
          <meta.Icon size={13} style={{ flexShrink: 0 }} />
          <span style={{ flexShrink: 0 }}>{meta.label}</span>
          {isPlaceholder ? (
            <span style={{ fontSize: 10, color: colors.yellow, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 4, padding: '1px 7px', letterSpacing: '0.03em', fontWeight: 700, flexShrink: 0 }}>
              Ainda é o modelo
            </span>
          ) : isShort ? (
            <span style={{ fontSize: 10, color: colors.yellow, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 4, padding: '1px 7px', letterSpacing: '0.03em', fontWeight: 700, flexShrink: 0 }}>
              Pouco detalhe
            </span>
          ) : isComplete && collapsed && (
            <span style={{
              fontSize: 13, color: colors.subtle, fontWeight: 400, textTransform: 'none', letterSpacing: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              — {content.trim()}
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {editable && challenge && !isEmpty && !collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); onImprove(challenge) }}
              style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: colors.blue, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', padding: '8px 12px', borderRadius: 6, flexShrink: 0, transition: 'all 0.15s', minHeight: 36 }}
              onMouseEnter={e => { e.currentTarget.style.background = `${colors.blue}1e`; e.currentTarget.style.borderColor = `${colors.blue}44` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${colors.blue}10`; e.currentTarget.style.borderColor = `${colors.blue}22` }}
            >
              <span style={{display:'flex',alignItems:'center',gap:4}}>Editar <ChevronRight size={12} /></span>
            </button>
          )}
          {editable && isComplete && (
            <ChevronDown size={15} color={colors.subtle} style={{ transition: 'transform 0.15s', transform: collapsed ? 'none' : 'rotate(180deg)' }} />
          )}
        </div>
      </div>

      {collapsed ? null : isEmpty ? (
        editable && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: colors.subtle, fontStyle: 'italic' }}>Campo ainda vazio</p>
            {challenge && (
              <button
                onClick={() => onImprove(challenge)}
                style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: colors.blue, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${colors.blue}1e`; e.currentTarget.style.borderColor = `${colors.blue}44` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${colors.blue}10`; e.currentTarget.style.borderColor = `${colors.blue}22` }}
              >
                Preencher
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <div style={{ position: 'relative', paddingLeft: showHighlight ? 16 : 0, borderLeft: showHighlight ? '3px solid var(--color-primary)' : 'none' }}>
            <p style={{
              margin: 0, color: isShort || isPlaceholder ? '#afc3dc' : showHighlight ? colors.text : colors.text,
              fontSize: showHighlight ? 18 : 15, lineHeight: showHighlight ? 1.6 : 1.75,
              fontFamily: showHighlight ? 'var(--font-heading)' : 'inherit',
              fontWeight: showHighlight ? 500 : 400,
              letterSpacing: showHighlight ? '-0.2px' : 'normal',
              whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word',
              ...(isTruncatable && !expanded ? {
                display: '-webkit-box',
                WebkitLineClamp: SECTION_CLAMP_LINES,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } : {}),
            }}>{content}</p>
            {isTruncatable && !expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 48,
                background: `linear-gradient(to bottom, transparent, ${colors.card})`,
                pointerEvents: 'none',
              }} />
            )}
          </div>
          {isTruncatable && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                color: colors.blue, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
          {editable && isPlaceholder ? (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 8, padding: '9px 12px' }}>
              <Lightbulb size={13} color="#d4a820" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#d4a820', lineHeight: 1.6 }}>
                Isto ainda tem os parênteses do rascunho (ex: [contexto], [X]%) — substitui pelo teu conteúdo real antes de partilhar o projeto.
              </p>
            </div>
          ) : editable && isShort && fieldCfg?.tip && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 8, padding: '9px 12px' }}>
              <Lightbulb size={13} color="#d4a820" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#d4a820', lineHeight: 1.6 }}>{fieldCfg.tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
})

export const MissionRow = memo(function MissionRow({ challenge, project, onImprove, isOwner }) {
  const isCompleted = getChallengeStatus(challenge, project) === 'completed'
  const val         = String(project[challenge.field] || '').trim()
  const progress    = Math.min(val.length / challenge.threshold, 1)
  const ChalIcon    = challenge.icon
  const realGain    = (() => {
    if (isCompleted) return challenge.scoreGain
    const cur = calculateScore(project).score
    const max = calculateScore({ ...project, [challenge.field]: 'x'.repeat(challenge.threshold) }).score
    return Math.max(0, max - cur)
  })()

  return (
    <div
      className="mission-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 12,
        background: isCompleted ? 'var(--color-success-subtle)' : colors.bgAlt,
        border: `1px solid ${isCompleted ? 'var(--color-success-subtle)' : colors.border}`,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Status dot / icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: isCompleted ? 'var(--color-success-subtle)' : 'var(--color-bg-alt)',
        border: `1px solid ${isCompleted ? 'var(--color-success-subtle)' : colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isCompleted ? 'var(--color-success)' : colors.muted,
      }}>
        {isCompleted ? <Check size={13} strokeWidth={3} /> : <ChalIcon size={13} />}
      </div>

      {/* Title + mini progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isCompleted ? 500 : 700,
          color: isCompleted ? colors.subtle : colors.text,
          textDecoration: isCompleted ? 'line-through' : 'none',
          marginBottom: (!isCompleted && val.length > 0) ? 5 : 0,
        }}>
          {challenge.title}
        </div>
        {!isCompleted && val.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 3, background: progTrack(Math.round(progress * 100)), borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress * 100}%`,
                background: progBar(Math.round(progress * 100)),
                transition: 'width 0.4s ease-out',
              }} />
            </div>
            <span style={{ fontSize: 10, color: colors.subtle, flexShrink: 0 }}>{val.length}/{challenge.threshold}</span>
          </div>
        )}
      </div>

      {/* Points badge */}
      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0, borderRadius: 999, padding: '2px 9px',
        color: isCompleted ? 'var(--color-success)' : colors.blue,
        background: isCompleted ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)',
        border: `1px solid ${isCompleted ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)'}`,
      }}>
        {isCompleted ? <Check size={10} strokeWidth={3} /> : `+${realGain} XP`}
      </span>

      {/* Action */}
      {!isCompleted && isOwner && (
        <button
          onClick={() => onImprove(challenge)}
          style={{
            background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)',
            color: colors.blue, borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, minHeight: 36,
          }}
        >
          <span style={{display:'flex',alignItems:'center',gap:4}}>Fazer <ChevronRight size={12} /></span>
        </button>
      )}
    </div>
  )
})

export function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 100}px)`,
      opacity: visible ? 1 : 0,
      background: 'var(--color-surface)',
      border: `1px solid ${colors.borderBright}`,
      borderRadius: 10, padding: '14px 28px',
      color: 'var(--color-text)', fontSize: 15, fontWeight: 600,
      zIndex: 2000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
      whiteSpace: 'nowrap',
      boxShadow: 'none',
      pointerEvents: 'none',
      fontFamily: 'inherit',
    }}>
      {message}
    </div>
  )
}

export function Confetti() {
  const particlesRef = useRef(null)
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.8,
      duration: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    }))
  }
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998, overflow: 'hidden' }}>
      {particlesRef.current.map(p => (
        <div key={p.id} style={{ position: 'absolute', top: '-12px', left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2, animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  )
}

export const SECTION_LABELS = { cover: 'Introdução', problem: 'Problema', solution: 'Solução', features: 'Funcionalidades', technologies: 'Tecnologias', results: 'Resultados', learnings: 'Aprendizagens', closing: 'Encerramento' }

// ── Block types for preview workspace ─────────────────────────────────────────
export const BLOCK_TYPES = [
  { type: 'note',    label: 'Nota',          Icon: AlignLeft,  desc: 'Mensagem tua para visitantes' },
  { type: 'heading', label: 'Título',        Icon: Type,       desc: 'Título de secção personalizado' },
  { type: 'callout', label: 'Destaque',      Icon: Sparkles,   desc: 'Caixa em destaque colorida' },
  { type: 'quote',   label: 'Citação',       Icon: Quote,      desc: 'Frase ou citação marcante' },
  { type: 'metric',  label: 'Métrica',       Icon: Star,       desc: 'Número ou dado relevante' },
  { type: 'stats',   label: 'Estatísticas',  Icon: BarChart2,  desc: '3 métricas lado a lado' },
  { type: 'image',   label: 'Imagem',        Icon: Image,      desc: 'Imagem por URL ou upload' },
  { type: 'gallery', label: 'Galeria',       Icon: Layout,     desc: 'Até 3 imagens lado a lado' },
  { type: 'video',   label: 'Vídeo',         Icon: Video,      desc: 'YouTube ou Vimeo embed' },
  { type: 'card',    label: 'Card',          Icon: ClipboardList, desc: 'Cartão livre. Título + dados (ex: idade, função...)' },
  { type: 'cta',     label: 'Botão CTA',     Icon: ArrowRight, desc: 'Chamada à ação destacada' },
  { type: 'link',    label: 'Link',          Icon: Link,       desc: 'GitHub, demo, portfolio...' },
  { type: 'github',  label: 'GitHub',        Icon: FileText,   desc: 'Card do repositório com linguagens' },
  { type: 'linkedin', label: 'LinkedIn',    Icon: User,       desc: 'Card do perfil LinkedIn' },
  { type: 'divider', label: 'Divisor',       Icon: Minus,      desc: 'Linha separadora de secções' },
  { type: 'dbtable', label: 'Tabela de dados', Icon: Database, desc: 'Dados reais de uma tabela ligada, em direto' },
]

export function newBlock(type, posIndex = 0) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    type, content: '', imageUrl: '', imageUrl2: '', imageUrl3: '',
    label: '', url: '', color: '', align: 'left', width: 'full',
    videoUrl: '',
    stat1Value: '', stat1Label: '',
    stat2Value: '', stat2Label: '',
    stat3Value: '', stat3Label: '',
    dividerStyle: 'solid',
    cardTitle: '',
    cardRows: [{ label: '', value: '' }, { label: '', value: '' }],
    // Position in the freeform canvas (% of canvas width/height) — staggered
    // so newly-added blocks don't all stack on top of each other at 0,0.
    pos: { x: 8 + (posIndex % 4) * 6, y: 8 + (posIndex % 5) * 10 },
  }
}

export const BLOCK_ACCENT_COLORS = [
  { label: 'Azul',    value: 'var(--color-primary)' },
  { label: 'Verde',   value: 'var(--color-success)' },
  { label: 'Roxo',    value: '#a78bfa' },
  { label: 'Laranja', value: 'var(--color-warning)' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Cinza',   value: '#6b7280' },
]

// ── Preview style options ──────────────────────────────────────────────────────
export const FONT_OPTIONS = [
  { key: 'default',  label: 'Montserrat', css: 'Montserrat, sans-serif',    sample: 'Aa' },
  { key: 'inter',    label: 'Inter',      css: 'Inter, sans-serif',          sample: 'Aa' },
  { key: 'syne',     label: 'Syne',       css: 'Syne, sans-serif',           sample: 'Aa' },
  { key: 'fredoka',  label: 'Fredoka',    css: '"Fredoka One", cursive',     sample: 'Aa' },
  { key: 'mono',     label: 'Mono',       css: '"Courier New", monospace',   sample: 'Aa' },
  { key: 'serif',    label: 'Serif',      css: 'Georgia, serif',             sample: 'Aa' },
]

export const TITLE_FONT_OPTIONS = [
  { key: 'croogla',  label: 'Croogla',  css: 'Croogla, sans-serif',                    sample: 'Aw' },
  { key: 'syne',     label: 'Syne',     css: 'Syne, sans-serif',                        sample: 'Aw' },
  { key: 'playfair', label: 'Playfair', css: '"Playfair Display", serif',               sample: 'Aw' },
  { key: 'space',    label: 'Space',    css: '"Space Grotesk", sans-serif',              sample: 'Aw' },
  { key: 'fredoka',  label: 'Fredoka',  css: '"Fredoka One", cursive',                  sample: 'Aw' },
  { key: 'inter',    label: 'Inter',    css: 'Inter, sans-serif',                        sample: 'Aw' },
]

export const TITLE_STYLE_OPTIONS = [
  { key: 'normal',   label: 'Normal'    },
  { key: 'caps',     label: 'CAPS'      },
  { key: 'gradient', label: 'Gradiente' },
]

export const BG_OPTIONS = [
  { key: 'default',  label: 'Padrão',   bg: null,      preview: '#060c18',
    previewGradient: 'linear-gradient(135deg, #060c18 0%, #111c32 100%)' },
  { key: 'midnight', label: 'Midnight', bg: '#030508', preview: '#030508',
    previewGradient: 'linear-gradient(135deg, #030508 0%, #0a0a12 100%)' },
  { key: 'navy',     label: 'Navy',
    bg: 'radial-gradient(ellipse at 25% 60%, #0c1e38 0%, #060d1a 100%)',
    preview: '#0c1e38', previewGradient: 'linear-gradient(135deg, #0c1e38 0%, #060d1a 100%)' },
  { key: 'cosmic',   label: 'Cosmic',
    bg: 'radial-gradient(ellipse at 75% 25%, #160b2a 0%, #08031a 100%)',
    preview: '#160b2a', previewGradient: 'linear-gradient(135deg, #160b2a 0%, #08031a 100%)' },
  { key: 'forest',   label: 'Floresta',
    bg: 'radial-gradient(ellipse at 50% 0%, #081408 0%, #04090a 100%)',
    preview: '#081408', previewGradient: 'linear-gradient(135deg, #0a1a0a 0%, #04090a 100%)' },
  { key: 'warm',     label: 'Quente',   bg: '#140c02', preview: '#140c02',
    previewGradient: 'linear-gradient(135deg, #1e1004 0%, #0e0702 100%)' },
  { key: 'slate',    label: 'Ardósia',  bg: '#0c1018', preview: '#0c1018',
    previewGradient: 'linear-gradient(135deg, #0c1018 0%, #070b10 100%)' },
  { key: 'paper',    label: 'Papel',    bg: '#f5f0e8', preview: '#f5f0e8', isLight: true,
    previewGradient: 'linear-gradient(135deg, #f5f0e8 0%, #ece5d8 100%)' },
  { key: 'chalk',    label: 'Cinza',    bg: '#eff0f2', preview: '#eff0f2', isLight: true,
    previewGradient: 'linear-gradient(135deg, #eff0f2 0%, #e2e4e9 100%)' },
]

export function getVideoEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  if (url.includes('/embed/')) return url
  return null
}

// ── Drag-and-drop block reorder hook ──────────────────────────────────────────
export function useDragBlocks(blocks, setBlocks) {
  const dragIdx = useRef(null)
  const dragOver = useRef(null)

  function onDragStart(i) { dragIdx.current = i }
  function onDragEnter(i) { dragOver.current = i }
  function onDragEnd() {
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = null; dragOver.current = null; return
    }
    setBlocks(bs => {
      const arr = [...bs]
      const [moved] = arr.splice(dragIdx.current, 1)
      arr.splice(dragOver.current, 0, moved)
      dragIdx.current = null; dragOver.current = null
      return arr
    })
  }
  return { onDragStart, onDragEnter, onDragEnd }
}

// ── Free-position drag for canvas mode — pointer-based, updates block.pos
// (% of the canvas box) on move, commits to previewBlocks on release. ──
export function useCanvasDrag(canvasRef, setPreviewBlocks) {
  const draggingId = useRef(null)
  const offset = useRef({ x: 0, y: 0 })

  function onPointerDown(e, block) {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    draggingId.current = block.id
    const rect = canvas.getBoundingClientRect()
    const curX = (block.pos?.x ?? 8) / 100 * rect.width
    const curY = (block.pos?.y ?? 8) / 100 * rect.height
    offset.current = { x: e.clientX - rect.left - curX, y: e.clientY - rect.top - curY }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function onPointerMove(e) {
    const canvas = canvasRef.current
    if (!canvas || draggingId.current === null) return
    const rect = canvas.getBoundingClientRect()
    let x = (e.clientX - rect.left - offset.current.x) / rect.width * 100
    let y = (e.clientY - rect.top - offset.current.y) / rect.height * 100
    x = Math.max(0, Math.min(92, x))
    y = Math.max(0, Math.min(92, y))
    setPreviewBlocks(bs => bs.map(b => b.id === draggingId.current ? { ...b, pos: { x, y } } : b))
  }

  function onPointerUp() {
    draggingId.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  return { onPointerDown }
}

// ── Public visitor view ────────────────────────────────────────────────────────
export const wsInput = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 7, padding: '7px 9px',
  fontSize: 12, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
  display: 'block', marginBottom: 0,
}

// ── Workspace panel design tokens ─────────────────────────────────────────────
export const wsGroup = {
  background: 'var(--color-bg-alt)',
  border: '1px solid var(--color-border)',
  borderRadius: 12, padding: '13px 14px',
}
export const wsGroupLabel = {
  fontSize: 10, fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 11,
}
export const wsControlLabel = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: 6,
}
// Bolas de cor — as mesmas do editor de perfil (mesmo tamanho, 34px no
// mobile), para escolher uma cor ser o mesmo gesto e a mesma medida nos
// dois sítios. overflow:hidden é necessário — sem isto o conic-gradient da
// bola personalizada não fica bem cortado pelo border-radius nos cantos.
export const wsSwatch = {
  appearance: 'none', WebkitAppearance: 'none', outline: 'none',
  boxSizing: 'border-box',
  width: 34, height: 34, minHeight: 34, minWidth: 34, borderRadius: '50%',
  border: '2px solid transparent', cursor: 'pointer', padding: 0, margin: 0,
  boxShadow: '0 0 0 1px var(--color-border) inset',
  // overflow:hidden não chega sozinho com escala de ecrã fracionária (125%,
  // 150%) — um pixel da cor de fundo escapa a um canto por arredondamento
  // do border-radius. clip-path força o corte circular sem depender disso.
  overflow: 'hidden', position: 'relative', clipPath: 'circle(50%)',
  flexShrink: 0,
}
// Bola de "cor personalizada" — exatamente a mesma receita do
// ProfileCustomizer.css (.pc-swatch--custom): backgroundClip:padding-box
// em vez de confiar só no clip-path, que é o que estava a deixar um bocado
// de branco a escapar pelo canto do círculo neste sítio.
export const wsSwatchCustom = {
  ...wsSwatch,
  backgroundClip: 'padding-box',
  backgroundImage: 'conic-gradient(from 180deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
}
// Estado selecionado neutro (branco em tema escuro, preto em tema claro)
// para as opções do editor — botões de tamanho, tipografia, alinhamento,
// estilo de cards. O azul já é o significado de "cor de destaque" nas
// bolas de cor; reutilizá-lo em toda a seleção de opções sem relação com
// o accent do projeto ficava a dizer a mesma coisa em sítios diferentes.
export function wsOptStyle(isSel) {
  return {
    border: `1px solid ${isSel ? 'var(--color-text)' : 'var(--color-border)'}`,
    background: isSel ? 'var(--color-surface-hover)' : 'var(--color-bg)',
    color: isSel ? 'var(--color-text)' : 'var(--color-text-secondary)',
  }
}
export const wsInputNew = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
  borderRadius: 8, padding: '8px 11px',
  color: 'var(--color-text)', fontSize: 12,
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
}

/* Anexos — projetos-filho (parent_project_id) + o ficheiro-fonte deste
   projeto, se veio de um upload analisado pela IA. Nem tudo merece página
   própria; isto é onde os trabalhos mais pequenos vivem dentro do maior. */
export function ProjectAttachments({ project }) {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [srcUrl, setSrcUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('projects')
      .select('id, name, slug, ai_tagline, area, cover_url')
      .eq('parent_project_id', project.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (!cancelled) setChildren(data ?? []) })
    return () => { cancelled = true }
  }, [project.id])

  useEffect(() => {
    const path = project.library_file_url
    if (!path) return
    if (path.startsWith('http')) { setSrcUrl(path); return }
    let cancelled = false
    supabase.storage.from('library-files').createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setSrcUrl(data.signedUrl) })
    return () => { cancelled = true }
  }, [project.library_file_url])

  if (!children.length && !srcUrl) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {children.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trabalhos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {children.map(c => (
              <button
                key={c.id} type="button" onClick={() => navigate(`/projeto/${c.slug}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  padding: 10, border: '1px solid var(--color-border)', borderRadius: 12,
                  background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 44, height: 44, flexShrink: 0, borderRadius: 9, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg-alt)', color: 'var(--color-text-tertiary)',
                  fontSize: 18, fontWeight: 800,
                }}>
                  {c.cover_url
                    ? <img src={c.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (c.name || '?')[0].toUpperCase()}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  {(c.ai_tagline || c.area) && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ai_tagline || c.area}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {srcUrl && (
        <a
          href={srcUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
            padding: '8px 14px', borderRadius: 9, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Download size={14} /> {project.library_file_name || 'Documento original'}
        </a>
      )}
    </div>
  )
}

export function PublicView({ project, ownerProfile, isOwner, isProfessor, onExitPreview, editingAppearance, previewBlocks, setPreviewBlocks, previewStyle, setPreviewStyle, previewEditing, setPreviewEditing,
  liked, likeCount, likeLoading, onLike,
  hasInterest, interestCount, interestLoading, onInterest,
  isRecruiterRole,
  wsExpanded, setWsExpanded,
  onCoverChange,
  onProjectUpdate,
  previewDevice, setPreviewDevice,
  contentTargetField, onSaveField, savingField,
}) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  // O painel do workspace vive dentro da mesma árvore que o [data-pv-theme]
  // (usado para forçar claro/escuro no PREVIEW conforme o fundo que o dono
  // escolheu para a página pública). Sem isto, escolher um fundo claro no
  // projeto também clareava o editor por herança de custom properties. O
  // workspace deve seguir só o tema da app (claro/escuro do utilizador),
  // nunca a cor de fundo do projeto — por isso redeclara as variáveis aqui,
  // cortando a herança do ancestral.
  const wsThemeVars = theme === 'light' ? {
    '--color-bg': '#f2f0ec', '--color-bg-alt': '#e6e3de',
    '--color-surface': '#ffffff', '--color-surface-hover': '#f7f5f2',
    '--color-border': '#d4cfc8', '--color-border-hover': '#b8b0a5',
    '--color-text': '#1a1a1a', '--color-text-secondary': '#5a5a5a', '--color-text-tertiary': '#8a8a8a',
  } : {
    '--color-bg': '#080808', '--color-bg-alt': '#111111',
    '--color-surface': '#1a1a1a', '--color-surface-hover': '#222222',
    '--color-border': 'rgba(255,255,255,0.08)', '--color-border-hover': 'rgba(255,255,255,0.14)',
    '--color-text': '#f0f0f0', '--color-text-secondary': '#888888', '--color-text-tertiary': '#555555',
  }

  // Tab "Conteúdo" — edição inline dos 8 campos, a substituir o EditModal
  // que abria por cima da página. Rascunho local por campo: só sai daqui
  // (e volta a refletir project[key]) depois de guardar com sucesso.
  const [contentDrafts, setContentDrafts] = useState({})
  const contentFieldRefs = useRef({})
  // Arrastar a pega da folha do workspace (mobile): para baixo fecha, para
  // cima abre — sem isto só dava para fechar tocando no botão "Fechar
  // editor" lá em cima, longe do polegar.
  // Três paragens: colapsada (barra fina) → normal (48vh, o "aberto" de
  // sempre) → cheia (a preencher o ecrã). "Normal" continua a ser o que
  // já era; arrastar mais para cima a partir daí é que preenche tudo.
  const [wsFull, setWsFull] = useState(false)
  // Reabrir (toque na barra, eyedropper, etc.) volta sempre ao "normal",
  // nunca fica preso em "cheia" de uma vez anterior.
  useEffect(() => { if (!wsExpanded) setWsFull(false) }, [wsExpanded])
  const wsDragRef = useRef(null)
  function handleWsDragStart(e) {
    wsDragRef.current = { startY: e.touches[0].clientY, moved: false }
  }
  function handleWsDragMove(e) {
    if (!wsDragRef.current) return
    const dy = e.touches[0].clientY - wsDragRef.current.startY
    if (Math.abs(dy) > 6) wsDragRef.current.moved = true
    wsDragRef.current.dy = dy
  }
  function handleWsDragEnd() {
    const d = wsDragRef.current
    wsDragRef.current = null
    if (!d?.moved) return
    const THRESHOLD = 40
    if (d.dy < -THRESHOLD) {
      // Arrastar para cima: colapsada → normal → cheia.
      if (!wsExpanded) setWsExpanded(true)
      else if (!wsFull) setWsFull(true)
    } else if (d.dy > THRESHOLD) {
      // Arrastar para baixo: cheia → normal → colapsada.
      if (wsFull) setWsFull(false)
      else if (wsExpanded) { setWsExpanded(false); setWsFull(false) }
    }
  }
  // Tabelas de BD públicas do projeto — só para preencher o seletor do
  // bloco "Tabela de dados" no editor. Os dados em si vêm sempre em direto
  // via DbTableBlock, isto é só a lista de tabelas disponíveis para escolher.
  const [dbTablesForBlock, setDbTablesForBlock] = useState([])
  useEffect(() => {
    if (!project?.id) return
    let cancelled = false
    listPublicTables(project.id).then(data => {
      if (!cancelled) setDbTablesForBlock(data.tables || [])
    }).catch(() => { if (!cancelled) setDbTablesForBlock([]) })
    return () => { cancelled = true }
  }, [project?.id])
  const [templateConfirm, setTemplateConfirm] = useState(null)
  const [templateApplied, setTemplateApplied] = useState('')
  const sectionDragRef = useRef(null)
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState(null)
  // Qual dos dois seletores de cor está aberto: 'accent', 'bg' ou nenhum.
  const [colorPicker, setColorPicker] = useState(null)
  // Âncora para o ColorPicker se posicionar no desktop (ver comentário
  // em ColorPicker.jsx sobre o portal para document.body).
  const accentSwatchBtnRef = useRef(null)
  const bgSwatchBtnRef = useRef(null)
  // EyeDropper (escolher cor da própria capa do projeto): enquanto ativo,
  // o próprio picker some (senão apanhava-se a cor do picker, não a da
  // página por trás) e a folha do workspace compacta no telemóvel, para
  // a capa ficar visível para apontar. Restaura os dois a seguir.
  const [eyedropperActive, setEyedropperActive] = useState(false)
  function startEyedropper() {
    setEyedropperActive(true)
    if (!isDesktop) setWsExpanded(false)
  }
  function endEyedropper() {
    setEyedropperActive(false)
    if (!isDesktop) setWsExpanded(true)
  }

  function pickCoverImage() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return
      if (file.size > 10 * 1024 * 1024) { alert('Ficheiro demasiado grande (máx 10 MB)'); return }
      if (!file.type.startsWith('image/')) { alert('Apenas imagens são permitidas'); return }
      const webpFile = await toWebP(file)
      const ext = webpFile.name.split('.').pop()
      const path = `${project.id}/cover_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, webpFile, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
        await supabase.from('projects').update({ cover_url: publicUrl }).eq('id', project.id)
        onCoverChange?.(publicUrl)
      }
    }
    input.click()
  }
  const layoutListRef = useRef(null)

  const layoutDragOverRef = useRef(null)
  function startLayoutDrag(e, fromIdx) {
    e.preventDefault()
    sectionDragRef.current = fromIdx
    layoutDragOverRef.current = null
    const el = e.currentTarget.closest('[data-layout-idx]')
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const onMove = (ev) => {
      if (!layoutListRef.current) return
      const items = [...layoutListRef.current.querySelectorAll('[data-layout-idx]')]
      let closest = -1, closestDist = Infinity
      for (const child of items) {
        const rect = child.getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        const dist = Math.abs(ev.clientY - mid)
        const idx = parseInt(child.dataset.layoutIdx, 10)
        if (dist < closestDist) { closestDist = dist; closest = idx }
      }
      layoutDragOverRef.current = closest >= 0 ? closest : null
      setDragOverSectionIdx(layoutDragOverRef.current)
    }
    const onUp = () => {
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      const from = sectionDragRef.current
      const to = layoutDragOverRef.current
      setDragOverSectionIdx(null)
      if (to != null && from !== to) {
        setPreviewStyle(ps => {
          const base = ps.layoutOrder?.length ? [...ps.layoutOrder] : [
            ...orderedSections.map(key => ({ kind: 'section', key })),
            ...previewBlocks.map(b => ({ kind: 'block', id: b.id })),
          ]
          ;[base[from], base[to]] = [base[to], base[from]]
          return { ...ps, layoutOrder: base }
        })
      }
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }
  const [mediaEditKey, setMediaEditKey] = useState(null)
  const canvasRef = useRef(null)
  const { onPointerDown: onCanvasPointerDown } = useCanvasDrag(canvasRef, setPreviewBlocks)

  // Camouflage feedback FAB when workspace is active
  useEffect(() => {
    document.body.classList.add('pv-active')
    return () => document.body.classList.remove('pv-active')
  }, [])

  function handleApplyTemplate(tpl) {
    setPreviewStyle(ps => ({ ...ps, ...tpl.style }))
    if (tpl.blocks && tpl.blocks.length > 0) {
      setPreviewBlocks(tpl.blocks.map((b, i) => ({ ...newBlock(b.type, i), ...b, id: Date.now().toString(36) + i })))
    }
    setTemplateApplied(tpl.id)
    setTimeout(() => setTemplateApplied(''), 3000)
    setTemplateConfirm(null)
  }

  function uploadSectionMedia(sectionKey) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      if (file.size > 10 * 1024 * 1024) { alert('Ficheiro demasiado grande (máx 10 MB)'); return }
      if (!file.type.startsWith('image/')) { alert('Apenas imagens são permitidas'); return }
      const webpFile = await toWebP(file)
      const ext = webpFile.name.split('.').pop()
      const path = `sections/${project.id}/${sectionKey}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('project-images').upload(path, webpFile, { upsert: true })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        setPreviewStyle(ps => ({
          ...ps,
          sectionMedia: { ...(ps.sectionMedia || {}), [sectionKey]: { ...(ps.sectionMedia?.[sectionKey] || {}), type: 'image', url: publicUrl } },
        }))
      }
    }
    input.click()
  }
  const [previewTab, setPreviewTab] = useState('estilo')  // 'conteudo' | 'estilo' | 'blocos' | 'seccoes' | 'templates'
  const [previewSaved, setPreviewSaved] = useState(false)
  const [previewSaveError, setPreviewSaveError] = useState(false)
  // O botão "Editar" de uma Section/MissionRow chega aqui via contentTargetField
  // (prop) em vez de abrir um modal — salta para a tab Conteúdo e foca o campo.
  useEffect(() => {
    if (contentTargetField) setPreviewTab('conteudo')
  }, [contentTargetField])
  useEffect(() => {
    if (previewTab !== 'conteudo' || !contentTargetField) return
    const el = contentFieldRefs.current[contentTargetField]
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  }, [previewTab, contentTargetField])
  const swipeTouchRef = useRef({})
  const bannerRef = useRef(null)
  const [bannerH, setBannerH] = useState(44)
  // Two-column layout needs more room than the 600px shell breakpoint, so this
  // page opts into 760 explicitly. Kept reactive so the panel switches sidebar ↔
  // bottom-sheet on resize/rotate. (See lib/useIsMobile.)
  const isDesktop = !useIsMobile(759)

  // Measure banner height so the workspace panel always aligns flush below it
  useEffect(() => {
    if (!bannerRef.current) return
    const obs = new ResizeObserver(([e]) => setBannerH(Math.round(e.contentRect.height) + 1))
    obs.observe(bannerRef.current)
    return () => obs.disconnect()
  }, [])

  function uploadImage(blockId, field) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      if (file.size > 10 * 1024 * 1024) { alert('Ficheiro demasiado grande (máx 10 MB)'); return }
      if (!file.type.startsWith('image/')) { alert('Apenas imagens são permitidas'); return }
      const webpFile = await toWebP(file)
      const ext = webpFile.name.split('.').pop()
      const path = `preview/${project.id}/${blockId}_${field}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('project-images').upload(path, webpFile, { upsert: true })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        setPreviewBlocks(bs => bs.map(b => b.id === blockId ? { ...b, [field]: publicUrl } : b))
      }
    }
    input.click()
  }

  function upd(blockId, field, val) {
    setPreviewBlocks(bs => bs.map(b => b.id === blockId ? { ...b, [field]: val } : b))
  }

  const tech = (project.technologies || '')
    .split(/[,\n•\-]+/).map(t => t.trim()).filter(t => t.length > 0 && t.length < 40)

  const features = (project.features || '')
    .split(/\n/).map(f => f.trim().replace(/^[-•*]\s*/, '')).filter(f => f.length > 1)

  const displayName = ownerProfile?.full_name || ownerProfile?.username || project.creator_name || null
  const avatarUrl   = ownerProfile?.avatar_url || null
  const course      = project.course || ownerProfile?.course || null

  const TYPE_HERO_PUBLIC = {
    pap:       { c1: '#1e40af', c2: '#7c3aed' },
    internship:{ c1: '#065f46', c2: '#0369a1' },
    group:     { c1: '#7c2d12', c2: '#701a75' },
    personal:  { c1: '#1e3a5f', c2: '#312e81' },
    competition:{ c1: '#713f12', c2: '#831843' },
  }

  // Accent palettes — each swatch maps to a gradient pair
  const ACCENT_PALETTES = [
    { key: 'default', label: 'Padrão',   swatch: null,      c1: null,       c2: null       },
    { key: 'blue',    label: 'Azul',     swatch: 'var(--color-primary)', c1: '#1e40af',  c2: '#4f46e5'  },
    { key: 'purple',  label: 'Roxo',     swatch: '#7c3aed', c1: '#4c1d95',  c2: '#831843'  },
    { key: 'teal',    label: 'Teal',     swatch: '#0d9488', c1: '#065f46',  c2: '#0369a1'  },
    { key: 'crimson', label: 'Carmim',   swatch: '#dc2626', c1: '#7f1d1d',  c2: '#92400e'  },
    { key: 'amber',   label: 'Âmbar',   swatch: '#d97706', c1: '#78350f',  c2: '#6d28d9'  },
    { key: 'pink',    label: 'Rosa',     swatch: '#db2777', c1: '#831843',  c2: '#701a75'  },
    { key: 'green',   label: 'Verde',    swatch: '#16a34a', c1: '#14532d',  c2: '#164e63'  },
    { key: 'slate',   label: 'Pizarra',  swatch: '#475569', c1: '#1e293b',  c2: '#0f172a'  },
  ]

  const HERO_SIZES = [
    { key: 'default', label: 'Normal',    height: 280 },
    { key: 'compact', label: 'Compacto',  height: 180 },
    { key: 'full',    label: 'Impactante', height: 400 },
  ]

  // Cor livre — guardada à parte da chave da paleta, para quem tiver escolhido
  // uma cor própria não a perder ao espreitar uma paleta pronta e voltar atrás.
  const customAccent = isValidHex(previewStyle.accentCustom || '') ? previewStyle.accentCustom : null
  const usingCustomAccent = previewStyle.accent === 'custom' && !!customAccent
  const customBg = isValidHex(previewStyle.bgCustom || '') ? previewStyle.bgCustom : null
  const usingCustomBg = previewStyle.bg === 'custom' && !!customBg

  const selectedPalette = ACCENT_PALETTES.find(p => p.key === previewStyle.accent) || ACCENT_PALETTES[0]
  const typeHero = TYPE_HERO_PUBLIC[project.project_type] ?? TYPE_HERO_PUBLIC.personal
  const hero = usingCustomAccent
    ? accentGradientFromHex(customAccent)
    : selectedPalette.c1
      ? { c1: selectedPalette.c1, c2: selectedPalette.c2 }
      : typeHero

  const heroHeight        = (HERO_SIZES.find(s => s.key === previewStyle.heroSize) || HERO_SIZES[0]).height
  const selectedFont      = FONT_OPTIONS.find(f => f.key === (previewStyle.font || 'default')) || FONT_OPTIONS[0]
  const selectedTitleFont = TITLE_FONT_OPTIONS.find(f => f.key === (previewStyle.titleFont || 'croogla')) || TITLE_FONT_OPTIONS[0]
  const titleStyle        = previewStyle.titleStyle || 'normal'
  const selectedBg        = BG_OPTIONS.find(b => b.key === (previewStyle.bg || 'default')) || BG_OPTIONS[0]
  const resolvedBg        = usingCustomBg ? customBg : (selectedBg.bg || 'var(--color-bg)')
  // Cor final do título, corrigida para ter contraste com o fundo do hero —
  // as paletas e o degradê usam tons escuros de propósito para os brilhos por
  // trás, mas como texto direto isso podia ficar ilegível (ex: "Carmim" sobre
  // o fundo escuro por omissão). Só o título usa esta versão clareada; os
  // brilhos/badges que usam hero.c1/c2 continuam com a cor original.
  const heroBgHex  = usingCustomBg ? customBg : (selectedBg.preview || '#060c18')
  const titleColor = { c1: ensureReadable(hero.c1, heroBgHex), c2: ensureReadable(hero.c2, heroBgHex) }
  // pvTheme: force dark/light CSS vars inside preview regardless of app theme.
  // Num fundo escolhido à mão isso passa a depender da luminância do hex, senão
  // um fundo claro ficava com texto branco por cima.
  const pvTheme           = usingCustomBg
    ? (isLightHex(customBg) ? 'light' : 'dark')
    : selectedBg.isLight ? 'light' : selectedBg.key !== 'default' ? 'dark' : null
  // A tagline vive na zona onde o hero (com o scrim escuro atrás) já
  // desvaneceu para o fundo da página — por isso a cor dela segue o fundo
  // escolhido, não a foto de capa. Sem fundo escolhido (pvTheme null),
  // segue o tema da própria app.
  const heroSurfaceIsLight = pvTheme === 'light' || (!pvTheme && theme === 'light')
  const titleAlign        = previewStyle.titleAlign || 'center'
  const coverAsHero       = !!(previewStyle.coverAsHero && project.cover_url)
  const customTagline     = previewStyle.customTagline || ''
  const cardStyleVal      = previewStyle.cardStyle || 'border'
  const hiddenSections = new Set(previewStyle.hiddenSections || [])
  const DEFAULT_SECTION_ORDER = ['problem','solution','target_audience','features','technologies','challenges','results','learnings','pap_supervisor']
  const orderedSections = previewStyle.sectionOrder?.length ? previewStyle.sectionOrder : DEFAULT_SECTION_ORDER
  const sectionMedia = previewStyle.sectionMedia || {}

  // Pairs a section card with an optional image/video on the side (set via the
  // Secções tab) — falls back to the plain full-width card when no media is set.
  function withSectionMedia(key, card) {
    const media = sectionMedia[key]
    if (!media || !media.url) return card
    const embedUrl = media.type === 'video' ? getVideoEmbedUrl(media.url) : null
    const side = media.side === 'left' ? 'row-reverse' : 'row'
    return (
      <div key={key} style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch', flexDirection: side }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>{card}</div>
        <div style={{ flex: '1 1 220px', maxWidth: '100%', width: 'min(100%, 320px)', borderRadius: 14, overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {embedUrl ? (
            <iframe src={embedUrl} title="" style={{ width: '100%', height: '100%', minHeight: 200, border: 'none', display: 'block' }} allowFullScreen />
          ) : (
            <img src={media.url} alt="" style={{ width: '100%', height: '100%', minHeight: 200, objectFit: 'cover', display: 'block' }} />
          )}
        </div>
      </div>
    )
  }

  const DEVICES = [
    { id: 'desktop',  Icon: Monitor,    label: 'Desktop',   title: 'Vista desktop' },
    { id: 'tablet',   Icon: Tablet,     label: 'Tablet',    title: 'Vista tablet (768px)' },
    { id: 'mobile',   Icon: Smartphone, label: 'Mobile',    title: 'Vista mobile (390px)' },
  ]
  const deviceMaxWidth = previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : undefined

  return (
    <div className="pv-outer" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: resolvedBg }}>

      {/* ── Card style + preview theme scoped CSS ── */}
      <style>{`
        /* Card style applies to BOTH owner-view cards AND preview section cards */
        [data-pv-cs="flat"] .proj-card,
        [data-pv-cs="flat"] .pv-section-card {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          border-left-color: transparent !important;
        }
        [data-pv-cs="glass"] .proj-card,
        [data-pv-cs="glass"] .pv-section-card {
          background: rgba(255,255,255,0.05) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
        }
        [data-pv-theme="dark"] {
          --c-bg:#060c18; --c-bg-alt:#111c32; --c-card:#152030; --c-card-hover:#1c2d44;
          --c-border:#1e3050; --c-border-bright:#2a4275; --c-muted:#7d93b0;
          --c-text:#e8f2ff; --c-subtle:#6b7f9e; --c-input-bg:#060c18;
          --color-bg:#060c18; --color-bg-alt:#111c32;
          --color-surface:#152030; --color-surface-hover:#1c2d44;
          --color-border:#1e3050; --color-border-hover:#2a4275;
          --color-text:#e8f2ff; --color-text-secondary:#7d93b0; --color-text-tertiary:#6b7f9e;
        }
        [data-pv-theme="light"] {
          --c-bg:#f5f0e8; --c-bg-alt:#ede6d8; --c-card:#faf7f2; --c-card-hover:#f0ebe1;
          --c-border:#d8d0c4; --c-border-bright:#bdb4a6; --c-muted:#6b6158;
          --c-text:#1c1714; --c-subtle:#7a7065; --c-input-bg:#e8e1d6;
          --color-bg:#f5f0e8; --color-bg-alt:#ede6d8;
          --color-surface:#faf7f2; --color-surface-hover:#f0ebe1;
          --color-border:#d8d0c4; --color-border-hover:#bdb4a6;
          --color-text:#1c1714; --color-text-secondary:#6b6158; --color-text-tertiary:#7a7065;
        }
        @keyframes pv-slidein {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes pv-slidein-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        /* Desktop: a preview começa depois da sidebar — MAS só quem tem sessão
           tem sidebar. Visitante sem conta (body sem .has-sidebar) não tem
           sidebar nenhuma: preview a toda a largura, a começar abaixo da
           top-nav (que aí fica visível). */
        @media (min-width: 861px) {
          body.has-sidebar .pv-outer { left: 232px !important; transition: left 0.22s cubic-bezier(0.4,0,0.2,1); }
          body.has-sidebar.sidebar-collapsed .pv-outer { left: 64px !important; }
          body:not(.has-sidebar) .pv-outer { top: 62px !important; }
        }
        /* Tablet: top-nav visível (62px) — container e painel começam abaixo */
        @media (min-width: 601px) and (max-width: 860px) {
          .pv-outer { top: 62px !important; }
          .pv-workspace { top: calc(62px + 44px) !important; }
        }
        .pv-workspace { animation: pv-slidein 0.2s cubic-bezier(0.22,1,0.36,1); }
        /* Mobile: bottom panel editor */
        .pv-ws-sheet {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
          top: auto !important;
          width: 100% !important;
          height: 48vh !important;
          border-radius: 16px 16px 0 0 !important;
          border: none !important;
          border-top: 1px solid var(--color-border) !important;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.3) !important;
          animation: pv-slidein-up 0.28s cubic-bezier(0.22,1,0.36,1) !important;
          z-index: 510 !important;
          transition: height 0.22s cubic-bezier(0.4,0,0.2,1) !important;
        }
        /* Colapsada no mobile: só a pega + etiqueta, sem overlay nem
           conteúdo por baixo — toca ou arrasta para cima para abrir. */
        .pv-ws-sheet.ws-collapsed {
          height: 52px !important;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.2) !important;
        }
        /* Arrastada até ao fim: preenche o ecrã, do topo até à barra de
           navegação — o "normal" (48vh) continua a ser o que abre por
           omissão, isto é só quando o utilizador puxa mais. */
        .pv-ws-sheet.ws-full {
          top: 0 !important;
          height: auto !important;
          border-radius: 0 !important;
        }
        /* Overlay behind bottom sheet */
        .pv-ws-overlay {
          position: fixed; inset: 0; z-index: 195;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        /* Drag handle */
        .pv-ws-drag-handle {
          width: 40px; height: 4px; border-radius: 99px;
          background: var(--color-border-hover);
          margin: 10px auto 0;
          flex-shrink: 0;
        }
        /* Cinco separadores fixos do painel, sempre a dividir a barra toda —
           painel estreito (360px) para 5 labels, por isso menos padding
           horizontal que a variante compacta por omissão. */
        /* Sem flex:1 a dividir por igual — a 360px, 5 separadores (um deles
           "Secções") não cabem sem se esmagarem uns contra os outros.
           Fica com o comportamento normal da variante compacta: cada botão
           do tamanho do seu conteúdo, e a barra desliza se não couber tudo
           — o mesmo que já resolvia isto no editor de projeto. */
        .ws-segtabs { flex: 1; min-width: 0; }
        .ws-segtabs .seg-btn { padding-left: 8px; padding-right: 8px; gap: 4px; font-size: 11px; }
        /* Mesma razão do painel desktop: 5 separadores não cabem divididos
           por igual sem esmagar "Secções"/"Templates". Tamanho ao
           conteúdo + scroll horizontal em vez de forçar. */
        .ws-mobile-segtabs { width: 100%; min-width: 0; border: none; background: none; padding: 0; justify-content: center; }
        /* Botões a largura igual — sem isto, "Conteúdo"/"Estilo"/"Blocos"
           têm larguras diferentes e, estando centrada, a barra inteira
           deslocava-se ao trocar de separador, por cima do slide da pill.
           Só a pill a deslizar (como no resto da app) fica "super smooth". */
        .ws-mobile-segtabs .seg-btn { min-width: 92px; flex: 0 0 auto; }
        .pv-workspace input:focus,
        .pv-workspace textarea:focus {
          border-color: var(--color-primary-subtle) !important;
          box-shadow: 0 0 0 3px var(--color-primary-subtle);
          outline: none;
        }
        .pv-banner-btn:hover { opacity: 0.85; }
        .pv-device-btn { transition: all 0.15s; }
        .pv-device-btn:hover { opacity: 0.8; }

        /* ── Mobile: banner ── */
        @media (max-width: 600px) {
          .pv-banner-inner { flex-wrap: wrap; gap: 6px !important; padding: 8px 12px !important; }
          .pv-banner-sep { display: none !important; }
        }
        /* ── Mobile: content ── */
        @media (max-width: 600px) {
          .pv-story { padding: 0 14px 80px !important; gap: 20px !important; }
          .pv-hero-title { font-size: clamp(24px, 7vw, 40px) !important; letter-spacing: -0.5px !important; line-height: 1.1 !important; }
          .pv-section-card { padding: 16px 16px !important; border-radius: 12px !important; }
          /* Title block — reduce horizontal padding on mobile */
          .pv-title-block { padding: 0 16px !important; }
          /* Creator pill — smaller on mobile */
          .pv-creator-pill { font-size: 12px !important; padding: 5px 12px !important; }
        }
      `}</style>

      {/* ── Preview banner — só para o professor. O dono já tem a navbar
          normal (logo + hamburguer) em qualquer ecrã: no mobile, o pincel no
          hamburguer troca sozinho para o menu "Gerir projeto" com "Sair da
          preview" quando está em preview, e no desktop os mesmos controlos
          vivem na sidebar. Um segundo bar azul por cima disso era
          redundante e tapava a navbar que o dono queria continuar a ver. ── */}
      {isProfessor && (
        <div ref={bannerRef} className="pv-banner-inner" style={{
          flexShrink: 0, zIndex: 300,
          background: theme === 'light' ? 'rgba(248,250,252,0.97)' : 'rgba(6,12,24,0.97)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: theme === 'light' ? '1px solid rgba(0,0,0,0.09)' : '1px solid var(--color-primary-subtle)',
          padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
        }}>
          <Globe size={13} color={colors.blue} style={{ flexShrink: 0 }} />
          <span className="pv-banner-label" style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '-0.1px' }}>
            {editingAppearance ? 'A editar a aparência' : 'Preview do visitante'}
          </span>

          <div style={{ flex: 1 }} />

          {isOwner && isDesktop && (
            <button
              onClick={() => {
                if (!previewEditing) { setPreviewEditing(true); setWsExpanded(true) }
                else setWsExpanded(e => !e)
              }}
              title={wsExpanded ? 'Fechar editor' : 'Editar workspace'}
              style={{
                background: previewEditing && wsExpanded ? 'var(--color-bg-alt)' : 'var(--color-primary)',
                border: previewEditing && wsExpanded ? '1px solid var(--color-border)' : 'none',
                borderRadius: 9, height: 36, padding: '0 14px',
                color: previewEditing && wsExpanded ? 'var(--color-text-secondary)' : '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
                boxShadow: previewEditing && wsExpanded ? 'none' : '0 4px 12px var(--color-primary-subtle)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Paintbrush size={16} />
              <span>{wsExpanded ? 'Fechar editor' : 'Editar workspace'}</span>
            </button>
          )}
          <button
            onClick={onExitPreview}
            title="Sair da preview"
            style={{
              background: 'transparent', border: 'none',
              borderRadius: 9,
              width: isDesktop ? 'auto' : 36, height: 36,
              padding: isDesktop ? '0 12px' : 0,
              color: 'var(--color-error)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={18} /> {isDesktop && <span>Sair</span>}
          </button>
        </div>
      )}


      {/* ── Mobile: permanent bottom editing toolbar ── */}
      {isOwner && !isDesktop && previewEditing && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 520,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        }}>
          {/* Centrado com a página inteira, não só com o espaço que sobra
              ao lado do botão de guardar — position:absolute tira-o do
              fluxo do flex, senão o botão de guardar empurrava o centro
              visual para a esquerda. */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', padding: '0 8px', maxWidth: 'calc(100% - 80px)' }}>
            {/* Mesmos cinco separadores do cabeçalho do painel no desktop —
                eram a mesma funcionalidade com dois desenhos diferentes
                (aqui, ícone+label empilhados sem pílula nem slide; lá,
                a pílula partilhada). Ficam iguais nos dois sítios. */}
            <SegmentedTabs
              size="compact"
              className="ws-mobile-segtabs"
              value={wsExpanded ? previewTab : ''}
              onChange={id => {
                if (wsExpanded && previewTab === id) setWsExpanded(false)
                else { setPreviewTab(id); setWsExpanded(true) }
              }}
              options={[
                { id: 'conteudo',  label: 'Conteúdo',  icon: <FileText size={13} /> },
                { id: 'estilo',    label: 'Estilo',    icon: <Palette size={13} /> },
                { id: 'blocos',    label: 'Blocos',    icon: <Layout size={13} /> },
                // Templates fica de fora por agora — vai ser refeito do
                // zero, não faz sentido continuar acessível entretanto.
              ]}
            />
          </div>
          {/* O botão de guardar mudou-se para a navbar (onde estava o
              pincel) — abrir/fechar o painel já é feito por estas tabs,
              não precisava dos dois. */}
        </div>
      )}

      {/* ── Scrollable preview area — full height, background set here ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        background: resolvedBg,
        paddingRight: isOwner && previewEditing && isDesktop ? (wsExpanded ? 360 : 60) : 0,
        transition: 'padding-right 0.26s ease, padding-bottom 0.26s ease',
        paddingBottom: !isDesktop && previewEditing
          ? 'calc(60px + env(safe-area-inset-bottom, 0px))'
          : undefined,
      }}>

      {/* ── Device frame + CSS scope (data-pv-cs, data-pv-theme) ── */}
      <div data-pv-cs={cardStyleVal} data-pv-theme={pvTheme || undefined} style={{
        margin: previewDevice !== 'desktop' ? `${isOwner ? 16 : 40}px auto 0` : '0 auto',
        maxWidth: deviceMaxWidth,
        width: '100%',
        boxShadow: previewDevice !== 'desktop' ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
        borderRadius: previewDevice !== 'desktop' ? 14 : 0,
        overflow: previewDevice !== 'desktop' ? 'hidden' : 'visible',
        transition: 'max-width 0.3s ease',
        background: resolvedBg,
      }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {coverAsHero ? (
          /* Cover full-bleed hero */
          <div style={{ width: '100%', height: Math.round(heroHeight * 1.4), position: 'relative' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, ${resolvedBg} 100%)` }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${hero.c1}22, transparent 60%)` }} />
          </div>
        ) : project.cover_url ? (
          <div style={{ width: '100%', height: Math.round(heroHeight * 1.14), position: 'relative' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, ${resolvedBg} 100%)` }} />
          </div>
        ) : (
          /* No cover — use page bg theme as base, accent as subtle overlay */
          (() => {
            const isDefaultTheme = selectedBg.key === 'default'
            const bgBase = isDefaultTheme ? 'var(--color-bg)' : (selectedBg.preview || 'var(--color-bg)')
            const accentA = selectedBg.isLight ? '22' : '44'
            const accentB = selectedBg.isLight ? '14' : '2a'
            const glowA   = selectedBg.isLight ? '10' : '1a'
            return (
              <div style={{ width: '100%', height: heroHeight, position: 'relative', background: bgBase, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${hero.c1}${accentA} 0%, ${hero.c2}${accentB} 60%, transparent 100%)` }} />
                <div style={{ position: 'absolute', top: -40, left: '5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c1}${glowA} 0%, transparent 65%)`, pointerEvents: 'none' }} />
                {/* Large initial watermark */}
                <div style={{
                  position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-55%)',
                  fontSize: 'clamp(120px, 18vw, 200px)', fontWeight: 900, lineHeight: 1,
                  color: hero.c1, opacity: 0.07,
                  fontFamily: selectedTitleFont?.css || 'var(--font-heading)',
                  userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em',
                }}>
                  {(project.name || '?')[0].toUpperCase()}
                </div>
                {/* Tech pills strip at bottom */}
                {project.technologies && (
                  <div style={{
                    position: 'absolute', bottom: 18, left: 28, right: 28,
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                  }}>
                    {project.technologies.split(',').slice(0, 5).map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                        padding: '3px 8px', borderRadius: 6,
                        background: `${hero.c1}18`, border: `1px solid ${hero.c1}28`,
                        color: hero.c1,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: isDefaultTheme ? `linear-gradient(to bottom, transparent 30%, var(--color-bg) 100%)` : `linear-gradient(to bottom, transparent 30%, ${bgBase} 100%)` }} />
              </div>
            )
          })()
        )}

        {/* Title block over hero */}
        <div className="pv-title-block" style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px', position: 'relative', marginTop: coverAsHero ? -160 : project.cover_url ? -100 : -80, textAlign: titleAlign }}>
          {/* Area / type chips — backed by a translucent pill when sitting over a
              cover photo, so they stay readable regardless of the image underneath */}
          <div style={{
            display: 'inline-flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 18,
            justifyContent: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start',
            ...(project.cover_url ? {
              background: 'rgba(5,9,18,0.55)', backdropFilter: 'blur(6px)',
              padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)',
            } : {}),
          }}>
            {/* project_type já passa por PROJECT_TYPE_LABELS (ex: "pap" →
                "Projeto final") — antes mostrava o id em bruto ("PAP"). */}
            {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (
              <span style={{
                color: hero.c1, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
              }}>
                {PROJECT_TYPE_LABELS[project.project_type].toUpperCase()}
              </span>
            )}
            {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && project.area && (
              <span style={{ color: colors.subtle, fontSize: 12 }}>·</span>
            )}
            {project.area && (
              <span style={{ color: colors.blue, fontSize: 12, fontWeight: 600 }}>{project.area}</span>
            )}
            {/* O score é informação privada do dono, sem sentido nenhum
                nesta vista — ela existe exatamente para simular o que um
                visitante real vê, e um visitante nunca vê o score. */}
          </div>

          <h1 className="pv-hero-title" style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900,
            letterSpacing: titleStyle === 'caps' ? '0.04em' : '-1.5px', lineHeight: 1.0,
            margin: '0 0 14px',
            fontFamily: selectedTitleFont.css,
            textTransform: titleStyle === 'caps' ? 'uppercase' : 'none',
            textAlign: titleAlign,
            ...(titleStyle === 'gradient' ? {
              // backgroundImage, não o shorthand "background" — o shorthand
              // reinicia background-clip para border-box sempre que o valor
              // muda (nova cor de destaque), e como o React só reatribui
              // propriedades de estilo cujo valor mudou, backgroundClip:'text'
              // (que fica igual entre renders) deixava de ser reaplicado,
              // ficando o texto transparente sobre um retângulo sólido.
              backgroundImage: `linear-gradient(135deg, ${titleColor.c1}, ${titleColor.c2})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : { color: titleColor.c1 }),
          }}>
            {project.name}
            {(project.score || 0) >= 100 && (
              <span title="Score perfeito" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 14, verticalAlign: 'middle',
                width: 32, height: 32, borderRadius: 10,
                background: 'var(--color-primary)',
                boxShadow: '0 2px 8px var(--color-primary-subtle)',
                flexShrink: 0,
                WebkitTextFillColor: 'initial',
              }}>
                <GraduationCap size={17} color="#fff" />
              </span>
            )}
          </h1>

          {(customTagline || project.ai_tagline) && (
            <p style={{
              fontSize: 'clamp(16px, 2.2vw, 20px)',
              color: coverAsHero && !heroSurfaceIsLight ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)',
              margin: titleAlign === 'right' ? '0 0 28px auto' : '0 0 28px',
              maxWidth: titleAlign === 'center' ? '100%' : 600, lineHeight: 1.5, fontWeight: 400, textAlign: titleAlign,
            }}>
              {customTagline || project.ai_tagline}
            </p>
          )}

          {!isOwner && <ProjectTimelineBadge project={project} />}

          {/* Creator pill */}
          {displayName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '6px 16px 6px 6px' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: hero.c1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{displayName}</span>
              {course && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>· {course}</span>}
            </div>
          )}

          {/* Social / project links */}
          {(previewStyle.linkDemo || previewStyle.linkGithub || previewStyle.linkLinkedin) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start' }}>
              {previewStyle.linkDemo && (
                <a href={previewStyle.linkDemo} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: hero.c1, color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: `0 2px 8px ${hero.c1}33` }}>
                  <Globe size={13} /> Ver demo
                </a>
              )}
              {previewStyle.linkGithub && (
                <a href={previewStyle.linkGithub} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <FileText size={13} /> GitHub
                </a>
              )}
              {previewStyle.linkLinkedin && (
                <a href={previewStyle.linkLinkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.3)', color: '#0a66c2', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <User size={13} /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Workspace panel — sidebar (desktop) or bottom sheet (mobile) ── */}
      {/* No mobile, um clique fora fecha a folha — antes não havia nada a
          apanhar esse clique. Fica atrás do painel (z-index mais baixo),
          antes dele na árvore para não roubar foco a nada lá dentro. */}
      {isOwner && previewEditing && !isDesktop && wsExpanded && (
        <div className="pv-ws-overlay" onClick={() => setWsExpanded(false)} />
      )}
      {isOwner && previewEditing && (
        <div className={`pv-workspace${isDesktop ? '' : ` pv-ws-sheet${!wsExpanded ? ' ws-collapsed' : wsFull ? ' ws-full' : ''}`}`} style={{
          position: 'fixed', right: isDesktop ? 8 : 0, top: isDesktop ? 8 : bannerH, bottom: isDesktop ? 8 : 0, zIndex: 200,
          width: isDesktop ? (wsExpanded ? 360 : 60) : 360,
          fontFamily: 'var(--font-body)',
          transition: isDesktop ? 'width 0.22s cubic-bezier(0.4,0,0.2,1)' : undefined,
          overflow: 'visible',
          ...wsThemeVars,
        }}>
          {/* Collapse/expand control — outside the clipped skin so the arrow is never cut off */}
          {isDesktop && (
            <button
              onClick={() => setWsExpanded(e => !e)}
              title={wsExpanded ? 'Colapsar' : 'Expandir'}
              style={{
                position: 'absolute', top: 68, left: -11,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--color-sidebar-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, padding: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <ChevronRight size={12} style={{ transform: wsExpanded ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          )}
          {/* Panel skin — background, border-radius, and clipping for all content */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: isDesktop ? 16 : '16px 16px 0 0',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
          {/* Mobile panel handle — arrasta para cima (abre) ou para baixo
              (fecha). Colapsada, é uma barra fina sempre presente: toca
              ou arrasta para cima para voltar a abrir o editor. */}
          {!isDesktop && (
            <div
              onTouchStart={handleWsDragStart}
              onTouchMove={handleWsDragMove}
              onTouchEnd={handleWsDragEnd}
              onClick={() => { if (!wsExpanded) setWsExpanded(true) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: wsExpanded ? 0 : 4,
                padding: wsExpanded ? '8px 0 4px' : '10px 0',
                flexShrink: 0, touchAction: 'none',
                cursor: wsExpanded ? 'default' : 'pointer',
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border-hover)' }} />
              {!wsExpanded && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ChevronRight size={11} style={{ transform: 'rotate(-90deg)' }} /> Editar aparência
                </span>
              )}
            </div>
          )}

          {/* Collapsed desktop rail — just the 3 tab icons, click expands + switches tab */}
          {isDesktop && !wsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0' }}>
              {[
                { id: 'conteudo',  Icon: FileText       },
                { id: 'estilo',    Icon: Palette        },
                { id: 'blocos',    Icon: Layout         },
                // Templates de fora por agora (vai ser refeito do zero).
              ].map(t => (
                <button
                  key={t.id}
                  title={t.id}
                  onClick={() => { setPreviewTab(t.id); setWsExpanded(true) }}
                  style={{
                    width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: previewTab === t.id ? 'var(--color-primary-subtle)' : 'transparent',
                    color: previewTab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    transition: 'background 0.13s, color 0.13s',
                  }}
                ><t.Icon size={16} /></button>
              ))}
            </div>
          )}

          {/* ── Panel header: tabs + save — desktop only; mobile uses bottom icon nav ── */}
          {(isDesktop && wsExpanded) && <div style={{
            padding: '8px 10px 0',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            {/* Tabs + actions row — tabs centradas com a barra toda (não só
                com o espaço que sobra ao lado do botão de guardar),
                mesma receita da barra do mobile. */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 30, marginBottom: 10 }}>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <SegmentedTabs
                  size="compact"
                  className="ws-segtabs"
                  value={previewTab}
                  onChange={setPreviewTab}
                  options={[
                    { id: 'conteudo',  label: 'Conteúdo',  icon: <FileText size={11} /> },
                    { id: 'estilo',    label: 'Estilo',    icon: <Palette size={11} /> },
                    { id: 'blocos',    label: 'Blocos',    icon: <Layout size={11} /> },
                    // Templates de fora por agora (vai ser refeito do zero).
                    // Sem pillColor/activeColor: monocromático (preto/branco),
                    // igual ao resto da app e ao mobile — o azul destoava.
                  ]}
                />
              </div>

              {/* Save icon — branco/monocromático, igual ao resto da app
                  (era azul, destoava do preto/branco usado em todo o lado). */}
              <button
                onClick={async () => {
                  const { error } = await supabase.from('projects')
                    .update({ preview_blocks: previewBlocks, preview_style: previewStyle })
                    .eq('id', project.id)
                  if (!error) {
                    setPreviewSaveError(false)
                    setPreviewSaved(true)
                    setTimeout(() => setPreviewSaved(false), 2000)
                  } else {
                    console.error('Save preview error:', error)
                    setPreviewSaveError(true)
                    setTimeout(() => setPreviewSaveError(false), 4000)
                  }
                }}
                title={previewSaveError ? 'Erro ao guardar, tenta novamente' : 'Guardar'}
                style={{
                  width: 28, height: 28, borderRadius: 7, marginLeft: 'auto',
                  background: previewSaveError ? 'var(--color-error-subtle)' : previewSaved ? 'var(--color-success-subtle)' : 'var(--color-text)',
                  border: `1px solid ${previewSaveError ? 'var(--color-error-subtle)' : previewSaved ? 'var(--color-success-subtle)' : 'var(--color-text)'}`,
                  color: previewSaveError ? 'var(--color-error)' : previewSaved ? 'var(--color-success)' : 'var(--color-bg)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                {previewSaveError ? <X size={13} strokeWidth={3} /> : previewSaved ? <Check size={13} strokeWidth={3} /> : <Save size={13} />}
              </button>
            </div>
          </div>}

          {wsExpanded && <div
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onTouchStart={!isDesktop ? (e => { swipeTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }) : undefined}
            onTouchEnd={!isDesktop ? (e => {
              const dx = e.changedTouches[0].clientX - (swipeTouchRef.current.x ?? 0)
              const dy = e.changedTouches[0].clientY - (swipeTouchRef.current.y ?? 0)
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
                const tabs = ['conteudo', 'estilo', 'blocos', 'templates']
                const cur = tabs.indexOf(previewTab)
                if (dx < 0 && cur < tabs.length - 1) setPreviewTab(tabs[cur + 1])
                if (dx > 0 && cur > 0) setPreviewTab(tabs[cur - 1])
              }
            }) : undefined}
          >
          {/* ── TAB: CONTEÚDO — os 8 campos, a substituir o EditModal por secção ── */}
          {previewTab === 'conteudo' && (
            <div style={{ flex: 1, overflowY: 'scroll', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROJECT_FIELDS.map(f => {
                const draft = contentDrafts[f.key] ?? (project[f.key] || '')
                const len = draft.trim().length
                const isPlaceholderTxt = hasPlaceholder(draft)
                const isShortTxt = !isPlaceholderTxt && len > 0 && len < f.minLen
                const isDone = len > 0 && len >= f.minLen && !isPlaceholderTxt
                const dirty = draft !== (project[f.key] || '')
                // Dica personalizada da Análise IA, quando já existe uma
                // análise guardada para este projeto — a mesma que aparece no
                // painel "Análise IA", só que já ao lado do campo em vez de
                // obrigar a saltar para outro sítio para a ver.
                const aiTip = project.ai_feedback?.sections?.[f.key]?.tip
                return (
                  <div key={f.key} style={wsGroup}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                      <div style={wsGroupLabel}>{f.label}</div>
                      {isPlaceholderTxt ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 4, padding: '1px 7px' }}>Ainda é o modelo</span>
                      ) : isShortTxt ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-subtle)', borderRadius: 4, padding: '1px 7px' }}>Pouco detalhe</span>
                      ) : isDone && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={10} strokeWidth={3} /> Completo</span>
                      )}
                    </div>
                    {aiTip && (
                      <p style={{ margin: '0 0 9px', fontSize: 11.5, color: 'var(--color-primary)', lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <ChevronRight size={11} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{aiTip}</span>
                      </p>
                    )}
                    <textarea
                      ref={el => { contentFieldRefs.current[f.key] = el }}
                      value={draft}
                      onChange={e => setContentDrafts(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={`Escreve sobre ${f.label.toLowerCase()}...`}
                      style={{ ...wsInputNew, minHeight: 92, resize: 'vertical', lineHeight: 1.55 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: isDone ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                        {len} / {f.minLen} caracteres
                      </span>
                      {dirty && (
                        <button
                          onClick={async () => {
                            const ok = await onSaveField(f.key, draft)
                            if (ok) setContentDrafts(d => { const n = { ...d }; delete n[f.key]; return n })
                          }}
                          disabled={savingField}
                          style={{
                            background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '6px 13px', fontSize: 11, fontWeight: 700, cursor: savingField ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', opacity: savingField ? 0.7 : 1,
                          }}
                        >
                          {savingField ? 'A guardar...' : 'Guardar'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: ESTILO ── */}
          {previewTab === 'estilo' && (
            <div style={{ flex: 1, overflowY: 'scroll', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>

              {/* Group: Identidade visual */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Identidade visual</div>

                {/* Accent color — 5-col grid */}
                <div style={{ marginBottom: 14 }}>
                  <div style={wsControlLabel}>Cor do título do projeto</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', justifyItems: 'center', rowGap: 14, columnGap: 8 }}>
                    {/* "Padrão" fica fora da lista de propósito: era um disco
                        aos gajos de várias cores que não dizia nada sobre o que
                        ia sair. Continua a ser o valor de arranque, só não é
                        uma bola para escolher. */}
                    {ACCENT_PALETTES.filter(p => p.swatch).map(p => {
                      const isSelected = previewStyle.accent === p.key
                      return (
                        <button key={p.key} title={p.label}
                          aria-label={p.label}
                          onClick={() => setPreviewStyle(s => ({ ...s, accent: p.key }))}
                          style={{
                            ...wsSwatch,
                            background: p.swatch,
                            borderColor: isSelected ? 'var(--color-text)' : 'transparent',
                          }}
                        />
                      )
                    })}
                    {/* Cor livre — igual ao seletor do perfil: bola arco-íris
                        fixa, o picker é que mostra a cor atual por dentro. */}
                    <div style={{ position: 'relative', display: 'flex' }}>
                      <button
                        ref={accentSwatchBtnRef}
                        type="button"
                        title="Cor personalizada"
                        aria-label="Escolher cor de destaque personalizada"
                        onClick={() => setColorPicker(c => (c === 'accent' ? null : 'accent'))}
                        style={wsSwatchCustom}
                      />
                      {colorPicker === 'accent' && !eyedropperActive && (
                        <ColorPicker
                          anchorRef={accentSwatchBtnRef}
                          value={customAccent || '#2563eb'}
                          onChange={c => setPreviewStyle(s => ({ ...s, accent: 'custom', accentCustom: c }))}
                          onClose={() => setColorPicker(null)}
                          onEyedropperStart={startEyedropper}
                          onEyedropperEnd={endEyedropper}
                          imageUrl={project.cover_url}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 5, textAlign: 'right' }}>
                    {usingCustomAccent
                      ? customAccent.toUpperCase()
                      : (ACCENT_PALETTES.find(p => p.key === (previewStyle.accent || 'default')) || ACCENT_PALETTES[0]).label}
                  </div>
                </div>

                {/* Background — 4-col grid */}
                <div>
                  <div style={wsControlLabel}>Fundo da página</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', justifyItems: 'center', rowGap: 14, columnGap: 8 }}>
                    {BG_OPTIONS.map(b => {
                      const isSel = !usingCustomBg && (previewStyle.bg || 'default') === b.key
                      return (
                        <button key={b.key} title={b.label}
                          aria-label={b.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, bg: b.key }))}
                          style={{
                            ...wsSwatch,
                            background: b.preview,
                            borderColor: isSel ? 'var(--color-text)' : 'transparent',
                          }}
                        />
                      )
                    })}
                    {/* Fundo livre — mesma ideia da cor de destaque. */}
                    <div style={{ position: 'relative', display: 'flex' }}>
                      <button
                        ref={bgSwatchBtnRef}
                        type="button"
                        title="Fundo personalizado"
                        aria-label="Escolher fundo personalizado"
                        onClick={() => setColorPicker(c => (c === 'bg' ? null : 'bg'))}
                        style={wsSwatchCustom}
                      />
                      {colorPicker === 'bg' && !eyedropperActive && (
                        <ColorPicker
                          anchorRef={bgSwatchBtnRef}
                          value={customBg || '#0c1018'}
                          onChange={c => setPreviewStyle(s => ({ ...s, bg: 'custom', bgCustom: c }))}
                          onClose={() => setColorPicker(null)}
                          onEyedropperStart={startEyedropper}
                          onEyedropperEnd={endEyedropper}
                          imageUrl={project.cover_url}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 5, textAlign: 'right' }}>
                    {usingCustomBg
                      ? customBg.toUpperCase()
                      : (BG_OPTIONS.find(b => b.key === (previewStyle.bg || 'default')) || BG_OPTIONS[0]).label}
                  </div>
                </div>
              </div>

              {/* Group: Capa — logo a seguir à Identidade Visual, não a meio
                  da lista atrás de tipografia e links. É a decisão visual
                  mais visível da página (o hero) e a ação mais provável
                  a seguir a escolher as cores, por isso é a primeira coisa
                  que se vê ao abrir "Estilo". Junta a imagem e o toggle que
                  a liga ao hero — estavam em grupos separados, mas são a
                  mesma decisão vista de dois ângulos. */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Capa</div>
                {project.cover_url ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 120, marginBottom: 12 }}>
                    <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => pickCoverImage()}
                      style={{
                        position: 'absolute', right: 8, bottom: 8,
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 11px', borderRadius: 8,
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.18)', color: '#fff',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <Camera size={12} /> Trocar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => pickCoverImage()}
                    style={{
                      width: '100%', height: 90, borderRadius: 10, marginBottom: 12,
                      background: 'var(--color-bg)', border: '1.5px dashed var(--color-border)',
                      color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    }}
                  >
                    <Camera size={18} />
                    Carregar capa
                  </button>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={wsControlLabel}>Capa como fundo do hero</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                        {project.cover_url ? 'Usa a imagem de capa no hero' : 'Carrega uma capa primeiro'}
                      </div>
                    </div>
                    <button
                      onClick={() => project.cover_url && setPreviewStyle(ps => ({ ...ps, coverAsHero: !ps.coverAsHero }))}
                      style={{
                        width: 42, height: 24, minWidth: 42, minHeight: 24, borderRadius: 99, flexShrink: 0,
                        background: previewStyle.coverAsHero && project.cover_url ? 'var(--color-primary)' : 'var(--color-border)',
                        border: 'none', cursor: project.cover_url ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s', position: 'relative',
                        opacity: project.cover_url ? 1 : 0.4,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: previewStyle.coverAsHero && project.cover_url ? 21 : 3,
                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      }} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Tamanho do hero</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {HERO_SIZES.map(s => {
                      const isSelected = (previewStyle.heroSize || 'default') === s.key
                      return (
                        <button key={s.key} onClick={() => setPreviewStyle(ps => ({ ...ps, heroSize: s.key }))}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8,
                            ...wsOptStyle(isSelected),
                            fontSize: 11, fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                          }}
                        >{s.label}</button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={wsControlLabel}>Tagline personalizada</div>
                  <input
                    value={previewStyle.customTagline || ''}
                    onChange={e => setPreviewStyle(ps => ({ ...ps, customTagline: e.target.value }))}
                    placeholder={project.ai_tagline || 'Escreve uma tagline...'}
                    style={wsInputNew}
                    maxLength={120}
                  />
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 5 }}>Uma frase curta que resume o teu projeto.</div>
                </div>
              </div>

              {/* Group: Tipografia */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Tipografia</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Fonte do título</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
                    {TITLE_FONT_OPTIONS.map(f => {
                      const isSel = (previewStyle.titleFont || 'croogla') === f.key
                      return (
                        <button key={f.key} title={f.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, titleFont: f.key }))}
                          style={{
                            padding: '8px 2px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            ...wsOptStyle(isSel),
                            transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: f.css, lineHeight: 1 }}>{f.sample}</div>
                          <div style={{ fontSize: 8, marginTop: 3, fontWeight: isSel ? 700 : 500, fontFamily: 'var(--font-body)' }}>{f.label}</div>
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {TITLE_STYLE_OPTIONS.map(s => {
                      const isSel = (previewStyle.titleStyle || 'normal') === s.key
                      return (
                        <button key={s.key} onClick={() => setPreviewStyle(ps => ({ ...ps, titleStyle: s.key }))}
                          style={{
                            flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                            ...wsOptStyle(isSel),
                            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                          }}
                        >{s.label}</button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Alinhamento</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { val: 'left', Icon: AlignLeft }, { val: 'center', Icon: AlignCenter }, { val: 'right', Icon: AlignRight },
                    ].map(a => {
                      const isSel = (previewStyle.titleAlign || 'center') === a.val
                      return (
                        <button key={a.val} onClick={() => setPreviewStyle(ps => ({ ...ps, titleAlign: a.val }))}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                            ...wsOptStyle(isSel),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                          }}
                        ><a.Icon size={14} /></button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={wsControlLabel}>Fonte do texto</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {FONT_OPTIONS.map(f => {
                      const isSel = (previewStyle.font || 'default') === f.key
                      return (
                        <button key={f.key} title={f.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, font: f.key }))}
                          style={{
                            padding: '8px 2px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            ...wsOptStyle(isSel), transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: f.css, lineHeight: 1 }}>{f.sample}</div>
                          <div style={{ fontSize: 8, marginTop: 3, fontWeight: isSel ? 700 : 500, fontFamily: 'var(--font-body)' }}>{f.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Group: Estilo dos cards */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Estilo dos cards</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'border', label: 'Padrão',  desc: 'Com bordas'    },
                    { key: 'flat',   label: 'Flat',    desc: 'Sem bordas'    },
                    { key: 'glass',  label: 'Glass',   desc: 'Transparente'  },
                  ].map(c => {
                    const isSel = (previewStyle.cardStyle || 'border') === c.key
                    return (
                      <button key={c.key} onClick={() => setPreviewStyle(ps => ({ ...ps, cardStyle: c.key }))}
                        style={{
                          flex: 1, padding: '10px 4px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                          ...wsOptStyle(isSel),
                          fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{c.label}</div>
                        <div style={{ fontSize: 9, marginTop: 3, color: isSel ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>{c.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Group: Links do projeto */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'linkDemo',     Icon: Globe,       placeholder: 'Demo / site (https://...)' },
                    { key: 'linkGithub',   Icon: FileText,    placeholder: 'GitHub (https://github.com/...)' },
                    { key: 'linkLinkedin', Icon: User,        placeholder: 'LinkedIn (https://linkedin.com/...)' },
                  ].map(({ key, Icon, placeholder }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={12} color="var(--color-text-secondary)" />
                      </div>
                      <input
                        value={previewStyle[key] || ''}
                        onChange={e => setPreviewStyle(ps => ({ ...ps, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ ...wsInputNew, flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 6 }}>Aparecem no hero como botões de acção.</div>
              </div>

              {/* Group: Rodapé */}
              <div style={{ ...wsGroup, marginBottom: 4 }}>
                <div style={wsGroupLabel}>Rodapé</div>
                <input
                  value={previewStyle.footerText || ''}
                  onChange={e => setPreviewStyle(ps => ({ ...ps, footerText: e.target.value }))}
                  placeholder="Ex: Projeto desenvolvido em 2025 · ETIC Lisboa"
                  style={wsInputNew}
                  maxLength={120}
                />
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 5 }}>Aparece no fundo da preview pública.</div>
              </div>
            </div>
          )}

          {/* ── TAB: BLOCOS ── (secções nativas + blocos personalizados numa
              só lista reordenável: são a mesma decisão — "o que aparece e em
              que ordem" — vista de dois sítios diferentes só criava trabalho
              duplicado para dizer a mesma coisa) */}
          {previewTab === 'blocos' && (() => {
            const NATIVE_SECTIONS_MAP = {
              problem:         { label: 'Problema',        Icon: Search     },
              solution:        { label: 'Solução',         Icon: Lightbulb  },
              target_audience: { label: 'Público-alvo',    Icon: Target     },
              features:        { label: 'Funcionalidades', Icon: Wrench     },
              technologies:    { label: 'Tecnologias',     Icon: Zap        },
              challenges:      { label: 'Desafios',        Icon: Zap        },
              results:         { label: 'Resultados',      Icon: TrendingUp },
              learnings:       { label: 'Aprendizagens',   Icon: BookOpen   },
              pap_supervisor:  { label: 'Orientador',       Icon: GraduationCap },
            }
            const hidden = new Set(previewStyle.hiddenSections || [])
            const defaultLayout = [
              ...orderedSections.map(key => ({ kind: 'section', key })),
              ...previewBlocks.map(b => ({ kind: 'block', id: b.id })),
            ]
            const layoutDisplay = previewStyle.layoutOrder?.length ? previewStyle.layoutOrder : defaultLayout

            return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Canvas mode toggle */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: previewStyle.canvasMode ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                  📐 Posição livre
                </div>
                <button
                  onClick={() => setPreviewStyle(ps => ({ ...ps, canvasMode: !ps.canvasMode }))}
                  style={{
                    width: 38, height: 22, minWidth: 38, minHeight: 22, borderRadius: 99, flexShrink: 0,
                    background: previewStyle.canvasMode ? 'var(--color-primary)' : 'var(--color-border)',
                    border: 'none', cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: previewStyle.canvasMode ? 19 : 3,
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* Lista única reordenável: adicionar bloco + secções nativas +
                  blocos personalizados. O picker de blocos vai aqui dentro
                  (não numa secção fixa acima) porque, sozinho, já é mais alto
                  do que a folha inteira no mobile — se ficasse fora da área
                  com scroll, a lista de baixo ("Ordem da página") nunca
                  ganhava espaço nenhum para aparecer, e dava a sensação de
                  scroll preso. */}
              <div style={{ flex: 1, overflowY: 'scroll', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Adicionar bloco</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 16 }}>
                  {BLOCK_TYPES.map(bt => {
                    const BtIcon = bt.Icon
                    return (
                      <button key={bt.type} title={bt.desc} onClick={() => {
                          const b = newBlock(bt.type, previewBlocks.length)
                          setPreviewBlocks(bs => [b, ...bs])
                          // New blocks land at the bottom of the page.
                          setPreviewStyle(ps => {
                            const base = ps.layoutOrder?.length
                              ? ps.layoutOrder
                              : [...orderedSections.map(key => ({ kind: 'section', key })), ...previewBlocks.map(pb => ({ kind: 'block', id: pb.id }))]
                            return { ...ps, layoutOrder: [...base, { kind: 'block', id: b.id }] }
                          })
                        }}
                        style={{
                          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                          borderRadius: 8, padding: '7px 6px',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                          transition: 'all 0.13s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-subtle)'; e.currentTarget.style.borderColor = 'var(--color-primary-subtle)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BtIcon size={12} color="var(--color-primary)" />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>{bt.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Ordem da página</div>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Arrasta o ≡ para reordenar. Toca em <Eye size={10} style={{ verticalAlign: 'middle' }} /> para ocultar uma secção.
                </p>
                {previewStyle.canvasMode && previewBlocks.length > 0 && (
                  <div style={{ margin: '0 0 10px', padding: '6px 10px', borderRadius: 8, background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.25)', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    ⚠️ <strong>Posição livre</strong> está ativa — os blocos flutuam livremente e não seguem esta ordem.
                  </div>
                )}
                <div ref={layoutListRef} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {layoutDisplay.map((item, idx) => {
                  if (item.kind === 'block') {
                  const block = previewBlocks.find(b => b.id === item.id)
                  if (!block) return null
                  const bt = BLOCK_TYPES.find(b => b.type === block.type) || BLOCK_TYPES[0]
                  const BtIcon = bt.Icon
                  const isDragTarget = dragOverSectionIdx === idx
                  const accentColor = block.color || 'var(--color-primary)'
                  const hasText = ['heading','note','quote','callout','metric','stats'].includes(block.type)
                  return (
                    <div key={block.id} data-layout-idx={idx}
                      style={{
                        background: isDragTarget ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)',
                        border: `1px solid ${isDragTarget ? 'var(--color-primary-subtle)' : 'var(--color-border)'}`,
                        borderLeft: `3px solid ${accentColor}`,
                        borderRadius: 9, padding: '9px 10px',
                        transition: 'all 0.1s',
                        transform: isDragTarget ? 'scale(1.01)' : 'none',
                      }}
                    >
                      {/* Block header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <div onPointerDown={e => startLayoutDrag(e, idx)} style={{ cursor: 'grab', display: 'flex', flexShrink: 0, touchAction: 'none' }}>
                          <GripVertical size={12} color="var(--color-text-tertiary)" />
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: `${accentColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BtIcon size={10} color={accentColor} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>{bt.label}</span>
                        <button onClick={() => {
                            setPreviewBlocks(bs => bs.filter(b => b.id !== block.id))
                            setPreviewStyle(ps => ps.layoutOrder?.length
                              ? { ...ps, layoutOrder: ps.layoutOrder.filter(li => !(li.kind === 'block' && li.id === block.id)) }
                              : ps)
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-error)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                        ><X size={12} /></button>
                      </div>

                      {/* Block content inputs */}
                      {block.type === 'heading' && <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Título da secção..." style={wsInputNew} />}
                      {block.type === 'note' && <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="A tua mensagem para quem visita..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />}
                      {block.type === 'quote' && <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Frase ou citação marcante..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />}
                      {block.type === 'callout' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Título (opcional)" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Conteúdo do destaque..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />
                      </>)}
                      {block.type === 'link' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Texto (ex: Ver demo)" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="URL (https://...)" style={wsInputNew} />
                      </>)}
                      {block.type === 'github' && (<>
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="https://github.com/user/repo" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {GH_VARIANTS.map(v => (
                            <button key={v.id} onClick={() => upd(block.id, 'color', v.id)}
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--color-border)', background: (block.color || 'full') === v.id ? 'var(--color-primary)' : 'transparent', color: (block.color || 'full') === v.id ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </>)}
                      {block.type === 'linkedin' && (<>
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="https://linkedin.com/in/username" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Nome (opcional)" style={wsInputNew} />
                      </>)}
                      {block.type === 'metric' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Valor (ex: 2.500)" style={{ ...wsInputNew, marginBottom: 5, fontWeight: 800 }} />
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Descrição" style={wsInputNew} />
                      </>)}
                      {block.type === 'image' && (<>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                          <input value={block.imageUrl || ''} onChange={e => upd(block.id, 'imageUrl', e.target.value)} placeholder="URL da imagem..." style={{ ...wsInputNew, flex: 1 }} />
                          <button onClick={() => uploadImage(block.id, 'imageUrl')} style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 6, padding: '0 9px', color: colors.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Camera size={12} /></button>
                        </div>
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Legenda (opcional)" style={wsInputNew} />
                      </>)}
                      {block.type === 'gallery' && (<>
                        {['imageUrl','imageUrl2','imageUrl3'].map((field, gi) => (
                          <div key={field} style={{ display: 'flex', gap: 5, marginBottom: gi < 2 ? 5 : 0 }}>
                            <input value={block[field] || ''} onChange={e => upd(block.id, field, e.target.value)} placeholder={`Imagem ${gi+1}`} style={{ ...wsInputNew, flex: 1 }} />
                            <button onClick={() => uploadImage(block.id, field)} style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 6, padding: '0 9px', color: colors.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Camera size={12} /></button>
                          </div>
                        ))}
                      </>)}
                      {block.type === 'video' && <input value={block.videoUrl || ''} onChange={e => upd(block.id, 'videoUrl', e.target.value)} placeholder="URL do YouTube ou Vimeo..." style={wsInputNew} />}
                      {block.type === 'stats' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {[1,2,3].map(n => (
                            <div key={n} style={{ display: 'flex', gap: 4 }}>
                              <input value={block[`stat${n}Value`] || ''} onChange={e => upd(block.id, `stat${n}Value`, e.target.value)} placeholder={`Valor ${n}`} style={{ ...wsInputNew, flex: '0 0 40%', fontWeight: 800 }} />
                              <input value={block[`stat${n}Label`] || ''} onChange={e => upd(block.id, `stat${n}Label`, e.target.value)} placeholder={`Desc. ${n}`} style={{ ...wsInputNew, flex: 1 }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {block.type === 'cta' && (<>
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Texto do botão" style={{ ...wsInputNew, marginBottom: 5, fontWeight: 700 }} />
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="URL de destino (https://...)" style={wsInputNew} />
                      </>)}
                      {block.type === 'card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <input value={block.cardTitle || ''} onChange={e => upd(block.id, 'cardTitle', e.target.value)} placeholder="Título do card (opcional)" style={{ ...wsInputNew, fontWeight: 700 }} />
                          {(block.cardRows || []).map((row, i) => (
                            <div key={i} style={{ display: 'flex', gap: 4 }}>
                              <input
                                value={row.label}
                                onChange={e => {
                                  const rows = [...block.cardRows]; rows[i] = { ...rows[i], label: e.target.value }
                                  upd(block.id, 'cardRows', rows)
                                }}
                                placeholder="Ex: Idade" style={{ ...wsInputNew, flex: '0 0 42%' }}
                              />
                              <input
                                value={row.value}
                                onChange={e => {
                                  const rows = [...block.cardRows]; rows[i] = { ...rows[i], value: e.target.value }
                                  upd(block.id, 'cardRows', rows)
                                }}
                                placeholder="Ex: 17 anos" style={{ ...wsInputNew, flex: 1 }}
                              />
                              <button
                                onClick={() => upd(block.id, 'cardRows', block.cardRows.filter((_, ri) => ri !== i))}
                                className="icon-btn-ghost"
                              ><X size={13} /></button>
                            </div>
                          ))}
                          {(block.cardRows || []).length < 6 && (
                            <button
                              onClick={() => upd(block.id, 'cardRows', [...(block.cardRows || []), { label: '', value: '' }])}
                              style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}
                            >+ Adicionar linha</button>
                          )}
                        </div>
                      )}
                      {block.type === 'divider' && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {['solid','dashed','dotted','gradient'].map(s => (
                            <button key={s} onClick={() => upd(block.id, 'dividerStyle', s)}
                              style={{
                                flex: 1, padding: '5px 0', borderRadius: 6, cursor: 'pointer',
                                border: `1px solid ${(block.dividerStyle || 'solid') === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                background: (block.dividerStyle || 'solid') === s ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
                                color: (block.dividerStyle || 'solid') === s ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                fontSize: 9, fontWeight: 700, fontFamily: 'inherit',
                              }}
                            >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                          ))}
                        </div>
                      )}
                      {block.type === 'dbtable' && (
                        dbTablesForBlock.length === 0 ? (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Ainda não ligaste nenhuma tabela a este projeto — faz isso em "Base de dados" no editor do projeto.
                          </p>
                        ) : (
                          <select
                            value={block.url || ''}
                            onChange={e => {
                              const t = dbTablesForBlock.find(t => t.id === e.target.value)
                              upd(block.id, 'url', e.target.value)
                              upd(block.id, 'label', t?.label || '')
                            }}
                            style={wsInputNew}
                          >
                            <option value="">Escolhe uma tabela...</option>
                            {dbTablesForBlock.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        )
                      )}

                      {/* Footer: accent color + alignment (compact) */}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                          {BLOCK_ACCENT_COLORS.map(c => (
                            <button key={c.value} title={c.label}
                              onClick={() => upd(block.id, 'color', block.color === c.value ? '' : c.value)}
                              style={{
                                width: 28, height: 28, minWidth: 28, minHeight: 28, borderRadius: '50%', background: c.value,
                                border: block.color === c.value ? '2px solid var(--color-text)' : '1.5px solid transparent',
                                cursor: 'pointer', padding: 0, flexShrink: 0,
                                boxShadow: block.color === c.value ? `0 0 0 1px ${c.value}` : 'none',
                                transition: 'transform 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          ))}
                        </div>
                        {hasText && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[{ val: 'left', Icon: AlignLeft }, { val: 'center', Icon: AlignCenter }, { val: 'right', Icon: AlignRight }].map(a => (
                              <button key={a.val} onClick={() => upd(block.id, 'align', a.val)}
                                style={{
                                  width: 32, height: 32, borderRadius: 7,
                                  background: (block.align || 'left') === a.val ? 'var(--color-primary)' : 'transparent',
                                  border: `1px solid ${(block.align || 'left') === a.val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                  cursor: 'pointer', color: (block.align || 'left') === a.val ? '#fff' : 'var(--color-text-secondary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                }}
                              ><a.Icon size={13} /></button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Width — pairs two consecutive "Metade" blocks side by side */}
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                        {[{ val: 'full', label: 'Largura total' }, { val: 'half', label: 'Metade' }].map(w => (
                          <button key={w.val} onClick={() => upd(block.id, 'width', w.val)}
                            style={{
                              flex: 1, padding: '4px 0', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                              background: (block.width || 'full') === w.val ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
                              border: `1px solid ${(block.width || 'full') === w.val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              color: (block.width || 'full') === w.val ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              fontSize: 10, fontWeight: 600,
                            }}
                          >{w.label}</button>
                        ))}
                      </div>
                    </div>
                  )
                  }

                    const key = item.key
                    const s = NATIVE_SECTIONS_MAP[key]
                    if (!s) return null
                    const isHidden = hidden.has(key)
                    const hasContent = key === 'features' ? features.length > 0 : key === 'technologies' ? tech.length > 0 : !!(project[key]?.trim())
                    const SIcon = s.Icon
                    const media = previewStyle.sectionMedia?.[key]
                    return (
                      <div key={key}>
                      <div data-layout-idx={idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: dragOverSectionIdx === idx ? 'var(--color-primary-subtle)' : isHidden ? 'var(--color-bg)' : hasContent ? 'var(--color-bg-alt)' : 'var(--color-bg)',
                          border: `1px solid ${dragOverSectionIdx === idx ? 'var(--color-primary)' : isHidden ? 'var(--color-border)' : hasContent ? 'var(--color-primary-subtle)' : 'var(--color-border)'}`,
                          borderLeft: `3px solid ${hasContent && !isHidden ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: 10, padding: '8px 10px',
                          opacity: hasContent ? 1 : 0.45, transition: 'all 0.12s',
                          userSelect: 'none',
                        }}
                      >
                        <div
                          onPointerDown={e => startLayoutDrag(e, idx)}
                          style={{ cursor: 'grab', color: 'var(--color-text-tertiary)', display: 'flex', flexShrink: 0, touchAction: 'none' }}
                        ><GripVertical size={14} /></div>
                        <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: isHidden ? 'var(--color-bg-alt)' : 'var(--color-primary-subtle)', border: `1px solid ${isHidden ? 'var(--color-border)' : 'var(--color-primary-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isHidden ? 'var(--color-text-tertiary)' : 'var(--color-primary)' }}>
                          <SIcon size={12} strokeWidth={2} />
                          </div>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: isHidden ? 'var(--color-text-tertiary)' : 'var(--color-text)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                          {s.label}
                        </span>
                        {!hasContent && <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '1px 5px' }}>vazio</span>}
                        <button
                          onClick={() => {
                            const newHidden = new Set(hidden)
                            isHidden ? newHidden.delete(key) : newHidden.add(key)
                            setPreviewStyle(ps => ({ ...ps, hiddenSections: [...newHidden] }))
                          }}
                          title={isHidden ? 'Mostrar' : 'Ocultar'}
                          style={{ background: 'none', border: 'none', padding: '3px 4px', cursor: 'pointer', display: 'flex', color: isHidden ? 'var(--color-text-tertiary)' : 'var(--color-primary)', flexShrink: 0, borderRadius: 6, transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-subtle)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {hasContent && (
                          <button
                            onClick={() => setMediaEditKey(k => k === key ? null : key)}
                            title="Imagem/vídeo ao lado"
                            style={{ background: media ? 'var(--color-primary-subtle)' : 'none', border: 'none', padding: '3px 4px', cursor: 'pointer', display: 'flex', color: media ? 'var(--color-primary)' : 'var(--color-text-tertiary)', flexShrink: 0, borderRadius: 6, transition: 'background 0.12s' }}
                          >
                            <Image size={14} />
                          </button>
                        )}
                      </div>
                      {mediaEditKey === key && (
                        <div style={{ marginTop: 4, marginLeft: 22, padding: '10px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => uploadSectionMedia(key)}
                              style={{ flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >Carregar imagem</button>
                            {media && (
                              <button
                                onClick={() => setPreviewStyle(ps => {
                                  const next = { ...(ps.sectionMedia || {}) }
                                  delete next[key]
                                  return { ...ps, sectionMedia: next }
                                })}
                                style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 6, color: 'var(--color-error)', cursor: 'pointer', fontFamily: 'inherit' }}
                              >Remover</button>
                            )}
                          </div>
                          <input
                            type="text" placeholder="Ou cola um link de vídeo (YouTube/Vimeo)"
                            defaultValue={media?.type === 'video' ? media.url : ''}
                            onBlur={e => {
                              const url = e.target.value.trim()
                              if (!url) return
                              setPreviewStyle(ps => ({
                                ...ps,
                                sectionMedia: { ...(ps.sectionMedia || {}), [key]: { ...(ps.sectionMedia?.[key] || {}), type: 'video', url } },
                              }))
                            }}
                            style={{ width: '100%', padding: '6px 8px', fontSize: 11, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                          {media && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Lado:</span>
                              {['right', 'left'].map(side => (
                                <button
                                  key={side}
                                  onClick={() => setPreviewStyle(ps => ({
                                    ...ps,
                                    sectionMedia: { ...(ps.sectionMedia || {}), [key]: { ...(ps.sectionMedia?.[key] || {}), side } },
                                  }))}
                                  style={{
                                    padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                                    background: (media.side || 'right') === side ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)',
                                    border: `1px solid ${(media.side || 'right') === side ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    color: (media.side || 'right') === side ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                  }}
                                >{side === 'right' ? 'Direita' : 'Esquerda'}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    )
                })}
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  A ordem é guardada ao clicar em "Guardar alterações".
                </p>
              </div>
            </div>
            )
          })()}

          {/* ── Templates tab ── */}
          {previewTab === 'templates' && (() => {
            const VISUAL_TEMPLATES = [
              {
                id: 'midnight-tech',
                label: 'Midnight Tech',
                desc: 'Escuro profundo, azul elétrico, tipografia técnica',
                tags: ['hero', 'citação', 'métrica'],
                style: { bg: 'midnight', accent: 'blue', titleFont: 'space', font: 'inter', cardStyle: 'glass', titleStyle: 'caps', heroSize: 'full', titleAlign: 'left', coverAsHero: true },
                blocks: [
                  { type: 'callout', content: 'O que torna este projeto único?', color: 'var(--color-primary)', align: 'left', width: 'full' },
                  { type: 'quote', content: 'A tecnologia é a ferramenta; a criatividade é o motor.', align: 'left', width: 'full' },
                  { type: 'metric', label: 'Impacto', content: '—', align: 'left', width: 'full' },
                ],
                preview: { bg: '#030508', accent: '#1b78f7', title: 'Space Grotesk', body: 'Inter', align: 'left', hero: true },
              },
              {
                id: 'cosmic-purple',
                label: 'Cosmic',
                desc: 'Cosmos escuro, roxo vibrante, fontes expressivas',
                tags: ['hero', 'título', 'citação'],
                style: { bg: 'cosmic', accent: 'purple', titleFont: 'syne', font: 'syne', cardStyle: 'glass', titleStyle: 'gradient', heroSize: 'full', titleAlign: 'center', coverAsHero: true },
                blocks: [
                  { type: 'heading', content: 'A visão por trás do projeto', align: 'center', width: 'full' },
                  { type: 'quote', content: 'Cada projeto começa com uma pergunta que ainda não tem resposta.', align: 'center', width: 'full' },
                  { type: 'divider', dividerStyle: 'dashed', width: 'full' },
                ],
                preview: { bg: '#160b2a', accent: '#7c3aed', title: 'Syne', body: 'Syne', align: 'center', hero: true },
              },
              {
                id: 'forest-green',
                label: 'Forest',
                desc: 'Verde natureza, fundo floresta, cards sólidos',
                tags: ['nota', 'métrica'],
                style: { bg: 'forest', accent: 'teal', titleFont: 'croogla', font: 'default', cardStyle: 'border', titleStyle: 'normal', heroSize: 'default', titleAlign: 'left', coverAsHero: false },
                blocks: [
                  { type: 'note', content: 'Apresenta o teu projeto com as tuas palavras. O que aprendeste? Que problema resolveste?', align: 'left', width: 'full' },
                  { type: 'metric', label: 'Horas dedicadas', content: '—', align: 'left', width: 'full' },
                ],
                preview: { bg: '#081408', accent: '#0d9488', title: 'Croogla', body: 'Montserrat', align: 'left', hero: false },
              },
              {
                id: 'warm-amber',
                label: 'Warm Amber',
                desc: 'Tom quente, âmbar, tipografia arredondada e amigável',
                tags: ['destaque', 'nota', 'botão'],
                style: { bg: 'warm', accent: 'amber', titleFont: 'fredoka', font: 'fredoka', cardStyle: 'flat', titleStyle: 'normal', heroSize: 'default', titleAlign: 'left', coverAsHero: false },
                blocks: [
                  { type: 'callout', content: 'Destaque do projeto: escreve aqui o momento que mais te orgulha', color: '#d97706', align: 'left', width: 'full' },
                  { type: 'note', content: 'Uma nota pessoal para quem visita o teu projeto.', align: 'left', width: 'full' },
                  { type: 'cta', content: 'Ver o projeto', url: '', align: 'left', width: 'full' },
                ],
                preview: { bg: '#140c02', accent: '#d97706', title: 'Fredoka', body: 'Fredoka', align: 'left', hero: false },
              },
              {
                id: 'paper-editorial',
                label: 'Editorial',
                desc: 'Fundo papel claro, serifa clássica, estilo revista',
                tags: ['hero', 'título', 'citação', 'divisor'],
                style: { bg: 'paper', accent: 'slate', titleFont: 'playfair', font: 'serif', cardStyle: 'border', titleStyle: 'normal', heroSize: 'compact', titleAlign: 'center', coverAsHero: true },
                blocks: [
                  { type: 'heading', content: 'Introdução', align: 'center', width: 'full' },
                  { type: 'quote', content: 'A apresentação é parte do projeto.', align: 'center', width: 'full' },
                  { type: 'divider', dividerStyle: 'solid', width: 'full' },
                ],
                preview: { bg: '#f5f0e8', accent: '#475569', title: 'Playfair', body: 'Georgia', isLight: true, align: 'center', hero: true },
              },
              {
                id: 'crimson-bold',
                label: 'Crimson Bold',
                desc: 'Vermelho intenso, navy profundo, impacto máximo',
                tags: ['hero', 'destaque', 'métrica', 'botão'],
                style: { bg: 'navy', accent: 'crimson', titleFont: 'syne', font: 'inter', cardStyle: 'flat', titleStyle: 'caps', heroSize: 'full', titleAlign: 'left', coverAsHero: true },
                blocks: [
                  { type: 'callout', content: 'Este projeto existe porque:', color: '#dc2626', align: 'left', width: 'full' },
                  { type: 'stats', stat1Value: '—', stat1Label: 'Resultado 1', stat2Value: '—', stat2Label: 'Resultado 2', stat3Value: '—', stat3Label: 'Resultado 3', width: 'full' },
                  { type: 'cta', content: 'Ver demonstração', url: '', align: 'left', width: 'full' },
                ],
                preview: { bg: '#0c1e38', accent: '#dc2626', title: 'Syne CAPS', body: 'Inter', align: 'left', hero: true },
              },
              {
                id: 'slate-minimal',
                label: 'Minimal',
                desc: 'Ardósia neutra, sem cores fortes, espaço e clareza',
                tags: ['nota', 'divisor'],
                style: { bg: 'slate', accent: 'slate', titleFont: 'inter', font: 'inter', cardStyle: 'flat', titleStyle: 'normal', heroSize: 'compact', titleAlign: 'left', coverAsHero: false },
                blocks: [
                  { type: 'note', content: 'Descreve o essencial do teu projeto, sem ruído.', align: 'left', width: 'full' },
                  { type: 'divider', dividerStyle: 'solid', width: 'full' },
                ],
                preview: { bg: '#0c1018', accent: '#475569', title: 'Inter', body: 'Inter', align: 'left', hero: false },
              },
              {
                id: 'chalk-clean',
                label: 'Clean Light',
                desc: 'Fundo claro cinza, azul padrão, layout limpo',
                tags: ['nota', 'destaque'],
                style: { bg: 'chalk', accent: 'default', titleFont: 'croogla', font: 'default', cardStyle: 'border', titleStyle: 'normal', heroSize: 'default', titleAlign: 'left', coverAsHero: false },
                blocks: [
                  { type: 'note', content: 'Escreve aqui uma apresentação do teu projeto para quem visita.', align: 'left', width: 'full' },
                  { type: 'callout', content: 'Ideia principal do projeto', color: 'var(--color-primary)', align: 'left', width: 'full' },
                ],
                preview: { bg: '#eff0f2', accent: '#1b78f7', title: 'Croogla', body: 'Montserrat', isLight: true, align: 'left', hero: false },
              },
            ]

            const pendingTpl = VISUAL_TEMPLATES.find(t => t.id === templateConfirm)

            return (
              <div style={{ flex: 1, overflowY: 'scroll', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, padding: '0 4px' }}>Templates completos</div>

                {templateApplied && (
                  <div style={{ padding: '8px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={12} /> Template aplicado!
                  </div>
                )}

                {/* Confirm overlay when blocks exist */}
                {templateConfirm && pendingTpl && (
                  <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Substituir blocos actuais?</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      O template <strong>{pendingTpl.label}</strong> vai substituir os teus blocos actuais pelos blocos de base do template.
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApplyTemplate(pendingTpl)} style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, background: '#d97706', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Aplicar mesmo assim
                      </button>
                      <button onClick={() => setTemplateConfirm(null)} style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, background: 'var(--color-bg-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {VISUAL_TEMPLATES.map(tpl => {
                  const isActive = templateApplied === tpl.id
                  const isPending = templateConfirm === tpl.id
                  const textFg = tpl.preview.isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)'
                  const textFaint = tpl.preview.isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
                  const centered = tpl.preview.align === 'center'
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        if (tpl.blocks?.length > 0 && previewBlocks.length > 0 && !isPending) {
                          setTemplateConfirm(tpl.id)
                        } else {
                          handleApplyTemplate(tpl)
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'stretch', gap: 0, textAlign: 'left',
                        background: isActive ? 'rgba(34,197,94,0.06)' : isPending ? 'rgba(245,158,11,0.06)' : 'var(--color-bg-alt)',
                        border: `1.5px solid ${isActive ? 'rgba(34,197,94,0.45)' : isPending ? 'rgba(245,158,11,0.45)' : 'var(--color-border)'}`,
                        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                        overflow: 'hidden', width: '100%',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {/* Mini preview swatch */}
                      <div style={{
                        width: 64, flexShrink: 0,
                        background: tpl.preview.bg,
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: centered ? 'center' : 'flex-start',
                        gap: 4, padding: '12px 10px',
                        borderRight: tpl.preview.isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.05)',
                      }}>
                        {tpl.preview.hero
                          ? <div style={{ width: '100%', height: 11, borderRadius: 3, background: `linear-gradient(90deg, ${tpl.preview.accent}88, ${tpl.preview.accent}22)` }} />
                          : <div style={{ width: 18, height: 3, borderRadius: 2, background: tpl.preview.accent }} />
                        }
                        <div style={{ width: centered ? 30 : 38, height: 5, borderRadius: 2, background: textFg }} />
                        <div style={{ width: centered ? 24 : 32, height: 3, borderRadius: 2, background: textFaint }} />
                        <div style={{ width: centered ? 20 : 28, height: 3, borderRadius: 2, background: textFaint, opacity: 0.6 }} />
                      </div>
                      {/* Text info */}
                      <div style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{tpl.label}</span>
                          {tpl.preview.hero && <span style={{ fontSize: 8, fontWeight: 800, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>hero</span>}
                          {isActive && <span style={{ fontSize: 8, fontWeight: 800, background: 'rgba(34,197,94,0.15)', color: '#16a34a', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>ativo</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{tpl.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          </div>}

          </div>{/* end panel skin */}
        </div>
      )}

      {/* ── Story sections ── */}
      <div className="pv-story" style={{ maxWidth: deviceMaxWidth ? Math.min(860, deviceMaxWidth) : 860, margin: `${isDesktop ? 40 : bannerH + 16}px auto 0`, padding: `0 ${previewDevice === 'mobile' ? '16px' : '28px'} 80px`, display: 'flex', flexDirection: 'column', gap: 32, fontFamily: selectedFont.css }}>

        {/* Prova de trabalho do GitHub — logo no topo do conteúdo, antes de
            qualquer bloco ou secção reordenável: é a primeira coisa que
            quem visita a página vê a seguir ao cabeçalho. */}
        <LiveProof project={project} isOwner={false} />
        <GithubProof project={project} />
        <ApiProof project={project} />

        {/* Custom blocks — workspace blocks shown first */}
        {(() => {
        function renderOneBlock(block) {
          const accent = block.color || 'var(--color-primary)'
          const align  = block.align  || 'left'

          if (block.type === 'heading' && block.content) return (
            <div key={block.id} style={{ textAlign: align }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 400, fontFamily: 'var(--font-heading)', color: block.color || 'var(--color-text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {block.content}
              </h2>
            </div>
          )

          if (block.type === 'note' && block.content) return (
            <div key={block.id} style={{ background: 'var(--color-surface)', border: `1px solid ${accent}33`, borderLeft: `4px solid ${accent}`, borderRadius: '0 12px 12px 0', padding: '22px 26px', textAlign: align }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
                <AlignLeft size={11} /> Nota do criador
              </div>
              <p style={{ margin: 0, fontSize: 16, color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{block.content}</p>
            </div>
          )

          if (block.type === 'quote' && block.content) return (
            <div key={block.id} style={{ borderLeft: `4px solid ${accent}`, padding: '20px 28px', background: `${accent}08`, borderRadius: '0 10px 10px 0', textAlign: align }}>
              <p style={{ margin: 0, fontSize: 'clamp(16px,2.2vw,22px)', color: 'var(--color-text)', fontStyle: 'italic', lineHeight: 1.7, fontWeight: 500 }}>
                "{block.content}"
              </p>
            </div>
          )

          if (block.type === 'callout' && block.content) return (
            <div key={block.id} style={{ background: `${accent}0d`, border: `1px solid ${accent}33`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={17} color={accent} />
              </div>
              <div style={{ flex: 1, textAlign: align }}>
                {block.label && <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{block.label}</div>}
                <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text)', lineHeight: 1.7 }}>{block.content}</p>
              </div>
            </div>
          )

          if (block.type === 'link' && block.url) return (
            <div key={block.id} style={{ textAlign: align }}>
              <a href={block.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: `${accent}18`, border: `1px solid ${accent}44`,
                borderRadius: 8, padding: '11px 20px',
                color: accent, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.15s',
              }}>
                <Link size={14} /> {block.label || block.url}
              </a>
            </div>
          )

          if (block.type === 'github' && block.url) return (
            <div key={block.id}><GitHubCard githubUrl={block.url} variant={block.color || 'full'} /></div>
          )

          if (block.type === 'linkedin' && block.url) {
            const liSlug = block.url.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1]
            const liName = block.label || (liSlug ? liSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'LinkedIn')
            return (
              <div key={block.id} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12,
                padding: 20, display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10, background: '#0a66c2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" width={24} height={24} fill="#fff">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{liName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Perfil LinkedIn</div>
                </div>
                <a href={block.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0a66c2', color: '#fff',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                }}>Ver perfil</a>
              </div>
            )
          }

          if (block.type === 'metric' && block.label) return (
            <div key={block.id} style={{ background: 'var(--color-surface)', border: `1px solid ${accent}33`, borderRadius: 12, padding: '24px 28px', textAlign: align }}>
              <div style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900, color: accent, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>{block.label}</div>
              {block.content && <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{block.content}</div>}
            </div>
          )

          if (block.type === 'image' && block.imageUrl) return (
            <div key={block.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <img src={block.imageUrl} alt={block.content || ''} style={{ width: '100%', maxHeight: 480, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
              {block.content && <div style={{ padding: '10px 16px', background: 'var(--color-surface)', fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: align }}>{block.content}</div>}
            </div>
          )

          if (block.type === 'gallery') {
            const imgs = [block.imageUrl, block.imageUrl2, block.imageUrl3].filter(Boolean)
            if (!imgs.length) return null
            return (
              <div key={block.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${imgs.length}, 1fr)`, gap: 8, borderRadius: 12, overflow: 'hidden' }}>
                {imgs.map((src, gi) => (
                  <div key={gi} style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
                  </div>
                ))}
              </div>
            )
          }

          if (block.type === 'video') {
            const embedUrl = getVideoEmbedUrl(block.videoUrl)
            if (!embedUrl) return null
            return (
              <div key={block.id} style={{ borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                <iframe
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            )
          }

          if (block.type === 'stats') {
            const stats = [
              { value: block.stat1Value, label: block.stat1Label },
              { value: block.stat2Value, label: block.stat2Label },
              { value: block.stat3Value, label: block.stat3Label },
            ].filter(s => s.value)
            if (!stats.length) return null
            return (
              <div key={block.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
                {stats.map((s, si) => (
                  <div key={si} style={{
                    background: 'var(--color-surface)', border: `1px solid ${accent}33`,
                    borderRadius: 12, padding: '24px 20px', textAlign: 'center',
                    borderTop: `3px solid ${accent}`,
                  }}>
                    <div style={{ fontSize: 'clamp(28px,4.5vw,44px)', fontWeight: 900, color: accent, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                    {s.label && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>}
                  </div>
                ))}
              </div>
            )
          }

          if (block.type === 'cta' && block.content) return (
            <div key={block.id} style={{ textAlign: 'center', padding: '16px 0' }}>
              <a
                href={block.url || undefined}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: accent,
                  color: '#fff', fontSize: 16, fontWeight: 800,
                  padding: '16px 36px', borderRadius: 10,
                  textDecoration: 'none', letterSpacing: '-0.2px',
                  boxShadow: `0 2px 8px ${accent}33`,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {block.content} <ArrowRight size={18} />
              </a>
            </div>
          )

          if (block.type === 'card') {
            const rows = (block.cardRows || []).filter(r => r.label || r.value)
            if (!block.cardTitle && rows.length === 0) return null
            return (
              <div key={block.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${accent}`, borderRadius: '0 12px 12px 0', padding: '22px 26px' }}>
                {block.cardTitle && (
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: rows.length ? 14 : 0 }}>{block.cardTitle}</div>
                )}
                {rows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{r.label}</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600, textAlign: 'right' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          if (block.type === 'divider') {
            const ds = block.dividerStyle || 'solid'
            if (ds === 'gradient') return (
              <div key={block.id} style={{ height: 2, borderRadius: 99, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            )
            return (
              <div key={block.id} style={{ borderTop: `1.5px ${ds} ${accent}44`, borderRadius: 99 }} />
            )
          }

          if (block.type === 'dbtable' && block.url) return (
            <div key={block.id}><DbTableBlock projectId={project.id} tableId={block.url} /></div>
          )

          return null
        }

        function renderOneSection(key) {
          const sJustify = titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start'

          if (key === 'problem')
            return !project.problem ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${hero.c1}`, borderRadius: '0 12px 12px 0', padding: '30px 32px 26px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: hero.c1, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <Target size={13} /> O problema
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(19px,2.8vw,26px)', color: 'var(--color-text)', lineHeight: 1.45, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', overflowWrap: 'break-word' }}>{project.problem}</p>
              </div>
            )

          if (key === 'solution')
            return !project.solution ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${hero.c1}55`, borderRadius: '0 12px 12px 0', padding: '24px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <Zap size={13} /> A solução
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--color-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.solution}</p>
              </div>
            )

          if (key === 'target_audience')
            return !project.target_audience ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '2px 4px', justifyContent: sJustify, textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={12} /> Para quem é
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, overflowWrap: 'break-word' }}>{project.target_audience}</p>
              </div>
            )

          if (key === 'features')
            return features.length === 0 ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <Wrench size={13} /> O que faz
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'stretch' }}>
                  {features.slice(0, 8).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexDirection: titleAlign === 'right' ? 'row-reverse' : 'row', textAlign: titleAlign === 'center' ? 'left' : titleAlign }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, background: `${hero.c1}22`, border: `1px solid ${hero.c1}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={12} color={`${hero.c1}cc`} />
                      </div>
                      <span style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.6, overflowWrap: 'break-word' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )

          if (key === 'technologies')
            return tech.length === 0 ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <Zap size={13} /> Tecnologias
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: sJustify }}>
                  {tech.map((t, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
                      background: `${hero.c1}14`, border: `1px solid ${hero.c1}33`,
                      borderRadius: 7, padding: '6px 12px', lineHeight: 1.3,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )

          if (key === 'challenges')
            return !project.challenges ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-warning)', borderRadius: '0 12px 12px 0', padding: '28px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <Zap size={13} /> Desafios
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--color-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.challenges}</p>
              </div>
            )

          if (key === 'results')
            return !project.results ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <BarChart2 size={13} /> Resultados
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--color-text)', lineHeight: 1.8, overflowWrap: 'break-word' }}>{project.results}</p>
              </div>
            )

          if (key === 'learnings')
            return !project.learnings ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', textAlign: titleAlign }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: sJustify }}>
                  <BookOpen size={13} /> Aprendizagens
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--color-text)', lineHeight: 1.8, overflowWrap: 'break-word' }}>{project.learnings}</p>
              </div>
            )

          if (key === 'pap_supervisor')
            return !project.pap_supervisor ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Orientador</div>
                  <p style={{ margin: 0, fontSize: 16, color: 'var(--color-text)', fontWeight: 600 }}>{project.pap_supervisor}</p>
                </div>
              </div>
            )

          return null
        }

        // Unified layout order — custom blocks and native sections interleaved
        // freely, in whatever order the owner dragged them in the Secções tab.
        // Falls back to "all blocks, then all sections" for projects saved
        // before this existed, so nothing shifts for existing customizations.
        const blocksById = Object.fromEntries(previewBlocks.map(b => [b.id, b]))
        const defaultLayout = [
          ...orderedSections.map(key => ({ kind: 'section', key })),
          ...previewBlocks.map(b => ({ kind: 'block', id: b.id })),
        ]
        const layout = (previewStyle.layoutOrder?.length ? previewStyle.layoutOrder : defaultLayout)
          .filter(item => item.kind === 'block' ? !!blocksById[item.id] : !hiddenSections.has(item.key))
          // In canvas mode, custom blocks are drawn freely-positioned above
          // (see canvasMode block below) instead of inline in the flow.
          .filter(item => !previewStyle.canvasMode || item.kind !== 'block')

        // A "half" block pairs with whatever comes right after it (block or
        // section) into a side-by-side row — one toggle is enough to see it,
        // no need to also mark the neighbour as half.
        const groups = []
        for (let i = 0; i < layout.length; i++) {
          const item = layout[i]
          const isHalfBlock = item.kind === 'block' && blocksById[item.id]?.width === 'half'
          const next = layout[i + 1]
          if (isHalfBlock && next) {
            groups.push([item, next]); i++
          } else {
            groups.push([item])
          }
        }

        function renderItem(item) {
          return item.kind === 'block' ? renderOneBlock(blocksById[item.id]) : renderOneSection(item.key)
        }

        const canvas = previewStyle.canvasMode && previewBlocks.length > 0 && (
          <div
            key="canvas" ref={canvasRef}
            style={{
              position: 'relative', width: '100%', minHeight: 420,
              background: 'var(--color-bg-alt)', border: '1.5px dashed var(--color-border)', borderRadius: 14,
              overflow: isOwner && previewEditing ? 'visible' : 'hidden',
            }}
          >
            {previewBlocks.map(block => (
              <div
                key={block.id}
                onPointerDown={isOwner && previewEditing ? (e => onCanvasPointerDown(e, block)) : undefined}
                style={{
                  position: 'absolute',
                  left: `${block.pos?.x ?? 8}%`, top: `${block.pos?.y ?? 8}%`,
                  width: 'min(360px, 80%)',
                  cursor: isOwner && previewEditing ? 'grab' : 'default',
                  touchAction: 'none',
                }}
              >
                {renderOneBlock(block)}
              </div>
            ))}
          </div>
        )

        return [
          canvas,
          ...groups.map((g, gi) => g.length === 2 ? (
            <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>{renderItem(g[0])}</div>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>{renderItem(g[1])}</div>
            </div>
          ) : (
            <div key={gi}>{renderItem(g[0])}</div>
          )),
        ]
        })()}

        <ProjectAttachments project={project} />

        {/* Creator card */}
        {displayName && (() => {
          const occupation = occupationLabel(ownerProfile?.occupation)
          return (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 16, padding: '20px 22px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              fontFamily: 'var(--font-body, system-ui, sans-serif)',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, outline: '1px solid var(--color-glass-border)', outlineOffset: -1 }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                  background: hero.c1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 800, color: '#fff',
                }}>{displayName[0]?.toUpperCase()}</div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{displayName}</div>
                {occupation && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{occupation}</span>
                )}
              </div>
              {ownerProfile?.username && (
                <button
                  onClick={() => navigate(`/u/${ownerProfile.username}`)}
                  style={{
                    background: '#fff', border: 'none',
                    borderRadius: 9, padding: '9px 18px',
                    color: '#0a0a0a', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    transition: 'background 0.15s, transform 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e8e8e8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  Ver perfil
                </button>
              )}
            </div>
          )
        })()}

        {/* ── Engagement: Gostos / Interesse + Comentários ── */}
        <div style={{ width: '100%' }}>

          {/* Barra de gostos / interesse */}
          {!isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 16px', flexWrap: 'wrap' }}>


              {/* ⭐ Tenho interesse — recrutadores e empresas */}
              {isRecruiterRole && !hasInterest && (
                <button
                  onClick={onInterest}
                  disabled={interestLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 10, padding: '9px 20px',
                    color: 'var(--color-text-secondary)',
                    fontSize: 14, fontWeight: 700, cursor: interestLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-warning-subtle)'; e.currentTarget.style.color = 'var(--color-warning)'; e.currentTarget.style.background = 'var(--color-warning-subtle)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'var(--color-surface)' }}
                >
                  <Star size={16} fill="none" />
                  {interestLoading ? 'A guardar…' : 'Tenho interesse'}
                </button>
              )}
            </div>
          )}

          {/* Confirmação de interesse: card com ações */}
          {isRecruiterRole && hasInterest && !isOwner && (
            <div style={{
              background: 'var(--color-warning-subtle)',
              border: '1.5px solid var(--color-warning-subtle)',
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={18} color="var(--color-warning)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-warning)' }}>Interesse guardado!</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                    {ownerProfile?.full_name || ownerProfile?.username || 'O estudante'} foi notificado.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ownerProfile?.username && (
                  <a
                    href={`/u/${ownerProfile.username}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text)', textDecoration: 'none',
                    }}
                  >
                    <UserPlus size={14} /> Ver perfil
                  </a>
                )}
                <a
                  href={`/mensagens${ownerProfile?.id ? `?to=${ownerProfile.id}` : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'var(--color-warning)', border: 'none',
                    color: '#000', textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={14} /> Enviar mensagem
                </a>
                <button
                  onClick={onInterest}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'none', border: '1px solid var(--color-warning-subtle)',
                    color: 'var(--color-warning-subtle)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <X size={12} /> Remover
                </button>
              </div>
            </div>
          )}

          {/* Percurso / timeline — vista pública, sem controlos */}
          {project.user_id && <ProjectTimeline project={project} isOwner={isOwner} viewOnly />}

          {/* Comentários */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '22px 24px', fontFamily: 'var(--font-body, system-ui, sans-serif)' }}>
            <ProjectComments projectId={project.id} projectAuthorId={project.user_id} />
          </div>
        </div>

        {/* Rodapé personalizado */}
        {previewStyle.footerText && (
          <div style={{ textAlign: 'center', padding: '20px 0 8px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, letterSpacing: '0.03em' }}>{previewStyle.footerText}</span>
          </div>
        )}

      </div>{/* end story-sections wrapper */}
      </div>{/* end device-frame / CSS scope */}
      </div>{/* end preview scroll area */}
    </div>
  )
}
