import { Routes, Route, useLocation } from 'react-router'
import Landing from './pages/Landing'
import ProjectDetail from './pages/ProjectDetail'
import About from './pages/About'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'

export default function App() {
  const location = useLocation()
  // ThemeToggle sits OUTSIDE the keyed transition wrapper: position:fixed anchors to the
  // viewport (no transform ancestor → no containing-block trap), and it neither remounts nor
  // cross-fades on navigation. The keyed wrapper is the cross-fade mount point (the sole
  // justification for the SPA router) — opacity driven by pathname in the route-transition phase.
  return (
    <>
      <ThemeToggle />
      <div data-route-transition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/project/:name" element={<ProjectDetail />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  )
}
