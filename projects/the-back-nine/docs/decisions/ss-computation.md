---
title: The Social Security computation — the §1–§12 decision record (own + Method-C spousal + §202 survivor)
doc-type: decision
status: decided
created: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/research/engine-validation-and-tax.md]
---

# The Social Security computation — the §1–§12 decision record

## What this record is

This is the **permanent decision record** for how the engine computes each person's Social Security benefit — own early-reduction / delayed-credit, the Method C spousal **excess**, and the §202 **survivor** benefit with RIB-LIM — from a per-person **PIA + claim age**. It is referenced **by §-number across the repo** (the sub-engine, the per-act plans, and the tests cite "§4", "§6", "§11", etc.).

The §1–§12 record below is source-verified and adversarially-reviewed. It holds the *decisions* (what we compute and **why**); the **mechanics** — every formula, factor and gate — live once in [docs/architecture.md §7.7](../architecture.md) (the SS sub-engine is a pure `(PIAs, claim ages, birth years) → per-person annual-benefit-stream` function, computed pre-loop, zero draws, CRN-invariant across date-search candidates). The readable build narrative lives in [docs/plans/1-engine.md](../plans/1-engine.md). This record links to those rather than restating them.

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
| Intake asks the **at-FRA monthly figure** in plain language (never the word "PIA") and echoes the derived FRA | §9 |
| The sub-engine is **pure, pre-loop**; PIA=0 ⇒ byte-identical to the prior spine | §7, §12 |
| One **statutory** `Sourced` constants module; every golden hand-derived from POMS, never engine-derived | §2, §11 |
| The survivor's filing switches **MFJ→single** the year after the first death (no QSS grace) | §6b |
| The household **survivor-spending ratio** is ~75% (Blanchett), editable, too-low is the unsafe direction | §6a |

---

## The statutory basis

The §1–§12 decisions below rest on the verified SSA rule-set — FRA-by-birth-year, the worker/spouse reduction schedules, the DRC, the Method C excess, deemed filing, the §202 survivor reduction, RIB-LIM, survivor-FRA, and the citation-hygiene landmines (RS 00615.**102** is a 404 — use **.101**; deemed filing is **GN 00204.035**; survivor DRC flow-through is **RS 00615.301/.702**). The **full verified register** — every factor, its exact value, its POMS primary, and the externally-derived oracle dollars ($920 Method C / $1,025 divergence / $350 RIB-LIM) — lives once in [docs/research/engine-validation-and-tax.md → *Social Security benefit-computation constants*](../research/engine-validation-and-tax.md); the **runtime** values live in `src/engine/constants/socialSecurity.ts` (each a `Sourced<T>` with `legalBasis`, the constants-discipline shape canonical in [docs/architecture.md §8](../architecture.md)). The §-sections below cite the specific factors each decision turns on; they do not re-register the table.

---

## The §1–§12 decision record

> These sections are referenced by §-number across the repo — **never renumber them**. The factors and formulas are not restated here: they live in `src/engine/constants/socialSecurity.ts` and [docs/architecture.md §7.7](../architecture.md), and this record holds the rules, the citations, and the reasoning.

### §1 — The input is `pia` + claim age (not an already-adjusted benefit)

