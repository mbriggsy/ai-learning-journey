/**
 * State-income-tax re-verify gate — the state-tax unit's S6 hook; the CI mirror of
 * verify:aca (scripts/verify-aca-status.ts) for the priced roster {NC, PA, FL}.
 *
 * The roster's rate schedules, standard deductions, and exemption treatments are
 * transcribed from state statute / DOR primaries (src/engine/constants/stateTax.ts) and
 * flagged `directionalUntilPinned` until re-verified. A stale assumption is the
 * cardinal-sin-optimistic direction:
 *  - NC prices an ENACTED STEP SCHEDULE — S.L. 2026-41 (SB 257) § 44.1(a), pinned
 *    2026-08-02: 2026 = 3.99%, 2027-2029 = 3.49%, 2030-2032 = 3.24%, after 2032 = 2.99%.
 *    The hawk veto that held 3.99% flat is RETIRED (its one stated reason — the schedule
 *    "could not be located to primary session law" — no longer holds; it is located).
 *    The same section STRUCK every revenue-trigger row from FY2025-26 through FY2032-33,
 *    so the FY2025-26 certification this header used to wait on now gates NOTHING. The
 *    first SURVIVING trigger is FY2033-34 → TY2035 (0.25pp step, 2.49% floor), i.e. the
 *    Office of the State Controller's ~Aug-2034 accounting — a decade out, and the only
 *    mechanism left that can move these rates can only CUT them.
 *    ⚠️ SOURCE LANDMINE: at pin time NCDOR's rate-schedules page AND the codified G.S.
 *    105-153.7 page both still showed the struck "after 2025 — 3.99%". Both read as
 *    CONTRADICTING the record until they recompile. Session law wins — do NOT "correct"
 *    the engine table back to a 3.99% flat.
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
  /** Absolute next-due date (NOT a rolling window), judged PER RECORD; past it → build fails.
   *  One ANNUAL drift cadence for every priced state (NC's ~Aug-2026 checkpoint retired 2026-08-02
   *  when S.L. 2026-41 struck the trigger rows that fed it) — but a shared cadence is NOT a shared
   *  DEADLINE: each date is that state's own anniversary, so the roster's real deadline is the EARLIEST. */
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
