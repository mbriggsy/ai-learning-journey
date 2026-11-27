/*
 * src/ui/workbench/railChrome.ts — the lever rail's composer (workbench plan U15; R16 to R20, R22, KTD12, KTD14,
 * KTD15). PURE: the committed answer's draft, a bundle and the runs' results in; what the rail offers, the two readings'
 * words, the paired year rows and Apply's state out. Since RC4b the Action Items tray (`ActionItemsTray.tsx`) reads its
 * offers and words here, and since RC6 Cash Flows' "Your plan beside the what-if" renders `composePaired`.
 *
 * THE LAWS IT KEEPS
 *  - What the rail offers is read off the COMMITTED answer's draft (`answer.draft`), the draft every what-if is applied
 *    to (U14's builder): a lever is offered only where KTD15 calls the choice still open, and only where the run would
 *    read it (no stop year once everyone has retired, no deposits on a retired owner's account, no claim age already
 *    in effect, no Roth plan with nothing pre-tax, no subsidy regime with nothing priced).
 *  - THE DIFFERENCE SPEAKS THE TWO COUNTS AND NOTHING ELSE (R20): each run's reading under its own run's name, and,
 *    where the counts are equal, the even line. Never "helps", "costs", "better" or "worse": no sentence here says a
 *    lever helps or costs, because nothing here measured that for the household.
 *  - EVERY PAIRED FIGURE IS ONE FIELD OF ITS RUN'S ROW (R5), on the table's one grain (`tableDollars`), with one
 *    exception named here: the year's end total is the engine's own year-end total (`ledgerRowEndTotal`, the four
 *    buckets plus each inherited IRA, the Act 5 plan's KTD22), never a sum written in this file.
 *  - ROWS PAIR ONLY ON ONE ANSWER: the plan's rows and the what-if's carry the answer key they were asked under, and
 *    `composePaired` is called only when the two are equal (U14's report, its section 5).
 */
import { ledgerRowEndTotal } from '@engine/sequencing'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import {
  draftPretaxTotal,
  healthcarePriced,
  householdStockWeight,
  isDateRoute,
  isWorkingOwner,
  KIND_TO_BUCKET,
  workingYearLeftOverShownState,
  type KindBucket,
} from '@intake/intakeMap'
import { isEmployerPlanKind, takesDeposits } from '@intake/sanity'
import { applyBundle, type WhatIfRefusal } from '@intake/whatIf'
import { inheritedOwnerOf, isInheritedAccount } from '@intake/inheritedIra'
import { inheritedLastYear } from '@engine/inheritedRmd'
import { LEFT_OVER_CARRIES } from '@intake/workingYearLeftOverState'
import { lineDisplayName } from '@intake/budgetLines'
import { kindLabel } from '@intake/accountKinds'
import { formatMoney } from '@intake/moneyFormat'
import type { ScenarioDraft } from '@store/memoryModel'
import type {
  AccountKind,
  BudgetLineItem,
  DrawdownOrderKey,
  DrawdownPolicy,
  InheritedPace,
  LedgerYearRow,
  RothConversionPlan,
  SavedRecommendationV3,
  WhatIfBudgetLineV6,
  WhatIfLeverKind,
  WhatIfLeverV6,
} from '@shared/model'
import { WHAT_IF_LEVER_KINDS } from '@shared/model'
import { dateOddsText } from '../dateOdds'
import { verdictReadingText } from '../verdictSentence'
import { copy, slots, type CopyKey } from '../copy'
import type { BandPlanClockAnchor } from '../bandAnnotations'
import { capFirst, enteredAccountName, tablePerson, type TableMeta } from './tableRun'
import { tableDollars, yieldLine } from './yearTableChrome'
import type { WhatIfReading, WhatIfRunRefusal } from './whatIfRun'

// ---------------------------------------------------------------------------
// What the rail offers
// ---------------------------------------------------------------------------

/** One deposits lever's account: the plan's own figures, read off the committed draft. */
export interface DepositOffer {
  readonly accountId: string
  readonly ownerIndex: number
  readonly kind: AccountKind
  /** "Sam’s 401(k)", "your HSA". */
  readonly name: string
  readonly planDeposit: number
  /** The employer's dollar this account carries in the plan, and the field it rides in (absent: none). */
  readonly employer?: { readonly field: 'employerMatchAnnual' | 'hsaEmployerAnnual'; readonly plan: number }
}

export interface ClaimOffer {
  readonly personIndex: number
  readonly possessive: string
  readonly currentAge: number
  readonly planAge: number
}

/** One inherited IRA's pace lever (the Act 5 plan's U17, KTD21): its account, its name, the plan's own pace, and the years
 *  a chosen last year may take, from the year its figures were asked to the law's last year (`applyBundle`'s own bounds,
 *  read once here). */
export interface PaceOffer {
  readonly accountId: string
  /** Mid-sentence: "Alex’s IRA inherited in 2023". */
  readonly name: string
  /** A row's name: the same words, the first letter capital. */
  readonly label: string
  readonly plan: InheritedPace
  readonly firstYear: number
  readonly lastYear: number
}

