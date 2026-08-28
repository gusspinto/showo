import { User, GraduationCap } from 'lucide-react'
import { useSchoolMode } from '../context/SchoolModeContext'
import './ContextSwitcher.css'

/* ══════════════════════════════════════════════════════════════════════════
   SWITCHER DE CONTEXTO — Pessoal ↔ Escola
   ──────────────────────────────────────────────────────────────────────────
   O Modo Escola não é um ecrã nem uma opção perdida num menu: é o estado em
   que a app está. Este controlo é o único sítio onde esse estado se muda, e
   está sempre visível nos dois sítios onde importa — no topo da dashboard e
   no menu. Quem não tem ligação escolar nenhuma nunca o vê.

   `subtitle` mostra de que escola/turma estamos a falar, porque "Escola"
   sozinho não diz a um aluno se está na turma certa.
   ══════════════════════════════════════════════════════════════════════════ */

export default function ContextSwitcher({ compact = false }) {
  const { mode, setMode, hasSchool, orgName, classes } = useSchoolMode()
  if (!hasSchool) return null

  const schoolLabel = orgName
    || (classes.length === 1 ? classes[0].name : null)
    || 'Escola'

  return (
    <div className={`ctxsw${compact ? ' ctxsw--compact' : ''}`} role="tablist" aria-label="Contexto">
      <button
        role="tab"
        aria-selected={mode === 'pessoal'}
        className={`ctxsw-btn${mode === 'pessoal' ? ' is-active' : ''}`}
        onClick={() => setMode('pessoal')}
      >
        <User size={14} strokeWidth={2.2} />
        <span className="ctxsw-text">
          <span className="ctxsw-title">Pessoal</span>
          {!compact && <span className="ctxsw-sub">O teu portfólio</span>}
        </span>
      </button>
      <button
        role="tab"
        aria-selected={mode === 'escola'}
        className={`ctxsw-btn${mode === 'escola' ? ' is-active' : ''}`}
        onClick={() => setMode('escola')}
      >
        <GraduationCap size={14} strokeWidth={2.2} />
        <span className="ctxsw-text">
          <span className="ctxsw-title">Escola</span>
          {!compact && <span className="ctxsw-sub">{schoolLabel}</span>}
        </span>
      </button>
    </div>
  )
}
