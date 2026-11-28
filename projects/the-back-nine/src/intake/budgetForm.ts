/**
 * The budget worksheet's pure rules (`BudgetBuilder.tsx`'s and `BudgetLineItem.tsx`'s, moved out unchanged by Act 6 ·
 * RC13b so the walk's builder and the Profile → Expenses Living expenses drawer read one rule): a fresh line, the
 * reconciliation readout's lines, what Apply does with the staged lines, and each line error's words and the box it shows
 * under. Gap 4's U8 adds how a line's cost changes (read off and written to `growthRate`), the rate's and the repeat's
 * read-backs, and the first-year words where a repeat is charged in year 0.
 */
import { copy, slots, type CopyKey } from '@ui/copy'
import type { BudgetLineItem as BudgetLine } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { growthRateInRange } from '@shared/spendingBounds'
import { isActiveAt, isRampedBudget, repeatsOnAtYearZero, type BudgetItemError, type BudgetValidation } from '@budget/budgetModel'
import { anchorTarget } from '@budget/budgetToSpending'
import { formatMoney } from './moneyFormat'
import { medicalExceedsTotal } from './budgetChecks'
import { lineDisplayName } from './budgetLines'
import { ratedLineFactor } from './priceFrame'

/** A fresh line: `other` + essentials (the neutral unclassified pick — errs STICKY, insight 055's
 *  conservative direction) with NO amount (NaN blocks Apply until typed — never a silent 0), under the
 *  stable id its Add minted (schema version 6). */
export const freshLine = (id: string): BudgetLine => ({
  id,
  category: 'other',
  label: '',
  annualAmountReal: Number.NaN,
  tier: 'essentials',
  startYear: 0,
})

export const BUDGET_ERROR_COPY: Record<BudgetItemError['kind'], CopyKey> = {
  'non-finite-amount': 'errBudgetAmountNonFinite',
  'negative-amount': 'errBudgetAmountNegative',
  'non-integer-window': 'errBudgetWindowNonInteger',
  'negative-start': 'errBudgetWindowNegativeStart',
  'reversed-window': 'errBudgetWindowReversed',
  'repeat-out-of-range': 'errBudgetRepeatRange',
  'rate-out-of-range': 'errBudgetRateRange',
}

/** Where a line shows each error: under its amount, its From year (the window's), its repeat or its rate box. */
export type LineErrorSlot = 'amount' | 'window' | 'repeat' | 'rate'
const ERROR_SLOT: Record<BudgetItemError['kind'], LineErrorSlot> = {
  'non-finite-amount': 'amount',
  'negative-amount': 'amount',
  'non-integer-window': 'window',
  'negative-start': 'window',
  'reversed-window': 'window',
  'repeat-out-of-range': 'repeat',
  'rate-out-of-range': 'rate',
}
export const lineErrorSlot = (e: BudgetItemError): LineErrorSlot => ERROR_SLOT[e.kind]

// ── How a line's cost changes (gap 4's U8; KTD4) ────────────────────────────────────────────────────────────────────

/** The three answers, read off the stored field: absent goes up with prices, 0 stays the same dollar amount, anything
 *  else (a percent above 0, or NaN while the box is blank) goes up by the household's own percent. So a 0 typed in the
 *  box reads back as "Stays the same dollar amount", the one meaning 0 has (the plan's readers' minor finding). */
export type LineChange = 'prices' | 'same' | 'rate'
export function lineChangeOf(line: BudgetLine): LineChange {
  if (line.growthRate === undefined) return 'prices'
  return line.growthRate === 0 ? 'same' : 'rate'
}

/** The line with that answer written: "with prices" removes the key (never an undefined-valued one, DND 009); "the same"
 *  writes 0; "up by" keeps a percent already there, or takes `lastRate` (the one this row held before), or stages NaN,
 *  which the validator refuses until a figure is typed (`rate-out-of-range`). */
export function withLineChange(line: BudgetLine, change: LineChange, lastRate: number | undefined): BudgetLine {
  const { growthRate: _dropped, ...rest } = line
  if (change === 'prices') return rest
  if (change === 'same') return { ...rest, growthRate: 0 }
  if (lineChangeOf(line) === 'rate') return line
  return { ...rest, growthRate: lastRate !== undefined && lastRate > 0 ? lastRate : Number.NaN }
}

