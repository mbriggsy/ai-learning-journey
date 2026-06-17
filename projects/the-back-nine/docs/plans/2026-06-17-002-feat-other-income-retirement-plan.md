---
title: "feat: R40 other income in retirement (pension · rental · alimony · annuity · other)"
type: feat
status: active
date: 2026-06-17
deepened: 2026-06-17
origin: docs/plans/2026-06-17-001-other-income-in-retirement-scoping.md
---

# feat: R40 — Other income in retirement

## Overview

The engine models exactly **two** income concepts today: `earnedIncomeReal` (which *stops at
retirement*) and Social Security. It has **no concept of ongoing non-earned income** — a pension, a
rental, an annuity, or alimony that keeps paying after work stops. For a household that has one,
that gap is the difference between **a defensibly-conservative answer and a confidently-wrong-
optimistic one**. This plan adds R40: a generic per-person income stream, entered opt-in off the
5-minute path, compiled in `intakeMap` to pre-deflated real-$ **gross + taxable** vectors (in two
death-state variants — KTD-4), and integrated into the engine at the cash-netting and ordinary-income
seams (with the SS-§86 / ACA-MAGI / IRMAA-MAGI sites riding through), with **survivor continuation**
realized at the owner's sampled death in the path loop.

**Test-drivers (Briggsy's friends):** one with rental income; one whose wife draws a **teacher's
pension**. The pension is the single most dangerous number in the app — whether it *survives* her
death (and at what %) and whether it *keeps up with inflation* is the whole widow's picture. Getting
either wrong is exactly the **calm-but-wrong-optimistic** sin the product exists to avoid — so v1
either rounds conservative or **discloses its direction** for every simplification.

> **Grounding + three review passes (2026-06-17).** Built against the current tree (HEAD `dc674dff`)
> by a 4-agent code-grounding pass, then hardened by: (1) a manual 4-lens adversarial panel
> (feasibility/coherence/adversarial/scope); (2) the official `ce:plan` deepen workflow's 4 specialist
> lenses (architecture/performance/pattern-consistency/data-integrity); (3) the mandatory `ce:plan`
> document-review handoff (coherence/feasibility/product/design/security/scope/adversarial). Round 3
> redesigned **KTD-9** (the IRMAA-override reconciliation — three agents found the first version
> mechanically unsound), corrected a **`validateParams` over-claim** (KTD-4 / the security lens),
> specified the **Unit 4 interaction states** the design lens found under-designed, and added the
> rental-cliff + rental-survivor disclosures the adversarial lens surfaced on a named driver. One
> CRITICAL finding (a claimed ACA-MAGI "wage-blind" hazard on non-taxable income) was **adversarially
> rejected** as a false alarm — see Open Questions. Do not revert where this plan corrects the scoping
> doc.

## Problem Frame

Households with a pension/rental/annuity/alimony cannot get an honest projection today — the income
isn't in the model, so the engine either overstates the required withdrawal (no income to offset the
draw) or, if a user fakes it as a lower spend, silently mis-taxes everything downstream (SS taxation,
ACA subsidies, IRMAA tiers all key off MAGI). The fix must honor the cardinal rule: the taxable
portion of a stream has to move **every** income/MAGI site *consistently and atomically*, and every
survivor/COLA/basis simplification must either round conservative or be **disclosed with its direction
named** — an opt-in optimistic simplification that isn't disclosed is still the sin. (see origin:
`docs/plans/2026-06-17-001-other-income-in-retirement-scoping.md`)

## Requirements Trace

- **R40.1** — Model a generic per-person ongoing income stream with type ∈ {pension, rental, alimony,
  annuity, other}; the type seeds defaults only (scoping §2).
- **R40.2** — Each stream carries: gross `annualRealToday`, `startAge`, optional `endAge`, a COLA mode
  ∈ {real-flat, nominal-flat, fixed-pct} (+ `colaPct`), a `taxableFraction` ∈ [0,1] (default 1), and a
  `survivorPct` ∈ [0,1] (scoping §2).
- **R40.3** — Compile each stream to pre-deflated real-$ per-year vectors; the engine is a dumb
  consumer; survivor-% is pre-applied as a second variant at compile time (KTD-4).
- **R40.4** — The taxable portion enters ordinary income such that SS-§86 provisional, ACA-MAGI, and
  IRMAA-MAGI all move **consistently in one atomic change** (scoping §4), including the
  already-receiving × working-year IRMAA reconciliation (KTD-9).
- **R40.5** — Survivor continuation is realized at the owner's **sampled death** in the path loop,
  selecting the pre-weighted survivor variant, locked at the death offset, never ramped (KTD-4).
- **R40.6** — Reduce-to-spine byte-identity: a household with no streams is byte-identical (same seed)
  to the current Trinity/Bengen spine.
- **R40.7** — Intake is opt-in off the 5-minute guided path; the **no-safe-default fields** surface on
  the guided path regardless of the collapsed advanced tier: the **survivor-% prompt for any continuing
  stream (pension/annuity/rental/other** — alimony is `survivorPct = 0` by law) and the **alimony
  post-2018 agreement-date**.
- **R40.8** — Ship the **"other"** catch-all stream alongside the four named types.
- **R40.9** — Add an **R40 requirements entry** amending the locked R1–R39 contract.
- **R40.10** — All correctness goldens are **externally derived** (DND/012); intake/restore validation
  is **finiteness-first** then range; engine-consumed figures obey the constants discipline; user-facing
  display-hint figures live in `referenceData.ts`, never `@engine/constants`.

## Scope Boundaries

- **Not a FIRE lever, and not a general income ledger.** This models the ongoing non-earned income a
  *real household actually receives*, entered once, that the survivor/tax picture depends on. The
  **identity bound:** a new type clears the bar "a real driver receives it and the answer depends on
  it" or it doesn't ship — the "other" catch-all inherits that fence, it is not an invitation to model
  every yield (dividends/1099/crypto are out unless a driver has one). This keeps R40 inside the
  north-star (honest answer for a couple), not toward a comprehensive planner.
- **No live price/market fetch** — CSP `connect-src 'self'` forbids it; everything is user-entered.
- **Survivor-specific term/end gate is OUT (v1 forward landmine).** KTD-4's two-variant linear
  pre-weighting holds **because v1 streams share one end gate across both variants**. A stream whose
  *survivor* benefit has a different term than the *owner* benefit (period-certain J&S, survivor
  terminating on remarriage) would break the elementwise `survivor = Σ streams·survivorPct` relation.

### Deferred to Separate Tasks (each with its direction NAMED)

- **Rental sale events** (depreciation recapture §1250, cap-gains-on-sale, step-up): OUT — ongoing
  income only. Direction: slightly **optimistic**; disclosed (scoping §8).
- **Net-rental real-rise → OPTIMISTIC, and it COMPOUNDS at the ACA cliff (disclosed with magnitude).**
  Gross rent tracks inflation but the fixed-nominal depreciation shield erodes, so *taxable net rent
  rises in real terms* (scoping §9). v1 holds net rent **real-flat** (and models rental `taxableFraction
  = 1` — conservative on the *fraction*, but the flat *trajectory* understates late-horizon MAGI). The
  danger is **not a smooth slope error**: the omitted real-rent-rise is exactly the dollars that can
  push a pre-65 household *over the 400% FPL subsidy cliff* (a discontinuity), where the miss is the
  **entire unsubsidized premium for the bridge years**, not a few points of subsidy. v1 discloses *this
  magnitude* in the rental copy (not "slightly optimistic") + a Unit 3 cliff-compound fixture; the
  upgrade (model a modest real-rise; needs the BLS rent-CAGR figure verified first) is noted, not built.
