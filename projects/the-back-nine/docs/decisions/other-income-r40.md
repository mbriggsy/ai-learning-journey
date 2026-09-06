---
title: Other income in retirement (R40) — the nine KTDs and the conservative-or-disclose discipline
doc-type: decision
status: decided
created: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/research/engine-validation-and-tax.md, docs/research/pre65-healthcare.md]
---

# Other income in retirement (R40)

## What this record is

This is the **permanent decision record** for **R40** — a generic per-person ongoing income stream (pension · rental · alimony · annuity · other) that keeps paying after work stops. It holds the **nine Known Technical Decisions (KTDs)** the implementation cites by `KTD-N`, the per-type norm/default table, the OUT-list with every omission's **direction named**, the provenance corrections, and the resolved ATC calls.

The **requirements** (R40.1–R40.10) and the cardinal rule are canonical in [docs/product.md §7](../product.md); the **load-bearing engine contracts** R40 rides (the single shared draw / CRN, reduce-to-spine byte-identity, the two-distinct-MAGI-calculators rule, the R19 numeric gate, externally-derived fixtures) live once in [docs/architecture.md](../architecture.md); the **build narrative** (the five dependency-ordered units) lives in [docs/plans/2-first-answer.md](../plans/2-first-answer.md). This record holds the *decisions* and links to those.

R40 is **shipped** — U1–U4 (types · `compileIncomeStreams` + goldens · the atomic engine integration · the intake UX + the KTD-9 copy half) landed, and the U5 requirements reconcile is done. The decisions below are locked; this record is the permanent rationale.

---

## Why R40 (the decision context)

Before R40 the engine modeled exactly **two** income concepts: `earnedIncomeReal` (which stops at retirement) and Social Security. It had **no concept of ongoing non-earned income**. For a household that has a pension, a rental, an annuity, or alimony, that gap is the difference between **a defensibly-conservative answer and a confidently-wrong-optimistic one** — because the income isn't in the model, the engine either overstates the required withdrawal (no income to offset the draw) or, if a user fakes it as a lower spend, silently **mis-taxes everything downstream** (SS taxation, ACA subsidies, IRMAA tiers all key off MAGI).

**The test-drivers are real friends:** one with rental income; one whose wife draws a **teacher's pension**. The pension is the single most dangerous number in the app — whether it *survives* her death (and at what %) and whether it *keeps up with inflation* is the whole widow's picture. Getting either wrong is exactly the **calm-but-wrong-optimistic** sin the product exists to avoid.

**The discipline that follows (the standing rule):** the taxable portion of a stream must move **every** income/MAGI site *consistently and atomically* (or we get a sign-inversion), and **every survivor / COLA / basis simplification must either round conservative or be disclosed with its direction named.** An opt-in optimistic simplification that isn't disclosed is still the sin.

---

## Requirements trace

R40.1–R40.10 are canonical in [docs/product.md §7](../product.md). In brief: a generic per-person stream typed ∈ {pension, rental, alimony, annuity, other} (the type seeds defaults only); each stream carries gross `annualRealToday`, `startAge`, optional `endAge`, a COLA mode, a `taxableFraction`, and a `survivorPct`; each compiles to pre-deflated real-$ **gross + taxable** vectors in two death-state variants (KTD-4); the taxable portion moves SS-§86 / ACA-MAGI / IRMAA-MAGI in **one atomic change** (KTD-1, KTD-9); survivor continuation is realized at the owner's **sampled death** (KTD-4, KTD-5); a household with no streams is **byte-identical** to the spine (R40.6); intake is **opt-in** off the 5-minute path with the **no-safe-default fields surfaced** (R40.7); and all correctness goldens are **externally derived** (R40.10 / DND/012).

---

## Per-type norms and defaults (what each type means; what the form actually seeds)