/** Each inherited IRA whose pace is still a choice, in the entered order: an account the law empties in its asked year
 *  takes everything whatever the pace (KTD15: a lever only where the choice is open). ONE rule, read by the tray's
 *  offers and by Settings' pace row, so the gear never opens a tray row the tray does not draw. */
export function paceOffers(draft: ScenarioDraft): readonly PaceOffer[] {
  return draft.enteredAccounts.flatMap((a): PaceOffer[] => {
    if (a.id === undefined || !isInheritedAccount(a)) return []
    const owner = inheritedOwnerOf(draft, a)
    if (owner === undefined) return []
    const firstYear = a.inherited.askedYear
    const lastYear = inheritedLastYear(owner)
    if (lastYear <= firstYear) return []
    const name = enteredAccountName(draft, a)
    return [{ accountId: a.id, name, label: capFirst(name), plan: a.inherited.pace, firstYear, lastYear }]
  })
}

export interface RailOffers {
  /** The date route only: every year the date window holds, the plan's own year among them, and who stops then. */
  readonly stop?: {
    readonly years: readonly number[]
    readonly planYear: number
    /** The people still working, in order: every one of them stops in the lever's year (KTD15). */
    readonly working: readonly number[]
  }
  /** Lines by id (a household with a budget), or the one-figure total (one without). */
  readonly spending:
    | { readonly kind: 'lines'; readonly lines: readonly WhatIfBudgetLineV6[]; readonly unnamed: number }
    | { readonly kind: 'total'; readonly plan: number | undefined }
  readonly deposits: readonly DepositOffer[]
  /** The plan's household stock share (its accounts' value-weighted blend), or null where it can't be read. */
  readonly mix: { readonly planStockShare: number | null }
  readonly roth?: { readonly plan: RothConversionPlan | undefined }
  readonly order?: { readonly policy: DrawdownPolicy; readonly order: readonly DrawdownOrderKey[] | undefined }
  readonly claims: readonly ClaimOffer[]
  readonly aca?: { readonly planEnhanced: boolean }
  /** Each inherited IRA's pace (U17), in the entered order. */
  readonly paces: readonly PaceOffer[]
}

/** The answer's own door rule for the Roth plan (no hollow door): it rides the joint return, and needs pre-tax money to
 *  convert, or a saved plan to change or take out (milestone 3's review, round 2: a plan saved before the pre-tax money
 *  left could otherwise never be removed). ONE predicate, read by the tray's offers and by Settings' Roth row, so the gear
 *  never opens a tray row the tray does not draw (the review's C1). */
export function rothDoorOpen(draft: ScenarioDraft): boolean {
  return draft.filing === 'mfj' && (draftPretaxTotal(draft) > 0 || draft.rothConversion !== undefined)
}

/**
 * What the rail offers for a committed draft. `planStopYear` is the plan's stop year as the table's run carries it (the
 * date route), never re-derived (insight 132).
 */
export function railOffers(draft: ScenarioDraft, planStopYear: number | undefined): RailOffers {
  const working = draft.people.flatMap((p, i) => (p.workStatus === 'working' ? [i] : []))
  const stop =
    isDateRoute(draft) && planStopYear !== undefined
      ? {
          years: Array.from({ length: DATE_OFFSET_WINDOW_TOP + 1 }, (_, k) => draft.startCalendarYear + k),
          planYear: planStopYear,
          working,
        }
      : undefined
  const budget = draft.budget
  const spending: RailOffers['spending'] =
    budget !== undefined
      ? {
          kind: 'lines',
          lines: budget.filter((l): l is WhatIfBudgetLineV6 => l.id !== undefined),
          unnamed: budget.filter((l) => l.id === undefined).length,
        }
      : { kind: 'total', plan: draft.annualSpendingReal }
  const deposits: DepositOffer[] = []
  for (const a of draft.enteredAccounts) {
    // No deposits lever on a kind that takes none (KTD20; `applyBundle` refuses one by name).
    if (a.id === undefined || !isWorkingOwner(draft, a.ownerIndex) || !takesDeposits(a.kind)) continue
    const field = isEmployerPlanKind(a.kind) ? 'employerMatchAnnual' : a.kind === 'hsa' ? 'hsaEmployerAnnual' : undefined
    const planEmployer = field === undefined ? undefined : (a[field] ?? 0)
    deposits.push({
      accountId: a.id,
      ownerIndex: a.ownerIndex,
      kind: a.kind,
      name: slots.workbenchAccountOf(tablePerson(draft, a.ownerIndex, 0, 0).possessive, kindLabel(a.kind)),
      planDeposit: a.annualContribution ?? 0,
      ...(field !== undefined && planEmployer !== undefined && planEmployer > 0 ? { employer: { field, plan: planEmployer } } : {}),
    })
  }
  const claims: ClaimOffer[] = []
  draft.people.forEach((p, i) => {
    const age = p.currentAge
    const claim = p.socialSecurityClaimAge
    // KTD15: a claim already in effect is a fact (the engine's own test: claimed at t = 0 once the age is reached).
    if (age === undefined || claim === undefined || age >= claim || (p.pia ?? 0) <= 0) return
    claims.push({ personIndex: i, possessive: tablePerson(draft, i, age, age).possessive, currentAge: age, planAge: claim })
  })
  return {
    ...(stop !== undefined ? { stop } : {}),
    spending,
    deposits,
    mix: { planStockShare: householdStockWeight(draft) },
    ...(rothDoorOpen(draft) ? { roth: { plan: draft.rothConversion } } : {}),
    ...(draft.enteredAccounts.length > 0 ? { order: { policy: draft.drawdownPolicy, order: draft.drawdownOrder } } : {}),
    claims,
    ...(healthcarePriced(draft) ? { aca: { planEnhanced: draft.enhancedSubsidies === true } } : {}),
    paces: paceOffers(draft),
  }
}

