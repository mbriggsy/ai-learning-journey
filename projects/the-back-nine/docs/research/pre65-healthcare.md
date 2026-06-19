---
title: Pre-65 Healthcare — ACA-PTC / HSA / IRMAA reference + re-verify gate
doc-type: research
status: shipped
created: 2026-06-17
updated: 2026-06-18
derives-from: [docs/product.md]
sources: [docs/research/engine-validation-and-tax.md]
---

# Pre-65 Healthcare — ACA-PTC, HSA & IRMAA

This is the verified-reference home for the **income-dependent healthcare model**: the ACA premium-tax-credit regime before age 65, IRMAA after it, and the HSA rules that sit across both. It is a **co-equal sibling** of [engine-validation-and-tax.md](engine-validation-and-tax.md) — that doc holds the Trinity/Bengen + tax/SS numbers; this one holds the healthcare numbers. Together they are the evidence layer the engine's overlays read from.

**Status: CONSUMED and load-bearing.** This is not a draft. The U3 healthcare overlay (`src/engine/healthOverlay.ts`) and the canonical constants table (`src/engine/constants/health.ts`) read these facts, and the legislative exit-gate (§6, row 1) is enforced on every build by `pnpm verify:aca`. The numbers below still carry per-figure confidence and a `directionalUntilPinned` marker — do not misread that as "unfinished." It is the standard precision discipline: a figure is *directional* until pinned to its named PRIMARY source, *golden* after. The healthcare model ships today on the 2026 reverted/cliff base case; the directional markers track which individual numbers still need a PDF-level pin, and the re-verify gate tracks the one legislative fact that can flip the whole regime.

For **how the engine uses all of this** — the two MAGI calculators, the ACA same-year fixed point, the IRMAA two-year lagged feed-forward, the HSA fourth bucket, the survivor MFJ→single flip, and the reduce-to-spine invariant — see [architecture.md §7.2 (Healthcare overlay)](../architecture.md). Those mechanics live there **once**; this doc is the facts they rest on. The R40 / portfolio build that rests on top is in [plans/2-first-answer.md](../plans/2-first-answer.md), with its decisions in [decisions/other-income-r40.md](../decisions/other-income-r40.md) and [decisions/portfolio-holdings.md](../decisions/portfolio-holdings.md).

**Synthesis date: 2026-06-04.** Models CURRENT (2026) law. Provenance: gemini-grounding + IRS/CMS primaries (workflow wf_0e97dfc3, 5 research agents + synthesis). This extends the tax-reference doc's conversion problem from a single-control "fill the survivor's bracket" objective into a **multi-control, healthcare-aware sequencing objective** in which income-dependent healthcare cost is continuous across age 65 (ACA-PTC pre-65 → IRMAA post-65), with two different MAGI definitions, two different cliff shapes, and a 2-year timing lag on the post-65 side.

---

## 1. SETTLED FACTS (high-confidence, cited)

These are the rules the engine can rely on as current law. Confidence HIGH unless noted.

**Medicare endpoint**
- **Medicare eligibility begins at exactly age 65** (general population). 7-month Initial Enrollment Period: 3 months before the birthday month, the birthday month, 3 months after. Medicare is **individual, not household** — in an age-gapped couple, the younger spouse needs bridge coverage longer. *(Source: CMS / Medicare.gov.)*
- **2026 Part B standard premium = $202.90/mo/person; Part B deductible = $283/yr.** *(Source: CMS fact sheet, Nov 14 2025 — verified across multiple grounded sources incl. The Finance Buff computing from the CMS announcement.)* Part B is **per person** — a couple both enrolled pays ~$405.80/mo at the standard rate. Original Medicare is NOT free.
- Enrolling in **any** part of Medicare ends HSA **contribution** eligibility — full stop. (Spending privileges at 65+ do not restore the ability to contribute.) *(Source: IRS Pub 969, verbatim.)*

