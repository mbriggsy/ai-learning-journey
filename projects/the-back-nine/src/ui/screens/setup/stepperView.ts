/**
 * src/ui/screens/setup/stepperView.ts: the first-run stepper's pure half (Act 6 · RC14; plan
 * docs/plans/6-rightcapital-ui-plan.md, RC14; ref 2.3 and 1.3; `rc-shell/dataentry-03.png` to `-09.png`). Which steps,
 * which cards on each, and Next's check. `Stepper.tsx` draws it and decides nothing.
 *
 * THE SIX STEPS carry the deleted walk's step ids (`intakeStepIds`, `src/intake/steps.ts`, keeps choosing which appear),
 * by the plan's table: Family (names, work, the state), Income (pay, Social Security, other income, investment income
 * while working), Savings (the accounts' deposits), Net Worth (the accounts' balances and mix), Expenses (spending,
 * out-of-pocket, W), Goals (the marketplace quote, coverage while the other works, the look-back income, Medicare's
 * extras, the money picture). The orders that matter hold: the state before spending; spending and out-of-pocket before
 * W; the accounts and every other input before the money picture, which is last (so in setup the Expenses W card opens
 * the W question alone, and the Goals money picture card the whole drawer: the picture reads Goals' coverage and quote).
 * Each card's reads, re-checked against the table: the Social Security drawer reads the birth year (Family), the deposit
 * limits the owner's age (Family), the spending help the state (Family), the out-of-pocket help the accounts (Net Worth),
 * the W quote spending, out-of-pocket and the state (all before it), the Medicare drawer the ages (Family). None reads a
 * later step's card.
 *
 * THE CARDS are Profile's own (`profileView.ts`, RC13), pre-made where B9 has the field: a Salary card per working person
 * and a Social Security card per person (Income), Living expenses and out-of-pocket (Expenses), a Retirement card per
 * person (Goals), and on Savings one 401(k) card per working person who owns no account yet, which opens a new account
 * for them (no draft holds it until its Save: a card is a door, never a stored guess). Goals shows a card only where the
 * walk asked its step (the Medicare card where the walk asked the look-back income or the extras).
 *
 * NEXT RUNS THE WALK'S CONTINUE (`continueCheck`, `src/intake/stepChecks.ts`) over the fields of the step's walk ids
 * (`walkStepFields`), on the store's current draft (insight 036), and names the first refusal's card and drawer, which the
 * stepper opens at it. Two disarms ride the touched set, each what the walk's own session held:
 *  - the spending period: answered this session (the Living expenses drawer's Save of a tapped unit) or by the stepper's
 *    provenance (a vault or a dev seed; `IntakeApp`'s), or moot where a budget governs (its lines are yearly figures and
 *    its face asks no unit);
 *  - W's period: always, because the face owns it (ruling 38). No W reaches the draft but through the W drawer's Save,
 *    which ran that gate with the face's own mark, or from a vault or a seed, which passed it before it was saved (the
 *    walk's face marked an entered W's unit answered at mount for the same reason).
 * Complete runs every step's check in order (a step reached by a chevron, or left by Previous after an edit, is checked
 * again), so the stepper's Complete is the walk's terminal advance: nothing reaches the home past a refusal.
 */
