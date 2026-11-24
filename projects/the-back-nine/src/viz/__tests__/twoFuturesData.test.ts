// The two-futures chart's pure seams, moved out of `TwoFutures.test.tsx` with their functions by Act 6's RC0, unchanged
// (`labels` is that file's fixture, copied).
import { describe, expect, it } from 'vitest'
import {
  TF_PLOT,
  TF_VIEW,
  composeTfReadoutLines,
  tfNearestYear,
  twoFuturesCeiling,
  twoFuturesLattice,
  type TwoFuturesLabels,
} from '../twoFuturesData'

const labels: TwoFuturesLabels = {
  withLabel: 'With the conversion',
  withoutLabel: 'Today’s plan',
  dollarMaxLabel: '~$800k',
  todayLabel: 'today',
  horizonLabel: '30',
  readoutAgesLabel: 'Ages',
  ariaSummary: 'Two futures compared — with vs without the change.',
}

describe('the pure scrub helpers (the jsdom-unreachable pointer glue’s tested core)', () => {
  const plotRight = TF_VIEW.w - TF_PLOT.right

  it('tfNearestYear snaps a viewBox x to the nearest integer year and clamps both edges', () => {
    expect(tfNearestYear(TF_PLOT.left, 30)).toBe(0)
    expect(tfNearestYear(plotRight, 30)).toBe(30)
    // dead-center of a 30y plot → year 15
    expect(tfNearestYear((TF_PLOT.left + plotRight) / 2, 30)).toBe(15)
    // out-of-plot positions clamp, never a negative or past-horizon year
    expect(tfNearestYear(TF_PLOT.left - 100, 30)).toBe(0)
    expect(tfNearestYear(plotRight + 100, 30)).toBe(30)
    expect(tfNearestYear(Number.NaN, 30)).toBe(0)
  })

  it('composeTfReadoutLines: ages lead (dropping when unsupplied); an ended arm’s pair drops with its line', () => {
    const full = composeTfReadoutLines(labels, {
      yearsFromNow: 5,
      ages: '71 / 69',
      withValue: '$700k',
      withoutValue: '$690k',
    })
    expect(full.map((l) => l.kind)).toEqual(['ages', 'label', 'value', 'label', 'value'])
    expect(full[1]!.text).toBe(labels.withoutLabel) // the baseline leads, mirroring the drawn stack
    expect(full[2]!.text).toBe('$690k')
    const truncated = composeTfReadoutLines(labels, { yearsFromNow: 28, ages: '94 / 92', withoutValue: '$510k' })
    expect(truncated.map((l) => l.kind)).toEqual(['ages', 'label', 'value'])
    expect(truncated.some((l) => l.text === labels.withLabel)).toBe(false) // the ended arm is silent
    const noAges = composeTfReadoutLines(labels, { yearsFromNow: 5, ages: '', withValue: '$1', withoutValue: '$2' })
    expect(noAges[0]!.kind).toBe('label')
  })
})

describe('twoFuturesCeiling — hand-derived ceilings on the fan-shared nice-step lattice', () => {
  // The ceiling rides bandData.niceLattice (fan parity, station-2 cold-read 2026-07-08; Card 10,
  // 2026-09-11): the nice STEP is chosen first — m × 10^e for m ∈ {1, 2, 2.5, 5} and e within a
  // decade of ⌊log10(max/4)⌋ — and the ceiling is the fewest whole steps that cover max, picking
  // the step whose count is closest to 4, then the smaller headroom. Each expected value is
  // computed BY HAND from that rule, never by running the function:
  it.each([
    // 1_234_567: k = ⌊log10 308,641⌋ = 5. 250k → 5 steps, ceiling 1_250_000, headroom 15,433;
    // 500k → 3 steps, ceiling 1_500_000, headroom 265,433. Both 1 from TARGET → headroom decides.
    [1_234_567, 1_250_000],
    // 87_000: k = ⌊log10 21,750⌋ = 4. 25k → ⌈3.48⌉ = 4 steps, an exact TARGET hit → 100_000.
    [87_000, 100_000],
    // 951_000: k = ⌊log10 237,750⌋ = 5. 250k → ⌈3.804⌉ = 4 steps, exact hit → 1_000_000.
    [951_000, 1_000_000],
    // 123: k = ⌊log10 30.75⌋ = 1. 25 → 5 steps, ceiling 125, headroom 2; 50 → 3 steps, ceiling 150,
    // headroom 27. Tie on distance → headroom → 125.
    [123, 125],
    // 590_000: k = ⌊log10 147,500⌋ = 5. 200k → 3 steps, ceiling 600_000, headroom 10,000, against
    // 250k's equally-distant 3 steps at a $750k ceiling → 600_000 (gridlines 200k/400k — clean).
    [590_000, 600_000],
    // 1_000_000: k = ⌊log10 250,000⌋ = 5. 250k → 4 steps, ceiling 1_000_000, headroom 0 — a clean
    // power of ten still lands on itself (the ⌊log10⌋ boundary stays robust).
    [1_000_000, 1_000_000],
  ])('twoFuturesCeiling(%d) = %d', (input, expected) => {
    expect(twoFuturesCeiling(input)).toBe(expected)
  })

  it('degenerate inputs (0 / NaN / negative / ∞) floor to 1 — never a $0 or undrawable axis', () => {
    expect(twoFuturesCeiling(0)).toBe(1)
    expect(twoFuturesCeiling(Number.NaN)).toBe(1)
    expect(twoFuturesCeiling(-100)).toBe(1)
    expect(twoFuturesCeiling(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('the LATTICE, not just its ceiling: a degenerate input yields the drawable $1 lattice', () => {
    // Hand-derived: niceLattice(1) → k = ⌊log10 0.25⌋ = −1; the 2.5 × 10^−1 = 0.25 candidate covers
    // 1 in exactly 4 steps (an exact TARGET hit, headroom 0). So the fallback axis is four 25¢
    // gridlines to $1 — never a $0-tall axis, and never a lattice buildYTicks would throw on.
    for (const bad of [0, Number.NaN, -100, Number.POSITIVE_INFINITY]) {
      expect(twoFuturesLattice(bad), `${bad}`).toEqual({ ceiling: 1, step: 0.25, intervals: 4 })
    }
  })

  it('the lattice a real max produces carries the STEP the axis draws, not only the ceiling', () => {
    // 1_234_567 → the 1.25M lattice: 5 steps of 250,000 (derived above).
    expect(twoFuturesLattice(1_234_567)).toEqual({ ceiling: 1_250_000, step: 250_000, intervals: 5 })
  })
})
