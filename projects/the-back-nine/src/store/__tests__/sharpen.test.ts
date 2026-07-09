import { describe, expect, it } from 'vitest'
import {
  createMemoryModel,
  resolveStickyDisplay,
  HEADLINE_STICKY_EPS,
  DOLLAR_STICKY_EPS,
  type ParamsBuilders,
  type ScenarioDraft,
  type StickyDisplay,
} from '../memoryModel'
import type { EngineClient } from '../engineClient'
import { engineApi } from '@engine/engineProtocol'
import { DOLLAR_STEP, SURVIVAL_GRID } from '@engine/confidence'
import { productionMarket } from '@engine/reference/methodology'
import type { DollarAdjustment, Headline, SimulationParams } from '@shared/model'

/**
 * U12 Phase B — the sharpen loop's store core (council wf_dff75c2f-9e3):
 *
 *  1. `resolveStickyDisplay` — the pure hysteresis rule (contract (d) filled; plan
 *     3-controls.md:241). Every hold arm carries its release sibling as the
 *     planted-fail control, and the two margin units are pinned INDEPENDENT
 *     (the model.ts WithMargin failure mode: one figure sticky while the other
 *     flickers in one sentence — here proven each can move without the other).
 *
 *  2. The F9 demotion — THE HAWK'S VETO ARMS: after a verdict has resolved, a
 *     required fact going not-validly-present (cleared to undefined OR zeroed —
 *     the clear-to-0 path the veto proved bypasses an undefined-only guard) must
 *     demote the answer to `inputs-incomplete`, never hold the stale confident
 *     verdict. Written to FAIL against the pre-U12 orchestrator (which held the
 *     last answer on builder-null forever).
 *
 *  3. Coherence: the answer and its sticky `displayed` triple ride ONE commit →
 *     ONE notify (burned/017) — no listener frame ever sees them disagree.
 *
 * The engine seam runs the REAL in-process engineApi (64 paths — the existing
 * memoryModel.test.ts end-to-end convention), so the sticky capture reads real
 * emitted margins, never hand-faked result shapes.
 */

// ---------------------------------------------------------------------------
// fixtures — the pure-rule literals
// ---------------------------------------------------------------------------

const headline = (
  x: number,
  xMargin: number,
  state: Headline['outcomeState'],
  stateMargin: number,
): Headline => ({
  xOfTen: { value: x, marginToEdge: xMargin },
  outcomeState: state,
  stateMarginToEdge: stateMargin,
})

const dollar = (
  perMonth: number,
  direction: DollarAdjustment['direction'],
): DollarAdjustment => ({
  perMonthReal: {
    value: perMonth,
    // The emission's own rule (confidence.ts:195): distance to the ROUNDED display value.
    marginToEdge: Math.abs(perMonth - Math.round(perMonth / DOLLAR_STEP) * DOLLAR_STEP),
  },
  direction,
})

/** A settled prior display to hold against. */
const prev: StickyDisplay = {
  xOfTen: 8,
  outcomeState: 'on-track',
  perMonthDollar: 100,
  direction: 'trim',
}

