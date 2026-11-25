/*
 * src/intake/stress.ts — Retirement → Stress Test's stresses (Act 6 · RC11; plan docs/plans/6-rightcapital-ui-plan.md,
 * RC11): the ones B9 can run honestly today with no engine work, each an edit to a COPY of the committed plan's draft,
 * run on the what-if runner's one core on the plan's own futures (`src/ui/workbench/stressRun.ts`). Pure: no clock, no
 * store, no write path; a writer never touches the draft it is handed.
 *
 * ONE WRITER PER STRESS, each editing only its own input (the unit's test compares the copy field by field):
 *  - SOCIAL SECURITY pays X% less than the statements say, from the start: every person's statement figure (`pia`, the
 *    benefit at full retirement age) scaled. The trace (RC11, 2026-11-25): `pia` is the ONLY entered input to a benefit.
 *    The engine derives every benefit from it (`socialSecurityBenefit.ts`): the own benefit (claim-age factor on `pia`),
 *    the spousal excess (0.5 of the higher `pia` less the lower), the survivor benefit (§202 off the deceased's `pia`)
 *    and the earnings test's held-back months (`earningsTest.ts`, off the same own and spousal figures), and a person
 *    already claiming has no separate "already receives" figure (it is `pia` and the claim age). The higher earner is
 *    picked by comparing the two `pia`s, which one scale keeps in order. So scaling `pia` scales every one of them.
 *  - OUT-OF-POCKET medical costs run X% higher: the figure (`health.oopMedicalAnnual`) scaled. It sits INSIDE the
 *    spending (the spend question's own words; `compileBudget` injects it into the essentials floor), so the household
 *    pays the rise: under a budget the total re-reconciles to the lines plus the new figure (the plan's own OOP write,
 *    `AssumptionPanel.tsx`'s), with no budget the one spending figure rises by the same dollars, and a working year's
 *    pay-check figure (W, which holds the same medical cost) rises by them too. Nothing else moves.
 *  - THE ACA SUBSIDY RULES switch: the `aca-subsidy` lever through `applyBundle` (the plan's own lever write), to current
 *    law's smaller discount. Offered only where someone has marketplace years before 65 AND the plan counts on the bigger
 *    discount coming back: on a plan already on current law the switch is the hopeful case, never a stress, and a bar
 *    that rose under "stress" (or a Combined bar it lifted) would read as false comfort.
 *
 * A stress with nothing to act on is REFUSED BY NAME, never run as a no-op bar: no benefit to scale, no out-of-pocket
 * figure to raise, no marketplace years, or a plan already on current law.
 */
import { budgetGoverns } from '@budget/budgetModel'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import type { ScenarioDraft } from '@store/memoryModel'
import type { WorkingYearCostV3 } from '@shared/model'
import { healthcarePriced } from './intakeMap'
import { applyBundle } from './whatIf'

/** The stresses, in the page's order (after Baseline; Combined last). */
export const STRESS_IDS = ['social-security', 'out-of-pocket', 'subsidy-rules'] as const
export type StressId = (typeof STRESS_IDS)[number]

/** One chosen stress and its size. */
export type StressChoice =
  /** Social Security pays `pct`% less than the statements say, from the start. */
  | { readonly id: 'social-security'; readonly pct: number }
  /** Out-of-pocket medical costs run `pct`% higher. */
  | { readonly id: 'out-of-pocket'; readonly pct: number }
  /** The ACA subsidy rules switch to current law. */
  | { readonly id: 'subsidy-rules' }

/** Why a stress cannot run on this plan, by name. */
export type StressRefusal =
  | { readonly kind: 'no-benefit' }
  | { readonly kind: 'no-out-of-pocket' }
  | { readonly kind: 'no-marketplace-years' }
  | { readonly kind: 'already-current-law' }
  | { readonly kind: 'size-outside-range'; readonly id: StressId; readonly pct: number }

/** Each sized stress's slider: its bounds, step and the size it starts at (the pilot's call, RC11). */
export const STRESS_RANGES = {
  'social-security': { min: 5, max: 50, step: 5, start: 20 },
  'out-of-pocket': { min: 10, max: 200, step: 10, start: 50 },
} as const