- **Annuity/pension basis-recovery dynamics → OPTIMISTIC, opt-in, disclosed.** The true exclusion-ratio
  tax-free portion shrinks then **stops when basis is recovered** (then 100% taxable). v1 uses a
  **constant** `taxableFraction`, modeling the exclusion as **never exhausting** → understates late-life
  MAGI → optimistic. The fully-taxable **default** is conservative; an opt-in user who enters an
  exclusion fraction accepts an **optimistic** simplification — disclosed in copy.
- **Alimony payer-death termination → OPTIMISTIC, disclosed (Briggsy: disclose for v1).** Alimony ends
  at the recipient's death (`survivorPct = 0` at the owner=recipient's death) **AND at the payer's
  death** — the payer has no presence/sampled death in the household model. v1 pays alimony for the
  recipient's full modeled life, **overstating safety if the payer dies first.** Disclosed, not modeled.
- **Compounding-only COLA → the optimistic side of the fork, disclosed.** Simple (non-compounding) COLA
  erodes faster in real terms; v1 models **compounding** (the common case, but the optimistic side).
- **NIIT (3.8% > $250k MFJ MAGI), state-level alimony decoupling, annuity LIFO**: OUT, disclosed.
- **U8 persistence of `incomeStreams`.** R40 adds the field to `ScenarioV3`; the codec v3 arm is
  **U8's**. The shape rides existing `ScenarioV3` (no schemaVersion bump, no v3→v4 migration) — **but
  U8 inherits a real validation contract, not "free" persistence** (KTD-3 + the U8 obligation in Risks).

## Context & Research

### Relevant Code and Patterns

**The mirror pattern (contributions) — entity → compile → params → engine → validate:**
- Leaf vector type: `PersonContributionStreams` (`src/shared/model.ts:238-251`); wrapper
  `AccumulationParams` (`:259-262`); on `OverlayParams.accumulation` (`:359-366`).
- Persisted list entity: `EnteredAccount` (`src/shared/model.ts:793-828`) on `ScenarioV3.enteredAccounts`
  (`:884-908`), `SCENARIO_V3_FIELDS` (`:913-928`) + the exhaustiveness tie (`:930-934`); the draft tie
  is `memoryModel.ts:111-116`, init `memoryModel.ts:187-203`. The **discriminated-union precedent** is
  `TickerClassification` (`model.ts:836-843`, `kind: 'simple' | 'exact'`); the **fidelity-over-
  duplication law** is `model.ts:743-752`; vocab `as const` precedent: `ACCOUNT_KINDS` (`:780-789`),
  `TICKER_CLASSIFICATION_CHOICES`, `SPEND_ENTRY_PERIODS`.
- Compile: `contributionStreamsFor` (`src/intake/intakeMap.ts:338-405`) — the `nonZero` vector-drop
  helper lives there. Inflation point estimate: `productionMarket.value.inflation.mean` (`= 0.03`,
  `reference/methodology.ts:60`), imported `intakeMap.ts:45`. **`escalateQuote` (`:243-263`) is the ACA
  age-rating escalator — NOT a structural template for the COLA decay** (KTD-2).
- Per-path assembly: `contributionsForYear` (`src/engine/simulate.ts:295-341`, which allocates **four
  per-person arrays per call** `:308-311`); gated call `:937-941`; presence-keyed tax-input spread to
  mirror `:976`. The zero-alloc sibling is `cashTermsForYear` (one small `{net, ss}` literal, no
  per-call alloc, `:261`).
- The tax boundary: `taxOverlay.ts:324-360` (`YearContribution`); `GrossUpContext` build `:1513-1523`
  (`solveGrossWithdrawal` receives only `GrossUpContext`, not full `TaxYearInputs`); `nonSSordinary`
  `:939`; the §86 call `:943`; the single `MagiComponents` producer `:952`; finiteness backstop
  `:1168-1173`; §6 ACA empty-overlap throw `:1550-1554`. **IRMAA channel:** the working-year override
  `workingYearIrmaaMagiByPerson` (required on the date route, `intakeMap.ts:111-116`; built per-person
  in `healthcareStreams.ts:140-173`; **recorded ADDITIVELY** at `taxOverlay.ts:1598`:
  `irmaaMagiHistory[t] = (irmaaMagiOverride[t] ?? 0) + irmaaMagi(components)`; substituted/required for
  §7-clamped years `:1451-1457`). `irmaaMagi(c) = nonSSordinary + realizedGain + ssBenefitTaxable`
  (`healthOverlay.ts:104-106`). The current override copy is `copy.ts:91-93` ("whole income… not just
  what work pays"). The §7 clamp: `net = accumulating && livingWorker ? 0` (`simulate.ts:259-260`); the
  per-path `bridgeYearMask` marks clamped working years (`simulate.ts:925-930`). Gross-up contraction
  proof (`k_sup ≈ 0.74`, ~113-pass bound to `ENGINE_MAX_DOLLAR`): `taxOverlay.ts:395-423` +
  `simulate.ts:354-356`.
- R19 gate: `validateParams` accumulation block `simulate.ts:564-621` (it validates the **compiled
  vectors**, not entity scalars — `:576` names the field, never the value); `finiteNonNeg` `:380`;
  `ENGINE_MAX_DOLLAR = 1e12` `:364`. `cashTermsForYear` callers: the path loop `:904` AND the
  test-export `netWithdrawalForYear` `:281` (+ ~12 `simulate.test.ts` sites).
- Date-sweep: `truncateStreams` (`dateSearch.ts:106-120`, contributions only); `buildCandidateParams`
  (`:153-219`); the `...overlayBase` pass-through (`:203-213`, does not list `income`).
- `survivorSpendingRatio` (`0.75`, applied on **first death of either spouse**): `simulate.ts:178-180`.
  Bracket-fill / conversion sizing (P3/P4, not built): `sequencing.ts ~:124-154`. The restore path
  bypasses the intake form: `session.ts:409,475` (`model = decoded.scenario`); the codec casts
  `parsed as unknown as ScenarioV3` (`scenarioCodec.ts:186,190`); `needVocab` (`:75-80`) is the SHAPE
  gate.

**The intake-entity pattern (`50742ce1`):** `ScenarioDraft.enteredAccounts` (`memoryModel.ts:87-105`,
mutated via `update`); `AccountEntry.tsx` (atomic-commit `FormState`, conditional fields `:170-226`,
`save()` early-return on incomplete `:87`); `AllocationEntry.tsx`; `AccountsStep` (`questions.tsx:523-616`,
the row summary `slots.accountSummary` = 3 facts `:558-565`, two-tap remove `:577-593`, empty-state
`:552-553`); the **existing** `incomeStep` (earned income, `:207`) and `workIncomeStep` (`:447`) —
the **naming-collision** hazard; `missingRequiredFacts` (`intakeMap.ts:90-169`, per-entity pushes
`:130-141`); `buildParams` null-coupling (`:509-510`); `AnswerStrip.tsx` (`:35-59`, the "still needed"
surface + the layout-shift discipline insight 035); `SanityRule` (`sanity.ts:146-155`), the
`contribution-over-ceiling` template (`:259-280`); `FieldError`; the copy fence (`src/ui/copy.ts`,
`eslint.config.js:84-103`, `copyFence.test.ts`). The codec's per-entity validators
(`checkAccounts`/`checkContributionStreams`, `scenarioCodec.ts:107-137`; the `checkPersonV3` forward
note `:94`) are the precedent U8 extends.

### Institutional Learnings

- **011 / 023 / 025** — externally-derived fixtures (DND/012); a panel validates arithmetic not rule
  selection (walk each fixture through its fork, name the pinned boundary); derive the mechanism exists
  before building a fixture.
- **029** — drive a **nonzero, owner-distinct, pairwise-distinct** vector + a swap-mutant; an equality
  on a structurally-zero surface discriminates nothing.
- **024** — keep the per-entity shape through the wire (here: streams collapse per person **only after**
  survivor-% is pre-applied; all of a person's streams share that person's death gate).
- **013 / 012 / 014** — a taxable stream moves ACA-MAGI across the 133% kink / **400% cliff (a
  discontinuity)** + IRMAA steps; test the **crossing year** when the survivor cliff relocates
  ($84,600→$62,600).
- **040 / 039** — the seam realizes a planned input a stochastic timeline can preempt; range-guard at
  the boundary; the discriminating survivor test drives **death-before-stream-start**.
- **006 / 007** — a new income channel feeds the gross-up; income is an additive constant (shifts the
  operating point, not the contraction factor `k`); the convergence re-probe doubles as the perf check.
- **008 / 010 / 028** — finiteness-FIRST (a NaN passes every relational/`??` guard); declare
  computable-domain bounds (`ENGINE_MAX_DOLLAR`).
- **027 / 020** — match a guard's trigger to the hazard-creator's domain (income pays *past* retirement,
  death-gated not retire-gated; it does NOT inherit the §6 ACA empty-overlap guard); gate on the
  invariant, not the first consumer.
- **035 / 036 / 037** — reserve a live region's box (a surface that appears on first-add shifts tap
  targets); force-confirm gates read the live store; an orchestrator finding is a hypothesis.
