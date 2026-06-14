---
title: "feat: the Social Security benefit sub-engine — PIA-driven own + spousal (Method C) + survivor (§202/RIB-LIM)"
type: feat
status: hardened
date: 2026-06-14
origin: TODO.md "DECISIONS this session" #1 (the SS spousal sub-engine) + #2 boundary; ratified ATC 2026-06-14
north-star: docs/plans/direction-reset-2026-06-04.md
research: temp/ssa-benefit-rules verify sweep 2026-06-14 (12 agents, 6 areas, all primary-confirmed against POMS; see Context & Research)
doc-reviewed: 2026-06-14   # 5 lenses (coherence / feasibility-vs-source / scope / adversarial-math / migration) → adversarial verify stage; 8 verified findings folded. The verify stage refuted a false "74-occurrences" count (84 stands) and caught a reviewer miss (§10 v1/v2 base-shape). Cardinal-rule-relevant folds: the survivor flat-lock (§6) + the excess end-gate (§7).
amends:
  - docs/brainstorms/the-back-nine-requirements.md       # the SS-as-entered model (R-series) → PIA-derived
  - docs/plans/back-nine-mvp/phase-2-first-answer.md     # D1 intake: the SS question swaps amount→PIA
  - docs/plans/2026-06-08-001-feat-fuck-off-date-accumulation-plan.md  # PersonInputs / ScenarioV3 SS field shape
supersedes: "the `socialSecurityReal`-as-entered model (a flat, already-claim-adjusted figure) — model + intake + simulate + taxOverlay"
---

# The Social Security Benefit Sub-Engine

> **A correctness re-plan of one input.** Today every person hands the engine a flat, already-adjusted annual benefit (`socialSecurityReal`). This unit replaces that single number with the user's **PIA** (the benefit-at-full-retirement-age figure off their SSA statement) + a claim age, and computes the *actual* benefit — own reduction/credit, the **Method C** spousal excess, and the **§202** survivor benefit with RIB-LIM — inside a new **pure** sub-engine that feeds the existing cash seam. Paths are relative to `projects/the-back-nine/`.

---

## Overview

The first magic moment bets real retirement money on the household's projected income. Social Security is the largest guaranteed slice of that income, and today the tool **asks the user to do the actuarial math themselves** — to look up, derive, or guess their *already-reduced* benefit and the *spousal* benefit. Two problems:

1. **Spousal is underivable by a layperson.** A user cannot read their spousal benefit off ssa.gov — it's a function of the *other* spouse's PIA. Asking for it guarantees a wrong or blank input. (This is the ATC decision that opened the unit: compute spousal automatically.)
2. **The stated `max(own, spousal)` rule is calm-but-wrong.** SSA does **not** pay the larger of own-vs-spousal when claimed early — it pays the **gently-reduced own benefit in full, plus a separately-reduced spousal *excess*** (POMS "Method C", RS 00615.020). The two pieces reduce on *different* schedules, so the true total **exceeds** `max()`. Verified divergence: own PIA $1,000 / spouse PIA $3,000, both claim at 62 → **true $1,025/mo vs. naive-max $975/mo, a $600/yr understatement** that scales with own-PIA and how early a dual earner claims. Shipping `max()` would systematically under-credit exactly the dual-earner households this tool serves.

This unit takes **PIA + claim age per person** as the input and derives every benefit figure from the SSA primaries. It is **not a new engine** — it is a pure `(household PIAs, claim ages, birth years) → per-person annual benefit streams` function that populates the existing `PersonOffsets.socialSecurityReal` slot. `cashTermsForYear`, `maxBenefit`, the §86 provisional-income tax overlay, and the fuck-off-date sweep are all downstream and structurally unchanged.

Per ATC ruling 2026-06-14, **survivor §202 is folded in** (the correct survivor *computation*, not the P4 claim *optimizer* — see Scope Boundaries), because the current `$0-until-own-claim` survivor stub materially shortchanges early-widowhood, exactly the high-stress scenario a retirement co-pilot must get right.

## Problem Frame

The engine's SS handling is decumulation-grade scaffolding: `socialSecurityReal` is a flat real scalar (`src/shared/model.ts:99-103`) summed per claimed-and-alive person (`cashTermsForYear`, `src/engine/simulate.ts:158-197`); the survivor takes the larger single benefit (`maxBenefit`, `:728`) once they reach their **own** claim age, $0 before (`:192-197`). That scaffolding has three correctness gaps the recommender-grade bar (R: "the honesty bar RISES for a recommender") will not tolerate:

