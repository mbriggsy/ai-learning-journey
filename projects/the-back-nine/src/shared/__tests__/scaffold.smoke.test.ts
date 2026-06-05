import { describe, it, expect } from 'vitest'
import { CONSTANTS_VINTAGE, TAX_YEAR, COVERAGE_YEAR } from '@engine/constants'

describe('scaffold smoke', () => {
  it('the test harness runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves path aliases and loads the canonical constants module', () => {
    expect(TAX_YEAR).toBe(2026)
    expect(COVERAGE_YEAR).toBe(2026)
    expect(CONSTANTS_VINTAGE).toEqual({ taxYear: 2026, coverageYear: 2026 })
  })
})
