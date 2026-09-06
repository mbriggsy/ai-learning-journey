---
title: The Back Nine — Glossary
doc-type: reference
status: living
created: 2026-06-17
updated: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
---

# Glossary

The Back Nine has a dense private vocabulary — financial, statutory, and project-internal. This is the single place each term is defined, with a pointer to its canonical home. If a term is load-bearing enough to appear in more than one doc, it is defined here once and referenced elsewhere.

Sorted alphabetically; `§` and number-prefixed statutory terms are grouped at the end.

---

**ACA-MAGI** — the income measure that drives the pre-65 ACA premium credit: AGI + tax-exempt interest + the **full** (taxable *and* non-taxable) Social Security benefit + excluded foreign earned income. A *different* number from IRMAA-MAGI — the two are never reused for each other. → [architecture.md §7.2](architecture.md)

**ACA-PTC (Premium Tax Credit)** — the pre-65 marketplace subsidy that falls as ACA-MAGI rises. Modeled as a per-year fixed-point with an explicit 400%-FPL **cliff** branch. → [architecture.md §7.2](architecture.md), [research/pre65-healthcare.md](research/pre65-healthcare.md)

**Accumulation** — the pre-retirement saving phase (contributions + market growth) the engine projects forward to a candidate work-stop date. The mirror of decumulation; a **bounded near-retirement on-ramp**, never a FIRE calculator. → [plans/1-engine.md](plans/1-engine.md) (C2), [decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md)

