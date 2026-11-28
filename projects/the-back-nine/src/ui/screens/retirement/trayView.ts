/**
 * src/ui/screens/retirement/trayView.ts: the Action Items tray's one pure composer (plan docs/plans/6-rightcapital-ui-
 * plan.md, RC4, "The Action Items tray"; ref 2.8; `rc-analysis/action-items__cleanshot-2024-10-28-at-15-44-44-copy.png`).
 * `ActionItemsTray.tsx` draws what this returns and decides nothing: which rows show and in which column group, each
 * row's compared value, the changed marks, how a typed value becomes a lever (or none), the pending bundle's refusal by
 * name, and what Apply says. U15's rail logic (`railChrome.ts`: `railOffers`, `applyState`, `refusalWords`, `stopWords`)
 * is reused, never re-derived.
 *
 * THE COLUMN GROUPS (ref 2.8's table): left, Financial goals (the stop year: working households only, one calendar year,
 * valid years only), Savings (each working owner's account deposit; the employer's figure as a sub-row only while the
 * deposit is lowered below the plan's, D7), Expenses (the one-figure total, or one row per budget line: amount and kind,
 * taken out; a line added only in this what-if wears the green dot with a "+" and words); right, Strategies (Social
 * Security, one indented row per person not yet claimed; the withdrawal order; each inherited IRA's pace, one indented
 * row per account (U17); Roth conversions: none, or amount, start and years; how the savings are invested; the
 * marketplace subsidy rules).
 *
 * PENDING UNTIL REFRESH: the tray edits a PENDING bundle; the left half runs the COMMITTED one (`useWhatIf`). Every commit
 * function here maps a typed value to the lever it means, or to `null` when the value is the plan's own (no lever that
 * changes nothing is ever held). A row is CHANGED when the pending bundle holds its lever: three cues on the box (blue-ink
 * words on the pale blue box, medium weight, a 2 px left bar), and its own "back to the plan".
 *
 * NO LEAN WORDS (R20): nothing here says a change helps or costs; the left half's counts say what it does.
 */
import { applyBundle } from '@intake/whatIf'
import { acaPricedForRun, healthcarePriced, isDateRoute, KIND_TO_BUCKET, medicareOnlyPriced, pricedStateForRun, spineMedicarePriced } from '@intake/intakeMap'
import { rothPlanMissingField } from '@intake/rothPlan'
import type { ScenarioDraft } from '@store/memoryModel'
import type { BudgetLineItem, BudgetTier, DrawdownOrderKey, DrawdownPolicy, InheritedPace, RothConversionPlan, WhatIfBudgetLineV6, WhatIfLeverKind, WhatIfLeverV6 } from '@shared/model'
import { canonicalIdentityToken } from '@shared/model'
import { copy, slots } from '../../copy'
import { rothPlanStartFor, type BandPlanClockAnchor } from '../../bandAnnotations'
import { showMedicarePricedNote } from '../../healthSheetChrome'
import { composeRothOmissionsNote } from '../../stateTaxDisclosure'
import {
  applyState,
  BUCKET_LABEL,
  leverTarget,
  lineName,
  paceWords,
  POLICY_LABEL,
  policyWords,
  railMoney,
  refusalWords,
  rothWords,
  stopWords,
  type ClaimOffer,
  type DepositOffer,
  type PaceOffer,
  type RailOffers,
} from '../../workbench/railChrome'
import { tablePerson } from '../../workbench/tableRun'

// ── Rows ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What a row's control is; the component switches on `kind`. */
export type TrayControl =
  | { readonly kind: 'stop'; readonly value: number; readonly min: number; readonly max: number }
  | { readonly kind: 'deposit'; readonly offer: DepositOffer; readonly value: number }
  | { readonly kind: 'employer'; readonly offer: DepositOffer; readonly deposit: number; readonly value: number | undefined }
  | { readonly kind: 'total'; readonly plan: number | undefined; readonly value: number | undefined }
  | { readonly kind: 'line'; readonly line: WhatIfBudgetLineV6; readonly shown: WhatIfBudgetLineV6; readonly removed: boolean }
  | { readonly kind: 'added'; readonly line: WhatIfBudgetLineV6 }
  | { readonly kind: 'claim'; readonly offer: ClaimOffer; readonly value: number; readonly min: number; readonly max: number }
  | { readonly kind: 'order'; readonly policy: DrawdownPolicy; readonly order: readonly DrawdownOrderKey[]; readonly offered: readonly DrawdownPolicy[] }
  | { readonly kind: 'roth'; readonly plan: RothConversionPlan | undefined; readonly held: RothConversionPlan | 'none' | undefined }
  | { readonly kind: 'mix'; readonly held: { readonly stock: number; readonly bond: number; readonly cash: number } | undefined }
  | { readonly kind: 'aca'; readonly plan: boolean; readonly value: boolean }
  /** An inherited IRA's pace (U17): the rule shown (the held lever's, else the plan's). */
  | { readonly kind: 'pace'; readonly offer: PaceOffer; readonly value: InheritedPace }
  /** A group's own row (Social Security over its people, the inherited IRAs' pace over its accounts): its name, no
   *  control. */
  | { readonly kind: 'group' }

