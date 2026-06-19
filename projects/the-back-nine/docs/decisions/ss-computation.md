---
title: The Social Security computation — the §1–§12 decision record (own + Method-C spousal + §202 survivor)
doc-type: decision
status: decided
created: 2026-06-18
updated: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/research/engine-validation-and-tax.md]
---

# The Social Security computation — the §1–§12 decision record

## What this record is

This is the **permanent decision record** for how the engine computes each person's Social Security benefit — own early-reduction / delayed-credit, the Method C spousal **excess**, and the §202 **survivor** benefit with RIB-LIM — from a per-person **PIA + claim age**. It is referenced **by §-number across the repo** (the sub-engine, the per-act plans, and the tests cite "§4", "§6", "§11", etc.).

The §1–§12 record below is source-verified and adversarially-reviewed. It holds the *decisions* (what we compute and **why**); the **mechanics** of how the pure sub-engine wires into the cash seam live once in [docs/architecture.md](../architecture.md) (the SS sub-engine is a pure `(PIAs, claim ages, birth years) → per-person annual-benefit-stream` function, computed pre-loop, zero draws, CRN-invariant across date-search candidates). The readable build narrative lives in [docs/plans/1-engine.md](../plans/1-engine.md). This record links to those rather than restating them.

The product framing — why a recommender-grade tool must compute SS rather than ask for it, and the cardinal rule the survivor numbers are load-bearing for — lives in [docs/product.md](../product.md) and is summarized only as much as the decisions require.

> **Co-location, on purpose.** This record also owns the **survivor-spending ratio** decision (§6a). Survivor *spending* and survivor *benefit* both turn on the same modeled widowhood transition; splitting the survivor regime across two records would fragment the one boundary. The receipts-side `survivorPct` for *other* income streams (pension/rental/annuity) lives in its own record — see [other-income-r40.md §KTD-7](other-income-r40.md) — but the SS survivor benefit and the household survivor-spending step-down are decided here together.

---

## Why we compute the benefit (the decision context)

A user can hand the engine a flat, already-claim-adjusted annual benefit. A **decumulation-grade** tool can tolerate that; a **recommender-grade** tool cannot, because a user-supplied flat figure opens three correctness gaps the recommend-second engine would build on top of (the honesty bar **rises** for a recommender — see [docs/product.md](../product.md) §2):

1. **Spousal is underivable by a layperson.** A user cannot read their spousal benefit off ssa.gov — it is a function of the *other* spouse's PIA. Asking for it guarantees a wrong or blank input. **So we compute spousal automatically.**
2. **The `max(own, spousal)` rule is calm-but-wrong.** SSA does **not** pay the larger of own-vs-spousal when claimed early — it pays the **gently-reduced own benefit in full, plus a separately-reduced spousal *excess*** (POMS "Method C", RS 00615.020). The two pieces reduce on *different* schedules, so the true total **exceeds** `max()`. Worked: own PIA $1,000 / spouse PIA $3,000, both claim at 62 → **true $1,025/mo vs. naive-max $975/mo** — a $600/yr understatement that scales with own-PIA and how early a dual earner claims. Shipping `max()` would systematically under-credit exactly the dual-earner households this tool serves. **So we compute the Method C excess.**
3. **A `$0-until-own-claim` survivor stub is conservative-but-coarse.** It is one-signed safe (never optimistic), but it zeroes out 1–5+ years of a substantial survivor benefit when a spouse dies while the survivor is 60–65 — exactly the high-stress scenario a retirement co-pilot must get right. **So we fold in the §202 survivor computation.**

The sub-engine is **not a new engine**. It is a pure function that populates the existing per-person benefit slot; the cash seam, the §86 provisional-income overlay, and the fuck-off-date sweep are all downstream and structurally unchanged.

The survivor **computation** is in scope; the survivor **claim optimizer** is not — that is a P4 lever (Scope boundaries). We compute the right survivor number and hand the *timing* optimization to the recommend-second engine.

---

## The decision trace (consolidated)