| Type | COLA norm | Taxable default | Survivor norm | The MUST-ASK field | Provenance |
|---|---|---|---|---|---|
| **Pension** | nominal-flat | fully taxable | **prompt (no safe default)** | survivor % (QJSA election) | tax: IRS Pub 575. Survivor: IRC 401(a)(11)/417, QJSA floor 50%, J&S 50/75/100. COLA norm: public/teacher COLAs commonly none / 2–3% / capped, *below* inflation — **plan-design fact, not IRS** |
| **Rental** | real-flat | fully taxable | ~100% | (none forced) | tax: net rental ordinary, Sch E → AGI/MAGI, passive, continues past retirement (Pub 527/925). Survivor ~100% is **state property law** (JTWROS / community property), *not* IRS. COLA real-flat is practitioner/BLS-attested |
| **Alimony** | nominal-flat | **derived from agreement date** | **0%** (terminates at death) | **agreement executed before / after 12/31/2018** | TCJA fork (Pub 504 / Topic 452). 0%-survivor (§71(b)(1)(D)). Flat-nominal COLA practitioner-attested |
| **Annuity** | nominal-flat | fully taxable (qualified) / exclusion-ratio (non-qual) | prompt | qualified vs non-qualified | qualified fully taxable; non-qual exclusion ratio = basis/expected-return (Pub 575/939); fixed annuity flat-nominal, COLA = optional rider (FINRA/SEC) |
| **Other** | nominal-flat | fully taxable | prompt | — | catch-all; same machinery |

**What the shipped form seeds, and what it refuses to.** The COLA and survivor columns above are the *norms* the record carries for copy and fixtures — the entry form (`src/intake/OtherIncomeEntry.tsx`) seeds neither. `colaMode` starts empty and is required to save (`errIncomeColaModeRequired`); `survivorPct` starts empty for every continuing type and is required to save (`errIncomeSurvivorRequired`) — a silent 100% is the optimistic widow's-picture sin, so the rental ~100% norm is never pre-filled. The one figure the code does default is the **taxable fraction**: pension / rental / other compile as `taxableFraction ?? 1`, fully taxable (`effectiveTaxableFraction`, `src/intake/otherIncome.ts`). Alimony's 0% survivor is not asked at all — it is derived by law (§71(b)(1)(D)).

**The alimony agreement date is the highest-leverage field in the whole feature.** An instrument executed **after 2018-12-31** (or a pre-2019 one expressly modified to adopt TCJA) is **not taxable to the recipient and invisible to MAGI**; an instrument **on/before 2018-12-31 is** taxable and **does** lift MAGI. **Never default it** — ask it, with the date threshold in plain language. (A pre-2019 agreement merely *modified* after 2018 stays taxable **unless** the modification expressly adopts the new rules — so we ask "did the modification expressly adopt the post-2018 tax rules?", default = no.)

---

## The five seams (the MAGI-atomicity frame)

The taxable portion must enter **every** income/MAGI site in a single change, or we get the calm-but-wrong-optimistic sign-inversion. Because ACA-MAGI and IRMAA-MAGI both read the **single shared `MagiComponents.nonSSordinary`** producer, the *only* explicit edits are seam 1 (cash netting) and seam 2 (ordinary income); seams 3–5 flow through.

| # | Seam | Change |
|---|---|---|
| 1 | Cash-flow netting (`cashTermsForYear`) | add the gross to income — **death-aware, NOT retire-truncated** (unlike earned income): `net = max(0, spending − earned − ongoing − ss)` |
| 2 | Ordinary income (`nonSSordinary`) | `+ taxable[t]` — a **3-touch coordinated change** (a new income field, threading per-year taxable into the gross-up context, the `+ taxable` at the producer) |
| 3 | SS §86 provisional | the same taxable rides seam 2's `nonSSordinary` — **no separate edit** (editing it separately double-counts the §86 base — KTD-1) |
| 4 | ACA-MAGI | **no change** — reads `nonSSordinary` via the shared producer (rides seam 2) |
| 5 | IRMAA-MAGI | **no change** — same shared producer (rides seam 2), except the KTD-9 working-year decouple |

**Non-taxable portions** (post-2018 alimony, pension/annuity basis) net the draw (seam 1) but touch **none** of seams 2–5 — they are MAGI-invisible, and the ACA subsidy correctly **rises** (see Resolved decisions). The two-distinct-MAGI-calculators rule the taxable add rides on is canonical in [docs/architecture.md §7](../architecture.md).

---

## The nine Known Technical Decisions

> The nine KTDs are the load-bearing engineering record, cited in code as `KTD-N`. Round-3 review redesigned **KTD-9** (the IRMAA decouple — three agents found the first version mechanically unsound), corrected the **KTD-4 `validateParams` over-claim** (the engine cannot range-check the multiplied-away scalars), and confirmed the rejected ACA-MAGI "wage-blind" alarm.