export interface TrayRowView {
  /** The row's id: its lever's target (`leverTarget`), or its kind where one row holds the kind. */
  readonly id: string
  readonly lever: WhatIfLeverKind
  readonly label: string
  /** The compared plan's value, as plain text. */
  readonly compared: string
  /** The pending bundle holds this row's lever (the three cues and the row's own way back). */
  readonly changed: boolean
  /** A sub-row (Social Security's people; the employer's figure under its account). */
  readonly indent?: boolean
  /** A line added only in this what-if: the green dot's words. */
  readonly added?: string
  /** Lines under the row's control (the stop year's sentence; why a change waits). */
  readonly notes: readonly string[]
  readonly control: TrayControl
}

export interface TraySectionView {
  readonly id: 'goals' | 'savings' | 'expenses' | 'strategies'
  readonly title: string
  readonly rows: readonly TrayRowView[]
  /** Lines under the section's rows (what a deposit change means; why an old budget line can't be changed here). */
  readonly notes: readonly string[]
}

export interface TrayEditItem {
  readonly id: string
  readonly label: string
}

export interface TrayView {
  readonly left: readonly TraySectionView[]
  readonly right: readonly TraySectionView[]
  /** The Edit drawer's checklist: every row a household can show, by section. */
  readonly editSections: readonly { readonly title: string; readonly items: readonly TrayEditItem[] }[]
  /** A budget household can add a spending line (the Edit drawer's "Add new items"). */
  readonly canAddLine: boolean
  /** The pending bundle differs from the committed one: Refresh has work to do. */
  readonly pendingDiffers: boolean
  /** The pending bundle's own refusal, by name (the writers' checks, `applyBundle`), shown before any Refresh. */
  readonly refusal?: string
}

export interface TrayInput {
  /** The committed answer's draft: the draft every what-if is applied to. */
  readonly draft: ScenarioDraft
  readonly offers: RailOffers
  readonly pending: readonly WhatIfLeverV6[]
  readonly committed: readonly WhatIfLeverV6[]
  /** The rows the Edit drawer hid. */
  readonly hidden: ReadonlySet<string>
  /** Lowered deposits waiting for the employer's figure (D7), by account id: the typed own deposit. */
  readonly awaitingEmployer: ReadonlyMap<string, number>
  readonly anchor: BandPlanClockAnchor
  /** The date route's crowned lifestyle offset (the run the Roth notes describe prices the ACA discount there), absent
   *  on the spine or with no date. */
  readonly crownedOffset?: number
}

/**
 * The Roth row's honesty lines, the deleted Roth sheet's own (`RothLever.tsx` at 7f56682e9; plan 5.2 moves an honesty
 * line with its surface): the Medicare residual where the run priced Medicare and the household reaches no health door
 * (`showMedicarePricedNote`), the funding note, and what a conversion's comparison leaves out
 * (`composeRothOmissionsNote`: the state-tax item by the run's priced state, the pre-65 clause by the draft's ages and
 * whether the run prices the ACA discount). Each through the producer the sheet called, never re-derived.
 */
export function rothNotes(draft: ScenarioDraft, crownedOffset: number | undefined): readonly string[] {
  const medicarePriced = isDateRoute(draft) || spineMedicarePriced(draft)
  return [
    ...(showMedicarePricedNote({ medicarePriced, reachesHealthDoor: healthcarePriced(draft) }) ? [copy.rothMedicareResidualNote] : []),
    copy.rothFundingNote,
    composeRothOmissionsNote(pricedStateForRun(draft) !== undefined, medicareOnlyPriced(draft), acaPricedForRun(draft, crownedOffset)),
  ]
}

/** The engine's claim window: 62 through 70 (the intake's own rule). */
export const CLAIM_MIN = 62
export const CLAIM_MAX = 70
const DEFAULT_ORDER: readonly DrawdownOrderKey[] = ['taxable', 'pretax', 'roth']
const PICKABLE: readonly DrawdownPolicy[] = ['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill', 'custom']
/** The bucket a shortcut names, never offered when the household holds no account there (U15's rule). */
const POLICY_NAMES_BUCKET: Readonly<Record<DrawdownPolicy, DrawdownOrderKey | null>> = {
  proportional: null,
  'taxable-first': 'taxable',
  'pre-tax-first': 'pretax',
  'bracket-fill': null,
  custom: null,
}

