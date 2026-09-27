// @vitest-environment jsdom
/**
 * The room sentence's `within-a-step` form on the shipped `steer` seed, through the REAL pipeline
 * (the register's Tier 0 *The room sentence says there is room to spend more when the spend lane
 * found there is not…*): buildSpineParams → the engine's own run → the spend solve → the ONE gate →
 * the hero AND the assumptions echo, both rendered.
 *
 * `steer` enters $6,500 a month and reads on track with room; the spend lane RUNS both sides of the
 * next $100 step and finds it fails (a refuter's probe, 2026-09-26: $6,550 reads room, $6,600 on the
 * line) — so the solve is `within-a-step`, and the shipped fallback's "There looks to be room to spend
 * more than $6,500 a month" oversold a margin under one step. Every value below is the engine's own
 * (DND 012: never the composer's formula run back at itself).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { solveSpend } from '@engine/spendSolve'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { ConfidenceStatement } from '@ui/ConfidenceStatement'
import { AssumptionPanel } from '@intake/AssumptionPanel'
import { READING_FIXTURES } from '@ui/preview/fixtures'
import { planClockAnchor } from '@ui/bandAnnotations'
import { composeVerdictReading, spendClauseFor, type VerdictDisplay } from '@ui/verdictSentence'
import { slots } from '@ui/copy'
import type { SpendAnswer } from '@store/memoryModel'

afterEach(cleanup)

const steerRun = async () => {
  const d = DEV_SEEDS.steer
  const params = buildSpineParams(d)
  if (params === null || d.seed === undefined) throw new Error('steer: not a spine seed')
  const wire = runEngine(params, d.seed, { bandFan: true, survivorConditioned: true, healthReadout: true })
  if (wire.kind !== 'resolved') throw new Error('steer: the run did not resolve')
  // The store's committed answer carries the engine's SimulationResult — the same run, summarized.
  const out = simulate(params, d.seed, { survivorConditioned: true })
  if (out.infeasible) throw new Error('steer: infeasible')
  const result = summarize(out, params, d.seed)
  const outcome = await solveSpend(params, d.seed)
  if (outcome.kind === 'cancelled') throw new Error('steer: the solve cancelled')
  const spend: SpendAnswer = { kind: 'resolved', outcome }
  const display: VerdictDisplay = {
    outcomeState: wire.headline.outcomeState,
    xOfTen: wire.headline.xOfTen.value,
    spendPerMonthReal: wire.dollar.spendPerMonthReal,
    direction: wire.dollar.direction,
  }
  return { draft: d, wire, result, outcome, spend, display }
}

describe('the room sentence on `steer` — the lane found no room to quote, and the sentence claims none', () => {
  it('the engine: on track with ROOM at the entered $6,500, and the spend solve is `within-a-step` (not vacuous)', async () => {
    const { wire, outcome, display } = await steerRun()
    expect(display.spendPerMonthReal).toBe(6_500)
    expect(display.direction).toBe('room')
    expect(wire.headline.outcomeState).toBe('on-track')
    expect(outcome).toMatchObject({ kind: 'unsized', reason: 'within-a-step' })
  }, 300_000)

  it('the hero AND the echo render the within-a-step form — never "room to spend more", never "doesn’t work out how much more"', async () => {
    const { draft, wire, result, spend, display } = await steerRun()
    expect(result.headline.outcomeState).toBe(wire.headline.outcomeState) // the two views of one run agree
    const clause = composeVerdictReading(display, spendClauseFor(spend, display, wire.headline.outcomeState))!.clause
    expect(clause).toBe(slots.verdictRoomWithinStep('6,500'))

    const hero = render(
      <ConfidenceStatement view={{ kind: 'reading', ...READING_FIXTURES['on-track'], headline: wire.headline, dollar: wire.dollar, spend }} />,
    )
    const magnitude = hero.container.querySelector('.cs-magnitude')!
    expect(magnitude.textContent).toBe(slots.verdictRoomWithinStep('6,500'))
    expect(magnitude.textContent).not.toMatch(/room/i)
    hero.unmount()

    const echo = render(
      <AssumptionPanel
        open
        snapshot={{
          draft,
          answer: { kind: 'headline', result, tier: 'final' },
          displayed: display,
          solve: { kind: 'idle' },
          spend,
          runningInWorker: true,
        }}
        missing={[]}
        savedAnchor={planClockAnchor(2026, 2026)}
        onCommitEdit={vi.fn()}
        onOpenBudget={vi.fn()}
        onOpenSequencing={vi.fn()}
        onOpenRoth={vi.fn()}
        onOpenHealth={vi.fn()}
        onReview={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(document.body.textContent).toContain(slots.verdictRoomWithinStep('6,500'))
    expect(document.body.textContent).not.toContain(slots.verdictRoomClause('6,500'))
    echo.unmount()
  }, 300_000)
})