// ---------------------------------------------------------------------------
// The bundle the rail holds
// ---------------------------------------------------------------------------

/** Each kind's target (the tray's row id). Exhaustive (insight 147): the old `default: return l.kind` gave every kind it
 *  did not name one target per household, so a kind held per account or per person (U17's pace) would have collided. */
const LEVER_TARGET: { readonly [K in WhatIfLeverKind]: (lever: Extract<WhatIfLeverV6, { kind: K }>) => string } = {
  'stop-year': () => 'stop-year',
  spending: (l) => (l.op === 'total' ? 'spending:total' : `spending:line:${l.op === 'remove' ? l.lineId : l.line.id}`),
  deposits: (l) => `deposits:${l.accountId}`,
  mix: () => 'mix',
  roth: () => 'roth',
  'withdrawal-order': () => 'withdrawal-order',
  'claim-age': (l) => `claim-age:${l.personIndex}`,
  'aca-subsidy': () => 'aca-subsidy',
  'inherited-pace': (l) => `inherited-pace:${l.accountId}`,
}

/** A lever's target inside a bundle (the rail holds at most one lever per target, as `applyBundle` requires). */
export function leverTarget(l: WhatIfLeverV6): string {
  return (LEVER_TARGET[l.kind] as (lever: WhatIfLeverV6) => string)(l)
}

/** The bundle with `lever` in its target's place (added at the end when new), or with that target dropped
 *  (`lever` null): the one write the rail's controls make. The order of the levers never matters to a run. */
export function withLever(bundle: readonly WhatIfLeverV6[], target: string, lever: WhatIfLeverV6 | null): readonly WhatIfLeverV6[] {
  const at = bundle.findIndex((l) => leverTarget(l) === target)
  if (lever === null) return at === -1 ? bundle : bundle.filter((_, i) => i !== at)
  if (at === -1) return [...bundle, lever]
  return bundle.map((l, i) => (i === at ? lever : l))
}

/** The recommendation's own action as a bundle (R22): its order and its Roth conversion plan, or null for a record
 *  saved before version 6 (it carries no plan, so it can't be run as it was recommended). */
export function recommendationBundle(record: SavedRecommendationV3): readonly WhatIfLeverV6[] | null {
  const a = record.action
  if (a.rothConversion === undefined) return null
  const order: WhatIfLeverV6 =
    a.policy === 'custom' && a.drawdownOrder !== undefined
      ? { kind: 'withdrawal-order', policy: 'custom', drawdownOrder: a.drawdownOrder }
      : { kind: 'withdrawal-order', policy: a.policy as Exclude<DrawdownPolicy, 'custom'> }
  return [order, { kind: 'roth', conversion: a.rothConversion }]
}