const dollars = (v: number): string => slots.trayDollars(railMoney(v))

/** The pending bundle's lever for a target. */
const find = (bundle: readonly WhatIfLeverV6[], target: string): WhatIfLeverV6 | undefined => bundle.find((l) => leverTarget(l) === target)

export function trayView(input: TrayInput): TrayView {
  const { draft, offers, pending, committed, hidden, awaitingEmployer, anchor, crownedOffset } = input
  const shows = (id: string) => !hidden.has(id)
  const edit: { title: string; items: TrayEditItem[] }[] = []

  // ── Financial goals ──
  const goals: TrayRowView[] = []
  const goalItems: TrayEditItem[] = []
  if (offers.stop !== undefined) {
    const stop = offers.stop
    const lever = find(pending, 'stop-year')
    const year = lever?.kind === 'stop-year' ? lever.calendarYear : stop.planYear
    goalItems.push({ id: 'stop-year', label: copy.workbenchRailStopLabel })
    if (shows('stop-year')) {
      goals.push({
        id: 'stop-year',
        lever: 'stop-year',
        label: copy.workbenchRailStopLabel,
        compared: String(stop.planYear),
        changed: lever !== undefined,
        notes: [stopWords(draft, stop.working, year), copy.workbenchRailStopNote],
        control: { kind: 'stop', value: year, min: stop.years[0]!, max: stop.years[stop.years.length - 1]! },
      })
    }
  }
  if (goalItems.length > 0) edit.push({ title: copy.traySectionGoals, items: goalItems })

  // ── Savings ──
  const savings: TrayRowView[] = []
  const savingItems: TrayEditItem[] = []
  for (const offer of offers.deposits) {
    const id = `deposits:${offer.accountId}`
    savingItems.push({ id, label: offer.name })
    if (!shows(id)) continue
    const lever = find(pending, id)
    const awaiting = awaitingEmployer.get(offer.accountId)
    const deposit = awaiting ?? (lever?.kind === 'deposits' ? lever.annualContribution : offer.planDeposit)
    savings.push({
      id,
      lever: 'deposits',
      label: offer.name,
      compared: dollars(offer.planDeposit),
      changed: lever !== undefined || awaiting !== undefined,
      notes: [],
      control: { kind: 'deposit', offer, value: deposit },
    })
    if (offer.employer !== undefined && deposit < offer.planDeposit) {
      const held = lever?.kind === 'deposits' ? lever[offer.employer.field] : undefined
      savings.push({
        id: `${id}:employer`,
        lever: 'deposits',
        label: copy.workbenchRailEmployerLabel,
        compared: dollars(offer.employer.plan),
        changed: held !== undefined,
        indent: true,
        // Its waiting words are the row's held words (`ActionItemsTray`'s employer case), so Refresh and Apply stop on it.
        notes: [],
        control: { kind: 'employer', offer, deposit, value: held },
      })
    }
  }
  if (savingItems.length > 0) edit.push({ title: copy.traySectionSavings, items: savingItems })

  // ── Expenses ──
  const expenses: TrayRowView[] = []
  const expenseItems: TrayEditItem[] = []
  const spending = offers.spending
  if (spending.kind === 'total') {
    expenseItems.push({ id: 'spending:total', label: copy.workbenchRailSpendTitle })
    if (shows('spending:total')) {
      const lever = find(pending, 'spending:total')
      expenses.push({
        id: 'spending:total',
        lever: 'spending',
        label: copy.workbenchRailSpendTitle,
        compared: spending.plan === undefined ? copy.workbenchRailRothNone : dollars(spending.plan),
        changed: lever !== undefined,
        notes: [],
        control: { kind: 'total', plan: spending.plan, value: lever?.kind === 'spending' && lever.op === 'total' ? lever.annualSpendingReal : spending.plan },
      })
    }
  } else {
    for (const line of spending.lines) {
      const id = `spending:line:${line.id}`
      const name = lineName(line)
      expenseItems.push({ id, label: name })
      if (!shows(id)) continue
      const lever = find(pending, id)
      const removed = lever?.kind === 'spending' && lever.op === 'remove'
      const shown = lever?.kind === 'spending' && lever.op === 'replace' ? lever.line : line
      expenses.push({
        id,
        lever: 'spending',
        label: name,
        compared: lineFigure(line),
        changed: lever !== undefined,
        notes: [],
        control: { kind: 'line', line, shown, removed },
      })
    }
    for (const l of pending) {
      if (l.kind !== 'spending' || l.op !== 'add') continue
      expenses.push({
        id: `spending:line:${l.line.id}`,
        lever: 'spending',
        label: lineName(l.line),
        compared: copy.workbenchRailRothNone,
        changed: true,
        added: copy.workbenchRailLineNew,
        notes: [],
        control: { kind: 'added', line: l.line },
      })
    }
  }
  if (expenseItems.length > 0) edit.push({ title: copy.traySectionExpenses, items: expenseItems })

  // ── Strategies ──
  const strategies: TrayRowView[] = []
  const strategyItems: TrayEditItem[] = []
  if (offers.claims.length > 0) {
    strategyItems.push({ id: 'claim-age', label: copy.traySocialSecurity })
    if (shows('claim-age')) {
      strategies.push({ id: 'claim-age', lever: 'claim-age', label: copy.traySocialSecurity, compared: '', changed: false, notes: [], control: { kind: 'group' } })
      for (const offer of offers.claims) {
        const id = `claim-age:${offer.personIndex}`
        const lever = find(pending, id)
        strategies.push({
          id,
          lever: 'claim-age',
          // The person by name under the group's row (ref 2.8: "Barry Allen · Age 62"); the box's own name says it all.
          label: tablePerson(draft, offer.personIndex, 0, 0).label,
          compared: slots.trayAge(offer.planAge),
          changed: lever !== undefined,
          indent: true,
          notes: [],
          control: {
            kind: 'claim',
            offer,
            value: lever?.kind === 'claim-age' ? lever.claimAge : offer.planAge,
            min: Math.max(CLAIM_MIN, offer.currentAge),
            max: CLAIM_MAX,
          },
        })
      }
    }
  }
  if (offers.order !== undefined) {
    const offer = offers.order
    strategyItems.push({ id: 'withdrawal-order', label: copy.workbenchRailOrderTitle })
    if (shows('withdrawal-order')) {
      const lever = find(pending, 'withdrawal-order')
      const held = lever?.kind === 'withdrawal-order' ? lever : undefined
      const buckets = new Set(draft.enteredAccounts.map((a) => KIND_TO_BUCKET[a.kind]))
      strategies.push({
        id: 'withdrawal-order',
        lever: 'withdrawal-order',
        label: copy.workbenchRailOrderTitle,
        compared: policyWords(offer.policy, offer.order),
        changed: held !== undefined,
        notes: [],
        control: {
          kind: 'order',
          policy: held?.policy ?? offer.policy,
          order: held?.policy === 'custom' ? held.drawdownOrder : (offer.order ?? DEFAULT_ORDER),
          offered: PICKABLE.filter((p) => {
            const named = POLICY_NAMES_BUCKET[p]
            return named === null || buckets.has(named) || p === offer.policy
          }),
        },
      })
    }
  }
  if (offers.paces.length > 0) {
    strategyItems.push({ id: 'inherited-pace', label: copy.trayPaceTitle })
    if (shows('inherited-pace')) {
      strategies.push({ id: 'inherited-pace', lever: 'inherited-pace', label: copy.trayPaceTitle, compared: '', changed: false, notes: [copy.trayPaceNote], control: { kind: 'group' } })
      for (const offer of offers.paces) {
        const id = `inherited-pace:${offer.accountId}`
        const lever = find(pending, id)
        strategies.push({
          id,
          lever: 'inherited-pace',
          // The account by name under the group's row, as Social Security's people are.
          label: offer.label,
          compared: paceWords(offer.plan, offer.lastYear),
          changed: lever !== undefined,
          indent: true,
          notes: [],
          control: { kind: 'pace', offer, value: lever?.kind === 'inherited-pace' ? lever.pace : offer.plan },
        })
      }
    }
  }
  if (offers.roth !== undefined) {
    const plan = offers.roth.plan
    strategyItems.push({ id: 'roth', label: copy.workbenchRailRothTitle })
    if (shows('roth')) {
      const lever = find(pending, 'roth')
      const held = lever?.kind === 'roth' ? (lever.conversion.kind === 'plan' ? lever.conversion.plan : 'none') : undefined
      strategies.push({
        id: 'roth',
        lever: 'roth',
        label: copy.workbenchRailRothTitle,
        compared: plan === undefined ? copy.workbenchRailRothNone : rothWords(plan, draft.startCalendarYear, anchor),
        changed: held !== undefined,
        // Whenever either column holds a conversion plan: the what-if's own, or the plan's (its column still holds one
        // when the what-if sets none).
        notes: (held !== undefined && held !== 'none') || plan !== undefined ? rothNotes(draft, crownedOffset) : [],
        control: { kind: 'roth', plan, held },
      })
    }
  }
  strategyItems.push({ id: 'mix', label: copy.workbenchRailMixTitle })
  if (shows('mix')) {
    const lever = find(pending, 'mix')
    const share = offers.mix.planStockShare
    strategies.push({
      id: 'mix',
      lever: 'mix',
      label: copy.workbenchRailMixTitle,
      compared: share === null ? copy.workbenchRailRothNone : slots.trayMixPlan(String(Math.round(share * 100))),
      changed: lever !== undefined,
      notes: [copy.workbenchRailMixNote],
      control: { kind: 'mix', held: lever?.kind === 'mix' ? { stock: lever.stockPct, bond: lever.bondPct, cash: lever.cashPct } : undefined },
    })
  }
  if (offers.aca !== undefined) {
    const plan = offers.aca.planEnhanced
    strategyItems.push({ id: 'aca-subsidy', label: copy.workbenchRailAcaTitle })
    if (shows('aca-subsidy')) {
      const lever = find(pending, 'aca-subsidy')
      strategies.push({
        id: 'aca-subsidy',
        lever: 'aca-subsidy',
        label: copy.workbenchRailAcaTitle,
        compared: plan ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted,
        changed: lever !== undefined,
        notes: [],
        control: { kind: 'aca', plan, value: lever?.kind === 'aca-subsidy' ? lever.enhanced : plan },
      })
    }
  }
  edit.push({ title: copy.traySectionStrategies, items: strategyItems })

  const section = (id: TraySectionView['id'], title: string, rows: readonly TrayRowView[], notes: readonly string[] = []): TraySectionView[] =>
    rows.length > 0 ? [{ id, title, rows, notes }] : []
  const applied = pending.length === 0 ? null : applyBundle(draft, pending)
  return {
    left: [
      ...section('goals', copy.traySectionGoals, goals), ...section('savings', copy.traySectionSavings, savings, [copy.workbenchRailDepositsSpent]),
      ...section('expenses', copy.traySectionExpenses, expenses, spending.kind === 'lines' && spending.unnamed > 0 ? [copy.workbenchRailSpendUnnamed] : []),
    ],
    right: section('strategies', copy.traySectionStrategies, strategies),
    editSections: edit,
    canAddLine: spending.kind === 'lines',
    pendingDiffers: canonicalIdentityToken(pending) !== canonicalIdentityToken(committed),
    ...(applied !== null && !applied.ok ? { refusal: refusalWords(applied.refusal, draft.startCalendarYear) } : {}),
  }
}

