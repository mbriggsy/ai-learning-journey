/**
 * roth.ts — the U10 two-arm control-comparison battery.
 *
 * The anchor is the plan's golden invariant: the WITHOUT arm is BYTE-IDENTICAL (same
 * seed) to the plain base run — the two-arm machinery introduces no spurious delta and
 * no engine drift. CRN is proven empirically (equal inputs ⇒ byte-equal readings; the
 * draw schedule is dimension-only, so the arms share every normal path-for-path), and
 * every hand-derivable helper is pinned with hand-derived expectations (DND/012 — the
 * medianDepletionYear cases are arithmetic, never engine-echoed).
 */
import { describe, it, expect } from 'vitest'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { buildArmParams, medianDepletionYear, runTwoArm } from '@engine/roth'
import { validationMarket } from '@engine/reference/methodology'
import {
  NEVER_DEPLETED,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
  type TwoArmOutcome,
} from '@shared/model'

const OWNER: PersonInputs = {
  sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 65,
  earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67,
}
const SPOUSE: PersonInputs = {
  sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 63,
  earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67,
}

const OVERLAY: OverlayParams = {
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  buckets: { taxable: 300_000, pretax: 500_000, roth: 100_000 },
  pretaxByPerson: [350_000, 150_000],
  initialTaxableBasis: 200_000,
  filing: 'mfj',
}

const base = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 900_000,
  annualSpendingReal: 60_000,
  stockWeight: 0.6,
  people: [OWNER, SPOUSE],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: validationMarket.value,
  paths: 2_000,
  maxHorizonYears: 35,
  longevityMode: 'sampled',
  overlay: OVERLAY,
  ...over,
})

const SEED = 0xc0ffee

const twoArm = (o: TwoArmOutcome) => {
  if (o.kind !== 'two-arm') throw new Error(`expected two-arm, got ${o.kind}: ${'reason' in o ? o.reason : ''}`)
  return o
}

/** The direct (non-two-arm) run's compact reading — the byte-identity oracle. */
function directReading(params: SimulationParams, seed: number) {
  const out = simulate(params, seed, { bandFan: true, survivorConditioned: true })
  if (out.indeterminate || out.infeasible) throw new Error('fixture must resolve')
  return summarize(out, params, seed)
}

describe('medianDepletionYear — hand-derived (DND/012: pure arithmetic, never engine-echoed)', () => {
  it('never-depleted paths order PAST every real year (the raw −1 sentinel must not sort worst)', () => {
    // mapped ascending: [3, 5, ∞] → lower median (index 1 of 3) = 5
    expect(medianDepletionYear([NEVER_DEPLETED, 3, 5])).toBe(5)
  })
  it('takes the LOWER median on an even count (earlier depletion — the conservative direction)', () => {
    // mapped ascending: [3, ∞] → index floor((2−1)/2) = 0 → 3
    expect(medianDepletionYear([3, NEVER_DEPLETED])).toBe(3)
  })
  it('returns undefined when the median path never depletes (the secondary is never fabricated)', () => {
    expect(medianDepletionYear([NEVER_DEPLETED, NEVER_DEPLETED, 4])).toBeUndefined()
    expect(medianDepletionYear([NEVER_DEPLETED])).toBeUndefined()
    expect(medianDepletionYear([])).toBeUndefined()
  })
  it('a single depleting path is its own median', () => {
    expect(medianDepletionYear([7])).toBe(7)
  })
})

