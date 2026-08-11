import { useState } from 'react'
import { Check, Circle, Copy, RefreshCw, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Modal, Button } from '../ui'
import { REPORT_SECTIONS, timeAgoLabel } from '../../lib/journal'
import { useAuth } from '../../context/AuthContext'
import { AiUsageBadge } from '../PlanGate'

const MIN_SECTIONS_TO_GENERATE = 3

function draftToText(draft) {
  return REPORT_SECTIONS
    .filter(s => draft?.[s.id])
    .map(s => `${s.label.toUpperCase()}\n\n${draft[s.id]}`)
    .join('\n\n\n')
}

export default function ReportPanel({ project, entries, coverage, onClose, onDraftSaved }) {
  const { checkGate, consumeAI } = useAuth()
  const [draft, setDraft] = useState(project.report_draft ?? null)
  const [updatedAt, setUpdatedAt] = useState(project.report_updated_at ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const canGenerate = coverage.covered >= MIN_SECTIONS_TO_GENERATE

  async function generate() {
    const gate = checkGate('diaryReport')
    if (!gate.allowed) { setError(gate.message?.body ?? gate.message); return }
    setBusy(true); setError('')
    try {
      // Só os campos que o relatório usa — não vale a pena reenviar o rascunho
      // anterior nem metadados da página.
      const { report_draft, report_updated_at, ...projectFields } = project

      const { data, error: fnErr } = await supabase.functions.invoke('generate-report', {
        body: {
          project: projectFields,
          type: project.is_pap || project.project_type === 'pap' ? 'pap' : 'estagio',
          // O diário é o que distingue este rascunho de um gerado só a partir do
          // formulário: traz o percurso real, com datas, decisões e obstáculos.
          journal: entries.map(e => ({
            kind: e.kind,
            date: e.created_at,
            content: e.content,
          })),
        },
      })
      if (fnErr || data?.error) { setError(data?.error || 'Não foi possível gerar agora.'); return }

      consumeAI('diaryReport')
      const now = new Date().toISOString()
      setDraft(data); setUpdatedAt(now)
      await supabase.from('projects')
        .update({ report_draft: data, report_updated_at: now })
        .eq('id', project.id)
      onDraftSaved?.(data, now)
    } catch {
      setError('Não foi possível gerar agora. Tenta mais tarde.')
    } finally {
      setBusy(false)
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(draftToText(draft)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2200)
    })
  }

  return (
    <Modal
      onClose={onClose}
      width={640}
      title="Relatório do projeto"
      subtitle={project.name}
    >
      {/* ── O que já está coberto ── */}
      <div className="sdb-report-summary">
        <div>
          <span className="sdb-report-count">{coverage.covered}<span>/{coverage.total}</span></span>
          <span className="sdb-report-count-label">secções com matéria</span>
        </div>
        <div className="sdb-coverage-rail sdb-coverage-rail--plain">
          {coverage.sections.map(s => (
            <span key={s.id} className={`sdb-coverage-seg${s.covered ? ' is-on' : ''}`} />
          ))}
        </div>
      </div>

      <ul className="sdb-report-sections">
        {coverage.sections.map(s => (
          <li key={s.id} className={`sdb-report-row${s.covered ? ' is-covered' : ''}`}>
            <span className="sdb-report-row-icon">
              {s.covered ? <Check size={13} /> : <Circle size={11} />}
            </span>
            <span className="sdb-report-row-label">{s.label}</span>
            <span className="sdb-report-row-src">
              {s.covered
                ? [s.fromForm && 'formulário', s.fromJournal && 'diário'].filter(Boolean).join(' + ')
                : 'sem matéria'}
            </span>
          </li>
        ))}
      </ul>

      {/* ── Gerar / atualizar ── */}
      <div className="sdb-report-actions">
        <Button onClick={generate} disabled={!canGenerate || busy} loading={busy}
          icon={draft ? <RefreshCw size={14} /> : <FileText size={14} />}>
          {busy ? 'A escrever…' : draft ? 'Atualizar rascunho' : 'Gerar rascunho'}
        </Button>
        <AiUsageBadge feature="diaryReport" />
        {draft && (
          <Button variant="secondary" onClick={copyAll} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copiado' : 'Copiar tudo'}
          </Button>
        )}
      </div>

      {!canGenerate && (
        <p className="sdb-report-note">
          Com tão pouca matéria o rascunho sairia vago. Regista mais
          {' '}{MIN_SECTIONS_TO_GENERATE - coverage.covered} secção{MIN_SECTIONS_TO_GENERATE - coverage.covered !== 1 ? 'ões' : ''} no diário
          {' '}ou preenche mais campos do projeto.
        </p>
      )}
      {updatedAt && (
        <p className="sdb-report-note">Rascunho atualizado {timeAgoLabel(updatedAt)}.</p>
      )}
      {error && <p className="sdb-form-error">{error}</p>}

      {/* ── Rascunho ── */}
      {draft && (
        <div className="sdb-report-draft">
          {REPORT_SECTIONS.filter(s => draft[s.id]).map(s => (
            <article key={s.id} className="sdb-report-block">
              <h4>{s.label}</h4>
              <p>{draft[s.id]}</p>
            </article>
          ))}
          <p className="sdb-report-disclaimer">
            Este é um rascunho a partir do que registaste. Lê, corrige e escreve por
            palavras tuas antes de entregar.
          </p>
        </div>
      )}
    </Modal>
  )
}
