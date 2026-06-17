---
title: The Back Nine — Architecture (how the engine works + the load-bearing invariants)
doc-type: architecture
status: living
created: 2026-06-17
updated: 2026-06-17
derives-from: [docs/product.md]
sources: [docs/research/engine-validation-and-tax.md, docs/research/pre65-healthcare.md]
---

# The Back Nine — Architecture

This is the single canonical home for **how the engine works** and the **load-bearing invariants nobody may break**. If a rule here is contradicted anywhere else, this doc wins; the other doc is stale. The invariants are stated once, here — other docs link to them rather than restate them.

Why this matters: the product bets real retirement money on the engine's number, and later on a recommended strategy that costs real dollars if it is wrong. The cardinal rule — *calm-but-wrong is the sin* (see [docs/product.md](product.md)) — is enforced not by tone but by these structural contracts. Each one is the difference between an answer that is signal and an answer that is luck dressed as confidence.

---

## 1. The layer architecture

The code is split into layers with one-directional import boundaries, **enforced by ESLint** (`pnpm lint`):

```
engine · crypto · store · intake · budget · viz · ui · shared
```

Path aliases `@engine/*` … `@shared/*` name each layer.

### `src/engine/` is PURE

The engine is **a deterministic function of `(params, seed)`**. It imports only `@shared`; it must **not** import `ui` / `store` / `intake` / `budget` / `viz` / `crypto`.

It reads **no clock, entropy, or environment**. `Math.random`, `crypto.getRandomValues`, `Date`, `performance`, and `process` are all **lint-banned inside `src/engine/**`** — those pass a weak-RNG-only lint while still breaking purity, so the ban is broader than just "no weak RNG." **The seed is injected by the caller**, never generated inside the engine. Tests under `src/engine/**` are exempt.

The same injected-dependency discipline governs the date-search: `dateSearch.ts` stays pure by taking an injected async `shouldContinue()` parameter (the same shape as the injected seed), so cooperative cancellation does not require the engine to read any environment.

### `src/crypto/`

The primitive layer. CSPRNG is **required** — `crypto.getRandomValues` for the recovery phrase — and `Math.random` is banned (the U0 weak-RNG lint extends to `src/crypto/**`).

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
| Healthcare | healthcare modeling off — no ACA premium, no IRMAA surcharge, no HSA bucket. |
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

Where an overlay has its own internal throw (a fail-loud backstop), it has a **`validateParams` mirror** — the two-layer R19 discipline — so an input that would later throw is caught at the gate.

---

## 7. Per-overlay engine contracts

These are the load-bearing details inside each overlay. They live here so a future engineer touching one overlay does not rediscover its traps at runtime.

### 7.1 Tax-and-accounts overlay (`taxOverlay.ts`)

The structural sibling of the earned-income bridge: a per-year deterministic transform of the cash-flow term, indexed by absolute year, fed into the **same** per-year update function, consuming **ZERO** random draws. The bridge nets down; the overlay grosses up.

- **Per-person buckets: pre-tax / Roth / taxable.** Ordinary-income tax on pre-tax withdrawals + RMDs + the conversion; tax-free Roth growth; capital-gains / qualified-dividend stacking from taxable withdrawals. All buckets share the **one** market draw — tax/RMD/conversion are post-draw arithmetic. The per-person pre-tax ledger sums to `buckets.pretax` (the no-parallel-ledger-drift contract).
- **The gross-up fixed-point.** Spending → tax → the gross-up withdrawal needed to cover spending + tax → which moves the tax: a circularity resolved as a bounded fixed-point. The worst-case contraction factor is **k ≈ 0.74** (raised from ~0.685 by cap-gains stacking; insights 006/007), and `GROSS_UP_MAX_PASSES = 128` covers the validated tail (with the `ENGINE_MAX_*` bounds, the worst case is ~113 passes < the cap). No in-range default ever stands in for an unconverged value — it fails loud (burned/062).
- **SS provisional-income taxation** is its own per-year bounded fixed-point (iterate provisional-income → taxable-SS → tax → gross-up → re-converge), deterministic, reading zero draws. The MFJ/single thresholds are **frozen, not inflation-indexed** — constants with no staleness clock.
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

