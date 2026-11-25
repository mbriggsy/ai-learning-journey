/**
 * The intake walk's pure parts (`questions.tsx` renders the step bodies): the step sequence as step ids
 * (`intakeStepIds`, which `intakeSteps` maps to its bodies), the budgetless M > S fork, the governing budget's notes,
 * and the one write shape of each fact the walk and the AssumptionPanel share. Moved out of `questions.tsx` by Act
 * 6's RC0, unchanged; `intakeStepIds` is the sequence `intakeSteps` held inline.
 */
import { copy } from '@ui/copy'
import type { ScenarioDraft } from '@store/memoryModel'
import type { MedicareExtrasEntryV3 } from '@shared/model'
import { budgetGoverns, isActiveAt, isRampedBudget } from '@budget/budgetModel'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { medicareExtrasTypical } from '@engine/constants/health'
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

/** The guided walk's steps, by id (`intakeSteps`, `questions.tsx`, maps each to its body). Moved here from the deleted
 *  facts page's registry by Act 6 · RC13b: the walk's own sequence is its one home. */
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

// ── The walk's remaining writes, moved out of `questions.tsx` unchanged by Act 6 · RC13b, so the walk's step bodies and
//    the Profile → Expenses and Goals drawers write each fact one way (insight 058). ──────────────────────────────────

/** The spending figure typed in the unit on screen: canonical ANNUAL in the model; the entered unit rides
 *  `spendEntryPeriod` (an explicit answer, persisted — fidelity rule). A cleared box clears the figure. */
export function writeSpendEntered(d: ScenarioDraft, entered: number | undefined): ScenarioDraft {
  return {
    ...d,
    annualSpendingReal: entered === undefined ? undefined : d.spendEntryPeriod === 'month' ? entered * 12 : entered,
  }
}

/** A period tap: re-base the canonical annual to the SAME entered digits under the new unit (the figure the user typed
 *  is the truth; the unit moves). */
export function writeSpendPeriod(d: ScenarioDraft, next: NonNullable<ScenarioDraft['spendEntryPeriod']>): ScenarioDraft {
  const enteredNow =
    d.annualSpendingReal === undefined ? undefined : d.spendEntryPeriod === 'month' ? d.annualSpendingReal / 12 : d.annualSpendingReal
  return {
    ...d,
    spendEntryPeriod: next,
    annualSpendingReal: enteredNow === undefined ? undefined : next === 'month' ? enteredNow * 12 : enteredNow,
  }
}

/** The governing budget's tier readback (cold-read 2026-07-03: the essential/extra answer must be SEEN used): LINES ONLY
 *  at year 0 (the amounts the user typed; OOP medical is carried separately), the builder's own active rule. */
export function budgetTierSplitAtZero(budget: ScenarioDraft['budget']): { readonly essentials: number; readonly extras: number } {
  const linesAt0 = (budget ?? []).filter((it) => isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal))
  return {
    essentials: linesAt0.reduce((sum, it) => (it.tier === 'essentials' ? sum + it.annualAmountReal : sum), 0),
    extras: linesAt0.reduce((sum, it) => (it.tier === 'discretionary' ? sum + it.annualAmountReal : sum), 0),
  }
}

/** The out-of-pocket medical figure. OOP medical is the SECOND budget-blind writer of the year-0 total: compileBudget
 *  injects M into the sticky floor, so the reconciliation invariant (annualSpendingReal == Σactive@0 + M) breaks the
 *  moment M changes under a governing budget (ultramode 2026-07-02, P1). Re-reconcile atomically here, exactly as the
 *  builder's Apply does; with no budget, M is a plain input and the scalar is left alone. */
export function writeOopMedical(d: ScenarioDraft, v: number | undefined): ScenarioDraft {
  const health = { ...d.health, oopMedicalAnnual: v }
  return budgetGoverns(d.budget) ? { ...d, health, annualSpendingReal: budgetYearZeroFullTotal(d.budget, v) } : { ...d, health }
}

/** The marketplace quote: the plan the household is enrolled in (`enrolled`) or the benchmark plan (`slcsp`), monthly. */
export function writeHealthQuote(d: ScenarioDraft, which: 'enrolled' | 'slcsp', v: number | undefined): ScenarioDraft {
  return which === 'enrolled'
    ? { ...d, health: { ...d.health, enrolledPremiumMonthlyToday: v } }
    : { ...d, health: { ...d.health, slcspMonthlyToday: v } }
}

/** Who pays a retired member's pre-65 coverage while the other works: the working spouse's employer plan, or their own. */
export function writeEmployerCoverage(d: ScenarioDraft, covered: boolean): ScenarioDraft {
  return { ...d, health: { ...d.health, employerPlanCoversRetiredMember: covered } }
}

/** The Medicare surcharge look-back's income: two years back (`0`) or one year back (`1`), the other slot kept. */
export function writeIrmaaSeed(d: ScenarioDraft, which: 0 | 1, v: number | undefined): ScenarioDraft {
  const seed = d.health.irmaaMagiSeed
  return { ...d, health: { ...d.health, irmaaMagiSeed: which === 0 ? [v, seed?.[1]] : [seed?.[0], v] } }
}

/** One person's Medicare-extras fork pick: an affirmed nothing, the tool's typical figure (stamped with its vintage), or
 *  their own figure — keeping an already-entered dollar across a re-tap (idempotent); a fresh pick starts blank. */
export function writeMedicareExtrasPick(d: ScenarioDraft, i: 0 | 1, v: 'none' | 'entered' | 'typical'): ScenarioDraft {
  const prev = d.medicareExtrasByPerson?.[i]
  return writeMedicareExtras(
    d,
    i,
    v === 'none'
      ? { kind: 'none' }
      : v === 'typical'
        ? { kind: 'typical', adoptionVintage: medicareExtrasTypical.value.vintage }
        : { kind: 'entered', ...(prev?.kind === 'entered' && prev.monthly !== undefined ? { monthly: prev.monthly } : {}) },
  )
}

/** One person's own extras figure, monthly (a cleared box leaves the pick, figure-less). */
export function writeMedicareExtrasAmount(d: ScenarioDraft, i: 0 | 1, v: number | undefined): ScenarioDraft {
  return writeMedicareExtras(d, i, { kind: 'entered', ...(v !== undefined ? { monthly: v } : {}) })
}
