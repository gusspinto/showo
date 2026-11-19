import { Navbar } from '../components/Navbar'
import './Changelog.css'

// Conteúdo aprovado pelo Gustavo a 19/11, baseado em alterações reais ao
// produto (confirmadas no histórico de commits), não inventado. Datas no
// formato "mês de ano" porque não interessa o dia exato ao visitante, só
// que o produto está a evoluir com regularidade.
const ENTRIES = [
  {
    date: 'Outubro de 2026',
    title: 'Plano anual com Multibanco e MB WAY',
    description: 'O plano anual passou a poder ser pago de uma vez só, com Multibanco ou MB WAY, sem precisares de cartão de crédito.',
  },
  {
    date: 'Outubro de 2026',
    title: 'Identidade visual do projeto',
    description: 'Cada projeto pode agora ter a sua própria identidade: cor do título, tipografia, largura do conteúdo e 3 estilos de cartão diferentes.',
  },
  {
    date: 'Outubro de 2026',
    title: 'Relatório integrado na página do projeto',
    description: 'O gerador de relatório deixou de ser uma ferramenta à parte e passou a viver dentro da própria página do projeto, no mesmo fluxo de trabalho.',
  },
  {
    date: 'Outubro de 2026',
    title: 'Diário de projeto mais completo',
    description: 'O diário ganhou um seletor de projeto (como o Coach IA), um canvas geral, e desfazer/refazer que cobre criar, apagar e escrever texto.',
  },
]

export default function Changelog() {
  return (
    <div className="changelog-root">
      <Navbar />
      <main className="changelog-content">
        <header className="changelog-hero">
          <h1 className="changelog-hero-title">O que mudou no Showo</h1>
          <p className="changelog-hero-desc">Um registo das últimas melhorias reais na plataforma.</p>
        </header>

        <ol className="changelog-list">
          {ENTRIES.map((entry, i) => (
            <li key={i} className="changelog-item">
              <div className="changelog-item-date">{entry.date}</div>
              <div className="changelog-item-body">
                <h2 className="changelog-item-title">{entry.title}</h2>
                <p className="changelog-item-desc">{entry.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
