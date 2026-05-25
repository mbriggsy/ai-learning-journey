import { Routes, Route, useLocation } from 'react-router'
import Landing from './pages/Landing'
import ProjectDetail from './pages/ProjectDetail'
import About from './pages/About'

export default function App() {
  const location = useLocation()
  // Transition seam: the keyed wrapper is the mount point for the cross-fade
  // (the sole justification for the SPA router). No-op in Phase 1 — the
  // route-transition phase drives opacity on this wrapper keyed by pathname.
  return (
    <div data-route-transition key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/project/:name" element={<ProjectDetail />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  )
}