/** The read-back's year: the plan's first year plus this many (KTD4: the engine's calendar year, never the wall clock). */
export const RATE_READ_BACK_YEARS = 10

/**
 * Under a line that doesn't go up with prices (R11): what it costs `RATE_READ_BACK_YEARS` after the plan's first year, in
 * today's dollars, through the run's own factor (`ratedLineFactor`, never a second derivation), and whether that is
 * slower or faster than prices (within 1 % of the typed amount: about the same). Null while the amount or the rate is not
 * a figure the run would take. A $10,000 line that stays the same dollar amount on a 2026 plan: about $7,355 in 2036.
 */
export function rateReadBack(line: BudgetLine, startCalendarYear: number): string | null {
  const g = line.growthRate
  if (g === undefined || !Number.isFinite(g) || !growthRateInRange(g)) return null
  if (!Number.isFinite(line.annualAmountReal) || line.annualAmountReal < 0) return null
  const factor = ratedLineFactor(g, startCalendarYear, RATE_READ_BACK_YEARS)
  const pace = Math.abs(factor - 1) <= 0.01 ? 'same' : factor < 1 ? 'slower' : 'faster'
  return slots.budgetRateReadBack(pace, startCalendarYear + RATE_READ_BACK_YEARS, formatMoney(line.annualAmountReal * factor), line.everyYears !== undefined)
}

/**
 * What the lines that change at their own rate add to the year-0 levels when those levels are quoted for a later sim
 * year `t` (the date route's first year after work stops, the band's own crowned offset): each such line on in year 0
 * costs its typed amount × (the run's factor at `t` − 1) more, through `ratedLineFactor`, the run's own figure. Exactly 0
 * with no rated line on in year 0, or at t = 0. The year-0 reconcilers stay on typed amounts (gap 4's KTD6); only a
 * sentence that names the first retired year's spending reads this.
 */
export function ratedLevelShiftAt(items: readonly BudgetLine[], startCalendarYear: number, t: number): { full: number; essentials: number } {
  let full = 0
  let essentials = 0
  for (const line of items) {
    const g = line.growthRate
    if (g === undefined || !Number.isFinite(g) || !growthRateInRange(g) || !Number.isFinite(line.annualAmountReal) || !isActiveAt(line, 0)) continue
    const extra = line.annualAmountReal * (ratedLineFactor(g, startCalendarYear, t) - 1)
    full += extra
    if (line.tier === 'essentials') essentials += extra
  }
  return { full, essentials }
}

/** How many charge years the repeat's read-back names before "and so on". */
const REPEAT_YEARS_SHOWN = 3

/**
 * Under a line's repeat: the years it is charged, the first three inside its window and whether more follow, as
 * calendar years where year 0 has one (`yearOf`, the all-retired route) or as counts from the stop (the date route).
 * Read through `isActiveAt`, the one home of a line's years. Null without a repeat the validator takes.
 */
export function repeatReadBack(line: BudgetLine, yearOf: ((offset: number) => number) | null): string | null {
  const n = line.everyYears
  if (n === undefined || !Number.isInteger(n) || n < 2 || !Number.isInteger(line.startYear) || line.startYear < 0) return null
  if (line.endYear !== undefined && (!Number.isInteger(line.endYear) || line.endYear < line.startYear)) return null
  const charged: number[] = []
  for (let k = line.startYear; charged.length <= REPEAT_YEARS_SHOWN && (line.endYear === undefined || k <= line.endYear); k += n) {
    if (isActiveAt(line, k)) charged.push(k)
  }
  const more = charged.length > REPEAT_YEARS_SHOWN
  const shown = charged.slice(0, REPEAT_YEARS_SHOWN)
  return slots.budgetRepeatYears(yearOf === null ? shown : shown.map(yearOf), more, yearOf !== null)
}

/** A repeat charged in the first year, as a sentence names it: the first such line's name, its cost and how often, and
 *  how many more repeat there (gap 4's U8 and U15: the readout, the Expenses card, the verdict and the fan read it). */
export interface FirstYearRepeat {
  readonly name: string
  readonly amount: string
  readonly everyYears: number
  readonly more: number
}
export function firstYearRepeatOf(items: readonly BudgetLine[] | undefined): FirstYearRepeat | null {
  const repeats = repeatsOnAtYearZero(items ?? [])
  const first = repeats[0]
  if (first === undefined || first.everyYears === undefined) return null
  return { name: lineDisplayName(first), amount: formatMoney(first.annualAmountReal), everyYears: first.everyYears, more: repeats.length - 1 }
}

