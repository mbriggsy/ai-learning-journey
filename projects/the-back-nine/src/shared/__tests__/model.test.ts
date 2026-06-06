import { describe, it, expect } from 'vitest'
import {
  OUTCOME_STATES,
  NEVER_DEPLETED,
  isDepleted,
  DRAWDOWN_POLICIES,
  type OutcomeState,
  type DepletionYear,
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
  it('names exactly the four locked policies', () => {
    expect([...DRAWDOWN_POLICIES].sort()).toEqual(
      ['bracket-fill', 'pre-tax-first', 'proportional', 'taxable-first'].sort(),
    )
  })
})