/** The lever kinds a bundle holds, in the vocabulary's own order. */
export function kindsOf(bundle: readonly WhatIfLeverV6[]): readonly WhatIfLeverKind[] {
  const held = new Set(bundle.map((l) => l.kind))
  return WHAT_IF_LEVER_KINDS.filter((k) => held.has(k))
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

export type ApplyState =
  | { readonly kind: 'empty' }
  /** A stop year or the mix is in the bundle (KTD15, the plan's U15): the words say why and that taking those out
   *  lets the rest apply exactly as compared. */
  | { readonly kind: 'withheld'; readonly words: string }
  /** The what-if is not yet worked out on the answer it would be applied to: Apply waits. */
  | { readonly kind: 'waiting' }
  /** Apply is open. `leftOverNote` when applying it leaves the plan's working-year figure needing a fresh yes, so the
   *  left-over credit the comparison carried stops until it is confirmed (the plan's U15, the adversary's L3). */
  | { readonly kind: 'open'; readonly leftOverNote?: string }

/** Apply's state for a bundle on the committed draft. `current`: the what-if's reading is worked out on this answer. */
export function applyState(draft: ScenarioDraft, bundle: readonly WhatIfLeverV6[], current: boolean): ApplyState {
  if (bundle.length === 0) return { kind: 'empty' }
  const stop = bundle.some((l) => l.kind === 'stop-year')
  const mix = bundle.some((l) => l.kind === 'mix')
  if (stop || mix) {
    return { kind: 'withheld', words: stop && mix ? copy.workbenchRailApplyWithheldBoth : stop ? copy.workbenchRailApplyWithheldStop : copy.workbenchRailApplyWithheldMix }
  }
  if (!current) return { kind: 'waiting' }
  return { kind: 'open', ...(leftOverNoteFor(draft, bundle) ? { leftOverNote: copy.workbenchRailApplyLeftOver } : {}) }
}

/** Does applying this bundle turn the plan's confirmed working-year figure stale while the plan carries a left-over
 *  credit? Read through the producers the answer reads (`workingYearLeftOverShownState`), on the copy Apply would
 *  write: the plan carries the credit, and the copy waits on W. */
export function leftOverNoteFor(draft: ScenarioDraft, bundle: readonly WhatIfLeverV6[]): boolean {
  if (!bundle.some((l) => l.kind === 'spending')) return false
  if (!LEFT_OVER_CARRIES[workingYearLeftOverShownState(draft)]) return false
  const applied = applyBundle(draft, bundle)
  return applied.ok && workingYearLeftOverShownState(applied.draft) === 'waiting-on-w'
}

// ---------------------------------------------------------------------------
// The two readings
// ---------------------------------------------------------------------------

/** A reading's count on the "X of 10" frame, or null where it gives none (an indeterminate headline). */
export function readingCount(r: WhatIfReading): { readonly n: number; readonly ceiling: boolean } | null {
  if (r.kind === 'headline') {
    const state = r.headline.outcomeState
    if (state === 'indeterminate') return null
    return state === 'over-funded' ? { n: 10, ceiling: true } : { n: r.headline.xOfTen.value, ceiling: false }
  }
  const n = Math.round(r.reading.quantizedLowerBound * 10)
  return n >= 10 ? { n: 10, ceiling: true } : { n, ceiling: false }
}

/** A reading's words: the strip's for a headline ("about 8 of 10"), the date's odds for an offset ("about 8 of 10
 *  odds"), each from its one producer. */
export function readingText(r: WhatIfReading): string | null {
  if (r.kind === 'headline') {
    const state = r.headline.outcomeState
    return state === 'indeterminate' ? null : verdictReadingText(state, r.headline.xOfTen.value)
  }
  return dateOddsText(r.reading.quantizedLowerBound)
}

export interface ReadingCell {
  /** The run's name, visible: "Your plan", "This what-if". */
  readonly label: string
  /** The count's words; null while worked out, or where the run gives none (`note` says which). */
  readonly text: string | null
  /** Under the count: which stop year the odds read (the date route), or why there is no count. */
  readonly note?: string
}

export interface ReadingsView {
  readonly plan: ReadingCell
  readonly whatIf: ReadingCell
  /** Equal counts: the even line. Never present beside a pending or failed what-if. */
  readonly even?: string
  /** The floor track and a spending what-if on extra lines only: why the counts can't move (in place of the even line). */
  readonly floorUnread?: string
}

export type WhatIfReadingState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'error' }
  | { readonly kind: 'refused'; readonly words: string }
  | { readonly kind: 'ready'; readonly reading: WhatIfReading; readonly offsetYears?: number; readonly updating: boolean }

export interface ReadingsInput {
  /** The plan's reading (the store's own: the committed curve's entry, or the spine headline), or null before one. */
  readonly plan: WhatIfReading | null
  readonly whatIf: WhatIfReadingState
  /** The date route: the plan's year, how the plan reads it, and the plan's start year. */
  readonly route: 'spine' | 'dated' | 'no-date'
  readonly startCalendarYear: number
  /** The floor track with a spending what-if whose levers touch only lines the floor pass never reads. */
  readonly floorUnread: boolean
}

const planStopNote = (route: ReadingsInput['route'], year: number): string =>
  route === 'no-date' ? slots.workbenchRailStopsPlanNoDate(year) : slots.workbenchRailStopsPlan(year)

/** The two readings, each under its run's name, and the difference line (R19, R20; OQ6: the odds name their stop). */
export function composeReadings(input: ReadingsInput): ReadingsView {
  const { plan, whatIf, route, startCalendarYear } = input
  const planText = plan === null ? null : readingText(plan)
  const planCell: ReadingCell = {
    label: copy.workbenchRailPlanLabel,
    text: planText,
    ...(plan?.kind === 'offset'
      ? { note: planStopNote(route, startCalendarYear + plan.reading.offsetYears) }
      : plan !== null && planText === null
        ? { note: copy.workbenchRailNoCount }
        : {}),
  }
  const whatIfCell = ((): ReadingCell => {
    const label = copy.workbenchRailWhatIfLabel
    if (whatIf.kind === 'empty') return { label, text: null, note: copy.workbenchRailEmptyReading }
    if (whatIf.kind === 'pending') return { label, text: null, note: copy.workbenchRailWorking }
    if (whatIf.kind === 'error') return { label, text: null, note: copy.workbenchRailError }
    if (whatIf.kind === 'refused') return { label, text: null, note: whatIf.words }
    const text = readingText(whatIf.reading)
    const stopNote =
      whatIf.reading.kind === 'offset' ? slots.workbenchRailStopsWhatIf(startCalendarYear + whatIf.reading.reading.offsetYears) : undefined
    const note = text === null ? copy.workbenchRailNoCount : whatIf.updating ? copy.workbenchRailUpdating : stopNote
    return { label, text, ...(note !== undefined ? { note } : {}) }
  })()
  const out: { plan: ReadingCell; whatIf: ReadingCell; even?: string; floorUnread?: string } = { plan: planCell, whatIf: whatIfCell }
  if (whatIf.kind !== 'ready' || whatIf.updating || plan === null) return out
  if (input.floorUnread) return { ...out, floorUnread: copy.workbenchRailFloorUnread }
  const a = readingCount(plan)
  const b = readingCount(whatIf.reading)
  if (a !== null && b !== null && a.n === b.n && a.ceiling === b.ceiling && planText !== null) {
    out.even = slots.workbenchRailEven(planText)
  }
  return out
}

