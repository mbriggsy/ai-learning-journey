import { describe, expect, it } from 'vitest'
import {
  LATTICE_POINTS,
  buildYTicks,
  composeReadoutLines,
  elapsedYearsWithin,
  isFixedLattice,
  niceLattice,
  resolveBandData,
  type BandLabels,
  type BandSample,
  type BandTooltipRow,
} from '../bandData'
import type { BandFan } from '@shared/model'

/**
 * The fixed-lattice guard (bandData.isFixedLattice) — the fail-loud contract the U7 producer MUST
 * call before handing the band a fan. The band is a PURE renderer (back-nine-design §3 — it draws
 * what it is GIVEN); this guard is the seam that keeps a malformed fan from drawing a
 * silently-wrong, calm-but-wrong band. These prove the guard's LOGIC now — before U7 depends on
 * it — so it can never rot back to untested dead code. Every reject arm carries the planted-PASS
 * control (a well-formed lattice) so it can't pass vacuously.
 */

// A well-formed fan: LATTICE_POINTS samples, monotonic years, ordered non-negative percentiles.
function goodLattice(): BandSample[] {
  const out: BandSample[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const y = (i / (LATTICE_POINTS - 1)) * 30
    const mid = 900_000 - y * 8_000
    const half = 120_000
    out.push({ yearsFromNow: y, p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half })
  }
  return out
}

describe('isFixedLattice — the fail-loud fixed-lattice guard (the U7 producer seam)', () => {
  it('ACCEPTS a well-formed fan (the planted PASS control — proves the rejects below are non-vacuous)', () => {
    expect(isFixedLattice(goodLattice())).toBe(true)
  })

  it('REJECTS a wrong-length fan (off-by-one breaks the constant-point-count morph)', () => {
    expect(isFixedLattice(goodLattice().slice(0, LATTICE_POINTS - 1))).toBe(false) // 48
    expect(isFixedLattice([...goodLattice(), goodLattice()[0]!])).toBe(false) // 50
    expect(isFixedLattice([])).toBe(false)
  })

  it('REJECTS a non-monotonic year lattice (a year that goes backwards folds the polyline)', () => {
    const bad = goodLattice()
    bad[10] = { ...bad[10]!, yearsFromNow: bad[9]!.yearsFromNow - 1 }
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS an INVERTED fan (p90 < p10 — the low edge would draw ABOVE the high edge, a confident lie)', () => {
    const bad = goodLattice()
    bad[5] = { ...bad[5]!, p10: 900_000, p90: 100_000 } // transposed edges
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS a negative percentile (a portfolio value < $0 is never an honest band sample)', () => {
    const bad = goodLattice()
    bad[5] = { ...bad[5]!, p10: -1 }
    expect(isFixedLattice(bad)).toBe(false)
  })

  it('REJECTS a non-finite percentile (Infinity/NaN slip past relational guards — finiteness first)', () => {
    const inf = goodLattice()
    inf[5] = { ...inf[5]!, p90: Number.POSITIVE_INFINITY }
    expect(isFixedLattice(inf)).toBe(false)
    const nan = goodLattice()
    nan[5] = { ...nan[5]!, p50: Number.NaN }
    expect(isFixedLattice(nan)).toBe(false)
  })
})

/**
 * niceLattice — ONE dollar lattice (ceiling AND step from one nice STEP), Caddie Card 10 (the
 * four-faces walk 2026-09-11). The old two-step derivation (niceCeil's {1, 1.5, 2, 3, 4, 5, 6, 8,
 * 10} rung, then QUARTERS of it) quartered the {1.5, 3, 6} family into a non-nice 0.75-family step,
 * and at the 1.5M rung into THREE-decimal millions — "$0.375M / $1.125M" on an ordinary couple,
 * read as "a machine tick, not a humane rung".
 *
 * EVERY expectation below is HAND-DERIVED from the rule (DND 012), never read off the function.
 * The derivation, once, for the whole block:
 *   k = ⌊log10(max / 4)⌋; candidate steps are m × 10^e for m ∈ {1, 2, 2.5, 5}, e ∈ {k−1, k, k+1};
 *   each candidate's n is the fewest whole steps covering max (n = ⌈max/step⌉ in exact arithmetic);
 *   keep the smallest |n − 4|, then the smaller headroom (ceiling − max). A third key (the larger
 *   step) sits below those two but is MEASURED-UNREACHABLE — determinism insurance, not an
 *   operative rung; the arithmetic for that is in bandData.ts at the line itself.
 * Each case's own comment does that arithmetic for its own max.
 */
