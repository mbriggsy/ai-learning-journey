/*
 * src/ui/workbench/factRegistry.ts — the facts page's COMPILE-ENFORCED field list (Act 5, U8; R14, R15).
 *
 * R14: one page lists everything the household told the tool. R15: each value has one door. This registry
 * makes both a build-time decision instead of author discipline (the R7 registry's precedent,
 * `src/ui/assumptionRegistry.ts`): every field of the saved plan is either SHOWN (the page stamps its line with
 * `data-fact="<key>"` inside a section whose door is one this entry names) or NOT-A-FACT, with the one-line why.
 *
 * THE GATE REACHES EVERY LEVEL (the R7 registry's GATE-SCOPE warning, answered): `keyof ScenarioDraft` sees only
 * the draft's own keys, so the four containers each get a sibling FLAT record of their own — a new field on a
 * person, the health answers, an account or an income stream fails `tsc` here until it is placed. The income
 * stream is `{…} & IncomeTaxTreatment`, a union whose arms share only `type`, so a plain `keyof` would drop every
 * arm's own field (`executedAfter2018`, the most consequential answer in the union, among them). Its record is
 * keyed by {@link KeysOfEachArm}, a DISTRIBUTIVE keyof that takes each arm's keys in turn: an arm field added later
 * fails to compile here too, which an arm list typed by hand would not. `tickerClassifications` is a
 * `Record<string, …>` (its `keyof` is `string`) and is argued below.
 *
 * The runtime half is the field walk (`__tests__/factRegistry.test.tsx`): it renders the page over made-up drafts
 * that hold every field between them and fails on a SHOWN field whose stamp is missing, or that sits behind a door
 * this record does not name.
 */
import type { EnteredAccount } from '@shared/model'
import type { IncomeStream } from '@shared/model'
import type { HealthDraft, PersonDraft, ScenarioDraft } from '@store/memoryModel'

/** The facts page's sections that are steps of the guided walk, by the walk's own step ids
 *  (`intakeSteps`, `src/intake/questions.tsx`): each opens that step's own body. */
export type StepSectionId =
  | 'names'
  | 'work'
  | 'income'
  | 'social-security'
  | 'retirement-state'
  | 'spend'
  | 'health-quote'
  | 'employer-coverage'
  | 'oop-medical'
  | 'working-income'
  | 'irmaa-seed'
  | 'medicare-extras'
  | 'accounts'
  | 'other-income'
  | 'working-cost'
  | 'working-ledger'

/** Every door a fact can sit behind: a step's own body, a lever's own sheet (`editorSheets.tsx`), the
 *  AssumptionPanel at a knob's seat, or none (a value the answer or another page sets). */
export type FactDoorId =
  | StepSectionId
  | 'budget'
  | 'sequencing'
  | 'roth'
  | 'subsidy-regime'
  | 'survivor-ratio'
  | 'heir-bracket'
  /** The AssumptionPanel at its Medicare-extras seat: that answer's door where the walk has no extras step. */
  | 'extras-panel'
  | 'none'

/** How one field reaches the facts page. */
export type FactDisposition =
  /** Shown, stamped `data-fact`, behind one of these doors (more than one only where the door is chosen by the
   *  draft, never two doors at once: the spending total's is the spend step, or the budget while one governs; an
   *  order's is the withdrawal-order sheet, or none over no entered account). */
  | { readonly kind: 'shown'; readonly doors: readonly FactDoorId[] }
  /** A container: its fields are walked by the named sibling record. */
  | { readonly kind: 'nested'; readonly record: 'person' | 'health' | 'account' | 'income' }
  /** Not something the household told the tool: the why. */
  | { readonly kind: 'not-a-fact'; readonly why: string }

const shown = (...doors: FactDoorId[]): FactDisposition => ({ kind: 'shown', doors })
const notAFact = (why: string): FactDisposition => ({ kind: 'not-a-fact', why })

/** The stamp a field's line carries: a top-level key bare, a container's field prefixed by its record. */
export type FactStamp =
  | keyof ScenarioDraft
  | `person.${keyof PersonDraft}`
  | `health.${keyof HealthDraft}`
  | `account.${keyof EnteredAccount}`
  | `income.${IncomeFactKey}`

