/**
 * The spend solve (`src/engine/spendSolve.ts`) against an EXHAUSTIVE oracle, on the real seeds,
 * through the real pipeline (`buildSpineParams` → the engine's own `simulate` + `summarize`).
 *
 * The oracle is an independent path (DND 012): it runs EVERY grid spend across the whole range —
 * no pre-scan, no halving — asserts the readings are pass…pass fail…fail, and takes the highest
 * pass. The solver's scan-and-halve must land on exactly that figure, with a run at F passing and a
 * run at F + one step failing. Paths are cut to 500 on BOTH sides (same params, same seed — the
 * answers are compared like for like; only the wall time changes).
 */
import { describe, it, expect } from 'vitest'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams } from '@intake/intakeMap'
import { simulate } from '@engine/simulate'
import { summarize, SPEND_SOLVE_STEP } from '@engine/confidence'
import { solveSpend, SPEND_SOLVE_ROOM_CAP_MULTIPLE } from '@engine/spendSolve'
import type { ScenarioDraft } from '@store/memoryModel'
import type { SimulationParams } from '@shared/model'

const PATHS = 500
const paramsOf = (draft: ScenarioDraft): { params: SimulationParams; seed: number } => {
  const p = buildSpineParams(draft)
  if (p === null || draft.seed === undefined) throw new Error('not a spine draft')
  return { params: { ...p, paths: PATHS }, seed: draft.seed }
}
const atMonthly = (draft: ScenarioDraft, monthly: number): ScenarioDraft => ({
  ...draft,
  annualSpendingReal: monthly * 12,
  spendEntryPeriod: 'month',
})

/** The oracle's pass predicate, written from the spec (the engine's own reading at that spend). */
const passes = (params: SimulationParams, seed: number, monthly: number): boolean => {
  const at = { ...params, annualSpendingReal: monthly * 12 }
  const out = simulate(at, seed, { survivorConditioned: true })
  if (out.infeasible) return false
  const r = summarize(out, at, seed)
  const survivorOk = r.survivorReading === undefined || ['on-track', 'over-funded'].includes(r.survivorReading.outcomeState)
  return r.dollar.direction === 'room' && survivorOk
}

/** Every grid spend in [from, to], in order; asserts monotone; returns the highest pass. */
const exhaustive = (params: SimulationParams, seed: number, from: number, to: number): number | null => {
  let best: number | null = null
  let seenFail = false
  for (let m = from; m <= to; m += SPEND_SOLVE_STEP) {
    const ok = passes(params, seed, m)
    if (!ok) seenFail = true
    else {
      expect(seenFail, `non-monotone at $${m}`).toBe(false)
      best = m
    }
  }
  return best
}

describe('the spend solve vs an exhaustive oracle, on the real seeds', () => {
  it('TRIM — `retired` at $10,000 (off-track): the solver lands on the oracle’s highest passing grid spend, pinned on both sides', async () => {
    const { params, seed } = paramsOf(atMonthly(DEV_SEEDS.retired, 10_000))
    const out = await solveSpend(params, seed)
    const oracle = exhaustive(params, seed, 2_000, 10_000)
    expect(oracle).not.toBeNull()
    expect(out).toMatchObject({ kind: 'sized', direction: 'trim', monthlyReal: oracle, failedAtMonthlyReal: oracle! + SPEND_SOLVE_STEP })
    // the old proxy asked for $2,800; the real answer is far above it (the ~2× over-cut, measured)
    expect(oracle!).toBeGreaterThan(5_000)
  }, 300_000)

  it('ROOM — `retired` at $4,000 (over-funded): the solver lands on the oracle, above the entered spend', async () => {
    const { params, seed } = paramsOf(atMonthly(DEV_SEEDS.retired, 4_000))
    const out = await solveSpend(params, seed)
    const oracle = exhaustive(params, seed, 4_000, 4_000 * SPEND_SOLVE_ROOM_CAP_MULTIPLE)
    expect(oracle).not.toBeNull()
    expect(out).toMatchObject({ kind: 'sized', direction: 'room', monthlyReal: oracle, failedAtMonthlyReal: oracle! + SPEND_SOLVE_STEP })
    expect(oracle!).toBeGreaterThan(4_000)
  }, 300_000)

  it('ROOM — the shipped `surplus` seed: the solved figure is BELOW where the old heuristic sent it ($12,470 read borderline)', async () => {
    const { params, seed } = paramsOf(DEV_SEEDS.surplus)
    const out = await solveSpend(params, seed)
    expect(out.kind).toBe('sized')
    if (out.kind !== 'sized') return
    expect(out.direction).toBe('room')
    expect(out.monthlyReal % SPEND_SOLVE_STEP).toBe(0)
    expect(out.failedAtMonthlyReal).toBe(out.monthlyReal + SPEND_SOLVE_STEP) // adjacent — F is the HIGHEST pass
    expect(out.monthlyReal).toBeLessThan(12_470)
    // both sides of the pin, re-run independently of the solver
    expect(passes(params, seed, out.monthlyReal)).toBe(true)
    expect(passes(params, seed, out.failedAtMonthlyReal)).toBe(false)
  }, 300_000)

  it('no magnitude to size: a borderline plan reads `no-direction`, a budgeted plan is refused before any run', async () => {
    const b = paramsOf(DEV_SEEDS.borderline)
    expect(await solveSpend(b.params, b.seed)).toMatchObject({ kind: 'unsized', reason: 'no-direction' })
    const bud = paramsOf(DEV_SEEDS.budget)
    expect(bud.params.budget).toBeDefined() // the refusal below is not vacuous
    expect(await solveSpend(bud.params, bud.seed)).toEqual({ kind: 'unsized', reason: 'budget-governed', probes: 0 })
  }, 300_000)

  it('BELOW THE GRID (the ultramode review’s F1): a tiny off-track household whose trim bottoms out at $0 is `below-grid`, never sized at $0 (the formatter would throw in render and the error boundary take the app)', async () => {
    // The refuters’ reproduction: `retired` with no Social Security, one $240,000 IRA, $390 a month.
    // The trim ladder floors 390 × 0.25 to $0 on the $100 grid; $0 reads room, $100 does not.
    const tiny: ScenarioDraft = {
      ...atMonthly(DEV_SEEDS.retired, 390),
      people: [
        { ...DEV_SEEDS.retired.people[0], pia: 0 },
        { ...DEV_SEEDS.retired.people[1], pia: 0 },
      ],
      enteredAccounts: [{ ...DEV_SEEDS.retired.enteredAccounts![0]!, valueToday: 240_000 }],
    }
    const t = paramsOf(tiny)
    expect(passes(t.params, t.seed, 390), 'the entered spend is off-track (the trim side) — not vacuous').toBe(false)
    expect(passes(t.params, t.seed, 0), '$0 reads room — the degenerate pass the guard exists for').toBe(true)
    expect(passes(t.params, t.seed, SPEND_SOLVE_STEP), 'one grid step already fails — so lo would be $0').toBe(false)
    expect(await solveSpend(t.params, t.seed)).toMatchObject({ kind: 'unsized', reason: 'below-grid' })
  }, 300_000)

  it('cancels cooperatively: shouldContinue is awaited before every run', async () => {
    const { params, seed } = paramsOf(atMonthly(DEV_SEEDS.retired, 10_000))
    let calls = 0
    const out = await solveSpend(params, seed, { shouldContinue: () => Promise.resolve(++calls < 3) })
    expect(out).toEqual({ kind: 'cancelled' })
    expect(calls).toBe(3)
  }, 300_000)
})
