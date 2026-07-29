import { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'

const POPULAR_SKILLS = [
  // Tecnologia / Informática
  'JavaScript', 'Python', 'React', 'Java', 'SQL', 'HTML', 'CSS', 'Excel',
  'Redes de computadores', 'Cibersegurança', 'Edição de vídeo',
  // Saúde
  'Primeiros socorros', 'Cuidados ao paciente', 'Anatomia', 'Farmacologia',
  'Nutrição', 'Fisioterapia', 'Enfermagem',
  // Comércio, Marketing e Gestão
  'Marketing Digital', 'Vendas', 'Gestão de redes sociais', 'Contabilidade',
  'Atendimento ao cliente', 'Gestão de projetos', 'Negociação', 'Logística',
  'Recursos Humanos', 'Empreendedorismo',
  // Design e Multimédia
  'Design Gráfico', 'Fotografia', 'Ilustração', 'Photoshop', 'Figma',
  'Animação 2D/3D', 'Storytelling',
  // Mecânica, Eletricidade e Construção
  'Eletricidade', 'Eletrónica', 'Mecânica Automóvel', 'AutoCAD', 'Soldadura',
  'Desenho técnico', 'Energias renováveis',
  // Turismo, Restauração e Estética
  'Atendimento a clientes', 'Cozinha', 'Pastelaria', 'Turismo', 'Estética',
  'Organização de eventos', 'Línguas estrangeiras',
  // Educação e Ciências Sociais
  'Ensino', 'Psicologia', 'Educação Social', 'Tradução', 'Redação',
  // Agricultura e Ambiente
  'Agricultura', 'Gestão ambiental', 'Veterinária',
  // Competências transversais
  'Comunicação', 'Trabalho em equipa', 'Liderança', 'Resolução de problemas',
  'Criatividade', 'Organização', 'Adaptabilidade',
]

export default function SkillsPicker({ value = [], onChange, max = 10, label = 'Competências' }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const selected = Array.isArray(value) ? value : []

  const suggestions = input.trim().length > 0
    ? POPULAR_SKILLS.filter(s =>
        s.toLowerCase().includes(input.toLowerCase()) &&
        !selected.includes(s)
      ).slice(0, 6)
    : POPULAR_SKILLS.filter(s => !selected.includes(s)).slice(0, 8)

  function add(skill) {
    const trimmed = skill.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= max) return
    onChange([...selected, trimmed])
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function remove(skill) {
    onChange(selected.filter(s => s !== skill))
  }

  function handleKey(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      add(input)
    }
    if (e.key === 'Backspace' && !input && selected.length > 0) {
      remove(selected[selected.length - 1])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {label}
          <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
            (máx. {max})
          </span>
        </label>
      )}

      {/* Tags area */}
      <div
        onClick={() => { setShowSuggestions(true); inputRef.current?.focus() }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: '8px 10px', minHeight: 44,
          background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
          borderRadius: 10, cursor: 'text',
        }}
      >
        {selected.map(skill => (
          <span
            key={skill}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-subtle)',
              borderRadius: 20, padding: '3px 10px 3px 10px',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {skill}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(skill) }}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', color: 'var(--color-primary)', display: 'flex',
                alignItems: 'center', lineHeight: 1,
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {selected.length < max && (
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={selected.length === 0 ? 'Adiciona competências…' : ''}
            autoComplete="off"
            style={{
              flex: 1, minWidth: 120, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit',
            }}
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0',
        }}>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); add(s) }}
              style={{
                background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
                borderRadius: 20, padding: '4px 12px',
                fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.color = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              <Plus size={10} /> {s}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {selected.length}/{max} · Carrega Enter ou vírgula para adicionar
        </p>
      )}
    </div>
  )
}