describe('buildArmParams — the arms differ in EXACTLY the compared control', () => {
  it('conversion: the without-arm strips conversions; the with-arm carries exactly the expanded candidate', () => {
    // The base carries its OWN conversions — both arms must ignore them (the candidate
    // is the comparison, never the base schedule stacked with it).
    const withBase = base({ overlay: { ...OVERLAY, conversions: [9_999] } })
    const plan = { annualAmountReal: 40_000, startYearOffset: 1, years: 2 }
    const without = buildArmParams(withBase, { kind: 'conversion', plan }, 'without')
    const withArm = buildArmParams(withBase, { kind: 'conversion', plan }, 'with')
    expect('conversions' in without.overlay!).toBe(false)
    expect(withArm.overlay!.conversions).toEqual([0, 40_000, 40_000])
    // everything else byte-identical to the base
    expect({ ...without, overlay: undefined }).toEqual({ ...withBase, overlay: undefined })
    expect(without.overlay!.buckets).toEqual(withBase.overlay!.buckets)
  })

  it("sequencing: the without-arm is the 'proportional' baseline (order dropped); the with-arm is the selected policy", () => {
    const withBase = base({ drawdownPolicy: 'taxable-first' })
    const without = buildArmParams(withBase, { kind: 'sequencing', policy: 'taxable-first' }, 'without')
    const withArm = buildArmParams(withBase, { kind: 'sequencing', policy: 'taxable-first' }, 'with')
    expect(without.drawdownPolicy).toBe('proportional')
    expect(withArm.drawdownPolicy).toBe('taxable-first')
    expect('drawdownOrder' in without).toBe(false)
  })

  it("sequencing: a 'custom' selection carries its order on the with-arm ONLY (the biconditional)", () => {
    const spec = { kind: 'sequencing', policy: 'custom', order: ['roth', 'taxable', 'pretax'] } as const
    const without = buildArmParams(base(), spec, 'without')
    const withArm = buildArmParams(base(), spec, 'with')
    expect('drawdownOrder' in without).toBe(false)
    expect(withArm.drawdownPolicy).toBe('custom')
    expect(withArm.drawdownOrder).toEqual(['roth', 'taxable', 'pretax'])
  })
})

describe('the golden anchor — the WITHOUT arm is byte-identical to the plain base run', () => {
  it('conversion control: without ≡ the direct run (headline, fan, survivor reading, raw fraction — all exact)', () => {
    const b = base()
    const direct = directReading(b, SEED)
    const out = twoArm(
      runTwoArm(b, SEED, { kind: 'conversion', plan: { annualAmountReal: 100_000, startYearOffset: 0, years: 5 } }),
    )
    expect(out.without.survivalFraction).toBe(direct.distribution.survivalFraction) // exact, not close
    expect(out.without.headline).toEqual(direct.headline)
    expect(out.without.bandFan).toEqual(direct.distribution.bandFan)
    expect(out.without.survivorReading).toEqual(direct.survivorReading)
  })

  it('presence companion (burned/027): the with-arm genuinely differs — a large conversion moves the readings', () => {
    const out = twoArm(
      runTwoArm(base(), SEED, { kind: 'conversion', plan: { annualAmountReal: 100_000, startYearOffset: 0, years: 5 } }),
    )
    // A 100k×5yr conversion under live tax must move SOMETHING observable — if both arms
    // read identically the comparison machinery is vacuous, not the fixture calm.
    const moved =
      out.rawDelta !== 0 ||
      out.with.medianDepletionYear !== out.without.medianDepletionYear ||
      JSON.stringify(out.with.bandFan) !== JSON.stringify(out.without.bandFan)
    expect(moved).toBe(true)
  })

  it('sequencing control: the with-arm ≡ the direct base run when the base ALREADY uses the selected policy', () => {
    const b = base({ drawdownPolicy: 'taxable-first' })
    const direct = directReading(b, SEED)
    const proportional = directReading({ ...b, drawdownPolicy: 'proportional' }, SEED)
    const out = twoArm(runTwoArm(b, SEED, { kind: 'sequencing', policy: 'taxable-first' }))
    // with-arm = the base's own policy → byte-identical to the direct base run
    expect(out.with.survivalFraction).toBe(direct.distribution.survivalFraction)
    expect(out.with.headline).toEqual(direct.headline)
    // without-arm = the proportional baseline → byte-identical to the direct proportional run
    expect(out.without.survivalFraction).toBe(proportional.distribution.survivalFraction)
    expect(out.without.headline).toEqual(proportional.headline)
  })
})

