// The M > S honesty fork, moved out of `budgetBuilder.test.tsx` with its function by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import { medicalExceedsTotal } from '../budgetChecks'

describe('medicalExceedsTotal', () => {
  it('medicalExceedsTotal fires STRICTLY above (the pure honesty fork — insight 048 planted-fail arms)', () => {
    expect(medicalExceedsTotal(5_000, 6_500)).toBe(true) // M > S — the contradiction
    expect(medicalExceedsTotal(6_500, 6_500)).toBe(false) // M === S — a $0 target is the truth
    expect(medicalExceedsTotal(80_000, 8_000)).toBe(false) // the ordinary M < S readout
  })
})