export const DRAFT_FACTS: Record<keyof ScenarioDraft, FactDisposition> = {
  people: { kind: 'nested', record: 'person' },
  health: { kind: 'nested', record: 'health' },
  enteredAccounts: { kind: 'nested', record: 'account' },
  incomeStreams: { kind: 'nested', record: 'income' },
  // A hand-answered mix for a ticker the fund table lacks: the run reads it for the account that names the ticker, so
  // that account's mix line prints it (`blendSourceOf`'s classified arm).
  tickerClassifications: shown('accounts'),
  annualSpendingReal: shown('spend', 'budget'),
  spendEntryPeriod: shown('spend'),
  survivorSpendingRatio: shown('survivor-ratio'),
  heirBracket: shown('heir-bracket'),
  // Since U15 the withdrawal order, the Roth plan and the subsidy regime open no editor on the facts page: each line
  // links to the What if page, where the lever is tried and applied (U8's lever doors, swapped).
  drawdownPolicy: shown('none'),
  drawdownOrder: shown('none'),
  // A budget line's own `id` (schema version 6) is not a fact either: the tool mints it so a kept what-if can
  // name the line. The page prints each line's category, amount, tier and window, never its id.
  budget: shown('budget'),
  rothConversion: shown('none'),
  enhancedSubsidies: shown('none'),
  medicareExtrasByPerson: shown('medicare-extras', 'extras-panel'),
  retirementState: shown('retirement-state'),
  workingYearCost: shown('working-cost'),
  workingYearLeftOver: shown('working-ledger'),
  chosenGoal: shown('none'),
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
  name: shown('names'),
  sex: shown('names'),
  birthYear: shown('names'),
  currentAge: notAFact('Worked out from the birth year and the plan’s year; the birth year is the fact.'),
  workStatus: shown('work'),
  retirementAge: shown('work'),
  earnedIncomeReal: shown('income'),
  pia: shown('social-security'),
  // A claim age not yet reached is a lever (KTD15): its door stays the Social Security step's (the step holds the benefit
  // too), and since U15 the line also links to the What if page.
  socialSecurityClaimAge: shown('social-security'),
}

export const HEALTH_FACTS: Record<keyof HealthDraft, FactDisposition> = {
  enrolledPremiumMonthlyToday: shown('health-quote'),
  slcspMonthlyToday: shown('health-quote'),
  employerPlanCoversRetiredMember: shown('employer-coverage'),
  oopMedicalAnnual: shown('oop-medical'),
  workingYearInvestmentByPerson: shown('working-income'),
  irmaaMagiSeed: shown('irmaa-seed'),
}

export const ACCOUNT_FACTS: Record<keyof EnteredAccount, FactDisposition> = {
  id: notAFact('A stable id the tool mints so a kept what-if can name the account; never something the household told it.'),
  ownerIndex: shown('accounts'),
  kind: shown('accounts'),
  valueToday: shown('accounts'),
  manualBlend: shown('accounts'),
  basis: shown('accounts'),
  annualContribution: shown('accounts'),
  employerMatchAnnual: shown('accounts'),
  hsaEmployerAnnual: shown('accounts'),
  ticker: shown('accounts'),
}

/** Every key of every arm of a union (a DISTRIBUTIVE keyof): `keyof (A | B)` keeps only the keys both share. */
export type KeysOfEachArm<T> = T extends unknown ? keyof T : never
export type IncomeFactKey = KeysOfEachArm<IncomeStream>

export const INCOME_FACTS: Record<IncomeFactKey, FactDisposition> = {
  ownerIndex: shown('other-income'),
  type: shown('other-income'),
  annualRealToday: shown('other-income'),
  startAge: shown('other-income'),
  endAge: shown('other-income'),
  colaMode: shown('other-income'),
  colaPct: shown('other-income'),
  survivorPct: shown('other-income'),
  taxableFraction: shown('other-income'),
  executedAfter2018: shown('other-income'),
  modifiedAdoptsPost2018Rules: shown('other-income'),
  qualified: shown('other-income'),
  exclusionFraction: shown('other-income'),
}

/** Every SHOWN field, by its stamp, with the doors it may sit behind: the list the field walk reads. */
export function shownFacts(): ReadonlyMap<FactStamp, readonly FactDoorId[]> {
  const out = new Map<FactStamp, readonly FactDoorId[]>()
  const add = (prefix: string, record: Readonly<Record<string, FactDisposition>>) => {
    for (const [key, d] of Object.entries(record)) {
      if (d.kind === 'shown') out.set(`${prefix}${key}` as FactStamp, d.doors)
    }
  }
  add('', DRAFT_FACTS)
  add('person.', PERSON_FACTS)
  add('health.', HEALTH_FACTS)
  add('account.', ACCOUNT_FACTS)
  add('income.', INCOME_FACTS)
  return out
}
