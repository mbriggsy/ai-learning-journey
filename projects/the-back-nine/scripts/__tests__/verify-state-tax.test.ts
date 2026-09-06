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
  it('every PRICED_STATES record file exists, passes the checker just after verifiedOn, and is judged on its OWN nextDue — the roster reds at the EARLIEST date, never the latest', () => {
    // Roster-driven: this loops the SAME PRICED_STATES the gate does, so a new priced state
    // with no record fails here too (belt-and-suspenders with the gate's missing-file check).
    const roster = PRICED_STATES.map((state) => {
      const path = join(process.cwd(), recordFileFor(state))
      const rec = JSON.parse(readFileSync(path, 'utf-8')) as StateTaxRecord
      expect(checkStateTaxRecord(state, rec, justAfter), `${state} record well-formed`).toEqual([])
      return { state, rec, dueMs: Date.parse(rec.nextDue) }
    })

    // A shared ANNUAL cadence is NOT a shared DEADLINE: each `nextDue` is that state's own
    // verification anniversary, and `main()` calls `checkStateTaxRecord` once per state
    // (`verify-state-tax.ts:120`, `:135`) against that record's own date (`:104-112`). So one day
    // past the EARLIEST date on the roster the gate is ALREADY red while every later-dated record
    // is still green — the roster's effective deadline is the earliest, never the latest. Written
    // date-agnostically so it cannot rot when a record is re-verified (and it still holds if the
    // dates ever converge); it REDS if the roster is ever judged against one shared/latest date,
    // which is the unsafe direction — that refactor would silently swallow the earlier deadline.
    const earliestMs = Math.min(...roster.map((r) => r.dueMs))
    const dayPastEarliest = earliestMs + 86_400_000
    for (const { state, rec, dueMs } of roster) {
      const overdue = checkStateTaxRecord(state, rec, dayPastEarliest).some((p) =>
        p.includes('past its nextDue'),
      )
      expect(overdue, `${state} (nextDue ${rec.nextDue}) one day past the roster's earliest`).toBe(
        dueMs === earliestMs,
      )
    }
  })

  it('the record filename convention is state-tax-<lowercode>-last-verified.json', () => {
    expect(recordFileFor('NC')).toBe('state-tax-nc-last-verified.json')
    expect(recordFileFor('FL')).toBe('state-tax-fl-last-verified.json')
  })

  it('NC re-verifies on the ANNUAL cadence post-pin (nextDue 2027-08-02) and records the pin, its successor checkpoint, and the stale-source trap', () => {
    const rec = JSON.parse(
      readFileSync(join(process.cwd(), recordFileFor('NC')), 'utf-8'),
    ) as StateTaxRecord
    expect(rec.nextDue, 'the annual cadence — the ~Aug-2026 certification checkpoint is retired').toBe('2027-08-02')
    // WHY it is retired, by name: S.L. 2026-41 enacted the schedule and struck the trigger rows
    // the FY2025-26 certification fed. Provenance must be in the record, not just the constant.
    expect(rec.note, 'names the enacting session law').toMatch(/2026-41/)
    expect(rec.note, 'explains what became of the certification').toMatch(/certification/i)
    // A retired checkpoint must be REPLACED, never merely deleted — the next real flip event is
    // the Office of the State Controller's August-2034 accounting (the first surviving trigger row).
    expect(rec.note, 'names the successor live-flip checkpoint (OSC August 2034)').toMatch(/2034/)
    // The stale-source trap: two official-looking pages still show the STRUCK 3.99% row, so the
    // next re-verifier will meet apparent contradictions and must not "correct" the table back.
    expect(rec.note, 'warns that NCDOR + the codified G.S. page lag the session law').toMatch(/NCDOR/i)
    // A pinned change stales saved vaults (StateTaxVintageV3).
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