- **KTD-1 — the seam count; seam 2 is a coordinated 3-touch.** `MagiComponents` has **one producer** fed by **one** `nonSSordinary` (seams 3/4/5 read it), so the taxable vector is added at **seam 2 only** — editing seam 3 separately double-counts the §86 base. Seam 2 is three coordinated touches: a new income field, threading the per-year taxable into the gross-up context, and the `+ taxable` at the producer. The shipped test proves the §86 provisional moved by the single (non-doubled) amount and names the larger figure a seam-3 double-edit would have produced (`src/engine/__tests__/taxOverlay.test.ts`, the *R40 seam 2* describe block). It runs a pre-tax-only pool: no R40 arm exercises the seam with `realizedGain ≠ 0`.

- **KTD-2 — the deflation math is net-new.** real-flat → emit the flat real value; nominal-flat / fixed-pct → `real[t] = annualRealToday · (1+colaPct)^t / (1+inflation)^t` using the deterministic inflation point estimate — the market's `inflation.mean`, read from the single-sourced methodology constant (`src/engine/reference/methodology.ts`, `productionMarket`), never re-typed. The per-year vector builder was written fresh, sharing **no structure** with the ACA age-rating escalator (`escalateQuote`); the only borrowed piece is the `nonZero` drop, which is also the reduce-to-spine signal (an all-zero variant is omitted, never zero-filled — `src/intake/otherIncome.ts`). A `fixed-pct` stream missing a finite `colaPct` returns `NaN` at **every** `t`, checked explicitly rather than left to the power form: `x ** 0 === 1` for any `x`, so the power alone would launder the corruption into a clean `annualRealToday` at sim-year 0 and model the stream as non-eroding — the optimistic direction. *Viz corollary:* a nominal-flat stream is a deterministic real curve (zero variance) — a **deterministic floor** in the confidence band, not a sampled spread. The shipped U6/D2 band carries no income-specific case; the flat stream simply narrows the percentile spread, and the property is recorded at the two compile-side homes (`src/intake/otherIncome.ts`, `src/shared/model.ts`).

- **KTD-3 — two shapes: persisted entity vs compiled leaf.** The **persisted** `IncomeStream` entity is a new list `incomeStreams` on `ScenarioV3` (+ `SCENARIO_V3_FIELDS` + the ties + init `[]`). The **compiled** leaf `PersonIncomeStream` (the two death-state variants) wraps in `IncomeParams` on `OverlayParams.income` and is **never persisted** (fidelity-over-duplication). R40 itself did not touch the scenario codec; the v3 restore arm and its real validation contract were built in U8 (not "free" persistence) and ship as `checkIncomeStreamV3` at `src/shared/scenarioCodec.ts:412`.

- **KTD-4 — two pre-weighted variants, per-OWNER death-gated, zero-alloc select.** Pre-compute two per-person variants at compile time — `{grossFull, taxableFull} = Σ streams` and `{grossSurvivor, taxableSurvivor} = Σ streams·survivorPct` (each with COLA/deflation + start/end gating baked in; **survivor derived per-stream**, not a scalar reweight of FULL). The death-dependent **select** is the only path-loop work, in a helper that **mirrors the death-gate *structure* of the contribution helper — not its allocation profile**: two household scalars, no `new Array`, no per-year `.some()`/`.find()`, integer comparisons against the locked `deathOffsets` only. Per owner: `select = (t < deathOffsets[owner]) ? FULL : (survivorAlive ? SURVIVOR : 0)`. Locked at the death offset, **never ramped**; death gate only (never `t < o.retire`). **Each person's bundle is independently gated on that person's own death** — a single household-level death gate is the bug a swap-mutant must catch. (`survivorPct`/`taxableFraction` are entity scalars multiplied away at compile — they do **not** exist on the leaf, so the engine cannot range-check them; that gate lives at the entity boundary — KTD-3 / intake sanity / the restore codec.)

- **KTD-5 — golden-gated correctness.** Every numeric claim is pinned by a hand-derived, externally-computed golden, walked through its conditional fork with the pinned boundary named (DND/012).