- **No spousal computation at all** — a lower earner's benefit is whatever flat number they typed, never the 50%-of-higher-PIA floor they're actually entitled to.
- **No claim-age actuarial adjustment** — the entered figure is taken as-is, so the model can't distinguish a benefit claimed at 62 (70% of PIA) from one at 70 (124% of PIA); it trusts the user to have pre-computed it.
- **A conservative-but-coarse survivor stub** — `$0 until own claim age` is one-signed safe (never optimistic), but zeroes out 1–5+ years of a substantial survivor benefit when a spouse dies while the survivor is 60–65.

## Requirements / Decision Trace

| Source | Decision | Where |
|---|---|---|
| ATC #1 (2026-06-14) | Compute spousal AUTOMATICALLY; input becomes PIA + claim age per person | §1 input, §4 Method C, §9 intake |
| ATC #1 + POMS RS 00615.020 | Spousal is **Method C excess**, not `max()` (supersedes the stated rule) | §4 |
| ATC #2 boundary (2026-06-14) | Survivor §202 *computation* folded in; survivor *optimizer* deferred to P4 | §6, Scope Boundaries |
| ATC (stop-early honesty) | Intake routes the user to the **mySSA $0-future-earnings** figure | §9 |
| Engine contract (CRN / reduce-to-spine) | The sub-engine is PURE, computed pre-loop; PIA=0 ⇒ byte-identical to today's `socialSecurityReal=0` spine | §7, §12 |
| Constants discipline (burned/057,061,063; DND 012) | New statutory `Sourced` table; goldens from POMS *printed* examples, never engine-derived | §2, §11 |

## Scope Boundaries

**In scope (the correct *computation*):**
- Own-benefit early reduction (pre-FRA) + delayed credits (post-FRA), exact integer fractions.
- The Method C spousal excess (two reduction schedules, the worker-must-be-entitled temporal gate, the excess floor).
- Deemed-filing collapse to **one claim-age decision per person** (both cohorts are post-1954).
- Survivor §202: the age-reduced survivor benefit (71.5% @60 → 100% @ survivor-FRA), the deceased's DRC flow-through, and the **RIB-LIM** cap.

**Deferred to P4 (the recommend-second engine), explicitly NOT here:**
- **The survivor two-stage claim *optimizer*.** Survivors are exempt from deemed filing, so an optimal widow(er) chooses *when* to switch between survivor-first→own-at-70 and own-first→survivor-later. That is an **active claim-age optimizer**, and the engine optimizes **no** claim ages yet — it would be a lever with nothing to pull it. This unit ships a **defensible fixed claim-timing default** (§6) and hands the optimization to P4.
- **The accumulation-state PIA recompute / year-of-death AIME recomputation** (RS 00615.320 "fictitious life PIA") — a second-order effect; the entered PIA is carried as the real figure (a named, bounded simplification).
- **Divorced-spouse / child-in-care / DIB benefit branches** — out of the married-couple front door (the worker-must-have-filed prerequisite must NOT be generalized to a divorced spouse if ever added — POMS GN 00204.035).
- **The family-maximum (150–188% of PIA)** — rarely binds for a childless 2-person couple; named, not modeled.

## Context & Research

### The integration seam (verified against source 2026-06-14)

- **The cash seam** — `cashTermsForYear` (`src/engine/simulate.ts:158-197`) sums `o.socialSecurityReal` per claimed-alive person and the survivor takes `maxBenefit`. The sub-engine **does not touch this function** — it changes only *what dollar lands in `PersonOffsets.socialSecurityReal`* and adds the time-dependent excess/survivor streams (§7).
- **The offset build** — `offsets` + `maxBenefit` are computed once pre-loop (`simulate.ts:722-728`), a pure function of entered inputs. The new sub-engine slots in **here**, pre-loop, so it consumes ZERO draws and is CRN-invariant across date-search candidates (the fuck-off-date sweep shifts a claim *offset*, never a claim *age* — §7).
- **The tax overlay** — `taxableSocialSecurity` (`src/engine/taxOverlay.ts:507-523`, IRS §86 / Pub 915 Wksht 1) consumes the benefit **dollar** and is agnostic to its derivation. Computing the benefit upstream is **seamless** to the provisional-income layer (no double-count risk: the overlay never re-derives the benefit).
- **The input model** — `PersonInputs` (`src/shared/model.ts:90-104`) carries `socialSecurityReal` + `socialSecurityClaimAge`; `PersonInputsV3 extends PersonInputs` (`:741`), so `ScenarioV3` (`:846-870`) transitively persists the field this unit swaps.
- **Migration blast radius** — **84 occurrences of `socialSecurityReal`/`socialSecurityClaimAge` across 16 files** (heaviest: `simulate.test.ts` ×28, `questions.tsx` ×12, `intakeMap.test.ts` ×5, `sanity.ts` ×5, `scenarioCodec.test.ts` ×4). This is a **semantic** migration, not a rename (§10): today's value is the *already-adjusted* benefit; the new `pia` is the *FRA* benefit. Every fixture/test with a **non-FRA claim age** must be reinterpreted (a flat $X claimed at 62 was $X; now PIA $X claimed at 62 becomes $0.70·X). Two `simulate.test.ts` fixtures (`:600-681`, `:1707-1769`) go further — they **hand-reimplement the seam** and assert byte-exactness, so they are **rewrites**, not value-reinterprets (§12).

