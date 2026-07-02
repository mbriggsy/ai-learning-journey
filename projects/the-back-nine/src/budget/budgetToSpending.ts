/**
 * The budget compile (P3·U9): itemized line items → the engine-facing
 * {@link CompiledBudget} — three per-RETIREMENT-year real-dollar component profiles
 * (sticky / scalableEssentials / discretionary), each pre-extended to
 * `maxHorizonYears` and indexed by k = years-since-household-work-stop.
 *
 * THE MEDICAL INJECTION (council 2026-07-02 — the honesty-hawk veto's fix): the
 * household's out-of-pocket qualified medical (`health.oopMedicalAnnual`, the SAME
 * intake scalar the overlay's `oopMedical[t]` HSA-cap stream is filled from) is
 * compile-INJECTED into the STICKY component as an implicit lifelong floor line —
 * single-sourced, never user-typed (there is deliberately no medical budget
 * category). This keeps the containment premise — oopMedical ⊆ the floor track's
 * spending — true BY CONSTRUCTION: the floor's essentials can never budget below
 * the medical cost the HSA cap is sized off, and `annualSpendingReal` (reconciled
 * to the year-0 full total) includes OOP medical exactly as the un-itemized scalar
 * always has. ABSENT intake OOP ⇒ inject nothing (burned/062 — never a plausible
 * default; the overlay side is equally absent, which only disables the HSA cap —
 * the pessimistic-safe direction). The engine's `validateParams` re-asserts
 * containment fail-loud per year (the belt to this braces).
 *
 * PURITY + LAYERING: pure functions of their arguments; imports @shared only. The
 * engine consumes the OUTPUT via `SimulationParams.budget` — the per-path survivor
 * composition (r-selection at the sampled first death) happens INSIDE the engine
 * (insight 040), never here: these profiles are r-free by contract.
 *
 * STRUCTURAL THROWS: a non-integer/negative/reversed window is a programmer error
 * here (the codec rejects it on restore, R19 blocks it at entry) — compiling it
 * "faithfully" would silently drop the line, so it throws. Domain-bad AMOUNTS
 * (negative/non-finite) compile faithfully and are the ENGINE's to reject to a calm
 * indeterminate (`validateParams` — the engine, never the UI, decides).
 */
import type { BudgetLineItem, CompiledBudget } from '@shared/model'
import { isActiveAt, isSurvivorSticky } from './budgetModel'

/**
 * Compile the itemized budget into the engine construct.
 *
 * @param items            The persisted line items (today's-dollar annual amounts).
 * @param oopMedicalAnnual The intake OOP-medical scalar to inject sticky+lifelong
 *                         (pass the SAME field the overlay's oopMedical stream is
 *                         built from, or undefined when the household never entered
 *                         one — never a default).
 * @param maxHorizonYears  Profile length — the engine's `maxHorizonYears`, so any
 *                         anchor ≥ 0 stays in range (k = t − anchor ≤ t < horizon).
 */
export function compileBudget(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
  maxHorizonYears: number,
): CompiledBudget {
  if (!Number.isInteger(maxHorizonYears) || maxHorizonYears <= 0) {
    throw new Error(`[budget] compileBudget requires a positive integer horizon (got ${maxHorizonYears})`)
  }
  for (const [i, item] of items.entries()) {
    if (!Number.isInteger(item.startYear) || item.startYear < 0) {
      throw new Error(`[budget] items[${i}].startYear must be an integer ≥ 0 (got ${item.startYear})`)
    }
    if (item.endYear !== undefined && (!Number.isInteger(item.endYear) || item.endYear < item.startYear)) {
      throw new Error(
        `[budget] items[${i}].endYear must be an integer ≥ startYear (got ${item.endYear} < ${item.startYear}) — a reversed window would silently drop the line`,
      )
    }
  }

  const sticky = new Array<number>(maxHorizonYears).fill(0)
  const scalableEssentials = new Array<number>(maxHorizonYears).fill(0)
  const discretionary = new Array<number>(maxHorizonYears).fill(0)

  for (const item of items) {
    const target =
      item.tier === 'discretionary' ? discretionary : isSurvivorSticky(item) ? sticky : scalableEssentials
    const last = item.endYear === undefined ? maxHorizonYears - 1 : Math.min(item.endYear, maxHorizonYears - 1)
    for (let k = item.startYear; k <= last; k++) target[k]! += item.annualAmountReal
  }

  // The injected OOP-medical floor line: sticky (a survivor's qualified medical does
  // not scale by the couple ratio) and lifelong (B1 cap-only semantics — a 65+
  // member's out-of-pocket continues; the overlay stream it must dominate is flat).
  if (oopMedicalAnnual !== undefined) {
    for (let k = 0; k < maxHorizonYears; k++) sticky[k]! += oopMedicalAnnual
  }

  return { sticky, scalableEssentials, discretionary }
}

/** The reconciliation figure: the FULL-track total at retirement-year 0 — typed
 *  lines active at k=0 (both tiers) PLUS the injected OOP medical. The store's
 *  `setBudget` writes `annualSpendingReal` to exactly this in the same update that
 *  writes the items (the invariant every scalar consumer — buildDollar, the answer
 *  strip, sanity — stays coherent through). A budget with no line active at k=0
 *  is R19-warned upstream (`no-line-at-year-zero`), never silently anchored. */
export function budgetYearZeroFullTotal(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
): number {
  let total = oopMedicalAnnual ?? 0
  for (const item of items) if (isActiveAt(item, 0)) total += item.annualAmountReal
  return total
}
