/*
 * src/ui/preview/dateFixtures.ts — representative DateTrackOutcome fixtures for the D2 fuck-off-date
 * preview harness (and the FuckOffDate / dateTradeoff tests). Hand-built, deterministic data — NOT
 * engine output — one per first-class outcome class so each renders honestly. The per-fixture curves
 * are realistic enough to exercise the tradeoff helper: the clean confirmed case carries an earlier
 * lower-odds point; the non-monotone / window-edge / free-today cases each correctly suppress it.
 */
import type { DateGrade, DateOffsetReading, DateTrackOutcome } from '@shared/model'

const WINDOW_TOP = 30
const ON_TRACK_BAR = 0.85 // BANDS.onTrack — fixture-local (illustrative margin only; not engine-derived)

const grade = (quantizedLowerBound: number, survivalFraction: number): DateGrade => ({
  quantizedLowerBound,
  survivalFraction,
  marginAboveBar: quantizedLowerBound - ON_TRACK_BAR,
})

/** Build a curve from [offsetYears, quantizedLowerBound] pairs (survival = bound + a small margin). */
const curveOf = (pairs: readonly (readonly [number, number])[]): readonly DateOffsetReading[] =>
  pairs.map(([offsetYears, qlb]) => ({
    offsetYears,
    survivalFraction: Math.min(1, qlb + 0.03),
    quantizedLowerBound: qlb,
    clears: qlb >= ON_TRACK_BAR,
  }))

// A clean rising curve crowned at offset 4 — earlier offsets sit below the bar (the tradeoff helper
// finds offset 3 at 8 of 10, the smallest-sacrifice earlier point).
const freeToday: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 0,
  grade: grade(0.92, 0.95),
  nonMonotoneOffsets: [],
  curve: curveOf([[0, 0.92]]),
}
const confirmed: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 4,
  grade: grade(0.88, 0.91),
  nonMonotoneOffsets: [],
  curve: curveOf([
    [0, 0.62],
    [1, 0.7],
    [2, 0.78],
    [3, 0.82],
    [4, 0.88],
    [5, 0.89],
  ]),
}
// A cleared-then-dipped curve (offsets 2–3 clear, then dip) — the non-monotone disclosure fires and
// the tradeoff suppresses (the disclosure is the priority earlier-message).
const confirmedNonMonotone: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 6,
  grade: grade(0.86, 0.9),
  nonMonotoneOffsets: [2, 3],
  curve: curveOf([
    [0, 0.6],
    [1, 0.72],
    [2, 0.86],
    [3, 0.85],
    [4, 0.8],
    [5, 0.83],
    [6, 0.86],
  ]),
}
const windowEdge: DateTrackOutcome = {
  kind: 'window-edge-unconfirmed',
  offsetYears: WINDOW_TOP,
  grade: grade(0.85, 0.88),
  nonMonotoneOffsets: [],
  curve: curveOf([
    [0, 0.6],
    [15, 0.74],
    [30, 0.85],
  ]),
}
const noDate: DateTrackOutcome = {
  kind: 'no-date-in-window',
  nonMonotoneOffsets: [],
  curve: curveOf([
    [0, 0.55],
    [15, 0.66],
    [30, 0.72],
  ]),
}
// U9b — a LATER confirmed date (crowned at 9) with its own coherent curve, so the split fixtures
// can pair it against `confirmed` (crowned at 4) as a genuine floor≠lifestyle reading in either
// direction (normal split / the R27 inversion) without inventing a crown its curve never reached.
const confirmedLater: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 9,
  grade: grade(0.87, 0.9),
  nonMonotoneOffsets: [],
  curve: curveOf([
    [0, 0.5],
    [2, 0.6],
    [4, 0.7],
    [6, 0.78],
    [8, 0.83],
    [9, 0.87],
    [10, 0.88],
  ]),
}

export const DATE_FIXTURES = {
  freeToday,
  confirmed,
  confirmedNonMonotone,
  windowEdge,
  noDate,
  confirmedLater,
} as const satisfies Record<string, DateTrackOutcome>

export type DateFixtureKey = keyof typeof DATE_FIXTURES
export const DATE_WINDOW_TOP = WINDOW_TOP