// ── Commits: a typed value to the lever it means (null: the plan's own, no lever) ────────────────────────────────

/** The stop year (every person still working stops then, KTD15); a year outside the window is not offered. */
export function stopCommit(planYear: number, year: number): WhatIfLeverV6 | null {
  return year === planYear ? null : { kind: 'stop-year', calendarYear: year }
}

/** The one-figure spending total; a blank goes back to the plan. */
export function totalCommit(plan: number | undefined, v: number | undefined): WhatIfLeverV6 | null {
  return v === undefined || v === plan ? null : { kind: 'spending', op: 'total', annualSpendingReal: v }
}

/** A line's figure as the tray prints it: "$40,000 every 5 years" for a line that repeats (gap 4's U9: its amount is one
 *  occurrence's cost), its dollars otherwise. */
export const lineFigure = (line: BudgetLineItem): string =>
  line.everyYears !== undefined ? slots.trayLineEvery(railMoney(line.annualAmountReal), line.everyYears) : dollars(line.annualAmountReal)

/** An added line's words on its row: "$40,000 every 5 years" for a repeat, "$9,000 a year" otherwise. */
export const addedLineWords = (line: BudgetLineItem): string =>
  line.everyYears !== undefined ? slots.trayLineEvery(railMoney(line.annualAmountReal), line.everyYears) : slots.workbenchRailPerYear(railMoney(line.annualAmountReal))

