import { describe, it, expect } from 'vitest'
import {
  OUTCOME_STATES,
  NEVER_DEPLETED,
  isDepleted,
  DRAWDOWN_POLICIES,
  DRAWDOWN_ORDER_KEYS,
  expandRothConversion,
  type OutcomeState,
  type DepletionYear,
  type DateOffsetReading,
  type DateSearchOutcome,
  type DateTrackOutcome,
} from '@shared/model'

describe('outcome-state set (single-sourced engine vocabulary)', () => {
  it('lists exactly the six first-answer states, no duplicates', () => {
    expect([...OUTCOME_STATES].sort()).toEqual(
      [
        'already-failing',
        'borderline',
        'indeterminate',
        'off-track',
        'on-track',
        'over-funded',
      ].sort(),
    )
    expect(new Set(OUTCOME_STATES).size).toBe(OUTCOME_STATES.length)
  })

  it('every listed state is assignable to OutcomeState (compile + runtime parity)', () => {
    // The array is `as const`, so this is really a compile-time guarantee; the
    // runtime loop documents intent and fails loud if the union/array ever diverge.
    for (const s of OUTCOME_STATES) {
      const typed: OutcomeState = s
      expect(typeof typed).toBe('string')
    }
  })
})

describe('never-depleted sentinel (DND/009 — survives JSON/IndexedDB)', () => {
  it('is a finite, out-of-domain integer — never Infinity/NaN/null', () => {
    expect(Number.isFinite(NEVER_DEPLETED)).toBe(true)
    expect(Number.isInteger(NEVER_DEPLETED)).toBe(true)
    expect(NEVER_DEPLETED).toBeLessThan(0) // real depletion years are >= 0
  })

  it('round-trips through JSON.stringify intact (the failure mode Infinity/NaN hit)', () => {
    const before: DepletionYear[] = [0, 5, NEVER_DEPLETED, 29]
    const after = JSON.parse(JSON.stringify(before)) as DepletionYear[]
    expect(after).toEqual(before)
    // Contrast: Infinity/NaN would have become null here.
    expect(JSON.parse(JSON.stringify([Infinity, NaN]))).toEqual([null, null])
  })

  it('isDepleted distinguishes a real depletion year from the sentinel', () => {
    expect(isDepleted(NEVER_DEPLETED)).toBe(false)
    expect(isDepleted(0)).toBe(true)
    expect(isDepleted(29)).toBe(true)
  })
})

describe('drawdown policy set (sequencing substrate)', () => {
  it("names exactly the four locked policies plus 'custom' (P3·U10 — the user's own order)", () => {
    expect([...DRAWDOWN_POLICIES].sort()).toEqual(
      ['bracket-fill', 'custom', 'pre-tax-first', 'proportional', 'taxable-first'].sort(),
    )
  })

  it('the custom-order vocabulary is the three GENERAL buckets — hsa is unrepresentable', () => {
    expect([...DRAWDOWN_ORDER_KEYS].sort()).toEqual(['pretax', 'roth', 'taxable'].sort())
  })
})

// ---------------------------------------------------------------------------
// P3·U10 — expandRothConversion: the ONE shared expander (the intake builder and
// the two-arm orchestrator both derive from it, so the lever and the comparison
// can never disagree about which years convert). Hand-derived expectations.
// ---------------------------------------------------------------------------
describe('expandRothConversion (the lever → per-year engine vector)', () => {
  it('expands a window inside the horizon: zeros before the start, the amount for each active year', () => {
    expect(expandRothConversion({ annualAmountReal: 40_000, startYearOffset: 2, years: 3 }, 30)).toEqual([
      0, 0, 40_000, 40_000, 40_000,
    ])
  })

  it('a start-now window has no zero prefix', () => {
    expect(expandRothConversion({ annualAmountReal: 25_000, startYearOffset: 0, years: 2 }, 30)).toEqual([
      25_000, 25_000,
    ])
  })

  it('truncates at the horizon (years past it are inert, never an over-long array)', () => {
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 28, years: 5 }, 30)).toEqual([
      ...new Array<number>(28).fill(0),
      10_000,
      10_000,
    ])
  })

  it('a window entirely past the horizon returns UNDEFINED — absence, never a zero-fill (reduce-to-spine is presence-keyed)', () => {
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 30, years: 5 }, 30)).toBeUndefined()
    expect(expandRothConversion({ annualAmountReal: 10_000, startYearOffset: 31, years: 1 }, 30)).toBeUndefined()
  })

  it('the expansion is JSON-safe end to end (DND-009: finite entries only)', () => {
    const vec = expandRothConversion({ annualAmountReal: 40_000, startYearOffset: 1, years: 2 }, 10)!
    expect(vec.every((v) => Number.isFinite(v))).toBe(true)
    expect(JSON.parse(JSON.stringify(vec))).toEqual(vec)
  })
})

