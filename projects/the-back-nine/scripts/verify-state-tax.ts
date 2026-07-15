/**
 * State-income-tax re-verify gate — the state-tax unit's S6 hook; the CI mirror of
 * verify:aca (scripts/verify-aca-status.ts) for the priced roster {NC, PA, FL}.
 *
 * The roster's rate schedules, standard deductions, and exemption treatments are
 * transcribed from state statute / DOR primaries (src/engine/constants/stateTax.ts) and
 * flagged `directionalUntilPinned` until re-verified. A stale assumption is the
 * cardinal-sin-optimistic direction:
 *  - NC holds 3.99% FLAT under the hawk veto (§V). The codified 2027+ cuts are
 *    revenue-trigger-conditional (the FY2025-26 certification lands ~Aug 2026) and the
 *    reported budget-deal schedule is unlocated at primary. The instant a LOWER rate pins,
 *    the table must add a step and stale saved vaults (the StateTaxVintageV3 clock); until
 *    then a stale record must not let the build ship on an unverified rate. NC's record
 *    carries the ~Aug-2026 certification checkpoint as its `nextDue`.
 *  - PA / FL are stable (flat 3.07% since 2004 / a constitutional $0) but still re-verified
 *    ANNUALLY for drift.
 *
 * A build must not ship on a STALE, UNCONFIRMED, MALFORMED, or MISSING state-tax record
 * just because no human remembered to check — so this fails the build (exit 1) when any
 * priced state's record is absent, hollow, unconfirmed, or past its `nextDue`.
 *
 * The roster is SINGLE-SOURCED from PRICED_STATES: adding a state to the priced roster
 * automatically demands its own re-verify record here — never a silent gap.
 *
 * To clear a red gate: re-verify the CURRENT figures against the codified statute / DOR
 * primary, then update that state's `state-tax-<code>-last-verified.json`. Do NOT just bump
 * the date — re-verify the law (NC's rate flips the out-year RMD/withdrawal stream).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRICED_STATES } from '@engine/constants'

/** What one priced state's re-verify record attests + how the gate reads it. */
export interface StateTaxRecord {
  /** The state code — must match the record's filename slot (copy-paste guard). */
  state: string
  verifiedOn: string
  status: string
  statusConfirmed: boolean
  /** Absolute next-due date (NOT a rolling window): NC carries the ~Aug-2026 checkpoint,
   *  PA/FL an annual cadence. Past it → the build fails until re-verified. */
  nextDue: string
  /** The load-bearing figures the record attests — a hollow record is not a re-verify. */
  attests: {
    rateSchedule: string
    standardDeduction: string
    exemptions: string
  }
  primarySources: string[]
  pinTo: string
  note?: string
  howToClear: string
}

const MS_PER_DAY = 86_400_000

/** The record filename for a priced state code (lowercased — mirrors aca-last-verified.json). */
export const recordFileFor = (state: string): string =>
  `state-tax-${state.toLowerCase()}-last-verified.json`

/** Pure checker (testable): the list of problems for ONE state's record; empty = passes. */
export function checkStateTaxRecord(
  expectedState: string,
  rec: Partial<StateTaxRecord>,
  nowMs: number,
): string[] {
  const problems: string[] = []

  // Copy-paste guard: the wrong state's record in this slot must fail loud.
  if (rec.state !== expectedState) {
    problems.push(
      `state field is ${JSON.stringify(rec.state)} but this is the ${expectedState} record`,
    )
  }
  if (rec.statusConfirmed !== true) problems.push('statusConfirmed is not true')
  if (!rec.status) problems.push('status is empty')

  // The record must ATTEST the load-bearing figures — a hollow record is not a re-verify.
  const a = rec.attests
  if (!a || !a.rateSchedule || !a.standardDeduction || !a.exemptions) {
    problems.push(
      'attests is missing a load-bearing figure (rateSchedule / standardDeduction / exemptions)',
    )
  }
  if (!Array.isArray(rec.primarySources) || rec.primarySources.length === 0) {
    problems.push('primarySources is empty (name the codified statute / DOR primary)')
  }

  const verifiedMs = rec.verifiedOn ? Date.parse(rec.verifiedOn) : Number.NaN
  if (Number.isNaN(verifiedMs)) {
    problems.push(`verifiedOn is not a valid date: ${String(rec.verifiedOn)}`)
  }

  const dueMs = rec.nextDue ? Date.parse(rec.nextDue) : Number.NaN
  if (Number.isNaN(dueMs)) {
    problems.push(`nextDue is not a valid date: ${String(rec.nextDue)}`)
  } else if (nowMs > dueMs) {
    const overdue = Math.floor((nowMs - dueMs) / MS_PER_DAY)
    problems.push(
      `record is ${overdue} day(s) past its nextDue (${String(rec.nextDue)}) — re-verify the ${expectedState} figures`,
    )
  }
  return problems
}

function main(): number {
  const nowMs = Date.now()
  let failed = false

  for (const state of PRICED_STATES) {
    const file = recordFileFor(state)
    const path = join(process.cwd(), file)
    let rec: Partial<StateTaxRecord>
    try {
      rec = JSON.parse(readFileSync(path, 'utf-8')) as Partial<StateTaxRecord>
    } catch (e) {
      console.error(`[verify:state-tax] ${state}: cannot read ${file}: ${(e as Error).message}`)
      console.error(
        `  Fix: create ${file} attesting the ${state} rate schedule, standard deduction, and exemption treatments (copy an existing state's record shape).`,
      )
      failed = true
      continue
    }

    const problems = checkStateTaxRecord(state, rec, nowMs)
    if (problems.length > 0) {
      console.error(`[verify:state-tax] ${state} re-verify gate FAILED (${file}):`)
      for (const p of problems) console.error(`  - ${p}`)
      failed = true
    } else {
      console.log(
        `[verify:state-tax] OK — ${state} "${String(rec.status)}" verified ${String(rec.verifiedOn)}, next due ${String(rec.nextDue)}.`,
      )
    }
  }

  if (failed) {
    console.error(
      "[verify:state-tax] Fix: re-verify the CURRENT figures against the codified statute / DOR primary, then update that state's state-tax-<code>-last-verified.json (see its howToClear). Do NOT just bump the date.",
    )
    return 1
  }
  console.log(`[verify:state-tax] OK — all ${PRICED_STATES.length} priced-state records fresh + confirmed.`)
  return 0
}

// Run as a script, not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
