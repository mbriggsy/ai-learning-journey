import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkAcaStatus, type AcaRecord } from '../verify-aca-status'
import {
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  acaEnhancedSubsidyStatus,
  solverAcaFreshnessWindowDays,
  type AcaApplicablePercentageTable,
} from '@engine/constants'

const base: AcaRecord = {
  verifiedOn: '2026-06-04',
  status: 'reverted',
  statusConfirmed: true,
  maxAgeDays: 30,
  pinTo: 'enacted statute / IRS notice',
  summary: 'reverted to pre-ARPA cliff regime',
  attests: {
    applicablePercentage: {
      source: 'IRS Rev. Proc. 2025-25 §3.01 (fixture)',
      bandCount: 6,
      floorPct: 2.1,
      ceilingPct: 9.96,
      cliffFplFraction: 4.0,
    },
    enhancedPercentage: {
      source: 'IRC §36B(b)(3)(A)(iii) (fixture)',
      bandCount: 6,
      floorPct: 0,
      ceilingPct: 8.5,
      cliffFplFraction: null,
    },
  },
  howToClear: 're-verify against an enacted statute / IRS notice, then re-type attests from it (fixture)',
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

  // --- the HOLLOW-RECORD arms: a status-only record is not a re-verify of the TABLES ---

  it('FAILS a status-only record (no attests — the pre-2026-08-01 shape), and FAILS an EMPTY pinTo / summary / howToClear', () => {
    const { attests: _dropped, ...statusOnly } = base
    expect(checkAcaStatus(statusOnly, dayAfter).some((p) => p.includes('attests is missing'))).toBe(
      true,
    )
    // The three fields the interface DECLARES and `main()`'s Fix line POINTS AT — declared and
    // never read until 2026-08-02. Each is EMPTIED alone (never deleted) and the WHOLE problem
    // list is asserted: the emptied field must be the only complaint, so a check that fires on
    // ABSENCE rather than EMPTINESS (`rec.pinTo === undefined`) returns [] here and goes RED.
    // Emptiness is the routing that matters — a `delete` / `Object.hasOwn` probe would sail
    // straight through that mutant. The `toEqual([])` on this same fixture at the top of the
    // describe is the non-vacuity receipt, and it is the SAME predicate strength, not a weaker one.
    expect(checkAcaStatus({ ...base, pinTo: '' }, dayAfter)).toEqual([
      'pinTo is empty (name the enacted statute / IRS notice this record pins to)',
    ])
    expect(checkAcaStatus({ ...base, summary: '' }, dayAfter)).toEqual([
      'summary is empty (state in one line what the record attests)',
    ])
    expect(checkAcaStatus({ ...base, howToClear: '' }, dayAfter)).toEqual([
      'howToClear is empty (the Fix line this gate prints sends the re-verifier to that field)',
    ])
  })

  it('FAILS a record attesting a table with no source (never cite what you did not open)', () => {
    const rec = { ...base, attests: { ...base.attests, applicablePercentage: { ...base.attests.applicablePercentage, source: '' } } }
    expect(checkAcaStatus(rec, dayAfter).some((p) => p.includes('source is empty'))).toBe(true)
  })

  it('FAILS an inverted band (floorPct above ceilingPct — a transcription slip)', () => {
    const rec = { ...base, attests: { ...base.attests, applicablePercentage: { ...base.attests.applicablePercentage, floorPct: 12 } } }
    expect(checkAcaStatus(rec, dayAfter).some((p) => p.includes('exceeds ceilingPct'))).toBe(true)
  })

  it('ACCEPTS a null cliff — "no cliff" is MEANINGFUL, not missing (the enhanced open top band)', () => {
    // The guard must not treat the enhanced regime's absent cliff as an incomplete record; only a
    // non-null non-number may fail. Getting this backwards would red the gate on a correct record.
    expect(checkAcaStatus(base, dayAfter)).toEqual([])
    // The checker's REAL input is `JSON.parse` output, which no type can constrain — `Partial`
    // loosens only the top level. This cast models the malformed file the gate exists to reject;
    // without it TypeScript forbids writing the very shape being tested.
    const undef = {
      ...base,
      attests: {
        ...base.attests,
        enhancedPercentage: { ...base.attests.enhancedPercentage, cliffFplFraction: undefined },
      },
    } as unknown as Partial<AcaRecord>
    expect(checkAcaStatus(undef, dayAfter).some((p) => p.includes('cliffFplFraction'))).toBe(true)
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

  it('the record CARRIES maxAgeDays (never the `?? 30` fallback) and PASSES the checker that reads it', () => {
    // verify-aca-status.ts defaults to 30 in BOTH places it reads the window (`rec.maxAgeDays ?? 30`
    // in the checker, and again in main()'s OK log), so a record that LOSES the key still passes at
    // 30 days while the file no longer states its own window — the gate would be enforcing a number
    // nobody wrote down. PRESENCE is this half's job; the VALUE is the arm above, kept separate so
    // the two failures name different repairs. (Cited by NAME, not by line: the previous ":39/:65"
    // anchor here had rotted by ~67 lines.)
    expect(
      Object.hasOwn(record, 'maxAgeDays'),
      'the record must state its own window rather than inherit the `?? 30` fallback',
    ).toBe(true)
    // …and the SHIPPED record must satisfy the checker that reads it — the state-tax mirror
    // (`it('every PRICED_STATES record file exists and passes the checker just after verifiedOn')`
    // in verify-state-tax.test.ts) has always asserted this and the ACA side never did. This guards
    // a DATA regression, NOT a code mutant: no one-line source change is killed by this arm alone —
    // inverting any check reds the fixture arms above first. It catches a re-verifier who empties
    // pinTo / summary / howToClear in aca-last-verified.json while every fixture arm stays green.
    // Evaluated at a FIXED instant DERIVED from the record's own date (never Date.now(), never a
    // hard-coded day): one day after verifiedOn is inside the record's stated 30-day window, so this
    // isolates SHAPE from FRESHNESS and can never become a time bomb.
    expect(
      checkAcaStatus(record, Date.parse(record.verifiedOn) + 86_400_000),
      'aca-last-verified.json must satisfy the gate that reads it — shape, independent of staleness',
    ).toEqual([])
  })

  /**
   * THE TABLE BIND (added 2026-08-01). The arms above bind the record's LEGISLATIVE facts — the
   * date, the window, the enactment prose. They say nothing about the two applicable-percentage
   * TABLES the engine actually prices every pre-65 Marketplace household with, and both of those
   * carry `reVerifyEveryBuild: true` while being gated by PROXY ONLY: they rode this record's
   * freshness clock without the record ever asserting a single one of their figures.
   *
   * ⏰ THIS IS ANNUAL DRIFT, NOT A HYPOTHETICAL. `acaApplicablePercentage` comes from an IRS Rev.
   * Proc. re-issued EVERY YEAR (2025-25 governs plan-year 2026) and clause (ii) indexing applies to
   * it — the enhanced table's own note records that indexing does NOT apply *there*, which is
   * precisely what makes the base table the indexed one. So the shipped table has a known, dated
   * way of going quietly stale, and before these arms nothing compared it to anything.
   *
   * The figures are DERIVED from the constant here and compared to a HAND-TYPED transcription in
   * the record. That is the whole design: if the next re-verifier copies the record's numbers out
   * of `health.ts` instead of out of the Rev. Proc., the bind is circular and buys nothing —
   * `howToClear` step 6 says so in the record itself.
   */
  const derive = (t: AcaApplicablePercentageTable) => ({
    bandCount: t.bands.length,
    floorPct: Math.min(...t.bands.map((b) => b.applicablePctLow)),
    ceilingPct: Math.max(...t.bands.map((b) => b.applicablePctHigh)),
    cliffFplFraction: t.cliffFplFraction,
  })

  it('the REVERTED table matches what the record attests (the annually re-indexed one)', () => {
    const { source: _s, ...attested } = record.attests.applicablePercentage
    expect(
      derive(acaApplicablePercentage.value),
      'src/engine/constants/health.ts and aca-last-verified.json now each state this table. The ' +
        'IRS re-issues it ANNUALLY, so the dangerous direction is a new Rev. Proc. landing while ' +
        'the shipped table stays put and `verify:aca` keeps passing on a status string. Re-type ' +
        'the record FROM the document (howToClear step 6), then move whichever side is wrong.',
    ).toEqual(attested)
  })

  it('the ENHANCED toggle table matches what the record attests (fixed statute, no cliff)', () => {
    const { source: _s, ...attested } = record.attests.enhancedPercentage
    expect(
      derive(acaApplicablePercentageEnhanced.value),
      'clause (ii) indexing does NOT apply to the enhanced percentages, so this table moves only ' +
        'if Congress acts — but the pending 2026 extension is exactly such an act, and it is the ' +
        'regime the engine TOGGLES to. A silent edit here re-prices every enhanced-regime run.',
    ).toEqual(attested)
  })

  it('the two tables disagree on the CLIFF, and that difference is the whole regime split', () => {
    // A non-vacuity guard on the pair above: if a careless edit ever made the two attestations
    // identical, both binds would still pass while the record stopped describing two regimes.
    expect(record.attests.applicablePercentage.cliffFplFraction).toBe(4.0)
    expect(record.attests.enhancedPercentage.cliffFplFraction).toBeNull()
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