/** Compares only what the tray can edit (gap 4's KTD13): a line's repeat and rate ride along by spread, never offered. */
const sameLine = (a: WhatIfBudgetLineV6, b: WhatIfBudgetLineV6) =>
  a.annualAmountReal === b.annualAmountReal && a.tier === b.tier && a.startYear === b.startYear && a.endYear === b.endYear && a.label === b.label && a.category === b.category

/** The line the tray's line drawer saves: a new line (category "other"), or the line it edits with every field the
 *  drawer doesn't offer carried by spread (its category, its repeat, its rate: gap 4's U9), the Through year absent when
 *  the box is blank (DND 009). */
export function drawerLine(
  editing: WhatIfBudgetLineV6 | undefined,
  id: string,
  fields: { readonly label: string; readonly amount: number; readonly tier: BudgetTier; readonly startYear: number; readonly endYear?: number },
): WhatIfBudgetLineV6 {
  const { endYear: _was, ...carried }: Partial<WhatIfBudgetLineV6> = editing ?? {}
  return {
    ...carried,
    id,
    category: editing?.category ?? 'other',
    label: fields.label,
    annualAmountReal: fields.amount,
    tier: fields.tier,
    startYear: fields.startYear,
    ...(fields.endYear !== undefined ? { endYear: fields.endYear } : {}),
  }
}

