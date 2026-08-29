import { useState } from 'react'
import { TrendingUp, Zap, Info, X } from 'lucide-react'
import { calculatePotential } from '../../lib/score'

const DIMS = [
  { key: 'quality',     label: 'Qualidade',    max: 30 },
  { key: 'depth',       label: 'Profundidade', max: 20 },
  { key: 'profile',     label: 'Perfil',       max: 15 },
  { key: 'validation',  label: 'Validação',    max: 20 },
  { key: 'consistency', label: 'Consistência', max: 15 },
]

export default function ScoreHero({ projects, profile }) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const withScore = projects.filter(p => p.score != null)
  const best = withScore.length ? Math.max(...withScore.map(p => p.score)) : 0
  const avg = withScore.length ? Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length) : 0
  const { potential, breakdown } = profile ? calculatePotential({ projects, profile }) : { potential: 0, breakdown: {} }

  const RING_SIZE = 120
  const RADIUS = 52
  const CIRC = 2 * Math.PI * RADIUS
  const scoreProgress = CIRC * (1 - best / 100)
  const potentialProgress = CIRC * (1 - potential / 100)

  return (
    <div className="score-hero">
      <div className="score-hero-bg" aria-hidden="true" />

      {tooltipOpen && (
        <div className="score-hero-tooltip">
          <button className="score-hero-tooltip-close" onClick={() => setTooltipOpen(false)} aria-label="Fechar">
            <X size={13} />
          </button>
          <p className="score-hero-tooltip-title">O que é o score?</p>
          <p className="score-hero-tooltip-body">
            O score é gerado pela IA com base no conteúdo do teu projeto:
            completude, profundidade e validação. É <strong>privado</strong> e
            não substitui a nota do professor. Serve para te mostrar onde podes melhorar.
          </p>
          <p className="score-hero-tooltip-title" style={{ marginTop: 10 }}>E o potencial?</p>
          <p className="score-hero-tooltip-body">
            O potencial calcula o teu perfil global: qualidade dos projetos,
            consistência, validação externa e como usas o diário. Também privado.
          </p>
        </div>
      )}

      <div className="score-hero-content">
        <button
          className="score-hero-info-btn"
          onClick={() => setTooltipOpen(v => !v)}
          aria-label="Informação sobre o score"
          title="O que é o score?"
        >
          <Info size={14} />
        </button>
        {/* Ring — dual concentric: score (outer) + potential (inner) */}
        <div className="score-hero-ring-wrap">
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS}
              fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS}
              fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={scoreProgress}
              transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS - 14}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS - 14}
              fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * (RADIUS - 14)}
              strokeDashoffset={2 * Math.PI * (RADIUS - 14) * (1 - potential / 100)}
              transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <div className="score-hero-ring-inner">
            <div className="score-hero-value">{best}</div>
            <div className="score-hero-value-label">Melhor score</div>
          </div>
        </div>

        {/* Stats + dims */}
        <div className="score-hero-stats">
          <div className="score-hero-topline">
            <div className="score-hero-metric">
              <span className="score-hero-metric-icon"><TrendingUp size={12} /></span>
              <span className="score-hero-metric-val">{avg || '--'}</span>
              <span className="score-hero-metric-label">Média</span>
            </div>
            <div className="score-hero-metric">
              <span className="score-hero-metric-icon"><Zap size={12} /></span>
              <span className="score-hero-metric-val">{potential}</span>
              <span className="score-hero-metric-label">Potencial</span>
            </div>
            <div className="score-hero-metric">
              <span className="score-hero-metric-val">{withScore.length}</span>
              <span className="score-hero-metric-label">Projetos</span>
            </div>
          </div>

          <div className="score-hero-dims">
            {DIMS.map(d => {
              const val = breakdown[d.key] ?? 0
              const pct = (val / d.max) * 100
              return (
                <div key={d.key} className="score-hero-dim">
                  <span className="score-hero-dim-label">{d.label}</span>
                  <div className="score-hero-dim-bar">
                    <div className="score-hero-dim-fg" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="score-hero-dim-val">{val}<span className="score-hero-dim-max">/{d.max}</span></span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
