import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkAcaStatus, type AcaRecord } from '../verify-aca-status'
import { acaEnhancedSubsidyStatus, solverAcaFreshnessWindowDays } from '@engine/constants'

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

/**
 * THE SHIPPED RECORD ↔ THE ENGINE CONSTANTS — the drift seam that makes a stale ACA fact SILENT.
 *
 * EVERY ARM ABOVE IS FIXTURE-BASED. They prove the CHECKER's logic and touch the shipped record
 * exactly never, which is why this seam survived: the same ACA facts are hand-typed in TWO
 * independent places that feed TWO DIFFERENT CONSUMERS, and nothing compared them.
 *
 *   `aca-last-verified.json`            → read by `verify:aca` (scripts/verify-aca-status.ts) = CI
 *   `acaEnhancedSubsidyStatus` (health) → read by `oracleToken.ts:178-198` = the RUNTIME WITHHOLD
 *
 * `solver.ts:67` already states the contract in prose — *"one calendar, two enforcement layers"* —
 * and prose is not enforcement. The failure mode is asymmetric and quiet in the dangerous
 * direction: a re-verifier who updates ONLY the JSON ships a green CI, and then the product keeps
 * computing freshness off the STALE constant and silently withholds the recommendation from every
 * pre-65 Marketplace household, with every gate green and nothing on any surface naming the cause.
 * The reverse (constant fresh, record stale) is loud — CI reds — which is exactly why the quiet
 * direction is the one that needed a test.
 *
 * ⏰ THIS IS A DATED SEAM, NOT A HYPOTHETICAL: the record's own 30-day window reds 2026-08-25, so it
 * gets hand-edited on a known schedule. These arms fire at the moment of that edit.
 *
 * NOTE FOR A DELIBERATE DIVERGENCE: if the two windows are ever intentionally split, CI's must stay
 * ≤ the runtime's, or the build gate stops being the early warning for the withhold.
 */
describe('the shipped ACA record binds to the engine constants (the unguarded drift seam)', () => {
  const record = JSON.parse(
    readFileSync(join(process.cwd(), 'aca-last-verified.json'), 'utf-8'),
  ) as AcaRecord

  it('the verified DATE is identical in the record and in the engine constant', () => {
    expect(
      acaEnhancedSubsidyStatus.value.verifiedOn,
      'health.ts and aca-last-verified.json each hand-type this date, and they feed different ' +
        'consumers (the runtime withhold vs the CI gate). Updating one alone ships green CI over a ' +
        'product that withholds from every pre-65 Marketplace household. Re-verify BOTH.',
    ).toBe(record.verifiedOn)
  })

  it('the freshness WINDOW is identical in the record and in the solver constant', () => {
    expect(
      solverAcaFreshnessWindowDays.value,
      'solver.ts:67 promises "one calendar, two enforcement layers" — the engine-side ' +
        '`aca-unverified` refusal and the CI-side red must fire on the same day.',
    ).toBe(record.maxAgeDays)
  })

  it('the record CARRIES maxAgeDays — the `?? 30` fallback must never silently supply it', () => {
    // verify-aca-status.ts:39/:65 default to 30 when the field is absent, so a record that LOSES
    // the key still passes at 30 days while the file no longer states its own window — the gate
    // would be enforcing a number nobody wrote down. PRESENCE is this arm's whole job; the VALUE
    // is the arm above, kept separate so the two failures name different repairs.
    expect(
      Object.hasOwn(record, 'maxAgeDays'),
      'the record must state its own window rather than inherit the `?? 30` fallback',
    ).toBe(true)
  })

  it('the engine prose dates its own enactment check to the SAME day it was verified', () => {
    // `pendingExtension` asserts "NOT enacted as of <date>". A re-verify that moves `verifiedOn`
    // and leaves the prose behind leaves a claim about when we last checked enactment that is
    // simply false — insight 087's class, inside the record that the whole gate protects.
    expect(
      acaEnhancedSubsidyStatus.value.pendingExtension,
      'the "NOT enacted as of …" claim must name the verified date, or it is a stale attestation',
    ).toContain(record.verifiedOn)
  })

  it('the engine names the SAME regime the record does', () => {
    // The status word is the thing that flips the entire pre-65 calculus. If the record ever reads
    // "restored" while the constant still describes the reverted regime, the two halves of the
    // product disagree about the world — and this is the one event the whole gate exists for.
    expect(
      acaEnhancedSubsidyStatus.value.regime2026,
      `the record's status is "${String(record.status)}" — the engine's regime prose must say so too`,
    ).toContain(String(record.status))
  })
})