**HSA eligibility + which premiums are/aren't HSA-qualified** *(Source: IRS Pub 969 — read verbatim 2026-06-04; rules are statutory IRC §223, stable for 2026)*
- Four contribution-eligibility tests, all true on the first of the month: covered by a qualifying HDHP; no other non-HDHP coverage (limited exceptions); **not enrolled in Medicare**; not a dependent.
- **Medicare zeroes the contribution limit**, verbatim: *"Beginning with the first month you are enrolled in Medicare, your contribution limit is zero. This rule applies to periods of retroactive Medicare coverage."* This is the **6-month Part A retroactive lookback** trap for 65+ who delay Medicare while still contributing (the "6 months" duration is well-established SSA/Medicare rule, secondary-sourced; the retroactivity-creates-excess principle is verbatim Pub 969).
- **Which premiums HSA funds CAN pay (the ONLY four exceptions), verbatim:** (1) long-term care insurance; (2) **health care continuation coverage such as COBRA**; (3) **coverage while receiving unemployment compensation**; (4) **Medicare and other health coverage if you were 65 or older — EXCEPT Medigap/Medicare supplemental** (explicitly excluded).
- **THE TRAP — ACA Marketplace premiums are NOT HSA-qualified** in the normal case. They qualify tax-free ONLY if (a) the person is receiving unemployment compensation, or (b) it's COBRA. For a pre-65 early retiree on the Marketplace (a core Back-Nine scenario), **HSA dollars cover out-of-pocket costs tax-free but NOT the monthly premium.** Do not let the model overstate "HSA covers healthcare."
- **65+ Medicare-premium privilege is keyed to the HSA OWNER's age, not the spouse's**, verbatim: if the account beneficiary isn't 65+, Medicare premiums for a 65+ spouse/dependent aren't qualified. Matters for the couple model's age-gap/death-order logic (COBRA and unemployment exceptions *can* cover a spouse; the Medicare exception cannot until the owner is 65+).
- **20% penalty waived at 65** — a non-qualified withdrawal after 65 is taxed as ordinary income only (HSA behaves like a Traditional IRA for non-medical spend); qualified medical withdrawals stay fully tax-free.
- **2026 limits (Rev. Proc. 2025-19, secondary-sourced, 4+ sources agree):** contribution $4,400 self-only / $8,750 family; HDHP min deductible $1,700 / $3,400; max OOP $8,500 / $17,000; catch-up (55+) +$1,000 each spouse **in their own HSA** (cannot stack in one account). *(Confidence MEDIUM-HIGH — not read from the Rev. Proc. PDF.)*

**ACA-PTC MAGI basis** *(Source: IRS Pub 974; UC Berkeley Labor Center "MAGI under the ACA"; HealthCare.gov)*
- PTC (IRC §36B) = **benchmark SLCSP premium − (applicable % × MAGI)**, where SLCSP = second-lowest-cost Silver plan in the rating area. Taken in advance as APTC, reconciled on **Form 8962**. Coverage-year eligibility uses the **prior year's FPL** (2026 coverage → 2025 FPL).
- **ACA-MAGI = AGI + tax-exempt (muni) interest + the non-taxable portion of Social Security + excluded foreign earned income.** (So the **full** SS benefit effectively counts.)
- **Roth CONVERSION income, traditional IRA/401(k) withdrawals, capital gains, taxable interest/dividends all raise ACA-MAGI dollar-for-dollar.** **Qualified Roth distributions are MAGI-INVISIBLE** (tax-free, never touch AGI) — this is the lever. Return of basis from a brokerage account counts only the gain.

