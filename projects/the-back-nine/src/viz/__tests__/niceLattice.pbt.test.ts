import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { buildYTicks, niceLattice } from '../bandData'
import { axisDollarFormatterFor } from '@ui/money'

/**
 * niceLattice's PROPERTIES over the whole reachable dollar domain (Caddie Card 10, 2026-09-11).
 *
 * The unit tests in `bandData.test.ts` pin hand-derived lattices at named maxima; these prove the
 * laws hold across a whole GENERATED domain rather than at chosen points, which is what the honesty
 * claims actually rest on. That domain is the generators' — max ∈ (1, 1e10], two decades past
 * anything the product can plot — never the whole double range: the subnormal and near-overflow
 * corners fall outside it and are named, with their loud failures, in niceLattice's own
 * DEGENERATE INPUT docblock (bandData.ts) and pinned as unit arms in `bandData.test.ts`.
 *
 * The defect Card 10
 * killed was born exactly here: the old ceiling-then-quarters derivation satisfied "ceiling ≥ max"
 * at every max and still printed "$0.375M" — because no property covered the LABELS the pair
 * produced. Every law below is one the drawn axis depends on:
 *
 *  - `ceiling ≥ max` — the top edge of the fan never escapes the plot (the asymmetric scale guard);
 *  - `(intervals − 1) × step < max` — the ladder never carries a whole interval of dead sky;
 *  - `intervals ∈ {3, 4, 5}` — 4–6 drawn lines including $0, so no renderer may assume five;
 *  - `ceiling === intervals × step` EXACTLY — the drawn top line is the y-scale's own ceiling;
 *  - every label carries at most TWO decimals and never three (the defect, as a law not a sample);
 *  - the labels rise strictly in value and start at "$0" (the ruin-floor anchor reads plain).
 *
 * THE LABEL ARMS' DOMAIN IS MEASURED, NOT ASSUMED (max > $1,250). Sweeping every integer max to
 * $100,000 and every $1k step to $12M, the axis formatter labels every gridline exactly and
 * distinctly ABOVE $1,250 and nowhere below: max ∈ [1,2] and [9,12] put gridlines at fractional
 * dollars the whole-dollar branch rounds ("$3" for 2.50), and max ∈ [1001,1250] draws a $1,250
 * ceiling that `formatAxisDollar`'s k-branch rounds to "$1k" — colliding with the $1,000 gridline
 * below it. That is the FORMATTER's rounding (untouched here by Card 10's remit — O5/O8 are
 * standing rulings), it sits two decades below anything a portfolio band can plot, and the old
 * quartered ladder mislabeled the same domain differently (a $1,500 ceiling's 1,125 gridline also
 * printed "$1k"). The boundary is PINNED below so a widening cannot pass unnoticed.
 */