| Decision | Where |
|---|---|
| Compute spousal **automatically**; the input is **PIA + claim age** per person | §1, §4, §9 |
| Spousal is the **Method C excess** (own + reduced-excess), never `max()` | §4 |
| Survivor §202 **computation** folded in; survivor **optimizer** deferred to P4 | §6, Scope boundaries |
| Intake routes the user to the **mySSA $0-future-earnings** estimator figure (ask "benefit at FRA," never "PIA") | §9 |
| The sub-engine is **pure, pre-loop**; PIA=0 ⇒ byte-identical to the prior spine | §7, §12 |
| New **statutory** `Sourced` constants table; goldens from POMS *printed* examples, never engine-derived | §2, §11 |
| The survivor's filing switches **MFJ→single** the year after the first death (no QSS grace) | §6b |
| The household **survivor-spending ratio** is ~75% (Blanchett), editable, too-low is the unsafe direction | §6a |

---

## The statutory basis

The §1–§12 decisions below rest on the verified SSA rule-set — FRA-by-birth-year, the worker/spouse reduction schedules, the DRC, the Method C excess, deemed filing, the §202 survivor reduction, RIB-LIM, survivor-FRA, and the citation-hygiene landmines (RS 00615.**102** is a 404 — use **.101**; deemed filing is **GN 00204.035**; survivor DRC flow-through is **RS 00615.301/.702**). The **full verified register** — every factor, its exact value, its POMS primary, and the externally-derived oracle dollars ($920 Method C / $1,025 divergence / $350 RIB-LIM) — lives once in [docs/research/engine-validation-and-tax.md → *Social Security benefit-computation constants*](../research/engine-validation-and-tax.md); the **runtime** values are year-keyed in `src/engine/constants/socialSecurity.ts` (each a `Sourced<T>` with `legalBasis`, the constants-discipline shape canonical in [docs/architecture.md §8](../architecture.md)). The §-sections below cite the specific factors each decision turns on; they do not re-register the table.

---

## The §1–§12 decision record

> These sections are referenced by §-number across the repo. Every factor, formula, fixture number, and citation is immutable — amend only with a dated in-line annotation.

### §1 — The input is `pia` + claim age (not an already-adjusted benefit)

`PersonInputs` carries `pia` (the real, today's-dollar benefit-at-FRA off the statement) and `socialSecurityClaimAge` (consumed by the sub-engine, not a passive label). Both are per-person. A non-working / no-record person enters `pia: 0` — the reduce-to-spine zero (§7).

**PIA entry period:** ask **monthly** (the figure the statement shows), **store annual (×12)**, validate the ceiling in monthly terms at the field — mirroring the `spendEntryPeriod` discipline. The PIA **ceiling is a net-new sanity rule** (new rule id + CopyKey + test; there is no antecedent money-sanity rule on the SS field). The claim-age `∈ [62, 70]` bound already exists (`SS_CLAIM_MIN`/`SS_CLAIM_MAX`) — the deemed-filing single-decision window (§5).

### §2 — One canonical statutory constants module

`src/engine/constants/socialSecurity.ts` is one year-keyed module; every figure is a `Sourced<T>` with `directionalUntilPinned: false` (the verify sweep **is** the pin) and `legalBasis` set — these are **statutory** (42 U.S.C. §402, 20 CFR 404, the POMS section), stable, not annually re-indexed like tax brackets. The shapes:

- `FullRetirementAge` — birth-year → **months** (804 for 1960+; the graduated 1955–59 band; the Jan-1-prior-year rule encoded in the lookup, not the caller).
- `ReductionSchedule` — `{ firstMonths: 36, firstRatePerMonth, beyondRatePerMonth }` stored as **integer fractions** (`1/180`, `1/240`, `1/144`, `1/150`), so 62/FRA67 falls out as exactly `168/240 = 0.7000`. Three instances: `WORKER_REDUCTION`, `SPOUSE_REDUCTION`, `DRC` (whose `monthsCap` is **derived per person = `840 − fraMonths`** — 36 at FRA 67, 46 at FRA 66y2m — never a literal `36`, which would contradict the graduated-FRA table).
- `SURVIVOR_REDUCTION` — keyed to span exactly **28.5%** from age 60 to survivor-FRA (compute the per-month fraction from the span; do **not** hardcode `19/40`), plus the DWB flat-28.5% floor.
- `RIB_LIM` — `{ floorPctOfDeathPia: 0.825 }` (the "larger-of" logic lives in code; the constant is the floor).
- `SPOUSAL_RATE = 0.50`; `DEEMED_FILING_DOB_CUTOFF = 1954-01-02`.

**SPOUSAL_RATE carries `reVerifyEveryBuild`-class monitoring** (like the ACA legislative entry): a scored-but-unenacted proposal to phase 50%→33% by 2042 exists, so the constant must catch enactment at build time, not drift silently.

### §3 — Own-benefit reduction & delayed credit (pure)

`adjustOwnBenefit(pia, claimAgeMonths, fraMonths)`, with `n = fraMonths − claimAgeMonths` (whole months early; negative ⇒ delayed):
- Early (`n > 0`): `factor = n ≤ 36 ? (180−n)/180 : (192−(n−36))/240`.
- Delayed (`n < 0`): `factor = 1 + min(−n, drcMonthsCap)·(2/3)/100`, where `drcMonthsCap = 840 − fraMonths` (the FRA→70 span — **36 at FRA 67, 46 at FRA 66y2m**; a literal `36` under-credits a delayed claim on a mixed-cohort household).
- At FRA (`n = 0`): `factor = 1`.
- `benefit = floorToDime(pia · factor)` — dime-round **down**, the final step, on the dollar.

A golden asserts `factor = 0.7000` (pre-round) at 62/FRA67 and `1.24` at 70/FRA67.

### §4 — Spousal: the Method C excess (the `max()` rule is wrong)

For person *L* (potential spousal recipient) on person *H*'s record (the higher PIA):
```
excessFull   = max(0, SPOUSAL_RATE·H.pia − L.pia)              // 50% of H's PIA, minus L's own PIA, floored
ownAdjusted  = adjustOwnBenefit(L.pia, L.claim, L.fra)         // worker schedule (5/9…)
excessAdj    = reduceSpouseExcess(excessFull, L.claim, L.fra)  // spouse schedule (25/36…), NO DRCs
L.benefit    = ownAdjusted + excessAdj
```
`reduceSpouseExcess` mirrors §3 on the **spouse** schedule: with `n = L.fra − L.claim`, `factor = n ≤ 36 ? (144−n)/144 : (180−(n−36))/240` — at 62/FRA67 exactly `156/240 = 0.65`. The numerator constants differ from the worker formula (`144`/`180` vs `180`/`192`) because the first-36 reduction differs (25% vs 20%) — two **separate** reduction schedules off the **same** claim-month-count. The excess is **floored at 0** (when `L.pia ≥ 50%·H.pia` it degrades to own-only). The spousal base is `H.pia` (UNREDUCED) — never H's adjusted benefit, never DRC-inflated. **No DRCs** on the excess. Each household has at most one spousal direction (the lower-PIA spouse on the higher's record); `H = argmax(pia)`.