**Act** — one of the four build chapters: **1 The Engine · 2 Where You Stand · 3 The Levers You Hold · 4 The Recommended Route**. The code comments say `P`n (Phase) for the same chapter; the globally-unique unit key is the join. → [roadmap.md → The ID scheme](roadmap.md#the-id-scheme)

**already-failing / over-funded / on-track / borderline / off-track / indeterminate** — the closed set of **outcome states** the engine owns; the headline reading and copy are selected from these, never from a 7th ad-hoc state. → [plans/1-engine.md](plans/1-engine.md) (U1)

**Bengen / SAFEMAX** — the safe-withdrawal-rate validation anchor (the "4% rule" lineage). The engine validates a duration-conservative SAFEMAX-analogue (~3.67%) against a committed Damodaran Treasury proxy arm, not against a bit-exact dataset. → [plans/1-engine.md](plans/1-engine.md) (U1), [research/engine-validation-and-tax.md](research/engine-validation-and-tax.md)

**Box-Muller** — the transform that turns uniforms into normal market draws. Kept **stateless** (no cached spare across calls) so two CRN candidates that draw in different interleavings never silently desync. → [architecture.md §2](architecture.md)

**Bridge (earned-income bridge)** — the working-years transform that nets the withdrawal **down** by salary (`netWithdrawal = max(0, spending − earnedIncome)`); never credits a dead earner, never contributes surplus back. → [architecture.md §4](architecture.md)

**byte-identity** — see **reduce-to-spine**.

**Cardinal rule** — *"calm-but-wrong is the sin."* The governing constraint on every engine decision, disclosure, and the voice itself; the bar **rises** for a recommender. → [product.md §2](product.md)

**Cohort tables** — the SSA TR2024/Alt2 per-birth-year survival tables; the household's **1969 / 1972** cohorts drive joint-and-survivor longevity (not a period table, not a Gompertz fit). → [plans/1-engine.md](plans/1-engine.md) (U1)

**copyGuard** — the lint enforcing calm, honest language: a **ban-list** (certainty verbs, catastrophe lexicon) plus the **require-the-hedge** positive lint, both reading one single-sourced token catalog. → [product.md §6](product.md), [plans/3-controls.md](plans/3-controls.md) (U10)

**CRN (Common Random Numbers)** — every candidate strategy, date-offset, and arm sees **identical** market draws, so a difference between them is signal, not RNG luck. The load-bearing determinism contract that lets the solver rank candidates honestly. → [architecture.md §2–§3](architecture.md)

**Damodaran arm** — the committed Treasury / corporate total-return series used as the independent Bengen/Trinity validation proxy (no canonical bit-exact dataset exists). → [research/engine-validation-and-tax.md](research/engine-validation-and-tax.md)

**Date-search** — the bounded, **exhaustive, non-monotone-robust** sweep over the household work-stop offset `Y` that produces the fuck-off date; reads off a quantized conservative lower confidence bound, never a bisection. Each track yields one of **three first-class outcomes**: a **confirmed** date (a candidate below the window top with later-offset evidence), a **window-edge** date (the window top, reported with the unconfirmed-tail disclosure, never silently crowned), or **no-date-in-window** (a first-class result, never "never free," never a crash); `Y == 0` reads *"work-optional at today."* → [plans/1-engine.md](plans/1-engine.md) (C3), [decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md) §3

**Decumulation** — the retirement draw-down phase; the engine's center of gravity (accumulation exists to solve for the date that hands off to it). → [plans/1-engine.md](plans/1-engine.md)

**directional-until-pinned** — a constants-table marker: a figure is provisional until confirmed against its named government/issuer primary at a pin pass (`directionalUntilPinned: false`). → [architecture.md §8](architecture.md)

**DK (data key)** — the random key that encrypts the model exactly **once**; the passphrase-derived and recovery-derived keys each wrap it independently, so the recovery path can never restore a stale copy. → [architecture.md §7.3](architecture.md)

**DND/012 (externally-derived fixtures)** — golden expected values must be derived by an **independent** path (hand-math, a published figure), never via the engine's own formula (which would prove typing, not correctness). → [architecture.md §5](architecture.md)

**DRC (delayed retirement credits)** — Social Security increases for claiming after FRA. For a survivor base they are **realized at the deceased's death**, never credited for years the worker did not live to earn. → [architecture.md §7.7](architecture.md)

**Externally-derived fixtures** — see **DND/012**.

**FRA (full retirement age)** — the Social Security age at which the unreduced PIA is paid. → [architecture.md §7.7](architecture.md)

**Fuck-off date** — the working/product name for the not-yet-retired household's first answer: *"when is work optional?"*, delivered as **two confidence-graded dates** (floor + lifestyle). The user-facing label holds the calm advisor voice. → [product.md §3](product.md), [decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md)

**Gross-up** — the tax overlay's bounded fixed-point: raise the withdrawal enough to cover spending **plus** the tax on that withdrawal (the worst-case contraction factor `k` and `GROSS_UP_MAX_PASSES` are pinned ONCE in architecture §7.1 — never re-typed here). → [architecture.md §7.1](architecture.md)

**Hedge (the hedge on the headline)** — every recommendation/control readout must carry its probabilistic qualifier **on the primary surface**, never buried in tapped-away math. Enforced by the require-the-hedge lint. → [product.md §6](product.md)

**HSA** — the triple-advantaged, **medical-earmarked** fourth account bucket. Covers out-of-pocket + (owner 65+) Medicare premiums tax-free — **not** ACA marketplace premiums. Never a general drawdown source. → [architecture.md §7.2](architecture.md)

**ID scheme (R / U / C / D / M / §)** — the compact, stable internal join-keys (Requirement / Unit / unit-tracks / Milestone / Section) the docs and code share; defined once, never shown to the user, never renumbered. Canonical legend: [roadmap.md → The ID scheme](roadmap.md#the-id-scheme).

**INCOME_TYPES / COLA_MODES** — the R40 other-income vocabulary, single-sourced as `const` arrays (in `src/shared/model.ts`) that the intake and the restore codec both import: `INCOME_TYPES` = pension / rental / alimony / annuity / other; `COLA_MODES` = real-flat / nominal-flat / fixed-pct. → [product.md](product.md) (R40.1–R40.2)

**Insight & cross-repo citation IDs** — a numbered, hard-won engineering lesson, cited by **full relative path** (`docs/insights/NNN-…` for this project; sibling-project lessons carry their full path too). The full-path rule + the `burned`/`DND`/`AJS` shorthand decoder: [insights/README.md](insights/README.md).

**IRMAA** — the post-65 Medicare premium **surcharge**, set on a **2-year-lagged** MAGI lookback, with hard per-person step-cliffs. → [architecture.md §7.2](architecture.md)

**IRMAA-MAGI** — IRMAA's income measure: AGI + tax-exempt interest, with **no** Social Security add-back. A *different* number from ACA-MAGI. → [architecture.md §7.2](architecture.md)

**KTD (Known Technical Decision)** — a load-bearing build decision, numbered so the implementation can cite it (e.g. R40's nine KTDs), recorded in its decision record ([docs/decisions/other-income-r40.md](decisions/other-income-r40.md)).

**Lexicographic objective** — the definition of "best": **Tier 1** never drop below the survival floor (essentials), then **Tier 2** a user-chosen surplus goal (*leave more · pay less tax · live bigger now*). The objective metric **equals** the headline metric, so a recommendation can never contradict the magic moment. → [product.md](product.md) (D1 / R21)

**MAGI** — modified adjusted gross income. The Back Nine computes **two distinct** MAGIs — see **ACA-MAGI** and **IRMAA-MAGI** — never one shared number.

**Method C (POMS)** — the Social Security spousal computation: the spouse's **own benefit in full plus a reduced excess**, *not* `max(own, spousal)`. (`H` = the higher earner, `argmax(pia)`; `L` = the lower earner who can claim a spousal excess on `H`'s record; `BenefitPerson` is the per-person record the sub-engine consumes.) → [architecture.md §7.7](architecture.md)

**MFJ→single** — the surviving spouse's filing-status switch the year after the first death: the same real dollars fall into ~half-width single brackets — the "tax cliff" that is the recommendation's emotional headline. → [architecture.md §7.1](architecture.md)

**Outcome states** — see **already-failing / over-funded / …**.

**Overlay** — a **zero-draw** deterministic transform of the cash-flow term (tax, healthcare, accumulation inflow) fed into the same per-year update function as the spine; each reduces to the spine when off. → [architecture.md §4–§5](architecture.md)

**PIA (Primary Insurance Amount)** — the Social Security benefit at FRA; the per-person SS input (entered monthly, stored annually). → [architecture.md §7.7](architecture.md)

**Presence-keyed** — byte-identity keyed on a construct's **absence** from params, not its zero value: a zero-valued-but-constructed accumulation run is deliberately *not* byte-identical (its working-year clamp is live). → [architecture.md §5](architecture.md), [decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md) §1

**reduce-to-spine** — the core correctness invariant: every overlay, when **off**, reproduces the Trinity/Bengen-validated decumulation distribution **byte-identically** (same seed). The golden cases are never perturbed. → [architecture.md §5](architecture.md)

**Recovery passphrase** — a **second user-chosen memorable passphrase** (PBKDF2-600k, same strength floor as the daily one; `firstSave` rejects recovery == daily) that wraps the DK independently of the daily passphrase; the surviving spouse's primary door back into the vault. Mandatory export at first save. Superseded the v1 system-minted BIP-39 12-word phrase (U8 rework, council 2026-06-30 — the phrase was DOA for a non-technical audience). → [architecture.md §7.3](architecture.md)

**RIB-LIM** — the Retirement-Insurance-Benefit limit that caps a Social Security survivor benefit. → [architecture.md §7.7](architecture.md)

**RMD (required minimum distribution)** — the forced annual pre-tax distribution; the age is **birth-year-derived (72 / 73 / 75)**, never a flat 73, and is **non-convertible** (must be taken before any conversion). → [architecture.md §7.1](architecture.md)

**SAFEMAX** — see **Bengen**.

**Seed** — the single injected integer that makes the engine a deterministic function of `(params, seed)`. Generated by the caller (never inside the pure engine) and persisted bit-identically through encrypt → store → decrypt. → [architecture.md §2](architecture.md)

**Single shared market draw** — all account buckets (pre-tax / Roth / taxable / HSA) share **one** market-return draw per year; per-bucket draws are forbidden. This makes "no asset-location" a structural guarantee. → [architecture.md §3](architecture.md)

**SLCSP** — the Second-Lowest-Cost Silver Plan benchmark premium; a **required user input** (ZIP/age-specific) that drives the ACA credit — never synthesized. → [architecture.md §7.2](architecture.md)

**Spine** — the Trinity/Bengen-validated deterministic decumulation core that every overlay reduces to. → [architecture.md §5](architecture.md)

**Survivor-spending ratio** — the factor scaling a survivor's spending after the first death (~75%, grounded to the Blanchett literature, directional-until-pinned). Rides the Tier-1 survival floor, so its dangerous direction (too low) is documented. → [plans/1-engine.md](plans/1-engine.md) (U1)

**The two dates** — the floor date (earliest offset essentials hold) and the lifestyle date (earliest offset the full budget holds at the same confidence bar); they coincide in the degenerate single-total-spend budget and split when the budget is itemized. → [product.md](product.md) (R27)

**Trinity study** — the safe-withdrawal validation anchor; the engine reproduces 37/39 cohorts (≈94.9% vs the published 95.1%, same failing cohorts). → [plans/1-engine.md](plans/1-engine.md) (U1), [research/engine-validation-and-tax.md](research/engine-validation-and-tax.md)

**Two-pane** — the laptop composition that promotes the live answer to a persistent panel beside the questions (stacks on phone); the home for the U6 band / D2 surface. → [plans/2-first-answer.md](plans/2-first-answer.md) (D2)

**Vault** — the encrypted-at-rest local store (IndexedDB + AES-GCM under a PBKDF2-600k passphrase key); the trust layer that makes the at-rest promise provable. → [architecture.md §7.3](architecture.md)

**validateParams (the R19 gate)** — the worker-boundary gate that rejects every incomputable input **before** any path runs: finiteness first, domain bounds, integer seed. → [architecture.md §6](architecture.md)

---

**§86 (provisional income)** — the rule taxing Social Security benefits; modeled as its own per-year bounded fixed-point. → [architecture.md §7.1](architecture.md)

**§202 (survivor benefit)** — the Social Security survivor benefit (payable from age 60); its base realizes the deceased's claim age at death (lock-flat, RIB-LIM, DRC flow-through). → [architecture.md §7.7](architecture.md)

**§1014 (basis step-up)** — the cost-basis reset at death; modeled into the *leave-more* objective because a disclosed omission can invert the after-tax ranking. → [architecture.md §7.1](architecture.md)

**400% FPL cliff** — the income threshold above which the ACA premium credit drops to zero (the enhanced-subsidy expiry restored it for 2026); a documented engine **discontinuity** the date-search and solver must branch on explicitly. → [architecture.md §7.2](architecture.md), [research/pre65-healthcare.md](research/pre65-healthcare.md)

**100% FPL floor** — the lower ACA eligibility threshold: below it the credit is zero, so *less* spending can mean a *higher* net premium — the source of the legitimate `floor > lifestyle` date inversion. → [decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md) §3