describe('niceLattice — the nice-STEP dollar lattice (Card 10)', () => {
  it.each([
    // 1,002,260 (the LIVE borderline seed's fan max p90 — the filed defect's own household):
    // max/4 = 250,565 → k = 5. 250k → n = ⌈4.009⌉ = 5, ceiling 1.25M, headroom 247,740;
    // 500k → n = 3, ceiling 1.5M, headroom 497,740. Both |n−4| = 1 → the smaller headroom wins.
    [1_002_260, 1_250_000, 250_000, 5],
    // 1,500,000: k = ⌊log10 375,000⌋ = 5. 500k → n = 3 (|1|), ceiling 1.5M, headroom 0; 250k → n = 6
    // (|2|); 1M → n = 2 (|2|). No nice step gives 4 or 5 here (that would need 375k or 300k).
    [1_500_000, 1_500_000, 500_000, 3],
    // 2,000,000 (the retired/order/state seeds' class): k = ⌊log10 500,000⌋ = 5. 500k → n = 4, |0| —
    // an exact hit, no tie-break needed.
    [2_000_000, 2_000_000, 500_000, 4],
    // 2,900,000 (the steer seed's class): k = ⌊log10 725,000⌋ = 5. 1M → n = 3 (|1|), ceiling 3M;
    // 500k → n = 6 (|2|); 2.5M → n = 2 (|2|). Nothing lands on 4 or 5 (725k is not nice).
    [2_900_000, 3_000_000, 1_000_000, 3],
    // 590,000: k = ⌊log10 147,500⌋ = 5. 200k → n = 3, ceiling 600k, headroom 10,000; 250k → n = 3,
    // ceiling 750k, headroom 160,000; 100k → n = 6 (|2|). Tie on |n−4| = 1 → smaller headroom.
    [590_000, 600_000, 200_000, 3],
    // 11,763,143 (the LIVE health seed): k = ⌊log10 2,940,786⌋ = 6. 2.5M → n = ⌈4.705⌉ = 5, ceiling
    // 12.5M, headroom 736,857; 5M → n = 3, ceiling 15M, headroom 3,236,857. Tie |1| → headroom.
    [11_763_143, 12_500_000, 2_500_000, 5],
    // 13,898,842 (the LIVE surplus seed): k = ⌊log10 3,474,710⌋ = 6. 5M → n = 3 (|1|), ceiling 15M;
    // 2.5M → n = ⌈5.56⌉ = 6 (|2|); 10M → n = 2 (|2|). Nothing gives 4 or 5 (3.5M is not nice).
    [13_898_842, 15_000_000, 5_000_000, 3],
    // 87,000: k = ⌊log10 21,750⌋ = 4. 25k → n = ⌈3.48⌉ = 4, |0| — an exact hit.
    [87_000, 100_000, 25_000, 4],
    // 123 (the sub-$1k floor case — below anything the product plots, kept as a decade-robustness
    // pin): k = ⌊log10 30.75⌋ = 1. 25 → n = ⌈4.92⌉ = 5, ceiling 125, headroom 2; 50 → n = 3,
    // ceiling 150, headroom 27. Tie |1| → headroom.
    [123, 125, 25, 5],
    // 60,000 (the LIVE failing seed): k = ⌊log10 15,000⌋ = 4. 20k → n = 3, ceiling 60,000, headroom 0
    // (|1|); 25k → n = 3, ceiling 75,000 (|1|, headroom 15,000); 10k → n = 6 (|2|). Headroom breaks it.
    [60_000, 60_000, 20_000, 3],
  ])('niceLattice(%d) = { ceiling: %d, step: %d, intervals: %d }', (max, ceiling, step, intervals) => {
    expect(niceLattice(max)).toEqual({ ceiling, step, intervals })
  })

  it('TIE-BREAK 1 — equal distance from 4 intervals goes to the SMALLER headroom (less dead sky above the data)', () => {
    // 1,200,000: k = ⌊log10 300,000⌋ = 5. 250k → n = ⌈4.8⌉ = 5, ceiling 1.25M, headroom 50,000;
    // 500k → n = 3, ceiling 1.5M, headroom 300,000. Both are 1 away from TARGET; 1.25M is tighter.
    expect(niceLattice(1_200_000)).toEqual({ ceiling: 1_250_000, step: 250_000, intervals: 5 })
  })

  it('TIE-BREAK 0 — DISTANCE from 4 outranks headroom: a tighter ceiling loses to a 4-interval one', () => {
    // 7,000,000: k = ⌊log10 1,750,000⌋ = 6. 2M → n = ⌈3.5⌉ = 4, |0|, ceiling 8M (headroom 1M);
    // 2.5M → n = 3, |1|, ceiling 7.5M (headroom 500,000 — TIGHTER, and still loses on distance).
    expect(niceLattice(7_000_000)).toEqual({ ceiling: 8_000_000, step: 2_000_000, intervals: 4 })
  })

  it('TIE-BREAK 2 is unreachable — a ZERO-headroom candidate at the target interval count wins outright, the headroom key deciding before the step key can run', () => {
    // 800,000 (the TwoFutures witness household): k = ⌊log10 200,000⌋ = 5. 200k → n = 4, |0|,
    // ceiling 800,000, headroom 0; 250k → n = ⌈3.2⌉ = 4, |0|, ceiling 1M, headroom 200,000. The
    // HEADROOM decides this pair, so what is pinned here is the reachable END of the chain, not
    // the third key: a zero-headroom candidate at the target interval count always wins outright.
    // The third key (the larger step) is measured-unreachable determinism insurance — the ratio
    // argument for why no two distinct candidates can reach it lives at its own line in
    // bandData.ts (and it is NOT "equal headroom at equal n ⇒ equal step": the |n − 4| tier admits
    // n and 8 − n, so a tie can hold two DIFFERENT counts).
    expect(niceLattice(800_000)).toEqual({ ceiling: 800_000, step: 200_000, intervals: 4 })
  })

  it('DEGENERATE input → { 0, 0, 0 } (the all-$0 fan: a $0-portfolio household has no dollar scale)', () => {
    for (const bad of [0, Number.NaN, -1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(niceLattice(bad), `${bad}`).toEqual({ ceiling: 0, step: 0, intervals: 0 })
    }
  })

  // The two DOUBLE CORNERS the PROPERTIES docblock names (insight 044: a "can never happen" clause
  // is a claim about a gate, not a fact). Both are unreachable from a portfolio fan and both fail
  // LOUD — pinned here so the docblock's sentences are gated rather than merely asserted.
  it('THE UNDERFLOW CORNER: a max in the first subnormal ulps returns { 0, 0, 0 } — a ceiling BELOW a positive max', () => {
    // Derived from the code path, not read off a run: Number.MIN_VALUE (5e-324) is the smallest
    // positive double, so `max / TARGET` has no representable result and underflows to 0.
    // Math.log10(0) is −Infinity ⇒ k is −Infinity ⇒ every candidate exponent is, so every
    // `m × 10 ** e` is exactly 0 and the `step > 0` filter skips all twelve candidates. `best` is
    // never assigned, and the `best ??` fallback returns the degenerate lattice — the one case the
    // retired caller-side `Math.max` backstop would have caught. It fails loud instead.
    const dollars = (d: number): string => `$${d}`
    expect(niceLattice(Number.MIN_VALUE)).toEqual({ ceiling: 0, step: 0, intervals: 0 })
    expect(() => buildYTicks(niceLattice(Number.MIN_VALUE), dollars)).toThrow(/no drawable gridlines/)
  })

  it('THE OVERFLOW CORNER: Number.MAX_VALUE yields a NON-FINITE ceiling from a finite max — a drawability failure, not a broken property', () => {
    // Derived from the code path: max/4 ≈ 4.49e307 ⇒ k = 307, so the candidate exponents are
    // {306, 307, 308}. At e = 307 the m = 5 candidate (step 5e307) covers MAX_VALUE (≈1.798e308)
    // in n = 4 whole steps — an exact TARGET hit, so it wins on distance outright: every finer
    // candidate needs 8 or more steps (2.5e307 → 8, 2e307 → 9, 1e307 → 18, e = 306 → 36+), and at
    // e = 308 only m = 1 survives the finite-STEP filter, at n = 2. But the winner's `n × step` is
    // 2e308, past the double range, so a FINITE max produces an INFINITE ceiling (finite inputs,
    // an infinite intermediate). Neither repair loop fires (Infinity is not < max; 3 × 5e307 is
    // not ≥ max), and all three PROPERTIES survive — which is exactly why the drawability guard
    // lives in buildYTicks instead of resting on them.
    const dollars = (d: number): string => `$${d}`
    const l = niceLattice(Number.MAX_VALUE)
    expect(Number.isFinite(l.ceiling)).toBe(false)
    expect(l.intervals).toBe(4)
    expect(l.ceiling).toBeGreaterThanOrEqual(Number.MAX_VALUE) // the ≥ law holds; the axis is still undrawable
    expect(l.ceiling).toBe(l.intervals * l.step)
    expect(() => buildYTicks(l, dollars)).toThrow(/no drawable gridlines/)
  })

  it('the CEILING is the product the repair loops checked — ceiling === intervals × step, and ≥ max', () => {
    // The old derivation inferred the ceiling from `(x/mag)*mag`, which need not round-trip, so
    // resolveBandData carried a Math.max backstop. The rule now CHECKS the product, so both hold
    // by construction — pinned across three decades (each expected pair hand-derived as above).
    for (const [max, ceiling, step, intervals] of [
      [1_002_260, 1_250_000, 250_000, 5],
      [11_763_143, 12_500_000, 2_500_000, 5],
      [60_000, 60_000, 20_000, 3],
    ] as const) {
      const l = niceLattice(max)
      expect(l.ceiling).toBe(ceiling)
      expect(l.ceiling).toBe(l.intervals * l.step) // strict: no float dust between the two
      expect(l.ceiling).toBeGreaterThanOrEqual(max)
      expect(l.step).toBe(step)
      expect(l.intervals).toBe(intervals)
    }
  })

  it('never leaves a WHOLE interval of headroom above the data: (intervals − 1) × step < max', () => {
    // Hand-derived pairs again: the last gridline BELOW the ceiling must sit under the data's top.
    // 1,002,260 → 4 × 250,000 = 1,000,000 < 1,002,260 (2,260 to spare — the tightest of the set).
    for (const [max, below] of [
      [1_002_260, 1_000_000],
      [11_763_143, 10_000_000],
      [590_000, 400_000],
      [2_900_000, 2_000_000],
    ] as const) {
      const l = niceLattice(max)
      expect((l.intervals - 1) * l.step).toBe(below)
      expect(below).toBeLessThan(max)
    }
  })

  it('THE DEFECT, KILLED: no three-decimal million label anywhere the product plots', () => {
    // The old ladder quartered the {1.5, 3, 6} rung family into a 0.75-family step ($1.5M →
    // $0.375M, $3M → $0.75M, $6M → $1.5M) — the "two ladders on one product" tell. Only the
    // 1.5 × 10^6 rung crossed into a THREE-decimal million ("$0.375M" / "$1.125M"); under the OLD
    // rule that ceiling covered maxima 1,001,000–1,500,000, which is inside this $1k-step sweep, so
    // the arm is NOT vacuous. The 3M, 6M and 15M ceilings quartered to two decimals or fewer.
    const fmt = (d: number): string => (d === 0 ? '$0' : `$${d / 1_000_000}M`)
    for (let max = 1_000_000; max <= 12_000_000; max += 1_000) {
      for (const t of buildYTicks(niceLattice(max), fmt)) {
        expect(t.label, `max ${max}: ${t.label}`).not.toMatch(/\$\d\.\d{3}M/)
      }
    }
  })
})

describe('buildYTicks — the gridline ladder over one lattice', () => {
  const fmt = (d: number): string => `$${d}`

  it('draws intervals + 1 lines from $0, each a whole multiple of the step, the last one the ceiling ITSELF', () => {
    // Hand-derived: the 2.5M lattice (step 500,000, 5 intervals) → 6 lines. (Deliberately NOT the
    // 1.25M lattice: its third gridline is the IRMAA MFJ top-tier figure, which the constants gate
    // forbids inlining anywhere outside @engine/constants — the 1.25M ladder is pinned by its
    // LABELS in money.test.ts instead, where no raw dollar literal is needed.)
    const ticks = buildYTicks({ ceiling: 2_500_000, step: 500_000, intervals: 5 }, fmt)
    expect(ticks.map((t) => t.dollars)).toEqual([0, 500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000])
    expect(ticks.map((t) => t.label)).toEqual(['$0', '$500000', '$1000000', '$1500000', '$2000000', '$2500000'])
  })

  it('the TICK COUNT follows the lattice — 4, 5 or 6 lines, never always five', () => {
    // Hand-derived from the rule: 590,000 → 3 intervals (4 lines); 2,000,000 → 4 (5 lines);
    // 1,002,260 → 5 (6 lines). Nothing in the renderers may assume a fixed count.
    expect(buildYTicks(niceLattice(590_000), fmt)).toHaveLength(4)
    expect(buildYTicks(niceLattice(2_000_000), fmt)).toHaveLength(5)
    expect(buildYTicks(niceLattice(1_002_260), fmt)).toHaveLength(6)
  })

  it('the top line is BYTE-EQUAL to the lattice ceiling (never intervals × step recomputed)', () => {
    // 0.25 × 4 is exact, but a lattice whose step is not a dyadic multiple would drift — the top
    // tick reads the ceiling FIELD, so the drawn top line and the y-scale can never disagree.
    const l = niceLattice(11_763_143)
    expect(buildYTicks(l, fmt).at(-1)!.dollars).toBe(l.ceiling)
  })

  it('THROWS on a degenerate lattice — a lone "$0" line on a zero-height axis, or a NaN/infinity ladder, is a calm lie about an unscalable household', () => {
    expect(() => buildYTicks({ ceiling: 0, step: 0, intervals: 0 }, fmt)).toThrow(/no drawable gridlines/)
    expect(() => buildYTicks(niceLattice(0), fmt)).toThrow(/no drawable gridlines/)
    expect(() => buildYTicks({ ceiling: Number.NaN, step: 1, intervals: 4 }, fmt)).toThrow(/no drawable gridlines/)
    expect(() => buildYTicks({ ceiling: 1, step: Number.POSITIVE_INFINITY, intervals: 4 }, fmt)).toThrow(/no drawable gridlines/)
    // The planted PASS control — a well-formed lattice still builds (the throws above are not vacuous).
    expect(buildYTicks({ ceiling: 4, step: 1, intervals: 4 }, fmt)).toHaveLength(5)
  })
})

/**
 * resolveBandData — the producer seam (the deferred U6-review obligation, now wired). Resamples the
 * engine's per-year fan onto the fixed lattice, computes the dollarMax ≥ max(p90) scale guard, and
 * THROWS on a malformed fan before the band can draw it. A LINEAR fan makes every resampled lattice
 * value hand-verifiable (linear interpolation of a linear function is exact at every point).
 */

// A linear fan over yearsFromNow 0..4: p50 = 1000 − 100·y; edges ±25/±50; cohort thins 1.0 → 0.6.
function linearFan(): BandFan {
  const byYear = [0, 1, 2, 3, 4].map((y) => {
    const p50 = 1000 - 100 * y
    return { yearsFromNow: y, p10: p50 - 50, p25: p50 - 25, p50, p75: p50 + 25, p90: p50 + 50, cohortFraction: 1 - 0.1 * y }
  })
  return { byYear }
}

const fmt = (d: number) => `$${Math.round(d)}`

// U17 §S2 — the plan clock's ONE numeric domain gate + its carry onto the resolved data (the
// elapsed-segment demotion's producer seam; ui's planClockWithin DELEGATES here).
describe('elapsedYearsWithin — the plan-clock drawable-domain gate (U17 §S0.2/§S2)', () => {
  it('the fresh identity: 0, negatives, and the NON-INTEGER negative all clamp to 0 (the pinned low-end arm)', () => {
    expect(elapsedYearsWithin(0, 30)).toBe(0)
    expect(elapsedYearsWithin(-3, 30)).toBe(0)
    // The S0 lesson (insight 029): only a non-integer negative can WITNESS the clamp — a negative
    // integer is nulled downstream by the yearsSinceBuilt > 0 gate and passes vacuously.
    expect(elapsedYearsWithin(-2.5, 30)).toBe(0)
  })

  it('an in-domain positive integer passes through', () => {
    expect(elapsedYearsWithin(2, 30)).toBe(2)
    expect(elapsedYearsWithin(29, 30)).toBe(29)
  })

  it('a clock AT or PAST the horizon REFUSES ALOUD — a skewed clock never redraws', () => {
    expect(() => elapsedYearsWithin(30, 30)).toThrow(/drawable domain/)
    expect(() => elapsedYearsWithin(31, 30)).toThrow(/drawable domain/)
  })

  it('a garbled positive claim (NaN, +∞, a fractional year) REFUSES — never a quiet zero (insight 008/010)', () => {
    expect(() => elapsedYearsWithin(Number.NaN, 30)).toThrow(/drawable domain/)
    expect(() => elapsedYearsWithin(Number.POSITIVE_INFINITY, 30)).toThrow(/drawable domain/)
    expect(() => elapsedYearsWithin(2.5, 30)).toThrow(/drawable domain/)
  })
})

describe('resolveBandData — the elapsedYears carry (U17 §S2)', () => {
  it('defaults to 0 (byte-identical fresh sessions) and carries an in-domain clock through', () => {
    expect(resolveBandData(linearFan(), 'on-track', { formatDollar: fmt }).elapsedYears).toBe(0)
    expect(
      resolveBandData(linearFan(), 'on-track', { formatDollar: fmt, elapsedYears: 2 }).elapsedYears,
    ).toBe(2)
  })

  it('refuses a clock at/past the fan horizon at the producer seam (fail loud, never a silent redraw)', () => {
    expect(() =>
      resolveBandData(linearFan(), 'on-track', { formatDollar: fmt, elapsedYears: 4 }),
    ).toThrow(/drawable domain/) // the linearFan horizon is 4
  })
})

describe('resolveBandData — the producer seam (resample + dollarMax guard + fail-loud)', () => {
  it('produces a well-formed fixed lattice over the fan horizon (the anchor + last year preserved)', () => {
    const r = resolveBandData(linearFan(), 'borderline', { formatDollar: fmt })
    expect(r.kind).toBe('resolved')
    expect(r.outcomeState).toBe('borderline')
    expect(r.samples).toHaveLength(LATTICE_POINTS)
    expect(isFixedLattice(r.samples)).toBe(true)
    expect(r.horizonYears).toBe(4) // the fan's last living-cohort year

    // The anchor (today) and the last lattice point reproduce the fan's endpoints exactly.
    expect(r.samples[0]).toMatchObject({ yearsFromNow: 0, p10: 950, p25: 975, p50: 1000, p75: 1025, p90: 1050 })
    const last = r.samples[LATTICE_POINTS - 1]!
    expect(last.yearsFromNow).toBeCloseTo(4, 10)
    expect(last.p50).toBeCloseTo(600, 8)
    expect(last.p90).toBeCloseTo(650, 8)
  })

  it('resamples by EXACT linear interpolation at every lattice point (p50 = 1000 − 100·yearsFromNow)', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    for (const s of r.samples) {
      expect(s.p50).toBeCloseTo(1000 - 100 * s.yearsFromNow, 8)
      // The cohort fraction rides the same linear interpolation (1 − 0.1·y).
      expect(s.cohortFraction).toBeCloseTo(1 - 0.1 * s.yearsFromNow, 8)
    }
    // Spot points that land on exact household-clock years.
    expect(r.samples[12]!.p50).toBeCloseTo(900, 8) // x = 1
    expect(r.samples[24]!.p50).toBeCloseTo(800, 8) // x = 2
  })

  // Card 5 (the four-faces Caddie walk, 2026-09-11) — the median's GRID-exact first-$0 plan-year,
  // the screen-reader ruin sentence's anchor (bandPanelChrome.composeBandAtRange). Read off the
  // integer grid through the injected formatter, never the resampled lattice (whose first $0
  // column can sit up to one column LATER than the grid year — the optimistic direction).
  it('medianGoneYear is null when the median never touches the $0 floor (the linear fan ends at 600)', () => {
    expect(resolveBandData(linearFan(), 'on-track', { formatDollar: fmt }).medianGoneYear).toBeNull()
  })

  it('medianGoneYear is the FIRST integer grid year whose median FORMATS to $0 — lerp-dust reads as the floor through the injected formatter', () => {
    const p = (p50: number, y: number) => ({ yearsFromNow: y, p10: 0, p25: 0, p50, p75: p50 + 10, p90: p50 + 20, cohortFraction: 1 })
    const fan: BandFan = { byYear: [p(1000, 0), p(600, 1), p(0.3, 2), p(0, 3), p(0, 4)] }
    expect(
      resolveBandData(fan, 'already-failing', { formatDollar: fmt }).medianGoneYear,
      'year 2 formats to "$0" (0.3 rounds down) — the grid year, never a lattice column',
    ).toBe(2)
    // The field is the DISPLAYED figure's year: a formatter that keeps the dust visible moves it to the true zero.
    expect(resolveBandData(fan, 'already-failing', { formatDollar: (d) => `$${d}` }).medianGoneYear).toBe(3)
  })

  it('dollarMax is a humane ceiling ≥ max(p90) (the asymmetric scale guard) with sane headroom', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    const maxP90 = Math.max(...r.samples.map((s) => s.p90)) // 1050 (at the anchor)
    expect(r.dollarMax).toBeGreaterThanOrEqual(maxP90)
    expect(r.dollarMax).toBeLessThanOrEqual(maxP90 * 2) // not absurd headroom
    expect(r.dollarMax).toBeGreaterThan(0) // a non-degenerate fan ⇒ a positive ceiling (the all-$0 fan is its own throw-test below)
  })

  it('y-ticks anchor at $0 (the ruin floor) and top out at dollarMax, labelled via the caller formatter', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    expect(r.yTicks[0]).toEqual({ dollars: 0, label: '$0' })
    expect(r.yTicks[r.yTicks.length - 1]!.dollars).toBe(r.dollarMax)
    expect(r.yTicks.every((t) => t.label === `$${Math.round(t.dollars)}`)).toBe(true)
  })

  it('passes household-clock annotations + callouts through verbatim', () => {
    const annotations = [{ id: 'death', yearsFromNow: 3, label: 'Survivor years', ages: '~88 / 86', description: 'one outlives the other' }]
    const callouts = [{ id: 'likely', yearsFromNow: 2, dollars: 800, text: 'most likely' }]
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt, annotations, callouts })
    expect(r.annotations).toEqual(annotations)
    expect(r.callouts).toEqual(callouts)
  })

  it('PLANTED FAIL: an inverted fan (p10 > p90) makes the producer THROW — never a silently-wrong band', () => {
    // Transpose one year's edges: the low edge would draw ABOVE the high edge (a confident lie).
    const base = linearFan()
    const bad: BandFan = {
      byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, p10: 900, p90: 100 } : y)),
    }
    expect(() => resolveBandData(bad, 'off-track', { formatDollar: fmt })).toThrow(/malformed lattice/)
  })

  it('THROWS on a degenerate fan with no year beyond the anchor (nothing to draw)', () => {
    const anchorOnly: BandFan = { byYear: [{ yearsFromNow: 0, p10: 1000, p25: 1000, p50: 1000, p75: 1000, p90: 1000, cohortFraction: 1 }] }
    expect(() => resolveBandData(anchorOnly, 'indeterminate', { formatDollar: fmt })).toThrow(/today anchor \+ one year/)
  })

  it('THROWS at the seam on an all-$0 fan ($0-portfolio household) — no honest dollar scale, NOT "malformed"', () => {
    // initialPortfolio === 0 is a VALID decumulation run (an income-funded $0-portfolio household); its
    // fan is all-$0 → maxP90 = 0 → dollarMax = 0. The lattice is well-formed (0 ≤ 0 ≤ … is ordered), so
    // this is caught by the dollarMax seam guard, NOT the malformed-lattice guard — and at the SEAM, not
    // deferred to yForDollars mid-render (which would throw a generic geometry error on a real household).
    const zero = (y: number) => ({ yearsFromNow: y, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 })
    const allZero: BandFan = { byYear: [0, 1, 2, 3, 4].map(zero) }
    expect(() => resolveBandData(allZero, 'over-funded', { formatDollar: fmt })).toThrow(/no positive dollar scale/)
  })

  it('THROWS at the seam on an out-of-[0,1] cohortFraction (the honesty signal would draw false certainty)', () => {
    const base = linearFan()
    const nan: BandFan = { byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, cohortFraction: Number.NaN } : y)) }
    expect(() => resolveBandData(nan, 'on-track', { formatDollar: fmt })).toThrow(/cohortFraction/)
    const tooBig: BandFan = { byYear: base.byYear.map((y, i) => (i === 2 ? { ...y, cohortFraction: 1.5 } : y)) }
    expect(() => resolveBandData(tooBig, 'on-track', { formatDollar: fmt })).toThrow(/cohortFraction/)
  })
})