**IRMAA 2-year lookback** *(Source: CMS/SSA; The Finance Buff (Harry Sit) computing from the CMS announcement, cross-checked Kiplinger/Humana — all agree)*
- IRMAA is an income-based surcharge on Medicare **Part B and Part D**. **Year-N surcharge is set by MAGI from year N−2 → 2026 IRMAA is set by 2024 MAGI.**
- **IRMAA-MAGI = AGI + tax-exempt interest.** It does **NOT** add back the non-taxable SS portion. **IRMAA-MAGI ≠ ACA-MAGI** — the engine needs **two separate MAGI calculators.**
- **Step-function brackets with hard cliffs, per person.** $1 over a threshold → the full surcharge for that bracket; a couple pays it **twice**. 2026 first tier: single > $109,000 / **MFJ > $218,000**. 2026 Part B totals climb $284.10 → $689.90/mo across tiers; Part D IRMAA $14.50 → $91.00. First four brackets are inflation-indexed annually; **top tier (≥$500k single / ≥$750k MFJ) is frozen through 2027**, adjusts 2028.
- **A voluntary Roth conversion is NOT an SSA-44 life-changing event** — you cannot appeal away IRMAA you caused by your own conversion. (Retirement/work-stoppage IS a qualifying event.)

---

## 2. TIME-SENSITIVE / UNRESOLVED

**THE load-bearing fact — do NOT smooth this over.**

### Enhanced ACA subsidies expired 12/31/2025; NOT extended as of 2026-06-04. Status is legislatively fluid.

- **SETTLED as current law (HIGH):** The ARPA-2021 enhanced premium tax credits, extended by the IRA-2022 through plan year 2025, **expired December 31, 2025.** For **2026 the law has reverted to the pre-ARPA structure**: the **400% FPL "subsidy cliff" is back** (one dollar of MAGI over 400% FPL → loss of ALL premium tax credits), and the required-contribution percentages are **higher at every tier** (2026 sliding scale **2.10% → 9.96%** of income, vs. 0% → 8.5% in 2021–2025). 2026 plans, premiums, and APTC already reflect the reverted rules. *(Sources: KFF; HealthCare.gov states the pandemic-era help "ended December 31, 2025"; IRS Rev. Proc. 2025-25 for the applicable-% table.)*
- **PENDING / NOT LAW (as of 2026-06-04):** On **Jan 8, 2026** the **House passed** a 3-year extension (230–196, 17 Republicans joining). It **stalled in the Senate** (needs 60 votes; reported "dead on arrival"; a shorter/income-capped compromise was reportedly live but inconclusive). **No extension has been enacted.** *(Sources: Thomson Reuters, AJMC, KFF, Ballotpedia — grounded synthesis, NOT confirmed against an enacted statute.)*
- **Why it is load-bearing:** if Congress restores the enhanced regime — **possibly retroactively to 2026** — the 400% FPL cliff **disappears** and the entire pre-65 conversion calculus **flips**. The engine must therefore treat "cliff-on / reverted rules" as the **2026 base case** but expose the enhanced regime as a **scenario toggle**, never hard-code "no enhanced subsidies forever." **Re-verify against current law at every build/release.**

**Documented 2026 impact (for calibration/messaging, not as fixtures):** KFF — average subsidized benchmark out-of-pocket premium projected to roughly **double**; realized net monthly payment up ~58% as enrollees downshifted to Bronze; projected enrollment ~22.3M → ~17.5M; CBO +2.2M uninsured in 2026. A severity anchor: a 63-yr-old WV couple at ~$85k (402% FPL) saw the cheapest Bronze plan go from <$2/mo to **$1,527/mo** purely from the cliff's return.

**Other time-sensitive items (verify before load-bearing):**
- **OBBBA (H.R.1, enacted July 2025, effective 2026):** ACA **Bronze & Catastrophic** Exchange plans **deemed HSA-compatible** from Jan 1 2026 (expands *who can contribute*; does **NOT** make ACA premiums HSA-payable — the premium list in §1 is unchanged); permanent telehealth pre-deductible safe harbor; Direct Primary Care fees (≤$150/$300) HSA-eligible. *(Confidence MEDIUM-HIGH — multiple advisory sources agree; statute/IRS implementing notice not read verbatim.)*
- **FPL dollar thresholds:** 2026 coverage uses **2025 HHS poverty guidelines**; the couple's 400% FPL cliff ≈ **$84,600** (household-of-2) is the binding number but was reported as a rounded approximation, **not pulled from the HHS primary table.**
- **2026 applicable-% interior endpoints** (2.10% / 4.19% / 6.60% / 8.44% / 9.96%) — single-source to Rev. Proc. 2025-25 via summary; confirm decimals against the PDF.