import { budgetGoverns } from '@budget/budgetModel'
import { kindLabel } from '@intake/accountKinds'
import { blockedLeadFor, missingFactLines } from '@intake/missingFacts'
import { isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { WORKING_COST_ANSWER_FIELD, WORKING_COST_FIELD, WORKING_COST_PERIOD_FIELD, type FieldPath } from '@intake/sanity'
import { continueCheck } from '@intake/stepChecks'
import { intakeStepIds, walkStepFields, type StepSectionId } from '@intake/steps'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { copy, slots, type CopyKey } from '../../copy'
import { tablePerson } from '../../workbench/tableRun'
import {
  cardIdOf,
  expensesView,
  familyView,
  goalsView,
  incomeView,
  netWorthView,
  savingsView,
  type CardView,
  type CardsPageView,
  type DrawerTarget,
  type NetWorthView,
} from '../profile/profileView'

export type SetupStepId = 'family' | 'income' | 'savings' | 'net-worth' | 'expenses' | 'goals'

export const SETUP_STEPS: readonly SetupStepId[] = ['family', 'income', 'savings', 'net-worth', 'expenses', 'goals']

/** Where each walk step id sits (plan RC14's table). The accounts are one record on two steps: Savings shows their
 *  deposits, Net Worth their balances, and both check the deposits' rules (an account added on Net Worth brings them). */
export const SETUP_STEPS_OF: Readonly<Record<StepSectionId, readonly SetupStepId[]>> = {
  names: ['family'],
  work: ['family'],
  'retirement-state': ['family'],
  income: ['income'],
  'social-security': ['income'],
  'other-income': ['income'],
  'working-income': ['income'],
  accounts: ['savings', 'net-worth'],
  spend: ['expenses'],
  'oop-medical': ['expenses'],
  'working-cost': ['expenses'],
  'health-quote': ['goals'],
  'employer-coverage': ['goals'],
  'irmaa-seed': ['goals'],
  'medicare-extras': ['goals'],
  'working-ledger': ['goals'],
}

/** The walk's step ids this draft has on `step`, in the walk's order. */
export function stepWalkIds(d: ScenarioDraft, step: SetupStepId): readonly StepSectionId[] {
  return intakeStepIds(d).filter((id) => SETUP_STEPS_OF[id].includes(step))
}

/** The fields `step`'s Next checks, in the walk's order. */
export function stepFields(d: ScenarioDraft, step: SetupStepId): readonly FieldPath[] {
  return stepWalkIds(d, step).flatMap((id) => walkStepFields(d, id))
}

/** The spending period's state in this session (`setupPeriod.ts`). */
export interface SetupPeriodRead {
  readonly periodConfirmed: boolean
  readonly spendPeriodAnswered: boolean
}

/** The disarms the walk's session held (the header). */
export function stepTouched(d: ScenarioDraft, period: SetupPeriodRead): ReadonlySet<FieldPath> {
  const touched = new Set<FieldPath>([WORKING_COST_PERIOD_FIELD])
  if (period.spendPeriodAnswered || budgetGoverns(d.budget)) touched.add('spendEntryPeriod')
  return touched
}

/** Where a refusal on `field` is answered: its drawer (and the card it belongs to), or null where no drawer holds it. */
export function targetForField(field: FieldPath): DrawerTarget | null {
  const [head, at, leaf] = field.split('.')
  const i = Number(at)
  if (head === 'people' && (i === 0 || i === 1)) {
    if (leaf === 'birthYear' || leaf === 'retirementAge') return { kind: 'person', index: i }
    if (leaf === 'pia' || leaf === 'socialSecurityClaimAge') return { kind: 'social-security', index: i }
  }
  if (field === 'annualSpendingReal' || field === 'spendEntryPeriod') return { kind: 'living' }
  if (head === 'medicareExtrasByPerson') return { kind: 'medicare' }
  if (head === 'enteredAccounts' && Number.isInteger(i)) return { kind: 'account', index: i, facet: 'deposits' }
  if (field === WORKING_COST_FIELD || field === WORKING_COST_ANSWER_FIELD) return { kind: 'working-cost', costOnly: true }
  return null
}

/** A step's check that refused: the step, the first refusal's field, and the drawer (and card) that answers it. */
export interface StepBlock {
  readonly step: SetupStepId
  readonly field: FieldPath
  readonly target: DrawerTarget | null
  readonly card: string | null
}

/** NEXT: the walk's Continue over `step`'s fields, on the store's current draft. */
export function checkStep(model: MemoryModel, step: SetupStepId, period: SetupPeriodRead): StepBlock | null {
  const d = model.getSnapshot().draft
  const { first } = continueCheck(model, { id: step, fields: stepFields(d, step) }, stepTouched(d, period), period.periodConfirmed)
  if (first === null) return null
  const target = targetForField(first.field)
  return { step, field: first.field, target, card: target === null ? null : cardIdOf(target) }
}

/** Every step's check from `from` up to (not including) `to`, in order: the first block, or null. Complete passes the
 *  whole run; a forward chevron the steps it would pass. */
export function checkSteps(model: MemoryModel, from: number, to: number, period: SetupPeriodRead): StepBlock | null {
  for (let i = Math.max(0, from); i < Math.min(to, SETUP_STEPS.length); i += 1) {
    const block = checkStep(model, SETUP_STEPS[i]!, period)
    if (block !== null) return block
  }
  return null
}

// ── The pages ────────────────────────────────────────────────────────────────────────────────────────────────────────

const NAV_LABEL: Readonly<Record<SetupStepId, CopyKey>> = {
  family: 'shellPageFamily',
  income: 'shellPageIncome',
  savings: 'shellPageSavings',
  'net-worth': 'shellPageNetWorth',
  expenses: 'shellPageExpenses',
  goals: 'shellPageGoals',
}
const HEAD: Readonly<Record<SetupStepId, CopyKey>> = {
  family: 'setupHeadFamily',
  income: 'setupHeadIncome',
  savings: 'setupHeadSavings',
  'net-worth': 'setupHeadNetWorth',
  expenses: 'setupHeadExpenses',
  goals: 'setupHeadGoals',
}

/** The chevron's label ("Family"). */
export const setupNavLabel = (step: SetupStepId): string => copy[NAV_LABEL[step]]
/** The page title ("Step 2 – Pay and other income"). */
export const setupTitle = (step: SetupStepId): string => slots.setupStepTitle(SETUP_STEPS.indexOf(step) + 1, copy[HEAD[step]])

export type SetupPage = { readonly kind: 'cards'; readonly view: CardsPageView } | { readonly kind: 'net-worth'; readonly view: NetWorthView }

/** One 401(k) card per working person who owns no account yet: a door to a new account for them (the header). */
function premadeAccounts(d: ScenarioDraft): readonly CardView[] {
  return ([0, 1] as const)
    .filter((i) => d.people[i].workStatus === 'working' && !d.enteredAccounts.some((a) => a.ownerIndex === i))
    .map((i) => {
      const name = slots.workbenchAccountOf(tablePerson(d, i, 0, 0).possessive, kindLabel('401k'))
      return {
        id: `new-account-${i}`,
        kind: kindLabel('401k'),
        icon: 'savings',
        name: name === '' ? name : name[0]!.toUpperCase() + name.slice(1),
        rows: [{ label: copy.accountContributionLabel, value: copy.profileNotAnswered }],
        target: { kind: 'new-account', accountKind: '401k', ownerIndex: i },
      }
    })
}

/** The cards on Goals the walk asked for (the header). */
function goalsCards(d: ScenarioDraft, cards: readonly CardView[]): readonly CardView[] {
  const ids = stepWalkIds(d, 'goals')
  const asked = (card: string): boolean =>
    card === 'health'
      ? ids.includes('health-quote') || ids.includes('employer-coverage')
      : card === 'medicare'
        ? ids.includes('irmaa-seed') || ids.includes('medicare-extras')
        : card === 'money-picture'
          ? ids.includes('working-ledger')
          : true
  return cards.filter((c) => asked(c.id))
}

export function setupPage(d: ScenarioDraft, step: SetupStepId): SetupPage {
  switch (step) {
    case 'family':
      return { kind: 'cards', view: { ...familyView(d), intro: copy.setupIntroFamily } }
    case 'income':
      return { kind: 'cards', view: { ...incomeView(d, false), intro: copy.setupIntroIncome } }
    case 'savings': {
      const base = savingsView(d, false)
      const premade = premadeAccounts(d)
      const anyWorking = d.people.some((p) => p.workStatus === 'working')
      if (!anyWorking) return { kind: 'cards', view: base }
      return {
        kind: 'cards',
        view: {
          ...base,
          intro: copy.setupIntroSavings,
          cards: [...base.cards, ...premade],
          lines: base.cards.length === 0 && premade.length > 0 ? [copy.setupSavingsPremade] : base.lines,
        },
      }
    }
    case 'net-worth':
      return { kind: 'net-worth', view: { ...netWorthView(d, undefined, false), intro: copy.setupIntroNetWorth } }
    case 'expenses': {
      const base = expensesView(d)
      return {
        kind: 'cards',
        view: {
          ...base,
          intro: isDateRoute(d) ? copy.setupIntroExpensesWorking : copy.setupIntroExpenses,
          // The W question alone here: the money picture comes last, on Goals (the header).
          cards: base.cards.map((c) => (c.target.kind === 'working-cost' ? { ...c, target: { kind: 'working-cost', costOnly: true } } : c)),
        },
      }
    }
    case 'goals': {
      const base = goalsView(d)
      return { kind: 'cards', view: { ...base, intro: copy.setupIntroGoals, cards: goalsCards(d, base.cards) } }
    }
  }
}

/** The names in the stepper's bar (the shell's own reading: trimmed, the blank left out). */
export const setupNames = (d: ScenarioDraft): readonly string[] => d.people.map((p) => (p.name ?? '').trim()).filter((n) => n !== '')

/** What the answer still waits for, on the last step beside Complete (the provisional strip's lines, which left setup;
 *  plan RC14): the lead, then each block with its closing line, the household's still-needed facts first. Null where
 *  nothing is missing. Complete still opens the plan, whose pages name the same facts (never a wall), and the box says
 *  so only while it is true: `completeOpens` is the stepper's own `checkSteps` over the whole run (a step whose check
 *  refuses, W's owed after a switch to working, say, keeps Complete on that step). "Until these are in" goes with the
 *  still-needed facts alone, right after them: a fact no entry can fix is never "in", so a withheld-only box promises
 *  no until, and the line never sits after the tool's-limit tail (the review's D2). */
export interface MissingBlock {
  readonly lead: string
  readonly lines: readonly string[]
}

/** The step each fact the answer can wait for is entered on (`missingRequiredFacts`'s keys, by the walk step that asked
 *  it and plan RC14's table): an account's facts sit on both account steps, as the accounts do. */
const FACT_STEPS: Readonly<Record<string, readonly SetupStepId[]>> = {
  workStatusLegend: ['family'],
  birthYearLabel: ['family'],
  sexLegend: ['family'],
  stopAgeLabel: ['family'],
  salaryLabel: ['income'],
  ssAmountLabel: ['income'],
  ssClaimLabel: ['income'],
  workInvestmentLabel: ['income'],
  addAccount: ['savings', 'net-worth'],
  accountBasisLabel: ['savings', 'net-worth'],
  classifierLegend: ['savings', 'net-worth'],
  spendLabel: ['expenses'],
  enrolledPremiumLabel: ['goals'],
  slcspLabel: ['goals'],
  employerCoverageLegend: ['goals'],
  qIrmaaSeedHeading: ['goals'],
}

/** The steps a fact sits on; a key this table has not met counts on every step, so a new fact can only take a ✓ away. */
export const factSteps = (labelKey: string): readonly SetupStepId[] => FACT_STEPS[labelKey] ?? SETUP_STEPS

/** Whether `step` still owes a fact the household can enter (the "Still needed" kind; a fact no entry can fix is not the
 *  step's to finish). A passed step takes its ✓ only when this is false, so a ✓ never stands over "Still needed". */
export function stepOwesFacts(d: ScenarioDraft, step: SetupStepId): boolean {
  return missingRequiredFacts(d).some((m) => (m.kind ?? 'absent') === 'absent' && factSteps(m.labelKey).includes(step))
}

export function missingBlock(d: ScenarioDraft, completeOpens: boolean): MissingBlock | null {
  const missing = missingRequiredFacts(d)
  if (missing.length === 0) return null
  // Every name, never "N more": the last screen before the answer has the room, and whose where two people owe one.
  const { stillNeeded, cannotPrice } = missingFactLines(missing, { people: d.people })
  const opens = completeOpens ? [copy.setupMissingOpens] : []
  // "Until these are in, your plan's pages say…" only while Complete would open those pages (milestone 3's review, round 2).
  const until = completeOpens ? [copy.setupMissingUntil] : []
  return {
    // The strip's keep-going lead ("takes shape as you go") reads wrong beside Complete; the withheld lead stands as it is.
    lead: blockedLeadFor(missing) === copy.answerWithheldLead ? copy.answerWithheldLead : copy.setupMissingLead,
    lines:
      stillNeeded !== null
        ? [
            stillNeeded,
            copy.answerNoSynthesis,
            ...opens,
            ...until,
            ...(cannotPrice !== null ? [cannotPrice, copy.answerCannotPriceTail] : []),
          ]
        : [...(cannotPrice !== null ? [cannotPrice, copy.answerCannotPriceTail] : []), ...opens],
  }
}
