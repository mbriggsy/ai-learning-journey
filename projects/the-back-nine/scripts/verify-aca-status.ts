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
  /**
   * THE EVIDENCE BODY — seven fields the shipped record has always carried and that this interface
   * DID NOT DECLARE until 2026-08-03, so `checkAcaStatus` could not read them and a record that
   * dropped any of them shipped a green gate.
   *
   * This is the SAME defect the 2026-08-02 pass fixed for `pinTo`/`summary`/`howToClear` (see the
   * comment on `howToClear`), one layer out: that pass fixed *declared and never read*; these were
   * *never even declared*. `adjacentButSharp` is the sharpest instance and the one the queue named —
   * it records enacted-but-unmodelled §36B changes, including Pub. L. 119-21 §71305's removal of the
   * excess-APTC repayment cap, which lands directly on a recommendation that sizes a conversion near
   * the 400%-FPL cliff. But fixing one instance of a class and leaving six is how the class survives,
   * so all seven are declared and all seven are required.
   *
   * ⚠️ REQUIRED, NOT OPTIONAL, EVEN WHEN THE HONEST ANSWER IS "NOTHING". A re-verifier who found no
   * adjacent enactment must WRITE that they looked. An absent key and an unlooked-at question are
   * indistinguishable to the next reader, which is precisely the confidence a stale record steals.
   */
  /** Why the evidence discriminates the REGIME, not merely the figures (DND 012's independent path). */
  discriminatingProof: string[]
  /** The negative-space sweep: every enacted law above the prior ceiling, checked and empty. */
  nothingEnactedChain: string[]
  /** The live vehicle that could flip the regime, and what it would actually do. */
  pendingExtension: string
  /** Whether a later enactment reaches back, and the condition a household must meet to benefit. */
  retroactivity: string
  /** Enacted-but-unmodelled §36B changes — the ones the engine prices AROUND rather than with. */
  adjacentButSharp: string
  /** When the next realistic flip window opens, so the re-verify cadence is not guesswork. */
  forwardClock: string
  /** Citations found to be fabricated or un-auditable — a dead cite confers unearned confidence. */
  strickenCitations: string
  /**
   * The re-verify chain the gate's Fix line points at (mirrors `StateTaxRecord.howToClear`,
   * `verify-state-tax.ts:62`, where it is likewise the final member). `main()` prints
   * "(see howToClear)" — so before this field existed the gate's own repair instruction named a
   * key that nothing required the record to carry, and `pinTo`/`summary` above were declared
   * required and read by nothing at all.
   */
  howToClear: string
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

  // The record's own operator-facing attestations — the mirror of `verify-state-tax.ts:95-97`,
  // which pushes a problem for an empty `primarySources`. All three are DECLARED on `AcaRecord`
  // and none was read; `main()` below prints "(see howToClear)", so the gate's own repair
  // instruction pointed at a field nothing required to exist. Falsy, NOT trimmed — the state-tax
  // mirror is falsy too (`if (!rec.status)`), and the two gates must fail on the same inputs.
  if (!rec.pinTo) problems.push('pinTo is empty (name the enacted statute / IRS notice this record pins to)')
  if (!rec.summary) problems.push('summary is empty (state in one line what the record attests)')
  if (!rec.howToClear) problems.push('howToClear is empty (the Fix line this gate prints sends the re-verifier to that field)')

  // THE EVIDENCE BODY (added 2026-08-03). Seven fields the record has always carried and that the
  // interface did not DECLARE, so nothing could read them. Same class as the three above, one layer
  // out — those were declared-and-unread; these were never declared. The messages name what an
  // honest EMPTY finding looks like, because the required answer to "did anything adjacent get
  // enacted?" is sometimes "no" — and "no, I looked" is the answer that has to be written down.
  const needProse = (key: 'pendingExtension' | 'retroactivity' | 'adjacentButSharp' | 'forwardClock' | 'strickenCitations', hint: string): void => {
    if (!rec[key]) problems.push(`${key} is empty (${hint})`)
  }
  const needChain = (key: 'discriminatingProof' | 'nothingEnactedChain', hint: string): void => {
    const v = rec[key]
    // Falsy OR empty-array OR any blank link. A `[]` satisfies `!v === false` and would sail
    // through a truthiness check while attesting nothing at all — the hollow-record shape again.
    if (!Array.isArray(v) || v.length === 0) problems.push(`${key} is empty (${hint})`)
    else if (v.some((s) => !s || typeof s !== 'string')) problems.push(`${key} carries a blank link (${hint})`)
  }
  needChain('discriminatingProof', 'name the evidence that identifies the REGIME, not just the figures — a Rev. Proc. shape LAGS the statute')
  needChain('nothingEnactedChain', 'record the enacted-law sweep above the prior ceiling, with its positive control')
  needProse('pendingExtension', 'name the live vehicle that could flip this, and what it would do — or state that none exists')
  needProse('retroactivity', 'state whether a later enactment reaches back, and the condition a household must meet')
  needProse('adjacentButSharp', 'name the enacted-but-unmodelled §36B changes the engine prices AROUND — write "none found" only after looking')
  needProse('forwardClock', 'name the next realistic flip window, so the re-verify cadence is not guesswork')
  needProse('strickenCitations', 'record any citation found fabricated or un-auditable — write "none" only after checking')

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
