/**
 * The intake walk's pure parts (`questions.tsx` renders the step bodies): the step sequence as step ids
 * (`intakeStepIds`, which `intakeSteps` maps to its bodies), the budgetless M > S fork, the governing budget's notes,
 * and the one write shape of each fact the walk and the AssumptionPanel share. Moved out of `questions.tsx` by Act
 * 6's RC0, unchanged; `intakeStepIds` is the sequence `intakeSteps` held inline.
 */
import { copy } from '@ui/copy'
import type { StepSectionId } from '@ui/workbench/factRegistry'
import type { ScenarioDraft } from '@store/memoryModel'
import type { MedicareExtrasEntryV3 } from '@shared/model'
import { budgetGoverns, isRampedBudget } from '@budget/budgetModel'
import { anyPre65OrUnknown, anyRetiredPre65WhileAnotherWorks, isDateRoute } from './intakeMap'
import { medicalExceedsTotal } from './budgetChecks'

/** The notes a governing budget's spending total carries, wherever it is shown (the spend step's governed face, the
 *  panel's governed row, the workbench's facts page): the year-0 figure is an anchor, not every year's spending, when
 *  lines start later or end (`isRampedBudget`; the budget model's own anchor note). ONE home (the U8 review's F4). */
export function governedSpendNotes(budget: Parameters<typeof isRampedBudget>[0]): readonly string[] {
  return isRampedBudget(budget) ? [copy.budgetAnchorRampNote] : []
}

/** THE BUDGETLESS M > S FORK (council 2026-10-08, B2 — pure + exported per insight 048): the
 *  household ENTERED an out-of-pocket figure above its whole spending figure, with NO budget
 *  governing (a budget has its own F10 line, `BudgetBuilder`'s `medicalExceedsTotal` readout, so
 *  this never doubles it). STRICTLY M > S through the SAME comparison the builder uses — at M = S
 *  the figures agree (everything is medical), no contradiction. A blank on either side never fires
 *  (nothing entered, nothing to contradict). Presentation only: the engine clamps m = min(M, S)
 *  and never refuses (`simulate.ts` `budgetlessSurvivorSpending`). */
export function oopExceedsBudgetlessSpend(d: ScenarioDraft): boolean {
  const S = d.annualSpendingReal
  const M = d.health.oopMedicalAnnual
  return !budgetGoverns(d.budget) && S !== undefined && M !== undefined && medicalExceedsTotal(S, M)
}

/** Write person `i`'s working-year investment income, force-zeroing any RETIRED member's slot
 *  (the inapplicable-question zeroing — a retiree has no working-year count, and the persisted
 *  v3 array must be hole-free). The engine override is `earnedIncomeReal + this`, derived at the
 *  intake→engine boundary (`intakeMap.buildDateInput`) — the salary is never re-asked.
 *  EXPORTED for the U12 AssumptionPanel — the ONE write shape for this fact (insight 058:
 *  a duplicated writer is exactly how a hole-bearing array would ship). */
export function writeWorkingYearInvestment(d: ScenarioDraft, i: 0 | 1, v: number | undefined): ScenarioDraft {
  const next: (number | undefined)[] = [
    d.health.workingYearInvestmentByPerson?.[0],
    d.health.workingYearInvestmentByPerson?.[1],
  ]
  next[i] = v
  for (const j of [0, 1] as const) {
    if (d.people[j].workStatus === 'retired') next[j] = 0
  }
  return { ...d, health: { ...d.health, workingYearInvestmentByPerson: next } }
}

/** Write person `i`'s Medicare-extras fork answer — the ONE write shape for this fact
 *  (insight 058; EXPORTED for the AssumptionPanel seat). Always emits a COMPLETE two-entry
 *  array (`'unanswered'` fills the untouched slot — the honest persisted hole, never a
 *  fabricated 'typical' adoption); when BOTH slots read unanswered the field is STRIPPED
 *  entirely (absence = never engaged — the strip-the-key discipline). */
export function writeMedicareExtras(
  d: ScenarioDraft,
  i: 0 | 1,
  entry: MedicareExtrasEntryV3 | undefined,
): ScenarioDraft {
  const next: [MedicareExtrasEntryV3, MedicareExtrasEntryV3] = [
    d.medicareExtrasByPerson?.[0] ?? { kind: 'unanswered' },
    d.medicareExtrasByPerson?.[1] ?? { kind: 'unanswered' },
  ]
  next[i] = entry ?? { kind: 'unanswered' }
  if (next.every((e) => e.kind === 'unanswered')) {
    const { medicareExtrasByPerson: _stripped, ...rest } = d
    return rest
  }
  return { ...d, medicareExtrasByPerson: next }
}

const anyNearMedicare = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.currentAge !== undefined && p.currentAge >= 64)

/** The full intake sequence for the current draft state, as the walk's step ids: the household
 *  preamble (spend + ACA inputs BEFORE the loop — first-acceptance
 *  reachability), then the variable-length account loop, then the opt-in
 *  other-income loop, and — on the date route — the pay check's two steps. `intakeSteps`
 *  (`questions.tsx`) maps each id to its step body, so the order has this one home. */
export function intakeStepIds(draft: ScenarioDraft): readonly StepSectionId[] {
  // "Anyone still working" is the date route's own predicate (`isDateRoute`), read here for every
  // working-only step — one predicate, never a private copy of it (insight 081).
  const working = isDateRoute(draft)
  const steps: StepSectionId[] = ['names', 'work']
  if (working) steps.push('income')
  // The retirement-state step lands UNCONDITIONALLY, right BEFORE spend — the placement is
  // load-bearing (S5's spendHelp branches on the answered state; a step after spend would leave
  // spendHelp generic). Its heading follows the route (`intakeSteps` picks the body).
  steps.push('social-security', 'retirement-state', 'spend')
  if (anyPre65OrUnknown(draft)) steps.push('health-quote')
  // Straight after the quote it qualifies: the quote says what pre-65 coverage COSTS, this says
  // WHO is paying it during the working years. Gated on the exported predicate, never re-derived.
  if (anyRetiredPre65WhileAnotherWorks(draft)) steps.push('employer-coverage')
  steps.push('oop-medical')
  if (working) steps.push('working-income')
  if (anyNearMedicare(draft)) steps.push('irmaa-seed', 'medicare-extras')
  steps.push('accounts')
  // R40 — the opt-in other-income loop (off the 5-minute guided path; a household with no
  // pension/rental/annuity/alimony simply advances past it). The LAST step on the all-retired route.
  steps.push('other-income')
  // The pay check (U8, KTD17): on the date route, W and then the money picture close the walk —
  // after every input the quote and the picture read. The picture's Continue is the flow's terminal
  // `onComplete()`. No draft gate on either, so the count never moves while the household answers.
  if (working) steps.push('working-cost', 'working-ledger')
  return steps
}