/** The floor track with a spending what-if that touches only lines the floor pass never reads (an extra line, before
 *  and after): its odds read the essentials-only pass, so they can't move, and the rail says so instead of the even
 *  line (the plan's U15 test list). Any other kind of lever in the bundle can move the floor, so it says nothing. */
export function floorUnread(track: 'full' | 'floor', draft: ScenarioDraft, bundle: readonly WhatIfLeverV6[]): boolean {
  if (track !== 'floor' || bundle.length === 0) return false
  const byId = new Map((draft.budget ?? []).flatMap((l) => (l.id !== undefined ? [[l.id, l] as const] : [])))
  return bundle.every((l) => {
    if (l.kind !== 'spending' || l.op === 'total') return false
    const before = byId.get(l.op === 'remove' ? l.lineId : l.line.id)
    const beforeExtra = before === undefined || before.tier === 'discretionary'
    const afterExtra = l.op === 'remove' || l.line.tier === 'discretionary'
    return beforeExtra && afterExtra
  })
}

// ---------------------------------------------------------------------------
// The paired form
// ---------------------------------------------------------------------------

/** The paired columns every household can have, in their one reading order. An inherited IRA's two columns are per
 *  account (`InheritedPairedColumnId`) and read after the household's own withdrawals. */
export const PAIRED_COLUMNS = [
  'pay-0',
  'pay-1',
  'social-security',
  'spending',
  'marketplace',
  'put-in-pretax',
  'put-in-roth',
  'put-in-taxable',
  'put-in-hsa',
  'to-roth',
  'required',
  'taken-taxable',
  'taken-pretax',
  'taken-roth',
  'income-tax',
  'tax-on-pay',
  'payroll',
  'end-total',
] as const
export type HouseholdPairedColumnId = (typeof PAIRED_COLUMNS)[number]
/** One inherited IRA's required and taken columns, by the entered account's id (U17: two accounts never share one). */
export type InheritedPairedColumnId = `inherited-required:${string}` | `inherited-taken:${string}`
export type PairedColumnId = HouseholdPairedColumnId | InheritedPairedColumnId

const INHERITED_COLUMN = /^inherited-(required|taken):(.+)$/
const parseInherited = (id: PairedColumnId): { readonly field: 'required' | 'taken'; readonly accountId: string } | null => {
  const m = INHERITED_COLUMN.exec(id)
  return m === null ? null : { field: m[1] as 'required' | 'taken', accountId: m[2]! }
}

/** Columns in the one reading order: the household's by `PAIRED_COLUMNS`, each inherited IRA's pair after the
 *  household's own withdrawals (beside "taken out" columns of its kind), in the order given; each id once. */
export function orderPairedColumns(ids: Iterable<PairedColumnId>): readonly PairedColumnId[] {
  const inheritedRank = PAIRED_COLUMNS.indexOf('taken-roth') + 0.5
  const rank = (id: PairedColumnId) => (parseInherited(id) !== null ? inheritedRank : PAIRED_COLUMNS.indexOf(id as HouseholdPairedColumnId))
  return [...new Set(ids)].map((id, i) => ({ id, i })).sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i).map((x) => x.id)
}

/** A deposit's column by grouping. An inherited IRA takes no deposits (U13), so it has none. */
const PUT_IN: Readonly<Record<Exclude<KindBucket, 'inherited'>, PairedColumnId>> = {
  pretax: 'put-in-pretax',
  roth: 'put-in-roth',
  taxable: 'put-in-taxable',
  hsa: 'put-in-hsa',
}

/** Each lever kind's own columns (income tax and the year's end total ride every set). Exhaustive (insight 147). */
const KIND_COLUMNS: { readonly [K in WhatIfLeverKind]: (lever: Extract<WhatIfLeverV6, { kind: K }>, draft: ScenarioDraft) => readonly PairedColumnId[] } = {
  'stop-year': () => ['pay-0', 'pay-1'],
  spending: () => ['spending'],
  deposits: (l, d) => {
    const a = d.enteredAccounts.find((x) => x.id === l.accountId)
    const bucket = a === undefined ? undefined : KIND_TO_BUCKET[a.kind]
    return bucket === undefined || bucket === 'inherited' ? [] : [PUT_IN[bucket]]
  },
  mix: () => [],
  roth: () => ['to-roth', 'required'],
  'withdrawal-order': () => ['taken-taxable', 'taken-pretax', 'taken-roth'],
  'claim-age': () => ['social-security'],
  'aca-subsidy': () => ['marketplace'],
  // That account's own required and taken columns (U17); income tax and the year's end total ride every set, and the end
  // total already counts each inherited ledger (U12's row total).
  'inherited-pace': (l) => [`inherited-required:${l.accountId}`, `inherited-taken:${l.accountId}`],
}

