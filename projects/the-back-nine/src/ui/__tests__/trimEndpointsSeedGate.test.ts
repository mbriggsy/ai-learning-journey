/**
 * The off-track trim clause on the Caddie walk's own worsened frame, through the REAL pipeline —
 * buildSpineParams → runEngine with the app's own options → resolveStickyDisplay → the ONE verdict
 * composer — the gate for Card 3 of the 2026-09-11 walk (the walk's top calm-but-wrong): the
 * `retired` seed's household enters $10,000 a month over its $78,000-a-year baseline
 * (`e2e/caddie-walk.spec.ts` `walkWorsening`), the verdict steps down to a trim, and the hero's
 * clause must quote the target they would live on AND the $10,000 they entered beside the delta —
 * never the delta alone.
 *
 * The delta below is the engine's own output through this file's pipeline (first measured
 * 2026-09-17) at the $10 grain the sentence speaks; the arithmetic pin (spend − target = delta) is
 * the law, the dollar pin the instrument. A market/constants re-verify that moves survival moves
 * the delta — re-run THIS gate, read the engine's number off the failure, and re-pin; never
 * hand-edit a number into agreement (DND 012: derived by the engine's run, never the composer).
 *
 * Lives beside the unit arms (not inside them) so the fast file stays fast: two 2,000-path runs.
 */
import { describe, it, expect } from 'vitest'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { resolveStickyDisplay } from '@store/memoryModel'
import { composeVerdictReading } from '@ui/verdictSentence'
import { slots } from '@ui/copy'
import type { ScenarioDraft } from '@store/memoryModel'

const readingOf = (draft: ScenarioDraft) => {
  const params = buildSpineParams(draft)
  if (params === null) throw new Error('not a spine draft')
  if (draft.seed === undefined) throw new Error('the dev seed carries no engine seed')
  const wire = runEngine(params, draft.seed, { bandFan: true, survivorConditioned: true, healthReadout: true })
  if (wire.kind !== 'resolved') throw new Error(`the run did not resolve: ${wire.kind}`)
  const displayed = resolveStickyDisplay(null, wire.headline, wire.dollar)
  const reading = composeVerdictReading(displayed)
  if (reading === null) throw new Error('indeterminate')
  return { wire, displayed, reading }
}
const figuresIn = (clause: string): number[] =>
  [...clause.matchAll(/\$([\d,]+)/g)].map((m) => Number(m[1]!.replace(/,/g, '')))

describe('the trim clause on the walk’s worsened `retired` frame, through the real engine', () => {
  it('`retired` at its $78,000 baseline is NOT a trim (the worsening below is a real step-down, not the seed’s resting state)', () => {
    const { wire } = readingOf(DEV_SEEDS.retired)
    expect(wire.dollar.direction).not.toBe('trim')
    expect(wire.dollar.spendPerMonthReal).toBe(78_000 / 12)
  }, 120_000)

  it('$10,000 a month entered ⇒ off-track trim; the clause quotes 10,000 and the target, and spend − target = delta to the dollar shown', () => {
    // The walk's edit: 10,000 typed into "Household spending, all in" on an "Each month" household.
    const worsened: ScenarioDraft = { ...DEV_SEEDS.retired, annualSpendingReal: 120_000, spendEntryPeriod: 'month' }
    const { wire, displayed, reading } = readingOf(worsened)
    expect(wire.dollar.direction).toBe('trim')
    expect(wire.headline.outcomeState).toBe('off-track')
    expect(wire.dollar.spendPerMonthReal).toBe(10_000)
    // The engine's own number, read off the run at the $10 grain (see the header) — SIGNED on the
    // sticky triple (negative = trim); the clause speaks its magnitude, the word carries direction.
    // RE-PINNED 2026-09-24 exactly as the header prescribes: the SS-thresholds re-tune moved the
    // `retired` IRA 1.055M → 1.120M (devSeeds.ts), so the same $10,000 edit now needs $7,200 of trim,
    // not the walk's $7,500 (the 2026-09-17 Caddie card quotes the old seed's sentence — a record).
    expect(displayed.perMonthDollar).toBe(-7_200)
    const figures = figuresIn(reading.clause)
    expect(figures).toHaveLength(3) // target · spend · delta — nothing else wears a dollar sign
    const [target, spend, delta] = figures as [number, number, number]
    expect(spend).toBe(10_000)
    expect(delta).toBe(Math.abs(displayed.perMonthDollar))
    expect(spend - target).toBe(delta)
    expect(reading.clause).toBe(slots.verdictTrimClause('2,800', '10,000', '7,200'))
  }, 120_000)
})
