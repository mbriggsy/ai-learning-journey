import { describe, it, expect } from 'vitest'
import { checkAcaStatus, type AcaRecord } from '../verify-aca-status'

const base: AcaRecord = {
  verifiedOn: '2026-06-04',
  status: 'reverted',
  statusConfirmed: true,
  maxAgeDays: 30,
  pinTo: 'enacted statute / IRS notice',
  summary: 'reverted to pre-ARPA cliff regime',
}
const dayAfter = Date.parse('2026-06-05')

describe('ACA enhanced-subsidy re-verify gate logic', () => {
  it('passes a fresh, confirmed record', () => {
    expect(checkAcaStatus(base, dayAfter)).toEqual([])
  })

  it('FAILS an unconfirmed record', () => {
    expect(checkAcaStatus({ ...base, statusConfirmed: false }, dayAfter).length).toBeGreaterThan(0)
  })

  it('FAILS a record older than its window (the planted-stale case)', () => {
    const wayLater = Date.parse('2026-09-01') // ~89 days > 30-day window
    expect(checkAcaStatus(base, wayLater).some((p) => p.includes('days old'))).toBe(true)
  })

  it('FAILS an invalid verifiedOn date', () => {
    expect(checkAcaStatus({ ...base, verifiedOn: 'not-a-date' }, dayAfter).length).toBeGreaterThan(0)
  })
})