/** The paired column set for a bundle: the union of its kinds' own columns, then income tax and the year's end total,
 *  in the one reading order (no column chooser in version 1). A second person's pay only where there is one. */
export function pairedColumnsFor(bundle: readonly WhatIfLeverV6[], draft: ScenarioDraft): readonly PairedColumnId[] {
  const want = new Set<PairedColumnId>(['income-tax', 'end-total'])
  // Inherited IRAs' pairs share one rank, so they keep the order added: add them in the entered order (the tray's and
  // Settings'), never the order the levers were pulled.
  const entered = (l: WhatIfLeverV6) => (l.kind === 'inherited-pace' ? draft.enteredAccounts.findIndex((a) => a.id === l.accountId) : -1)
  for (const l of [...bundle].sort((a, b) => entered(a) - entered(b))) {
    for (const c of (KIND_COLUMNS[l.kind] as (lever: WhatIfLeverV6, d: ScenarioDraft) => readonly PairedColumnId[])(l, draft)) want.add(c)
  }
  if (draft.people.length < 2) want.delete('pay-1')
  return orderPairedColumns(want)
}

/** One paired figure: its field's value and how it prints (the table's grain; "~" for the tool's projection). */
export interface PairedFigure {
  readonly value: number
  readonly dollars: number
  readonly approx: boolean
}

export interface PairedColumn {
  readonly id: PairedColumnId
  readonly header: string
}

export interface PairedRow {
  readonly t: number
  readonly year: number
  /** One pair per column, in column order: the plan's figure and the what-if's (null: that run has no row this year,
   *  or nothing moved). */
  readonly cells: readonly { readonly plan: PairedFigure | null; readonly whatIf: PairedFigure | null }[]
  /** The year a run's money runs out, said under the row it happens in, by run. */
  readonly notes: readonly string[]
}

export interface PairedTable {
  readonly columns: readonly PairedColumn[]
  readonly rows: readonly PairedRow[]
  /** The yield stopgap (KTD32) under each run whose taxable ledger holds money, named for that run (round 3's
   *  c3-adv-hidden-work-4), never one unlabeled line over both. */
  readonly yieldLines: readonly string[]
}

interface ColumnRead {
  readonly header: (meta: TableMeta) => string
  /** The row's field; `meta` is the row's own run's (an inherited IRA's entry is found there by its account). */
  readonly read: (r: LedgerYearRow, meta: TableMeta) => number | undefined
  /** Year 0's figure is a fact the household entered: it prints exactly. */
  readonly enteredInYear0?: (r: LedgerYearRow, meta: TableMeta) => boolean
  /** A balance: a zero prints. */
  readonly balance?: boolean
}

const COLUMN_READS: Readonly<Record<HouseholdPairedColumnId, ColumnRead>> = {
  'pay-0': { header: (m) => slots.workbenchPairPay(m.people[0]?.label ?? copy.personYou), read: (r) => r.payByPerson[0], enteredInYear0: () => true },
  'pay-1': { header: (m) => slots.workbenchPairPay(m.people[1]?.label ?? copy.personSpouse), read: (r) => r.payByPerson[1], enteredInYear0: () => true },
  'social-security': { header: () => copy.workbenchColSocialSecurity, read: (r) => r.socialSecurity },
  spending: {
    header: () => copy.workbenchColSpending,
    read: (r) => r.spending,
    // The year table's own rule: year 0's spending is the household's figure on the full pass, and in a working year.
    enteredInYear0: (r, m) => m.track === 'full' || r.workingYear !== undefined,
  },
  marketplace: { header: () => copy.workbenchLineMarketplace, read: (r) => r.premiums.acaNet },
  'put-in-pretax': { header: () => slots.workbenchPairPutIn(copy.workbenchSourcePretax), read: (r) => r.contribution.pretax },
  'put-in-roth': { header: () => slots.workbenchPairPutIn(copy.workbenchSourceRoth), read: (r) => r.contribution.roth },
  'put-in-taxable': { header: () => slots.workbenchPairPutIn(copy.workbenchSourceTaxable), read: (r) => r.contribution.taxable },
  'put-in-hsa': { header: () => slots.workbenchPairPutIn(copy.workbenchSourceHsa), read: (r) => r.contribution.hsa },
  'to-roth': { header: () => copy.workbenchPairToRoth, read: (r) => r.conversion },
  required: { header: () => copy.workbenchPairRequired, read: (r) => r.rmd },
  'taken-taxable': { header: () => slots.workbenchPairTakenFrom(copy.workbenchSourceTaxable), read: (r) => r.draw.taxable },
  'taken-pretax': { header: () => slots.workbenchPairTakenFrom(copy.workbenchSourcePretax), read: (r) => r.draw.pretax },
  'taken-roth': { header: () => slots.workbenchPairTakenFrom(copy.workbenchSourceRoth), read: (r) => r.draw.roth },
  'income-tax': { header: () => copy.workbenchColIncomeTax, read: (r) => r.taxPaid },
  // A working year's pay check taxes, each its own column (Income tax holds none of either: plan 4.0). No lever adds
  // these; Cash Flows sets them beside the pair wherever either run has a working year.
  'tax-on-pay': { header: () => copy.cashFlowsColPayIncomeTax, read: (r) => r.workingYear?.taxOnOutsideIncome },
  payroll: { header: () => copy.workbenchLinePayroll, read: (r) => r.workingYear?.payrollTax },
  // The one figure that is not a single field: the engine's own year-end total (`ledgerRowEndTotal`, the four buckets
  // plus each inherited IRA, KTD22), over the row's own year-end balances.
  'end-total': { header: () => copy.workbenchPairEndTotal, read: (r) => ledgerRowEndTotal(r), balance: true },
}

