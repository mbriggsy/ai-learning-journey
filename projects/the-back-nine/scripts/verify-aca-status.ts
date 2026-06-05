/**
 * ACA enhanced-subsidy re-verify gate — the CI half of the constants module's
 * `reVerifyEveryBuild` flag (cross-cutting contract #6; roadmap Validation Gates).
 *
 * The pre-65 ACA legislative status (enhanced subsidies expired 2025-12-31; a
 * possibly-retroactive extension is pending) can flip the entire pre-65 model and
 * INVERT which strategy wins. A build must not ship on a STALE or UNCONFIRMED
 * assumption just because no human remembered to check — so this fails the build
 * (exit 1) when aca-last-verified.json is older than its window or unconfirmed.
 *
 * To clear a red gate: re-verify the CURRENT status against an enacted statute /
 * IRS notice, then update aca-last-verified.json. Do NOT just bump the date.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface AcaRecord {
  verifiedOn: string
  status: string
  statusConfirmed: boolean
  maxAgeDays: number
  pinTo: string
  summary: string
}

const MS_PER_DAY = 86_400_000

/** Pure checker (testable): returns the list of problems; empty = gate passes. */
export function checkAcaStatus(rec: Partial<AcaRecord>, nowMs: number): string[] {
  const problems: string[] = []
  if (rec.statusConfirmed !== true) problems.push('statusConfirmed is not true')
  if (!rec.status) problems.push('status is empty')

  const verifiedMs = rec.verifiedOn ? Date.parse(rec.verifiedOn) : Number.NaN
  if (Number.isNaN(verifiedMs)) {
    problems.push(`verifiedOn is not a valid date: ${String(rec.verifiedOn)}`)
  } else {
    const window = rec.maxAgeDays ?? 30
    const ageDays = (nowMs - verifiedMs) / MS_PER_DAY
    if (ageDays > window) {
      problems.push(`record is ${Math.floor(ageDays)} days old (window ${window}d) — re-verify the ACA status`)
    }
  }
  return problems
}

function main(): number {
  const path = join(process.cwd(), 'aca-last-verified.json')
  let rec: Partial<AcaRecord>
  try {
    rec = JSON.parse(readFileSync(path, 'utf-8')) as Partial<AcaRecord>
  } catch (e) {
    console.error(`[verify:aca] cannot read ${path}: ${(e as Error).message}`)
    return 1
  }

  const problems = checkAcaStatus(rec, Date.now())
  if (problems.length > 0) {
    console.error('[verify:aca] ACA enhanced-subsidy re-verify gate FAILED:')
    for (const p of problems) console.error(`  - ${p}`)
    console.error('  Fix: re-verify the current ACA status against an enacted statute / IRS notice, then update aca-last-verified.json (see howToClear).')
    return 1
  }
  console.log(`[verify:aca] OK — ACA status "${String(rec.status)}" verified ${String(rec.verifiedOn)} (window ${rec.maxAgeDays ?? 30}d).`)
  return 0
}

// Run as a script, not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main())
}
