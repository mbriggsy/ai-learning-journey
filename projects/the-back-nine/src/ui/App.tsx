import { useEffect, useState } from 'react'
import { engine } from '@store/engineClient'
import { fromWire } from '@engine/engineWire'
import { productionMarket } from '@engine/reference/methodology'
import type { SimulationParams } from '@shared/model'
import { UpdateToast } from './UpdateToast'
import { Disclaimer } from './Disclaimer'
import { copy } from './copy'

/**
 * U0/U1 scaffold shell. Nothing user-facing ships in Phase 1 — this proves the
 * skeleton runs end-to-end: React mounts, the engine worker constructs and answers a
 * Comlink round-trip, the REAL Monte Carlo engine runs in the worker and returns a
 * first-answer reading over a transferred typed-array buffer, and the update toast +
 * R13 disclaimer render. Phase 2 replaces the body with the real first-answer surface.
 */
const SMOKE_PARAMS: SimulationParams = {
  initialPortfolio: 1_000_000,
  annualSpendingReal: 40_000,
  stockWeight: 0.6,
  people: [
    { sex: 'male', currentAge: 65, retirementAge: 65, earnedIncomeReal: 0, socialSecurityReal: 24_000, socialSecurityClaimAge: 67 },
    { sex: 'female', currentAge: 63, retirementAge: 65, earnedIncomeReal: 0, socialSecurityReal: 18_000, socialSecurityClaimAge: 67 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: productionMarket.value,
  paths: 2000,
  maxHorizonYears: 55,
  longevityMode: 'sampled',
}

export function App() {
  const [reading, setReading] = useState('…')

  useEffect(() => {
    let alive = true
    engine
      .run(SMOKE_PARAMS, 0x1234abcd)
      .then((wire) => {
        const r = fromWire(wire)
        if (!alive) return
        setReading(
          r.ok
            ? `${r.result.headline.xOfTen.value} of 10 · ${r.result.headline.outcomeState}`
            : `calm error: ${r.reason}`,
        )
      })
      .catch(() => {
        if (alive) setReading('unavailable')
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <main>
      <h1>{copy.appTitle}</h1>
      <p>{copy.scaffoldSubtitle}</p>
      <p>
        {copy.scaffoldEngineLabel} <strong data-testid="engine-reading">{reading}</strong>
      </p>
      <UpdateToast />
      <Disclaimer />
    </main>
  )
}
