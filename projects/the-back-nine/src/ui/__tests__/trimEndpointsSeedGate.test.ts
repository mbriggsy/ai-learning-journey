/**
 * The off-track trim clause on the Caddie walk's own worsened frame, through the REAL pipeline —
 * buildSpineParams → runEngine with the app's own options → resolveStickyDisplay → the ONE verdict
 * composer — the gate for Card 3 of the 2026-09-11 walk (the walk's top calm-but-wrong): the
 * `retired` seed's household enters $10,000 a month over its $78,000-a-year baseline
 * (`e2e/caddie-walk.spec.ts` `walkWorsening`), the verdict steps down to a trim, and the hero's
 * clause quotes the $10,000 they entered and NOTHING else — since 2026-09-25 (council
 * wf_8c2ece49-79a, Tier 0) the trim clause is figure-less: the engine's trim magnitude is an unsolved
 * proxy, and on this very frame its old "$2,800 instead of $10,000 — about $7,200 less" target ran
 * over-funded through this pipeline (a ~2× over-cut; Briggsy's cold read took it as "they'd be ok").
 * A real, round-trip-verified spend solve is the register's Tier 1 entry; until it lands, no target
 * or delta may render. (2026-09-17 → 2026-09-25 this gate pinned the three-figure form.)
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

  it('$10,000 a month entered ⇒ off-track trim; the clause quotes ONLY the 10,000 — the unsolved proxy target/delta ride nowhere (council 2026-09-25)', () => {
    // The walk's edit: 10,000 typed into "Household spending, all in" on an "Each month" household.
    const worsened: ScenarioDraft = { ...DEV_SEEDS.retired, annualSpendingReal: 120_000, spendEntryPeriod: 'month' }
    const { wire, displayed, reading } = readingOf(worsened)
    expect(wire.dollar.direction).toBe('trim')
    expect(wire.headline.outcomeState).toBe('off-track')
    expect(wire.dollar.spendPerMonthReal).toBe(10_000)
    // The engine still computes its proxy (−$7,200 here — the "$2,800 instead of $10,000" sentence this
    // gate pinned until 2026-09-25). That target runs OVER-FUNDED through this same pipeline ("room for
    // about $2,820 more"); the on-track floor sits near $6,500 — a ~2× over-cut, and Briggsy's cold read
    // took it as "they'd be ok". So the clause is figure-less: exactly one dollar figure, the spend.
    const figures = figuresIn(reading.clause)
    expect(figures).toEqual([10_000])
    expect(displayed.perMonthDollar).toBeLessThan(0) // the proxy is live on the tuple — so its absence below is not vacuous
    expect(reading.clause).not.toContain(Math.abs(displayed.perMonthDollar).toLocaleString('en-US'))
    expect(reading.clause).toBe(slots.verdictTrimClause('10,000'))
  }, 120_000)
})

describe('the room clause on the shipped `surplus` seed, through the real engine (figure-less, 2026-09-26)', () => {
  it('over-funded ⇒ room; the clause quotes ONLY the entered 5,000 — the heuristic figure rides nowhere', () => {
    // The engine's room heuristic (4 % of the bad-decile terminal ÷ 12) quoted "room for about $7,470
    // more" here; at $12,470 through this same pipeline the engine rates the plan BORDERLINE 8/10 — the
    // figure oversold the household off the verdict it was quoted from. Same law as the trim clause.
    const { wire, displayed, reading } = readingOf(DEV_SEEDS.surplus)
    expect(wire.dollar.direction).toBe('room')
    expect(wire.headline.outcomeState).toBe('over-funded')
    expect(displayed.perMonthDollar).toBeGreaterThan(0) // the heuristic is live on the tuple — its absence is not vacuous
    expect(figuresIn(reading.clause)).toEqual([5_000])
    expect(reading.clause).not.toContain(displayed.perMonthDollar.toLocaleString('en-US'))
    expect(reading.clause).toBe(slots.verdictRoomClause('5,000'))
  }, 120_000)
})