/**
 * The line an amount typed in a line row replaces with (gap 4's review, leftover (b)). The row's label speaks the LIVE
 * plan line's repeat ("dollars each time, every 4 years"), so the figure is typed for that repeat: the replace takes it,
 * and for a line that repeats the live start too (it sets the years charged, and a typed amount is the same at any
 * start), so a kept what-if refused for either (`line-repeat-changed`, `line-start-changed`) runs once a figure is
 * typed. Every other field is the shown line's (the kept replace, else the plan line). The kind picker's write keeps
 * the stored repeat: an old amount nobody retyped under a new repeat is KTD13's rosy case.
 */
export function lineAmountLine(line: WhatIfBudgetLineV6, shown: WhatIfBudgetLineV6, amount: number): WhatIfBudgetLineV6 {
  const { everyYears: _stored, ...rest } = shown
  return {
    ...rest,
    ...(line.everyYears !== undefined ? { everyYears: line.everyYears, startYear: line.startYear } : {}),
    annualAmountReal: amount,
  }
}

/** A budget line changed to `next`: a replace, or none when it is the plan's line again. */
export function lineCommit(line: WhatIfBudgetLineV6, next: WhatIfBudgetLineV6): WhatIfLeverV6 | null {
  return sameLine(next, line) ? null : { kind: 'spending', op: 'replace', line: next }
}

/** A deposit typed. A LOWER deposit on an account that carries an employer dollar waits for the employer's figure at
 *  that deposit (D7): no lever until it is given (one already holding a figure keeps it), never the plan's employer
 *  dollar on a smaller deposit. A blank goes back to the plan. */
export function depositCommit(
  offer: DepositOffer,
  lever: WhatIfLeverV6 | undefined,
  v: number | undefined,
): { readonly lever: WhatIfLeverV6 | null; readonly awaiting?: number } {
  const own = v ?? offer.planDeposit
  const employer = offer.employer
  if (employer !== undefined && own < offer.planDeposit) {
    const held = lever?.kind === 'deposits' ? lever[employer.field] : undefined
    if (held === undefined) return { lever: null, awaiting: own }
    return { lever: depositLever(offer, own, held) }
  }
  return { lever: own === offer.planDeposit ? null : depositLever(offer, own, undefined) }
}

/** The employer's figure given at a lowered deposit: the lever, now whole. */
export function employerCommit(offer: DepositOffer, deposit: number, v: number | undefined): WhatIfLeverV6 | null {
  if (v === undefined) return null
  return depositLever(offer, deposit, v)
}

function depositLever(offer: DepositOffer, own: number, employerFigure: number | undefined): WhatIfLeverV6 {
  const field = offer.employer?.field
  return {
    kind: 'deposits',
    accountId: offer.accountId,
    annualContribution: own,
    ...(field === undefined || employerFigure === undefined ? {} : field === 'employerMatchAnnual' ? { employerMatchAnnual: employerFigure } : { hsaEmployerAnnual: employerFigure }),
  }
}

/** A claim age; outside the window (from the later of 62 and today's age, to 70) it is refused with words. */
export function claimCommit(offer: ClaimOffer, age: number): { readonly lever: WhatIfLeverV6 | null } | { readonly error: string } {
  const from = Math.max(CLAIM_MIN, offer.currentAge)
  if (!Number.isInteger(age) || age < from || age > CLAIM_MAX) return { error: slots.workbenchRailClaimRange(from) }
  return { lever: age === offer.planAge ? null : { kind: 'claim-age', personIndex: offer.personIndex, claimAge: age } }
}

/** A withdrawal policy (and a custom order). */
export function orderCommit(offer: NonNullable<RailOffers['order']>, policy: DrawdownPolicy, order: readonly DrawdownOrderKey[]): WhatIfLeverV6 | null {
  const same = policy === offer.policy && (policy !== 'custom' || order.join() === (offer.order ?? DEFAULT_ORDER).join())
  if (same) return null
  return policy === 'custom' ? { kind: 'withdrawal-order', policy: 'custom', drawdownOrder: order } : { kind: 'withdrawal-order', policy }
}