describe('resolveStickyDisplay — the pure hysteresis rule', () => {
  it('first capture (no baseline) adopts the raw reading wholesale', () => {
    const out = resolveStickyDisplay(null, headline(9, 0, 'on-track', 0), dollar(105.5, 'room'))
    expect(out).toEqual({
      xOfTen: 9,
      outcomeState: 'on-track',
      perMonthDollar: Math.round(105.5 / DOLLAR_STEP) * DOLLAR_STEP,
      direction: 'room',
    })
  })

  it('HOLDS a one-step count flip that lands exactly on the flip edge (margin 0 < EPS)', () => {
    // Quantized survival rose exactly onto the 8→9 edge: raw displays 9, margin 0.
    const out = resolveStickyDisplay(prev, headline(9, 0, 'on-track', 0.05), dollar(100, 'trim'))
    expect(out.xOfTen).toBe(8) // held — the conservative lower count
  })

  it('RELEASES the count one grid cell past the edge (margin === EPS — the planted-fail sibling)', () => {
    expect(HEADLINE_STICKY_EPS).toBe(SURVIVAL_GRID) // the documented 20%-of-half-flip posture
    const out = resolveStickyDisplay(prev, headline(9, SURVIVAL_GRID, 'on-track', 0.05), dollar(100, 'trim'))
    expect(out.xOfTen).toBe(9) // adopted — a real cell past the edge always shows truth
  })

  it('a TWO-step count move adopts even edge-close (a regime change is never held)', () => {
    const out = resolveStickyDisplay(prev, headline(10, 0, 'over-funded', 0), dollar(100, 'trim'))
    expect(out.xOfTen).toBe(10)
    expect(out.outcomeState).toBe('over-funded') // state adopts with it (count moved ≥2)
  })

  it('HOLDS an edge-hugging STATE flip whose count moved ≤1 (the 0.98 edge inside a 9-count cell)', () => {
    // The exact gap stateMarginToEdge exists for: over-funded flips at 0.98, which the
    // x-of-10 lattice does not see — count stays 9-ish while the verdict word would flip.
    const settled: StickyDisplay = { ...prev, xOfTen: 9 }
    const out = resolveStickyDisplay(settled, headline(10, 0.02, 'over-funded', 0), dollar(100, 'trim'))
    expect(out.outcomeState).toBe('on-track') // held
  })

  it('RELEASES the state one grid cell past its edge (the planted-fail sibling)', () => {
    const settled: StickyDisplay = { ...prev, xOfTen: 9 }
    const out = resolveStickyDisplay(
      settled,
      headline(10, 0.02, 'over-funded', SURVIVAL_GRID),
      dollar(100, 'trim'),
    )
    expect(out.outcomeState).toBe('over-funded')
  })

  it('HOLDS a one-step dollar flip that lands inside the edge band, same direction', () => {
    // 105.5 rounds to 110 (one step up from the displayed 100); its distance to the flip
    // edge (105) is 0.5 — inside the $1 EPS.
    expect(DOLLAR_STICKY_EPS).toBe(DOLLAR_STEP / 10)
    const out = resolveStickyDisplay(prev, headline(8, 0.05, 'on-track', 0.05), dollar(105.5, 'trim'))
    expect(out.perMonthDollar).toBe(100) // held
  })

  it('RELEASES the dollar past the edge band (the planted-fail sibling)', () => {
    // 106.5 rounds to 110; edge distance 1.5 ≥ $1 EPS — a confident flip.
    const out = resolveStickyDisplay(prev, headline(8, 0.05, 'on-track', 0.05), dollar(106.5, 'trim'))
    expect(out.perMonthDollar).toBe(110)
  })

  it('a dollar DIRECTION change adopts wholesale — never held across a regime flip', () => {
    // Same edge-hugging value as the hold case, but the direction flipped trim→room.
    const out = resolveStickyDisplay(prev, headline(8, 0.05, 'on-track', 0.05), dollar(105.5, 'room'))
    expect(out.perMonthDollar).toBe(110)
    expect(out.direction).toBe('room')
  })

  it('INDEPENDENCE: the dollar updates while the count + state hold (plan :249, one direction)', () => {
    // Count edge-held (margin 0), state unchanged, dollar moved two confident steps.
    const out = resolveStickyDisplay(prev, headline(9, 0, 'on-track', 0.05), dollar(120, 'trim'))
    expect(out.xOfTen).toBe(8) // held
    expect(out.perMonthDollar).toBe(120) // adopted
  })

  it('INDEPENDENCE: the count updates while the dollar holds (plan :249, the mirror)', () => {
    // Count moved confidently (margin far from any edge), dollar edge-hugging one step.
    const out = resolveStickyDisplay(prev, headline(7, 0.04, 'on-track', 0.05), dollar(105.5, 'trim'))
    expect(out.xOfTen).toBe(7) // adopted
    expect(out.perMonthDollar).toBe(100) // held
  })
})

// ---------------------------------------------------------------------------
// The orchestrator arms — real in-process engine, fake builders
// ---------------------------------------------------------------------------