### 7.3 Encrypted local store + key lifecycle (`src/crypto/`, `src/store/`)

The trust layer. Makes the at-rest promise provable.

- **PBKDF2-600k → AES-GCM-256.** `importKey` the passphrase → `deriveKey({PBKDF2, salt, iterations: 600000, SHA-256}, …, {AES-GCM, 256}, extractable:false)`. Keys live in memory only, never persisted unwrapped (passphrase-each-session). Every 600k derivation renders an explicit calm "unlocking… / securing…" pending state (the work may run off the main thread but that is implementation-dependent, not guaranteed).
- **Data-key (DK) indirection — one write predicate.** A stable random **data key (DK)** encrypts the model exactly once; the passphrase-derived key and the recovery-derived key each **wrap DK independently**. There is exactly **one** copy of the model, so the recovery path can never restore a *stale* copy — the worst failure for a survivor product. "Wrapping" DK = **AES-GCM `encrypt()` of the raw DK bytes**, **not** WebCrypto `wrapKey()` (which would require `extractable:true` and let an injected script `exportKey` it). DK is imported `extractable:false`.
- **Synchronous lock authority / the write-gate conjunction (one predicate, both clauses).** A writable store handle requires **a derived session key AND a current `passphraseWrap`** — bound into the **same** seam, not two rules. The recovery-unlock path is exactly why both clauses are needed: it derives a key and decrypts the model, yet writes must stay blocked until the new `passphraseWrap` is re-minted (otherwise the survivor could silently degrade the vault to recovery-phrase-only access). There is no reachable cleartext / unkeyed / stale-credential write path.
- **Three record types**, each wrap carrying its own fresh salt + IV: `model` `{iv(12B), ciphertext}`; `passphraseWrap` `{salt(16B), iv(12B), wrappedDataKey}`; `recoveryWrap` `{salt(16B), iv(12B), wrappedDataKey}`. The plaintext begins with an integer `schemaVersion` (= 1 from v1) read before any other field; decrypt branches/refuses on an unknown version (the migration ladder enabler: v1→v2→v3).
- **Recovery key derivation.** Entropy = `crypto.getRandomValues` only; wordlist = **BIP-39 English, 2048 words**; **12 words = 128 bits**. Because the phrase already carries 128 bits, the recovery-wrap key uses **HKDF-SHA-256** (key-*expansion*, the correct primitive for a high-entropy input — PBKDF2 stretching adds nothing) with a **mandatory** pinned `info` string for domain separation.
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

The healthcare-overlay integration fold (U3·M6) added the surfaces a future solver and the wire layer consume:

- `totalTaxPaidReal` — lifetime tax paid, the *pay-less-tax* objective input.
- The per-path death-year `Distribution.taxAware` surface.
- The typed `SimInfeasible` sentinel — the input passed R19 but a path's overlay computation failed mid-run (gross-up cap, ACA bisection, a fail-loud backstop). The **candidate** is infeasible as a whole — **never** a silently dropped path (the dropped class would be exactly the aggressive near-cliff candidates) and **never** an uncaught throw (which would abort a future K-candidate batch). A solver ranks it WORST; the headline route surfaces a calm error; the date route fails the run all-or-nothing. All fields are JSON-safe (they cross the worker wire); deterministic in `(params, seed)`.

---

## 8. Constants discipline (`src/engine/constants/`)

> One canonical table; everything reads it; nothing re-types a dated figure.

