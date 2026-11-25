import { UsersGroupRoundedIcon } from '@solar-icons/react/bold/users-group-rounded'
import { FolderIcon } from '@solar-icons/react/bold/folder'
import './HomeStats.css'

// ══ HomeStats — prova social entre o hero e "Problemas que resolvemos" ══
// Números reais (SQL confirmado a 25/11: 1805 utilizadores, 955 projetos
// full), apresentados arredondados para baixo com "+", nunca inflados.
// Pedido do Gustavo: o público vem muito de redes sociais e conhecidos
// (colegas, ex-professores), por isso mesmo um número pequeno em termos
// absolutos tem peso social quando é alguém que conhecem a usar.
// 25/11 (2ª ronda): "está demasiado simples, só números não é atrativo",
// trocados os números soltos por um cartão com ícone, mais perto da
// linguagem visual do resto da home (HomeProblems usa o mesmo tipo de
// cartão com borda + fundo).
const STATS = [
  { icon: UsersGroupRoundedIcon, value: '1800+', label: 'pessoas já usam o Showo' },
  { icon: FolderIcon, value: '950+', label: 'projetos partilhados' },
]

export default function HomeStats() {
  return (
    <div className="hs-section">
      <div className="hs-inner">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div className="hs-card" key={label}>
            <div className="hs-icon"><Icon size={22} /></div>
            <div className="hs-text">
              <span className="hs-value">{value}</span>
              <span className="hs-label">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