/**
 * The hover/scrub tooltipRows — emitted in the SAME resample loop as the drawn samples, so a readout
 * figure can NEVER drift from the vertex it annotates (the honesty contract: the number equals the
 * pixel). Pre-formatted through the injected formatters (string-free viz), ages '' when no closure.
 */
describe('resolveBandData — the hover/scrub tooltipRows (lattice-aligned, drift-proof)', () => {
  it('emits exactly one row per lattice sample (index-parallel to samples)', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    expect(r.tooltipRows).toHaveLength(LATTICE_POINTS)
    expect(r.tooltipRows).toHaveLength(r.samples.length)
  })

  it('each row’s dollars are the SAME formatter on the SAME vertex — byte-equal to the drawn fan (no drift)', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    r.tooltipRows.forEach((row, i) => {
      const s = r.samples[i]!
      expect(row.low).toBe(fmt(s.p10))
      expect(row.median).toBe(fmt(s.p50))
      expect(row.high).toBe(fmt(s.p90))
    })
  })

  it('ages ride the injected formatAges closure, called once per lattice year', () => {
    const seen: number[] = []
    const formatAges = (y: number) => {
      seen.push(y)
      return `A${Math.round(y)}`
    }
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt, formatAges })
    expect(seen).toHaveLength(LATTICE_POINTS)
    r.tooltipRows.forEach((row, i) => {
      expect(row.ages).toBe(`A${Math.round(r.samples[i]!.yearsFromNow)}`)
    })
  })

  it('ages is "" when no formatAges closure is supplied (the defensive arm — the band still resolves)', () => {
    const r = resolveBandData(linearFan(), 'on-track', { formatDollar: fmt })
    expect(r.tooltipRows.every((row) => row.ages === '')).toBe(true)
  })
})

