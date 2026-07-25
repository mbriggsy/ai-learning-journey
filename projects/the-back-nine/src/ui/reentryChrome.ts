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
  /** The intro's copy key — ROUTE-TRUE (Caddie card #1, pilot-cleared 2026-07-10): an
   *  all-retired household has no paychecks, so "Markets and paychecks move" was the spouse
   *  walker's primary stumble; the retired arm speaks "benefit checks" instead. Decided HERE
   *  (the pure seam, insight 048) off the SAME all-retired predicate the note lines use. */
  readonly introKey: 'reentryIntro' | 'reentryIntroRetired'
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
  // The intro's register (Caddie card #1). It USED to double as the blend note's route-true
  // wording selector; U17 §S4 made the blend clock nameless on both routes, so this predicate
  // now has exactly one consumer (insight 087 — the comment is swept with the code it described).
  const allRetired = scenario.people.every((p) => p.workStatus === 'retired')

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

  // ── the staleness note lines (U17 §S4 — the three-way, rendered) ────────────────────
  // EVERY named line below rides a predicate `deriveStaleness` has already EXPOSURE-GATED: the
  // clock fired AND the run this report describes actually priced the thing that moved. The
  // silenced bucket reaches no line at all, and the unattributed bucket speaks exactly once,
  // namelessly, at the end. Nothing here re-derives a gate — a second copy of the decision is
  // precisely the drift the split was written to kill.
  const noteLines: string[] = []
  if (report.spine.appDefaultMoved) noteLines.push(copy.stalenessAppDefault)
  if (report.controls.taxMoved) noteLines.push(copy.stalenessTax)
  // S4/S5.4 — the state-tax clock's own line (fires only for a household whose RUN priced a
  // state whose own profile drifted; `deriveStaleness` gates on the injected producer's-output
  // priced state, so a non-priced/'elsewhere'/degenerate-overlay vault never reaches this).
  // Its OWN line, never aliased onto stalenessTax.
  if (report.controls.stateTaxMoved) noteLines.push(copy.stalenessStateTax)
  // The two healthcare families, each on its own exposure read (insight 086: this is the
  // re-point of the former single `stalenessHealthcare` push, landed in the same commit as the
  // key split). A household exposed to both gets both lines — each is true on its own terms,
  // and a clock that dates BOTH tables (`coverage-year`) raises only the families the run
  // actually priced. THE STRUCTURAL PROMISE these two lines carry: `deriveStaleness` derives
  // both booleans from the same clock→family mapping that bucketed the clock, so a named clock
  // ALWAYS has a line here — `rulesMoved` can never fire an alarm nothing is allowed to explain.
  if (report.healthcare.acaMoved) noteLines.push(copy.stalenessAca)
  if (report.healthcare.medicareMoved) noteLines.push(copy.stalenessMedicare)
  // The contribution clock only, twice-gated upstream: route (this household HAS a date, so the
  // "behind your date" wording is true) and exposure (their run actually prices a contribution
  // stream). (The blend clause left this line — it aggregates or goes silent now.)
  if (report.date.contributionMoved) noteLines.push(copy.stalenessDate)
  // THE AGGREGATE, pushed AT MOST ONCE — `ReEntry.tsx:75` keys each note <p> by its own TEXT,
  // so a second push of the same sentence would collide on the React key. One `if` over the
  // whole bucket is the structural guarantee (never a per-clock loop over `.clocks`).
  if (report.unattributed.moved) noteLines.push(copy.stalenessReferenceTables)
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
  // Round-half, floor-GATED (Caddie O6, 2026-07-10): a bare floor read a 700-day save as
  // "about a year ago" — systematic ROSIER-direction rounding on a staleness disclosure
  // (the one line whose whole job is "your save is older than you think"). Round-half keeps
  // "about" honest within ±half a year in BOTH directions; the <365-day gate is unchanged
  // (under a year stays suppressed — never fabricated up to "a year ago" by the rounding).
  const years =
    report.elapsed === null || report.elapsed.days < 365
      ? 0
      : Math.round(report.elapsed.days / 365)
  const elapsedLine = years >= 1 ? slots.reentryElapsedYears(years) : null

  return {
    introKey: allRetired ? 'reentryIntroRetired' : 'reentryIntro',
    balanceRows,
    benefitRows,
    noteLines,
    elapsedLine,
  }
}