/** Swap a bucket with its neighbour in a custom order (a move off either end changes nothing). */
export function moveBucket(order: readonly DrawdownOrderKey[], key: DrawdownOrderKey, dir: -1 | 1): readonly DrawdownOrderKey[] {
  const i = order.indexOf(key)
  const j = i + dir
  if (i < 0 || j < 0 || j >= order.length) return order
  const next = [...order]
  next[i] = next[j]!
  next[j] = key
  return next
}

/** An inherited IRA's pace (KTD21): a rule, and for "ending in a chosen year" its last year. That year waits while blank
 *  and is refused in words outside the asked year to the law's last (`applyBundle`'s bounds, carried by the offer), or
 *  when it has already gone on an aged plan (the ONE plan-clock producer, as the Roth row's first year), so no run
 *  starts on it; the plan's own pace is no lever. On an aged plan whose asked year has gone, the words' first year is this
 *  year, so they never name a year the row then refuses. */
export function paceCommit(
  offer: PaceOffer,
  kind: InheritedPace['kind'],
  year: number | undefined,
  draftStartCalendarYear: number,
  anchor: BandPlanClockAnchor,
  wallCalendarYear: number,
): { readonly kind: 'lever'; readonly lever: WhatIfLeverV6 | null } | { readonly kind: 'wait'; readonly words: string } {
  let pace: InheritedPace
  if (kind === 'even-to-year') {
    const from = rothPlanStartFor(anchor, offer.firstYear - draftStartCalendarYear).passed ? Math.max(offer.firstYear, wallCalendarYear) : offer.firstYear
    if (year === undefined) return { kind: 'wait', words: slots.trayPaceNeedsYear(from, offer.lastYear) }
    if (!Number.isInteger(year) || year < offer.firstYear || year > offer.lastYear) {
      return { kind: 'wait', words: slots.trayPaceYearRange(from, offer.lastYear) }
    }
    if (rothPlanStartFor(anchor, year - draftStartCalendarYear).passed) return { kind: 'wait', words: slots.trayPaceYearPast(wallCalendarYear) }
    pace = { kind, lastYear: year }
  } else {
    pace = { kind }
  }
  const same = pace.kind === offer.plan.kind && (pace.kind !== 'even-to-year' || (offer.plan.kind === 'even-to-year' && offer.plan.lastYear === pace.lastYear))
  return { kind: 'lever', lever: same ? null : { kind: 'inherited-pace', accountId: offer.accountId, pace } }
}

/** The marketplace subsidy rules. */
export function acaCommit(plan: boolean, enhanced: boolean): WhatIfLeverV6 | null {
  return enhanced === plan ? null : { kind: 'aca-subsidy', enhanced }
}

/** The three parts of the mix: a lever once all three are typed, each 0 to 100, and add to 100; words otherwise, so the
 *  tray's Refresh and Apply stop on a mix it is not showing (a blank part beside an earlier mix lever would otherwise
 *  run or write that lever: gap 3's review, round 2). Nothing typed and no lever held is no choice at all. */
export function mixCommit(
  parts: { readonly stock?: number; readonly bond?: number; readonly cash?: number },
  leverHeld: boolean,
): { readonly lever?: WhatIfLeverV6; readonly error?: string } {
  const { stock, bond, cash } = parts
  const typed = [stock, bond, cash].filter((v): v is number => v !== undefined)
  if (typed.some((v) => v > 100)) return { error: copy.workbenchRailMixPartRange }
  if (stock === undefined || bond === undefined || cash === undefined) return typed.length > 0 || leverHeld ? { error: copy.workbenchRailMixNeedsAll } : {}
  const total = stock + bond + cash
  if (total !== 100) return { error: slots.workbenchRailMixSum(String(total)) }
  return { lever: { kind: 'mix', stockPct: stock, bondPct: bond, cashPct: cash } }
}

/** The Roth row's typed fields: the amount, the first CALENDAR year, the number of years. */
export interface RothFields {
  readonly amount?: number
  readonly startYear?: number
  readonly years?: number
}

export type RothCommit =
  | { readonly kind: 'lever'; readonly lever: WhatIfLeverV6 | null }
  /** The plan isn't whole yet, or its first year has passed: no lever, the words say which. */
  | { readonly kind: 'wait'; readonly words: string }

const ROTH_NEEDS = { amount: 'trayRothNeedsAmount', start: 'trayRothNeedsStart', years: 'trayRothNeedsYears' } as const

/** The Roth row: none, or a plan whole in all three fields with a first year not yet passed. The year passes through
 *  the ONE plan-clock producer (`rothPlanStartFor`, U17 §S1), never a re-typed compare. */
