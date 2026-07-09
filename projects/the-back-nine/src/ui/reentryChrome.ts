/**
 * P3·U13 — the re-entry gate's pure composition (insight 048: the honesty-critical
 * decisions live in a testable seam, never inline in the component).
 *
 * Composes the balance-confirm read-back + the staleness note lines from the RAW-decoded
 * persisted scenario and the unlock-time staleness report. The read-back is the VAULT's
 * OWN figures read back per engine bucket (the KIND_TO_BUCKET map — the same grouping the
 * plan computes on, so the confirm can never disagree with the answer it fronts) plus the
 * Social Security fold-in ("are these still your benefit amounts?" — user-entered, so a
 * confirm, never a vintage clock).
 *
 * THE CONFIRM IS A PROMPT, NEVER AN ATTESTATION (council constraint (c)): nothing composed
 * here is stored, stamped, or later displayed as "confirmed on DATE" — a reflexive tap must
 * not be laundered into a freshness claim (R19).
 */
import type { ScenarioV3 } from '@shared/model'
import { KIND_TO_BUCKET } from '@intake/intakeMap'
import type { StalenessReport } from '@store/staleness'
import { copy, slots, type CopyKey } from './copy'

const formatDollar = (v: number): string => Math.round(v).toLocaleString('en-US')

export interface ReentryRow {
  /** The row's label (already-resolved copy — bucket name or the person's own name). */
  readonly label: string
  /** The formatted figure ("$412,000" / "$2,000 a month"). */
  readonly value: string
}

export interface ReentryView {
  /** Per-bucket balances, PRESENT buckets only (an empty bucket is noise, not a row). */
  readonly balanceRows: readonly ReentryRow[]
  /** The Social Security fold-in rows (one per person with a benefit entered). */
  readonly benefitRows: readonly ReentryRow[]
  /** The calm staleness note lines — every clock that fired, NAMED (empty = no drift). */
  readonly noteLines: readonly string[]
  /** The "~N years since your save" line, or null (absent savedAt / under a year —
   *  SUPPRESSED, never fabricated). */
  readonly elapsedLine: string | null
}

const BUCKET_LABEL_KEY: Readonly<Record<'pretax' | 'roth' | 'taxable' | 'hsa', CopyKey>> = {
  pretax: 'reentryBucketPretax',
  roth: 'reentryBucketRoth',
  taxable: 'reentryBucketTaxable',
  hsa: 'reentryBucketHsa',
}

export function composeReentry(scenario: ScenarioV3, report: StalenessReport): ReentryView {
  // ── the per-bucket read-back ─────────────────────────────────────────────────────────
  const sums: Record<'pretax' | 'roth' | 'taxable' | 'hsa', number> = {
    pretax: 0,
    roth: 0,
    taxable: 0,
    hsa: 0,
  }
  for (const a of scenario.enteredAccounts) sums[KIND_TO_BUCKET[a.kind]] += a.valueToday
  const balanceRows = (['pretax', 'roth', 'taxable', 'hsa'] as const).flatMap((bucket) =>
    scenario.enteredAccounts.some((a) => KIND_TO_BUCKET[a.kind] === bucket)
      ? [{ label: copy[BUCKET_LABEL_KEY[bucket]], value: `$${formatDollar(sums[bucket])}` }]
      : [],
  )

  // ── the Social Security fold-in ──────────────────────────────────────────────────────
  // `pia` is the persisted ANNUAL real benefit (stored ×12 from the monthly entry) — read
  // back monthly, the frame the statement and the intake asked in.
  const benefitRows = scenario.people.flatMap((p) =>
    p.pia > 0 ? [{ label: p.name, value: slots.reentryBenefitMonthly(formatDollar(p.pia / 12)) }] : [],
  )

  // ── the staleness note lines (every fired clock, named) ─────────────────────────────
  const noteLines: string[] = []
  if (report.spine.appDefaultMoved) noteLines.push(copy.stalenessAppDefault)
  if (report.controls.taxMoved) noteLines.push(copy.stalenessTax)
  if (report.healthcare.moved) noteLines.push(copy.stalenessHealthcare)
  if (report.date.contributionMoved || report.date.blendMoved) {
    // Route-true wording: an all-retired household has no fuck-off date to reference (and
    // its contribution clock is reader-gated quiet) — only the fund-snapshot line speaks.
    const allRetired = scenario.people.every((p) => p.workStatus === 'retired')
    noteLines.push(allRetired ? copy.stalenessBlendSpine : copy.stalenessDate)
  }
  // One line per boundary YEAR: the copy quotes only the calendar year, so two lines
  // sharing an endYear would render byte-identical sentences (and collide on the render
  // key) — the year carries the whole message once.
  const seenBoundaryYears = new Set<number>()
  for (const line of report.budget.expiredLines) {
    if (seenBoundaryYears.has(line.endCalendarYear)) continue
    seenBoundaryYears.add(line.endCalendarYear)
    noteLines.push(slots.stalenessBudgetLine(line.endCalendarYear))
  }

  // ── the wall-time line (suppressed, never fabricated) ────────────────────────────────
  const years = report.elapsed === null ? 0 : Math.floor(report.elapsed.days / 365)
  const elapsedLine = years >= 1 ? slots.reentryElapsedYears(years) : null

  return { balanceRows, benefitRows, noteLines, elapsedLine }
}
