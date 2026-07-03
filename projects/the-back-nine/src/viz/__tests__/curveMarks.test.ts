import { describe, it, expect } from 'vitest'
import { curveMarks, dipLabelRunCenters, BAR_RUNG, LADDER_MAX_RUNG, type CurveMark } from '../curveMarks'
import { BANDS } from '@engine/confidence'
import type { DateOffsetReading, DateTrackOutcome } from '@shared/model'

/*
 * The D2c odds-ladder seam (council-decided 2026-06-28). Externally-constructed curves (NOT engine
 * output): the seam reads the engine's per-offset outputs and derives no threshold. The honesty
 * pins are (1) plot ≡ text (rung = the published X-of-10 count), (2) above-bar ⟺ clears by
 * arithmetic, (3) the crown is the DURABLE date never the tallest rung, (4) every non-monotone
 * offset is flagged and a dip always clears, (5) a ≥ 0.95 bound is atCeiling (so the renderer never
 * prints "10 of 10"), (6) a no-date track crowns nothing. Every invariant is SWEPT across all
 * offsets (insight 029). The published-text CLAMP itself (slots.xOfTen) is injected by @ui and
 * asserted at the chrome level; here we pin the rung + the ceiling FLAG the clamp reads.
 */

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: qlb + 0.03,
  quantizedLowerBound: qlb,
  clears: qlb >= 0.85,
})

const confirmed = (
  offsetYears: number,
  curve: readonly DateOffsetReading[],
  nonMonotoneOffsets: readonly number[] = [],
): DateTrackOutcome => {
  const crowned = curve.find((r) => r.offsetYears === offsetYears)
  if (crowned === undefined) throw new Error('fixture: crowned offset must be in the curve')
  return {
    kind: 'confirmed-date',
    offsetYears,
    grade: {
      quantizedLowerBound: crowned.quantizedLowerBound,
      survivalFraction: crowned.survivalFraction,
      marginAboveBar: crowned.quantizedLowerBound - BANDS.onTrack,
    },
    nonMonotoneOffsets,
    curve,
  }
}

const noDate = (
  curve: readonly DateOffsetReading[],
  nonMonotoneOffsets: readonly number[] = [],
): DateTrackOutcome => ({ kind: 'no-date-in-window', nonMonotoneOffsets, curve })

/** The single mark at an offset, or throw — keeps the assertions type-safe under
 *  noUncheckedIndexedAccess without sprinkling non-null assertions. */
const at = (marks: readonly CurveMark[], offset: number): CurveMark => {
  const m = marks.find((x) => x.offsetYears === offset)
  if (m === undefined) throw new Error(`fixture: no mark at offset ${offset}`)
  return m
}

