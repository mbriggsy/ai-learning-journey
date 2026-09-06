---
title: The Back Nine — Architecture (how the engine works + the load-bearing invariants)
doc-type: architecture
status: living
created: 2026-06-17
derives-from: [docs/product.md]
sources: [docs/research/engine-validation-and-tax.md, docs/research/pre65-healthcare.md]
---

# The Back Nine — Architecture

This is the single canonical home for **how the engine works** and the **load-bearing invariants nobody may break**. If a rule here is contradicted anywhere else, this doc wins; the other doc is stale. The invariants are stated once, here — other docs link to them rather than restate them.

Why this matters: the product bets real retirement money on the engine's number, and later on a recommended strategy that costs real dollars if it is wrong. The cardinal rule — *calm-but-wrong is the sin* (see [docs/product.md](product.md)) — is enforced not by tone but by these structural contracts. Each one is the difference between an answer that is signal and an answer that is luck dressed as confidence.

---

## The load-bearing invariants (index)

The one-screen version of *what you must never break*. Each links to its full contract below — if you are about to touch the engine, read the linked section first.

| Invariant | Where | What breaks if you break it |
|---|---|---|
| **Engine purity** — a deterministic function of `(params, seed)`; reads no clock, entropy, or environment | [§1](#1-the-layer-architecture) | Determinism dies; the same inputs stop giving the same answer, and CRN with it |
| **One shared market draw / CRN** — all buckets share one draw per year; the draw schedule is a function of path/horizon dimensions only | [§2](#2-determinism-and-common-random-numbers-crn), [§3](#3-the-single-shared-market-draw) | Candidates get ranked on *different* futures (luck, not signal); per-bucket draws re-enable asset-location |
| **Stateless Box-Muller** — no spare normal cached across calls | [§2](#2-determinism-and-common-random-numbers-crn) | Two CRN candidates that draw in different interleavings silently desync |
| **Reduce-to-spine (byte-identity)** — every overlay, when OFF, reproduces the validated decumulation byte-identically | [§5](#5-the-reduce-to-spine-invariant-byte-identity) | The golden cases perturb; you can no longer prove an overlay adds *only* what it should |
| **Externally-derived fixtures** — goldens derived by an independent path, never the engine's own formula | [§5](#5-the-reduce-to-spine-invariant-byte-identity) | A passing test proves typing, not correctness |
| **The R19 numeric gate** — finiteness first; reject every incomputable input before any path runs | [§6](#6-the-r19-numeric-gate-validateparams) | A `NaN` rides past `??`/`>` guards into a percentile or the headline — calm-but-wrong |
| **No in-range default fallbacks** — a figure the research names but doesn't value throws; never a plausible default | [§8](#8-constants-discipline-srcengineconstants) | A missing input becomes indistinguishable from a measurement inside a fixed-point |
| **One canonical constants table** — every dated figure is read from one year-keyed table, never re-typed | [§8](#8-constants-discipline-srcengineconstants) | A re-typed figure drifts out of sync with its source, silently |
| **Cross-engine headline robustness** — quantize the headline statistic to a coarse grid before the band-edge decision | [§9](#9-cross-engine-headline-robustness) | The same scenario shows a different headline across browsers; the screenshot promise breaks |
| **The encrypted-store write-gate** — one model copy; a write needs a session key AND a current passphrase-wrap; never persist `Infinity`/`NaN` | [§7.3](#73-encrypted-local-store--key-lifecycle-srccrypto-srcstore) | A survivor restores a *stale* vault, or a never-depleted sentinel nulls into corruption |
| **Joint-survivor from cohort tables** — `P = pₓ + pᵧ − pₓpᵧ` from sex-specific cohort curves, never one rate for both; retain survivor identity | [§7.6](#76-longevity--joint-survivor-sampling) | Survivor SS / spending / tax-cliff attach to the wrong spouse; a hardcoded couple rate or to-age-90 horizon misprices the floor |
| **SS survivor lock-flat** — the survivor reduction factor locks at claim-age and holds flat; never ramps toward 100% | [§7.7](#77-social-security-sub-engine) | Guaranteed income is optimistically overstated on early-widowhood paths — calm-but-wrong |
| **Strict CSP via response headers** — `script-src`/`connect-src 'self'`, no inline/eval | [§10](#10-security--csp-boundary) | An XSS foothold gains a programmatic exfil channel for the decrypted model |
| **SVG draws, HTML writes** — a chart's svg holds geometry only; every word and numeral is HTML in the chart text layer at the type scale, colliders resolved from measured boxes | [§12](#12-the-chart-text-layer) | Text scales with the viewBox and renders at 6.9–10 CSS px; a lifted end-anchored dollar clips into a plausible WRONG dollar; a glyph constant leaks a text metric into drawn geometry |

---

## 1. The layer architecture

The code is split into layers with one-directional import boundaries, **enforced by ESLint** (`pnpm lint`):

```text
engine · crypto · store · intake · budget · viz · ui · shared
```

Path aliases `@engine/*` … `@shared/*` name each layer.

### `src/engine/` is PURE

The engine is **a deterministic function of `(params, seed)`**. It imports only `@shared`; it must **not** import `ui` / `store` / `intake` / `budget` / `viz` / `crypto`.

It reads **no clock, entropy, or environment**. `Math.random`, `crypto.getRandomValues`, `Date`, `performance`, and `process` are all **lint-banned inside `src/engine/**`** — those pass a weak-RNG-only lint while still breaking purity, so the ban is broader than just "no weak RNG." **The seed is injected by the caller**, never generated inside the engine. Tests under `src/engine/**` are exempt.

The same injected-dependency discipline governs the date-search: `dateSearch.ts` stays pure by taking an injected async `shouldContinue()` parameter (the same shape as the injected seed), so cooperative cancellation does not require the engine to read any environment.

### `src/crypto/`

The primitive layer. CSPRNG is **required** — `crypto.getRandomValues` for every salt, IV, and the raw data key — and `Math.random` is banned (the U0 weak-RNG lint extends to `src/crypto/**`).

### `src/shared/`

The leaf: the plaintext model (`model.ts`) and the outcome-state enum. It imports **nothing** from feature layers.

---

## 2. Determinism and Common Random Numbers (CRN)

> *Owned by the spine (`simulate.ts` / `buildDraws`); consumed by the tax overlay, the healthcare overlay, every future control, and the future solver.* This is the structural fact that lets a solver rank K candidate strategies on **identical futures** — signal, not RNG luck.

The engine is a pure function of `(params, seed)`. The seed is a single integer in `mulberry32`'s signed-32-bit domain, **injected by the caller** (never generated inside `src/engine`), and stored as a first-class field of the saved model. The seed must survive the encrypt → persist → decrypt round-trip **bit-identically**.

### The draw schedule is a pure function of dimensions only

The count and ordering of normal draws per path/year is a pure function of the **path/horizon dimensions only, never of the financial inputs**. The normals matrix is allocated to the **maximum** cohort horizon up front and indexed by **absolute year**. A fixed seed therefore reproduces a byte-identical matrix of normals **regardless of which input changes** — so financial / longevity inputs select *which* draws are consumed, never *how many* are generated or their order.

In code (`buildDraws`): one `mulberry32` stream draws in a fixed dimension-only order — all market normals first (path-major, year, stock-then-bond), then all longevity uniforms (path-major, person). The order and counts depend only on `(seed, paths, maxHorizon, peopleCount)`.

### The CRN-safe regime-shifters are an enumerated, exhaustive set

These are the inputs that change *which* draws are read but never the schedule:

> {the joint→survivor two-regime boundary, the earned-income bridge, the tax-and-accounts overlay, the healthcare overlay, the death-order conditional filter}

Each earns concrete CRN tests in its owning unit. The accumulation contribution-inflow joins this set by the same argument (it lands in existing working-year slots; it does not change a dimension).

### Stateless Box-Muller

The Box-Muller normal transform is **stateless** — it consumes two uniforms per draw and **does not cache the spare across calls**. The textbook cached-spare pattern makes the Nth normal depend on call parity, silently desynchronizing two CRN candidates that draw normals in different interleavings. No cached spare, ever.

---

## 3. The single shared market draw

> *Now more load-bearing than ever.* This makes "no asset-location" a **structural** guarantee, not a copy promise.

**All account buckets — pre-tax / Roth / taxable / HSA — share ONE market-return draw per simulated year** (the same normals stream as the spine). Buckets differ **only** in tax treatment, never in return assumption. One `(stock, bond)` return pair per path-year drives the whole portfolio.

**Per-bucket draws are forbidden.** Splitting the portfolio into buckets tempts an implementer to shock each bucket with its own draw — which would multiply draws-per-year, change the draw-schedule **dimension**, and silently break CRN (the same hazard as a forbidden separate accumulation draw stream). Tax / RMD / conversion / healthcare effects are all **deterministic post-draw arithmetic**.

If the chapter-two asset-location capability is ever wanted, it must be a **deterministic per-bucket tilt on the one shared draw**, never a separate draw.

---

## 4. The shared per-year cash-term transform seam

> *One per-year update function; everything else is a deterministic transform of the cash-flow term, indexed by absolute year, consuming ZERO random draws.*

There is **one** per-year update function the validated decumulation uses (`runDecumulation` / `stepYear`). The historical backtest oracle runs through the **same** function, so within-year order-of-operations (withdrawal vs return application vs rebalance) is shared by construction and can never drift between the spine and an overlay.

The transforms compose along the cash-flow term:

| Transform | Direction | What it does |
|---|---|---|
| Earned-income bridge | **nets DOWN** | `netWithdrawal = max(0, spending − earnedIncome)` — never credits a dead earner, never contributes surplus back |
| Tax-and-accounts overlay | **grosses UP** | tax + RMD + conversion increase the cash needed |
| Healthcare overlay | **grosses UP further** | net ACA premium / IRMAA surcharge are spending |
| Accumulation contribution-inflow | **signed inflow** | a per-bucket contribution lands in existing working-year slots, credited end-of-year at face value |

---

## 5. The reduce-to-spine invariant (byte-identity)

> The golden cases are **never** perturbed. This is the proof that an overlay adds only what it is supposed to add — no spurious delta, no engine drift.

**When an overlay is OFF it reduces byte-identically (same seed) to the Trinity/Bengen-validated decumulation distribution.** Every transform binds to this. Each unit states its own exhaustive OFF condition and owns the byte-identical test.

| Overlay | Exhaustive OFF condition (byte-identical when, and only when) |
|---|---|
| Earned-income bridge | `earnedIncome = 0` for both spouses in **every** simulated year (then `netWithdrawal == spending`). *Equal-but-future retirement years with nonzero income still net in the pre-retirement years, so retirement-year equality is **not** the golden condition — earned-income-zero is.* |
| Tax-and-accounts | buckets collapsed to one pool **AND** conversion = 0 **AND** ordinary-tax off **AND** RMD-inert (no forced distributions). |
| Healthcare | healthcare modeling off (`healthcareEnabled` absent/false) — no ACA premium, no IRMAA surcharge, no HSA bucket. **The gate is no longer ACA-synonymous** (the Medicare pricing unit, 2026-07-10): an all-65+ household enables healthcare **without** the ACA quote pair (`medicareOnlyPriced`, the intake's second enablement branch), pricing base Part B + IRMAA while ACA self-skips on its own `pre65 > 0` price gate. The Medicare-only shape carries its **own** OFF arm (enabled-false + populated Medicare inputs ⇒ byte-identical to the tax-only overlay) and presence companion. |
| Accumulation | **PRESENCE-keyed**: the accumulation construct **ABSENT** from params ⇒ byte-identical — asserted on **both** the MC `simulate` path AND the historical/Trinity backtest path. A **zero-valued-but-constructed** run is deliberately **NOT** byte-identical (the working-year withdrawal clamp is live whenever the construct is present — presence, never value, owns byte-identity). The empty phase (`Y == 0`) consumes zero extra draws and is byte-identical at the same dimensions. |

**Presence companion (burned/027).** Every reduce-to-spine absence-assertion is paired with a presence companion that proves the overlay actually did its work in the ON case (a path that paid RMD-forced tax / a net premium / a surcharge / a grown total). An absence-test without a presence companion can pass vacuously.

### Externally-derived fixtures (DND 012)

A golden value computed via the engine's **own formula** proves typing, not correctness. **Derive Trinity / Bengen / tax / ACA / projection expected numbers by an independent path** — a hand-compounded spreadsheet, a separate published figure — never via the engine's own arithmetic.

---

## 6. The R19 numeric gate (`validateParams`)

> The engine guards its own numeric domain; semantic plausibility (status-vs-age, spend-beyond-portfolio) is the intake/control-layer half, owned upstream. Neither layer assumes the other validated.

The worker boundary is **untyped** (structured clone), so every incomputable input is rejected at `validateParams` before any path runs. The discipline:

- **Finiteness FIRST.** A `NaN` passes every relational and `??` guard (insights 008/010), so finiteness is checked **before** any relational or default guard. No `NaN`/`Infinity` escapes a percentile or headline.
- **`ENGINE_MAX_*` domain bounds** close the float-overflow tail (insight 028): dollars ≤ `ENGINE_MAX_DOLLAR = 1e12` · return/vol moments ≤ 1.0 · horizon ≤ 120.
- **A non-integer seed is rejected** as indeterminate.
- Degenerate-but-coherent inputs return an **honest extreme** (or the defined indeterminate state), never a crash — e.g. a `$0` portfolio with positive spending is the honest `already-failing` / "0 of N" outcome, and an accumulation construct with `initialPortfolio == 0` is rejected as indeterminate.

Where an overlay has its own internal throw (a fail-loud backstop), it has a **`validateParams` mirror** — the two-layer R19 discipline — so an input that would later throw is caught at the gate. (Worked example: the `irmaaMagiSeed` coverage arm nests inside the `healthcareEnabled` block, so the Medicare-only enablement branch — which opens that same block — inherits the mirror structurally: an all-65+ run with an absent seed returns the calm indeterminate, never the overlay's mid-path throw, mutant-proven. Insight 076's sweep discharged by construction.)

---

## 7. Per-overlay engine contracts

These are the load-bearing details inside each overlay. They live here so a future engineer touching one overlay does not rediscover its traps at runtime. The tax (§7.1), healthcare (§7.2), store (§7.3), accumulation (§7.4), and solver-output (§7.5) contracts sit alongside two pure engine components computed *pre-loop* — the longevity / joint-survivor model (§7.6) and the Social Security sub-engine (§7.7) — whose output the per-year transforms then consume.

### 7.1 Tax-and-accounts overlay (`taxOverlay.ts`)

The structural sibling of the earned-income bridge: a per-year deterministic transform of the cash-flow term, indexed by absolute year, fed into the **same** per-year update function, consuming **ZERO** random draws. The bridge nets down; the overlay grosses up.

- **Per-person buckets: pre-tax / Roth / taxable.** Ordinary-income tax on pre-tax withdrawals + RMDs + the conversion; tax-free Roth growth; capital-gains / qualified-dividend stacking from taxable withdrawals. All buckets share the **one** market draw — tax/RMD/conversion are post-draw arithmetic. The per-person pre-tax ledger sums to `buckets.pretax` (the no-parallel-ledger-drift contract).
- **The gross-up fixed-point.** Spending → tax → the gross-up withdrawal needed to cover spending + tax → which moves the tax: a circularity resolved as a bounded fixed-point. The worst-case contraction factor is **k ≈ 0.78** — ~0.685 raised by cap-gains stacking (insights 006/007), then lifted ~+0.04 by the state-tax addend (the state term rides *without* the ×1.85 SS-torpedo multiplier because NC/PA exempt SS; a flat state lifts every regime's k equally and can never re-order corners — `taxOverlay.ts:466-490`). `GROSS_UP_MAX_PASSES = 192` covers the validated tail, stress-swept **state-ON at the federal-worst corner** (small-net × low-basis × large-SS × NC — a state-OFF probe samples the benign regime, insight 006's trap). *(Updated 2026-07-18: the pre-state-tax figures — k ≈ 0.74, 128 passes — were stale against the shipped state-tax unit, c7e5936c 2026-07-15.)* No in-range default ever stands in for an unconverged value — it fails loud (burned/062).
- **State income tax joins the SAME fixed point for the priced roster {NC, PA, FL} (the state-tax unit, council wf_d04148cb-1e5, 2026-07-15).** A pure per-state family (`stateTax.ts`) enters as a **second addend inside** `solveGrossWithdrawal` — never bolted on after convergence. Membership-gated reduce-to-spine: absent / `'elsewhere'` / any unbuilt state takes the **literal `+ 0` branch structurally** (byte-identical to the golden spine — a truthy-key call-then-zero would perturb float lineage). Conversion pricing is per-state and **ranking-relevant**: NC taxes the full conversion at its flat rate, which **steps by year** on the enacted S.L. 2026-41 § 44.1(a) schedule (2026 3.99% · 2027–2029 3.49% · 2030–2032 3.24% · 2033+ 2.99% — pinned 2026-08-02, retiring the hawk veto's held-forward 3.99%; the rate lookup consumes the tax year, so an overlay that froze it at t=0 misprices every out-year); PA qualified-age (≥59.5) conversions cost $0 (under-59.5 taxed — the conservative arm) while taxable-account gains are always taxed; FL is a sourced constitutional $0. State stays **OUT of the bracket-fill ceiling rails** while every priced state is flat-or-zero — a standing constraint that **reopens the moment a graduated state joins the roster**. State tax folds into `taxPaidThisYear`/`totalTaxPaidReal` (one lifetime-tax lens, no parallel ledger).
- **The deduction stack carries dated, sunsetting provisions — and the engine PRICES the dates.** Standard deduction + the age-65 additions (§63(f), keyed off the biological `count65`) + the **OBBBA-2025 senior bonus** with its MAGI phase-out. The senior bonus prices **only in calendar tax years [effectiveFrom .. sunsetAfter] = [2025 .. 2028]** (the sunset unit, council-ratified 2026-07-09, shipped same day — it closed the filed U13 gap where every sim year credited the bonus, an optimistic ~$12k/yr MFJ mispricing for 2029+). The window's ONE home is the constants entry's `effectiveFrom`/`sunsetAfter` metadata (§8), consumed by `taxCore.seniorBonusFor(filing, count65, magi, calendarYear)` behind a fail-loud guard and pinned symmetrically in the shape test — the sim year's calendar (`startCalendarYear + t`) threads through `deductionStack`/`ordinaryIncomeTax`/`ordinaryPlusCapitalGainsTax`, `CommittedYearIncome` (the magiLandscape rails), `GrossUpContext`, and the UI shadow-rate readout (`healthSheetChrome` — the same `yearsIn` clock as its `count65`, the single-producer contract). DND-012 batteries pin the statutory edges on both ends, the gain-shelter channel, and two full-solver crossings (the gross-up step at exactly t=2029 and the bracket-fill ceiling→ledger shift). The staleness layer deliberately carries NO sunset-crossing note (the save already priced the calendar-deterministic sunset; a post-2028 re-open recomputes byte-identical — `staleness.ts` header has the law).
- **SS provisional-income taxation** (IRS §86 / Pub 915 Worksheet 1) is its own per-year bounded fixed-point (iterate provisional-income → taxable-SS → tax → gross-up → re-converge), deterministic, reading zero draws. It **consumes the per-year benefit dollar surfaced by the SS sub-engine (§7.7) and never re-derives the benefit from PIA** (a test asserts this, so provisional income stays correct by construction; a future muni-bond bucket is the single §86 change site). The MFJ/single thresholds are **frozen, not inflation-indexed** — $32k (1983) / $44k (1993) constants with no staleness clock; a frozen constant cannot go stale, which is *why* more retirees are caught each year (modeled honestly, not a bug).
- **RMD age is birth-year-derived, never a flat 73** (SECURE 2.0): 72 (≤1950) / 73 (1951–1959) / 75 (1960+). RMD = the IRS Uniform Lifetime Table divisor on the prior-year-end pre-tax balance. RMD is a **forced-distribution mechanic, not a tax** — "taxes off" alone does not silence it. The RMD is **non-convertible** (it must be distributed first, cannot be reduced by a conversion) — a hard legality constraint the manual control and solver consume.
- **MFJ→single switch at the sampled first death = the joint→survivor two-regime boundary** (NO new boundary). No QSS grace — files single the year after the first death. The survivor's same real dollars fall into ~half-width single brackets with ~half the standard deduction: the "tax cliff" that is the recommendation's emotional headline.
- **§1014 basis step-up is IN, not omitted** — it moves with the lever (which account is preserved into the estate), and a disclosed omission can *invert* the after-tax ranking. A first-order §1014/IRD adjustment is modeled into the future *leave-more* objective at a disclosed assumed heir bracket. The overlay's job is to expose the per-bucket basis/character (taxable basis, pre-tax IRD, Roth tax-free); the full estate model is chapter-two.
- **Both candidate arms run at identical tax fidelity** — there is no tax-blind arm. A tax-blind delta is sign-inverted (it sees only the cash drain of paying conversion tax, so every conversion looks worse).

### 7.2 Healthcare overlay (`healthOverlay.ts`)

Income-dependent and continuous across the Medicare line. Composes **after** the tax overlay on the shared cash-term seam (ACA premium / IRMAA surcharge are spending the tax gross-up does not include). Built and validated in the engine because a disclosed omission of a cliff **inverts which strategy wins** — the solver may not optimize over a healthcare effect it cannot see.

- **Two distinct MAGI calculators — do NOT reuse one number.**
  - **ACA-MAGI** = AGI + tax-exempt interest + **non-taxable SS** + excluded foreign earned income (the **full** SS benefit effectively counts).
  - **IRMAA-MAGI** = AGI + tax-exempt interest, **NO SS add-back**.
  - Qualified Roth distributions, return of basis, cash, and HSA qualified spending count toward **neither** — which is exactly why the funding-source order (sequencing) is a control.
- **Pre-65 ACA-PTC as a per-year fixed-point with an EXPLICIT cliff branch.** `PTC = max(0, SLCSP_benchmark − applicable_pct(FPL%) × ACA-MAGI)`; `allowed_PTC = min(PTC, enrolled_premium)`; `net_premium = max(0, enrolled_premium − allowed_PTC)`. **Enrolled premium and the SLCSP benchmark are two separate inputs** (a sub-benchmark Bronze plan must not yield negative net). The primary solver is a **bisection on a monotone funding-gap residual** (the map is non-smooth — the `max(0,·)` floor, the cliff, band kinks, SS-torpedo and LTCG-stacking kinks). The **400% FPL cliff is detected and branched explicitly** — a naive iterator oscillates across it; compute the just-under (constrained, may be **infeasible**) and just-over (PTC = 0, direct linear) solutions and pick the cheaper, never relying on smooth convergence over the discontinuity. (The cliff compare CEIL-quantizes float MAGI before the relational branch, the same cross-engine idiom as the headline.)
- **2026 base case = the 400% FPL cliff is ON** (enhanced subsidies expired 12/31/2025, unre-enacted). "Enhanced subsidies" is a **scenario toggle** (a model field), never hard-coded. The legislative status **gates all ACA fixtures and is re-verified at every build** — see §9.
- **The SLCSP benchmark premium is a USER INPUT** (ZIP/age-specific), never synthesized. The benchmark covers only the marketplace-enrolled member(s).
- **IRMAA = a 2-YEAR-LAGGED feed-forward, NOT a fixed point.** Store a per-filing-unit MAGI history; in year *t* look up the bracket from **IRMAA-MAGI[t−2]** and add the surcharge (Part B + Part D) **× the count of spouses currently Medicare-enrolled** — never a hardcoded ×2. Hard per-person step-cliffs ($1 over → the full bracket surcharge). The MAGI[t−2] history must be **seeded from real inputs** when the sim starts within 2 years of age 65 — never defaulted to zero (burned/062 fail-loud). Pre-65 and post-65 are **not** mutually exclusive at the household level: in age-gap years one spouse runs the ACA fixed-point (current-year MAGI) while the other runs the IRMAA feed-forward (MAGI[t−2]); the overlay evaluates each spouse's regime independently per year and sums.
- **Two enrolled-count clocks (`resolveYear`).** A per-person Medicare-**enrolled** count is a sibling field beside the biological `count65`. Only the IRMAA gate and the IRMAA pricing count switch to the enrolled count; `count65` stays biological for the deduction stack and the ACA `pre65` check. The enrolled count intersects the **living** set — a dead spouse is never billed.
- **HSA as a 4th account bucket.** Triple-advantaged, earmarked medical. Covers out-of-pocket + (**owner 65+**) Medicare premiums tax-free — **NOT ACA marketplace premiums** in the normal case (the trap). **Medicare enrollment ZEROES HSA contributions** (keyed to the **owner's** age, not the spouse's; the 6-month Part A retro-lookback trap). HSA qualified-medical spending is **MAGI-invisible to both calculators**, capped at the year's qualified-medical cost (a modeled out-of-pocket-medical stream + owner-65+ Medicare premiums). A **post-65 non-qualified withdrawal is ordinary income that RAISES both MAGIs** — it is not a loop-breaking source (the income-laundering negative test). It shares the one market draw like every other bucket.
- **Couple / death-order interaction.** On the first death the survivor flips MFJ → single thresholds (~half) — but the two regimes flip on **different clocks**: the ACA-FPL basis flips to single **in the year filing status changes** (current-year, immediate), while the IRMAA side applies the threshold table matching the filing status of the MAGI[t−2] return, so the single IRMAA table first bites **~2 years after** the first death. Wired into the death-order conditional filter — no new boundary.
- **The pricing DOMAIN is two intake branches, one engine gate (the Medicare pricing unit, council wf_4c8cd836-b22, 2026-07-10).** `buildOverlay` sets `healthcareEnabled` iff `healthcarePriced` (the ACA quote pair + a pre-65 member) **OR** `medicareOnlyPriced` (all ages known, none < 65 — the streamless all-65+ shape; the ACA price gate's `pre65 > 0` self-skips, so only Medicare prices). `dateSearch.buildCandidateParams` is a **second producer** of the flag — it forces `healthcareEnabled: true` on every candidate. Consequently any UI mirror of "was Medicare priced this run" must key off the **route-aware pricing decision**, never ages or one producer's gate (insight 080 — the retired age-keyed `medicareUnpriced` predicate was a live false statement on the date route).
- **The containment premise is RATIFIED and additive** (the U9a-medical-fence class question, closed): the household's entered spending figure **EXCLUDES the Medicare Part B premium and its IRMAA surcharge — the tool adds them on top** (`fundingNet = net + medicareCost`), exactly as it already excluded ACA premiums; OOP medical — **and the rare PURCHASED Part A premium, which the engine deliberately does not price** (`healthOverlay`'s `medicareAnnualCost` scopes it out by name; `health.partA2026` sits in `consumedConstants`' `NOT_RUN_CONSUMED` as a parked reference figure) — live **INSIDE** the entered spending. ⚠️ **Part D / Medigap / Medicare-Advantage premiums used to be named here as inside-the-spending and are NOT** (corrected 2026-08-02, Caddie Card 10(b)): the ask-for-Medicare-extras unit moved them OUT and on top (user-supplied per person, priced via `medicareExtrasMonthly`), and `spendHelp` has said so since that unit shipped — this bullet simply never caught up, so the canonical invariant contradicted shipped copy. The intake spend copy carries the whole boundary in words (`spendHelp`), and the pairing is now test-bound: the ask must carve Part A out of the leave-out set AND the verdict must keep pointing it at the spending figure, so neither can drift alone, and SS stays **gross** (the FRA statement figure — no premium netting anywhere on the income side). Omission was the optimistic cardinal sin; a user-side double-entry is pessimistic-safe (insight 055's composition).
- **Part B is priced TRENDED (the Medicare-cost-trend sourcing unit, 2026-07-19 — council wf_c673339e-257; the former real-flat solver-block is CLOSED).** `PART_B_PRICING_MODE: 'trended'` (taxOverlay): each sim year's base Part B premium comes from `buildPartBPricingSchedule` over the sourced `medicareCostTrend` table — shape (c), the year-keyed primary table (2026 Trustees Table V.E2 nominal verbatim 2027–2035, one home for the 2026 anchor in `partB2026`), deflated in-engine HORIZON-MATCHED (the 3.2%/yr near-term CPI average on the near decade, never the 2.4% ultimate), with the ultimate real escalator ((1.038/1.024) − 1 ≈ +1.37%/yr) beyond the table edge (C0-continuous splice, test-pinned) and a conservative pre-anchor CLAMP (an aged vault's 2024/2025 year-0 prices the anchor — no new refusal domain). The shape was **rank-flip-probe-gated** (the spec's S3 stamp: no flip vs the smooth two-regime twin on a step-straddling conversion field; the 013 root-finder fallback never fired). **The IRMAA surcharge is DISAGGREGATED (the hawk-honored scope):** the Part B surcharge scales with the trended base via the statutory cost-share identity (tier totals = {35/50/65/80/85}% of program cost vs the base's 25% ⇒ surcharge ∝ base, exact 2026 tie-out at scale 1); the Part D surcharge and the medicare-extras vector are **held at anchor scale, DISCLOSED** (the residual names the still-flat set — never silently frozen, never ridden on Part B's ratio). Consumption is the U14 token's trend-clause OTHER half (insight 074): the conversion ranking unblocked in the SAME change (the lying-mirror pair, insight 081). The annual Trustees re-verify tripwire (`medicareTrend.reverify.tripwire.test.ts`) reds each ~Sep 1 after a new report; the `part-b-trend` staleness clock fires on saved vaults at each vintage bump; the 2028 IRMAA top-tier tripwire stands separately.

### 7.3 Encrypted local store + key lifecycle (`src/crypto/`, `src/store/`)

The trust layer. Makes the at-rest promise provable.

- **PBKDF2-600k → AES-GCM-256.** `importKey` the passphrase → `deriveKey({PBKDF2, salt, iterations: 600000, SHA-256}, …, {AES-GCM, 256}, extractable:false)`. Keys live in memory only, never persisted unwrapped (passphrase-each-session). Every 600k derivation renders an explicit calm "unlocking… / securing…" pending state (the work may run off the main thread but that is implementation-dependent, not guaranteed).
- **Data-key (DK) indirection — one write predicate.** A stable random **data key (DK)** encrypts the model exactly once; the passphrase-derived key and the recovery-derived key each **wrap DK independently**. There is exactly **one** copy of the model, so the recovery path can never restore a *stale* copy — the worst failure for a survivor product. "Wrapping" DK = **AES-GCM `encrypt()` of the raw DK bytes**, **not** WebCrypto `wrapKey()` (which would require `extractable:true` and let an injected script `exportKey` it). DK is imported `extractable:false`.
- **Synchronous lock authority / the write-gate conjunction (one predicate, both clauses).** A writable store handle requires **a derived session key AND a current `passphraseWrap`** — bound into the **same** seam, not two rules. The recovery-unlock path is exactly why both clauses are needed: it derives a key and decrypts the model, yet writes must stay blocked until the new `passphraseWrap` is re-minted (otherwise the survivor could silently degrade the vault to recovery-credential-only access). There is no reachable cleartext / unkeyed / stale-credential write path.
- **Three record types**, each wrap carrying its own fresh salt + IV: `model` `{iv(12B), ciphertext}`; `passphraseWrap` `{salt(16B), iv(12B), wrappedDataKey}`; `recoveryWrap` `{salt(16B), iv(12B), wrappedDataKey}`. The plaintext begins with an integer `schemaVersion` (= 1 from v1) read before any other field; decrypt branches/refuses on an unknown version (the migration ladder enabler: v1→v2→v3).
- **Recovery credential derivation (the U8 rework, council 2026-06-30 — supersedes the v1 BIP-39 design).** The recovery credential is a **second user-chosen memorable passphrase** (the system-minted BIP-39 12-word phrase was DOA for this non-technical audience). It carries the same low entropy as the daily passphrase, so it gets the **same PBKDF2-600k password-stretching — there is no separate primitive**: the `recoveryWrap` is minted by `deriveNewPassphraseKey` (floor-gated — the same zxcvbn-ts score ≥ 3 AND length ≥ 12 floor) over the wrap's own fresh 16-byte salt, and opened by `derivePassphraseKey` on the recovery-unlock path. The per-wrap CSPRNG salts supply the domain separation the old HKDF `info` string provided. The two credentials are held **distinct** (`firstSave` rejects recovery == daily) so a guessed daily passphrase does not also open the off-device export — but this is an **equality check, NOT independence**: two human-chosen secrets are correlated where the old 128-bit phrase was not (the entropy downgrade the Save ceremony discloses).
- **Numeric never-depleted sentinel — never `Infinity`/`NaN`/`null`** (DND 009). `JSON.stringify` / IndexedDB silently turn `Infinity`/`NaN` into `null`. The engine's "never depleted" outcome persists as an explicit out-of-domain integer (`NEVER_DEPLETED = -1`) or a tagged-union discriminant; a bare `null` is corruption, not never-depleted.
- **Honest lock (no zeroization overclaim).** JS/WebCrypto cannot byte-scrub a `CryptoKey` handle or a string. On lock the session **drops its only references** and forces a fresh re-derive — *reference-drop + mandatory re-derive*, **not** cryptographic zeroization. No downstream copy may overstate it.
- **Atomicity + durability.** Every multi-record mutation commits as one IndexedDB transaction (all-or-nothing). The encrypted write commits **before** `navigator.storage.persist()` (whose boolean is advisory and never rolls back a save). The passphrase-strength floor — `zxcvbn-ts` score ≥ 3 AND length ≥ 12 — is the **real** at-rest security boundary, because the meaningful attacker is offline (they hold the blob and brute-force PBKDF2; no UI lockout defends against them).

### 7.4 Accumulation projection (`decumulation.ts`, `taxOverlay.ts`)

> See the permanent decision record: [docs/decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md).

- **One continuous timeline — no new draw stream.** The contribution inflow occupies the existing working-year slots `[0, Y)` on the **same** `buildDraws` stream; `buildDraws`/`maxHorizon` are unchanged, so CRN across candidate offsets and the empty-phase byte-identity hold for free.
- **`stepYear` is the ONE crediting owner.** The contribution is credited **END-OF-YEAR at face value** (a contributed dollar earns no growth in its arrival year — the conservative direction; full-year crediting would overstate the retirement-onset balance → a falsely-early date, the calm-but-wrong-optimistic sin). The overlay fold is **AFTER the bucket-scale, at face value**: the scale reads `StepResult`'s growth-only (contribution-excluded) total, then `buckets[dest] += C_dest`, plus the per-person pre-tax-ledger owner credit for living owners; a taxable contribution raises basis at full value (after-tax dollars → basis), never growth-scaled. The contribution never enters the draw pool, the RMD forced-excess base, or the basis denominator. Employer match → pre-tax even on a Roth 401k.
- **The working-year clamp is death-aware and presence-gated.** `cashTermsForYear` clamps the household net to **0** iff the accumulation construct is present AND at least one **living** person is still working — a death-blind clamp would flip survivor paths optimistic. Each person's contribution stream is death-truncated per-path.
- **No accumulation-phase income-tax engine** (the destination bucket carries the tax character). **Healthcare is OFF during accumulation** — delivered by the date-search's per-candidate stream construction (premiums zero in `[0, Y)`), **not** an engine gate.

### 7.5 The solver output contract (M6)

The engine exposes the surfaces a future solver and the wire layer consume:

- **The distribution itself, not a pass/fail bit.** The engine emits the **full terminal-value distribution + percentile series + per-path depth-of-failure** — a `$1`-remaining "success" binary hides magnitude. `confidence.ts` reads this into the humanized `X of 10` (R2's "probability of adjustment" dollar-grammar feeds off the distribution, R3) — never "probability of failure."
- `totalTaxPaidReal` — lifetime tax paid, the *pay-less-tax* objective input.
- The per-path death-year `Distribution.taxAware` surface.
- The typed `SimInfeasible` sentinel — the input passed R19 but a path's overlay computation failed mid-run (gross-up cap, ACA bisection, a fail-loud backstop). The **candidate** is infeasible as a whole — **never** a silently dropped path (the dropped class would be exactly the aggressive near-cliff candidates) and **never** an uncaught throw (which would abort a future K-candidate batch). A solver ranks it WORST; the headline route surfaces a calm error; the date route fails the run all-or-nothing. All fields are JSON-safe (they cross the worker wire); deterministic in `(params, seed)`.

### 7.6 Longevity & joint-survivor sampling

> The horizon is a sampled distribution, not a fixed age. Survivor identity is retained because the survivor's SS, spending ratio, and tax cliff all depend on *which* spouse lives.

- **Cohort tables, sex-specific, never one rate for both.** Joint-and-survivor longevity is derived from the two **sex-specific cohort** (not period) life-table curves: `P(last alive) = pₓ + pᵧ − pₓ·pᵧ`. The couple survival figure is **derived through the formula, never hardcoded** — a test asserts internal consistency against the two shipped curves. Independence is assumed, which *mildly overstates* last-survivor probability — it **errs SAFE for a survival floor** and is documented. **Never a fixed to-age-90 horizon.**
- **Sample per-path per-spouse death years AND retain which spouse dies first.** The two-regime horizon (joint → survivor) is the boundary the MFJ→single switch (§7.1), the survivor SS step-down (§7.7), and the death-order conditional filter all key off — **no new boundary** is ever introduced for these; they share this one. The survivor keeps the larger benefit (`Math.max(ownStream, survivorStream)` in `simulate.ts`) and the survivor-spending ratio applies.

### 7.7 Social Security sub-engine

> A **pure** `(PIAs, claim ages, birth years) → per-person annual-benefit-stream` function, computed **once pre-loop** into `PersonOffsets.socialSecurityReal`. It consumes **zero draws** and is **CRN-invariant across date-search candidates** (the sweep shifts a claim *offset*, never a claim *age*). The decision rationale + the deferred branches are recorded in [docs/decisions/ss-computation.md](decisions/ss-computation.md); the load-bearing mechanics are here.

- **The orchestrator `householdBenefits(people)` (`socialSecurityBenefit.ts`) runs once pre-loop** with three components by time-shape: (1) **own** → a resolved per-person scalar that *replaces* `socialSecurityReal` (a value reinterpret — `cashTermsForYear` and the ~10 literals are unchanged); (2) **spousal excess** → a time-gated term; (3) **survivor** → a per-path selection.
- **Own benefit:** early-reduction + delayed-retirement credits as **exact integer fractions** off the month-count from claim age.
- **Method C spousal excess (POMS RS 00615.020):** `total = reduce_own(own_PIA) + max(0, reduce_spouse(0.50 · worker_PIA − own_PIA))` — **own + reduced-excess, NOT `max()`**. Own and excess use **two SEPARATE reduction schedules off the SAME month-count**: `reduceSpouseExcess` factor = `n ≤ 36 ? (144−n)/144 : (180−(n−36))/240` → at 62 vs FRA 67 that is `156/240 = 0.65`. The excess is **floored at 0**; the spousal base is the worker's **UNREDUCED** PIA; there is **one spousal direction per household** (the lower earner claims on the higher earner `H = argmax(pia)`); and the excess is **$0 until the worker has FILED** (worker-must-be-entitled START gate, POMS RS 00202.001 — a temporal gate in the path loop, not a static scalar) and returns to **$0 at the FIRST death of either spouse** (END gate — the §202 survivor benefit owns Social Security from then, `simulate.ts`; omitting it double-counts guaranteed income).
- **Deemed filing:** a **single `claimAge` per person drives BOTH own and spousal** (no restricted application — both modeled cohorts are post-1954, fully subject); a test asserts no separate spousal claim age. The **survivor branch is the lone independent-timing exception**.
- **Survivor §202:** when the first death occurs, the survivor's SS each year = `max(ownStream, survivorStream)` — a **legitimate larger-of** (alternative entitlements), unlike the additive `own + excess` spousal (using `max()` there would be wrong). `survivorBenefitFull` = the deceased's **ADJUSTED** benefit including **DRC flow-through** (RS 00615.301/.702), capped by **RIB-LIM** at `max(0.825 · deceasedPIA, deceasedActualReducedBenefit)`.
- **Survivor LOCK-FLAT (cardinal-rule-load-bearing).** The survivor stream starts at `max(age 60, first-death year)`; its reduction factor is **LOCKED at the survivor's age at that start and held FLAT** for the rest of the horizon — it **does NOT ramp** toward 100% as the survivor ages. The `71.5%@60 → 100%@survivor-FRA` schedule is over the **claim age**, not a post-claim ramp. A per-year ramp would optimistically overstate guaranteed income on early-widowhood paths — the calm-but-wrong sin.
- **`realizedClaimAgeAtDeath` seam guard.** `realizedClaimAgeAtDeath(plannedClaimAge, birthYear, ageAtDeath) = max(min(planned, ageAtDeath), ⌊FRA⌋)`, applied in the seam to realize the deceased's claim age before constructing the survivor benefit: capping at age-at-death **strips unearned DRCs**, while the FRA floor keeps an **unfiled pre-FRA death on full PIA** (no spurious early reduction). Exact for a whole-year FRA (both cohorts = 67), sub-one-year conservative for a fractional-FRA cohort. Pinned by externally-derived goldens (the integration dollar is `$19,587.60`, vs the pre-fix buggy `$22,490.40`).
- **The cash seam is untouched.** `cashTermsForYear` (`simulate.ts`) sums `o.socialSecurityReal` per claimed-alive person and the survivor takes `Math.max(ownStream, survivorStream)`; the sub-engine **changes only the dollar landing in `socialSecurityReal`** (plus the excess/survivor streams), never the seam — so the §86 provisional-income layer (§7.1) is correct by construction.
- **Reduce-to-spine.** All-PIA-zero ⇒ own 0, excess 0, survivor `max(0,0)=0` ⇒ **byte-identical** to the prior `socialSecurityReal = 0` Trinity/Bengen spine. A companion **identity bridge**: a nonzero PIA claimed at FRA 67, single earner, no spouse (factor 1.0, no excess) must be byte-identical to a pre-sub-engine `socialSecurityReal = that-same-$` run — because the zero-maps-to-zero test exercises *none* of the reduction/excess/survivor branches.

---

## 8. Constants discipline (`src/engine/constants/`)

> One canonical table; everything reads it; nothing re-types a dated figure.

- **ONE canonical, year-keyed table** (burned/057,061,063). Plan, overlays, tests, and the copyGuard allowlist all **read** it — a dated figure is never re-typed elsewhere (a shape test greps for inlined values). The spine reads **nothing** from this module (the spine is tax-free), so a constants change can never perturb a golden case.
- **Every figure carries `{ value, citation, directionalUntilPinned }`.** A figure is "pinned" (`directionalUntilPinned: false`) only after confirming against the named primary at the exit-gate pin pass.
- **Every STILL-directional entry carries a `directionalKind`** (U14 S0, shape-test-enforced): `certification-pinnable` (a dated pin event exists) **BLOCKS the consuming household's oracle-cleared token** until the event pins it — the canonical instance was the NC out-year rate, **pinned 2026-08-02 by S.L. 2026-41, so NO live entry is certification-pinnable today**; the mint's blocking leg is consequently seam-driven (`_pinningOverride`), the same posture the Medicare-trend leg took when its clause cleared (insight 048 — a clause that clears must grow a seam or deleting its leg stays green forever); `methodology-substrate` (no dated event — `productionMarket`, `survivorSpendingRatio`, ε's calibration context) never blocks — the grade ships difference-keyed with the level DISCLOSED. Flipping a substrate flag to clear a gate is a REJECT (laundering). The token's consumed-set walk (`src/engine/validation/consumedConstants.ts`) derives per-run membership from the built params — import-audited and source-bound, never a hand list.
- **No in-range default fallbacks** (burned/062): a figure the research names but doesn't value is an `Unsourced` sentinel whose `.value` **throws** — never a plausible default. A `?? 22%` default that overlaps a plausible bracket makes a missing input indistinguishable from a measurement, which is fatal inside the SS-tax / ACA fixed-points.
- **The ACA legislative entry carries `reVerifyEveryBuild`** and is gated in CI by `verify:aca` (see §9) — it can flip the whole pre-65 model and invert which strategy wins.
- **Dated, sunsetting provisions carry a sunset marker — and the ENGINE consumes it.** A figure scheduled to expire (e.g. the OBBBA-2025 **Senior Bonus Deduction**, tax years 2025–2028) is year-keyed with its legal basis **and** an explicit availability window (`effectiveFrom`/`sunsetAfter`), so a bracket/provision change reads as a vintage bump rather than silent drift. The honesty obligation of R14/R22 lands **in the pricing, not in a note** (U13 ultramode, 2026-07-09): a "calm note at the sunset crossing" was refuted — the crossing changes nothing about a correctly-priced saved answer, and a note over an UN-modeled sunset asserts a re-pricing that never happened. The senior-bonus consumption SHIPPED 2026-07-09 (the sunset unit, §7.1): `seniorBonusFor` prices the window behind a fail-loud guard, both ends symmetrically shape-pinned; the build tripwire retired with it. The RMD age is the same shape — a per-person function of birth year (72 / 73 / 75, with the legislated 2033 step) the engine consumes directly, never a hardcoded literal.
- **Persisted "never-depleted" sentinels must be a numeric value** (e.g. `-1` / a max-horizon year), **never `Infinity`/`NaN`** — `JSON.stringify` / IndexedDB silently null them (DND 009). (Stated here and in §7.3 because it spans both the constants and store layers.)
- **Display-hint figures vs engine figures.** User-facing display-hint figures live in `referenceData.ts`, never `@engine/constants` (the constants module is engine-consumed only).

---

## 9. Cross-engine headline robustness

Plain-TS transcendentals (`exp` / `log` / `pow`) are **not bit-identical across JS engines** (an IEEE-754 reality) — byte-identical normals + a byte-identical raw distribution is a **same-JS-engine** guarantee only. So the *displayed* headline must not depend on bit-identical floats:

**`confidence.ts` quantizes the headline-determining statistic to a coarse grid (`SURVIVAL_GRID = 0.01`, well outside last-ULP noise) BEFORE the band-edge decision.** `quantizeSurvival(s) = round(s / GRID) * GRID`, then the band compare. A user who screenshots an `X of 10` in Chrome and reopens the PWA in Safari sees the same headline even though the raw percentile may differ in its last ULP. The quantization, not bit-identical floats, keeps the screenshot promise honest.

The date-search reuses the **same** idiom: the conservative lower confidence bound (`p̂ − z·SE`, `z = 1.645` one-sided) is `quantizeSurvival`-ed before the bar compare, the bar being `BANDS.onTrack` (read, never re-typed). Paths are pinned at 16,000 on the FINAL tier (`DATE_SEARCH_PATHS.final`; the provisional tier runs 2,000 and never reaches the bar compare) so `z·SE ≤ ½·SURVIVAL_GRID` at the bar — the haircut moves the quantized reading at most one grid cell, a designed bounded effect. A true cross-engine bit-identical requirement is the concrete trigger that would promote WASM from fast-follow to load-bearing (see §10).

Note: **rounding hysteresis** (sticky cross-edit rounding) is a *stateful* property — it needs the prior displayed value — and lives in the P2 recompute orchestration (`memoryModel.ts`), **not** in pure `confidence.ts`. `confidence.ts` is pure (single run → reading) and emits margin metadata so a stateful caller can layer stickiness.

---

## 10. Security / CSP boundary

Strict CSP ships via **HTTP response headers** (`vercel.json`), **not** a meta tag:

- `script-src 'self'` (no inline / eval — Vite's modulepreload polyfill is disabled, `injectRegister:false`, so this holds)
- `connect-src 'self'` · `worker-src 'self'`
- `object-src / frame-src / child-src / media-src 'none'` · `base-uri / frame-ancestors 'none'`

A vitest regression guard asserts the directives (`scripts/__tests__/csp-headers.test.ts`). Real browser **enforcement** is CI-gated by `pnpm verify:csp` — `e2e/csp.spec.ts` serves `dist/` through `scripts/serve-dist-with-headers.ts` with `vercel.json`'s exact headers (`vite preview` does **not** apply them) and asserts a real Chromium blocks an injected inline `<script>` AND a cross-origin `fetch` exfil (`connect-src`), while the engine worker still constructs under `worker-src 'self'` — each with a no-CSP control arm proving the assertions aren't vacuous.

### What `connect-src 'self'` actually buys

It blocks **programmatic** network exfil (fetch / XHR / WebSocket / EventSource / beacon); `img-src` / `form-action` close the image / form channels. It does **not** block top-level **navigation** exfil (`location.href = …`, `window.open`) — CSP cannot, and that is an accepted residual for the personal single-device model (an XSS foothold is already heavily constrained by `script-src 'self'` + no-eval + `react/no-danger` + a deliberately narrow dep surface).

### Scope and caveats

- **Extensions are out of scope.** The CSP guards the in-session decrypted model against XSS-injected page scripts, **not** browser extensions — extensions run privileged and can read the page heap. Accepted risk for a personal single-device tool.
- **Self-hosting caveat (corrected).** What protects the in-memory model + IndexedDB from a DNS-rebinding attacker is the **Same-Origin Policy** (an attacker origin is never the app's origin), **not** `connect-src`. If ever self-hosted on `localhost` / a LAN hostname, the real controls are **Host-header validation** on the server and correctly answering the browser's **Private-Network-Access preflight** (PNA is a browser-driven preflight the local server responds to — not a header the app simply "adds").

### CSP forward landmines (do not rediscover at runtime)

- **Trusted Types is a planned hardening (the scenario-import sink risk), NOT a drop-in.** `require-trusted-types-for 'script'` **breaks `new Worker(new URL(…))`** — the Worker constructor requires a `TrustedScriptURL`, so the engine worker fails to construct and the app renders nothing (verified). To adopt it: mint the worker URL through a `trustedTypes.createPolicy(...).createScriptURL(...)`, allowlist that policy via a `trusted-types` directive, and roll out behind `Content-Security-Policy-Report-Only` first.
- **WASM will need `'wasm-unsafe-eval'`.** If the engine is ever promoted to WASM (the cross-engine-determinism trigger of §9), `script-src 'self'` blocks `WebAssembly.instantiate` of fetched bytes in Chromium — add `'wasm-unsafe-eval'` to `script-src` at that point.
- **motion's injected `<style>` may hit `style-src 'self'`.** `motion@12` animates via CSSOM (fine), but its layout-animation features inject a `<style>` element (hence `<MotionConfig nonce>`). When animation lands using those features, supply a per-response nonce to both `style-src` and `<MotionConfig>`, or avoid the style-injecting features.

---

## 11. The worker boundary

The engine runs in `engine.worker.ts` behind **Comlink** — a **single long-lived instance** created/wrapped once and reused across recomputes (the future solve budget is measured against reuse, not per-run spawn), held behind a **stable forwarding handle that can reset it** (`engineClient.ts createResettableEngine`, 2026-09-03): the worker's `runSolve` is one synchronous call with no yield point, so the ONLY cancel for a superseded solve is `worker.terminate()` — the store's `update()` kills a pending solve whose fingerprint an edit moved and respawns the worker **sequentially** (never two live workers; U16 §S1's ruling in letter and rationale). Every forwarded call is raced against a per-generation signal, because a Comlink promise never settles after a terminate. `verify:bundle` guards the line that the engine never reaches the main bundle.

- **Result shape.** Large numeric arrays (terminal-value distribution, percentile series, per-path depth-of-failure) return as typed-array buffers via `Comlink.transfer`; the small derived fields (X-of-N integers, dollar adjustment, outcome-state enum) travel by ordinary structured clone. Transferred buffers are **detached** on the worker side — the worker retains none for reuse and allocates fresh per run. (The date-search per-offset curve is ≤~11 points per track — small enough to cross by structured clone; the transferable machinery serves the 2000+-element headline buffers, not an 11-point curve.)
- **Error propagation.** A thrown engine error surfaces as a defined **calm** result (the tri-state `pending | resolved-distribution | calm-error`), never a hung promise / unhandled rejection / dead worker; the worker stays alive and reusable. The date-search method (`runDateSearch`) is calm-error-total the same way — the worker never dies mid-sweep. Two typed rejections cross the handle: `EngineResetError` (the household's own edit killed the run — the handle only makes it **distinguishable**; each consumer owns its hold. `memoryModel`'s two lanes hold: `recompute()` returns on it, `dispatchSolve` is held by the epoch the kill advanced first. `controlPreview` deliberately does **not** — a reset-killed preview takes its calm error arm, because mapping it to 'stale' would strand an open sheet on pending, and the sheet re-idles on its next open. A new consumer must decide, never assume) and `EngineDeadError` (the worker's `error`/`messageerror` fired — a failed chunk load or an uncaught throw — so in-flight and later calls **settle** as the calm compute-error instead of hanging until the next reset respawns).
- **Cooperative cancellation, no SharedArrayBuffer.** Mid-sweep cancellation on the DATE lane is cooperative — a real macrotask yield between candidates so a cancel can land, driven by the injected async `shouldContinue()` that keeps `dateSearch.ts` pure (§1). The SOLVE lane has no yield point (a cooperative predicate cannot cross the structured clone), so its cancel is the edit-time worker reset above; `solver/cancel.ts`'s per-stage seam stays the deferred granularity call. `SharedArrayBuffer` / `Atomics` was **rejected**: it needs cross-origin-isolation (COOP/COEP) headers, a `vercel.json` posture change out of scope for the single-device model.
- **No-worker posture.** Because the engine is pure TS, a worker-construction failure falls back to a **main-thread run** returning the **same distribution**.

---

## 12. The chart text layer

**SVG draws, HTML writes** (council wf_ecbe0ab2-7bb, 2026-09-05 — insight 115). Every result chart (`ConfidenceBand`, `OddsLadder`, `RecommendationViz`, `TwoFutures`) draws into a **fixed 560-unit viewBox at `width:100%`**, so anything authored in user units renders at `authored × figureWidth / 560`. For paths, rules and dots that is the point (`non-scaling-stroke` holds their weight). For text it was the defect: 11–13 px svg labels rendered at 6.9 CSS px on a 390 phone, 8.0 at the 1088 two-pane floor and 10 on the 1536 laptop, and any lift *inside* the svg clipped an end-anchored `$2.25M` into a plausible `25M` against its fixed gutter. So:

- **The svg holds geometry only.** Fan, median, gridlines, annotation rules, dots, bars, markers, the scrub rule and the transparent capture rect. TwoFutures' end-label leaders are the exception and live in the text layer (`.ct-leader` in `chartText.css`): a leader must follow the label's MEASURED separate-y push, which an svg attribute cannot read — an svg leader drawn to the pre-push y pointed up to 39 px away from its label on the phone arm. A `<text>` inside a chart svg is a regression (`ConfidenceBand.test.tsx`, `OddsLadder.test.tsx`, `RecommendationViz.test.tsx`, `TwoFutures.test.tsx` and the e2e gate all pin `svg text` count 0).
- **Every word and numeral is HTML** in the shared layer (`src/viz/chartText.tsx` + `chartText.css`): `<ChartText fx fy anchor valign register>` positioned by **viewBox fraction** (`--fx = x / 560`, `--fy = y / H`), anchored like svg text, on **three borrowed registers** — `--text-xs` (ticks, annotations, axis captions), `--text-sm` (series end labels, the crown, every scrub readout), `--text-lg` (the one display-face hero). No chart types a px size of its own (insight 082: borrow a register an equal-rank subordinate already wears).
- **Collisions are resolved from MEASURED boxes, before paint, re-run on resize** (`useCollisionLayout`: stagger named moments into rows; hide an unnamed tick that would overprint; push a lower series label down). No glyph-width constant exists any more (`LABEL_CHAR_PX`, `TF_AXIS_CHAR_W`, `TF_READOUT_CHAR_W` are gone), so **no text metric ever reaches an svg coordinate** — the emitted `d` strings are byte-stable at every width, and the suite that derived its expectations from the constant under test is gone with it.
- **Positions are CSSOM writes.** `--fx`/`--fy` are React style-prop custom properties; React applies them through `element.style.setProperty`, which `style-src 'self'` does not govern (a style ATTRIBUTE string does). `e2e/design-tokens.spec.ts` proves both halves under the served headers — the CSSOM position lands, the attribute control is blocked. Never an attribute string, never an injected `<style>`.
- **The text layer is aria-hidden** — the sighted channel. The a11y tree keeps the svg's `role="img"` caption, the per-annotation `aria-label`s on the rules, and the single ratified `.sr-only` range sentence (council 2026-06-29 / O3 2026-07-10: no SR tick ladder). Nothing a screen reader hears changed.
- **The band's annotation block sits in flow under the svg**, whose viewBox gave up its 128-unit label gutter (500 → 380 units); the block reserves `rows × two lines of --text-xs`. Measured before the build (the council's blocking precondition): every fit-law household carries ONE row, the scrolling date route one or two, never three — so the two-pane frames got shorter (398 → 344 px on the 1536 window, 320 → 285 at the floor). The ladder's viewBox likewise dropped its x-axis gutter (340 → 284) and its ceiling headroom grew (PLOT.top 40 → 56) to seat the crown callout above a rung-9 dot; RecommendationViz and TwoFutures keep their viewBoxes (their aspect ratios are mirrored in CSS).
- **The gate is real Chromium** (`e2e/chart-text.spec.ts`, on the fit harness, CI-enforced through `verify:fit`): on PHONE / a 320 reflow arm / FLOOR / REAL, over four households (the two dense date routes, the one-frame spine, and `borderline`, the widest-y-tick household), every visible chart text node renders at ≥ `--text-xs` (read from the stylesheet) **measured at the leaf** — a child with its own size is measured, not its parent's register — lies inside the **card named for it per chart** (the band's drawer, a lever sheet's dialog, the page column for the ladder; the band's y-tick column is allowed its sanctioned borrow of the drawer's padding on the 320 arm under its own live-measured bound), overprints nothing, no named label is hidden and no `data-ct-priority` node ever is, the text grows when the reader raises their browser font, and reduced motion renders the same nodes. The scrub readout (band + TwoFutures) sits OVER the plot by design, so it carries its own oracle at every lattice column instead — every line at the floor, inside the plot, clear of the scrub rule and of the y-tick dollar column — plus a touch pin / dismiss / re-pin assertion. Every oracle inside `assertChartText` carries its own planted-fail control with the `toThrow` bound to that oracle's message (clip · shrink · leaf shrink · y-collision · a hidden NAMED tick · an appended svg `<text>` · a blank layer), and the two page-level oracles — the reader's font and reduced-motion identity — carry a non-vacuity guard: a green here is a green that could have been red (insights 016 / 029). RecommendationViz is pinned at unit level only (`RecommendationViz.test.tsx`) until its own serialized solve arm lands (open in the register — a full-precision solve beside these arms starves them of cores).
- **The room is not the ink** (council 2026-09-05, `docs/council-log.md`). A fraction-authored room — a viewBox-unit tick column, a gutter, a percentage cap — is a scale-invariant bound on a BOX and silent about the INK inside it, and the ink is rem-fixed. Contain the ink; never widen the room to receive it (a geometry change on every arm to buy the narrowest arm its pixels was rejected outright); never sanction a bound no browser has rendered. Where containment and in-plot seating are jointly unsatisfiable on a shipping arm, the words LEAVE for flow reserved at their tallest — they never grow in place. The band's y-tick borrow of its drawer's padding on the 320 arm is the sanctioned, live-gated case (`assertTickColumn`); the scrub readout's 320 shape and the ladder's label-column clearance are HELD on the instrument's first render — the gate's 320 readout arms are declared expected failures until the remedy and its oracles land together.
- **Forward rule.** A new chart follows the same seam: svg for marks, `ChartText` for words, one of the three registers, measured collisions, and a row in `chart-text.spec.ts`.
