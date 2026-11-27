/**
 * src/ui/screens/profile/profileView.ts: Profile → Net Worth, Goals, Income, Savings, Expenses and Family, their pure
 * composer (Act 6 · RC13a, RC13b; plan docs/plans/6-rightcapital-ui-plan.md, RC13; ref 2.4, 2.5). The cards per draft,
 * each with the drawer it opens; Net Worth's master-detail. Decides every word and every card; the pages draw and decide
 * nothing.
 *
 * THE CARDS keep B9's input order, so a later card never asks before what its question reads (the walk's own order,
 * `intakeStepIds`): a person's birth year and work before their pay, pay before Social Security, Social Security before
 * the other income. Retired vs working: Salary and the investment-income-while-working card show only for a person still
 * working (`workStatus`, the date route's own predicate per person); a retired person's card shows the age they stopped.
 * Every figure is one the household entered (a fact, so no "~"). No Notes link anywhere.
 *
 * READ-ONLY (plan 4.0): a view-only tab's view carries no Add menu, and its drawers open with no Save or Delete
 * (`readOnly` on the view, which the drawers read).
 */
import type { AccountKind, EnteredAccount, IncomeStream, IncomeType, RetirementState, TickerClassification } from '@shared/model'
import { budgetGoverns } from '@budget/budgetModel'
import { INCOME_TYPES } from '@shared/model'
import type { CatchUpAccountKind } from '@engine/constants/contributions'
import type { ScenarioDraft } from '@store/memoryModel'
import { formatMoney } from '@intake/moneyFormat'
import { kindLabel } from '@intake/accountKinds'
import { anyPre65OrUnknown, anyRetiredPre65WhileAnotherWorks, blendOf, isDateRoute, medicareExtrasView, workingYearLeftOverShownState, workingYearLedgerForRun } from '@intake/intakeMap'
import { budgetTierSplitAtZero, governedSpendNotes, intakeStepIds } from '@intake/steps'
import { workingCostValueLine } from '@intake/assumptionLines'
import { workingYearCostStaleNote, workingYearLeftOverWaitingWords } from '@intake/workingYearLeftOver'
import { workingYearCostStaleness } from '@intake/workingYearQuote'
import type { LeftOverShownState } from '@intake/workingYearLeftOverState'
import { laterLines } from '@intake/workingYearLines'
import { laterRow, ledgerUnknownLines } from '@intake/workingYearLedgerRows'
import { formatPercent } from '@intake/moneyFormat'
import { leftOverLineKey } from '../../assumptionRegistry'
import { incomeTypeLabel, survivorNoteFor } from '@intake/otherIncome'
import { annualAdditionsCeilingFor, contributionCeilingFor, depositCeilingOf, isEmployerPlanKind, takesDeposits } from '@intake/sanity'
import { findBlendRow } from '@engine/reference/tickerBlend'
import type { CopyKey } from '../../copy'
import { copy, slots } from '../../copy'
import { tablePerson } from '../../workbench/tableRun'
import { accountName } from '../investment/investmentView'
import type { AccountFacet } from './drawers/accountFields'

export type ProfileScreenId =
  | 'profile-net-worth'
  | 'profile-goals'
  | 'profile-income'
  | 'profile-savings'
  | 'profile-expenses'
  | 'profile-family'
  | 'profile-blueprint'

/** What a card or an Add menu item opens. */
export type DrawerTarget =
  | { readonly kind: 'person'; readonly index: 0 | 1 }
  | { readonly kind: 'state' }
  | { readonly kind: 'salary'; readonly index: 0 | 1 }
  | { readonly kind: 'social-security'; readonly index: 0 | 1 }
  | { readonly kind: 'work-invest'; readonly index: 0 | 1 }
  | { readonly kind: 'income'; readonly index: number }
  | { readonly kind: 'new-income'; readonly type: IncomeType }
  | { readonly kind: 'account'; readonly index: number; readonly facet: Exclude<AccountFacet, 'all'> }
  /** A new account; `ownerIndex` names its first owner (the first-run stepper's pre-made card for a working person). */
  | { readonly kind: 'new-account'; readonly accountKind: AccountKind; readonly ownerIndex?: 0 | 1 }
  /** Expenses (RC13b): the spending figure or the budget worksheet, with the survivor's share. */
  | { readonly kind: 'living' }
  | { readonly kind: 'medical' }
  /** The pay check's W, with the money picture and the left-over question inside (a working household's); `costOnly`, the
   *  W question alone (the first-run stepper's Expenses card: the picture comes last, from Goals). */
  | { readonly kind: 'working-cost'; readonly costOnly?: boolean }
  /** Goals (RC13b): the marketplace quote and who covers a retired member while the other works; Medicare. */
  | { readonly kind: 'health' }
  | { readonly kind: 'medicare' }