`PersonInputs` carries `pia` (the real, today's-dollar benefit-at-FRA off the statement) and `socialSecurityClaimAge` (consumed by the sub-engine, not a passive label). Both are per-person. A non-working / no-record person enters `pia: 0` — the reduce-to-spine zero (§7).

**PIA entry period:** the field asks **monthly** (the figure the statement shows) and **stores annual (×12)** — the `spendEntryPeriod` discipline. The PIA ceiling shipped as a net-new sanity rule (`pia-over-ceiling` → `errPiaCeiling`, `src/intake/sanity.ts`; there was no antecedent money-sanity rule on the SS field): it compares the **stored annual** figure against a deliberately generous impossibility bound, catching the consequential 12× misentry — a yearly total typed into the monthly box — without ever false-rejecting a real high earner. The claim-age `∈ [62, 70]` bound is `SS_CLAIM_MIN`/`SS_CLAIM_MAX` (same file) — the deemed-filing single-decision window (§5). Intake asks the **calendar year** Social Security starts (concrete and plan-shaped) and converts against `birthYear` to the whole-year claim age the sub-engine consumes.

### §2 — One canonical statutory constants module

`src/engine/constants/socialSecurity.ts` is one module; every figure is a `Sourced<T>` with `legalBasis` set — these are **statutory** (42 U.S.C. §402/§416, 20 CFR 404, the POMS section), stable until Congress acts, **not** annually re-indexed like the tax and health tables, so nothing here is year-keyed beyond the two birth-year-banded FRA tables. Every entry is pinned (`directionalUntilPinned: false`): the reduction/credit fractions, RIB-LIM, the survivor 28.5%, the spousal rate and the deemed-filing cutoff by the 2026-06-14 POMS byte-pull sweep; **both** FRA tables byte-pinned against the live SSA primaries at U14 S0 (2026-07-18). The shapes — and the rules that outlive their values:

- `fullRetirementAge` / `survivorFullRetirementAge` — birth-year bands → FRA in **months**, keyed **separately** so a cohort change cannot silently alias them (they coincide at 67y0m for both household cohorts; the survivor bands run ~2 birth-years later than the retirement bands, so a 1957–61 cohort's survivor-FRA lands 2–4 months *earlier* than their retirement-FRA). `fraMonthsForBirthYear(birthYear, kind)` is the one lookup, with the finite/integer/range guard triad; the SSA "born Jan 1 → prior period" rule needs a full DOB the model does not carry and is a disclosed simplification, not a caller's job.
- `workerReduction` / `spouseReduction` / `delayedRetirementCredit` — per-month rates stored as **integer fractions** (`{ numerator, denominator }` of 1% per month), never decimals, so the published percent-of-PIA factors fall out exactly. The DRC's month cap is **derived per person** from `throughAge` and that person's FRA — never a literal `36`, which would contradict the graduated-FRA table — and a birth before the DRC's `bornFromYear` on the delayed path **fails loud** rather than defaulting to 8% (the pre-1943 step-down rates are unsourced; burned/062).
- `survivorReduction` — the maximum reduction is stored as a **span-invariant percentage** (28.5%, age 60 → survivor-FRA) with the per-month fraction computed from the span; hardcoding `19/40` would silently assume an FRA-65 cohort. It also carries the DWB earliest age, for a disabled-survivor branch the engine does not model.
- `ribLim` — the floor percentage of the death PIA only; the "larger-of" logic lives in code, never in the constant.
- `spousalRate` · `deemedFilingDobCutoff` — the spousal rate and the BBA-2015 deemed-filing DOB cutoff.

Every value is read from this module; no factor is re-typed in the sub-engine, a test, or this record (burned/063).

**`spousalRate` carries the `reVerifyEveryBuild` flag** — a scored-but-unenacted proposal to phase 50%→33% by 2042 exists, so the figure sits on the re-verify watch list.

**How the flag is enforced (installed 2026-08-01).** `src/engine/constants/__tests__/spousalRate.reverify.tripwire.test.ts` is a dated wall-clock arm that reds one year after its recorded re-verify date, riding `pnpm test` (already in CI) rather than a bespoke `verify:ss` script. Its premise is the flag itself, so removing the flag reds the tripwire and forces a conscious retirement. The census that installed it found `spousalRate` was the **only** `reVerifyEveryBuild` entry in `src/engine/constants/` with no last-verified record, no CI gate and no runtime clause — the flag was inert prose.

⚠️ **What the arm does: forces a HUMAN re-verify at least annually. What it cannot do: detect an enactment at build time** — nothing available to us can. That wording was once written into this record as if it were a shipped mechanism; do not reintroduce it. (The `spousalRate` entry's own `note` in `socialSecurity.ts` still carries the stale *"a `verify:ss` CI gate to catch enactment at build time is a future hardening (TODO)"* line — that TODO is settled against, twice over: the tripwire is the enforcement, and no gate can detect an enactment.)

**The gate is deliberately CI-only, not CI + a runtime withhold** (the shape `acaEnhancedSubsidyStatus` uses). `consumedConstants.ts` pulls the whole `socialSecurity.*` family whenever any person has `pia > 0` — essentially every household — where ACA's clause fires only for pre-65 Marketplace runs and NC's for one state. A stale-stamp withhold would refuse the recommendation to *everyone* over a statute nobody had touched, which is alarm-when-fine at maximum scale and its own breach of the cardinal rule. A runtime clause remains fully additive if that judgement ever changes.

### §3 — Own-benefit reduction & delayed credit (pure)

`adjustOwnBenefitAnnual(piaAnnual, claimAge, birthYear)` resolves the whole-month count against the person's FRA and applies one of three regimes: the **worker** reduction schedule when early, the **delayed-retirement credit** when late, and a factor of exactly 1 at FRA. The formulas — and the published percent-of-PIA factors they must produce — are canonical in [docs/architecture.md §7.7](../architecture.md); the schedules are read from `workerReduction` / `delayedRetirementCredit` (§2), never re-typed.

The decisions this section owns:

- **Exactness over float.** Every factor is an exact integer rational, and the SSA dime-round is done **monthly, in integer cents**, before the ×12 to annual. A naive float multiply followed by a dime-floor rounds a value like `699.9999…` *down* — a $0.10/mo error in the optimistic-on-the-floor direction, the calm-but-wrong sin at its smallest scale.
- **The delayed-credit month cap is DERIVED per person** from the FRA→70 span, never a literal `36` — a literal under-credits a delayed claim on any cohort whose FRA is below 67, and would contradict the graduated-FRA table (§2). A shipped golden drives a non-67 cohort specifically to keep that honest (§11).
- **The claim window fails loud.** This function is the claim-age **chokepoint** — every own, spousal, and deceased-worker claim age routes through it — so one assertion guards them all: finite, integer, and inside [62, 70]. Below 62 the two-segment reduction extrapolates *unbounded* into a negative benefit dollar; a NaN passes every relational guard, so finiteness is checked first (insights 010/020; burned/062).

### §4 — Spousal: the Method C excess (the `max()` rule is wrong)

For the lower-PIA person on the higher earner's record, the benefit is their **reduced own benefit in full, plus a separately-reduced spousal excess** — never `max(own, spousal)`. The formula and both reduction schedules are canonical in [docs/architecture.md §7.7](../architecture.md); `householdBenefits` (`src/engine/socialSecurityBenefit.ts`) is the implementation, returning the excess as its own field so the seam can gate its start and end independently (§7).

The decisions this section owns:

- **Two SEPARATE reduction schedules off the SAME month-count.** The own piece reduces on the worker schedule, the excess on the spouse schedule; they diverge because the first-36-month rate differs (25% vs 20% at 36 months). A schedule swap is a silent over-credit, which is why §11's divergence fixture asserts the excess **component**, not just the total.
- **The spousal base is the higher earner's UNREDUCED PIA** — never their claim-age-adjusted benefit, never DRC-inflated — and **no delayed credits ever accrue to the excess**: it is flat at and past FRA.
- **The excess is floored at 0.** Once the lower earner's own PIA reaches half the higher PIA, the household degrades to own-only.
- **One spousal direction per household.** The higher earner is `argmax(pia)`, a tie resolving to the first (immaterial — an equal-PIA spouse's excess floors to 0 either way). A 3+-person array **throws** rather than crediting multiple simultaneous excesses on one record.

### §5 — Deemed filing: one claim-age decision per person

Both cohorts (born 1969/1972) are post-1954 → fully subject. Consequence baked into the model: **a single `claimAge` per person drives both their own benefit and their spousal excess** (no separate spousal claim age, no restricted application). It is structural, not a runtime check: the model carries one `socialSecurityClaimAge` per person and `householdBenefits` derives both pieces from it, so there is no second claim age that could diverge (a shape test pins the cutoff date itself). The **survivor** branch is the lone exception and retains independent timing (§6).

### §6 — Survivor §202: the correct computation + the lock-flat claim-timing default

When the first death occurs, the survivor's SS each year = **`max(ownStream, survivorStream)`** — and this `max()` is a **legitimate larger-of** (survivor vs. own are *alternative* entitlements; you collect the higher), **unlike** the §4 spousal `max()` that was wrong (spousal is *additive*). The survivor stream:
- The survivor base is the **deceased's adjusted benefit**, including the deceased's DRCs (flow-through per RS 00615.301/.702) — the DRC-correct replacement for the pre-sub-engine stub, which simply kept the larger of the two flat scalars.
- **RIB-LIM:** if the deceased had claimed reduced RIB before death, that base is capped at the **larger of** the `ribLim` floor percentage of the death PIA or the deceased's actual reduced benefit — a larger-of, so the percentage is a **floor within the cap, never a flat haircut** (the arithmetic and the percentage live in [docs/architecture.md §7.7](../architecture.md) and `ribLim`).
- **Age reduction — LOCK-FLAT (cardinal-rule-load-bearing):** the survivor stream starts at `max(survivor age 60, first-death year)`; its reduction factor is **locked at the survivor's age at that start offset and held FLAT for the rest of the horizon.** It does **not** ramp upward toward 100% as the survivor ages. The graded schedule — the maximum reduction at 60 rising to 100% at survivor-FRA — is over the *claim age* (a survivor who *claims later* gets a higher factor), **not** a post-claim age-ramp. A per-year ramp would optimistically overstate guaranteed income on exactly the early-widowhood paths this unit exists to fix.

**The claim-timing default:** the survivor claims the survivor benefit **as soon as eligible** (`max(60, death)`), locks the reduced factor, and receives `max(own, survivor)` each year. This is one-signed conservative **only under the lock-flat reading above**: it closes the early-widowhood gap while leaving the survivor's *optimal two-stage upside* (survivor-first → own-at-70, the deemed-filing-exempt lever) on the table for **P4's optimizer** — never an optimistic assumption baked in here. Reduce-to-spine still holds (no death ⇒ this code never runs ⇒ byte-identical — §7/§12).

#### §6a — The household survivor-spending ratio (~75%, Blanchett)

A surviving spouse needs less than the couple did, but not half. The household survivor-spending ratio is grounded to a citable range — **Blanchett's two-thirds-to-three-quarters** — and ships as `survivorSpendingRatio` in `src/engine/reference/methodology.ts` (methodology substrate, not an `@engine/constants` figure: it is still `directionalUntilPinned` with `directionalKind: 'methodology-substrate'`, so it ships **difference-keyed and disclosed** and never blocks the oracle-cleared token — [docs/architecture.md §8](../architecture.md)). The household **edits it** at the AssumptionPanel's methodology seat, where the help line carries the calm honesty note that **too-low is the unsafe direction** (it understates the survivor's need — the calm-but-wrong direction for a widow's projection); a blank or above-100% edit refuses with its own line. It fires on the **first death of either spouse** (a needs figure), independent of the receipts-side survivor benefits computed above.

#### §6b — The MFJ→single filing switch (the survivor tax cliff)

The survivor files **single the year after the first death** — **no QSS (qualifying-surviving-spouse) grace**. This is not a new boundary: it **is** the joint→survivor two-regime boundary at the sampled first death. The survivor's same real dollars then fall into **~half-width single brackets with ~half the standard deduction** — the emotional headline the recommendation surfaces. The headline narrative is canonical in [docs/product.md](../product.md); the *computation* choice (no QSS grace; the switch year) is decided here, and the bracket/standard-deduction mechanic lives in [docs/architecture.md §7.1](../architecture.md).

### §7 — The engine seam: own as a scalar, excess + survivor as time/path terms

The three benefit components are wired **differently by their time-shape** — small where it can be, honest where it can't (the mechanics are canonical in [docs/architecture.md §7.7](../architecture.md); the *decisions* are here):

- **Own benefit → a resolved per-person SCALAR.** A single claim-age-locked dollar that directly replaces the prior per-person benefit slot — the genuinely "minimal" part.
- **Spousal excess → a time-gated per-person term.** The Method C excess is $0 until `max(L.claimOffset, H.claimOffset)` (the worker-must-be-entitled **start** gate, RS 00202.001) **and returns to $0 at the first death** (the **end** gate — as built the seam's both-alive branch owns the excess, so it vanishes the moment either spouse dies and the §202 survivor benefit takes over SS entirely; omitting the gate would **double-count** guaranteed income on every death path).
- **Survivor benefit → a per-PATH selection.** The survivor branch needs the deceased's index, the survivor's age at `t`, and the deceased's RIB-LIM-capped survivor base, selected per path at the death offset, then `max(ownStream, survivorStream)` (§6).

**CRN invariance:** the date-search varies **only `retirementAge`**; `currentAge`, `socialSecurityClaimAge`, `pia`, and `birthYear` are held **verbatim** — so every claim *offset* (`claimAge − currentAge`) is invariant across candidates (the sweep shifts the *retire* offset, never the claim offset). Own, the gated excess, and the survivor selection are all candidate-invariant — computed once, **zero draws**.

**Reduce-to-spine:** all-PIA-zero ⇒ own 0, excess 0, survivor 0 ⇒ `max(0,0)=0` ⇒ byte-identical to the prior `socialSecurityReal=0` Trinity/Bengen spine (golden cases untouched — §12).

### §8 — Tax overlay: unchanged, non-double-counting

`taxableSocialSecurity` (§86 / Pub 915) consumes the per-year benefit **dollar** and is agnostic to its derivation. Computing the benefit upstream is seamless to the provisional-income layer — the overlay never re-derives the benefit, so there is no double-count risk by construction. (If a muni bucket is ever added, the §86 provisional rule is the single change site.)

### §9 — Intake: the PIA question in plain language

The SS step asks for the **PIA labelled in plain language** — "Monthly benefit at full retirement age", the figure the statement shows, never the word "PIA" — and echoes that person's **derived FRA** beneath the field so there is no doubt which figure to copy. One calm line tells the household that spousal and survivor benefits are worked out from these two answers and there is nothing extra to enter, and the step links out to the SSA account page. Claiming is asked as the **calendar year** Social Security starts and stored as the whole-year claim age (§1), bounded to the deemed-filing window (§5).

Two intake ideas from this record did **not** ship:

- **The stop-early honesty routing.** The shipped help line warns only that the figure must be the at-FRA one rather than the age-62 or age-70 figure. The rosy risk it was meant to close is real and still open: the statement's default number **assumes continued earnings**, so it overstates for a household that stops early, and an on-request paper statement does not fix the FRA figure — only the mySSA Retirement Estimator with future earnings set to **$0** at the planned stop age does. No copy routes the user there.
- **The non-blocking `0.70/1.24` ratio cross-check** (if the user also entered their 62 and 70 figures) was **deferred on purpose** — a nice-to-have wrong-bar-entry guard, not a correctness gate, kept out to preserve the single-pass intake.

### §10 — Persistence: the field lives on base `PersonInputs`

The SS fields live on the **base** `PersonInputs`, so `PersonInputsV3` — which extends it, omitting only `retirementAge` — inherits them, and `SCENARIO_V3_FIELDS` carries no SS key: the fields nest inside `people[]`. Deciding this **before** U8 is what avoided the debt. U8's codec arm and first writer shipped straight onto the post-swap shape, so the v3→v4 migration this ordering existed to prevent was never needed. The frozen v1/v2 person shape still carries the pre-swap, already-claim-adjusted `socialSecurityReal` scalar purely as decode-ladder type hygiene — no v1/v2 blob was ever written in the wild.

### §11 — Golden fixtures (externally derived, DND/012)

Every expected value is hand-derived from the POMS text, never from `socialSecurity.ts` (DND/012). POMS's own **printed** examples — the Method C dual-entitlement total (RS 00615.020) and the RIB-LIM widow(er) case (RS 00615.320) — are registered as external oracles in [docs/research/engine-validation-and-tax.md](../research/engine-validation-and-tax.md) with their dollars; each was re-derived by hand and used to **design** the shipped fixtures below rather than transcribed into the suite as a case of its own.

The shipped fixtures (`src/engine/__tests__/socialSecurityBenefit.test.ts`, and the seam arms in `simulate.test.ts`):

- **Divergence fixture (the `max()`-relapse AND schedule-swap guard):** own PIA $1,000/mo against a $3,000/mo worker at 62 / FRA 67. It asserts (a) the Method C total **beats** naive `max()` by exactly $50/mo — killing a `max()` relapse — AND (b) the reduced excess **component** independently, because a worker-for-spouse schedule swap moves only the component while leaving a plausible-looking total.
- **RIB-LIM, both sides of the cap:** a deceased who claimed deeply early (the floor **binds**, the survivor gets the floor percentage of PIA rather than the deceased's smaller reduced benefit) and one who claimed only moderately early (the floor does **not** bind, the actual reduced benefit is the cap) — the "larger-of" proven in both directions.
- **DRC flow-through:** a survivor of a delayed-to-70 worker receives the deceased's full delayed credit, with no RIB-LIM (the deceased did not claim early).
- **Lock-flat age reduction:** a survivor starting at 60 lands on exactly the maximum-reduction factor and one starting at survivor-FRA on 100%; a start at 63 is a **different flat amount** from a start at 60 — each correct for its start age, neither ramping.
- **Combined early-widowhood junction (the unit's raison d'être):** a deceased who claimed at 62 (RIB-LIM floor binding) with the survivor starting at 61 — pinning the **cap-then-age-reduce order** and proving the value differs from the old naive scalar. Hand-derived; no standalone oracle covers this junction.
- **Own factors on the dime:** the published percent-of-PIA figures at 62 / FRA / 70 land exactly, plus a float-exactness case proving the monthly dime-round goes **down** without the float artifact.
- **The non-FRA-67 cohort arm:** a graduated-FRA birth year, delayed to 70, whose derived DRC cap exceeds 36 months — a literal `36` under-credits and fails here.

### §12 — Reduce-to-spine + the load-bearing invariants

- **Spine invariant:** PIA=0 (all persons) ⇒ all streams zero ⇒ the Trinity/Bengen golden suite is **byte-identical (same seed)** to the pre-change spine. *Companion (the real identity bridge):* a nonzero PIA claimed at FRA 67, single earner, no spouse (factor 1.0, no excess) must be byte-identical to a prior `socialSecurityReal = that-same-$` run — the zero-maps-to-zero test alone exercises none of the reduction/excess/survivor branches, so it cannot catch a sign error or a month-count off-by-one.
- **Excess end-gate:** the excess is added only while both spouses are alive and goes to **$0 at the first death** (no excess+survivor double-count) — a seam arm drives the start gate, the per-year add, and the end gate in one case.
- **Survivor flat-lock:** the survivor's reduction factor is **constant** from its start offset to the horizon (no upward ramp) — the cardinal-rule guard for §6.
- **Survivor `max()`-relapse:** a survivor-year value that **≠** a naive `max(deceasedScalar, survivorScalar)` (the §11 combined junction).
- **Property tests** (`socialSecurityBenefit.pbt.test.ts`, fast-check): the own benefit is finite, non-negative and bounded within the published factor range across the whole 62–70 window; the own benefit is monotone non-decreasing in PIA; across arbitrary PIA/claim pairs every excess is finite and ≥ 0 and the higher earner never carries one; and a lower earner under half the higher PIA **always** receives a positive excess — the floor the model exists to credit. (The dual-earner-beats-naive-`max()` divergence is pinned by the §11 fixture, not the property suite.)

The benefit is computed at **annual granularity** (the engine is annual-real). The monthly DRC "January-after-the-year-earned" lag (RS 00615.690 §B) and dime-rounding are *monthly* rules; at annual granularity the lag is a self-correcting sub-12-month slice at the only anchor that matters (age 70, where it is zero) — an intentional abstraction recorded in the constants comment.

---

## The cardinal-rule guards (institutional record)

Three guards are load-bearing for the cardinal rule. Two are decided design (the survivor lock-flat, the excess end-gate); one is a **bug an integration review caught**, preserved here so a future reader does not re-introduce it.

### The survivor lock-flat guard (§6) and the excess end-gate (§7)

Restated as the two things that must never regress: the survivor reduction factor is **locked and flat** (never ramps toward 100%), and the spousal excess **terminates at the first death** (it is replaced by, never added to, the survivor benefit). Both are pinned by the §12 invariants.

### `realizedClaimAgeAtDeath` — the survivor-floor optimistic-overstatement bug (insight 040)

> This is institutional record — the as-built correction a post-wiring holistic review found, **not** a plan item. It was an **optimistic overstatement of the survivor floor — the cardinal sin** — on exactly the early-widowhood paths the §202 computation exists to harden.

**The bug.** Building the deceased's survivor base from the household's **planned** claim age means: on any path where the death offset precedes the claim offset, the deceased **never lived to file**, yet the seam credited the full delayed-retirement credit of a claim they never made — a plan-70 breadwinner dying at 68 got a `1.24×` PIA survivor base instead of the `1.08×` they actually earned. Reachable, not measure-zero (the longevity sampler starts at `max(currentAge, 65)` and draws its first death the year after, so 66 is the earliest death age for anyone 65 or under today, and claim-70 is the de-facto default, so deaths at 66–69 before a planned-70 claim are a common path class).

**Why the pure core was right.** The pure `survivorBenefitAnnual` correctly trusts `deceased.claimAge` as the *realized* claim age — its input contract. The bug lived entirely in the **integration seam**, the only layer that knows the stochastic timeline; it fed the pure core a **planned** value as if it were realized.

**The fix (shipped).** `realizedClaimAgeAtDeath` runs **in the seam**, resolving the deceased's planned claim age against their age at death before the survivor base is built (the expression is in [docs/architecture.md §7.7](../architecture.md)). Capping at age-at-death strips the unearned credits; the FRA floor keeps an unfiled **pre-FRA** death from picking up a spurious early-claim reduction (it lands on the full PIA — 20 CFR §404.313, POMS RS 00615.301/.690). Exact for a whole-year FRA (both shipped cohorts = 67); for a fractional-FRA cohort it floors to ⌊FRA⌋, a sub-one-year **conservative** residual. A unit arm pins every realized-vs-planned/death-age combination — died-before-FRA, died-between-FRA-and-plan, lived-past-plan, and the already-claimed-early case — and a seam arm pins the resulting integration dollar against the pre-fix value it replaced (both dollars are recorded in [docs/architecture.md §7.7](../architecture.md); the bug overstated that path by nearly $2,900/yr).

**The lasting lesson (insight 040):** a pure unit's input contract assumes its inputs are already realized; realizing a PLANNED input that a stochastic process can preempt is the **seam's** job, never the pure core's — and a discriminating test must drive the **preemption**, not just the plan-equals-outcome case. See [docs/insights/040-an-integration-seam-must-realize-a-planned-input-the-stochastic-timeline-can-preempt.md](../insights/040-an-integration-seam-must-realize-a-planned-input-the-stochastic-timeline-can-preempt.md).

---

## Scope boundaries

**In scope (the correct *computation*):** own early-reduction / delayed-credit; the Method C spousal excess (two reduction schedules, the worker-must-be-entitled gate, the excess floor); deemed-filing collapse to one claim-age per person; survivor §202 (the age-reduced lock-flat benefit, the deceased's DRC flow-through, the RIB-LIM cap).

**Deferred to P4 (the recommend-second engine), explicitly NOT here:**
- **The survivor two-stage claim *optimizer*.** Survivors are exempt from deemed filing, so an optimal widow(er) chooses *when* to switch between survivor-first→own-at-70 and own-first→survivor-later. That is an **active claim-age optimizer**, and the shipped solver still optimizes only sequencing and conversion — it reads each claim age verbatim and never varies one, so the lever would have nothing to pull it. This record ships a defensible fixed claim-timing default (§6) and hands the optimization to P4.
- **The accumulation-state PIA recompute / year-of-death AIME recomputation** (RS 00615.320 "fictitious life PIA") — a second-order effect; the entered PIA is carried as the real figure (a named, bounded simplification).
- **Divorced-spouse / child-in-care / DIB branches** — out of the married-couple front door (the worker-must-have-filed prerequisite must **not** be generalized to a divorced spouse if ever added — POMS GN 00204.035).
- **The family-maximum (150–188% of PIA)** — rarely binds for a childless 2-person couple; named, not modeled.

---

## Build status

The Social Security sub-engine is **shipped, reviewed, and pinned** — the pure-core review locked the `survivorBenefitAnnual` contract, and the holistic integration review caught and fixed the survivor-floor bug above. Per-unit build status is maintained once, in the roadmap's You-Are-Here table ([docs/roadmap.md](../roadmap.md)); the readable build narrative lives in [docs/plans/1-engine.md](../plans/1-engine.md); the load-bearing invariants it inherits live in [docs/architecture.md §7.7](../architecture.md).