export function rothCommit(
  plan: RothConversionPlan | undefined,
  mode: 'none' | 'amount',
  fields: RothFields,
  draftStartCalendarYear: number,
  anchor: BandPlanClockAnchor,
  wallCalendarYear: number,
): RothCommit {
  if (mode === 'none') return { kind: 'lever', lever: plan === undefined ? null : { kind: 'roth', conversion: { kind: 'none' } } }
  const missing = rothPlanMissingField(fields)
  if (missing !== null) return { kind: 'wait', words: copy[ROTH_NEEDS[missing]] }
  const startYearOffset = fields.startYear! - draftStartCalendarYear
  if (rothPlanStartFor(anchor, startYearOffset).passed) return { kind: 'wait', words: slots.workbenchRailRothStartPast(wallCalendarYear) }
  const next: RothConversionPlan = { annualAmountReal: fields.amount!, startYearOffset, years: fields.years! }
  const same = plan !== undefined && plan.annualAmountReal === next.annualAmountReal && plan.startYearOffset === next.startYearOffset && plan.years === next.years
  return { kind: 'lever', lever: same ? null : { kind: 'roth', conversion: { kind: 'plan', plan: next } } }
}

/** The Roth row's fields as the row opens: the held plan's, else the plan's, else this year for five years. */
export function rothFieldsFor(held: RothConversionPlan | 'none' | undefined, plan: RothConversionPlan | undefined, draftStartCalendarYear: number, wallCalendarYear: number): RothFields {
  const p = held === 'none' ? undefined : (held ?? plan)
  return p !== undefined ? { amount: p.annualAmountReal, startYear: draftStartCalendarYear + p.startYearOffset, years: p.years } : { startYear: wallCalendarYear, years: 5 }
}

/** The bundle with every lever on a hidden row dropped (the Edit drawer's Save: a hidden row goes back to the plan). */
export function withoutHidden(bundle: readonly WhatIfLeverV6[], hidden: ReadonlySet<string>): readonly WhatIfLeverV6[] {
  return bundle.filter((l) => {
    const target = leverTarget(l)
    if (hidden.has(target)) return false
    if (l.kind === 'claim-age' && hidden.has('claim-age')) return false
    if (l.kind === 'inherited-pace' && hidden.has('inherited-pace')) return false
    return true
  })
}

/** The lowered deposits still waiting for the employer's figure once the Edit drawer hides rows: a hidden deposit row's
 *  wait goes with its pending edit (`withoutHidden`), or it would hold the what-if as unkept work (the leave ask) with
 *  nothing on screen. The same map back when nothing it holds was hidden. */
export function awaitingWithoutHidden(awaiting: ReadonlyMap<string, number>, hidden: ReadonlySet<string>): ReadonlyMap<string, number> {
  const kept = [...awaiting].filter(([accountId]) => !hidden.has(`deposits:${accountId}`))
  return kept.length === awaiting.size ? awaiting : new Map(kept)
}

// ── Apply ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export type TrayApply =
  | { readonly kind: 'hidden'; readonly words: string }
  | { readonly kind: 'open'; readonly words?: string }
  | { readonly kind: 'shut'; readonly words?: string }

/** Apply's face: hidden on a read-only tab (with its words); withheld for a stop year or the mix with `applyState`'s
 *  reasons; waiting for Refresh while the tray holds changes the left half has not run; waiting on the run. */
export function trayApply(input: {
  readonly draft: ScenarioDraft
  readonly committed: readonly WhatIfLeverV6[]
  readonly pendingDiffers: boolean
  readonly current: boolean
  readonly readOnly: boolean
}): TrayApply {
  if (input.readOnly) return { kind: 'hidden', words: copy.workbenchRailApplyReadOnly }
  if (input.pendingDiffers) {
    const s = applyState(input.draft, input.committed, false)
    return { kind: 'shut', words: s.kind === 'withheld' ? s.words : copy.trayApplyRefreshFirst }
  }
  const s = applyState(input.draft, input.committed, input.current)
  if (s.kind === 'empty') return { kind: 'shut' }
  if (s.kind === 'withheld') return { kind: 'shut', words: s.words }
  if (s.kind === 'waiting') return { kind: 'shut', words: copy.workbenchRailApplyWaiting }
  return { kind: 'open', ...(s.leftOverNote !== undefined ? { words: s.leftOverNote } : {}) }
}

/** A bucket's words, for the custom order's rows. */
export const bucketWords = (key: DrawdownOrderKey): string => copy[BUCKET_LABEL[key]]
/** A policy's words, for the order picker. */
export const policyLabel = (p: DrawdownPolicy): string => copy[POLICY_LABEL[p]]
