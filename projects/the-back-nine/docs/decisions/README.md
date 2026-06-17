---
title: The Back Nine — Decision Records
doc-type: readme
status: living
created: 2026-06-17
updated: 2026-06-17
derives-from: [docs/product.md]
---

# Decision Records

This folder holds **permanent decision records** — the *why* behind the hardest engineering calls, written to outlive the plan that produced them. A plan flips from `active` to `done` and gets archived; a decision record does not, because the codebase, the plans, and the tests cite it **by §-number** long after the work ships.

A record belongs here when its reasoning is **expensive to reconstruct** and **referenced across the repo** — not every choice. Routine choices live in the plan that made them; product-level decisions live in [../product.md](../product.md); engine invariants live in [../architecture.md](../architecture.md).

## The records

| Record | What it decides | Cited as |
|---|---|---|
| [accumulation-fuck-off-date.md](accumulation-fuck-off-date.md) | Why the accumulation / fuck-off-date engine is built the way it is — the candidate-axis (§0), the one-continuous-timeline contract (§1), the signed-inflow term + its overlay fold (§2), the date-search bias defense + three first-class outcomes (§3), basis / ticker-blend / TDF (§4–§5), the retired-but-contributing edge (§6), the death-aware working-year clamp (§7). Carries the verbatim §0–§7 record, the deviation records, and the `PREMISE-FALSE` / `MUTANT-UNCONSTRUCTIBLE` adversarial annotations. | `§0`–`§7` |

## Decisions that live elsewhere (on purpose)

- **Product-level locked decisions (D1–D6)** — what "best" means (lexicographic), recommend-second, the four-act shape, the solver search space, the curse defense, the tax scope — live in [../product.md §4](../product.md). They govern the *product*, not a single engine subsystem.
- **The Social Security computation decisions (§1–§12)** — Method-C spousal, the §202 survivor base, RIB-LIM, the survivor lock-flat and excess-end-gate guards — live in the feature's as-built record, [../plans/features/social-security.md](../plans/features/social-security.md), because they are self-contained to that sub-engine and ship with its SSA rule table and goldens.
- **The R40 KTDs (1–9)** — the other-income build landmines — live in [../plans/features/other-income.md](../plans/features/other-income.md), cited by the implementation as `KTD-N`.

When one of those grows enough cross-repo reach to be cited by §-number from multiple subsystems, graduate it into its own record here.