// A real, gate-valid spine param set (the memoryModel.test.ts smoke shape).
const SPINE_PARAMS: SimulationParams = {
  initialPortfolio: 1_000_000,
  annualSpendingReal: 40_000,
  stockWeight: 0.6,
  people: [
    { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
    { sex: 'female', currentAge: 63, birthYear: 1963, retirementAge: 65, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: productionMarket.value,
  paths: 64,
  maxHorizonYears: 40,
  longevityMode: 'sampled',
}

/** A client that runs the REAL engine in-process and logs the cancel commits. */
function realSpineClient() {
  const epochCommits: number[] = []
  const client: EngineClient = {
    runningInWorker: true,
    engine: {
      ping: async () => 'pong' as const,
      run: async (params, seed, opts) => engineApi.run(params, seed, opts),
      setLatestEpoch: async (epoch) => {
        epochCommits.push(epoch)
      },
      runDateSearch: (input, seed, tier, requestEpoch) =>
        engineApi.runDateSearch(input, seed, tier, requestEpoch),
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    },
  }
  return { client, epochCommits }
}

/** Builders that mirror the widened not-validly-present contract: params ride only
 *  while the draft's spend is validly present (`> 0` — the one NaN-safe clause). */
const wideningBuilders: ParamsBuilders = {
  buildSpineParams: (d: ScenarioDraft) => {
    const s = d.annualSpendingReal
    return s !== undefined && s > 0 ? { ...SPINE_PARAMS, annualSpendingReal: s } : null
  },
  buildDateInput: () => null,
}

const retire = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  people: [
    { ...d.people[0], workStatus: 'retired' },
    { ...d.people[1], workStatus: 'retired' },
  ],
})

describe('the F9 demotion — the hawk veto arms (planted-fail against the pre-U12 hold)', () => {
  it('pre-first-resolve incompleteness stays idle: no dispatch, no worker cancel, no demotion', async () => {
    const { client, epochCommits } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => retire(d)) // statuses answered; spend still absent
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('idle')
    expect(epochCommits).toEqual([]) // nothing minted, nothing cancelled — byte-identical mid-intake
  })

  it('VETO ARM 1 — clearing a required fact to UNDEFINED after a verdict demotes to inputs-incomplete', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('headline')
    expect(model.getSnapshot().displayed).not.toBeNull()

    model.update((d) => ({ ...d, annualSpendingReal: undefined }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')
    expect(model.getSnapshot().displayed).toBeNull() // the sticky baseline is freed with the verdict
  })

  it('VETO ARM 2 — ZEROING the spend demotes identically (the clear-to-0 bypass the veto named)', async () => {
    const { client, epochCommits } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    const before = epochCommits.length

    model.update((d) => ({ ...d, annualSpendingReal: 0 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')
    expect(model.getSnapshot().displayed).toBeNull()
    // The demotion mints an epoch and commits it worker-side, so an older in-flight
    // sweep cancels rather than landing OVER the demotion.
    expect(epochCommits.length).toBe(before + 1)
  })

  it('re-completing the fact returns a verdict with a FRESH sticky capture (never held vs pre-gap)', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    model.update((d) => ({ ...d, annualSpendingReal: 0 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')

    model.update((d) => ({ ...d, annualSpendingReal: 44_000 }))
    await model.recompute('final')
    const snap = model.getSnapshot()
    expect(snap.answer.kind).toBe('headline')
    if (snap.answer.kind !== 'headline') throw new Error('unreachable')
    // Fresh capture: the displayed triple IS the raw rounding of the new reading
    // (a null baseline adopts wholesale — nothing is held against the pre-gap number).
    const h = snap.answer.result.headline
    const d = snap.answer.result.dollar
    expect(snap.displayed).toEqual({
      xOfTen: h.xOfTen.value,
      outcomeState: h.outcomeState,
      perMonthDollar: Math.round(d.perMonthReal.value / DOLLAR_STEP) * DOLLAR_STEP,
      direction: d.direction,
    })
  })

  it('COHERENCE (burned/017): no listener frame ever pairs a spine verdict with a null triple — or the reverse', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    const frames: Array<{ kind: string; hasDisplayed: boolean }> = []
    model.subscribe(() => {
      const s = model.getSnapshot()
      frames.push({ kind: s.answer.kind, hasDisplayed: s.displayed !== null })
    })

    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('provisional')
    await model.recompute('final')
    model.update((d) => ({ ...d, annualSpendingReal: 0 }))
    await model.recompute('final')
    model.update((d) => ({ ...d, annualSpendingReal: 44_000 }))
    await model.recompute('final')

    for (const f of frames) {
      // The invariant both ways: a non-indeterminate spine verdict frame carries the
      // triple; every other kind carries null. (The headline arms here are never
      // indeterminate — SPINE_PARAMS is gate-valid.)
      if (f.kind === 'headline') expect(f.hasDisplayed).toBe(true)
      else expect(f.hasDisplayed).toBe(false)
    }
    expect(frames.some((f) => f.kind === 'inputs-incomplete')).toBe(true) // the demotion was observed
  })

  it('same seed, same draft ⇒ byte-identical displayed triple across recomputes (the no-jitter guarantee)', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    const first = model.getSnapshot().displayed
    await model.recompute('final')
    expect(model.getSnapshot().displayed).toEqual(first)
  })
})