### The verified SSA rule-set (all primary-confirmed against POMS, fetched HTTP 200; re-derived from scratch by an adversarial checker, zero refutations)

| Rule | Exact factor | Primary | Landmine |
|---|---|---|---|
| FRA by birth year | 1960+ → **67y0m (804 mo)**; 1955–59 graduated (66y2m…66y10m) | SSA NRA chart `oact/ProgData/nra.html` | Store FRA as **months**; "born Jan 1 → treated as prior year" |
| Own early reduction | 5/9 %/mo first 36, then 5/12 %/mo → `(180−n)/180`, `(192−(n−36))/240`; **62/FRA67 = exactly 0.7000** | **POMS RS 00615.101** | RS 00615.**102 is a 404** — cite .101; dime-round DOWN as a final benefit-$ step, never on the factor |
| Delayed credits (DRC) | **2/3 %/mo = 8%/yr** (born 1943+), FRA→70, max 36 mo → **1.24× at 70** | POMS RS 00615.690 (window/§B) + .692 (rate) | DRC applies to **PIA** at the no-early-claim anchor; never generalize 8% to pre-1943 |
| Spousal base | **50% of the higher earner's UNREDUCED PIA**; **no DRCs** on spousal | POMS RS 00202.020, RS 00615.201 | Feed it **PIA**, never the worker's adjusted benefit |
| Spousal early reduction | **25/36 %/mo** first 36 (=1/144), then 5/12 %/mo → 0.325 of worker PIA at 62/FRA67 | POMS RS 00615.201 | **Different** schedule from the worker's 5/9 — do not blend |
| **Method C excess** | `total = reduce_own(own_PIA) + max(0, reduce_spouse(0.50·worker_PIA − own_PIA))` | **POMS RS 00615.020** | Own + reduced-excess, NOT `max()`; own & excess use **different** reduction schedules off the **same** month-count |
| Worker-must-be-entitled | Spousal excess is $0 until the higher earner has **filed** | POMS RS 00202.001 | A temporal gate in the path-year loop, not a static scalar (§7) |
| Deemed filing | DOB ≥ **Jan 2, 1954** ⇒ one filing = both; both cohorts fully subject | **POMS GN 00204.035** (NOT RS 00615.020) | One claim-age per person; no restricted application; **survivor exempt** |
| Survivor §202 | Start **60** (50 disabled); **71.5% @60 → 100% @ survivor-FRA**, factor **locked at claim age** (no post-claim ramp — §6); deceased's **DRCs flow through** | POMS RS 00615.301/.702 (DRC flow), .310 (DWB) | Max reduction held at **28.5%** by varying the per-mo fraction (**19/56 @FRA67**, 19/40 @FRA65) — derive from the 60→survivor-FRA span, never hardcode |
| RIB-LIM | Cap = **greater of** {82.5% of death PIA, deceased's actual reduced RIB if alive} | **POMS RS 00615.320** | A "larger-of" pair, NOT a flat 82.5% haircut; 82.5% is a **floor** within the cap |
| survivor-FRA | Separate schedule; **= 67** for both cohorts (coincides, don't alias) | POMS RS 00615.301B.2 | Key it **separately** in the table or a cohort change silently breaks |
| Statement input | Ask "benefit at **FRA (67)**", never "PIA"; figure is **today's-dollars (real)** | POMS RM 01310.005 | Default figure **assumes continued earnings** → overstates for an early-stopper (§9) |

### Institutional learnings (read before executing)

- **DND/012 (externally-derived fixtures)** — goldens come from the **POMS *printed* examples** (the RS 00615.020 Method C $1000/$400→$920 case; the RS 00615.320 RIB-LIM $350/$374.90→$350 case) as independent oracles — NEVER a value re-derived from our own formula.
- **Constants: no in-range defaults (burned/062)** — any factor the research names but can't value is an `Unsourced` sentinel that throws. (Not expected here — every factor is primary-confirmed.)
- **insights 008/010 (finiteness-first R19)** — every new input (per-person PIA, claim age) carries a `Number.isFinite`-first guard at `validateParams` AND the sub-engine entry.
- **Citation hygiene (this session)** — three landmines to bake into the table's `citation` strings: RS 00615.**102** is a dead 404 (use **.101**); deemed filing is **GN 00204.035** (RS 00615.020 is the *amount* math); the survivor general DRC flow-through is **RS 00615.301/.702** (RS 00615.320's DRC clause is RIB-LIM-internal).

---

## Key Decisions (the decision record)

### §1 — The input swap: `socialSecurityReal` → `pia`, claim age retained

`PersonInputs` drops `socialSecurityReal` (the already-adjusted benefit) and gains `pia` (the real, today's-dollar benefit-at-FRA off the statement). `socialSecurityClaimAge` **stays** (now consumed by the sub-engine instead of being a passive label). Both are per-person. A non-working / no-record person enters `pia: 0` (the reduce-to-spine zero — §7).

**PIA entry period (ratified):** ask **monthly** (the figure the statement shows), **store annual (×12)**, validate the ceiling in monthly terms at the field — mirrors the existing `spendEntryPeriod` discipline. Validation (`intake/sanity.ts`): the PIA **ceiling is a NET-NEW sanity rule** (new rule id + CopyKey + test — there is no antecedent money-sanity rule on the SS field to "re-bind"; only `ss-claim-window` exists). The claim-age `∈ [62, 70]` bound **already exists** (`SS_CLAIM_MIN`/`SS_CLAIM_MAX`, `sanity.ts:42-43`) — a re-confirm, the deemed-filing single-decision window (§5).

### §2 — A new canonical constants module: `src/engine/constants/socialSecurity.ts`

One year-keyed module, every figure a `Sourced<T>` with `directionalUntilPinned: false` (the verify sweep **is** the pin) and `legalBasis` set (these are **statutory** — 42 U.S.C. §402, 20 CFR 404, the POMS section — stable, not annually re-indexed like tax brackets). Shapes (new interfaces in `constants/types.ts`):

- `FullRetirementAge` — birth-year → **months** (804 for 1960+; the graduated 1955–59 band; the Jan-1 prior-year rule encoded in the lookup, not the caller).
- `ReductionSchedule` — `{ firstMonths: 36, firstRatePerMonth, beyondRatePerMonth }` stored as **integer fractions** (`5/9`, `5/12`, `25/36`, `2/3` of 1% — i.e. `1/180`, `1/240`, `1/144`, `1/150`), so 62/FRA67 falls out as exactly `168/240 = 0.7000`. Three instances: `WORKER_REDUCTION`, `SPOUSE_REDUCTION`, `DRC` (the credit side; **`monthsCap` is derived per person = `840 − fraMonths`** — 36 at FRA 67, 46 at FRA 66y2m — never a literal `36`, which would contradict this same table's graduated-FRA provisioning).
- `SURVIVOR_REDUCTION` — keyed to span exactly **28.5%** from age 60 to survivor-FRA (compute the per-month fraction from the span; do NOT hardcode 19/40), + the DWB flat-28.5% floor.
- `RIB_LIM` — `{ floorPctOfDeathPia: 0.825 }` (the "larger-of" logic lives in code; the constant is the floor).
- `SPOUSAL_RATE = 0.50`; `DEEMED_FILING_DOB_CUTOFF = 1954-01-02`.

**SPOUSAL_RATE carries `reVerifyEveryBuild`-class monitoring** (like the ACA entry): a scored-but-unenacted proposal to phase 50%→33% by 2042 was found; the constant must catch enactment at build time, not drift silently.

### §3 — Own-benefit reduction & delayed-credit functions (pure)

`adjustOwnBenefit(pia, claimAgeMonths, fraMonths)`:
- `n = fraMonths − claimAgeMonths` (whole months early; negative ⇒ delayed).
- Early (`n > 0`): `factor = n ≤ 36 ? (180−n)/180 : (192−(n−36))/240`.
- Delayed (`n < 0`): `factor = 1 + min(−n, drcMonthsCap)·(2/3)/100`, where **`drcMonthsCap = 840 − fraMonths`** (the FRA→70 span — **36 at FRA 67**, but **46 at FRA 66y2m**; a literal `36` under-credits a delayed claim on a mixed-cohort household, e.g. a 1958-born spouse of a 1969-born — and contradicts §2's own graduated-FRA table).
- At FRA (`n = 0`): `factor = 1`.
- `benefit = floorToDime(pia · factor)` — dime-round **down**, the final step, on the dollar.

A golden asserts `factor = 0.7000` (pre-round) at 62/FRA67 and `1.24` at 70/FRA67.

### §4 — Spousal: the Method C excess (supersedes the stated `max()` rule)

For person *L* (potential spousal recipient) on person *H*'s record (the higher PIA):
```
excessFull   = max(0, SPOUSAL_RATE·H.pia − L.pia)          // 50% of H's PIA, minus L's own PIA, floored
ownAdjusted  = adjustOwnBenefit(L.pia, L.claim, L.fra)      // worker schedule (5/9…)
excessAdj    = reduceSpouseExcess(excessFull, L.claim, L.fra)  // spouse schedule (25/36…), NO DRCs
L.benefit    = ownAdjusted + excessAdj
```
`reduceSpouseExcess` mirrors §3's own formula but on the **spouse** schedule: with `n = L.fra − L.claim` (months early), `factor = n ≤ 36 ? (144−n)/144 : (180−(n−36))/240` (the `25/36` first-36 then `5/12` beyond) — at 62/FRA67 that is exactly `156/240 = 0.65`. Note the numerator constants differ from the worker formula (`144`/`180` here vs `180`/`192` in §3) because the first-36 reduction differs (25% vs 20%). Two **separate** reduction schedules off the **same** claim-month-count (§2). The excess is **floored at 0** (when `L.pia ≥ 50%·H.pia` it degrades to own-only). The spousal base is `H.pia` (UNREDUCED) — never H's adjusted benefit, never DRC-inflated. **No DRCs** on the excess (flat past FRA). Each household has at most one spousal direction (the lower-PIA spouse on the higher's record); compute `H = argmax(pia)`.

### §5 — Deemed filing: one claim-age decision per person

Both cohorts (born 1969/1972, turn 62 in 2031/2034) are post-1954 → fully subject. Consequence baked into the model: **a single `claimAge` per person drives both their own benefit and their spousal excess** (no separate spousal claim age, no restricted application). A test asserts no path produces a spousal claim age ≠ the own claim age (outside the unmodeled child-in-care/DIB exceptions). The **survivor** branch is the lone exception and retains independent timing (§6).

### §6 — Survivor §202: the correct computation + the ratified (lock-flat) claim-timing default

When the first death occurs, the survivor's SS each year = **`max(ownStream, survivorStream)`** — and this `max()` is a **legitimate larger-of** (survivor vs. own are *alternative* entitlements; you collect the higher), **unlike** the §4 spousal `max()` that was wrong (spousal is *additive* own+excess). The survivor stream:
- `survivorBenefitFull` = the **deceased's adjusted benefit** (including the deceased's DRCs — flow-through per RS 00615.301/.702), the DRC-correct analog of today's `maxBenefit`.
- **RIB-LIM:** if the deceased had claimed reduced RIB before death, cap `survivorBenefitFull` at `max(0.825·deceasedPIA, deceasedActualReducedBenefit)` (the "larger-of"; 82.5% is a floor, not a haircut).
- **Age reduction — LOCK-FLAT (cardinal-rule-load-bearing):** the survivor stream starts at `max(survivor age 60, first-death year)`; its reduction factor is **locked at the survivor's age at that start offset and held FLAT for the rest of the horizon.** It does **NOT** ramp upward toward 100% as the survivor ages. The "71.5% @60 → 100% @ survivor-FRA" schedule is over the *claim age* (a survivor who *claims later* gets a higher factor) — **not** a post-claim age-ramp. A per-year ramp would optimistically overstate guaranteed income on exactly the early-widowhood paths this unit exists to fix — the calm-but-wrong sin. (survivor-FRA = 67 here, keyed separately.)

**Ratified claim-timing default (ATC-confirmed 2026-06-14; no longer an open question):** the survivor claims the survivor benefit **as soon as eligible** (`max(60, death)`), locks the reduced factor, and receives `max(own, survivor)` each year. The adversarial review confirmed this is **one-signed conservative *only* under the lock-flat reading above**: it closes the early-widowhood gap (the ATC intent) while leaving the survivor's *optimal two-stage upside* (survivor-first → own-at-70, the deemed-filing-exempt lever) **on the table** for P4's optimizer — never an optimistic assumption baked in here. The replaced `$0-until-own-claim` stub is gone; reduce-to-spine still holds (no death ⇒ this code never runs ⇒ byte-identical — §7/§12).

### §7 — The engine seam: own as a resolved scalar; excess + survivor as time/path terms

The orchestrator **`householdBenefitStreams(people)`** runs **once pre-loop** (alongside `offsets`/`maxBenefit`, `simulate.ts:722-728`) and is the entry point for everything below. The three benefit components are wired **differently by their time-shape** — small where it can be, honest where it can't (the review's "changes minimally" was true for own, false for the survivor):

- **Own benefit → a resolved per-person SCALAR.** `adjustOwnBenefit(L.pia, L.claim, L.fra)` is a single claim-age-locked dollar, so it **directly replaces** today's `PersonOffsets.socialSecurityReal` scalar (`:144`). PersonOffsets stays scalar; the ~10 `PersonOffsets` literals and `cashTermsForYear`'s signature are a **value reinterpret**, not a shape change. This is the genuinely "minimal" part.
- **Spousal excess → a time-gated per-person term.** The Method C excess (§4) is not static: it is $0 until **`max(L.claimOffset, H.claimOffset)`** (the worker-must-be-entitled START gate, RS 00202.001) **and returns to $0 at H's death offset** (the END gate — the excess terminates at the worker's death and is *replaced* by the survivor benefit; omitting it **double-counts** guaranteed income on death paths). A new per-year term added to the per-person SS sum, mirroring `contributionsForYear`'s per-path death-truncation shape.
- **Survivor benefit → a per-PATH selection (the real new plumbing).** Today `cashTermsForYear` keeps only a boolean `survivorClaimed` + scalar `maxBenefit` (`:189,:197`) — it discards *which* spouse died and carries no age. §6 needs all three: (a) the **deceased's index** (recover it — today thrown away), (b) the survivor's **age at t** (`people[i].currentAge + t`), and (c) the deceased's **RIB-LIM-capped survivor base** — so precompute **two** `survivorBenefitFull` values (one per possible decedent) pre-loop and **select per path** at the death offset. The `:197` survivor branch is rewritten to the §6 `max(ownStream, survivorStream)`.

**CRN invariant (corrected mechanism):** the date-search (`dateSearch.ts:178-181`) varies **only `retirementAge`**; `currentAge`, `socialSecurityClaimAge`, `pia`, and `birthYear` are held **verbatim** — so every claim *offset* (`claimAge − currentAge`) is **invariant across candidates** (the sweep shifts the *retire* offset, not the claim offset; the earlier "shifts a claim offset" wording was inverted). Own, the gated excess, and the survivor selection are therefore all candidate-invariant — computed once, **zero draws**. (The accumulation-state PIA recompute is deferred to P4, so moving `retirementAge` cannot perturb a PIA either.)

**Reduce-to-spine:** all-PIA-zero ⇒ own 0, excess 0, survivor 0 ⇒ `max(0,0)=0` ⇒ byte-identical to today's `socialSecurityReal=0` Trinity/Bengen spine (golden cases untouched — §12).

### §8 — Tax overlay: unchanged, verified non-double-counting

`taxableSocialSecurity` (§86) consumes the per-year benefit dollar `ss` already surfaced by `cashTermsForYear`. The sub-engine changes the **value** of that dollar, not the seam. Confirm (test) the overlay never re-derives the benefit from PIA — it reads the computed stream, so provisional income stays correct by construction. (If a muni bucket is ever added, the §86 provisional rule is the single change site — unchanged by this unit.)

### §9 — D1 intake: the PIA question + the stop-early honesty routing

The paired SS question (`questions.tsx:232-257`) swaps the amount `CurrencyField` for a **PIA** `CurrencyField`, labelled (via `copy.ts`, the copy-fence) **"estimated monthly benefit at full retirement age (67)"** — never the word "PIA". The claim-age `IntegerField` stays (bounded 62–70). Help copy (the `ExternalLink` block already pointing at `ssaMyAccount`) gains the **stop-early instruction**: *open the mySSA Retirement Estimator, set future earnings to $0 at your planned stop age, and read the age-67 figure* — because the default statement number assumes continued earnings and **overstates** for an early-stopper (the rosy/calm-but-wrong direction; an on-request paper statement does NOT fix the FRA figure — only the estimator does). A non-blocking **cross-check**: if the user also enters their 62 and 70 figures, validate the ≈0.70 / ≈1.24 ratios to catch a wrong-bar entry (optional, deferred if it complicates the single-pass intake).

### §10 — Persistence: the field swap lands in ScenarioV3 (sequencing)

The swap is on the **base** `PersonInputs` (so `PersonInputsV3 extends PersonInputs` inherits it — **`SCENARIO_V3_FIELDS` is unchanged**; the SS field is nested in `people[]`, not a top-level v3 key). Because `ScenarioV3` is **defined but not yet written** (U8 owns its codec arm; nothing persists *any* scenario yet — see TODO), there is **no migration debt now** — which **confirms the SS-before-U8 ordering**: U8 must persist the post-swap shape, or it eats a needless v3→v4 migration.

**Landmine the review caught:** `Scenario` (v1) and `ScenarioV2` reference the **same base `PersonInputs`** (`model.ts:506-512, 676-682`), so dropping `socialSecurityReal` from the base also strips it from the v1/v2 *type* shapes (the compile-time mapped-type guards surface this — it is **not** silent; the original "v1/v2 unaffected" claim was wrong). **Fix: fork a frozen `PersonInputsLegacy`** carrying `socialSecurityReal` that the v1/v2 interfaces + codec arms reference, while the live `PersonInputs` carries `pia`. Since no v1/v2 *blobs* exist in the wild (save/load is unbuilt), this is pure type hygiene to keep the codec ladder + its tests honest.

### §11 — Golden fixtures (externally-derived, DND 012)

- **Method C oracle (structure):** the POMS RS 00615.020 *printed* example — **worker PIA $2,000** (so the spouse base = `0.50·$2,000 = $1,000`), own RIB $400 → excess `$1,000 − $400 = $600` → $540, RIB → $380, **total $920**. (The example's "$1,000" is the *spousal base*, NOT the worker PIA the §4 formula consumes — feed `H.pia = $2,000`, or the oracle silently can't reproduce $920.) Reductions are *illustrative* (a partial-early claim), so it pins the **structure** (own-in-full + reduced-excess), not a single claim age.
- **Divergence fixture (the `max()`-relapse AND schedule-swap guard):** own PIA $1000 / worker PIA $3000 at 62/FRA67 → own $700, **excessAdj $325**, total **$1,025**. Assert (a) it **beats** `max(700, 975) = 975` by $50/mo (kills a `max()` relapse) AND (b) **`excessAdj === 325` independently** — a 5/9-for-excess schedule swap yields $350 / total $1,050, so pinning the *component* (not just the rounded total) keeps the swap-discriminator alive through a future tidy-up.
- **RIB-LIM oracle:** POMS RS 00615.320 — reduced RIB $350, PIA $374.90, `0.825·$374.90 = $309.29` (dime-floored to $309.20) → WIB = `max($350, $309.29) = $350`.
- **Combined early-widowhood junction (the unit's raison d'être):** a death in the **survivor age 60–65** window where the §202 **age-reduced (lock-flat) + RIB-LIM-capped** survivor benefit **differs** from the old `max(deceasedScalar, survivorScalar)` — pins the cap-then-age-reduce order AND the survivor `max()`-relapse (§12). Hand-derive the expected value from the POMS rules (no standalone oracle covers this junction).
- **Own factors:** 0.7000 @62, 1.0000 @67, 1.24 @70 (pre-dime-round) — anchored to SSA's published percent-of-PIA table.
- Every fixture's expected value is hand-derived from the POMS text, never from `socialSecurity.ts`.

### §12 — Reduce-to-spine + the test plan

- **Spine invariant:** PIA=0 (all persons) ⇒ all streams zero ⇒ Trinity/Bengen golden suite **byte-identical (same seed)** to HEAD (pinned pre-change seed run). *Companion (the real identity bridge):* a **nonzero PIA claimed at FRA 67, single earner, no spouse** (factor 1.0, no excess) must be byte-identical to a pre-change `socialSecurityReal = that-same-$` run — the zero-maps-to-zero test alone exercises **none** of the reduction/excess/survivor branches, so it can't catch a sign error or month-count off-by-one.
- **Single-earner reduction:** one PIA = 0 ⇒ the earner gets own-only; the zero-PIA spouse gets `0.50·H.pia` reduced (the homemaker case) — a fixture.
- **Excess end-gate:** L's excess stream goes to **$0 at H's death offset** (no excess+survivor double-count) — a regression test (the `:197` rewrite removed the line that masked this today).
- **Survivor flat-lock:** the survivor's reduction factor is **constant** from its start offset to the horizon (no upward ramp) — a property/golden mirroring the §11 relapse guard (the cardinal-rule guard for §6).
- **Survivor `max()`-relapse:** a survivor-year golden where the §202 value **≠** old `max(deceasedScalar, survivorScalar)` (the §11 combined junction) — **replaces the now-wrong `simulate.test.ts:162-166` assertion** ("survivor keeps the larger"), which is exactly the §6 rewrite target.
- **Survivor-off:** no death within horizon ⇒ §6 never fires ⇒ byte-identical to the own+spousal path.
- **Property test (`*.pbt.test.ts`):** household total monotone non-decreasing in each PIA; dual-earner strictly ≥ naive `max()`; claim ∈[62,70] always finite; excess always ≥0.
- **Migration suite (REWRITES, not value edits):** the heaviest two fixtures, `simulate.test.ts:600-681` and `:1707-1769`, **hand-reimplement the SS seam** (`socialSecurityReal` passthrough + `maxBenefit = Math.max`) and assert byte-exactness — §7's stream/survivor rewrite breaks them **structurally**; they must call the new sub-engine or be re-cut, and their **impossible claim ages (75/72)** must drop to ≤70. Budget the 84-site audit (§ Context) accordingly — `simulate.test.ts` is the heavy lift.

---

## Build sequence (units of work)

1. **`socialSecurity.ts` constants + `types.ts` shapes** (§2) — with citations (the three landmine corrections baked into the strings), `reVerify` on SPOUSAL_RATE. Shape test greps for inlined factors (the single-source discipline).
2. **The pure sub-engine** (`src/engine/socialSecurityBenefit.ts`, §3/§4/§6) — `adjustOwnBenefit`, `reduceSpouseExcess`, `householdBenefitStreams`, `survivorBenefit`. Pure; imports only `@shared` + `@engine/constants`. Engine-purity lint applies (no clock/entropy).
3. **Golden + property tests** (§11/§12) — the POMS oracles FIRST (red), then the engine green.
4. **Model swap** (`PersonInputs` base → `pia`; **fork frozen `PersonInputsLegacy` for the v1/v2 codec arms**; `SCENARIO_V3_FIELDS` unchanged — the field is nested in `people[]`; §1/§10).
5. **The seam** (`simulate.ts` pre-loop `householdBenefitStreams` wiring + own-scalar reinterpret + the per-year excess term + the per-path survivor selection + `validateParams` finiteness guards; §7).
6. **Intake** (`questions.tsx`, `copy.ts`, `intakeMap.ts` — incl. the **missing-fact gate `:108`** `ssAmountLabel`→PIA label and **`buildPeople :413`** field swap — `sanity.ts` new PIA-ceiling rule; §9) — under the four-skill UI loadout (CLAUDE.md), copy-fence respected; re-run the no-missing⟹validateParams-accepts coupling test.
7. **Migration audit** (the 84 sites; §10/§12) — reinterpret every non-FRA fixture; **rewrite (not value-edit)** the two seam-reconstruction fixtures (`simulate.test.ts:600-681`, `:1707-1769`) and drop their impossible >70 claim ages.
8. **Gates** — typecheck · vitest · lint · `verify:bundle` (intake gains no new heavy import) · the reduce-to-spine regression.
9. **`/ultramode-code-review`** at the unit boundary (the standing cadence) → `/distill`.

## Open questions (genuinely open; decide at build)

*(The survivor claim-timing default and the PIA entry period were folded OUT of this list by the 2026-06-14 review — now ratified in §6 and §1.)*

- **Monthly vs annual benefit granularity** — the engine is annual-real; the DRC "January-after-the-year-earned" lag (RS 00615.690 §B) and the dime-rounding are **monthly** rules. At annual granularity the lag is a self-correcting sub-12-month slice at the only anchor that matters (age 70, where it's zero). *Decision: annual; document the lag as an intentional abstraction in the constants comment.*
- **The 0.70/1.24 intake cross-check (§9)** — ship in v1 or defer to keep the single-pass intake clean? *Lean: defer; a nice-to-have guard, not a correctness gate.*