- **ONE canonical, year-keyed table** (burned/057,061,063). Plan, overlays, tests, and the copyGuard allowlist all **read** it — a dated figure is never re-typed elsewhere (a shape test greps for inlined values). The spine reads **nothing** from this module (the spine is tax-free), so a constants change can never perturb a golden case.
- **Every figure carries `{ value, citation, directionalUntilPinned }`.** A figure is "pinned" (`directionalUntilPinned: false`) only after confirming against the named primary at the exit-gate pin pass.
- **No in-range default fallbacks** (burned/062): a figure the research names but doesn't value is an `Unsourced` sentinel whose `.value` **throws** — never a plausible default. A `?? 22%` default that overlaps a plausible bracket makes a missing input indistinguishable from a measurement, which is fatal inside the SS-tax / ACA fixed-points.
- **The ACA legislative entry carries `reVerifyEveryBuild`** and is gated in CI by `verify:aca` (see §9) — it can flip the whole pre-65 model and invert which strategy wins.
- **Persisted "never-depleted" sentinels must be a numeric value** (e.g. `-1` / a max-horizon year), **never `Infinity`/`NaN`** — `JSON.stringify` / IndexedDB silently null them (DND 009). (Stated here and in §7.3 because it spans both the constants and store layers.)
- **Display-hint figures vs engine figures.** User-facing display-hint figures live in `referenceData.ts`, never `@engine/constants` (the constants module is engine-consumed only).

---

## 9. Cross-engine headline robustness

Plain-TS transcendentals (`exp` / `log` / `pow`) are **not bit-identical across JS engines** (an IEEE-754 reality) — byte-identical normals + a byte-identical raw distribution is a **same-JS-engine** guarantee only. So the *displayed* headline must not depend on bit-identical floats:

**`confidence.ts` quantizes the headline-determining statistic to a coarse grid (`SURVIVAL_GRID = 0.01`, well outside last-ULP noise) BEFORE the band-edge decision.** `quantizeSurvival(s) = round(s / GRID) * GRID`, then the band compare. A user who screenshots an `X of 10` in Chrome and reopens the PWA in Safari sees the same headline even though the raw percentile may differ in its last ULP. The quantization, not bit-identical floats, keeps the screenshot promise honest.

The date-search reuses the **same** idiom: the conservative lower confidence bound (`p̂ − z·SE`, `z = 1.645` one-sided) is `quantizeSurvival`-ed before the bar compare, the bar being `BANDS.onTrack` (read, never re-typed). Paths are pinned at 16,000 so `z·SE ≤ ½·SURVIVAL_GRID` at the bar — the haircut moves the quantized reading at most one grid cell, a designed bounded effect. A true cross-engine bit-identical requirement is the concrete trigger that would promote WASM from fast-follow to load-bearing (see §10).

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

The engine runs in `engine.worker.ts` behind **Comlink** — a **single long-lived instance** created/wrapped once and reused across recomputes (the future solve budget is measured against reuse, not per-run spawn). `verify:bundle` guards the line that the engine never reaches the main bundle.

- **Result shape.** Large numeric arrays (terminal-value distribution, percentile series, per-path depth-of-failure) return as typed-array buffers via `Comlink.transfer`; the small derived fields (X-of-N integers, dollar adjustment, outcome-state enum) travel by ordinary structured clone. Transferred buffers are **detached** on the worker side — the worker retains none for reuse and allocates fresh per run. (The date-search per-offset curve is ≤~11 points per track — small enough to cross by structured clone; the transferable machinery serves the 2000+-element headline buffers, not an 11-point curve.)
- **Error propagation.** A thrown engine error surfaces as a defined **calm** result (the tri-state `pending | resolved-distribution | calm-error`), never a hung promise / unhandled rejection / dead worker; the worker stays alive and reusable. The date-search method (`runDateSearch`) is calm-error-total the same way — the worker never dies mid-sweep.
- **No-worker posture.** Because the engine is pure TS, a worker-construction failure falls back to a **main-thread run** returning the **same distribution**.

---

## Summary / changelog

- **Where these used to live.** Before this rebuild, the invariants were smeared across `phase-1-foundation.md` (the seven "Phase-1 cross-cutting contracts"), the project `CLAUDE.md` ("Load-bearing engine contracts", "Constants discipline", "Security / CSP boundary"), and the per-unit plan bodies. This doc is now their single canonical home; the others link here.
- **CLAUDE.md carries a tight SUMMARY of these contracts and points here as the canonical source.** (The project's main reconcile pass will update `CLAUDE.md` to reference this doc rather than restate the rules.)