---

## 3. THE CONVERSION ↔ HEALTHCARE INTERACTION (the modeling crux)

Healthcare cost in retirement is **income-sensitive continuously across age 65.** The same lever the engine already optimizes for tax/RMD posture — how much traditional balance to convert/withdraw each year — **also moves healthcare cost**, through two different regimes glued at 65. This is what couples healthcare into the solver objective.

**Pre-65 (ACA-PTC regime):** A Roth conversion (or any traditional withdrawal) raises **current-year ACA-MAGI dollar-for-dollar**, which **shrinks the PTC** and — in 2026's reverted/cliff regime — can **knock the household over the 400% FPL cliff and zero out the entire subsidy.** The early-retiree instinct "convert aggressively while ordinary income is low" **directly fights** "keep MAGI low to maximize the subsidy."
- Planners frame this as an **effective ("shadow") marginal rate** = federal + state tax **+ lost ACA subsidy**, commonly **~38%+** when the subsidy phase-out stacks on a 12%/22% bracket, and **catastrophic at the cliff**. Worked illustration: a couple at ~$80k MAGI (just under the ~$84,600 cliff) getting ~$10k/yr subsidy who converts $10k → over the cliff → loses the whole ~$10k subsidy plus owes ~$1,200 tax → **>100% effective rate** on that conversion.
- The governing heuristic shifts: **don't "fill to the top of a tax bracket" — fill only up to an ACA-subsidy-aware MAGI ceiling** (commonly just under 400% FPL to dodge the cliff, or lower — 150/200/250% FPL — to also capture Cost-Sharing-Reduction Silver benefits). **During ACA years the subsidy ceiling, not the tax bracket, is the binding constraint.**

**65+ (IRMAA analog):** At 65 the person enrolls in Medicare and (if premium-free Part A) **loses ACA PTC** — the ACA income-sensitivity switches **off** and is **replaced by IRMAA**. Same "shadow marginal rate" logic, now on IRMAA step-brackets (×2 for a couple), but with **two structural differences from ACA**:
1. **2-year lag** — a conversion at **age 63–64 hits the IRMAA bill at 65–66.** The "danger years" for IRMAA **start before Medicare.**
2. **Pure step-function cliffs** (no smooth phase-out): $1 over a bracket = full surcharge, repeated every year MAGI stays above the line.

**The unifying crux:** **both regimes have cliffs, so the rule "fill to a subsidy-aware ceiling, not a tax-bracket ceiling" applies in BOTH phases — only the ceiling's definition changes at 65** (current-year ACA-MAGI vs. 400% FPL pre-65; MAGI[t−2] vs. IRMAA brackets post-65). And — consistent with the project's known landmine — **the tax-blind delta is sign-inverted**: ignoring ACA/IRMAA makes aggressive early conversions look *better* than they are, both in the pre-65 window and across the 63→65 boundary.

---

## 4. MODELING RECOMMENDATION

> **Where this lives in code:** the recommendations below were implemented in U3 — `src/engine/healthOverlay.ts` (the two MAGI calculators, the ACA fixed point with explicit cliff branching, IRMAA as a 2-year lag carried in state, the HSA fourth bucket) reading `src/engine/constants/health.ts`. See [architecture.md §7.2](../architecture.md) for the as-built mechanics and the reduce-to-spine invariant. This section is the design rationale the build rests on.

