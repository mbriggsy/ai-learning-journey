import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  checkStateTaxRecord,
  recordFileFor,
  type StateTaxRecord,
} from '../verify-state-tax'
import { PRICED_STATES } from '@engine/constants'

const base: StateTaxRecord = {
  state: 'NC',
  verifiedOn: '2026-07-15',
  status: 'held-3.99-flat',
  statusConfirmed: true,
  nextDue: '2026-09-01',
  attests: {
    rateSchedule: '3.99% flat, held forward',
    standardDeduction: '$25,500 MFJ / $12,750 single',
    exemptions: 'SS exempt; conversions/RMDs taxed ordinary',
  },
  primarySources: ['N.C.G.S. § 105-153.7'],
  pinTo: 'ncleg.gov',
  howToClear: 're-verify against the codified statute',
}
// FIXED timestamps (never Date.now()) so the logic tests never become a time-bomb.
const justAfter = Date.parse('2026-07-16') // fresh: before every shipped nextDue

describe('state-tax re-verify gate logic (mirrors verify:aca)', () => {
  it('passes a fresh, confirmed, well-attested record', () => {
    expect(checkStateTaxRecord('NC', base, justAfter)).toEqual([])
  })

  it('FAILS an unconfirmed record', () => {
    expect(
      checkStateTaxRecord('NC', { ...base, statusConfirmed: false }, justAfter).length,
    ).toBeGreaterThan(0)
  })

  it('FAILS a record past its nextDue (the planted-stale case)', () => {
    const pastDue = Date.parse('2026-09-02') // one day past NC's 2026-09-01 checkpoint
    expect(
      checkStateTaxRecord('NC', base, pastDue).some((p) => p.includes('nextDue')),
    ).toBe(true)
  })

  it('FAILS an invalid nextDue date', () => {
    expect(
      checkStateTaxRecord('NC', { ...base, nextDue: 'not-a-date' }, justAfter).length,
    ).toBeGreaterThan(0)
  })

  it('FAILS an invalid verifiedOn date', () => {
    expect(
      checkStateTaxRecord('NC', { ...base, verifiedOn: 'whenever' }, justAfter).length,
    ).toBeGreaterThan(0)
  })

  it('FAILS a wrong-state record in the slot (copy-paste guard)', () => {
    expect(
      checkStateTaxRecord('PA', base, justAfter).some((p) => p.includes('PA')),
    ).toBe(true)
  })

  it('FAILS a hollow attestation (a record that names no figures)', () => {
    const hollow = { ...base, attests: { rateSchedule: '', standardDeduction: '', exemptions: '' } }
    expect(checkStateTaxRecord('NC', hollow, justAfter).some((p) => p.includes('attests'))).toBe(true)
  })

  it('FAILS empty primarySources', () => {
    expect(
      checkStateTaxRecord('NC', { ...base, primarySources: [] }, justAfter).some((p) =>
        p.includes('primarySources'),
      ),
    ).toBe(true)
  })
})

describe('the shipped roster records — one per PRICED_STATE, well-formed (the missing-record gate)', () => {
  it('every PRICED_STATES record file exists and passes the checker just after verifiedOn', () => {
    // Roster-driven: this loops the SAME PRICED_STATES the gate does, so a new priced state
    // with no record fails here too (belt-and-suspenders with the gate's missing-file check).
    for (const state of PRICED_STATES) {
      const path = join(process.cwd(), recordFileFor(state))
      const rec = JSON.parse(readFileSync(path, 'utf-8')) as StateTaxRecord
      expect(checkStateTaxRecord(state, rec, justAfter), `${state} record well-formed`).toEqual([])
    }
  })

  it('the record filename convention is state-tax-<lowercode>-last-verified.json', () => {
    expect(recordFileFor('NC')).toBe('state-tax-nc-last-verified.json')
    expect(recordFileFor('FL')).toBe('state-tax-fl-last-verified.json')
  })

  it('NC carries the ~Aug-2026 certification checkpoint (nextDue 2026-09-01) + names BOTH re-checks', () => {
    const rec = JSON.parse(
      readFileSync(join(process.cwd(), recordFileFor('NC')), 'utf-8'),
    ) as StateTaxRecord
    expect(rec.nextDue, 'the certification checkpoint, not the annual cadence').toBe('2026-09-01')
    // Both re-checks named: the revenue certification AND a codified-statute re-fetch.
    expect(rec.note, 'names the FY2025-26 revenue certification').toMatch(/certification/i)
    expect(rec.note, 'names the codified-statute / session-law re-fetch').toMatch(/statute|session law|budget-deal/i)
    // The veto law stated: holds 3.99% until a lower rate pins; a pin stales saved vaults.
    expect(rec.note, 'states the hold-until-pinned veto law').toMatch(/held forward|holds 3\.99/i)
    expect(rec.note, 'a pinned change stales saved vaults (StateTaxVintageV3)').toMatch(/StateTaxVintageV3|stale/i)
  })

  it('PA + FL re-verify on the annual cadence (nextDue one year out, 2027-07-15)', () => {
    for (const state of ['PA', 'FL'] as const) {
      const rec = JSON.parse(
        readFileSync(join(process.cwd(), recordFileFor(state)), 'utf-8'),
      ) as StateTaxRecord
      expect(rec.nextDue, `${state} annual cadence`).toBe('2027-07-15')
    }
  })
})