- **KTD-6 — tax-treatment inputs are a discriminated union keyed on `type`.** Model the tax-treatment fields as a discriminated union on `type` (mirroring `TickerClassification`) so a pension entity cannot carry annuity-exclusion fields and an alimony entity cannot carry a contradictory direct `taxableFraction` — the contradiction is **unrepresentable in authored code**. At restore it *is* representable (`JSON.parse + as` erases the union), so the codec **re-validates the full arm** — each `type`'s required scalars, at `src/shared/scenarioCodec.ts:412`. `compileIncomeStreams` derives the effective fraction (post-2018 alimony → 0; pre-2019 → 1; non-qual annuity → the entered exclusion; qualified/pension/rental/other → the entered/default fraction). No redundant derived fraction is persisted.

- **KTD-7 — survivor income-% and survivor spending-ratio are modeled independently.** `survivorSpendingRatio` (a **needs** figure, single-sourced in `src/engine/reference/methodology.ts`, fires on the first death of *either* spouse — see [ss-computation.md §6a](ss-computation.md)) and `survivorPct` (a **receipts** figure, keyed to the *owner's* death) model different things and compose correctly at seam 1. What pins this as built: the cross-owner-death-order test and its swap-mutant (a single household gate credits the wrong variant on an asymmetric death order), the both-dead $0 floor, and the KTD-7 × KTD-9 composition (a clamped working year with a dead spouse routes the whole FULL+SURVIVOR select to the IRMAA-only feed) — all in `src/engine/__tests__/simulate.test.ts`. The one run that *composes* the two figures is the sampled-longevity pension run in that file's reduce-to-spine block (a widowed path scales spending by `survivorSpendingRatio` while the pension drops to its SURVIVOR variant), and it asserts **direction** — a higher median terminal, a survival fraction that never falls — not a derived golden. No fixture isolates the composition, so the no-double-application claim rests on their separate gates.

- **KTD-8 — date-sweep invariance + the already-receiving anchor.** (a) Income is **Y-invariant** → it passes through `...overlayBase` **un-truncated** (do not add it to the date-sweep's stream truncation); `compileIncomeStreams` runs **once** per build, in `buildOverlay` inside the single `buildParams` pass (`src/intake/intakeMap.ts:540`), never per candidate. (b) `startAge ≤ currentAge` ⇒ **already-receiving, CLAMP to `t=0`, never reject** (start clamped to `max(0, startAge − currentAge)`). **The anchor:** for an already-receiving stream `annualRealToday` is the real value **at sim-year 0**, and the decay exponent is the **clamped `t`, never the stream's elapsed age** (else a plausible "honor the real age" impl over-deflates a real driver's pension). A golden pins `gross[0] === annualRealToday`.

- **KTD-9 — already-receiving × working-year IRMAA: a structural decouple, not a copy control.** An already-receiving stream's taxable in a §7-clamped working year collides with the additive working-year IRMAA override, and seam-2's unconditional add would also mint a phantom portfolio withdrawal to pay tax the wages already cover. A copy instruction ("enter your MAGI inclusive of all income") is **not** a sound control — a wages-only user would drop the pension from IRMAA entirely (the optimistic sin). The decision — **decouple the two feeds structurally:** (1) re-specify the working-year override as the **wages / non-modeled-MAGI component only**, and **invert the copy** to "enter your working-year income **excluding** anything you entered as a retirement income stream"; (2) the engine **owns each modeled stream's IRMAA-MAGI contribution in all years** (clamped and unclamped) — so a clamped working year's IRMAA-MAGI is `wages-override + the stream's own taxable`, each counted exactly once, with no dependence on user comprehension; (3) in a **clamped working year the stream's taxable feeds IRMAA-MAGI but NOT the gross-up netting** (the wages fund its tax outside the portfolio — no phantom withdrawal). Tests pin: IRMAA = wages + pension counted once on the wages-only path; and no portfolio withdrawal is minted for the pension's tax in a clamped working year.

  **Both halves shipped.** Halves (2)+(3) — *the engine owning each modeled stream's IRMAA-MAGI in all years* — landed with R40 U3 (the atomic engine integration; the `ongoingTaxableIrmaaOnly` feed at the history site, `src/engine/taxOverlay.ts`). Half (1) — *re-spec the override as the non-modeled component + invert the intake copy* — landed in R40 U4, and the tripwire is an **active assertion**, not a `.skip`: the override counts an already-receiving pension **once**, with the old whole-income override re-run as a negative control proving the double-count (`src/engine/__tests__/taxOverlay.test.ts`, the *R40 · KTD-9* describe block).

  **The disambiguation — the load-bearing trap (C3, council 2026-06-29 → Option B; `docs/council-log.md`).** KTD-9's engine-sense **"wages-only" means EXCLUDE the separately-MODELED streams** (pension/rental/annuity/alimony, which ride `ongoingTaxableIrmaaOnly` in every year), **NEVER "exclude investment income."** Conflating the two is what let the U4 copy drift to the optimistic **Option A** ("just your pay" / "usually the same as the pay you entered"). C3 ruled that the override must carry **FULL working-year income = work pay PLUS working-year investment income** (interest/dividends/cap-gains/K-1) — that investment income is on the R40 OUT-list and reaches IRMAA-MAGI **only** through this path, so a pay-only figure under-states Medicare cost = the cardinal sin — with the modeled streams **still excluded** (so no double-count).

  **What shipped is Option B simplified (2026-06-30, on Briggsy's cold read — a reversal of the council's separate-pay-field call).** The second pay field was built, then dropped: re-asking pay read as a duplicate question, and the engine cannot model a time-varying salary anyway. The intake now collects **one** new per-person field, `workingYearInvestmentByPerson` (`src/shared/model.ts`), and `buildDateInput` derives the engine's per-person override as `earnedIncomeReal + investment` at the boundary (`src/intake/intakeMap.ts:1085`) — never a stored sum, never a re-asked salary; `workingYearWagesByPerson` was removed. The investment figure is a first-class **required** input for a working member (an explicit 0, never a silent skip). The copy is `workIncomeIntro` / `workInvestmentLabel` / `workInvestmentHelp` / `workIncomeDisclosure` in `src/ui/copy.ts`; the drifted Option-A nudge is killed and guarded by a source-bound regression test in `src/ui/__tests__/copyGuard.test.ts`, and the steady-pay simplification (a bonus/RSU spike right before Medicare) is disclosed on the step.

---

## Scope boundaries — the OUT list, each with its direction named

R40 models the ongoing non-earned income a **real household actually receives**, entered once — **not a FIRE lever and not a general income ledger.** The **identity bound:** a new type clears the bar "a real driver receives it and the answer depends on it" or it doesn't ship; the "other" catch-all inherits that fence (dividends / 1099 / crypto are out unless a driver has one).

Every deferral names its direction (the conservative-or-disclose rule). Read "disclosed" below as **disclosed here, in this record, with its direction named**: the only user-facing disclosure any of these deferrals ruled is the rental cliff magnitude, and it did not ship. (R40's one shipped user-facing disclosure is KTD-9's steady-pay line, `workIncomeDisclosure` — a different simplification.) No shipped surface tells a user about the alimony payer-death or simple-COLA simplifications; and the basis-recovery one is disclosed **backwards** — the fine-tuning help (`incomeTaxableHelp`) calls holding the entered fraction steady "a conservative simplification", which is the **opposite** of the direction this record rules for it below (a constant fraction models the exclusion as never exhausting → understates late-life MAGI: the optimistic side).

- **Survivor-specific term / end gate — OUT (forward landmine).** KTD-4's two-variant pre-weighting holds **only because v1 streams share one end gate across both variants**. A survivor benefit with a *different* term (period-certain J&S, terminate-on-remarriage) would break the elementwise `survivor = Σ streams·survivorPct` relation. Out by design; carried as a forward landmine.
- **Rental sale events** (depreciation recapture §1250 25%, cap-gains-on-sale, step-up-at-death) — **OUT**; ongoing income only. Direction: **slightly optimistic** (ignores the eroding depreciation shield and a future-sale recapture tax). Disclosed.
- **Net-rental real-rise — OPTIMISTIC, and it COMPOUNDS at the ACA cliff (the ruled disclosure is still owed).** Gross rent tracks inflation but the fixed-nominal depreciation shield erodes, so *taxable net rent rises in real terms*. v1 holds net rent **real-flat** with `taxableFraction = 1`. The danger is **not a smooth slope error**: the omitted rise is exactly the dollars that can push a pre-65 household **over the 400% FPL subsidy cliff** (a discontinuity), where the miss is the **entire unsubsidized premium** for the bridge years. The decision was to disclose *this magnitude* in the rental copy and pin it with a cliff-compound fixture. **Neither shipped.** The other-income copy block carries no rental-specific disclosure at all — only the type label `incomeTypeRental` (`src/ui/copy.ts`) — and no test exercises a rental stream at the 400%-FPL boundary — so as built the omission is undisclosed, and that is an open obligation, not a closed one. The modest-real-rise upgrade still waits on a **verified BLS rent-CAGR** figure (in [docs/research/engine-validation-and-tax.md](../research/engine-validation-and-tax.md)) before it goes load-bearing.
- **Annuity/pension basis-recovery — OPTIMISTIC, opt-in, disclosed.** The true exclusion-ratio / Simplified-Method tax-free portion is a fixed nominal $ that shrinks in real terms then **stops** (then 100% taxable). v1 uses a **constant** `taxableFraction`, modeling the exclusion as **never exhausting** → understates late-life MAGI. The fully-taxable **default is conservative**; an opt-in user entering an exclusion fraction accepts an **optimistic** simplification — disclosed here, and named the wrong way round on the shipped help (see the intro above).
- **Alimony payer-death termination — OPTIMISTIC, disclosed.** Alimony ends at the recipient's death (`survivorPct = 0`) **and at the payer's death** — but the payer has no presence / sampled death in the household model. v1 pays alimony for the recipient's full modeled life, **overstating safety if the payer dies first.** Disclosed, not modeled.
- **Compounding-only COLA — the optimistic side, disclosed.** Simple (non-compounding) COLA erodes faster in real terms; v1 models **compounding** (the common case, but the optimistic side). The fixed-pct compounding convention is golden-pinned; simple-COLA deferred.
- **NIIT** (3.8% > $250k MFJ MAGI), **state-level alimony decoupling**, **annuity LIFO** for non-annuitized partial withdrawals (v1 models annuitized streams) — **OUT, disclosed.**

---

## Provenance corrections (cite to the right primary)

The **verified IRS treatment of each income type** (the alimony TCJA fork, the pension Simplified Method, rental Sch E / 27.5-yr SL depreciation, the annuity exclusion ratio) is registered once in [research/engine-validation-and-tax.md → *R40 income tax facts*](../research/engine-validation-and-tax.md); the per-type defaults above read it. Below are the four provenance corrections an earlier pass got wrong — cite them correctly when the build writes copy or fixtures:

1. **Rental ~100% survivor** rests on **state property law** (JTWROS / community property), *not* IRS Pub 559/551 — cite state law; only true if jointly owned / willed to the spouse.
2. **Net rental ≠ real-flat** — gross rent tracks inflation but the fixed-nominal depreciation shield erodes, so taxable net rent rises in real terms; v1 models real-flat as a simplification whose disclosure did **not** ship (see the OUT list), and the **rent-CAGR figure must be verified against the BLS series before it goes load-bearing.**
3. **Pension QJSA consent** can be witnessed by a **plan representative OR a notary** — not strictly notarized (IRC 417(a)(2)). The shipped survivor help (`incomeSurvivorHelp`) names the election made at retirement and does not describe the consent mechanics at all; this correction binds any copy that ever does.
4. **Alimony / pension / annuity COLA norms** are **practitioner / economic** facts, **not** IRS — label them as such (no IRS section governs whether a decree or annuity carries a COLA).

---

## Resolved decisions

- **Keep the advanced tier; ship "other"; add the R40 requirements entry.** "Other" / alimony / annuity ship because the engine supports them — but their guided-path questions + optimistic disclosures are **type-gated**, so a rental/pension-only user never pays for them. (The "it's free" rationale is an *engine* truth, not a product one; the **identity fence** above is the bound.)
- **Sequencing: R40 shipped with no persistence of its own.** The intake was **session-only until U8** (consistent with the accounts intake), with a calm **"nothing's saved yet" affordance** — a reserved static slot, **neutral text + icon, never a red badge** (color is never the only signal — the user is color-blind), live at `src/intake/questions.tsx:1150`. R40 added no IndexedDB write; streams reach the vault through the ordinary encrypted save, and U8 shipped the restore-path validation (below).
- **Net-rental cliff-compound: disclose the magnitude + a fixture** — ruled, and **not yet built** (see the OUT list); the modest-real-rise upgrade is deferred behind BLS rent-CAGR verification.
- **Survivor-% surfacing is broadened** to pension / annuity / rental / other (alimony stays 0% by law) — survivor continuation is **no-safe-default for any continuing stream**, surfaced in-form, required-to-save.
- **Non-taxable income is correctly MAGI-blind (the A1 confirmation, not a false alarm).** R40 non-taxable income (post-2018 alimony, annuity return-of-basis) genuinely is not federal MAGI **and** genuinely reduces withdrawal need — a lower MAGI → higher subsidy is the **true** answer (real ACA planning leans on non-taxable income to stay under the cliff). The taxable portion *does* hit MAGI via seam 2; no income source "should raise MAGI but doesn't." What is pinned as built is the compile step: a fully non-taxable stream emits **no** taxable vector at all, so nothing reaches MAGI and the subsidy rises by construction (`src/intake/__tests__/otherIncome.test.ts`). No integration arm runs the subsidy through the ACA overlay to assert the rise end-to-end.

---

## Risk → mitigation map (each hazard bound to its KTD)

| Risk | Mitigation |
|---|---|
| IRMAA double / under-count for already-receiving working-year streams | **KTD-9** structural decouple (the override is the non-modeled component — the entered pay plus the separately-collected working-year investment income, summed at `buildDateInput`, modeled streams OUT — C3 → B; engine owns modeled streams' IRMAA in all years; clamped-year income feeds IRMAA but not the gross-up) |
| Per-stream survivor-% lost by collapsing | **KTD-4** two variants; the golden derives `grossSurvivor` per-stream |
| Cross-owner death miscredits a dead spouse's pension | **KTD-7** per-owner gating; the cross-owner-death-order swap-mutant test |
| Seam-3 double-count of the §86 base | **KTD-1** seam-2-only; the §86-moved-once test |
| Engine can't range-check `survivorPct`/`taxableFraction` (multiplied away) | The range gate is **entity-side**: the entry form, intake sanity's `income-*-range` rules (`src/intake/sanity.ts`), and the restore codec; engine `validateParams` checks vectors only, by design |
| Date-sweep zeroes a retiree's pension | **KTD-8a** un-truncated pass-through, compiled once; the invariance test |
| Already-retired pensioner false-rejected / mis-anchored | **KTD-8b** clamp to `t=0`; `annualRealToday` anchored at sim-year 0; the anchor golden |
| Optimistic survivor floor | **KTD-4** select locked at the death offset; both-dead ⇒ $0 |
| Net-rental real-flat compounds at the ACA cliff | **UNMITIGATED as built** — the ruled magnitude disclosure + cliff-compound fixture did not ship (see the OUT list); real-rise deferred behind BLS rent-CAGR |
| Rental ~100% survivor as a silent optimistic default | Survivor-% surfacing **broadened** (no-safe-default, in-form required) |
| Hot-loop allocation regression | **KTD-4** zero-alloc two-scalar helper; integer death branch |
| Gross-up non-convergence | Re-probe at the SS-torpedo + bracket-fill corner — a perf non-issue (income is an additive constant; `k` unchanged) |
| Reduce-to-spine drift | Characterization byte-identity pin first; presence-keyed spread; don't collapse the double `allocateWithdrawal` |
| Contradictory persisted entity | **KTD-6** union (unrepresentable in authored code); the codec re-validates the full discriminant arm (`scenarioCodec.ts:412`) |
| Session-only data loss | Closed by U8 — streams persist through the encrypted save; the not-saved-yet affordance still marks the pre-save state |

---

## Build status & the restore-path validation contract

R40 is **shipped** — five dependency-ordered units (types → compile + goldens → the atomic engine integration → intake UX → the requirements reconcile) all landed; the build narrative is in [docs/plans/2-first-answer.md](../plans/2-first-answer.md), and per-unit status lives in the roadmap's [You-Are-Here table](../roadmap.md).

**U8 inherited a real validation contract, not "free" persistence, and discharged it.** R40 single-sources `INCOME_TYPES`/`COLA_MODES` `as const` and named the `checkIncomeStreamV3` codec validator, which shipped at `src/shared/scenarioCodec.ts:412`: finiteness-first; enum membership; `ownerIndex` bounded to the people list (the stricter dangling-reference guard, of which the type's `0 | 1` is the married-couple case); the **`survivorPct`/`taxableFraction`/`exclusionFraction` range** (the restore-path gate — a restored blob bypasses the form, so the engine never sees the scalars); **`colaPct` required-and-finite when `colaMode='fixed-pct'`** (absent/null = corruption, never coerced to 0 — the optimistic-erosion direction); the full type/fork arm; and `endAge` **absent ≡ lifetime** (DND-009 — never an `Infinity`/`NaN`/numeric-magic sentinel, which `JSON.stringify` silently nulls).