/** Which drawing a card's band carries (the page maps each to its line icon). */
export type CardIcon =
  | 'person'
  | 'state'
  | 'salary'
  | 'social-security'
  | 'work-invest'
  | 'savings'
  | 'hsa'
  | IncomeType
  | 'living'
  | 'medical'
  | 'working-cost'
  | 'retirement'
  | 'health'
  | 'medicare'
  | 'money-picture'

export interface CardView {
  /** Stamped on the card (`data-profile-card`): focus comes back to it when its drawer closes. */
  readonly id: string
  readonly kind: string
  readonly icon: CardIcon | null
  readonly name: string
  readonly rows: readonly { readonly label: string; readonly value: string }[]
  readonly note?: string
  readonly target: DrawerTarget
}

export type AddItem =
  | { readonly id: string; readonly label: string; readonly target: DrawerTarget }
  | { readonly id: string; readonly label: string; readonly items: readonly { readonly id: string; readonly label: string; readonly target: DrawerTarget }[] }

export interface AddMenuView {
  readonly label: string
  readonly items: readonly AddItem[]
}

export interface CardsPageView {
  readonly intro: string
  readonly cards: readonly CardView[]
  /** Absent on a read-only tab, and on a page with nothing to add. */
  readonly add: AddMenuView | null
  /** Lines under the cards (an empty page's words, the page's one stopgap). */
  readonly lines: readonly string[]
}

export interface NetWorthRowView {
  readonly id: string
  readonly name: string
  readonly meta: string
  readonly mix: string
  readonly balance: string
  readonly target: DrawerTarget
}

export interface NetWorthView {
  readonly intro: string
  readonly bandLabel: string
  readonly total: string
  readonly category: string
  readonly categoryTotal: string
  readonly header: string
  readonly rows: readonly NetWorthRowView[]
  readonly empty: string | null
  readonly add: AddMenuView | null
  /** The balances as entered (in the aged year where one is given), then the two stopgap lines, word for word. */
  readonly notes: readonly string[]
}

// ── Shared words ─────────────────────────────────────────────────────────────────────────────────────────────────────

const dollars = (v: number): string => slots.workbenchFactDollars(formatMoney(Math.round(v)))
const person = (d: ScenarioDraft, i: number) => tablePerson(d, i, 0, 0)
const upper = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))
const working = (d: ScenarioDraft, i: number): boolean => d.people[i]?.workStatus === 'working'
const BOTH = [0, 1] as const

const STATE_LABEL: Readonly<Record<RetirementState, CopyKey>> = {
  NC: 'stateOptionNC',
  PA: 'stateOptionPA',
  FL: 'stateOptionFL',
  // The recognised-but-unpriced roster rides "somewhere else" until built (the picker offers no arm for them).
  SC: 'stateOptionElsewhere',
  GA: 'stateOptionElsewhere',
  DE: 'stateOptionElsewhere',
  elsewhere: 'stateOptionElsewhere',
}
export const stateLabel = (s: RetirementState): string => copy[STATE_LABEL[s]]

/** B9's four tax treatments, as the Investment pages name them. */
export type Treatment = 'pretax' | 'roth' | 'taxable' | 'hsa'

/** Each account kind's treatment. Exhaustive, so a new kind fails to compile here until its treatment is decided (the
 *  Act 5 plan's KTD20, insight 147; the if-chain this replaced filed any unnamed kind as "Pre-tax"). Its own table, not
 *  the engine's `KIND_TO_BUCKET`: gap 3's inherited IRA sits outside the engine's four buckets (KTD22). */
const KIND_TREATMENT: Readonly<Record<AccountKind, Treatment>> = {
  '401k': 'pretax',
  '403b': 'pretax',
  'traditional-ira': 'pretax',
  'roth-401k': 'roth',
  'roth-ira': 'roth',
  brokerage: 'taxable',
  hsa: 'hsa',
}

const TREATMENT_WORDS: Readonly<Record<Treatment, string>> = {
  pretax: copy.investBucketPretax,
  roth: copy.investBucketRoth,
  taxable: copy.investBucketTaxable,
  hsa: copy.investBucketHsa,
}

/** An account kind's tax treatment, by id (Blueprint keys its legend on it). */
export const treatmentIdOf = (kind: AccountKind): Treatment => KIND_TREATMENT[kind]

/** An account kind's tax treatment, in the Investment pages' words. */
export function treatmentOf(kind: AccountKind): string {
  return TREATMENT_WORDS[KIND_TREATMENT[kind]]
}