### §5 — Deemed filing: one claim-age decision per person

Both cohorts (born 1969/1972) are post-1954 → fully subject. Consequence baked into the model: **a single `claimAge` per person drives both their own benefit and their spousal excess** (no separate spousal claim age, no restricted application). A test asserts no path produces a spousal claim age ≠ the own claim age. The **survivor** branch is the lone exception and retains independent timing (§6).

### §6 — Survivor §202: the correct computation + the lock-flat claim-timing default

When the first death occurs, the survivor's SS each year = **`max(ownStream, survivorStream)`** — and this `max()` is a **legitimate larger-of** (survivor vs. own are *alternative* entitlements; you collect the higher), **unlike** the §4 spousal `max()` that was wrong (spousal is *additive*). The survivor stream:
- `survivorBenefitFull` = the **deceased's adjusted benefit** (including the deceased's DRCs — flow-through per RS 00615.301/.702), the DRC-correct analog of the old `maxBenefit`.
- **RIB-LIM:** if the deceased had claimed reduced RIB before death, cap `survivorBenefitFull` at `max(0.825·deceasedPIA, deceasedActualReducedBenefit)` (the "larger-of"; 82.5% is a floor, not a haircut).
- **Age reduction — LOCK-FLAT (cardinal-rule-load-bearing):** the survivor stream starts at `max(survivor age 60, first-death year)`; its reduction factor is **locked at the survivor's age at that start offset and held FLAT for the rest of the horizon.** It does **not** ramp upward toward 100% as the survivor ages. The "71.5% @60 → 100% @ survivor-FRA" schedule is over the *claim age* (a survivor who *claims later* gets a higher factor) — **not** a post-claim age-ramp. A per-year ramp would optimistically overstate guaranteed income on exactly the early-widowhood paths this unit exists to fix.

