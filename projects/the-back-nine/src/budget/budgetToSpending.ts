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
 *  lines active at k=0 (both tiers) PLUS the injected OOP medical. `budgetDraftPatch`
 *  writes `annualSpendingReal` to exactly this in the same update that writes the
 *  items (the invariant every scalar consumer — buildDollar, the answer strip,
 *  sanity — stays coherent through). A budget with no line active at k=0 is
 *  R19-warned upstream (`no-line-at-year-zero`), never silently anchored. */
export function budgetYearZeroFullTotal(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
): number {
  let total = oopMedicalAnnual ?? 0
  for (const item of items) if (isActiveAt(item, 0)) total += item.annualAmountReal
  return total
}

/** THE ESSENTIALS TWIN of {@link budgetYearZeroFullTotal} — the floor track's year-0 spend, for
 *  surfaces that must name BOTH spending levels (the 2026-07-30 council's naming layer: a reader
 *  looking at a two-date household cannot size the gap that CAUSES the two dates unless both
 *  figures are on screen).
 *
 *  ⚑ WHY THIS IS DERIVED HERE AND NOT AT THE CALL SITE, which is the whole correctness story: the
 *  obvious computation — sum the user's typed lines — is WRONG in two independent ways, and both
 *  fail SILENTLY toward a rosier or a scarier number.
 *    1. It omits the INJECTED out-of-pocket medical. `compileBudget` adds `oopMedicalAnnual` to the
 *       STICKY floor on top of the typed lines (see :79-81), because a survivor's qualified medical
 *       neither scales by the couple ratio nor ends. A raw line-sum therefore UNDERSTATES essentials
 *       by exactly M — the mirror of the double-count `anchorTarget` exists to prevent.
 *    2. It ignores tiering. Essentials is everything NOT discretionary — `compileBudget` routes a
 *       line to `discretionary` only on `tier === 'discretionary'`, and BOTH other destinations
 *       (`sticky` and `scalableEssentials`) are floor spend. Filtering on `isSurvivorSticky` instead
 *       would silently drop the scalable half.
 *  The predicate below mirrors `compileBudget`'s routing exactly, and shares `isActiveAt` with its
 *  full-total sibling rather than re-typing the window arithmetic (insight 081 — a re-derivation
 *  forks at the producer's first special case).
 *
 *  Both totals are FIRST-YEAR (retirement-year 0) figures in today's dollars. A surface quoting them
 *  owes that qualification in words: a ramped budget's later years differ, and an unqualified
 *  "$X a year" over a ramped plan is its own calm-but-wrong. */
export function budgetYearZeroEssentialsTotal(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
): number {
  let total = oopMedicalAnnual ?? 0
  for (const item of items) {
    if (item.tier !== 'discretionary' && isActiveAt(item, 0)) total += item.annualAmountReal
  }
  return total
}

/** THE RECONCILIATION INVARIANT, made atomic (council 2026-07-02): a budget edit and its
 *  reconciled `annualSpendingReal` land in ONE draft update, so no consumer can ever
 *  observe the items and the scalar disagreeing. Callers apply it as
 *  `model.update((d) => ({ ...d, ...budgetDraftPatch(items, d.health.oopMedicalAnnual) }))`
 *  — pure and layer-free here (the store is ESLint-banned from importing @budget, so the
 *  composition happens at the intake/ui call site, exactly like the params builders). */
export function budgetDraftPatch(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
): { readonly budget: readonly BudgetLineItem[]; readonly annualSpendingReal: number } {
  return { budget: items, annualSpendingReal: budgetYearZeroFullTotal(items, oopMedicalAnnual) }
}

/** THE LINES-TARGET (U9b build-gate 1 — the OOP-medical net): the figure the user's TYPED
 *  lines should sum to so the committed year-0 full total lands back on the scalar S their
 *  answer already used. `compileBudget` INJECTS the intake OOP-medical M into the sticky
 *  floor ON TOP of typed lines and `budgetYearZeroFullTotal` = Σactive@0 + M — so a target
 *  quoted at the raw S invites typing S in lines and committing S+M, a silently-PESSIMISTIC
 *  answer jump on builder-open (the red team's double-count hit). target = max(0, S − M);
 *  absent M nets nothing (burned/062 — absence is absence, never a default). */
export function anchorTarget(
  annualSpendingReal: number,
  oopMedicalAnnual: number | undefined,
): number {
  return Math.max(0, annualSpendingReal - (oopMedicalAnnual ?? 0))
}

/** The builder's ONE commit seam (U9b build-gate 2): a non-empty item list commits the
 *  atomic {@link budgetDraftPatch}; an EMPTY list is the "back to a single number" escape —
 *  `budget` returns to strictly-undefined and `annualSpendingReal` is deliberately NOT
 *  touched (the last reconciled scalar keeps governing). `budget: []` must never be
 *  written: an empty array is truthy at the intakeMap params gate, compiles to an
 *  all-zero-lines budget, and collapses year-0 spending to just the injected medical —
 *  the engine's reconciliation backstop would fire loud, but the UI must never mint it. */
export function commitBudgetPatch(
  items: readonly BudgetLineItem[],
  oopMedicalAnnual: number | undefined,
):
  | { readonly budget: readonly BudgetLineItem[]; readonly annualSpendingReal: number }
  | { readonly budget: undefined } {
  return items.length === 0 ? { budget: undefined } : budgetDraftPatch(items, oopMedicalAnnual)
}
