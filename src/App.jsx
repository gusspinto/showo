import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import NewProject from './pages/NewProject'
import ProjectPage from './pages/ProjectPage'
import EditProject from './pages/EditProject'
import Ranking from './pages/Ranking'
import Explore from './pages/Explore'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/novo" element={<NewProject />} />
        <Route path="/projeto/:slug" element={<ProjectPage />} />
        <Route path="/editar/:slug" element={<EditProject />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/explorar" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  )
}
