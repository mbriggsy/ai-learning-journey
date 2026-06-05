import { useEffect, useState } from 'react'
import { engine } from '@store/engineClient'
import { UpdateToast } from './UpdateToast'
import { Disclaimer } from './Disclaimer'

/**
 * U0 scaffold shell. Nothing user-facing ships in Phase 1 — this proves the
 * skeleton runs end-to-end: React mounts, the engine worker answers a Comlink
 * round-trip (the `ping` liveness probe), the update toast and the R13 disclaimer
 * render. Phase 2 replaces the body with the real first-answer surface.
 */
export function App() {
  const [enginePing, setEnginePing] = useState('…')

  useEffect(() => {
    let alive = true
    engine
      .ping()
      .then((reply) => {
        if (alive) setEnginePing(reply)
      })
      .catch(() => {
        if (alive) setEnginePing('unavailable')
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <main>
      <h1>The Back Nine</h1>
      <p>Foundation scaffold — Phase 1, Unit 0.</p>
      <p>
        Engine worker: <strong>{enginePing}</strong>
      </p>
      <UpdateToast />
      <Disclaimer />
    </main>
  )
}