/** An inherited IRA's column, found in each run by the account's id (a row's `inherited` entries keep that run's own
 *  order), headed by the account's name: "Alex’s IRA inherited in 2023, required". */
function inheritedRead(field: 'required' | 'taken', accountId: string): ColumnRead {
  const at = (meta: TableMeta) => meta.inherited.findIndex((x) => x.accountId === accountId)
  const label = (meta: TableMeta) => meta.inherited[at(meta)]?.label ?? ''
  return {
    header: (m) => (field === 'required' ? slots.workbenchPairRequiredOf(label(m)) : slots.workbenchPairTakenFrom(label(m))),
    read: (r, m) => {
      const k = at(m)
      return k === -1 ? undefined : r.inherited?.[k]?.[field]
    },
  }
}

const columnRead = (id: PairedColumnId): ColumnRead => {
  const inherited = parseInherited(id)
  return inherited === null ? COLUMN_READS[id as HouseholdPairedColumnId] : inheritedRead(inherited.field, inherited.accountId)
}

function pairedFigure(c: ColumnRead, r: LedgerYearRow | undefined, meta: TableMeta): PairedFigure | null {
  if (r === undefined) return null
  const v = c.read(r, meta)
  if (v === undefined) return null
  const dollars = tableDollars(v)
  if (dollars === 0 && c.balance !== true) return null
  return { value: v, dollars, approx: !(r.t === 0 && c.enteredInYear0?.(r, meta) === true) }
}

/** The paired table: the plan's rows and the what-if's, year by year, on the given columns. Both row sets come from one
 *  answer (the caller pairs only on equal answer keys) and one market view, so row t is one calendar year in both. */