- **018** — an additive amendment has a **zero-removals** invariant; grep the superseded premise.
- **DND-009** — persisted "never-ends" sentinels must never be `Infinity`/`NaN`/numeric-magic
  (`JSON.stringify(Infinity) === "null"`). R40: `endAge` absent ≡ lifetime, by presence/absence.

### External References

None. Tax facts are locked by the scoping doc's verified research run (45 IRS-primary-confirmed claims;
provenance corrections in scoping §9). No re-research.

## Key Technical Decisions

- **KTD-1 (the seam count; seam 2 is a coordinated 3-touch).** `MagiComponents` has **one producer**
  (`taxOverlay.ts:952`) fed by **one** `nonSSordinary` (`:939`); seams 3/4/5 read it. The taxable vector
  is added at **seam 2 only** (editing seam 3 separately double-counts the §86 base). The explicit edits
  are two seams (seam 1 cash netting, seam 2 ordinary income); seam 2 is three coordinated touches: a
  new `TaxInputs.income` field, threading the per-year taxable into `GrossUpContext` (`:1513-1523`), and
  the `+ taxable` at `:939`. A test proves the §86 provisional moved by the single (non-doubled) amount,
  `realizedGain ≠ 0`.
- **KTD-2 (the deflation math is NET-NEW).** real-flat → emit the flat real value; nominal-flat /
  fixed-pct → `real[t] = annualRealToday · (1+colaPct)^t / (1+inflation)^t` using the deterministic
  inflation point estimate. The per-year vector builder shares **no structure** with `escalateQuote`
  (write it fresh; borrow only `nonZero`). Correctness golden-gated (KTD-5). *Viz corollary:* a
  nominal-flat stream is a deterministic real curve (zero variance) — a **deterministic floor** in the
  confidence band, not a sampled spread (flag for U6/D2).
- **KTD-3 (two shapes — persisted entity vs compiled leaf).** The **persisted** `IncomeStream` entity is
  a new list `incomeStreams` on `ScenarioV3` + `SCENARIO_V3_FIELDS` + the ties + init `[]`. The
  **compiled** leaf `PersonIncomeStream` (the two death-state variants) wraps in `IncomeParams` on
  `OverlayParams.income` and is **never persisted** (fidelity-over-duplication). R40 does not touch
  `scenarioCodec.ts`; U8 owns the v3 arm **and a real validation contract** (Risks).
- **KTD-4 (two pre-weighted variants, per-OWNER death-gated, zero-alloc select).** Pre-compute **two
  per-person variants at compile time** — `{grossFull, taxableFull} = Σ streams` and `{grossSurvivor,
  taxableSurvivor} = Σ streams·survivorPct` (each with COLA/deflation + start/end gating baked in;
  survivor derived **per-stream**, not as a scalar reweight of FULL). The death-dependent select is the
  only path-loop work, in a helper `ongoingIncomeForYear` that **mirrors the death-gate STRUCTURE of
  `contributionsForYear` — NOT its allocation profile**: it returns **two household scalars**,
  accumulating in the people loop with **no `new Array`, no wrapper object, no per-year
  `offsets.some()`/`.find()`** (integer comparisons against the locked `deathOffsets` only). Per **owner**:
  `select = (t < deathOffsets[ownerIdx]) ? FULL : (survivorAlive ? SURVIVOR : 0)`; `survivorAlive =
  otherIdx exists && t < deathOffsets[otherIdx]`; single-person ⇒ post-death branch `0`. Locked at the
  death offset, never ramped; death gate only (never `t < o.retire`). Death-before-start is free (the
  SURVIVOR variant is 0 until the start year, then `survivorPct·value`). **Each person's bundle is
  independently gated on that person's own death** — a single household-level death gate is the bug a
  swap-mutant must catch (Unit 3). *(`survivorPct`/`taxableFraction` are scalars on the ENTITY, applied
  at compile and multiplied away — they do NOT exist on the leaf, so the engine cannot range-check them;
  that range gate lives at the entity boundary — KTD-3 / Unit 4 sanity / the restore codec.)*
- **KTD-5 (golden-gated correctness).** Every numeric claim is pinned by a hand-derived externally-
  computed golden, walked through its conditional fork with the pinned boundary named.
- **KTD-6 (taxableFraction selection; the tax-treatment inputs are a DISCRIMINATED UNION keyed on
  type).** Model the tax-treatment fields as a discriminated union on `type` (mirror
  `TickerClassification`), so a pension entity cannot carry annuity-exclusion fields and an alimony
  entity cannot carry a contradictory direct `taxableFraction` — the contradiction is **unrepresentable
  in authored code**. (At restore it is representable — `JSON.parse + as` erases the union — so the codec
  must re-validate the full arm; Risks.) The fork inputs are the source of truth; `compileIncomeStreams`
  derives the effective fraction (post-2018 alimony → 0; pre-2019 → 1; non-qual annuity → the entered
  exclusion; qualified/pension/rental/other → the entered/default fraction). No redundant derived
  fraction is persisted.
