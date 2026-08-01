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

/**
 * ONE re-verified applicable-percentage table's identifying figures.
 *
 * ⚠️ HAND-TYPE THESE FROM THE PRIMARY DOCUMENT — never copy them out of `health.ts`. The whole
 * point is that they are an INDEPENDENT transcription: the bind arms in
 * `scripts/__tests__/verify-aca-status.test.ts` compare them against the shipped constant, so a
 * one-sided edit (table moved, record not — or record moved, table not) goes RED. Copying from the
 * constant makes the bind circular and buys nothing.
 */
export interface AcaAttestedTable {
  /** The document these figures were READ from (see `strickenCitations` — never cite unopened). */
  source: string
  /** How many FPL bands the table declares. */
  bandCount: number
  /** The lowest applicable percentage in the table (e.g. 2.1 reverted, 0 enhanced). */
  floorPct: number
  /** The highest applicable percentage in the table (e.g. 9.96 reverted, 8.5 enhanced). */
  ceilingPct: number
  /** The subsidy cliff as an FPL fraction; `null` = NO cliff (the enhanced open top band). */
  cliffFplFraction: number | null
}

export interface AcaRecord {
  verifiedOn: string
  status: string
  statusConfirmed: boolean
  maxAgeDays: number
  pinTo: string
  summary: string
  /**
   * The load-bearing TABLES the record attests — a status-only record is not a re-verify of the
   * figures the engine actually prices with. Mirrors `StateTaxRecord.attests`
   * (`verify-state-tax.ts`), whose own comment is the rule: *a hollow record is not a re-verify.*
   *
   * ⏰ WHY THIS IS NOT OPTIONAL: `acaApplicablePercentage` is re-issued by the IRS ANNUALLY (Rev.
   * Proc. 2025-25 governs plan-year 2026), and clause (ii) indexing applies to it — the enhanced
   * table's own note records that indexing does NOT apply *there*, which is what makes the base
   * table the indexed one. Before this field existed the gate read a legislative STATUS string and
   * nothing else, so a re-indexed table could ship under a green `verify:aca` indefinitely.
   */
  attests: {
    /** The 2026 REVERTED base table — the annually re-indexed one, cliff ON. */
    applicablePercentage: AcaAttestedTable
    /** The ARPA/IRA ENHANCED toggle table — fixed statutory percentages, NO cliff. */
    enhancedPercentage: AcaAttestedTable
  }
}

const MS_PER_DAY = 86_400_000

/** Pure checker (testable): returns the list of problems; empty = gate passes. */
export function checkAcaStatus(rec: Partial<AcaRecord>, nowMs: number): string[] {
  const problems: string[] = []
  if (rec.statusConfirmed !== true) problems.push('statusConfirmed is not true')
  if (!rec.status) problems.push('status is empty')

  // The record must ATTEST the percentage TABLES, not just the legislative status — a hollow
  // record is not a re-verify (the `verify-state-tax.ts` rule, applied to the ACA record).
  const checkTable = (name: string, t: Partial<AcaAttestedTable> | undefined): void => {
    if (!t) {
      problems.push(`attests.${name} is missing`)
      return
    }
    if (!t.source) problems.push(`attests.${name}.source is empty (name the document you OPENED)`)
    if (typeof t.bandCount !== 'number' || t.bandCount <= 0)
      problems.push(`attests.${name}.bandCount must be a positive number`)
    if (typeof t.floorPct !== 'number' || typeof t.ceilingPct !== 'number') {
      problems.push(`attests.${name} must carry numeric floorPct + ceilingPct`)
    } else if (t.floorPct > t.ceilingPct) {
      problems.push(`attests.${name}.floorPct (${t.floorPct}) exceeds ceilingPct (${t.ceilingPct})`)
    }
    // `null` is MEANINGFUL here (the enhanced regime has no cliff) — only undefined/non-numeric fails.
    if (t.cliffFplFraction !== null && typeof t.cliffFplFraction !== 'number')
      problems.push(`attests.${name}.cliffFplFraction must be a number, or null for "no cliff"`)
  }
  if (!rec.attests) {
    problems.push(
      'attests is missing — a status-only record does not re-verify the percentage TABLES the engine prices with',
    )
  } else {
    checkTable('applicablePercentage', rec.attests.applicablePercentage)
    checkTable('enhancedPercentage', rec.attests.enhancedPercentage)
  }

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