describe('CRN + determinism — the delta is signal, never luck', () => {
  it('the same call twice returns a DEEP-EQUAL outcome (deterministic in params/seed/control)', () => {
    const control = { kind: 'conversion', plan: { annualAmountReal: 60_000, startYearOffset: 0, years: 3 } } as const
    const a = runTwoArm(base(), SEED, control)
    const b = runTwoArm(base(), SEED, control)
    expect(a).toEqual(b)
  })

  it('a conversion window entirely past the horizon leaves the arms byte-identical — rawDelta EXACTLY 0', () => {
    // Equal inputs ⇒ byte-equal outputs (dimension-only draws): the with-arm's expansion
    // returns undefined, so both arms run the identical conversion-free params. Any
    // nonzero delta here would be sampling luck — the exact thing CRN forecloses.
    const out = twoArm(
      runTwoArm(base(), SEED, { kind: 'conversion', plan: { annualAmountReal: 500_000, startYearOffset: 40, years: 5 } }),
    )
    expect(out.rawDelta).toBe(0)
    expect(out.with.survivalFraction).toBe(out.without.survivalFraction)
    expect(out.with.headline).toEqual(out.without.headline)
  })

  it('the delta responds smoothly to the amount on a cliff-free fixture (no CRN jitter)', () => {
    // No healthcare overlay in the fixture ⇒ no ACA cliff / IRMAA notch — the only cliffs
    // that legitimately break smoothness. Under shared draws the delta as a function of
    // amount must not oscillate: assert the sign never flips back and forth across an
    // ascending sweep (a weaker, honest form of "monotone, no jitter" that a real tax
    // cliff cannot invalidate later — the cliff seed gets its OWN scenario in U10-3).
    const amounts = [20_000, 60_000, 120_000]
    const deltas = amounts.map(
      (annualAmountReal) =>
        twoArm(runTwoArm(base(), SEED, { kind: 'conversion', plan: { annualAmountReal, startYearOffset: 0, years: 5 } }))
          .rawDelta,
    )
    const steps = [deltas[1]! - deltas[0]!, deltas[2]! - deltas[1]!]
    const signFlips = steps.filter((s, i) => i > 0 && Math.sign(s) !== 0 && Math.sign(steps[i - 1]!) !== 0 && Math.sign(s) !== Math.sign(steps[i - 1]!)).length
    expect(signFlips).toBe(0)
    expect(deltas.every((d) => Number.isFinite(d))).toBe(true)
  })
})