- **KTD-7 (survivor income-% and survivor spending-ratio modeled INDEPENDENTLY — confirmed).**
  `survivorSpendingRatio` (0.75, a needs figure, fires on the first death of *either* spouse) and
  `survivorPct` (a receipts figure, keyed to the *owner's* death) model different things and compose
  correctly at seam 1. The compound-widow test + the cross-owner-death-order test (Unit 3) prove no
  double-application and that the per-owner gating holds on the asymmetric death order.
- **KTD-8 (date-sweep + already-receiving).** (a) Income is **Y-invariant** → it passes through
  `...overlayBase` un-truncated (do **not** add it to `truncateStreams`); *perf corollary:*
  `compileIncomeStreams` runs **once in `buildParams`**, never in `buildCandidateParams` (the 4 compiled
  per-person vectors pass by reference). (b) `startAge ≤ currentAge` ⇒ **already-receiving, CLAMP to
  `t=0`, never reject** — `compileIncomeStreams` clamps start to `max(0, startAge − currentAge)`;
  `validateParams`/sanity do not reject it. **The anchor:** for an already-receiving stream
  `annualRealToday` is the real value **AT sim-year 0**; the decay exponent is the clamped `t`, **never
  the stream's elapsed age** (else a plausible "honor the real age" impl over-deflates a real driver's
  pension). A golden pins `gross[0] === annualRealToday`.
- **KTD-9 (already-receiving × working-year IRMAA — STRUCTURAL DECOUPLE, not a copy control).** The
  hazard: an already-receiving stream's taxable in a §7-clamped working year collides with the additive
  working-year override (`override[t] + irmaaMagi(components)`), and seam-2's unconditional add would
  also mint a phantom portfolio withdrawal to pay tax the wages already cover. A copy instruction
  ("enter your MAGI inclusive of all income") is **not** a sound control — a user entering wages-only
  would, with engine-side suppression, drop the pension from IRMAA entirely (the optimistic sin). The
  decision: **decouple the two feeds structurally.** (1) Re-specify the working-year override as the
  **wages / non-modeled-MAGI component only**, and **invert the copy** to "enter your working-year income
  **excluding** anything you entered as a retirement income stream." (2) The engine **owns each modeled
  stream's IRMAA-MAGI contribution in all years** (clamped and unclamped) — so IRMAA-MAGI for a clamped
  working year is `wages-override + the stream's own taxable`, each counted exactly once, with no
  dependence on user comprehension. (3) In a **clamped working year the stream's taxable feeds IRMAA-MAGI
  but NOT the gross-up netting** — no phantom withdrawal (the wages fund its tax outside the portfolio).
  Tests pin: IRMAA = wages + pension counted once on the wages-only-entry path; and no portfolio
  withdrawal is minted for an already-receiving pension's tax in a clamped working year.

## Open Questions

### Resolved During Planning

- ATC #1/#2/#3 (keep advanced tier; ship "other"; add R40 entry) — YES. (Note: "other"/alimony/annuity
  are shipped because the engine supports them, but their guided-path questions + optimistic disclosures
  are **type-gated** so a rental/pension-only user never pays for them — see Unit 4. The "it's free"
  rationale is an engine truth, not a product one; the identity fence in Scope Boundaries is the bound.)
- The seam count (KTD-1), deflation math (KTD-2), persisted-vs-compiled shapes (KTD-3 + the
  never-persisted-leaf invariant), the discriminated union (KTD-6), survivor architecture + the
  entity-boundary range gate (KTD-4), survivor/spending independence (KTD-7), the date-sweep +
  already-receiving anchor (KTD-8), the IRMAA structural decouple (KTD-9) — all resolved by the
  grounding + three review passes.
- **Alimony payer-death** — disclose for v1 (no payer in the model).
- **Sequencing** — keep the build order; R40's Unit 4 intake is session-only until U8 (the next build),
  consistent with the accounts intake; Unit 4 adds a "nothing's saved yet" affordance (option a).
- **Net-rental cliff-compound** — disclose the cliff *magnitude* + a fixture (option A); the modest-
  real-rise upgrade (option B) is noted, deferred behind BLS rent-CAGR verification.
- **Rental survivor-%** — broaden the no-safe-default survivor-% surfacing to pension/annuity/rental/
  other (alimony stays 0 by law) — survivor continuation is no-safe-default for any continuing stream.
- **The CRITICAL "non-taxable income is ACA-MAGI wage-blind" finding — REJECTED as a false alarm.** R40
  non-taxable income (post-2018 alimony, annuity return-of-basis) genuinely is not federal MAGI and
  genuinely reduces withdrawal need — a lower MAGI → higher subsidy is the *true* answer (real ACA
  planning leans on non-taxable income to stay under the cliff). The taxable portion *does* hit MAGI via
  seam 2; no income source "should raise MAGI but doesn't." Value retained: the Unit 3 "non-taxable moves
  none of the MAGIs" test also asserts the ACA subsidy correctly **rises**.

### Deferred to Implementation

- **fixed-pct COLA compounding convention** — v1 models compounding (disclosed optimistic side, golden-
  pinned); simple-COLA deferred.
- **The two-scalar routing** — `cashTermsForYear` returns `{ net, ss, incomeTaxable }` (one helper call;
  gross consumed internally for netting, taxable surfaced to the loop and pushed into a per-year
  `incomeTaxableYears` array spread into `taxInputs`). The return-shape change ripples to
  `netWithdrawalForYear` + ~12 `simulate.test.ts` sites — name it in Unit 3, settle the exact shape at
  wire time without perturbing the two-pass `allocateWithdrawal`.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation
> specification. The implementing agent should treat it as context, not code to reproduce.*

```
INTAKE (death-INDEPENDENT, compiled ONCE in buildParams)   ENGINE PATH LOOP (death-DEPENDENT)
────────────────────────────────────────────────────────   ─────────────────────────────────
IncomeStream[] (entity; discriminated-union tax inputs;     for each path: sample deathOffsets[]
  entity-boundary range gate on survivorPct/taxFrac)          for each year t:
  │ compileIncomeStreams (per stream):                        ongoingIncomeForYear(t,…) → 2 scalars:
  │  • real[t]=today·(1+cola)^t/(1+infl)^t   ← KTD-2           per OWNER:
  │  • start/end gating; clamp start≥0;                         t<death[owner]      → FULL
  │    anchor today's value at t=0           ← KTD-8b          else survivorAlive? → SURVIVOR (zero-
  │  • taxableFraction select (union)        ← KTD-6          else                → 0           alloc)
  │  • survivorPct pre-weight (per-stream)   ← KTD-4          Σ householdGross, householdTaxable
  ▼   sum per person → TWO variants                             │                    │
PersonIncomeStream {grossFull,taxableFull,            (never    ▼                    ▼
   grossSurvivor,taxableSurvivor}                   persisted)  seam 1: cashTermsForYear   seam 2: TaxInputs.income
  ▼ assemble incomeByPerson; presence-key                    returns {net,ss,incomeTaxable}  → nonSSordinary :939
absent ⇒ no key ⇒ byte-identical spine ✓                     net = max(0, spend − earned       │ flows through
validateParams: VECTOR finiteness + ≤MAX only                  − INCOME − ss)                   ▼
(NOT survivorPct range — that's entity-side; NO §6 ACA guard)   clamped working yr:    seam 3 §86 / 4 ACA / 5 IRMAA
                                                               income→IRMAA-MAGI but   (NO separate edit — KTD-1)
                                                               NOT gross-up; override = wages-only (KTD-9)
```

## Implementation Units

- [ ] **Unit 1: Income-stream types — discriminated-union entity, two-variant leaf, draft + scenario shape**

**Goal:** Land the type plumbing so every later unit compiles against a settled, contradiction-proof
shape. No behavior.