export function composePaired(input: {
  readonly columns: readonly PairedColumnId[]
  readonly plan: { readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta }
  readonly whatIf: { readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta }
  /** Each run's name in its sentences (Cash Flows names the what-if it shows: "New what-if", a kept name,
   *  "Recommended"); the rail's own two labels by default. */
  readonly names?: { readonly plan: string; readonly whatIf: string }
}): PairedTable {
  const { plan, whatIf } = input
  const meta = plan.meta
  // An inherited IRA's column needs the account in the plan's run (it names the header); a lever on a gone account is
  // refused before any run, so this drops nothing a household can reach.
  const columns = input.columns.filter((id) => {
    const inherited = parseInherited(id)
    return inherited === null || meta.inherited.some((x) => x.accountId === inherited.accountId)
  })
  const reads = columns.map(columnRead)
  const planName = input.names?.plan ?? copy.workbenchRailPlanLabel
  const whatIfName = input.names?.whatIf ?? copy.workbenchRailWhatIfLabel
  const byT = (rows: readonly LedgerYearRow[]) => new Map(rows.map((r) => [r.t, r]))
  const planByT = byT(plan.rows)
  const whatIfByT = byT(whatIf.rows)
  const ts = [...new Set([...plan.rows.map((r) => r.t), ...whatIf.rows.map((r) => r.t)])].sort((a, b) => a - b)
  const rows: PairedRow[] = ts.map((t) => {
    const p = planByT.get(t)
    const w = whatIfByT.get(t)
    const year = meta.startCalendarYear + t
    const notes = [
      ...(p?.ranOut === true ? [slots.workbenchPairRanOut(planName, year)] : []),
      ...(w?.ranOut === true ? [slots.workbenchPairRanOut(whatIfName, year)] : []),
    ]
    return {
      t,
      year,
      cells: reads.map((c) => ({
        plan: pairedFigure(c, p, plan.meta),
        whatIf: pairedFigure(c, w, whatIf.meta),
      })),
      notes,
    }
  })
  // A column neither run fills in any year (a withdrawal order's taxable column with no taxable money) is left out, as
  // the year table leaves out an empty column; income tax and the year's end total always show (a blank year is a fact).
  const keep = columns.map((id, i) => id === 'income-tax' || id === 'end-total' || rows.some((r) => r.cells[i]!.plan !== null || r.cells[i]!.whatIf !== null))
  const kept = columns.map((id, i) => ({ id, read: reads[i]! })).filter((_, i) => keep[i])
  const keptRows = rows.map((r) => ({ ...r, cells: r.cells.filter((_, i) => keep[i]) }))
  const yieldLines = [
    [planName, yieldLine(plan.meta, plan.rows)] as const,
    [whatIfName, yieldLine(whatIf.meta, whatIf.rows)] as const,
  ].flatMap(([run, line]) => (line === null ? [] : [slots.workbenchPairYield(run, line)]))
  return { columns: kept.map(({ id, read }) => ({ id, header: read.header(meta) })), rows: keptRows, yieldLines }
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** The stop-year lever's sentence: every person still working stops in the lever's year (KTD15). Two earners: "both of
 *  you" (shipped flagged for Briggsy's read); one: that person by name. */
export function stopWords(draft: ScenarioDraft, working: readonly number[], year: number): string {
  if (working.length >= 2) return slots.workbenchRailStopBoth(year)
  const i = working[0] ?? 0
  const p = tablePerson(draft, i, 0, 0)
  return slots.workbenchRailStopOne(p.mid, p.you, year)
}

/** A budget line's name, as the editor speaks it. */
export const lineName = (line: BudgetLineItem): string => lineDisplayName(line)

/** Money as the rail prints a plan's own figure: exact, whole dollars (a fact reads exactly, R11). */
export const railMoney = (v: number): string => formatMoney(v)

const REFUSAL_KEYS: Readonly<Record<Exclude<WhatIfRunRefusal['kind'], 'stop-year-outside-window' | 'deposits-over-limit'>, CopyKey>> = {
  'duplicate-target': 'workbenchRailRefusedDuplicate',
  'stop-year-all-retired': 'workbenchRailRefusedAllRetired',
  'line-gone': 'workbenchRailRefusedLineGone',
  'line-repeat-changed': 'workbenchRailRefusedLineRepeat',
  'line-already-there': 'workbenchRailRefusedLineThere',
  'spending-no-budget': 'workbenchRailRefusedNoBudget',
  'spending-total-on-budget': 'workbenchRailRefusedTotalOnBudget',
  'budget-dropped': 'workbenchRailRefusedBudgetDropped',
  'account-gone': 'workbenchRailRefusedAccountGone',
  'deposits-kind-takes-none': 'workbenchRailRefusedTakesNoDeposits',
  'deposits-owner-not-working': 'workbenchRailRefusedOwnerRetired',
  'deposits-field-not-on-kind': 'workbenchRailRefusedEmployerField',
  'person-gone': 'workbenchRailRefusedPersonGone',
  'claim-age-already-claimed': 'workbenchRailRefusedClaimed',
  'claim-age-in-the-past': 'workbenchRailRefusedClaimPast',
  'pace-not-inherited': 'workbenchRailRefusedPaceNotInherited',
  'pace-year-outside': 'workbenchRailRefusedPaceYear',
  'no-seed': 'workbenchRailRefusedNoSeed',
  'futures-differ': 'workbenchRailRefusedFutures',
}

/** A refusal in words, by name (exhaustive over U14's refusals and the runner's). */
export function refusalWords(r: WhatIfRunRefusal | WhatIfRefusal, startCalendarYear: number): string {
  if (r.kind === 'stop-year-outside-window') return slots.workbenchRailRefusedStopWindow(startCalendarYear, startCalendarYear + DATE_OFFSET_WINDOW_TOP)
  if (r.kind === 'deposits-over-limit') return copy.workbenchRailRefusedOverLimit
  return copy[REFUSAL_KEYS[r.kind]]
}

// ---------------------------------------------------------------------------
// A withdrawal policy and a Roth plan in words (moved out of `RailLevers.tsx` by Act 6's RC0, unchanged)
// ---------------------------------------------------------------------------

export const POLICY_LABEL: Readonly<Record<DrawdownPolicy, CopyKey>> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  'bracket-fill': 'leverPolicyBracketFill',
  custom: 'leverPolicyCustom',
}

export const BUCKET_LABEL: Readonly<Record<DrawdownOrderKey, CopyKey>> = {
  taxable: 'leverOrderBucketTaxable',
  pretax: 'leverOrderBucketPretax',
  roth: 'leverOrderBucketRoth',
}

/** A withdrawal policy in words: a named policy's label, or a custom order first to last. */
export function policyWords(policy: DrawdownPolicy, order: readonly DrawdownOrderKey[] | undefined): string {
  return policy === 'custom' && order !== undefined ? slots.workbenchFactOrder(order.map((k) => copy[BUCKET_LABEL[k]])) : copy[POLICY_LABEL[policy]]
}

/** An inherited IRA's pace in words (KTD21): the tray's compared value and Settings' value. `lawLastYear` is the year
 *  the law empties the account, where "even amounts" end. */
export function paceWords(pace: InheritedPace, lawLastYear: number): string {
  if (pace.kind === 'law-minimum') return copy.trayPaceLawMinimum
  return pace.kind === 'even' ? slots.trayPaceEven(lawLastYear) : slots.trayPaceEvenTo(pace.lastYear)
}

/** A Roth plan in words, on the plan's clock. */
export function rothWords(plan: RothConversionPlan | undefined, startCalendarYear: number, anchor: BandPlanClockAnchor): string {
  if (plan === undefined) return copy.workbenchRailRecRothNone
  const startYear = startCalendarYear + plan.startYearOffset
  return slots.workbenchFactRoth(railMoney(plan.annualAmountReal), startYear, startYear < anchor.startCalendarYear + anchor.yearsSincePlanBuilt, plan.years)
}