describe('curveMarks — the honest odds-ladder seam', () => {
  it('BINDS the bar to the engine: BAR_RUNG ≡ BANDS.onTrack·10, landing BETWEEN failing-8 and clearing-9', () => {
    // The integer-rung "above ⟺ clears" arithmetic holds ONLY because round(BANDS.onTrack·10) = 9.
    // If the bar moved off 0.85, round() could land on a rung and the invariant would silently break.
    expect(BAR_RUNG).toBe(BANDS.onTrack * 10)
    expect(Math.round(BANDS.onTrack * 10)).toBe(9)
    expect(BAR_RUNG).toBeGreaterThan(8)
    expect(BAR_RUNG).toBeLessThan(9)
  })

  it('plots above the bar (rung ≥ 9) IFF the offset clears — swept across the 0.84→8 / 0.85→9 boundary', () => {
    const marks = curveMarks(
      confirmed(8, [
        reading(2, 0.7),
        reading(4, 0.83),
        reading(6, 0.84), // round(8.4) = 8, just below the bar — fails
        reading(8, 0.85), // round(8.5) = 9, the clearing edge — clears
        reading(10, 0.9),
      ]),
    )
    for (const m of marks) {
      expect(m.rung >= 9).toBe(m.clears) // above-bar ⟺ clears at EVERY offset
      expect(m.rung > BAR_RUNG).toBe(m.clears) // …and by the literal bar position
    }
    expect(at(marks, 6).rung).toBe(8)
    expect(at(marks, 6).clears).toBe(false)
    expect(at(marks, 8).rung).toBe(9)
    expect(at(marks, 8).clears).toBe(true)
  })

  it('crowns the engine DURABLE date (track.offsetYears), never the tallest rung (optimizer’s curse)', () => {
    // An earlier LUCKY PEAK (offset 4, rung 10) towers over the durable crown (offset 8, rung 9);
    // it cleared then dipped (offset 6 fails), so the longest clearing suffix starts at 8, not 4.
    const marks = curveMarks(
      confirmed(
        8,
        [reading(4, 0.96), reading(6, 0.84), reading(8, 0.88), reading(10, 0.9)],
        [4],
      ),
    )
    expect(marks.filter((m) => m.isCrown).map((m) => m.offsetYears)).toEqual([8]) // exactly one, at the durable date
    const tallest = marks.reduce((a, b) => (b.rung > a.rung ? b : a))
    expect(tallest.offsetYears).toBe(4) // the peak is real…
    expect(tallest.rung).toBe(10)
    expect(tallest.isCrown).toBe(false) // …and explicitly NOT crowned
  })

  it('flags every non-monotone offset isDip, and a dip ALWAYS clears (plots above the bar)', () => {
    const marks = curveMarks(
      confirmed(
        10,
        [reading(2, 0.86), reading(4, 0.88), reading(6, 0.8), reading(8, 0.82), reading(10, 0.9)],
        [2, 4],
      ),
    )
    expect(marks.filter((m) => m.isDip).map((m) => m.offsetYears)).toEqual([2, 4])
    for (const m of marks) {
      if (m.isDip) {
        expect(m.clears).toBe(true)
        expect(m.rung >= 9).toBe(true)
      }
    }
  })

  it('exposes the published X-of-10 count as rung, flagging the ceiling (rung 10) so the drawer never prints "10 of 10"', () => {
    const marks = curveMarks(
      confirmed(8, [reading(4, 0.72), reading(6, 0.88), reading(8, 0.96)]), // 0.96 → round(9.6) = 10
    )
    expect(at(marks, 4).rung).toBe(7) // round(7.2) = 7
    expect(at(marks, 6).rung).toBe(9) // round(8.8) = 9
    expect(at(marks, 8).rung).toBe(10) // round(9.6) = 10 → the ceiling
    expect(at(marks, 8).atCeiling).toBe(true)
    // every non-ceiling mark sits strictly below the certainty rung (the renderer can label it "N of 10")
    expect(marks.filter((m) => !m.atCeiling).every((m) => m.rung < LADDER_MAX_RUNG)).toBe(true)
  })

  it('marks a ≥ 0.95 bound atCeiling (rung 10) and keeps 0.94 at rung 9 — the never-certainty edge', () => {
    const marks = curveMarks(
      confirmed(4, [reading(2, 0.7), reading(4, 0.94), reading(6, 0.95)]), // suffix [4,6] clears → crown 4
    )
    expect(at(marks, 4).rung).toBe(9)
    expect(at(marks, 4).atCeiling).toBe(false)
    expect(at(marks, 6).rung).toBe(10)
    expect(at(marks, 6).atCeiling).toBe(true)
  })

  it('a NO-DATE track crowns NOTHING — no above-bar dot is pickable as "the date"', () => {
    // On no-date, the engine flags ALL clearing offsets non-monotone (dateSearch.ts:308): every
    // above-bar dot wears the "doesn't hold" tell, and none is crowned.
    const marks = curveMarks(
      noDate([reading(2, 0.86), reading(4, 0.88), reading(6, 0.7), reading(8, 0.6)], [2, 4]),
    )
    expect(marks.some((m) => m.isCrown)).toBe(false)
    expect(marks.filter((m) => m.isDip).map((m) => m.offsetYears)).toEqual([2, 4])
    expect(marks.filter((m) => m.clears).map((m) => m.offsetYears)).toEqual([2, 4])
  })

  it('emits one mark per offset in engine order for a full ~11-point curve (sweeps the interior)', () => {
    const curve = Array.from({ length: 11 }, (_, i) => reading(i, 0.5 + i * 0.045)) // on-grid steps
    const marks = curveMarks(confirmed(8, curve))
    expect(marks).toHaveLength(11)
    expect(marks.map((m) => m.offsetYears)).toEqual(curve.map((r) => r.offsetYears))
    for (const m of marks) {
      expect(m.rung >= 9).toBe(m.clears) // the core invariant at every interior point, not just ends
    }
  })
})

// P3·U10 — the dip-label run-center rule (the ?seed=dip live catch, 2026-07-03): adjacent dips
// each drawing their own "doesn't hold" overlap into garble, so the TELL renders once per
// contiguous run (its lower-median center) while every dip keeps its open-dot shape + aria.
describe('dipLabelRunCenters — one worded tell per contiguous dip run', () => {
  const dipMark = (offsetYears: number, isDip: boolean): CurveMark => ({
    offsetYears, rung: 9, atCeiling: false, clears: isDip, isDip, isCrown: false,
  })

  it('a single dip labels itself', () => {
    expect([...dipLabelRunCenters([dipMark(0, false), dipMark(4, true), dipMark(5, false)])]).toEqual([4])
  })

  it('a 3-run labels ONLY its center (the ?seed=dip shape: dips at 0,1,2 → one tell at 1)', () => {
    const marks = [dipMark(0, true), dipMark(1, true), dipMark(2, true), dipMark(3, false), dipMark(4, false)]
    expect([...dipLabelRunCenters(marks)]).toEqual([1])
  })

  it('an even-length run takes the LOWER median; separate runs each get their own tell', () => {
    const marks = [
      dipMark(0, true), dipMark(1, true), // run A (even) → center 0
      dipMark(2, false),
      dipMark(3, true), // run B → 3
      dipMark(4, false),
    ]
    expect([...dipLabelRunCenters(marks)].sort()).toEqual([0, 3])
  })

  it('a run ending at the curve top still flushes (the trailing-run arm)', () => {
    expect([...dipLabelRunCenters([dipMark(0, false), dipMark(1, true), dipMark(2, true)])]).toEqual([1])
  })

  it('no dips → no labels (never a stray tell)', () => {
    expect(dipLabelRunCenters([dipMark(0, false), dipMark(1, false)]).size).toBe(0)
  })
})
