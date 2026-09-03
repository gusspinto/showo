import { UsersGroupTwoRoundedIcon as Users2 } from '@solar-icons/react/bold/users-group-two-rounded'
import { ClipboardListIcon as Clipboard } from '@solar-icons/react/bold/clipboard-list'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { Chart2Icon as BarChart2 } from '@solar-icons/react/bold/chart-2'
import { Button } from './ui'
import './TeacherEmptyState.css'

/* Estado vazio do professor: um convite claro para criar a primeira turma
   e três cartões a dizer o que se faz depois. Sem mockups. */

const FEATURES = [
  { Icon: Clipboard, title: 'Tarefas', desc: 'Define tarefas com prazo e vês quem as cumpriu.' },
  { Icon: BarChart2, title: 'Progresso', desc: 'Score e evolução de cada aluno num só sítio.' },
  { Icon: MessageSquare, title: 'Avaliação', desc: 'Notas, feedback por secção e pedidos de correção.' },
]

export default function TeacherEmptyState({ onCreate }) {
  return (
    <div className="tes">
      <div className="tes-hero">
        <span className="tes-hero-icon"><Users2 size={24} /></span>
        <h2 className="tes-hero-title">Cria a tua primeira turma</h2>
        <p className="tes-hero-sub">
          Partilha um código com os teus alunos e acompanha os projetos deles.
        </p>
        <Button icon={<Users2 size={15} />} onClick={onCreate}>Criar turma</Button>
      </div>

      <div className="tes-features">
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} className="tes-feature">
            <span className="tes-feature-icon"><Icon size={18} /></span>
            <div className="tes-feature-title">{title}</div>
            <p className="tes-feature-desc">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