/** An account's card name: its owner and kind ("Alex’s 401(k)"), the Investment pages' own naming. */
export const accountCardName = (d: ScenarioDraft, a: EnteredAccount): string => upper(accountName(d, a))

// ── Family ───────────────────────────────────────────────────────────────────────────────────────────────────────────

function workValue(d: ScenarioDraft, i: number): string {
  const p = d.people[i]!
  if (p.workStatus === 'working') return copy.workStatusWorking
  if (p.workStatus === 'retired') return p.retirementAge === undefined ? copy.workStatusRetired : slots.profileStoppedAt(p.retirementAge)
  return copy.profileNotAnswered
}

export function familyView(d: ScenarioDraft): CardsPageView {
  const cards: CardView[] = BOTH.map((i) => {
    const p = d.people[i]
    return {
      id: `person-${i}`,
      kind: i === 0 ? copy.profileKindClient : copy.profileKindCoClient,
      icon: 'person',
      name: person(d, i).label,
      rows: [
        { label: copy.profileRowBorn, value: p.birthYear === undefined ? copy.profileNotAnswered : slots.profileBornIn(p.birthYear, p.currentAge) },
        { label: copy.sexLegend, value: p.sex === undefined ? copy.profileNotAnswered : p.sex === 'male' ? copy.sexMale : copy.sexFemale },
        { label: copy.profileRowWork, value: workValue(d, i) },
      ],
      target: { kind: 'person', index: i },
    }
  })
  const state = d.retirementState
  cards.push({
    id: 'state',
    kind: copy.profileKindHomeState,
    icon: 'state',
    name: copy.profileHomeStateName,
    rows: [],
    note: state === undefined ? copy.profileStateUnanswered : stateLabel(state),
    target: { kind: 'state' },
  })
  return { intro: copy.profileFamilyIntro, cards, add: null, lines: [] }
}

// ── Income ───────────────────────────────────────────────────────────────────────────────────────────────────────────

const INCOME_NOUN: Readonly<Record<IncomeType, CopyKey>> = {
  pension: 'incomeTypePension',
  rental: 'incomeTypeRental',
  alimony: 'incomeTypeAlimony',
  annuity: 'incomeTypeAnnuity',
  other: 'incomeTypeOther',
}

/** An income stream's card name ("Sam’s pension"). */
export const incomeCardName = (d: ScenarioDraft, s: IncomeStream): string =>
  slots.workbenchFactOwned(person(d, s.ownerIndex).possessive, copy[INCOME_NOUN[s.type]].toLowerCase())

/** When a stream pays, with its end (milestone 3's review, X8: the deleted facts page printed both): "Now, through age 70",
 *  "From age 66, for life", or "Ended at 70" once the owner is past its last paying age (never "Now" past the end). */
function paysValue(d: ScenarioDraft, s: IncomeStream): string {
  const age = d.people[s.ownerIndex]?.currentAge
  if (age !== undefined && s.endAge !== undefined && s.endAge < age) return slots.profileEndedAt(s.endAge)
  return slots.profilePaysSpan(age !== undefined && s.startAge <= age ? null : s.startAge, s.endAge)
}

/** How a stream keeps up with inflation (the deleted facts page's "Against inflation" row). */
function raiseValue(s: IncomeStream): string {
  if (s.colaMode === 'real-flat') return copy.incomeColaReal
  if (s.colaMode === 'nominal-flat') return copy.incomeColaNominal
  return s.colaPct === undefined ? copy.profileNotAnswered : slots.profileRises(formatPercent(s.colaPct))
}

