---
title: The Back Nine — Decision Records
doc-type: readme
status: living
created: 2026-06-17
updated: 2026-06-18
derives-from: [docs/product.md]
---

# Decision Records

This folder holds **permanent decision records** — the *why* behind the hardest engineering calls, written to outlive the plan that produced them. A plan flips from `active` to `done` and gets archived; a decision record does not, because the codebase, the plans, and the tests cite it **by §-number** long after the work ships.

A record belongs here when its reasoning is **expensive to reconstruct** and **referenced across the repo** — not every choice. Routine choices live in the plan that made them; product-level decisions live in [../product.md](../product.md); engine invariants live in [../architecture.md](../architecture.md).

## The records

| Record | What it decides | Cited as |
|---|---|---|
| [accumulation-fuck-off-date.md](accumulation-fuck-off-date.md) | Why the accumulation / fuck-off-date engine is built the way it is — the candidate-axis (§0), the one-continuous-timeline contract (§1), the signed-inflow term + its overlay fold (§2), the date-search bias defense + three first-class outcomes (§3), basis / ticker-blend / TDF (§4–§5), the retired-but-contributing edge (§6), the death-aware working-year clamp (§7). Carries the verbatim §0–§7 record, the deviation records, and the `PREMISE-FALSE` / `MUTANT-UNCONSTRUCTIBLE` adversarial annotations. | `§0`–`§7` |
| [ss-computation.md](ss-computation.md) | How the engine computes each person's Social Security — own reduction/credit, the Method-C spousal **excess** (not `max()`), the §202 **survivor** benefit with RIB-LIM and the survivor lock-flat guard, the MFJ→single survivor tax switch, the household survivor-spending ratio (~75%). Holds the §1–§12 record + the `realizedClaimAgeAtDeath` survivor-floor bug as institutional record, and cites the verified SSA rule-set (registered in [research/engine-validation-and-tax.md](../research/engine-validation-and-tax.md)). | `§1`–`§12` |
| [other-income-r40.md](other-income-r40.md) | The R40 ongoing-income model (pension / rental / alimony / annuity / other) — the nine KTDs, the per-type defaults, the five-seam MAGI-atomicity, the OUT-list with every omission's **direction named**, the provenance corrections, and the conservative-or-disclose discipline. | `KTD-1`–`KTD-9` |
| [portfolio-holdings.md](portfolio-holdings.md) | How the portfolio is described to the engine — the as-built household-blend model (exact per-account % → one `stockWeight`), the pending multi-holding-entry recommendation (opt-in, rides U8, no v3→v4 migration), and the basis / estate-character decisions (per-account-not-per-lot basis, the §1014 step-up). | §-less |

## Decisions that live elsewhere (on purpose)

- **Product-level locked decisions (D1–D6)** — what "best" means (lexicographic), recommend-second, the four-act shape, the solver search space, the curse defense, the tax scope, and the identical-tax-fidelity rule (both candidate arms scored at full fidelity; there is no tax-blind arm) — live in [../product.md §4](../product.md). They govern the *product*, not a single engine subsystem.
- **The solver-validation oracle cases (i–v)** — the conventional-ordering preconditions, bracket-fill marginal-rate equalization, the cliff-aware ceiling, the after-tax-to-heirs known-best, and the no-change case — live in the recommendation plan, [../plans/4-recommendation.md](../plans/4-recommendation.md), because they are the solver's correctness fixtures.

When a decision that currently lives in a plan grows enough cross-repo reach to be cited by §-number from multiple subsystems, graduate it into its own record here.