describe('the delta basis + arithmetic', () => {
  it("a sampled two-person run carries the survivor surface on BOTH arms — deltaBasis 'survivor', rawDelta exact", () => {
    const out = twoArm(
      runTwoArm(base(), SEED, { kind: 'conversion', plan: { annualAmountReal: 60_000, startYearOffset: 0, years: 3 } }),
    )
    expect(out.deltaBasis).toBe('survivor')
    expect(out.with.survivorFraction).toBeDefined()
    expect(out.without.survivorFraction).toBeDefined()
    expect(out.rawDelta).toBe(out.with.survivorFraction! - out.without.survivorFraction!)
  })

  it("a SINGLE-person household has NO survivor phase on any path — deltaBasis 'joint', delta on the JOINT fractions", () => {
    // Derivation, not hypothesis (insight 025): a survivor phase needs ≥ 2 death offsets AND
    // firstDeath < lastDeath (simulate.ts isSurvivorPhasePath — `deathOffsets.length < 2 ⇒ false`).
    // deathOffsets is `people.map(...)` (exactly one entry per person, simulate.ts:1301/1306), so a
    // people-of-one household has EXACTLY ONE death per path ⇒ buildSurvivorConditioned returns null ⇒
    // survivorConditioned absent ⇒ BOTH arms' survivorFraction is undefined ⇒ survivorBasis is false ⇒
    // the delta falls to the JOINT basis (roth.ts:171). This drives the 'joint' branch through the REAL
    // engine (runTwoArm → simulate); it was previously exercised only over synthetic readings.
    const solo = base({ people: [OWNER], overlay: { ...OVERLAY, pretaxByPerson: [500_000] } })
    const out = twoArm(
      runTwoArm(solo, SEED, { kind: 'conversion', plan: { annualAmountReal: 60_000, startYearOffset: 0, years: 3 } }),
    )
    expect(out.deltaBasis).toBe('joint')
    expect(out.with.survivorFraction).toBeUndefined()
    expect(out.without.survivorFraction).toBeUndefined()
    // The meaningful delta assertion (not just the tag): rawDelta is the JOINT-fraction difference — the
    // 'joint' ternary branch (roth.ts:159), NEVER a survivor pair — and both joint fractions are real
    // probabilities in [0, 1].
    expect(out.rawDelta).toBe(out.with.survivalFraction - out.without.survivalFraction)
    // The subtraction-ORDER pin above is only meaningful if the arms genuinely differ —
    // assert the premise so an equal-arms drift can never make it vacuous.
    expect(out.with.survivalFraction).not.toBe(out.without.survivalFraction)
    for (const f of [out.with.survivalFraction, out.without.survivalFraction]) {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })

  it('medianYearsDelta is present iff BOTH arms have a real median depletion year, and is their difference', () => {
    // A hot spend guarantees a real median depletion on both arms.
    const b = base({ annualSpendingReal: 90_000 })
    const out = twoArm(
      runTwoArm(b, SEED, { kind: 'conversion', plan: { annualAmountReal: 60_000, startYearOffset: 0, years: 3 } }),
    )
    if (out.with.medianDepletionYear !== undefined && out.without.medianDepletionYear !== undefined) {
      expect(out.medianYearsDelta).toBe(out.with.medianDepletionYear - out.without.medianDepletionYear)
    } else {
      expect(out.medianYearsDelta).toBeUndefined()
    }
  })
})

describe('the defined calm closures (R19)', () => {
  it('no overlay (no account buckets) → indeterminate "nothing to convert" — the lever closes calmly', () => {
    const { overlay: _o, ...noOverlay } = base()
    const out = runTwoArm(noOverlay as SimulationParams, SEED, {
      kind: 'conversion',
      plan: { annualAmountReal: 40_000, startYearOffset: 0, years: 5 },
    })
    expect(out.kind).toBe('indeterminate')
    if (out.kind === 'indeterminate') expect(out.reason).toContain('nothing to convert')
  })

  it('a $0 pre-tax pool → indeterminate (the terminal state one level down; same calm close)', () => {
    const b = base({
      initialPortfolio: 400_000,
      overlay: {
        ...OVERLAY,
        buckets: { taxable: 300_000, pretax: 0, roth: 100_000 },
        pretaxByPerson: [0, 0],
      },
    })
    const out = runTwoArm(b, SEED, { kind: 'conversion', plan: { annualAmountReal: 40_000, startYearOffset: 0, years: 5 } })
    expect(out.kind).toBe('indeterminate')
    if (out.kind === 'indeterminate') expect(out.reason).toContain('pre-tax pool is empty')
  })

  it('an arm whose input the R19 gate rejects propagates the DEFINED indeterminate, never a throw', () => {
    const bad = base({ paths: -1 })
    const out = runTwoArm(bad, SEED, { kind: 'conversion', plan: { annualAmountReal: 40_000, startYearOffset: 0, years: 5 } })
    expect(out.kind).toBe('indeterminate')
  })

  it("sequencing with a 'custom' selection + order resolves (the pair is wire-legal end to end)", () => {
    const out = runTwoArm(base(), SEED, {
      kind: 'sequencing',
      policy: 'custom',
      order: ['roth', 'taxable', 'pretax'],
    })
    expect(out.kind).toBe('two-arm')
  })
})

// ---------------------------------------------------------------------------
// P3·U11 — the subsidy-regime what-if arm (the enhanced-ACA toggle's engine half).
// ---------------------------------------------------------------------------
describe('the subsidy-regime control (U11)', () => {
  const flat35 = (v: number) => Array.from({ length: 35 }, () => v)
  // The younger spouse is 64 — ACA prices year 0; the 66-year-old owner is Medicare-enrolled
  // from year 0, so the IRMAA seed is REQUIRED (the engine fails loud without it).
  const HEALTH_OVERLAY: OverlayParams = {
    ...OVERLAY,
    healthcareEnabled: true,
    slcsp: flat35(14_000),
    enrolledPremium: flat35(16_000),
    irmaaMagiSeed: [80_000, 80_000],
  }

  it('buildArmParams: the with-arm carries the toggled regime; the without-arm is the base VERBATIM (the current applied state)', () => {
    const b = base({ overlay: HEALTH_OVERLAY })
    const withArm = buildArmParams(b, { kind: 'subsidy-regime', enhanced: true }, 'with')
    expect(withArm.overlay?.enhancedSubsidies).toBe(true)
    expect(buildArmParams(b, { kind: 'subsidy-regime', enhanced: true }, 'without')).toBe(b)
  })

  it('toggling OFF an applied regime STRIPS the key (never enhancedSubsidies: false — the persisted contract, mirrored on the wire)', () => {
    const applied = base({ overlay: { ...HEALTH_OVERLAY, enhancedSubsidies: true } })
    const withArm = buildArmParams(applied, { kind: 'subsidy-regime', enhanced: false }, 'with')
    expect(withArm.overlay !== undefined && 'enhancedSubsidies' in withArm.overlay).toBe(false)
    // …and nothing else moved: the stripped overlay is the applied one minus exactly that key.
    const { enhancedSubsidies: _r, ...expected } = applied.overlay!
    expect(withArm.overlay).toEqual(expected)
  })

  it('a household the overlay prices no healthcare for gets the DEFINED indeterminate (the regime changes nothing — never a fabricated identical pair)', () => {
    const out = runTwoArm(base(), SEED, { kind: 'subsidy-regime', enhanced: true })
    expect(out.kind).toBe('indeterminate')
    if (out.kind === 'indeterminate') expect(out.reason).toContain('healthcare')
  })

  it('enhanced-vs-reverted resolves as a real two-arm pair: both arms carry the lifetime health-cost median, and the enhanced arm never costs MORE (its applicable-% is lower at every FPL fraction)', () => {
    const out = twoArm(runTwoArm(base({ overlay: HEALTH_OVERLAY }), SEED, { kind: 'subsidy-regime', enhanced: true }))
    expect(out.with.lifetimeHealthCostMedianReal).toBeDefined()
    expect(out.without.lifetimeHealthCostMedianReal).toBeDefined()
    expect(out.with.lifetimeHealthCostMedianReal!).toBeLessThanOrEqual(out.without.lifetimeHealthCostMedianReal!)
    // The presence companion: the priced year paid a REAL premium on both arms.
    expect(out.without.lifetimeHealthCostMedianReal!).toBeGreaterThan(0)
  })

  it('the regime without-arm is BYTE-IDENTICAL to the plain base run (the golden no-spurious-delta invariant holds for the new control kind)', () => {
    const b = base({ overlay: HEALTH_OVERLAY })
    const direct = directReading(b, SEED)
    const out = twoArm(runTwoArm(b, SEED, { kind: 'subsidy-regime', enhanced: true }))
    expect(out.without.headline).toEqual(direct.headline)
    expect(out.without.survivalFraction).toBe(direct.distribution.survivalFraction)
  })
})
