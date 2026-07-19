/**
 * U15 §S0.5 — the solver-code version stamp's shape.
 *
 * The stamp is load-bearing ONLY if it is a monotone integer U17's re-entry staleness compare
 * can order with a plain `<` — a float or an out-of-domain sentinel would break that compare
 * silently (the finiteness-first discipline, insights 008/010). This pins the shape so a future
 * edit that turns it into `1.1` or `-1` fails LOUD here.
 */
import { describe, it, expect } from 'vitest'
import { SOLVER_CODE_VERSION } from '../solverCodeVersion'

describe('SOLVER_CODE_VERSION — the ranking-logic version stamp', () => {
  it('is a positive integer (a monotone version, never a float or sentinel)', () => {
    expect(Number.isInteger(SOLVER_CODE_VERSION)).toBe(true)
    expect(SOLVER_CODE_VERSION).toBeGreaterThanOrEqual(1)
  })

  it('is finite (a NaN/Infinity would defeat U17’s `<` staleness compare)', () => {
    expect(Number.isFinite(SOLVER_CODE_VERSION)).toBe(true)
  })
})