/** The year-0 figures' words with a repeat charged in the first year: "in your first year", and the repeat named. */
export function firstYearRepeatNote(items: readonly BudgetLine[] | undefined): string | null {
  const r = firstYearRepeatOf(items)
  return r === null ? null : slots.budgetRepeatInFirstYear(r.name, r.amount, r.everyYears, r.more)
}

/** One line of the reconciliation readout: muted lines are the quiet ones (what is carried, the ramp note, a warning). */
export interface ReadoutLine {
  readonly text: string
  readonly muted: boolean
}

/**
 * THE RECONCILIATION READOUT (build-gate 1): the lines-target NETS the injected OOP medical — target = max(0, S − M) —
 * with the "carried automatically" disclosure (carried-medical BEFORE the lines-target: total → what's carried → what's
 * left), because compileBudget re-adds M on top of typed lines. When M alone exceeds S the target line is REPLACED by the
 * honest exceeds line (F10). The running total and tier split wait for the FIRST real dollar anywhere in the list (a
 * readout that speaks "$0" for lines never valued is the blank-becomes-a-spoken-zero shape). S may be absent on a
 * defensive mount: the anchor lines are then withheld (never a fabricated figure).
 */
export function budgetReadout(draft: ScenarioDraft, items: readonly BudgetLine[], validation: BudgetValidation): readonly ReadoutLine[] {
  const S = draft.annualSpendingReal
  const M = draft.health.oopMedicalAnnual
  const out: ReadoutLine[] = []
  // A repeat charged in the first year makes every year-0 figure here that year's, never "a year" (gap 4's U8 and its review).
  const repeatNote = firstYearRepeatNote(items)
  const lead = repeatNote === null ? slots.budgetAnchorLead : slots.budgetAnchorLeadFirstYear
  const target = repeatNote === null ? slots.budgetLinesTarget : slots.budgetLinesTargetFirstYear
  if (S !== undefined) out.push({ text: lead(formatMoney(S)), muted: false })
  if (S !== undefined && M !== undefined && M > 0) {
    out.push({ text: slots.budgetMedicalCarried(formatMoney(M)), muted: true })
    out.push({
      text: medicalExceedsTotal(S, M) ? slots.budgetMedicalExceedsTotal(formatMoney(M), formatMoney(S)) : target(formatMoney(anchorTarget(S, M))),
      muted: false,
    })
  }
  const valued = (it: BudgetLine) => isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal)
  const running = items.reduce((sum, it) => (valued(it) ? sum + it.annualAmountReal : sum), 0)
  const essentialsAt0 = items.reduce((sum, it) => (it.tier === 'essentials' && valued(it) ? sum + it.annualAmountReal : sum), 0)
  if (items.some((it) => Number.isFinite(it.annualAmountReal))) {
    const total =repeatNote === null ? slots.budgetRunningTotal : slots.budgetRunningTotalFirstYear
    const split = repeatNote === null ? slots.budgetTierSplit : slots.budgetTierSplitFirstYear
    out.push({ text: total(formatMoney(running)), muted: false })
    out.push({ text: split(formatMoney(essentialsAt0), formatMoney(running - essentialsAt0)), muted: false })
    if (repeatNote !== null) out.push({ text: repeatNote, muted: false })
  }
  if (items.length > 0 && isRampedBudget(items)) out.push({ text: copy.budgetAnchorRampNote, muted: true })
  if (items.length > 0) {
    for (const w of validation.warnings) out.push({ text: w === 'zero-essentials' ? copy.budgetWarnZeroEssentials : copy.budgetWarnNoYearZero, muted: true })
  }
  return out
}

/** What Apply does with the staged lines (Card 9; build-gate 2): with nothing staged and no budget governing there is
 *  nothing to commit (`empty`, said aloud, never a silent close); with nothing staged over a governing budget it is the
 *  escape back to a single number (`escape`, never `budget: []`); a line in error blocks (`blocked`); else `apply`. */
export type BudgetApply = 'empty' | 'escape' | 'blocked' | 'apply'

export function budgetApplyFor(items: readonly BudgetLine[], governs: boolean, hasErrors: boolean): BudgetApply {
  if (items.length === 0) return governs ? 'escape' : 'empty'
  return hasErrors ? 'blocked' : 'apply'
}