**The claim-timing default:** the survivor claims the survivor benefit **as soon as eligible** (`max(60, death)`), locks the reduced factor, and receives `max(own, survivor)` each year. This is one-signed conservative **only under the lock-flat reading above**: it closes the early-widowhood gap while leaving the survivor's *optimal two-stage upside* (survivor-first → own-at-70, the deemed-filing-exempt lever) on the table for **P4's optimizer** — never an optimistic assumption baked in here. Reduce-to-spine still holds (no death ⇒ this code never runs ⇒ byte-identical — §7/§12).

#### §6a — The household survivor-spending ratio (~75%, Blanchett)

A surviving spouse needs less than the couple did, but not half. The household survivor-spending ratio is grounded to a citable range — **Blanchett's two-thirds-to-three-quarters** — source-stamped `directionalUntilPinned`, ships a **~75%** default, stays **editable**, and carries a calm note that **too-low is the unsafe direction** (it understates the survivor's need — the calm-but-wrong direction for a widow's projection). This fires on the **first death of either spouse** (a needs figure), independent of the receipts-side survivor benefits computed above.

#### §6b — The MFJ→single filing switch (the survivor tax cliff)

The survivor files **single the year after the first death** — **no QSS (qualifying-surviving-spouse) grace**. This is not a new boundary: it **is** the joint→survivor two-regime boundary at the sampled first death. The survivor's same real dollars then fall into **~half-width single brackets with ~half the standard deduction** — the emotional headline the recommendation surfaces. The headline narrative is canonical in [docs/product.md](../product.md); the *computation* choice (no QSS grace; the switch year) is decided here, and the bracket/standard-deduction mechanic lives in [docs/architecture.md §7.1](../architecture.md).

### §7 — The engine seam: own as a scalar, excess + survivor as time/path terms

The three benefit components are wired **differently by their time-shape** — small where it can be, honest where it can't (the mechanics are canonical in [docs/architecture.md](../architecture.md); the *decisions* are here):

- **Own benefit → a resolved per-person SCALAR.** A single claim-age-locked dollar that directly replaces the prior per-person benefit slot — the genuinely "minimal" part.
- **Spousal excess → a time-gated per-person term.** The Method C excess is $0 until `max(L.claimOffset, H.claimOffset)` (the worker-must-be-entitled **start** gate, RS 00202.001) **and returns to $0 at H's death offset** (the **end** gate — the excess terminates at the worker's death and is *replaced* by the survivor benefit; omitting it **double-counts** guaranteed income on death paths).
- **Survivor benefit → a per-PATH selection.** The survivor branch needs the deceased's index, the survivor's age at `t`, and the deceased's RIB-LIM-capped survivor base, selected per path at the death offset, then `max(ownStream, survivorStream)` (§6).

**CRN invariance:** the date-search varies **only `retirementAge`**; `currentAge`, `socialSecurityClaimAge`, `pia`, and `birthYear` are held **verbatim** — so every claim *offset* (`claimAge − currentAge`) is invariant across candidates (the sweep shifts the *retire* offset, never the claim offset). Own, the gated excess, and the survivor selection are all candidate-invariant — computed once, **zero draws**.

**Reduce-to-spine:** all-PIA-zero ⇒ own 0, excess 0, survivor 0 ⇒ `max(0,0)=0` ⇒ byte-identical to the prior `socialSecurityReal=0` Trinity/Bengen spine (golden cases untouched — §12).

### §8 — Tax overlay: unchanged, non-double-counting

`taxableSocialSecurity` (§86 / Pub 915) consumes the per-year benefit **dollar** and is agnostic to its derivation. Computing the benefit upstream is seamless to the provisional-income layer — the overlay never re-derives the benefit, so there is no double-count risk by construction. (If a muni bucket is ever added, the §86 provisional rule is the single change site.)

### §9 — Intake: the PIA question + the stop-early honesty routing

The SS question asks for the **PIA labelled in plain language** ("estimated monthly benefit at full retirement age (67)") — never the word "PIA" — plus the claim-age (62–70). Help copy routes the user to the **stop-early honesty figure**: open the mySSA Retirement Estimator, set future earnings to **$0** at the planned stop age, and read the age-67 figure — because the default statement number **assumes continued earnings and overstates** for an early-stopper (the rosy / calm-but-wrong direction; an on-request paper statement does not fix the FRA figure — only the estimator does). The non-blocking `0.70/1.24` ratio cross-check (if the user also enters their 62 and 70 figures) is **deferred** — a nice-to-have wrong-bar-entry guard, not a correctness gate, kept out to preserve the single-pass intake (§12).

