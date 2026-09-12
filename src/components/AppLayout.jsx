import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useNavbarConfigValue } from '../context/NavbarConfigContext'

/* Layout partilhado por todas as rotas com chrome de app (sidebar +
 * topbar) — a Navbar monta-se UMA vez aqui, não em cada página. Antes,
 * cada página tinha o seu próprio <Navbar/>, o que a desmontava e
 * remontava a cada navegação — e com ela, ~35 pedidos ao Supabase que não
 * têm nada a ver com a página nova (mensagens por ler, notificações,
 * convites, turmas), só porque a Navbar "esquecia" tudo e ia buscar outra
 * vez. As páginas que precisam de personalizar a Navbar (esconder links,
 * botão de recuar, conteúdo extra) usam o hook useNavbarConfig em vez de
 * passar props diretamente — ver context/NavbarConfigContext.jsx. */
export default function AppLayout() {
  const { visible, extra, ...navbarProps } = useNavbarConfigValue()
  return (
    <>
      {visible && <Navbar {...navbarProps}>{extra}</Navbar>}
      <Outlet />
    </>
  )
}