**Minimal honest model = one continuous "income-sensitive healthcare cost" curve, implemented as two regimes with two MAGI variants.**

**4a. Two MAGI calculators (do NOT reuse one number):**
- **ACA-MAGI** = AGI + tax-exempt interest + non-taxable SS + excluded foreign income.
- **IRMAA-MAGI** = AGI + tax-exempt interest (no SS add-back).
- Qualified Roth distributions, return of basis, cash, and HSA spending count toward **neither** — funding healthcare from these breaks the loop, so **the engine's funding-source order materially changes loop strength.**

**4b. Pre-65 ACA — the same-year MAGI feedback loop (a true fixed point):**
This year's MAGI sets this year's PTC, which changes net premium, which changes the gross withdrawal needed to fund spending, which changes MAGI — circular:
```
PTC         = max(0, SLCSP_benchmark − applicable_pct(FPL%) × MAGI)   # 0 if MAGI > 400% FPL (cliff, 2026)
net_premium = full_premium − PTC
gross_wd    = spending_need + taxes + net_premium
MAGI        = f(gross_wd, other_income)        # MAGI on both sides
```
- This is **the same shape as the IRS's own SEHI↔PTC circular reference, which the IRS resolves with an iterative method (Pub 974 / Rev. Proc. 2014-41).** Iterating to a fixed point is **IRS-precedented, not a hack.**
- **Convergence is fast and safe:** each extra MAGI dollar claws back at most the applicable % of PTC (≤9.96% in 2026), so the contraction factor is ≤~0.10 → **2–3 fixed-point iterations (or a bisection on MAGI) converges.**
- **Handle the 400% FPL cliff explicitly:** a naive iterator can oscillate across it. **Detect the crossing and branch** — compute the "just-under" and "just-over" funding solutions and pick the cheaper — rather than relying on smooth convergence.
- **Treat the SLCSP benchmark premium as a user input** (or an age-banded assumption). It is ZIP/age-specific; every serious tool punts it to input. This is the single biggest honesty lever — do not synthesize it.
- A one-pass/sequential v0 (estimate MAGI → compute PTC → don't re-fund) is acceptable but **biases the marginal premium-funding withdrawal** (understates MAGI). Iterating removes the bias for ~10 lines — recommended.

**4c. Post-65 IRMAA — a 2-year LAGGED feed-forward, NOT a fixed point:**
- Store a **per-filing-unit MAGI history.** In year *t*, look up the bracket from **MAGI[t−2]** and add the surcharge (×2 for a couple) to year-*t* healthcare cost. **No within-year circularity to solve** — it's a deterministic delay carried in state.
- The surcharge is itself spending that may be funded by a withdrawal bumping MAGI[t], feeding t+2 — a **second-order lagged loop. MVP may ignore it and document the omission; it's tiny.**

**4d. Defensible MVP cut:** ACA fixed-point with explicit cliff branching + SLCSP as input + two MAGI variants + IRMAA as a pure 2-year lag carried in state. This already **beats Boldin** (which does NOT auto-model the loop — it tells users to enter the unsubsidized premium manually and self-cap conversions) and is **honest**. PL/Pralana sit above this with joint optimization; the MVP need not match them, only be directionally correct and disclose what it omits.

**4e. Subtleties an implementer MUST handle:**
- **Couple / death-order interaction:** on a spouse's death the survivor flips **MFJ → single thresholds (~half)** for BOTH IRMAA and the ACA FPL basis — the survivor can be hit with a surcharge on the *same* income. Wire this into the existing death-order conditional-filter logic.
- **Inflation-index the thresholds when projecting forward** (ACA applicable-% and the first four IRMAA brackets adjust annually; IRMAA top tier frozen through 2027). Static thresholds silently catch more people each year.
- **IRMAA cliffs are discontinuous** — fine for forward simulation, hostile to gradient optimizers; the conversion-ceiling search must be cliff-aware (grid/bisection, not gradient).
- **SSA-44:** retirement/work-stoppage is a qualifying life-changing event that can reduce IRMAA in the retirement-transition year; a voluntary conversion is NOT. MVP may ignore the appeal but should not assume the 63/64 spike is unavoidable.

---

## 5. FALSIFIABLE IN/OUT LINE

This extends the existing §Strand-5 line — *"a tax/health effect is IN iff it moves the survivor's bracket the conversion stacks into"* — from a single tax control to a **multi-control, healthcare-aware objective.** The optimizer's controls are **per-year {conversion amount, withdrawal source order}**; the objective is lifetime after-tax-and-after-healthcare wealth (survivor-weighted).

**IN scope (a tax/health effect is IN iff it changes the marginal cost of a conversion/withdrawal dollar through a channel the engine's controls can move):**
- Federal income tax on the conversion/withdrawal, including the survivor-bracket stacking already in §Strand 5.
- **Pre-65: ACA PTC change** as a function of **current-year ACA-MAGI**, including the **400% FPL cliff** (under 2026 reverted rules) — because a conversion dollar moves it.
- **65+: IRMAA surcharge** (Part B + Part D, ×2 for a couple) as a function of **MAGI[t−2]**, including the **2-year lag that couples age-63/64 income to age-65/66 cost** — because a conversion dollar moves it (just on a delay).
- **MAGI-reducing funding choices** (spend from Roth/basis/cash/HSA; HSA contributions reducing AGI pre-Medicare) — because they are exactly the controls that break the loop.
- The **survivor MFJ→single threshold flip** for both IRMAA and ACA-FPL, under the existing death-order filter.

**OUT but DISCLOSED (real, but either not moved by the engine's controls, or below the MVP fidelity line — must be named in the output, not silently dropped):**
- **The SLCSP benchmark premium level itself** — a user input/assumption, not solved (ZIP/age-specific). The engine optimizes *around* it; it does not predict it.
- **OBBBA edge features** (Bronze/Catastrophic HSA-compatibility, telehealth, DPC) beyond noting that ACA premiums remain non-HSA-payable.
- **Cost-Sharing-Reduction (CSR) out-of-pocket richness** below 250% FPL — affects OOP, not premium/subsidy; out unless the tool models OOP.
- **State-level subsidy wraps** (CA/NY/etc.) that blunt the federal cliff — federal model can't see them; flag as state-configurable.
- **The IRMAA second-order self-funding loop** (surcharge funded by a withdrawal that bumps MAGI[t→t+2]) — tiny, documented omission.
- **SSA-44 appeals**, MFS-separate IRMAA thresholds, Medicaid (≤138% FPL), COBRA/retiree-medical-vs-active-coverage Part-B-delay distinctions — relevant context, out of the conversion-optimizer core unless explicitly modeled.

**The crisp rule:** *An effect is IN iff a per-year conversion/withdrawal dollar changes it through ACA-MAGI (current year) or IRMAA-MAGI (two years forward), evaluated under the survivor-weighted filter. Everything else is an assumption the engine reads in or a disclosed out-of-scope item — never a silent omission.*

---

## 6. EXIT GATE — pin to PRIMARY source before any fixture is "golden"

This is the **living re-verify gate** — the same discipline [engine-validation-and-tax.md](engine-validation-and-tax.md) applies to its tax numbers: every number below is **directional** (secondary/grounded synthesis or single-source) until it is confirmed against the named PRIMARY source, after which a fixture using it may be labeled golden. The **legislative item (row 1) gates the entire pre-65 module** — no ACA fixture is golden until it is re-verified against current law at build time, and that re-verification is **enforced in CI by `pnpm verify:aca`** against `aca-last-verified.json` (the constants entry carries `reVerifyEveryBuild: true`).

| # | Number / rule | Current confidence | PRIMARY source to pin against | Gate |
|---|---|---|---|---|
| 1 | **Enhanced-PTC legislative status** (cliff on/off for 2026; retroactive risk) | HIGH it expired 12/31/25 & not extended as of 2026-06-04; FLUID | Enacted statute / IRS notice — **re-verify at every build** | **BLOCKS all pre-65 ACA fixtures.** No ACA fixture golden until status reconfirmed as current law at build time. |
| 2 | **HSA contribution-eligibility + qualified-premium list** (incl. ACA-not-qualified, Medigap excluded, owner-age keying, Medicare-zeroes-contribution) | HIGH (read verbatim) | **IRS Pub 969** (confirm against 2026 edition when posted; rules are statutory IRC §223) | Pin to 2026 Pub 969 text. |
| 3 | **2026 HSA dollar limits** ($4,400 / $8,750; deductibles; OOP; +$1,000 catch-up) | MEDIUM-HIGH (secondary, 4+ agree) | **IRS Rev. Proc. 2025-19** (`irs.gov/pub/irs-drop/rp-25-19.pdf`) | Pull the PDF; confirm decimals. |
| 4 | **ACA PTC formula + ACA-MAGI composition** (benchmark−contribution; SS add-back of non-taxable portion) | HIGH | **IRS Pub 974 / Form 8962 instructions** (+ IRC §36B); confirm the non-taxable-SS add-back wording on Form 8962 | Pin formula & MAGI add-backs. |
| 5 | **2026 applicable-% table** (2.10% → 9.96% interior endpoints) | MEDIUM-HIGH (single-source summary) | **IRS Rev. Proc. 2025-25** (`irs.gov/pub/irs-drop/rp-25-25.pdf`) | Confirm every bracket-edge decimal. |
| 6 | **2025 FPL dollar thresholds** (100%/138%/400% for household-of-2; ~$84,600 cliff) | MEDIUM (rounded approximations) | **HHS 2025 Poverty Guidelines** (Federal Register); note AK/HI higher | Pin exact cliff dollars before computing FPL%. |
| 7 | **2026 Part B premium $202.90 + deductible $283** | HIGH (CMS-cited, multi-source; not read off the PDF) | **CMS fact sheet, Nov 14 2025** (Federal Register notice) | Confirm against the CMS PDF/FR. |
| 8 | **2026 IRMAA brackets + surcharges + 2-yr lookback + IRMAA-MAGI def** (incl. middle-tier dollars; top tier frozen to 2027) | HIGH thresholds (Finance Buff from CMS), MEDIUM middle-tier dollars | **CMS IRMAA fact sheet / Federal Register notice**; IRMAA-MAGI per **SSA / 1040** | Confirm middle-tier dollars off the CMS PDF/FR. |
| 9 | **Part A purchased premiums ($311/$565) + deductible ($1,736)** | MEDIUM (grounded summary, not primary) | **CMS 2026 Part A fact sheet** | Pin if the tool models post-65 Part A spend. |
| 10 | **OBBBA HSA provisions** (Bronze/Catastrophic compat, telehealth, DPC) | MEDIUM-HIGH (advisory sources; statute not read) | **Enacted H.R.1 text / IRS implementing notice** | Pin before any OBBBA-dependent logic; implementation guidance may still be pending. |

**One-line gate summary:** Pin #1 (legislative status) at every build — it can flip the whole pre-65 model and gates all ACA fixtures. Pin #2/#4 to IRS Pub 969 / Pub 974 (HSA + ACA mechanics, the most stable). Pin #3/#5 to the two 2025 Rev. Procs (HSA limits, applicable-%). Pin #6 to HHS guidelines (cliff dollars). Pin #7/#8/#9 to CMS/Federal Register (Medicare premiums, IRMAA brackets, Part A). Pin #10 to enacted H.R.1. Until each is confirmed against its PRIMARY source, the number is **directional, not golden** — exactly the [engine-validation-and-tax.md](engine-validation-and-tax.md) standard.