export type StressedDraft = { readonly ok: true; readonly draft: ScenarioDraft } | { readonly ok: false; readonly refusal: StressRefusal }

/** A dollar figure snapped to the cent (the grain the engine reads a benefit at). */
const cents = (x: number): number => Math.round(x * 100) / 100

const inRange = (id: keyof typeof STRESS_RANGES, pct: number): boolean => {
  const r = STRESS_RANGES[id]
  return Number.isInteger(pct) && pct >= r.min && pct <= r.max
}

/** Whether a stress can run on this plan, or why not. */
export function stressOffer(draft: ScenarioDraft, id: StressId): StressRefusal | null {
  if (id === 'social-security') return draft.people.some((p) => (p.pia ?? 0) > 0) ? null : { kind: 'no-benefit' }
  if (id === 'out-of-pocket') return (draft.health.oopMedicalAnnual ?? 0) > 0 ? null : { kind: 'no-out-of-pocket' }
  if (!healthcarePriced(draft)) return { kind: 'no-marketplace-years' }
  return draft.enhancedSubsidies === true ? null : { kind: 'already-current-law' }
}

/** W, the pay check's yearly cost, raised by `dollars` (its own figure, whichever kind it is). */
function raisedW(w: WorkingYearCostV3, dollars: number): WorkingYearCostV3 {
  return w.kind === 'confirmed' ? { ...w, quotedReal: cents(w.quotedReal + dollars) } : { ...w, amountReal: cents(w.amountReal + dollars) }
}

/** One stress written on a copy of `draft`, or its refusal by name. Never writes `draft`. */
export function applyStress(draft: ScenarioDraft, choice: StressChoice): StressedDraft {
  const refusal = stressOffer(draft, choice.id)
  if (refusal !== null) return { ok: false, refusal }
  if (choice.id === 'social-security') {
    if (!inRange(choice.id, choice.pct)) return { ok: false, refusal: { kind: 'size-outside-range', id: choice.id, pct: choice.pct } }
    const keep = (100 - choice.pct) / 100
    const people = draft.people.map((p) => (p.pia === undefined ? p : { ...p, pia: cents(p.pia * keep) }))
    return { ok: true, draft: { ...draft, people: people as unknown as ScenarioDraft['people'] } }
  }
  if (choice.id === 'out-of-pocket') {
    if (!inRange(choice.id, choice.pct)) return { ok: false, refusal: { kind: 'size-outside-range', id: choice.id, pct: choice.pct } }
    const was = draft.health.oopMedicalAnnual!
    const now = cents(was * (1 + choice.pct / 100))
    const rise = now - was
    const health = { ...draft.health, oopMedicalAnnual: now }
    const spending = budgetGoverns(draft.budget)
      ? budgetYearZeroFullTotal(draft.budget, now)
      : draft.annualSpendingReal === undefined
        ? undefined
        : cents(draft.annualSpendingReal + rise)
    return {
      ok: true,
      draft: {
        ...draft,
        health,
        ...(spending !== undefined ? { annualSpendingReal: spending } : {}),
        ...(draft.workingYearCost !== undefined ? { workingYearCost: raisedW(draft.workingYearCost, rise) } : {}),
      },
    }
  }
  const applied = applyBundle(draft, [{ kind: 'aca-subsidy', enhanced: false }])
  // The lever's arm never refuses; a refusal here would be a broken invariant, said by name rather than run.
  return applied.ok ? { ok: true, draft: applied.draft } : { ok: false, refusal: { kind: 'no-marketplace-years' } }
}

/** Every chosen stress at once (Combined), in the page's order; the first refusal by name. */
export function applyStresses(draft: ScenarioDraft, choices: readonly StressChoice[]): StressedDraft {
  let d = draft
  for (const id of STRESS_IDS) {
    const choice = choices.find((c) => c.id === id)
    if (choice === undefined) continue
    const next = applyStress(d, choice)
    if (!next.ok) return next
    d = next.draft
  }
  return { ok: true, draft: d }
}
