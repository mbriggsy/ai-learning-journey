/*
 * src/ui/preview/dateFixtures.ts — representative DateTrackOutcome fixtures for the D2 fuck-off-date
 * preview harness (and the FuckOffDate test). Hand-built, deterministic data — NOT engine output —
 * one per first-class outcome class so each renders honestly. The curve is minimal (slice 1 reads
 * only the crowned headline + grade; the curve drives the deferred tradeoff/curve-drawer).
 */
import type { DateGrade, DateOffsetReading, DateTrackOutcome } from '@shared/model'

const WINDOW_TOP = 30
const ON_TRACK_BAR = 0.85 // BANDS.onTrack — fixture-local (illustrative margin only; not engine-derived)

const grade = (quantizedLowerBound: number, survivalFraction: number): DateGrade => ({
  quantizedLowerBound,
  survivalFraction,
  marginAboveBar: quantizedLowerBound - ON_TRACK_BAR,
})

const reading = (offsetYears: number, qlb: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: qlb + 0.03,
  quantizedLowerBound: qlb,
  clears: qlb >= ON_TRACK_BAR,
})

/** A minimal representative curve — not rendered in slice 1. */
const CURVE: readonly DateOffsetReading[] = [reading(0, 0.7), reading(4, 0.88), reading(10, 0.91)]

const freeToday: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 0,
  grade: grade(0.92, 0.95),
  nonMonotoneOffsets: [],
  curve: CURVE,
}
const confirmed: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 4,
  grade: grade(0.88, 0.91),
  nonMonotoneOffsets: [],
  curve: CURVE,
}
const confirmedNonMonotone: DateTrackOutcome = {
  kind: 'confirmed-date',
  offsetYears: 6,
  grade: grade(0.86, 0.9),
  nonMonotoneOffsets: [2, 3],
  curve: CURVE,
}
const windowEdge: DateTrackOutcome = {
  kind: 'window-edge-unconfirmed',
  offsetYears: WINDOW_TOP,
  grade: grade(0.85, 0.88),
  nonMonotoneOffsets: [],
  curve: CURVE,
}
const noDate: DateTrackOutcome = {
  kind: 'no-date-in-window',
  nonMonotoneOffsets: [],
  curve: CURVE,
}

export const DATE_FIXTURES = {
  freeToday,
  confirmed,
  confirmedNonMonotone,
  windowEdge,
  noDate,
} as const satisfies Record<string, DateTrackOutcome>

export type DateFixtureKey = keyof typeof DATE_FIXTURES
export const DATE_WINDOW_TOP = WINDOW_TOP
