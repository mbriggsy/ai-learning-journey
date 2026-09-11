import { describe, expect, it } from 'vitest'
import { composeBandAtRange } from '../bandPanelChrome'
import { copy, slots } from '../copy'
import { DEV_SEEDS } from '../devSeeds'
import { axisDollarFormatterFor, formatAxisDollar } from '../money'
import { buildSpineParams } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import {
  LATTICE_POINTS,
  resolveBandData,
  type BandSample,
  type BandTooltipRow,
  type ResolvedBandData,
} from '@viz/bandData'

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
  /** The producer's grid-exact first-$0 plan-year (Card 5); a fixture whose median never touches
   *  the floor leaves it null. */
  readonly medianGoneYear?: number
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
    elapsedYears: 0,
    outcomeState: 'on-track',
    dollarMax: 1_000,
    horizonYears: 40,
    samples,
    yTicks: [],
    annotations: [],
    callouts: [],
    tooltipRows,
    medianGoneYear: opts.medianGoneYear ?? null,
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
    // ("$0 most likely, but the hardest futures run out"). Caught live at ?seed=failing. Since Card 5
    // the gone sentence speaks the producer's first-$0 plan-year (here 30), never the anchor's 39.
    const r = makeResolved({
      lowAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}0k`),
      medianAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}5k`),
      medianGoneYear: 30,
    })
    expect(composeBandAtRange(r)).toBe(slots.bandAtRangeGone(30))
    expect(composeBandAtRange(r)).not.toContain('$0')
    expect(composeBandAtRange(r)).not.toContain(String(ANCHOR_YEARS))
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
    expect(composeBandAtRange(r, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })).toBe(
      slots.bandAtRange(ANCHOR_YEARS - 2, row.low, row.high, row.median),
    )
  })

  it('AGED: elapsed 0 (every fresh session) composes byte-identically to the anchor-less call — the no-drift pin', () => {
    expect(composeBandAtRange(makeResolved(), { startCalendarYear: 2024, yearsSincePlanBuilt: 0 })).toBe(composeBandAtRange(makeResolved()))
  })
})

// ── Card 5 (the four-faces Caddie walk, 2026-09-11): the GONE variant speaks the median's FIRST $0
//    column, never the anchor. On ?seed=failing the anchor (the deepest cohort-clean column) sits
//    ~17 years out while the drawn median hits $0 inside the first years — so the one number the
//    screen reader heard was ~17 years of runway on a plan that is gone almost at once (the AT
//    channel rosier than the ink, in the one channel with no $0 picture). The RUIN and RANGE
//    variants keep their anchor; only the ruin sentence's time word changes. ────────────────────
describe('Card 5 — the GONE variant speaks the FIRST $0 year, not the anchor', () => {
  /** Median (and low) format to "$0" from lattice index `from` onward (the deeper anchor reads $0
   *  too), with the producer's grid-exact first-$0 plan-year `goneYear` carried alongside. */
  const goneFrom = (from: number, goneYear: number) =>
    makeResolved({
      lowAt: (i) => (i >= from ? '$0' : `$${i}0k`),
      medianAt: (i) => (i >= from ? '$0' : `$${i}5k`),
      medianGoneYear: goneYear,
    })

  it('speaks "in about N years" with N = the producer’s grid-exact first-$0 year — never the anchor’s ~39', () => {
    const r = goneFrom(6, 5)
    expect(composeBandAtRange(r)).toBe(slots.bandAtRangeGone(5))
    expect(composeBandAtRange(r)).not.toContain(String(ANCHOR_YEARS))
  })

  it('reads the GRID year, never the lattice column: a first $0 column at ~1.7 y over a grid gone at year 1 speaks WITHIN A YEAR', () => {
    // 2/48 × 40 = 1.67 y is the lattice's first $0 column; the grid (the truth) is $0 at year 1 —
    // the one-column optimistic slack the lattice search would have spoken as "in about 2 years".
    const r = goneFrom(2, 1)
    expect(composeBandAtRange(r)).toBe(copy.bandAtRangeGoneWithinYear)
    expect(composeBandAtRange(r)).not.toMatch(/\d/)
  })

  it('a first $0 year of 0 (the anchor itself) speaks WITHIN A YEAR too — no number that could read as runway', () => {
    expect(composeBandAtRange(goneFrom(1, 0))).toBe(copy.bandAtRangeGoneWithinYear)
  })

  it('AGED: the first $0 year re-bases to WALL time (plan-time minus elapsed); a depletion the elapsed years have already passed speaks ALREADY', () => {
    const r = goneFrom(6, 5) // plan-year 5
    expect(composeBandAtRange(r, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })).toBe(slots.bandAtRangeGone(3))
    expect(composeBandAtRange(r, { startCalendarYear: 2024, yearsSincePlanBuilt: 4 })).toBe(copy.bandAtRangeGoneWithinYear)
    expect(composeBandAtRange(r, { startCalendarYear: 2024, yearsSincePlanBuilt: 6 })).toBe(copy.bandAtRangeGoneAlready)
  })

  it('FAILS LOUD on a producer contradiction: an anchor row reading $0 beside a null grid year (never a fabricated year)', () => {
    const r = makeResolved({
      lowAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}0k`),
      medianAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}5k`),
    })
    expect(() => composeBandAtRange(r)).toThrow(/producer contradiction/)
  })

  it('the RUIN variant still anchors on the cohort-clean column (untouched by the gone fix)', () => {
    const r = makeResolved({ lowAt: (i) => (i === DEEPEST_INTERIOR ? '$0' : `$${i}0k`) })
    expect(composeBandAtRange(r)).toBe(slots.bandAtRangeRuin(ANCHOR_YEARS, r.tooltipRows[DEEPEST_INTERIOR]!.median))
  })

  // THE LIVE PLANT: ?seed=failing through the REAL engine and the REAL resolver (the same call
  // ConfidenceStatement makes) — the sentence a screen reader speaks on that page. The expected
  // year is DERIVED INDEPENDENTLY from the engine's integer-year fan (the first year whose median
  // formats to "$0"), never from the resolver's own lattice — and the walk's number (17) is banned.
  it("'failing' (real engine, real resolver): the AT sentence speaks the first $0 year and never the anchor’s ~17", () => {
    const d = DEV_SEEDS.failing
    const wire = runEngine(buildSpineParams(d)!, d.seed!, { bandFan: true })
    if (wire.kind !== 'resolved' || !wire.bandFan) throw new Error('failing: expected a resolved wire with a fan')
    const zero = formatAxisDollar(0)
    const firstZero = wire.bandFan.byYear.find((y) => formatAxisDollar(y.p50) === zero)
    expect(firstZero, 'the drawn median reaches $0 (already-failing)').toBeDefined()
    expect(firstZero!.yearsFromNow, 'the walk’s reading: the median is gone inside the first years').toBeLessThanOrEqual(2)
    const resolved = resolveBandData(wire.bandFan, wire.headline.outcomeState, {
      formatDollar: formatAxisDollar,
      tickFormatterFor: axisDollarFormatterFor,
    })
    const sentence = composeBandAtRange(resolved)
    expect(sentence, 'a cohort-clean anchor exists on this household (the sentence is not withdrawn)').not.toBeNull()
    const expected =
      firstZero!.yearsFromNow <= 1 ? copy.bandAtRangeGoneWithinYear : slots.bandAtRangeGone(firstZero!.yearsFromNow)
    expect(sentence).toBe(expected)
    expect(sentence).not.toContain('17')
  })
})