### §10 — Persistence: the field lives on base `PersonInputs` (SS-before-U8 ordering)

The SS field lives on the **base** `PersonInputs`, so `PersonInputsV3 extends PersonInputs` inherits it — `SCENARIO_V3_FIELDS` is unchanged (the field nests in `people[]`, not a top-level v3 key). Because `ScenarioV3` is **defined but not yet written** (U8 owns its codec arm; nothing persists any scenario yet), there is **no migration debt** — which confirms the **SS-before-U8 ordering**: U8 must persist the post-swap shape, or it eats a needless v3→v4 migration.

### §11 — Golden fixtures (externally derived, DND/012)

Every fixture's expected value is hand-derived from the POMS text, never from `socialSecurity.ts` (DND/012):

- **Method C oracle (structure):** POMS RS 00615.020 — **worker PIA $2,000** (spouse base = `0.50·$2,000 = $1,000`), own RIB $400 → excess $600 → $540, RIB → $380, **total $920**. (The example's "$1,000" is the *spousal base*, not the worker PIA the §4 formula consumes.) Pins the **structure** (own-in-full + reduced-excess), not a single claim age.
- **Divergence fixture (the `max()`-relapse AND schedule-swap guard):** own PIA $1000 / worker PIA $3000 at 62/FRA67 → own $700, **excessAdj $325**, total **$1,025**. Asserts (a) it beats `max(700, 975) = 975` by $50/mo (kills a `max()` relapse) AND (b) `excessAdj === 325` independently (a 5/9-for-excess schedule swap yields $350 / total $1,050 — pinning the *component*, not just the rounded total, keeps the swap-discriminator alive).
- **RIB-LIM oracle:** POMS RS 00615.320 — reduced RIB $350, PIA $374.90, `0.825·$374.90 = $309.29` → WIB = `max($350, $309.29) = $350`.
- **Combined early-widowhood junction (the unit's raison d'être):** a death in the survivor age 60–65 window where the §202 age-reduced (lock-flat) + RIB-LIM-capped survivor benefit differs from a naive `max(deceasedScalar, survivorScalar)` — pins the cap-then-age-reduce order AND the survivor `max()`-relapse. Hand-derived (no standalone oracle covers this junction).
- **Own factors:** 0.7000 @62, 1.0000 @67, 1.24 @70 (pre-dime-round), anchored to SSA's published percent-of-PIA table.

### §12 — Reduce-to-spine + the load-bearing invariants

- **Spine invariant:** PIA=0 (all persons) ⇒ all streams zero ⇒ the Trinity/Bengen golden suite is **byte-identical (same seed)** to the pre-change spine. *Companion (the real identity bridge):* a nonzero PIA claimed at FRA 67, single earner, no spouse (factor 1.0, no excess) must be byte-identical to a prior `socialSecurityReal = that-same-$` run — the zero-maps-to-zero test alone exercises none of the reduction/excess/survivor branches, so it cannot catch a sign error or a month-count off-by-one.
- **Excess end-gate:** L's excess stream goes to **$0 at H's death offset** (no excess+survivor double-count).
- **Survivor flat-lock:** the survivor's reduction factor is **constant** from its start offset to the horizon (no upward ramp) — the cardinal-rule guard for §6.
- **Survivor `max()`-relapse:** a survivor-year value that **≠** a naive `max(deceasedScalar, survivorScalar)` (the §11 combined junction).
- **Property test:** household total monotone non-decreasing in each PIA; dual-earner strictly ≥ naive `max()`; claim ∈[62,70] always finite; excess always ≥ 0.

The benefit is computed at **annual granularity** (the engine is annual-real). The monthly DRC "January-after-the-year-earned" lag (RS 00615.690 §B) and dime-rounding are *monthly* rules; at annual granularity the lag is a self-correcting sub-12-month slice at the only anchor that matters (age 70, where it is zero) — an intentional abstraction recorded in the constants comment.

---

## The cardinal-rule guards (institutional record)

Three guards are load-bearing for the cardinal rule. Two are decided design (the survivor lock-flat, the excess end-gate); one is a **bug an integration review caught**, preserved here so a future reader does not re-introduce it.

### The survivor lock-flat guard (§6) and the excess end-gate (§7)

Restated as the two things that must never regress: the survivor reduction factor is **locked and flat** (never ramps toward 100%), and the spousal excess **terminates at the worker's death** (it is replaced by, never added to, the survivor benefit). Both are pinned by the §12 invariants.

### `realizedClaimAgeAtDeath` — the survivor-floor optimistic-overstatement bug (insight 040)

> This is institutional record — the as-built correction a post-wiring holistic review found, **not** a plan item. It was an **optimistic overstatement of the survivor floor — the cardinal sin** — on exactly the early-widowhood paths the §202 computation exists to harden.

**The bug.** Building the deceased's survivor base from the household's **planned** claim age means: on any path where the death offset precedes the claim offset, the deceased **never lived to file**, yet the seam credited the full delayed-retirement credit of a claim they never made — a plan-70 breadwinner dying at 68 got a `1.24×` PIA survivor base instead of the `1.08×` they actually earned. Reachable, not measure-zero (the longevity sampler's minimum death age is 66 and claim-70 is the de-facto default, so deaths at 66–69 before a planned-70 claim are a common path class).

**Why the pure core was right.** The pure `survivorBenefitAnnual` correctly trusts `deceased.claimAge` as the *realized* claim age — its input contract. The bug lived entirely in the **integration seam**, the only layer that knows the stochastic timeline; it fed the pure core a **planned** value as if it were realized.

**The fix (shipped):**
```
realizedClaimAgeAtDeath(plannedClaimAge, birthYear, ageAtDeath)
  = max(min(planned, ageAtDeath), ⌊FRA⌋)
```
Capping at age-at-death strips the unearned credits; the FRA floor keeps an unfiled **pre-FRA** death from picking up a spurious early-claim reduction (it lands on the full PIA — 20 CFR §404.313, POMS RS 00615.301/.690). Exact for a whole-year FRA (both shipped cohorts = 67); for a fractional-FRA cohort it floors to ⌊FRA⌋, a sub-one-year **conservative** residual. Six hand-derived goldens pin it (including the integration dollar **$19,587.60 vs the buggy $22,490.40**).

**The lasting lesson (insight 040):** a pure unit's input contract assumes its inputs are already realized; realizing a PLANNED input that a stochastic process can preempt is the **seam's** job, never the pure core's — and a discriminating test must drive the **preemption**, not just the plan-equals-outcome case. See [docs/insights/040-an-integration-seam-must-realize-a-planned-input-the-stochastic-timeline-can-preempt.md](../insights/040-an-integration-seam-must-realize-a-planned-input-the-stochastic-timeline-can-preempt.md).

---

## Scope boundaries

**In scope (the correct *computation*):** own early-reduction / delayed-credit; the Method C spousal excess (two reduction schedules, the worker-must-be-entitled gate, the excess floor); deemed-filing collapse to one claim-age per person; survivor §202 (the age-reduced lock-flat benefit, the deceased's DRC flow-through, the RIB-LIM cap).

**Deferred to P4 (the recommend-second engine), explicitly NOT here:**
- **The survivor two-stage claim *optimizer*.** Survivors are exempt from deemed filing, so an optimal widow(er) chooses *when* to switch between survivor-first→own-at-70 and own-first→survivor-later. That is an **active claim-age optimizer**, and the engine optimizes no claim ages yet — it would be a lever with nothing to pull it. This record ships a defensible fixed claim-timing default (§6) and hands the optimization to P4.
- **The accumulation-state PIA recompute / year-of-death AIME recomputation** (RS 00615.320 "fictitious life PIA") — a second-order effect; the entered PIA is carried as the real figure (a named, bounded simplification).
- **Divorced-spouse / child-in-care / DIB branches** — out of the married-couple front door (the worker-must-have-filed prerequisite must **not** be generalized to a divorced spouse if ever added — POMS GN 00204.035).
- **The family-maximum (150–188% of PIA)** — rarely binds for a childless 2-person couple; named, not modeled.

---

## Build status

The Social Security sub-engine is **shipped, reviewed, and pinned** (the pure-core review locked the `survivorBenefitAnnual` contract; the holistic integration review caught and fixed the survivor-floor bug above). The readable build narrative lives in [docs/plans/1-engine.md](../plans/1-engine.md); the load-bearing invariants it inherits live in [docs/architecture.md](../architecture.md).