export function incomeView(d: ScenarioDraft, readOnly: boolean): CardsPageView {
  const cards: CardView[] = []
  for (const i of BOTH) {
    if (!working(d, i)) continue
    const pay = d.people[i].earnedIncomeReal
    cards.push({
      id: `salary-${i}`,
      kind: copy.profileKindSalary,
      icon: 'salary',
      name: slots.profileSalaryOf(person(d, i).possessive),
      rows: [{ label: copy.profileRowYearlyPay, value: pay === undefined ? copy.profileNotAnswered : dollars(pay) }],
      target: { kind: 'salary', index: i },
    })
  }
  for (const i of BOTH) {
    const p = d.people[i]
    const claimYear = p.birthYear !== undefined && p.socialSecurityClaimAge !== undefined ? p.birthYear + p.socialSecurityClaimAge : undefined
    // Unknown where either age is (milestone 3's review, B7): never a "No" the draft can't back.
    const claimed = p.currentAge === undefined || p.socialSecurityClaimAge === undefined ? undefined : p.currentAge >= p.socialSecurityClaimAge
    cards.push({
      id: `ss-${i}`,
      kind: copy.profileKindSocialSecurity,
      icon: 'social-security',
      name: slots.profileSocialSecurityOf(person(d, i).possessive),
      rows: [
        { label: copy.profileRowMonthlyAtFra, value: p.pia === undefined ? copy.profileNotAnswered : dollars(p.pia / 12) },
        { label: copy.profileRowStarts, value: claimYear === undefined || p.socialSecurityClaimAge === undefined ? copy.profileNotAnswered : slots.profileStartsAt(p.socialSecurityClaimAge, claimYear) },
        { label: copy.profileRowClaiming, value: claimed === undefined ? copy.profileNotAnswered : claimed ? copy.profileYes : copy.profileNo },
      ],
      target: { kind: 'social-security', index: i },
    })
  }
  for (const i of BOTH) {
    if (!working(d, i)) continue
    const v = d.health.workingYearInvestmentByPerson?.[i]
    cards.push({
      id: `invest-${i}`,
      kind: copy.profileKindWorkInvest,
      icon: 'work-invest',
      name: slots.profileWorkInvestOf(person(d, i).possessive),
      rows: [{ label: copy.profileRowWhileWorking, value: v === undefined ? copy.profileNotAnswered : dollars(v) }],
      target: { kind: 'work-invest', index: i },
    })
  }
  d.incomeStreams.forEach((s, index) => {
    cards.push({
      id: `income-${index}`,
      kind: incomeTypeLabel(s.type),
      icon: s.type,
      name: incomeCardName(d, s),
      rows: [
        { label: copy.profileRowEachYear, value: dollars(s.annualRealToday) },
        { label: copy.profileRowPays, value: paysValue(d, s) },
        { label: copy.profileRowAgainstInflation, value: raiseValue(s) },
      ],
      // The widow's number in plain words, never a raw survivor share (R40): what the other keeps if the owner dies.
      // The walk's other-income list printed it under each stream; Act 6 · RC14 deleted that list and gave it this home.
      note: survivorNoteFor(d, s),
      target: { kind: 'income', index },
    })
  })
  const add: AddMenuView | null = readOnly
    ? null
    : { label: copy.profileAddIncome, items: INCOME_TYPES.map((type) => ({ id: type, label: incomeTypeLabel(type), target: { kind: 'new-income', type } as const })) }
  const anyWorking = BOTH.some((i) => working(d, i))
  return {
    intro: copy.profileIncomeIntro,
    cards,
    add,
    lines: [
      ...(anyWorking ? [copy.profileSalaryStopgap] : []),
      // Door words only where the Add menu is drawn (milestone 3's review, X12).
      ...(d.incomeStreams.length === 0 ? [readOnly ? copy.profileIncomeOtherNoneReadOnly : copy.profileIncomeOtherNone] : []),
    ],
  }
}