describe('DateSearchOutcome family — DND/009 persisted-finite round-trip (the NEVER_DEPLETED mirror)', () => {
  // The model.ts contract on the C3 vocabulary promises every persisted field is a finite
  // numeric and the no-offset arms simply CARRY NO offset field (never an Infinity/NaN
  // sentinel, never an explicit undefined). The producer (decideTrack) enforces finiteness
  // at runtime today — these tests are the U4-persistence regression guard the sentinel
  // already has at lines above (a future Infinity would silently null on the IndexedDB
  // write and corrupt a reopened plan).
  const curve: readonly DateOffsetReading[] = [
    { offsetYears: 0, survivalFraction: 0.7, quantizedLowerBound: 0.69, clears: false },
    { offsetYears: 1, survivalFraction: 0.91, quantizedLowerBound: 0.9, clears: true },
    { offsetYears: 2, survivalFraction: 0.93, quantizedLowerBound: 0.92, clears: true },
  ]
  const confirmed: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 1,
    grade: { quantizedLowerBound: 0.9, survivalFraction: 0.91, marginAboveBar: 0.05 },
    nonMonotoneOffsets: [],
    curve,
  }

  it('a fully-populated dates outcome round-trips through JSON intact, every numeric FINITE after the trip', () => {
    const before: DateSearchOutcome = {
      kind: 'dates',
      floor: confirmed,
      lifestyle: confirmed,
      tier: 'final',
      windowTopYears: 2,
      seed: 12345,
    }
    const after = JSON.parse(JSON.stringify(before)) as typeof before
    expect(after).toEqual(before)
    // The explicit finiteness sweep is the load-bearing half: toEqual alone cannot catch a
    // future Infinity/NaN (JSON nulls it on BOTH sides of the comparison only when the
    // producer emits it — sweep the post-trip numerics directly).
    expect(Number.isFinite(after.windowTopYears)).toBe(true)
    expect(Number.isFinite(after.seed)).toBe(true)
    for (const track of [after.floor, after.lifestyle]) {
      if (track.kind === 'no-date-in-window') continue
      expect(Number.isFinite(track.offsetYears)).toBe(true)
      expect(Number.isFinite(track.grade.quantizedLowerBound)).toBe(true)
      expect(Number.isFinite(track.grade.survivalFraction)).toBe(true)
      expect(Number.isFinite(track.grade.marginAboveBar)).toBe(true)
      for (const r of track.curve) {
        expect(Number.isFinite(r.offsetYears)).toBe(true)
        expect(Number.isFinite(r.survivalFraction)).toBe(true)
        expect(Number.isFinite(r.quantizedLowerBound)).toBe(true)
      }
      for (const n of track.nonMonotoneOffsets) expect(Number.isFinite(n)).toBe(true)
    }
  })

  it('the no-date arm carries NO offset key — and stays key-ABSENT through the trip', () => {
    // The load-bearing assertion is the `in` check, NOT toEqual: a regression that emits
    // `offsetYears: undefined` serializes away to absent and toEqual would silently pass —
    // only an explicit key-presence check pins the "carry no offset field" promise.
    const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [1], curve }
    const before: DateSearchOutcome = {
      kind: 'dates',
      floor: noDate,
      lifestyle: noDate,
      tier: 'provisional',
      windowTopYears: 2,
      seed: 7,
    }
    const after = JSON.parse(JSON.stringify(before)) as typeof before
    expect(after).toEqual(before)
    expect('offsetYears' in after.floor).toBe(false)
    expect('grade' in after.floor).toBe(false)
  })

  it('the cancelled and input-failure run-level arms round-trip intact', () => {
    const cancelled: DateSearchOutcome = { kind: 'cancelled' }
    expect(JSON.parse(JSON.stringify(cancelled))).toEqual(cancelled)
    const failed: DateSearchOutcome = { kind: 'input-failure', reason: 'candidate Y=0 rejected: x' }
    const afterFailed = JSON.parse(JSON.stringify(failed)) as typeof failed
    expect(afterFailed).toEqual(failed)
    if (afterFailed.kind === 'input-failure') expect(typeof afterFailed.reason).toBe('string')
  })
})