**Requirements:** R40.1, R40.2, R40.3, R40.6 (foundation — *byte-identity proof is Unit 3*), KTD-3,
KTD-4, KTD-6, KTD-8b.

**Dependencies:** None.

**Files:**
- Modify: `src/shared/model.ts` (the `IncomeStream` entity with a **discriminated-union** tax-treatment
  shape keyed on `type`; single-sourced `INCOME_TYPES`/`COLA_MODES` `as const` vocab arrays the codec
  can import; the two-variant `PersonIncomeStream` leaf; `IncomeParams`; `OverlayParams.income?`;
  `incomeStreams` on `ScenarioV3` + `SCENARIO_V3_FIELDS` + the exhaustiveness tie).
- Modify: `src/store/memoryModel.ts` (the draft↔V3 tie; init `[]`; **always present, never `undefined`**
  — a restored v3 blob missing the field defaults to `[]` under the tolerant-reader contract).
- Test: `src/shared/__tests__/model.income-shape.test.ts`.

**Approach:**
- `IncomeStream`: `type ∈ INCOME_TYPES`, `ownerIndex: 0|1`, `annualRealToday`, `startAge`, `endAge?`
  (**absent ≡ lifetime — never a numeric/`Infinity` sentinel**), `colaMode ∈ COLA_MODES`, `colaPct?`,
  `survivorPct`, and a **discriminated-union tax-treatment** field keyed on `type`.
- `PersonIncomeStream` (compiled leaf): `{ grossFull?, taxableFull?, grossSurvivor?, taxableSurvivor? }`
  — optional per-year `readonly number[]`, auxiliary.
- `IncomeParams = { readonly incomeByPerson: readonly PersonIncomeStream[] }`, index-aligned to people.
  `OverlayParams.income?` optional — presence is the reduce-to-spine key.

**Patterns to follow:** `TickerClassification` (the discriminated union); the vocab `as const` precedent;
`PersonContributionStreams`/`AccumulationParams`; the `SCENARIO_V3_FIELDS` tie; the draft tie.

**Test scenarios:**
- Happy path: a `ScenarioDraft` initializes with `incomeStreams: []`.
- Edge (type-level): adding `incomeStreams` to only one side of the ties → a type error; a
  pension-with-annuity-fields entity **fails to type-check** (unrepresentable contradiction).
- `Test expectation:` behavior tests deferred to Units 2–4.

**Verification:** `pnpm typecheck` passes; the union rejects contradictory entities at compile; the ties
compile; the spine is untouched.

---

- [ ] **Unit 2: `intakeMap` compilation — the two variants, the net-new COLA math, the goldens**

**Goal:** A pure per-stream compile producing the two death-state variants, with the net-new
COLA/deflation + taxableFraction-selection math proven by hand-derived goldens. Not wired to the overlay.

**Requirements:** R40.3, R40.10, KTD-2, KTD-4, KTD-5, KTD-6, KTD-8.

**Dependencies:** Unit 1.

**Files:**
- Modify: `src/intake/intakeMap.ts` (`compileIncomeStreams(d, ownerIndex, horizonYears)` → one person's
  `PersonIncomeStream`; the per-type default table).
- Create (only if a default COLA-rate hint is shown): `src/intake/referenceData.ts` entry.
- Test: `src/intake/__tests__/incomeCompile.test.ts`.

**Approach:**
- Per stream, per year `t`: `gross[t]` per KTD-2, gated by `startAge`/`endAge`, **start clamped to
  `max(0, startAge − currentAge)`** with `annualRealToday` anchored at `t=0` (KTD-8b); `taxable[t] =
  gross[t] · effectiveFraction` (KTD-6). Sum into FULL (`Σ gross`, `Σ taxable`) and SURVIVOR
  (`Σ gross·survivorPct`, `Σ taxable·survivorPct`) — **per-stream**. Drop all-zero vectors via `nonZero`.
- The per-year builder is **net-new** — do not structure it on `escalateQuote`.
- Unit boundary: Unit 2 delivers only the per-person compile + goldens; the assembly loop + overlay
  spread are Unit 3's.

**Patterns to follow:** the `nonZero` drop from `contributionStreamsFor`; `escalateQuote` only as the
exported-per-year-vector naming precedent.

**Test scenarios:**
- Golden (DND/012): real-flat → flat; nominal-flat → geometric real-decay (e.g. $45k at 3% ≈ halves by
  ~year 23); fixed-pct → net-real-rate decay — hand-derived.
- **Already-receiving anchor golden (KTD-8b):** a nominal-flat stream with `startAge ≤ currentAge` →
  `gross[0] === annualRealToday` and `gross[1] === annualRealToday/(1+infl)` (anchored to the clamp, not
  the elapsed age).
- Survivor variant (**per-stream**): two streams owned by one person, survivorPct 0.5 and 0 →
  `grossSurvivor = 0.5·streamA + 0·streamB` (the golden asserts `Σ streams·survivorPct`, not
  `0.5·grossFull`).
- Fork: post-2018 alimony → `taxable=0`; pre-2019 → `taxable=gross`; qualified annuity → 1; non-qual →
  entered exclusion. Name each pinned boundary.
- Edge: `endAge` → 0 after end; `startAge > currentAge` → leading zeros; absent `endAge` → full bounded
  horizon (no infinite array).
- Error path: `fixed-pct` with `colaPct` absent → form-level required (Unit 4), document the precondition
  (and the restore-path guard is the codec's — Risks).

**Verification:** the deflation/anchor/per-stream-survivor goldens pass with externally-derived values.

---

- [ ] **Unit 3: The atomic engine integration — wire, validate, zero-alloc select, seam 1 + seam 2, the IRMAA decouple, reduce-to-spine**

**Goal:** Make the engine consume income atomically: assemble + presence-key, gate vectors in
`validateParams`, zero-alloc death-state select, net the gross, add the taxable to ordinary income
(seams 3/4/5 flow through), implement the KTD-9 structural decouple, prove byte-identity + MAGI
atomicity.

**Requirements:** R40.4, R40.5, R40.6, R40.10, KTD-1, KTD-4, KTD-7, KTD-8, KTD-9.

**Dependencies:** Unit 1, Unit 2.

**Files:**
- Modify: `src/intake/intakeMap.ts` (the per-household assembly loop, **once in `buildParams`**; the
  presence-keyed spread; re-specify `workingYearIrmaaMagiByPerson` as the **wages/non-modeled** component
  per KTD-9).
- Modify: `src/engine/simulate.ts` (the **zero-alloc** `ongoingIncomeForYear` select; `cashTermsForYear`
  returns `{ net, ss, incomeTaxable }` — **updating both callers: the path loop `:904` AND
  `netWithdrawalForYear` `:281` + the ~12 test sites**; push `incomeTaxableYears` and spread into
  `taxInputs`; the `validateParams` income block — **VECTOR finiteness + `≤ ENGINE_MAX_DOLLAR` only, NOT
  survivorPct/taxableFraction range** — those are entity-side; income passes through `...overlayBase`
  un-truncated).
- Modify: `src/engine/taxOverlay.ts` (the `TaxInputs.income` field; thread per-year taxable into
  `GrossUpContext`; `+ taxable` at `nonSSordinary` `:939` — seam 2 only; **KTD-9: in a clamped working
  year (`bridgeYearMask[t]`), the income taxable feeds IRMAA-MAGI but is excluded from the gross-up's
  `nonSSordinary`** (no phantom withdrawal); update the `MagiComponents` muni-landmine comment to record
  R40 as the first realized "single seam-2 add → all three sites" instance). **Do NOT copy the §6 ACA
  empty-overlap guard.**
- Test: `…incomeStreams.reduceToSpine.test.ts`, `…magi.test.ts`, `…survivor.test.ts`,
  `…dateSearch.test.ts`, `…irmaa.test.ts`, `…validateParams.test.ts`.

**Approach:**
- `ongoingIncomeForYear` mirrors the death-gate **structure** of `contributionsForYear` (not its 4-array
  alloc): two household scalars, integer-comparison death branch, per-owner gating. A **sibling, not a
  refactor-share** (gate domains differ, insight 027). Fold into the deferred hot-loop pass alongside the
  two survivor-recompute sites.
- Seam 1: `net = max(0, spending − earned − ongoingIncomeGross − ss)`. Do not collapse the double
  `allocateWithdrawal`.
- Seam 2: the 3-touch, once; seams 3/4/5 inherit it.
- KTD-9: clamped working year → income taxable into IRMAA-MAGI (so `wages-override + pension`, once),
  excluded from the gross-up (no phantom withdrawal).
- Reduce-to-spine: presence-keyed spread.
- `validateParams` income block: length-tie; finiteness-first per entry; per-year assembled-sum
  finiteness; `≤ ENGINE_MAX_DOLLAR`; **`startAge < currentAge` allowed**. The `survivorPct ∈ [0,1]` /
  `taxableFraction ∈ [0,1]` range is the **entity** boundary's job (Unit 4 sanity on intake; the codec
  on restore), structurally unreachable from the compiled leaf.

