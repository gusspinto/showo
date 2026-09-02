import { UsersGroupTwoRoundedIcon as Users2 } from '@solar-icons/react/bold/users-group-two-rounded'
import { ClipboardListIcon as Clipboard } from '@solar-icons/react/bold/clipboard-list'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { Chart2Icon as BarChart2 } from '@solar-icons/react/bold/chart-2'
import { Button, Card, SectionLabel } from './ui'
import './TeacherEmptyPreview.css'

/* Estado vazio do professor. Em vez de uma frase "ainda não tens turmas",
   mostra o que a ferramenta faz — os três pilares + um preview estático
   (dados de exemplo, sem interação) do dashboard já com uma turma. */

const PILLARS = [
  {
    Icon: Clipboard,
    title: 'Dá tarefas',
    desc: 'Define tarefas com prazo. Cada aluno marca as suas — vês quem está em dia.',
  },
  {
    Icon: BarChart2,
    title: 'Acompanha',
    desc: 'Score, completude e evolução de cada aluno. Quem precisa de atenção salta à vista.',
  },
  {
    Icon: MessageSquare,
    title: 'Avalia',
    desc: 'Feedback por secção no projeto, pedir correções e ver quando o aluno reenvia.',
  },
]

const SAMPLE_STATS = [
  { label: 'Alunos', value: 24 },
  { label: 'Projetos', value: 18 },
  { label: 'Score médio', value: 72 },
  { label: 'Por rever', value: 3, accent: true },
]

const SAMPLE_BARS = [1, 0, 2, 1, 3, 2, 4, 2]

const SAMPLE_FEED = [
  { name: 'App de reciclagem', who: 'Marta S. · 12º B', tag: 'sem feedback teu' },
  { name: 'Site da turma', who: 'João P. · 12º B', tag: 'reenviado' },
  { name: 'Jogo educativo', who: 'Rita M. · 11º A', tag: 'defesa em 4 dias' },
]

export default function TeacherEmptyPreview({ onCreate }) {
  const barMax = Math.max(...SAMPLE_BARS)

  return (
    <div className="tep">
      <div className="tep-intro">
        <h2 className="tep-title">Cria a tua primeira turma</h2>
        <p className="tep-sub">
          Gera um código de 6 letras, partilha-o com os alunos e passas a ter tudo num sítio.
        </p>
        <Button icon={<Users2 size={15} />} onClick={onCreate}>Criar turma</Button>
      </div>

      <div className="tep-pillars">
        {PILLARS.map(({ Icon, title, desc }) => (
          <div key={title} className="tep-pillar">
            <span className="tep-pillar-icon"><Icon size={17} /></span>
            <div className="tep-pillar-title">{title}</div>
            <div className="tep-pillar-desc">{desc}</div>
          </div>
        ))}
      </div>

      <div className="tep-preview-wrap">
        <span className="tep-preview-tag">Exemplo</span>
        <div className="tep-preview" aria-hidden="true">
          <div className="tep-preview-stats">
            {SAMPLE_STATS.map(s => (
              <Card key={s.label} padding="md" style={s.accent ? { borderColor: 'var(--color-error)' } : undefined}>
                <div className="tep-stat-value" style={s.accent ? { color: 'var(--color-error)' } : undefined}>{s.value}</div>
                <div className="tep-stat-label">{s.label}</div>
              </Card>
            ))}
          </div>

          <Card padding="md" className="tep-preview-chart">
            <div className="tep-preview-chart-head">
              <BarChart2 size={12} color="var(--color-text-tertiary)" />
              <SectionLabel style={{ marginBottom: 0 }}>Projetos submetidos — últimas 8 semanas</SectionLabel>
            </div>
            <div className="tep-bars">
              {SAMPLE_BARS.map((c, i) => (
                <div key={i} className="tep-bar-col">
                  <span className="tep-bar-count">{c > 0 ? c : ''}</span>
                  <div
                    className="tep-bar"
                    style={{
                      height: `${Math.max(4, (c / barMax) * 52)}px`,
                      background: c > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card padding="none" className="tep-preview-feed">
            <div className="tep-feed-head">
              <MessageSquare size={12} /> Precisa da tua atenção <span className="tep-feed-count">3</span>
            </div>
            {SAMPLE_FEED.map(f => (
              <div key={f.name} className="tep-feed-item">
                <span className="tep-feed-dot" />
                <div className="tep-feed-body">
                  <div className="tep-feed-name">{f.name}</div>
                  <div className="tep-feed-sub">{f.who} · {f.tag}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div className="tep-preview-fade" />
      </div>
    </div>
  )
}
