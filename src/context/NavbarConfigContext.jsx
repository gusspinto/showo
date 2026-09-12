import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// A Navbar passou a viver num layout partilhado (App.jsx), montada uma vez
// só em vez de em cada página — era isso que disparava os ~35 pedidos dela
// (mensagens por ler, notificações, convites, turmas) sempre que se mudava
// de página, mesmo sem ter passado tempo nenhum. Cada página que precisa de
// personalizar a Navbar (esconder links, mostrar "Criar projeto", um botão
// de recuar no lugar do logo, conteúdo extra ao lado) já não a renderiza
// diretamente — regista a configuração aqui, e o layout lê-a.
const DEFAULT_CONFIG = {
  visible: true, // false esconde a Navbar de todo — ex. ecrãs de loading a solo
  showLinks: true,
  showCreateProject: false,
  previewEditingMobile: false,
  onWorkspaceToggle: undefined,
  hideSidebar: false,
  mobileLeft: null,
  extra: null, // o que antes ia como children de <Navbar>...</Navbar>
}

const NavbarConfigContext = createContext({ config: DEFAULT_CONFIG, setConfig: () => {} })

export function NavbarConfigProvider({ children }) {
  const [config, setConfigRaw] = useState(DEFAULT_CONFIG)
  const setConfig = useCallback(v => setConfigRaw(v), [])
  return (
    <NavbarConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </NavbarConfigContext.Provider>
  )
}

/** Usado pelo layout partilhado para ler a configuração atual. */
export function useNavbarConfigValue() {
  return useContext(NavbarConfigContext).config
}

/** Usado por uma página para personalizar a Navbar enquanto está montada —
 * repõe a predefinição ao desmontar (mudar de página), para a próxima
 * página não herdar configuração de quem já não está no ecrã. `deps`
 * funciona como num useEffect normal: a própria página decide quando
 * `overrides` deve ser reaplicado (ex. [step] quando um botão de recuar
 * muda consoante o passo do formulário). */
export function useNavbarConfig(overrides, deps) {
  const { setConfig } = useContext(NavbarConfigContext)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setConfig({ ...DEFAULT_CONFIG, ...overrides })
    return () => setConfig(DEFAULT_CONFIG)
  }, deps)
}