**Execution note:** Start with the reduce-to-spine byte-identity test (absent income) as a
characterization pin before touching the seams.

**Patterns to follow:** `contributionsForYear` + the gated call + the conditional spread; `cashTermsForYear`
(the return-shape grows by one field); the §202 survivor branch; the `validateParams` accumulation block;
the additive IRMAA recording at `taxOverlay.ts:1598`.

**Test scenarios:**
- **Reduce-to-spine (insight 029):** absent ⇒ byte-identical; a nonzero, owner-distinct,
  pairwise-distinct two-person income ⇒ the terminal moves + a swap-mutant fails.
- **MAGI atomicity (KTD-1):** a fully-taxable stream lifts SS-taxable + `acaMagi` + `irmaaMagi`
  consistently; the §86 provisional rose **once** (`realizedGain ≠ 0`). **A non-taxable stream (post-2018
  alimony) nets the draw but moves none of the MAGIs — AND the ACA subsidy correctly RISES** (the A1
  confirmation).
- **IRMAA decouple (KTD-9):** an already-receiving pension + a working spouse + a Medicare lookback year
  with a **wages-only** working-year override → IRMAA-MAGI = `wages + pension`, counted once; **no
  portfolio withdrawal is minted** for the pension's tax in the clamped working year.
- **Survivor (KTD-4, insight 040):** owner dies — `survivorPct > 0` continues; `=0` (alimony) stops;
  deferred-pension owner dies **before start** → survivor benefit **from the start year**; **both-dead ⇒
  $0**; single-person ⇒ 0.
- **Cross-owner death order (KTD-7):** **two streams, one owned by each spouse, the non-owner-of-stream-X
  spouse dies first** → the deceased's stream drops to its `survivorPct`, the survivor's own stream stays
  FULL, the 0.75 step-down fired **once**, and a swap-mutant that gates both streams on a single
  household death offset **FAILS**.
- **The compound-widow path (KTD-7):** owner dies into a pre-65 ACA bridge year, high `survivorPct`, the
  0.75 step-down fires — survival is defensible; the survivor-cliff relocation + the income MAGI compose
  without double-application.
- **ACA boundary inside the bridge (insight 014):** a stream `startAge`/`endAge` inside a pre-65 bridge
  year flips PTC on the transition year. **Rental cliff-compound:** a rental household in a pre-65 bridge
  where the (omitted) real-rent-rise would cross the 400% cliff → assert the disclosed direction holds.
- **Date-search invariance (KTD-8a):** same household, two candidate dates, fixed pension `startAge` →
  lands on the same owner-age / calendar year in both (not shifted, not truncated, not recompiled).
- **validateParams:** `NaN`/`Infinity` rejected finiteness-first; vector length ≠ people rejected;
  per-year sum over `ENGINE_MAX_DOLLAR` rejected; **`startAge < currentAge` ACCEPTED**. (Entity-scalar
  range is tested at Unit 4 sanity, not here.)
- **Gross-up re-probe (insights 006/007):** a large fully-taxable stream + a small net draw (incl. the
  bracket-fill variant) converges within `GROSS_UP_MAX_PASSES` (doubles as the perf bound check).

**Verification:** all six test files green; `pnpm test` green; the spine golden cases byte-identical;
`pnpm typecheck` + `pnpm lint` pass.

---

- [ ] **Unit 4: Intake UX — the opt-in expander, the income row form, the surfaced fields, the interaction states, sanity, copy**

**Goal:** Let a user add income streams off the 5-minute guided path, with the interaction states fully
specified (not by analogy to a precedent that lacks them), sanity-gated, copy-fenced, with the
optimistic-direction disclosures and a "not saved yet" affordance.

**Requirements:** R40.7, R40.8, R40.1, R40.2, R40.10, KTD-6, KTD-8b, KTD-9.

**Dependencies:** Unit 1, Unit 2, Unit 3.

**Files:**
- Create: `src/intake/OtherIncomeEntry.tsx` (the row form — **named to avoid the existing
  `incomeStep`/`workIncomeStep` earned-income collision**).
- Modify: `src/intake/questions.tsx` (an `OtherIncomeStep`/expander; the gate; the `StepDef.fields`
  derivation; the "not saved yet" affordance; section label "other income (in retirement)").
- Modify: `src/intake/intakeMap.ts` (`missingRequiredFacts` pushes for the surfaced no-safe-default
  fields).
- Modify: `src/intake/sanity.ts` (an `incomeStreamField` helper + the **entity-scalar range rules**
  `survivorPct`/`taxableFraction` ∈ [0,1]; **no `startAge < currentAge` rule**).
- Modify: `src/ui/copy.ts` (plain-language keys; `slots.incomeSummary`; the disclosure lines; the
  **inverted** KTD-9 working-MAGI instruction; the not-saved-yet line — all **amount-free** in
  violation/error strings).
- Test: `src/intake/__tests__/incomeIntake.test.ts`; extend `copyFence.test.ts`.

