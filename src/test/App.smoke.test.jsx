import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import App from '../App'

// Teste de fumo: garante que a app monta sem rebentar.
// App já inclui o seu próprio Router — não envolver noutro.
// Não substitui testes reais de features — é só a rede mínima
// para o CI apanhar um build partido.
describe('App', () => {
  it('renderiza sem crashar', () => {
    expect(() => render(<App />)).not.toThrow()
  })
})