// ── Savings ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The page an Add menu sits on: Net Worth holds every account; Savings holds the deposits, so it offers only a kind
 *  that takes them (the Act 5 plan's KTD20: the one hand list, split per page). */
export type AccountAddPage = 'net-worth' | 'savings'

/** The account kinds in RightCapital's Add-menu shape over B9's four tax treatments: Pre-tax and Roth open their kinds,
 *  Taxable and HSA are one kind each. A hand list: `profileView.test.ts` pins each page's kinds, so a new kind reds there
 *  rather than compiling through. A group left with no kind on a page is dropped from it. */
function accountAddItems(page: AccountAddPage): readonly AddItem[] {
  const offered = (k: AccountKind): boolean => page === 'net-worth' || takesDeposits(k)
  const leaf = (k: AccountKind) => ({ id: k, label: kindLabel(k), target: { kind: 'new-account', accountKind: k } as const })
  const group = (id: string, label: string, kinds: readonly AccountKind[]): AddItem[] => {
    const items = kinds.filter(offered).map(leaf)
    return items.length === 0 ? [] : [{ id, label, items }]
  }
  const single = (k: AccountKind, label: string): AddItem[] =>
    offered(k) ? [{ id: k, label, target: { kind: 'new-account', accountKind: k } }] : []
  return [
    ...group('pretax', copy.investBucketPretax, ['401k', '403b', 'traditional-ira']),
    ...group('roth', copy.investBucketRoth, ['roth-401k', 'roth-ira']),
    ...single('brokerage', copy.investBucketTaxable),
    ...single('hsa', copy.investBucketHsa),
  ]
}

/** The legal limit on one account's deposits this year (its owner's age; shared across that person's accounts of one
 *  kind), or null for an uncapped kind or an owner whose age is unknown; 0 for a kind that takes no deposits. */
export function depositLimit(d: ScenarioDraft, a: Pick<EnteredAccount, 'kind' | 'ownerIndex'>): number | null {
  const age = d.people[a.ownerIndex]?.currentAge
  if (age === undefined || !Number.isInteger(age) || age < 0 || age > 120) return null
  return contributionCeilingFor(a.kind, age)
}

/** The words for each deposit-ceiling family a limit is shared across. */
const LIMIT_FAMILY: Readonly<Record<CatchUpAccountKind, () => string>> = {
  employerPlan: slots.profileLimitFamilyPlan,
  ira: slots.profileLimitFamilyIra,
  hsa: slots.profileLimitFamilyHsa,
}

/** The lines a deposit drawer prints about the legal limits (computed from the one ceiling table, never typed). Each of
 *  the table's answers is named: uncapped, takes no deposits, or a family's shared limit (KTD20; the literals this
 *  replaced read any kind they did not name as an IRA under the IRA limit). */
export function limitLines(d: ScenarioDraft, a: Pick<EnteredAccount, 'kind' | 'ownerIndex'>): readonly string[] {
  const ceiling = depositCeilingOf(a.kind)
  if (ceiling === null) return [slots.profileLimitNone()]
  if (ceiling === 'takes-no-deposits') return [copy.accountTakesNoDeposits]
  const limit = depositLimit(d, a)
  if (limit === null) return []
  const owner = person(d, a.ownerIndex).label
  const lines = [slots.profileLimitShared(owner === copy.personYou ? copy.personYouMid : owner, dollars(limit), LIMIT_FAMILY[ceiling]())]
  const age = d.people[a.ownerIndex]?.currentAge
  if (isEmployerPlanKind(a.kind) && age !== undefined) lines.push(slots.profileLimitAdditions(dollars(annualAdditionsCeilingFor(age))))
  return lines
}

/** A Savings card's Limit row: "No legal limit" for an uncapped kind, else the limit this year, or not answered where the
 *  owner's age is unknown. Savings never draws a kind that takes no deposits. */
function limitRowValue(d: ScenarioDraft, a: EnteredAccount): string {
  if (depositCeilingOf(a.kind) === null) return copy.profileNoLimit
  const limit = depositLimit(d, a)
  return limit === null ? copy.profileNotAnswered : dollars(limit)
}

export function savingsView(d: ScenarioDraft, readOnly: boolean): CardsPageView {
  const anyWorking = BOTH.some((i) => working(d, i))
  const cards: CardView[] = []
  d.enteredAccounts.forEach((a, index) => {
    // The deposits page: a working owner's accounts that take deposits (KTD20).
    if (!working(d, a.ownerIndex) || !takesDeposits(a.kind)) return
    const rows: { label: string; value: string }[] = [{ label: copy.accountContributionLabel, value: a.annualContribution === undefined ? copy.profileNone : dollars(a.annualContribution) }]
    if (isEmployerPlanKind(a.kind)) rows.push({ label: copy.accountMatchLabel, value: a.employerMatchAnnual === undefined ? copy.profileNone : dollars(a.employerMatchAnnual) })
    if (a.kind === 'hsa') rows.push({ label: copy.accountHsaEmployerLabel, value: a.hsaEmployerAnnual === undefined ? copy.profileNone : dollars(a.hsaEmployerAnnual) })
    rows.push({ label: copy.profileRowLimit, value: limitRowValue(d, a) })
    cards.push({
      id: `account-${index}`,
      kind: kindLabel(a.kind),
      icon: a.kind === 'hsa' ? 'hsa' : 'savings',
      name: accountCardName(d, a),
      rows,
      target: { kind: 'account', index, facet: 'deposits' },
    })
  })
  // Door words ("Add one with Add saving") only where the Add menu is drawn (milestone 3's review, X12).
  const noAccounts = readOnly ? copy.profileSavingsNoAccountsReadOnly : copy.profileSavingsNoAccounts
  // Nobody working: "neither of you is working" only where both said retired; an unanswered work status is still needed,
  // on Family, never read as stopped (milestone 3's review, round 2).
  const unanswered = BOTH.filter((i) => d.people[i]?.workStatus === undefined)
  const lines = !anyWorking
    ? [unanswered.length === 0 ? copy.profileSavingsNoneWorking : slots.profileWorkUnanswered(unanswered.map((i) => person(d, i).possessive).join(' and '))]
    : cards.length === 0
      ? [noAccounts]
      : [copy.profileSavingsLimitsNote]
  return {
    intro: cards.length > 0 ? copy.profileSavingsIntro : copy.profileSavingsIntroNoCards,
    cards,
    // Deposits go only into a working person's account: with nobody working there is nothing to add here.
    add: readOnly || !anyWorking ? null : { label: copy.profileAddSaving, items: accountAddItems('savings') },
    lines,
  }
}

// ── Expenses (RC13b) ─────────────────────────────────────────────────────────────────────────────────────────────

/** The spending figure as entered: by the month with its year, by the year, or the budget's year-0 total. */
export function spendingValue(d: ScenarioDraft): string {
  const annual = d.annualSpendingReal
  if (annual === undefined) return copy.profileNotAnswered
  if (budgetGoverns(d.budget)) return slots.workbenchFactSpendBudget(formatMoney(Math.round(annual)))
  return d.spendEntryPeriod === 'month'
    ? slots.workbenchFactPerMonthAndYear(formatMoney(Math.round(annual / 12)), formatMoney(Math.round(annual)))
    : slots.workbenchFactPerYear(formatMoney(Math.round(annual)))
}

/** The left-over answer's words by build 2's SHOWN state (`workingYearLeftOverShownState`, the one read the question and
 *  the panel's methodology row use), never by the stored reply alone: a "saved" reply carries nothing while the figure
 *  for a working year is out of date, or where the question isn't asked (the U8 review's F1, moved here from the facts
 *  page). The states whose meaning is not the reply read the methodology row's own line (`leftOverLineKey`). */
const LEFT_OVER_VALUE: Readonly<Record<LeftOverShownState, (d: ScenarioDraft) => string>> = {
  'not-asked': (d) => copy[leftOverLineKey('not-asked', workingYearLeftOverWaitingWords(d))],
  'waiting-on-w': (d) => copy[leftOverLineKey('waiting-on-w', workingYearLeftOverWaitingWords(d))],
  'saved-moved': (d) => copy[leftOverLineKey('saved-moved', workingYearLeftOverWaitingWords(d))],
  absent: () => copy.profileNotAnswered,
  saved: (d) =>
    d.workingYearLeftOver?.kind === 'saved' ? slots.workbenchFactLeftOverSaved(formatMoney(d.workingYearLeftOver.quotedReal)) : copy.profileNotAnswered,
  spent: () => copy.workingLedgerLeftOverSpent,
  'not-sure': () => copy.workingLedgerLeftOverNotSure,
}
export const leftOverValue = (d: ScenarioDraft): string => LEFT_OVER_VALUE[workingYearLeftOverShownState(d)](d)

export function expensesView(d: ScenarioDraft): CardsPageView {
  const governs = budgetGoverns(d.budget)
  const split = governs ? budgetTierSplitAtZero(d.budget) : null
  const livingNote = [
    ...(split !== null && split.essentials + split.extras > 0 ? [slots.budgetTierSplit(formatMoney(split.essentials), formatMoney(split.extras))] : []),
    ...(governs && d.budget !== undefined ? governedSpendNotes(d.budget) : []),
  ]
  const oop = d.health.oopMedicalAnnual
  const cards: CardView[] = [
    {
      id: 'living',
      kind: copy.profileKindLiving,
      icon: 'living',
      name: copy.profileLivingName,
      rows: [
        { label: governs ? copy.profileRowBudget : copy.profileRowSpending, value: spendingValue(d) },
        { label: copy.profileRowSurvivor, value: slots.workbenchFactPercent(formatPercent(d.survivorSpendingRatio)) },
      ],
      ...(livingNote.length > 0 ? { note: livingNote.join(' ') } : {}),
      target: { kind: 'living' },
    },
    {
      id: 'medical',
      kind: copy.profileKindMedical,
      icon: 'medical',
      name: copy.profileMedicalName,
      rows: [{ label: copy.profileRowEachYear, value: oop === undefined ? copy.workbenchFactBlank : dollars(oop) }],
      target: { kind: 'medical' },
    },
  ]
  // A working household's Pre-retirement living expenses (RightCapital's card, critique 11): W, and the left-over answer
  // read by its shown state. An absent W says so in the panel row's own words (the run checks no working year until then).
  if (isDateRoute(d)) {
    cards.push({
      id: 'working-cost',
      kind: copy.profileKindWorkingCost,
      icon: 'working-cost',
      name: copy.profileWorkingCostName,
      rows: [
        { label: copy.profileRowWorkingYear, value: workingCostValueLine(d) },
        { label: copy.profileRowLeftOver, value: leftOverValue(d) },
      ],
      target: { kind: 'working-cost' },
    })
  }
  return { intro: isDateRoute(d) ? copy.profileExpensesIntroWorking : copy.profileExpensesIntro, cards, add: null, lines: [] }
}

// ── Goals (RC13b) ────────────────────────────────────────────────────────────────────────────────────────────────

const perMonth = (v: number | undefined): string => (v === undefined ? copy.profileNotAnswered : slots.workbenchFactPerMonth(formatMoney(Math.round(v))))

/** One person's Medicare extras, from the run's own read (`medicareExtrasView`: an affirmed zero reads "$0 a month", an
 *  entered figure exactly, and the tool's own figure says it is the tool's), else the stored answer exactly. */
export function extrasValue(d: ScenarioDraft, i: 0 | 1): string {
  const view = medicareExtrasView(d)
  if (view !== null) {
    const p = view[i]
    if (p === undefined) return copy.profileNotAnswered
    return p.provenance === 'typical' ? slots.workbenchFactExtrasToolFigure(formatMoney(p.monthly)) : perMonth(p.monthly)
  }
  const e = d.medicareExtrasByPerson?.[i]
  return e?.kind === 'none' ? perMonth(0) : e?.kind === 'entered' ? perMonth(e.monthly) : copy.profileNotAnswered
}

/** The money picture card's rows: year 0's bottom line, then each later working year that changes or runs short (the
 *  picture's own lines, `workingYearLedgerRows.ts`), or the one line saying why none can be drawn. A STALE W draws no
 *  rows (milestone 3's review, X3): the ledger would read a W the household no longer stands by ("Left over in 2026:
 *  $16,985" where year 0 at today's spending runs $4,015 short), so the card says what the W drawer says, which withholds
 *  its picture too (`WorkingCostDrawer.tsx`'s `MoneyPicture`). */
function moneyPictureCard(d: ScenarioDraft): CardView {
  const base = { id: 'money-picture', kind: copy.profileKindMoneyPicture, icon: 'money-picture', name: copy.profileMoneyPictureName, target: { kind: 'working-cost' } } as const
  if (d.workingYearCost === undefined) return { ...base, rows: [], note: copy.profileMoneyPictureNoW }
  if (workingYearCostStaleness(d) !== null) return { ...base, rows: [], note: workingYearCostStaleNote(d) ?? workingCostValueLine(d) }
  const ledger = workingYearLedgerForRun(d)
  if (ledger === 'unknown') return { ...base, rows: [], note: ledgerUnknownLines(d).join(' ') }
  const y0 = ledger.year0
  const rows = [
    {
      label: y0.bottomLine < 0 ? slots.profileShortIn(y0.calendarYear) : slots.profileLeftOverIn(y0.calendarYear),
      value: y0.bottomLine < 0 ? slots.workingLedgerOutflow(formatMoney(-y0.bottomLine)) : slots.workingLedgerAmount(formatMoney(y0.bottomLine)),
    },
    ...laterLines(ledger.laterYears).map((line) => {
      const r = laterRow(line, d, ledger)
      return { label: r.label, value: r.value }
    }),
  ]
  return { ...base, rows }
}

export function goalsView(d: ScenarioDraft): CardsPageView {
  const steps = intakeStepIds(d)
  const cards: CardView[] = BOTH.map((i) => ({
    id: `retirement-${i}`,
    kind: copy.profileKindRetirement,
    icon: 'retirement',
    name: slots.profileRetirementOf(person(d, i).possessive),
    rows: [{ label: copy.profileRowWork, value: d.people[i].workStatus === 'working' ? copy.profileFindsDate : workValue(d, i) }],
    target: { kind: 'person', index: i },
  }))
  // Health care before Medicare: asked while anyone is under 65 (the walk's own gate, `intakeStepIds`).
  if (anyPre65OrUnknown(d)) {
    const v = d.health.employerPlanCoversRetiredMember
    cards.push({
      id: 'health',
      kind: copy.profileKindHealth,
      icon: 'health',
      name: copy.profileHealthName,
      rows: [
        { label: copy.profileRowPremium, value: perMonth(d.health.enrolledPremiumMonthlyToday) },
        { label: copy.profileRowBenchmark, value: perMonth(d.health.slcspMonthlyToday) },
        ...(anyRetiredPre65WhileAnotherWorks(d)
          ? [{ label: copy.profileRowCoverage, value: v === undefined ? copy.profileNotAnswered : v ? copy.employerCoverageCovered : copy.employerCoverageOwn }]
          : []),
      ],
      target: { kind: 'health' },
    })
  }
  // Medicare: each person's extras (the run prices them for every household it builds health care for), and the
  // surcharge's look-back income where the walk asks it (anyone 64 or older).
  const seed = d.health.irmaaMagiSeed
  cards.push({
    id: 'medicare',
    kind: copy.profileKindMedicare,
    icon: 'medicare',
    name: copy.profileMedicareName,
    rows: [
      ...BOTH.map((i) => ({ label: slots.profileExtrasOf(person(d, i).possessive), value: extrasValue(d, i) })),
      ...(steps.includes('irmaa-seed')
        ? [
            { label: copy.irmaaSeedTwoBackLabel, value: seed?.[0] === undefined ? copy.profileNotAnswered : dollars(seed[0]) },
            { label: copy.irmaaSeedOneBackLabel, value: seed?.[1] === undefined ? copy.profileNotAnswered : dollars(seed[1]) },
          ]
        : []),
    ],
    target: { kind: 'medicare' },
  })
  if (isDateRoute(d)) cards.push(moneyPictureCard(d))
  return { intro: copy.profileGoalsIntro, cards, add: null, lines: [] }
}

// ── Net Worth ────────────────────────────────────────────────────────────────────────────────────────────────────────

function mixWords(d: ScenarioDraft, a: EnteredAccount): string {
  const words = (b: TickerClassification): string => {
    const { stock, bond, cash } = blendOf(b)
    return slots.profileMixLine(stock, bond, cash)
  }
  if (a.ticker !== undefined) {
    const row = findBlendRow(a.ticker)
    if (row !== undefined) return slots.profileMixFund(a.ticker, row.name)
    const theirs = d.tickerClassifications[a.ticker]
    return theirs === undefined ? copy.profileMixTickerNone : slots.profileMixFundYours(a.ticker)
  }
  return a.manualBlend === undefined ? copy.profileMixNone : words(a.manualBlend)
}

export function netWorthView(d: ScenarioDraft, agedBalancesYear: number | undefined, readOnly: boolean): NetWorthView {
  // Each account rounded to the dollar first, then summed: the rule Snapshot's card, Tax Allocation and Balance Sheet
  // print by (`investedKinds`), so the four totals agree to the dollar, cents or not.
  const total = d.enteredAccounts.reduce((s, a) => s + (Number.isFinite(a.valueToday) ? Math.round(a.valueToday) : 0), 0)
  const rows = d.enteredAccounts.map((a, index) => ({
    id: `account-${index}`,
    name: accountCardName(d, a),
    meta: slots.profileAccountMeta(treatmentOf(a.kind), person(d, a.ownerIndex).label),
    mix: mixWords(d, a),
    balance: dollars(a.valueToday),
    target: { kind: 'account', index, facet: 'holdings' } as const,
  }))
  return {
    intro: copy.profileNetWorthIntro,
    bandLabel: copy.snapshotInvestedTitle,
    total: dollars(total),
    category: copy.profileNetWorthInvestment,
    categoryTotal: dollars(total),
    header: slots.profileInvestmentTotal(copy.profileNetWorthInvestment, dollars(total)),
    rows,
    empty: rows.length === 0 ? (readOnly ? copy.profileNetWorthNoAccountsReadOnly : copy.profileNetWorthNoAccounts) : null,
    add: readOnly ? null : { label: copy.profileAddAccount, items: accountAddItems('net-worth') },
    notes: [
      agedBalancesYear === undefined ? copy.snapshotInvestedAsEntered : slots.snapshotInvestedAsEnteredIn(agedBalancesYear),
      copy.snapshotInvestedStopgap,
      copy.profileInheritedIraStopgap,
    ],
  }
}

/** The page of each Profile screen. */
const PAGE_TITLE: Readonly<Record<ProfileScreenId, CopyKey>> = {
  'profile-net-worth': 'shellPageNetWorth',
  'profile-goals': 'shellPageGoals',
  'profile-income': 'shellPageIncome',
  'profile-savings': 'shellPageSavings',
  'profile-expenses': 'shellPageExpenses',
  'profile-family': 'shellPageFamily',
  'profile-blueprint': 'shellPageBlueprint',
}
export const profilePageTitle = (screen: ProfileScreenId): string => copy[PAGE_TITLE[screen]]

/** The card a drawer target belongs to (focus returns there on close). `newIndex`: where a new record landed. */
export function cardIdOf(target: DrawerTarget, newIndex?: number): string | null {
  switch (target.kind) {
    case 'person':
      return `person-${target.index}`
    case 'state':
      return 'state'
    case 'salary':
      return `salary-${target.index}`
    case 'social-security':
      return `ss-${target.index}`
    case 'work-invest':
      return `invest-${target.index}`
    case 'income':
      return `income-${target.index}`
    case 'account':
      return `account-${target.index}`
    case 'new-income':
      return newIndex === undefined ? null : `income-${newIndex}`
    case 'new-account':
      return newIndex === undefined ? null : `account-${newIndex}`
    case 'living':
    case 'medical':
    case 'working-cost':
    case 'health':
    case 'medicare':
      return target.kind
  }
}