/**
 * composeReadoutLines — the readout's honesty-critical WHAT-to-show decision, extracted as a pure seam
 * so a regression that re-shows crisp dollars on a dead cohort fails LOUD here (mirrors the project's
 * "every honesty arm carries a planted-fail control" bar). The DEAD-COHORT arm is the cardinal-rule
 * guard: thin ⇒ the low/median/high figures are ABSENT (replaced by the calm note).
 */
describe('composeReadoutLines — the dead-cohort dollar withdrawal (the calm-but-wrong guard)', () => {
  const LABELS = {
    readoutAgesLabel: 'Ages',
    readoutRangeLabel: 'Eight in ten land between',
    readoutRangeJoiner: ' – ',
    readoutMedianLabel: 'Most likely',
    readoutThinNote: 'Too few couples to show a range.',
  } as unknown as BandLabels
  const ROW: BandTooltipRow = { ages: '80 / 82', low: '$283k', median: '$1.5M', high: '$5M' }

  it('NOT thin: shows ages, then the RANGE (range-first), then the median LAST (subordinate)', () => {
    const lines = composeReadoutLines(LABELS, ROW, false)
    expect(lines.map((l) => l.kind)).toEqual(['ages', 'label', 'value', 'label', 'value'])
    expect(lines[0]!.text).toBe('Ages 80 / 82')
    expect(lines[1]!.text).toBe('Eight in ten land between')
    expect(lines[2]!.text).toBe('$283k – $5M') // low joiner high
    expect(lines[3]!.text).toBe('Most likely')
    expect(lines[4]!.text).toBe('$1.5M') // the median, last
  })

  it('PLANTED CONTROL — thin: the crisp dollar figures are ABSENT, replaced by the calm note', () => {
    const lines = composeReadoutLines(LABELS, ROW, true)
    expect(lines.map((l) => l.kind)).toEqual(['ages', 'note'])
    expect(lines[1]!.text).toBe('Too few couples to show a range.')
    // the honesty assertion: NONE of the row's dollar figures may appear when thin
    const joined = lines.map((l) => l.text).join(' | ')
    expect(joined).not.toContain(ROW.low)
    expect(joined).not.toContain(ROW.median)
    expect(joined).not.toContain(ROW.high)
    expect(joined).not.toContain('Eight in ten') // the range label withdraws too
  })

  it('drops the ages line when no household-clock closure supplied (row.ages === "")', () => {
    const noAges: BandTooltipRow = { ...ROW, ages: '' }
    expect(composeReadoutLines(LABELS, noAges, false).some((l) => l.kind === 'ages')).toBe(false)
    expect(composeReadoutLines(LABELS, noAges, true)).toEqual([
      { text: 'Too few couples to show a range.', kind: 'note' },
    ])
  })
})