**Approach (interaction states — the design-lens spec):**
- **Opt-in expander** (mirror `AccountsStep`'s empty→"Add"→form flow), not auto-inserted on the guided
  path. The section label is "other income (in retirement)", distinct from the earned-income steps.
- **The no-safe-default fields are IN-FORM, required-to-save (not a deferred push).** Picking a type
  chip reveals its required field immediately, *above* the collapsed advanced tier, and the row's "Add"
  button is gated until answered (mirror `AccountEntry.save()`'s early-return): **pension/annuity/rental/
  other → the survivor-% prompt** ("what happens to it if {spouse} passes first?", default empty, never
  100%); **alimony → the post-2018 agreement-date** (flips taxability). `missingRequiredFacts` is the
  **backstop** for a restored/edited row, not the primary surface.
- **The advanced-tier rule (resolves scoping §6 vs R40.7):** required-to-be-correct fields (survivor-%,
  alimony date) are **never** in the collapsed tier — they sit in the always-visible part, revealed by
  type. The collapsed tier holds only genuinely-optional refinements (end age, explicit COLA rate,
  exclusion fraction) with safe type-seeded defaults. `colaPct` is **form-required when
  `colaMode='fixed-pct'`** (a conditional reveal within the tier).
- **"Already receiving" is an explicit toggle** that owns the start-age field's state (on → the field
  shows "receiving now", not a clamped number; off is the default). The row summary reads "receiving now"
  for that state. This is the detectable state KTD-9's wages-only override copy depends on.
- **Row summary (`slots.incomeSummary`)** surfaces the load-bearing facts in **plain language** — type ·
  owner · amount · (start/"receiving now") · **COLA-keeps-up-or-not** · **survivor** ("keeps half if Jane
  passes" / "stops if she passes" / "no inflation increases") — never `survivorPct: 0.5` or a 3-fact
  account shortcut that hides the widow's numbers.
- **"Not saved yet" affordance:** a **reserved static slot** (not injected on first add — insight 035),
  a **neutral text + icon** treatment (explicitly NOT a red badge — color-blind-safe, `role=note` not
  `alert`), routed through `copy.ts`, present whenever the section has ≥1 stream.
- **Disclosure copy classification:** (a) **inline help** (`aria-describedby`) for entry-affecting lines
  (the alimony date threshold; the inverted working-MAGI instruction); (b) **on-demand depth** (a quiet
  "how we model this") for the optimistic-direction modeling residuals (net-rent cliff-magnitude,
  exclusion-never-exhausts, alimony payer-death) + the provenance lines (rental survivor = state property
  law, QJSA = plan-rep-or-notary, COLA norms = practitioner). These are an **N=1 cold-read tone
  deliverable** — they must read as *conservative modeling choices*, not confessions of error.
- Two-tap remove (mirror `questions.tsx:577-593`); empty-state inherits the accounts pattern.

**Patterns to follow:** `AccountsStep` (list/add/two-tap-remove/empty-state) + `AccountEntry.tsx`
(atomic commit, conditional reveal, save-gating) + `AllocationEntry.tsx` (self-validating sub-entry);
`missingRequiredFacts`; the `contribution-over-ceiling` sanity rule; the copy fence.

**Test scenarios:**
- Happy path: adding each of the five types works; the answer recomputes; two-tap remove.
- **In-form required reveal:** picking "pension" surfaces survivor-% immediately; the row cannot commit
  blank; picking "alimony" surfaces the agreement-date immediately.
- **Already-receiving toggle:** on → start-age shows "receiving now"; the row summary reads "receiving
  now"; the engine clamps to `t=0`.
- **Sanity (entity range):** `survivorPct`/`taxableFraction` outside [0,1] fires a calm inline violation
  gating advance; `colaPct` missing for `fixed-pct` blocks form save. **Violation copy is amount-free.**
- **Row summary:** a pension row's collapsed summary shows survivor + COLA in plain language.
- **Copy fence:** no inline strings in the new `.tsx`; the disclosure + not-saved-yet lines render; the
  not-saved-yet slot is reserved (no layout shift) and non-error styled.
- Edge (insight 036): the in-form required gate reads `model.getSnapshot()` (live store).

**Verification:** `pnpm dev` — adding each type works end-to-end; the in-form reveals, the
already-receiving toggle, the row summaries, the disclosures, and the reserved not-saved-yet slot all
render; `pnpm lint` green; `pnpm test` green; `pnpm verify:bundle` within budget.

---

- [ ] **Unit 5: The R40 requirements entry — the contract amendment**

**Goal:** Amend the locked R1–R39 contract with an R40 entry, additively, recording the OUT-but-disclosed
residuals (with directions), the provenance corrections, and the U8 validation obligation.

**Requirements:** R40.9.

**Dependencies:** Units 1–4 (soft — the entry reflects shipped behavior; sequence last).

**Files:**
- Modify: `docs/brainstorms/the-back-nine-requirements.md`.

**Approach:**
- Additive amendment (insight 018 — zero-removals): grep the superseded premise ("two income streams",
  "no ongoing non-earned income", "income stops at retirement"); edit only where genuinely superseded.
- The entry states: the generic per-person stream; the five types; the two-variant compilation; the
  two-explicit-edit MAGI integration (KTD-1) + the IRMAA structural decouple (KTD-9); survivor
  continuation at death (KTD-4); the OUT list **with directions named** (net-rental real-flat = optimistic
  *and cliff-compounding*; basis-recovery = optimistic-opt-in; alimony payer-death = optimistic;
  compounding-COLA = optimistic side; survivor-specific end gate = forward landmine; rental sale events;
  NIIT; state decoupling; annuity LIFO); the provenance corrections; **the U8 obligation** (a
  `checkIncomeStreamV3` codec validator — see Risks).

**Patterns to follow:** the existing R1–R39 entry style.

**Test scenarios:** `Test expectation: none — documentation`. Verify the **zero-removals** invariant.

**Verification:** the R40 entry reads consistent with the north-star; no unrelated requirement removed.

## System-Wide Impact

- **Interaction graph:** the taxable enters `nonSSordinary` (seam 2) → propagates to §86 / `acaMagi` /
  `irmaaMagi` through the single producer. The gross enters `cashTermsForYear` netting (seam 1, now
  returning `incomeTaxable` too). The zero-alloc per-owner select runs in the path loop.
- **Forward landmines (two).** (1) **Bracket-fill / Roth-conversion sizing** — income's `taxable[t]`
  consumes bracket-fill headroom; P3/P4 must net it before sizing conversions or it over-converts. (2)
  **The working-year IRMAA channel** is re-specified by KTD-9 (wages/non-modeled only) — a future feed
  must respect that the engine owns modeled streams' IRMAA contribution.
- **Performance.** (a) The select helper is **zero-alloc** (two scalars; integer-comparison death
  branch). (b) The 4 income vectors are **Y-invariant** → `compileIncomeStreams` runs **once in
  `buildParams`**. (c) **Gross-up is a non-issue:** income's taxable is an additive constant — it does
  not raise `k` (`k_sup ≈ 0.74`) and stays inside `ENGINE_MAX_DOLLAR` where the ~113-pass bound is
  proven; the re-probe doubles as the perf check. (d) The death-state branch joins the deferred hot-loop
  pass alongside the two survivor-recompute sites.
- **Validation boundary (security-lens correction).** The engine `validateParams` validates the
  **compiled vectors** (finiteness + `≤ ENGINE_MAX_DOLLAR`); the **entity scalar ranges** (`survivorPct
  ∈ [0,1]`, `taxableFraction ∈ [0,1]`) are *structurally unreachable* from the multiplied-away leaf, so
  they live ONLY at the entity boundary: **Unit 4 sanity on the intake path**, and **the U8
  `checkIncomeStreamV3` codec validator on the restore path** (a restored blob bypasses the form and
  `validateParams` can't see the scalars — so the codec arm is **load-bearing, not redundant**).
- **Error propagation:** intake — `missingRequiredFacts` stops a half-entered stream; sanity range-gates
  the entity scalars; engine `validateParams` finiteness-first on the vectors. Restore — the codec is the
  sole semantic gate. All violation/rejection copy **names the field, not the value**.
- **State lifecycle:** `incomeStreams` joins `ScenarioV3` now but is **not** persisted until U8 — the
  income intake (like accounts) is **session-only**; Unit 4 carries a "not saved yet" affordance. No
  IndexedDB write is added by R40. (No net-new at-rest or network exposure — income never leaves the
  device; CSP `connect-src 'self'`.)
- **API surface parity:** the select helper, `validateParams` block, and tax backstop mirror the
  contribution-stream guards (insight 020). `cashTermsForYear` has **two callers** (the path loop +
  `netWithdrawalForYear`) — the return-shape change updates both + the test sites.
- **Unchanged invariants:** single shared market draw / CRN; reduce-to-spine byte-identity; the double
  `allocateWithdrawal`; `truncateStreams` (income NOT added); the `PersonContributionStreams` path;
  `checkPerson`/the frozen legacy shape; `scenarioCodec` (untouched — U8's). **`PersonIncomeStream`/
  `IncomeParams` are engine-facing derivations, NEVER persisted** (fidelity-over-duplication); only the
  `IncomeStream` entity reaches `ScenarioV3`.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| **IRMAA double/under-count** for already-receiving working-year streams (the optimistic wages-only hole) | KTD-9 **structural decouple**: override = wages/non-modeled only (copy inverted); the engine owns modeled streams' IRMAA contribution in all years; clamped-year income feeds IRMAA-MAGI but not the gross-up (no phantom withdrawal); tests pin "counted once" on the wages-only path + "no phantom withdrawal" |
| **Per-stream survivor-% lost** by collapsing | KTD-4: two variants; the golden derives `grossSurvivor` per-stream |
| **Cross-owner death miscredits a dead spouse's pension** (single household death gate) | KTD-7/Unit 3: per-owner gating; the cross-owner-death-order swap-mutant test |
| **Seam-3 double-count** | KTD-1: seam 2 only; the §86-moved-once test, `realizedGain ≠ 0` |
| **Engine cannot range-check `survivorPct`/`taxableFraction`** (multiplied away into the leaf) | The range gate is entity-side: Unit 4 sanity (intake) + the U8 codec (restore); Unit 3's `validateParams` checks vectors only, by design |
| **Date-sweep zeroes a retiree's pension** | KTD-8a: un-truncated pass-through, compiled once; the invariance test |
| **Already-retired pensioner false-rejected / mis-anchored** | KTD-8b: clamp to `t=0`; `annualRealToday` anchored at sim-year 0 (not elapsed age); the anchor golden |
| **Optimistic survivor floor** | KTD-4: select locked at the death offset; `survivorAlive` guards both-dead ⇒ $0 |
| **Net-rental real-flat compounds at the ACA cliff** (full unsubsidized premium, not a slope error) | Disclosed with **magnitude** in rental copy + a Unit 3 cliff-compound fixture; the modest-real-rise upgrade deferred behind BLS rent-CAGR |
| **Rental ~100% survivor as a silent optimistic default** | Survivor-% surfacing **broadened** to pension/annuity/rental/other (no-safe-default, in-form required) |
| **Undisclosed optimistic simplifications** | All re-labeled with direction in Scope/Deferred + disclosed in Unit 4 copy (as conservative choices, N=1 cold-read) + the R40 entry |
| **Hot-loop allocation regression** | KTD-4: zero-alloc two-scalar helper; integer death branch |
| **Gross-up non-convergence** | Re-probe at the SS-torpedo + bracket-fill corner — and it's a perf non-issue (additive constant, `k` unchanged) |
| **Reduce-to-spine drift** | Characterization byte-identity pin first; presence-keyed spread; don't collapse the double `allocateWithdrawal` |
| **Contradictory persisted entity** (compile-time-safe, runtime-representable) | KTD-6 union makes it unrepresentable in authored code; the U8 codec re-validates the **full discriminant arm** (each type's required fields present, contradictory absent) since `JSON.parse + as` erases the union |
| **U8 inherits an under-specified validation contract** (NOT "free") | R40 single-sources `INCOME_TYPES`/`COLA_MODES` `as const` + names U8's `checkIncomeStreamV3`: finiteness-first; enum membership (`needVocab`); `ownerIndex ∈ {0,1}`; **`survivorPct`/`taxableFraction` range (the sole restore-path gate)**; **`colaPct` REQUIRED-and-finite when `colaMode='fixed-pct'`** (absent/null = corruption, never coerced to 0 — the optimistic-erosion direction); the full fork/type arm; `endAge` absent ≡ lifetime (DND-009, no numeric sentinel) |
| **Session-only data loss** (income entered, not persisted until U8) | Sequencing option a: keep the order (U8 next), the not-saved-yet affordance; consistent with accounts |

## Documentation / Operational Notes

- The R40 requirements entry (Unit 5) is the contract record; the scoping doc stays as research
  provenance.
- After Unit 4, re-run `pnpm verify:bundle` (income intake rides the lazy intake chunk).
- No federal-data constant is added to `@engine/constants`; user-facing default-rate hints are
  `referenceData.ts` figures with the `directionalUntilPinned` discipline.
- **U8 hand-off:** `checkIncomeStreamV3` per the Risks U8 row (importing the single-sourced vocab),
  honoring the `endAge`-absent-≡-lifetime / DND-009 discipline and the conditional `colaPct` presence.
  The viz work (U6/D2) treats a nominal-flat stream as a deterministic floor (KTD-2 viz corollary).
- **Tone:** the disclosure copy is an N=1 cold-read deliverable (Briggsy judges it) — conservative
  modeling choices framed as grounding, never confessions of error.

## Sources & References

- **Origin document:** [docs/plans/2026-06-17-001-other-income-in-retirement-scoping.md](docs/plans/2026-06-17-001-other-income-in-retirement-scoping.md)
- Mirror pattern: `src/shared/model.ts` (`TickerClassification`, the vocab `as const`, fidelity-over-
  duplication), `src/intake/intakeMap.ts` (`contributionStreamsFor`, `nonZero`, `escalateQuote`,
  `missingRequiredFacts`, the working-year IRMAA override), `src/engine/simulate.ts`
  (`contributionsForYear`, `cashTermsForYear`, `netWithdrawalForYear`, `validateParams`, the §202
  survivor branch, `bridgeYearMask`), `src/engine/taxOverlay.ts` (`nonSSordinary`, `MagiComponents`,
  `GrossUpContext`, the additive IRMAA recording `:1598`, the contraction proof), `src/engine/
  healthcareStreams.ts` (the override construction), `src/engine/dateSearch.ts` (`truncateStreams`,
  `buildCandidateParams`), `src/engine/sequencing.ts` (bracket-fill).
- Intake precedent: `src/intake/AccountEntry.tsx`, `AllocationEntry.tsx`, `questions.tsx` (`AccountsStep`,
  the `incomeStep`/`workIncomeStep` naming collision), `AnswerStrip.tsx`, `sanity.ts`, `src/ui/copy.ts`,
  `eslint.config.js`. Restore path: `src/shared/scenarioCodec.ts`, `src/store/session.ts`.
- Institutional learnings: `docs/insights/` 006, 007, 008, 010, 011, 012, 013, 014, 018, 020, 023, 024,
  025, 027, 028, 029, 039, 040; DND-009.
- Review provenance: the 4-agent grounding pass; the manual 4-lens panel; the deepen pass's 4 specialist
  lenses; the mandatory document-review handoff (coherence/feasibility/product/design/security/scope/
  adversarial), 2026-06-17.
