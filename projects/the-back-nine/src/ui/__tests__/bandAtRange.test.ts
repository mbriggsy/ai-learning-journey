import { describe, expect, it } from 'vitest'
import { composeBandAtRange } from '../bandPanelChrome'
import { slots } from '../copy'
import { LATTICE_POINTS, type BandSample, type BandTooltipRow, type ResolvedBandData } from '@viz/bandData'

/*
 * composeBandAtRange — the screen-reader-only band range sentence (AT portfolio-range parity, council
 * 2026-06-29). The honesty contract proved here: (1) SINGLE-SOURCED — the quoted figures are byte-
 * identical to the SELECTED column's tooltipRows (the same figures the sighted scrub shows), never a
 * second computation; (2) SURVIVOR-NEUTRAL — a years-from-now anchor, never the both-alive ages; (3)
 * $0-AS-RUIN — a $0 low edge is spoken as depletion, never a soft "between $0 and …"; (4) WITHDRAW —
 * null (no node) when no cohort-clean column qualifies. The column choice itself is unit-tested on the
 * pure selectAtRangeColumn (bandGeometry.test.ts); here we pin the sentence built around it.
 */

/** A full-cohort resolved fan over a 40-year horizon, with index-dependent tooltip figures so the
 *  SELECTED column's figures are identifiable. `lowAt`/`cohortAt` override per-index for the ruin /
 *  withdraw arms. With a full cohort the selector picks the deepest INTERIOR column (LATTICE_POINTS-2). */
function makeResolved(opts: {
  readonly cohortAt?: (i: number) => number
  readonly lowAt?: (i: number) => string
  readonly medianAt?: (i: number) => string
} = {}): ResolvedBandData {
  const samples: BandSample[] = []
  const tooltipRows: BandTooltipRow[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const yearsFromNow = (i / (LATTICE_POINTS - 1)) * 40
    samples.push({ yearsFromNow, p10: 100, p25: 200, p50: 300, p75: 400, p90: 500, cohortFraction: opts.cohortAt?.(i) ?? 1 })
    tooltipRows.push({
      ages: `${60 + i} / ${58 + i}`,
      low: opts.lowAt?.(i) ?? `$${i}0k`,
      median: opts.medianAt?.(i) ?? `$${i}5k`,
      high: `$${i}9k`,
    })
  }
  return {
    kind: 'resolved',
    outcomeState: 'on-track',
    dollarMax: 1_000,
    horizonYears: 40,
    samples,
    yTicks: [],
    annotations: [],
    callouts: [],
    tooltipRows,
  }
}

const DEEPEST_INTERIOR = LATTICE_POINTS - 2 // 47 — the column a full-cohort fan selects
const ANCHOR_YEARS = Math.round((DEEPEST_INTERIOR / (LATTICE_POINTS - 1)) * 40) // 39

describe('composeBandAtRange — the AT range sentence (council 2026-06-29)', () => {
  it('SINGLE-SOURCES the figures from the selected column tooltipRows (byte-identical to the scrub)', () => {
    const r = makeResolved()
    const row = r.tooltipRows[DEEPEST_INTERIOR]!
    // exactly the slot rendered with THIS column's figures — never a re-computed number.
    expect(composeBandAtRange(r)).toBe(slots.bandAtRange(ANCHOR_YEARS, row.low, row.high, row.median))
  })

  it('anchors on YEARS-FROM-NOW (survivor-neutral) — never the both-alive ages, never "couples"', () => {
    const sentence = composeBandAtRange(makeResolved())!
    expect(sentence).toContain('years out')
    expect(sentence).not.toContain('/') // the ages slot's separator never reaches the AT sentence
    expect(sentence.toLowerCase()).not.toContain('couple')
  })

  it('speaks a $0 low edge AS depletion (the ruin variant), never a soft "between $0 and …"', () => {
    // the selected column's low edge formats to "$0" but the median is positive ⇒ the ruin variant, median-led.
    const r = makeResolved({ lowAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}0k`) })
    const row = r.tooltipRows[DEEPEST_INTERIOR]!
    expect(composeBandAtRange(r)).toBe(slots.bandAtRangeRuin(ANCHOR_YEARS, row.median))
    expect(composeBandAtRange(r)).not.toContain('between $0')
  })

  it('speaks TOTAL depletion plainly when even the MEDIAN reads $0 (already-failing) — never "$0 but runs out"', () => {
    // both low AND median format to "$0" ⇒ the gone variant, NOT the self-contradictory ruin one
    // ("$0 most likely, but the hardest futures run out"). Caught live at ?seed=failing.
    const r = makeResolved({
      lowAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}0k`),
      medianAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}5k`),
    })
    expect(composeBandAtRange(r)).toBe(slots.bandAtRangeGone(ANCHOR_YEARS))
    expect(composeBandAtRange(r)).not.toContain('$0')
  })

  it('WITHDRAWS (null) when no cohort-clean interior column qualifies — silence over a fabricated range', () => {
    // every interior column is below the cleanliness floor ⇒ no node at all.
    expect(composeBandAtRange(makeResolved({ cohortAt: () => 0.3 }))).toBeNull()
  })

  // ── the AGED-vault wall-time re-base (ultramode 2026-07-10): the plan-time "N years out"
  //    read ~elapsed years LONG on an aged vault — the mildly OPTIMISTIC direction (a longer
  //    runway than the wall-clock truth). The COLUMN (and its figures) stay plan-time data;
  //    only the spoken distance re-derives — one time base per screen. ─────────────────────
  it('AGED: "about N years out" re-bases to WALL time (plan-time years minus elapsed), figures unchanged', () => {
    const r = makeResolved()
    const row = r.tooltipRows[DEEPEST_INTERIOR]!
    expect(composeBandAtRange(r, { elapsedPlanYears: 2 })).toBe(
      slots.bandAtRange(ANCHOR_YEARS - 2, row.low, row.high, row.median),
    )
  })

  it('AGED: elapsed 0 (every fresh session) composes byte-identically to the anchor-less call — the no-drift pin', () => {
    expect(composeBandAtRange(makeResolved(), { elapsedPlanYears: 0 })).toBe(composeBandAtRange(makeResolved()))
  })
})
