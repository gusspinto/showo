import './HomeStats.css'

// ══ HomeStats — prova social entre o hero e "Problemas que resolvemos" ══
// Números reais (SQL confirmado a 25/11: 1805 utilizadores, 955 projetos
// full), apresentados arredondados para baixo com "+", nunca inflados.
// Pedido do Gustavo: o público vem muito de redes sociais e conhecidos
// (colegas, ex-professores), por isso mesmo um número pequeno em termos
// absolutos tem peso social quando é alguém que conhecem a usar.
export default function HomeStats() {
  const stats = [
    { value: '1800+', label: 'pessoas já usam o Showo' },
    { value: '950+', label: 'projetos partilhados' },
  ]

  return (
    <div className="hs-section">
      <div className="hs-inner">
        {stats.map((s) => (
          <div className="hs-stat" key={s.label}>
            <span className="hs-value">{s.value}</span>
            <span className="hs-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
