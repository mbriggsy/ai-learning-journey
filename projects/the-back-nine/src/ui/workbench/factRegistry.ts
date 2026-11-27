/*
 * src/ui/workbench/factRegistry.ts — every saved fact's ONE editing home, COMPILE-ENFORCED (Act 5, U8; R14, R15;
 * re-pointed to the Profile drawers by Act 6 · RC13b, when the facts page and its step sheets were deleted).
 *
 * R14: everything the household told the tool can be found and changed. R15: each value has one door. This registry
 * makes both a build-time decision instead of author discipline (the R7 registry's precedent,
 * `src/ui/assumptionRegistry.ts`): every field of the saved plan is either SHOWN (a Profile drawer stamps the field that
 * edits it with `data-fact="<key>"`, `drawers/Fact.tsx`, inside a drawer this entry names), HOMED ELSEWHERE (a lever the
 * Action Items tray tries and applies, or a choice Tax Strategies makes: never a drawer field, so it has no second door),
 * or NOT-A-FACT, with the one-line why.
 *
 * THE GATE REACHES EVERY LEVEL (the R7 registry's GATE-SCOPE warning, answered): `keyof ScenarioDraft` sees only
 * the draft's own keys, so the containers each get a sibling FLAT record of their own — a new field on a person, the
 * health answers, an account, an inherited IRA's facts (U13) or an income stream fails `tsc` here until it is placed. The income
 * stream is `{…} & IncomeTaxTreatment`, a union whose arms share only `type`, so a plain `keyof` would drop every
 * arm's own field (`executedAfter2018`, the most consequential answer in the union, among them). Its record is
 * keyed by {@link KeysOfEachArm}, a DISTRIBUTIVE keyof that takes each arm's keys in turn: an arm field added later
 * fails to compile here too, which an arm list typed by hand would not. `tickerClassifications` is a
 * `Record<string, …>` (its `keyof` is `string`) and is argued below.
 *
 * The runtime half is the field walk (`__tests__/factRegistry.test.tsx`): it opens every Profile drawer the pages and
 * Add menus offer over made-up drafts that hold every field between them, and fails on a SHOWN field no drawer stamps,
 * or one stamped in a drawer this record does not name.
 */