describe('niceLattice — the lattice laws over every reachable max', () => {
  /** The plotted domain and then some: a couple's fan tops out in the low millions, the surplus
   *  seeds in the tens of millions. 1e10 is two decades past anything the product can produce. */
  const anyMax = fc.double({ min: 1, max: 1e10, noNaN: true, noDefaultInfinity: true, minExcluded: true })
  /** The domain where every gridline label is exact and distinct — measured, see the header. Two
   *  decades below the smallest fan a household with a portfolio can produce. */
  const plottableMax = fc.double({ min: 1_251, max: 1e10, noNaN: true, noDefaultInfinity: true })

  it('the ceiling covers the data, with no whole interval to spare', () => {
    fc.assert(
      fc.property(anyMax, (max) => {
        const l = niceLattice(max)
        expect(l.ceiling).toBeGreaterThanOrEqual(max)
        expect((l.intervals - 1) * l.step).toBeLessThan(max)
      }),
    )
  })

  it('the ladder is always 4–6 lines: intervals ∈ {3, 4, 5}', () => {
    // WHY it cannot escape: neighbouring NICE steps differ by at most ×2, and the candidate steps
    // span from below max/40 to above max, so some candidate lands with max/step ∈ (2, 5] — an
    // interval of ratio 2.5, which a ×2-or-finer sequence cannot straddle without landing inside.
    // That candidate is within 1 of TARGET = 4, so the chosen one is too.
    fc.assert(
      fc.property(anyMax, (max) => {
        expect([3, 4, 5]).toContain(niceLattice(max).intervals)
      }),
    )
  })

  it('the ceiling IS the product of its own parts — ceiling === intervals × step, byte-exactly', () => {
    // Not an epsilon: the repair loops compute `n * step` and that very product is stored, so the
    // top gridline's dollars and the y-scale's ceiling are the same double. The band's yForDollars
    // divides by the ceiling; a ceiling that drifted from the ladder would draw the top line off
    // the top edge by a sliver at every recompute.
    fc.assert(
      fc.property(anyMax, (max) => {
        const l = niceLattice(max)
        expect(l.ceiling).toBe(l.intervals * l.step)
        expect(buildYTicks(l, (d) => `$${d}`).at(-1)!.dollars).toBe(l.ceiling)
      }),
    )
  })

  it('NO LABEL EVER CARRIES THREE DECIMALS — the Card 10 defect as a law (≤ two, in k or M)', () => {
    fc.assert(
      fc.property(plottableMax, (max) => {
        const l = niceLattice(max)
        for (const t of buildYTicks(l, axisDollarFormatterFor(l.ceiling))) {
          expect(t.label, `max ${max}`).not.toMatch(/\.\d{3}/)
          expect(t.label, `max ${max}`).toMatch(/^\$\d+(\.\d{1,2})?[kM]?$/)
        }
      }),
    )
  })

  it('the labels start at the plain "$0" ruin floor and rise strictly', () => {
    fc.assert(
      fc.property(plottableMax, (max) => {
        const l = niceLattice(max)
        const ticks = buildYTicks(l, axisDollarFormatterFor(l.ceiling))
        expect(ticks[0]).toEqual({ dollars: 0, label: '$0' })
        for (let i = 1; i < ticks.length; i++) {
          expect(ticks[i]!.dollars, `max ${max}`).toBeGreaterThan(ticks[i - 1]!.dollars)
          expect(ticks[i]!.label, `max ${max}`).not.toBe(ticks[i - 1]!.label)
        }
      }),
    )
  })

  it('THE RECORDED LIMIT: the formatter mislabels a gridline ONLY at max ≤ $1,250 — pinned, both sides', () => {
    // Not a property but the boundary the property's domain rests on. A gridline label is honest
    // when it parses back to its own dollars and no two labels in one ladder are the same string.
    // Measured 2026-09-12 by sweeping every integer max to 100,000 and every $1k step to $12M:
    // the ONLY offenders are max ∈ [1,2] ∪ [9,12] ∪ [1001,1250]. Both sides are asserted, so a
    // formatter or lattice change that widens the bad domain — or silently fixes it — goes red here.
    const parse = (s: string): number => {
      const m = /^\$(\d+(?:\.\d+)?)(k|M)?$/.exec(s)
      return m === null ? Number.NaN : Number(m[1]) * (m[2] === 'k' ? 1_000 : m[2] === 'M' ? 1_000_000 : 1)
    }
    const honest = (max: number): boolean => {
      const l = niceLattice(max)
      const ticks = buildYTicks(l, axisDollarFormatterFor(l.ceiling))
      const labels = ticks.map((t) => t.label)
      return new Set(labels).size === labels.length && ticks.every((t) => parse(t.label) === t.dollars)
    }
    const offenders: number[] = []
    for (let max = 1; max <= 2_000; max++) if (!honest(max)) offenders.push(max)
    const expected: number[] = [1, 2, 9, 10, 11, 12]
    for (let max = 1_001; max <= 1_250; max++) expected.push(max)
    expect(offenders).toEqual(expected)
    // …and nothing above the recorded ceiling of that domain, across everything the band can draw.
    for (let max = 1_251; max <= 100_000; max += 7) expect(honest(max), `max ${max}`).toBe(true)
    for (let max = 100_000; max <= 12_000_000; max += 1_000) expect(honest(max), `max ${max}`).toBe(true)
  })

  it('ONE dialect per lattice (O8, rule 36): every non-zero label of a $≥1M lattice is written in M', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e6, max: 1e10, noNaN: true, noDefaultInfinity: true }), (max) => {
        const l = niceLattice(max)
        for (const t of buildYTicks(l, axisDollarFormatterFor(l.ceiling)).slice(1)) {
          expect(t.label, `max ${max}`).toMatch(/M$/)
        }
      }),
    )
  })
})
