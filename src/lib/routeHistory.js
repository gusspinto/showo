/* Guarda os últimos caminhos visitados para páginas como as Definições
   poderem dizer "voltar para X" conforme de onde o utilizador veio, em vez
   de mandarem sempre para a dashboard. Atualizado pelo <RouteHistoryTracker>
   montado no App. */
const stack = []

export function pushRoute(pathname) {
  if (stack[stack.length - 1] === pathname) return
  stack.push(pathname)
  if (stack.length > 12) stack.shift()
}

/* O último caminho diferente de `current`. Passa-se `current` porque a
   página que pergunta pode montar ANTES de o tracker registar a própria
   rota — nesse instante o topo do stack ainda é a página anterior. */
export function previousRoute(current) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] !== current) return stack[i]
  }
  return null
}

/* Traduz um caminho no destino + rótulo do botão "voltar". */
export function resolveBack(path) {
  const fallback = { path: '/dashboard', label: 'Dashboard' }
  if (!path) return fallback
  if (path.startsWith('/projeto/')) return { path, label: 'Voltar ao projeto' }
  if (path.startsWith('/editar/')) return { path, label: 'Voltar ao projeto' }
  if (path === '/biblioteca') return { path, label: 'Voltar à Biblioteca' }
  if (path.startsWith('/u/')) return { path, label: 'Voltar ao perfil' }
  if (path === '/explorar') return { path, label: 'Voltar ao Explorar' }
  if (path.startsWith('/mensagens')) return { path: '/mensagens', label: 'Voltar às Mensagens' }
  if (path.startsWith('/turma')) return { path, label: 'Voltar à turma' }
  if (path === '/pricing') return { path, label: 'Voltar aos Planos' }
  if (path === '/aprende') return { path, label: 'Voltar a Aprende a usar' }
  return fallback
}