import type { EnteredAccount, InheritedIraV7 } from '@shared/model'
import type { IncomeStream } from '@shared/model'
import type { HealthDraft, PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { DrawerTarget } from '../screens/profile/profileView'

/** A Profile drawer, by its target's kind (`profileView.ts`'s `DrawerTarget`). */
export type FactDrawerId = DrawerTarget['kind']

/** Where a fact that has no drawer is changed: the Action Items tray (a lever tried beside the plan and applied, U15's
 *  rule, RC4b), or Tax Strategies (the recommendation's goal and the heirs' bracket it ranks with, RC8). */
export type FactElsewhereId = 'tray' | 'tax-strategies'

/** How one field reaches its editing home. */
export type FactDisposition =
  /** Edited in a drawer, stamped `data-fact`, in one of these (more than one only where the record is opened two ways,
   *  never two drawers for one record: an account from its card or from Add, an income stream likewise). */
  | { readonly kind: 'shown'; readonly drawers: readonly FactDrawerId[] }
  /** Changed outside Profile, never in a drawer. */
  | { readonly kind: 'elsewhere'; readonly home: FactElsewhereId; readonly why: string }
  /** A container: its fields are walked by the named sibling record. */
  | { readonly kind: 'nested'; readonly record: 'person' | 'health' | 'account' | 'inherited' | 'income' }
  /** Not something the household told the tool: the why. */
  | { readonly kind: 'not-a-fact'; readonly why: string }

const shown = (...drawers: FactDrawerId[]): FactDisposition => ({ kind: 'shown', drawers })
const elsewhere = (home: FactElsewhereId, why: string): FactDisposition => ({ kind: 'elsewhere', home, why })
const notAFact = (why: string): FactDisposition => ({ kind: 'not-a-fact', why })

/** The stamp a field carries: a top-level key bare, a container's field prefixed by its record. */
export type FactStamp =
  | keyof ScenarioDraft
  | `person.${keyof PersonDraft}`
  | `health.${keyof HealthDraft}`
  | `account.${keyof EnteredAccount}`
  | `inherited.${keyof InheritedIraV7}`
  | `income.${IncomeFactKey}`

const ACCOUNT_DRAWERS: readonly FactDrawerId[] = ['account', 'new-account']
const INCOME_DRAWERS: readonly FactDrawerId[] = ['income', 'new-income']

export const DRAFT_FACTS: Record<keyof ScenarioDraft, FactDisposition> = {
  people: { kind: 'nested', record: 'person' },
  health: { kind: 'nested', record: 'health' },
  enteredAccounts: { kind: 'nested', record: 'account' },
  incomeStreams: { kind: 'nested', record: 'income' },
  // A hand-answered mix for a ticker the fund table lacks: the run reads it for the account that names the ticker, so
  // that account's drawer asks it (By the fund it holds, a fund B9 doesn't know).
  tickerClassifications: shown(...ACCOUNT_DRAWERS),
  // The spending figure and its unit, or the budget that sets it, and the survivor's share: Expenses → Living expenses.
  annualSpendingReal: shown('living'),
  spendEntryPeriod: shown('living'),
  survivorSpendingRatio: shown('living'),
  // A budget line's own `id` (schema version 6) is not a fact: the tool mints it so a kept what-if can name the line.
  budget: shown('living'),
  heirBracket: elsewhere('tax-strategies', 'The heirs’ bracket ranks the leave-more goal’s strategies, so it is set on Tax Strategies beside the goal.'),
  chosenGoal: elsewhere('tax-strategies', 'The goal is the recommendation’s question, asked and changed on Tax Strategies.'),
  drawdownPolicy: elsewhere('tray', 'The withdrawal order is a lever: tried beside the plan in the Action Items tray and applied there.'),
  drawdownOrder: elsewhere('tray', 'A custom order is the withdrawal-order lever’s own detail, tried and applied in the Action Items tray.'),
  rothConversion: elsewhere('tray', 'The Roth plan is a lever: tried beside the plan in the Action Items tray and applied there.'),
  enhancedSubsidies: elsewhere('tray', 'The marketplace subsidy rules are a lever: tried in the Action Items tray (from Health Care) and applied there.'),
  medicareExtrasByPerson: shown('medicare'),
  retirementState: shown('state'),
  workingYearCost: shown('working-cost'),
  workingYearLeftOver: shown('working-cost'),
  filing: notAFact('Married filing jointly is the product’s precondition, never an answer the household gives.'),
  startCalendarYear: notAFact('The year the plan was built: a stamp of when, not something the household told the tool.'),
  taxVintage: notAFact('The legacy tax-vintage stamp, carried for the saved plan’s add-only law.'),
  appDefaultVersion: notAFact('The app’s methodology stamp, written at save.'),
  seed: notAFact('The random-draw anchor minted once at the first run, so a saved answer reproduces.'),
  healthcareVintage: notAFact('A vintage stamp written fresh at save from the build’s own constants.'),
  savedAt: notAFact('The day of the last save, stamped at save.'),
  taxVintageDetail: notAFact('The tax tables’ vintage, stamped at save.'),
  dateVintage: notAFact('The date surface’s vintages, stamped at save.'),
  stateTaxVintage: notAFact('The state-tax tables’ vintage, stamped at save.'),
  savedRecommendation: notAFact(
    'A memory of a past recommendation, minted by its save gesture: a record of what the tool said, never an answer the household gives.',
  ),
  keptWhatIfs: notAFact(
    'Choices the household is trying beside the plan, kept in the workbench: what-ifs, never facts the plan runs on.',
  ),
}

export const PERSON_FACTS: Record<keyof PersonDraft, FactDisposition> = {
  name: shown('person'),
  sex: shown('person'),
  birthYear: shown('person'),
  currentAge: notAFact('Worked out from the birth year and the plan’s year; the birth year is the fact.'),
  workStatus: shown('person'),
  retirementAge: shown('person'),
  earnedIncomeReal: shown('salary'),
  pia: shown('social-security'),
  // A claim age not yet reached is a lever too (KTD15): tried in the Action Items tray; its one fact home is this drawer.
  socialSecurityClaimAge: shown('social-security'),
}

export const HEALTH_FACTS: Record<keyof HealthDraft, FactDisposition> = {
  enrolledPremiumMonthlyToday: shown('health'),
  slcspMonthlyToday: shown('health'),
  employerPlanCoversRetiredMember: shown('health'),
  oopMedicalAnnual: shown('medical'),
  workingYearInvestmentByPerson: shown('work-invest'),
  irmaaMagiSeed: shown('medicare'),
}

export const ACCOUNT_FACTS: Record<keyof EnteredAccount, FactDisposition> = {
  id: notAFact('A stable id the tool mints so a kept what-if can name the account; never something the household told it.'),
  ownerIndex: shown(...ACCOUNT_DRAWERS),
  kind: shown(...ACCOUNT_DRAWERS),
  valueToday: shown(...ACCOUNT_DRAWERS),
  manualBlend: shown(...ACCOUNT_DRAWERS),
  basis: shown(...ACCOUNT_DRAWERS),
  annualContribution: shown(...ACCOUNT_DRAWERS),
  employerMatchAnnual: shown(...ACCOUNT_DRAWERS),
  hsaEmployerAnnual: shown(...ACCOUNT_DRAWERS),
  // An inherited IRA's own facts (schema version 7): walked by their own record, by the gate-scope rule.
  inherited: { kind: 'nested', record: 'inherited' },
  ticker: shown(...ACCOUNT_DRAWERS),
}

/** An inherited IRA's facts (U13): its drawer's questions (`InheritedIraFields.tsx`) ask each one, on Net Worth's account
 *  drawer and its Add entry; the pace is a lever. */
export const INHERITED_FACTS: Record<keyof InheritedIraV7, FactDisposition> = {
  ownerBirthYear: shown(...ACCOUNT_DRAWERS),
  ownerBornFirstHalf: shown(...ACCOUNT_DRAWERS),
  ownerDeathYear: shown(...ACCOUNT_DRAWERS),
  ownerDiedBeforeApril1: shown(...ACCOUNT_DRAWERS),
  heirMoreThanTenYearsYounger: shown(...ACCOUNT_DRAWERS),
  askedYear: notAFact('The calendar year the account was entered, stamped by the tool: the year its asked figures belong to.'),
  askedFigure: shown(...ACCOUNT_DRAWERS),
  takenInAskedYear: shown(...ACCOUNT_DRAWERS),
  deathYearUntaken: shown(...ACCOUNT_DRAWERS),
  earlierWithdrawals: shown(...ACCOUNT_DRAWERS),
  leftTo: shown(...ACCOUNT_DRAWERS),
  pace: elsewhere('tray', 'An inherited IRA’s withdrawal pace is a lever: tried beside the plan in the Action Items tray and applied there.'),
}

/** Every key of every arm of a union (a DISTRIBUTIVE keyof): `keyof (A | B)` keeps only the keys both share. */
export type KeysOfEachArm<T> = T extends unknown ? keyof T : never
export type IncomeFactKey = KeysOfEachArm<IncomeStream>

export const INCOME_FACTS: Record<IncomeFactKey, FactDisposition> = {
  ownerIndex: shown(...INCOME_DRAWERS),
  type: shown(...INCOME_DRAWERS),
  annualRealToday: shown(...INCOME_DRAWERS),
  startAge: shown(...INCOME_DRAWERS),
  endAge: shown(...INCOME_DRAWERS),
  colaMode: shown(...INCOME_DRAWERS),
  colaPct: shown(...INCOME_DRAWERS),
  survivorPct: shown(...INCOME_DRAWERS),
  taxableFraction: shown(...INCOME_DRAWERS),
  executedAfter2018: shown(...INCOME_DRAWERS),
  modifiedAdoptsPost2018Rules: shown(...INCOME_DRAWERS),
  qualified: shown(...INCOME_DRAWERS),
  exclusionFraction: shown(...INCOME_DRAWERS),
}

const RECORDS = [
  ['', DRAFT_FACTS],
  ['person.', PERSON_FACTS],
  ['health.', HEALTH_FACTS],
  ['account.', ACCOUNT_FACTS],
  ['inherited.', INHERITED_FACTS],
  ['income.', INCOME_FACTS],
] as const

/** Every SHOWN field, by its stamp, with the drawers it may sit in: the list the field walk reads. */
export function shownFacts(): ReadonlyMap<FactStamp, readonly FactDrawerId[]> {
  const out = new Map<FactStamp, readonly FactDrawerId[]>()
  for (const [prefix, record] of RECORDS) {
    for (const [key, d] of Object.entries(record as Readonly<Record<string, FactDisposition>>)) {
      if (d.kind === 'shown') out.set(`${prefix}${key}` as FactStamp, d.drawers)
    }
  }
  return out
}

/** Every field homed outside Profile, by its stamp, with its home. */
export function elsewhereFacts(): ReadonlyMap<FactStamp, FactElsewhereId> {
  const out = new Map<FactStamp, FactElsewhereId>()
  for (const [prefix, record] of RECORDS) {
    for (const [key, d] of Object.entries(record as Readonly<Record<string, FactDisposition>>)) {
      if (d.kind === 'elsewhere') out.set(`${prefix}${key}` as FactStamp, d.home)
    }
  }
  return out
}
