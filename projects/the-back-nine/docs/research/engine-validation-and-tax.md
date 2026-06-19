---
title: Engine validation and tax reference (the validation contract + the tax/longevity numbers)
doc-type: research
status: shipped
created: 2026-06-17
updated: 2026-06-18
derives-from: [docs/product.md]
sources: [docs/research/pre65-healthcare.md]
---

# Engine validation and tax reference

This is the cited evidence behind the engine's correctness. It is the home of the **verified reference numbers** — Trinity/Bengen golden cases, the Monte Carlo calibration band, the longevity formula, and the full tax surface (brackets, RMDs, the senior-bonus deduction, Social-Security provisional-income taxation). The engine is built and pinned against these numbers; this doc is fully **consumed** by it. Where a number lives, it lives here — never re-typed into a plan or a component (the single-source rule that keeps stats from drifting).

The healthcare half of the tax surface — ACA-PTC (pre-65), IRMAA (post-65), HSA — lives in its own note: [pre65-healthcare.md](pre65-healthcare.md). Together the two are the engine's tax + health reference. The load-bearing engine invariants (the single shared market draw / CRN, stateless Box-Muller, reduce-to-spine, externally-derived fixtures) live once in [architecture.md](../architecture.md).

## How this evidence was produced (and why you can trust the numbers)

The findings came from a hand-rolled fan-out workflow — four research strands, each researched then **adversarially verified** by a second pass that tried to refute every load-bearing claim. **All verifier corrections below are already applied.** The raw research contained real errors: a fabricated benchmark pair, a misstated crypto hierarchy, an inverted recovery-flow claim, a missing SEC counter-authority, and — most dangerous — a **wrong Trinity bond number designated as a golden oracle, which would have failed a *correct* engine.** This doc carries the corrected version.

Confidence tags are preserved on purpose. **Do not flatten "defensible" or "directional" into "verified."** A directional fixture is marked directional in code, and the §0 exit-gate work pinned the ones that needed pinning (see [the pin-pass status](#pin-pass-status-the-exit-gates-that-were-still-open)).

This doc is the live home of two of the fan-out's strands: **Strand 4** — the engine-correctness reference cases (the validation contract) — and **Strand 5** — the tax reference for the strategy solver. Each gets its own section below; the strand numbers are load-bearing identifiers the engine and plans cite (`§Strand 4`, `§Strand-5`). It also keeps the **local-first / E2E architecture rationale** (the comparative storage/crypto decisions) present-tense at the end. The two other strands the fan-out produced — the **consumability thesis** (why incumbents fail on consumability + data plumbing) and the **personal-tool regulatory rationale** (the IAA §202(a)(11) Prong-A reasoning behind the relaxed guardrails) — are canonical in [product.md](../product.md), the *why*/*what* home, not here.

---

## The validation contract (Strand 4)

The Success Criteria demand the engine be "validated against known-good reference cases." Here they are.

> **The landmine this strand defused:** the raw research designated a **wrong Trinity bond number as a golden oracle.** Encoding it would have made a *correct* engine fail its own tests. The verifier caught it. Every golden number below is the corrected one.

### Solver validation — the *recommendation* must be right, not just the number

The product **recommends** a strategy (withdrawal sequencing + Roth conversion), so the contract GROWS beyond "the number is right." The cases below validate the engine's *number*; a recommender needs three more classes, all **gating before the solver is allowed to speak** (a wrong recommended strategy costs real dollars). The solver / oracle is Act 4 — still ahead — but the contract is recorded here so it cannot be rediscovered later:

- **(a) Optimality / ranking oracle** — hand-computable cases where the best drawdown/conversion order is *known* (conventional taxable→tax-deferred→Roth ordering; a textbook bracket-filling Roth optimum), so a confidently-wrong recommendation **fails loud** — the way Trinity/Bengen make "the number is right" testable.
- **(b) Ranking-stability under CRN** — the *ranking* (not just each pairwise delta) must be stable on the shared draw matrix, or the recommendation jitters. Generalize the 2-arm CRN test to **K candidate strategies → identical normals path-for-path** across the survivor MFJ→single transition.
- **(c) Grade calibration** — "just do it" must *actually* be robust across the futures and "coin-flip" *actually* a coin-flip. The sole human gate (N=1 cold-read) judges a grade's **tone** but is structurally unable to judge its **correctness** — so this automated oracle is the only backstop on a tool moving real money.
- **Optimizer's-curse correction (part of the contract):** argmax over many candidates on ONE seed overfits that seed's noise → the in-sample winner's score is optimistically biased. **Report graded confidence on an independent held-out seed-set** (or paired top-K dispersion). Compounded: directional-until-pinned fixtures decide the exact near-ties the optimizer overfits, so **pinning the tax-reference primaries is a hard solver prerequisite**, not a residual gate.

### Golden / exact (historical — right/wrong answers)

Trinity Study (Cooley/Hubbard/Walz 1998), **vintage-locked: 1926–1995, S&P 500 + LONG-TERM CORPORATE bonds, inflation-adjusted withdrawals, success = balance > $0 at horizon end, annual rebalance:**

| Allocation | Withdrawal | Horizon | Expected success |
|---|---|---|---|
| 50/50 | 4% infl-adj | 30 yr | **95%** (exact anchor) |
| 75/25 | 4% | 30 yr | **100%** *(verifier fix — raw research said 98%)* |
| 100% stock | 4% | 30 yr | **98%** |
| **100% bond** | 4% | 30 yr | **~70%** *(CORRECTED — raw research said "20–35%", which is WRONG and was flagged a golden oracle; encoding it would fail a correct engine. Full bond row 3/4/5/6% = **94/70/51/44%**.)* |

The **100%-bond = ~70%** row is the **diagnostic case**: a correct engine with inflation-adjusted withdrawals must show bonds doing *poorly*, not "safe." If your engine shows bonds safe, the inflation adjustment or volatility handling is wrong.

### Deterministic golden (with a hard caveat)

- **Bengen SAFEMAX = 4.15%** corresponds to the **1966 retiree cohort** *(verifier fix — raw research mis-paired it with 1968)*. 50% S&P 500 / 50% **intermediate-term GOVERNMENT** bonds, 30 yr, annual rebalance. **Only bit-exact against Bengen's exact dataset (Ibbotson intermediate-government series)** — without that dataset, treat as a *directional* survive/fail test, not a golden number. **Pin the dataset before calling it deterministic.**
- **Bond-index mismatch:** Trinity used **corporate** bonds; Bengen used **government** bonds → their numbers legitimately differ (Bengen 50/50 ≈ 100% vs Trinity 50/50 = 95% for the same 4%/30yr). **Never cross-validate one against the other's exact figure.**

### Monte Carlo calibration (a band, NOT an equality)

- A pure i.i.d. Monte Carlo scores a given withdrawal rate **more pessimistically** than a historical backtest (i.i.d. draws ignore mean-reversion and can string arbitrarily bad runs). 4%/30yr lands **high-80s to ~90%**, *below* the 95% historical. **This is by design** — assert only a *range* for MC, use the historical cases as the exact oracle.
- **Pfau/Kitces:** high-CAPE environments imply a **3–3.5%** safe rate, not 4% — corroborates the "deliberately conservative real returns" decision.

### Methodology landmines (baked into engine tests)

- **Volatility drag (the #1 MC bug).** Geometric ≈ Arithmetic − σ²/2. For a lognormal sim use **log-drift μ = arithmetic_mean − σ²/2**, else you **overstate** compounding. *(The precise statement: feed the arithmetic mean but subtract σ²/2 as drift — "arithmetic-average growth, not compound" is the headline, σ²/2 is the mechanism.)* **Unit test:** +50% then −50% → **two-year cumulative −25%, annualized geometric −13.4%** *(verifier relabel — don't conflate cumulative with annualized).*
- **"Success" = $1 remaining hides magnitude.** Also report **terminal-value percentiles + depth-of-failure**, not just pass/fail — this is what feeds the "probability of adjustment" dollar-grammar (we need the distribution, not a binary).
- **Longevity:** use **cohort, not period** life tables (period understates longevity). **Joint-and-survivor must be DERIVED** from single-sex curves: **P(last survivor alive) = p_x + p_y − p_x·p_y**. ~25% of 65-year-olds live past 90; **~53% chance at least one of a 65-yo couple reaches 90**. *(The ~53% is NOT the symmetric ~25% applied to both — that yields 43.75% under p_x+p_y−p_x·p_y; the ~53% reflects **sex-differentiated** cohort survival (women materially higher), so the engine must use **sex-specific curves per spouse**, never one rate for both, and the longevity test asserts the couple figure = the formula on the two shipped curves, not a hardcoded constant. Independence is assumed — real spousal mortality is positively correlated, mildly overstating last-survivor probability, which errs safe for a survival floor.)* **Do not model a fixed "to-age-90" horizon** — it systematically misstates ruin probability for a couple.
- **Rebalancing:** Trinity/Bengen/FIRECalc all assume annual rebalance to target — match it or results drift.
- **Local oracle:** `github.com/boknows/cFIREsim-open` (Shiller data from 1871, rolling one-year-shifted windows) to generate golden historical outputs for our own input sets.

#### The SSA cohort tables — RESOLVED / PINNED

The longevity numbers above were grounded-search-era figures. They are now **pinned to the actual SSA tables** (P1-exit pin pass, 2026-06-11). The correction and the pinned anchors:

> **[CORRECTED 2026-06-11 at the pin pass]** `table4c7.html` does **NOT** exist (404) — "4.C7" is Trustees-Report table NUMBERING, not a filename; only the period-table URL was ever real. The actual cohort tables are SSA's HistEst downloadables (`CohLifeTables_{M,F}_Alt2_TR2024.csv`), now committed **sha256-pinned** at `src/engine/reference/ssa-snapshot/`. The ~25% / ~53% anchors above were the grounded-search-era *population* figures; the **PINNED household cohorts (male 1969 / female 1972)** give **S(90|65) = 0.3209 / 0.4348 → couple at-least-one-to-90 = 0.6162** — younger cohorts survive materially longer.

The pinned snapshot lives at `src/engine/reference/ssa-snapshot/` (the two CSVs + `SHA256SUMS`); the per-spouse curves and the couple anchor are encoded in `src/engine/reference/mortality.ts`. A Trustees-Report-vintage bump is a deliberate re-pin, never a silent refresh.

---

## Tax reference for the strategy solver (Strand 5)

> **Scope.** Strand 5 began as the numbers for a *single Roth lever*; the product is now a **multi-control solver** (withdrawal sequencing + conversion) with **income-dependent healthcare**, so the tax surface is bigger. **Strand 5 is TWO sources together:** the bracket / RMD / SS-tax reference below **plus** the dedicated healthcare note ([pre65-healthcare.md](pre65-healthcare.md) — ACA-PTC, IRMAA, HSA).

> **The falsifiable IN/OUT line:** a tax/health effect is **IN iff withdrawal sequencing or a conversion can move it.** IN: ordinary brackets, standard deduction, RMDs, SS-taxation, MFJ→single, **ACA-PTC (pre-65), IRMAA (post-65), cap-gains / qualified-dividend stacking**. OUT-but-disclosed: NIIT, state. **Two distinct MAGI calculators** (ACA-MAGI ≠ IRMAA-MAGI). **Legislative landmine:** the enhanced ACA subsidies **expired 12/31/2025, unre-enacted as of 2026-06-04** → model the **400% FPL cliff as the 2026 base case**, expose "enhanced" as a scenario toggle, **re-verify every build** (CI-gated by `pnpm verify:aca`).

*Verified via gemini-grounding 2026-06-04 (Tax Foundation 2026 bracket tables; IRS RMD FAQ; SECURE 2.0; OBBBA; + the healthcare note's IRS/CMS primaries). The 2026 figures were grounded-search-verified and have since been pinned against the IRS primaries — see [the pin-pass status](#pin-pass-status-the-exit-gates-that-were-still-open).*

### The legal basis (this is itself a staleness-stamp fact)

**The One Big Beautiful Bill Act (OBBBA), signed 2025-07-04, made the TCJA individual rate structure (10/12/22/24/32/35/37) and the elevated standard deduction PERMANENT** — so 2026 is **not** a TCJA-sunset reversion to pre-2018 brackets, which is what would have happened absent legislation (TCJA individual provisions were set to expire 12/31/2025). **Why this matters for the build:** the "tax-table vintage" staleness clock is therefore *not* tracking a known one-time 2026 reversion — it tracks (a) annual inflation indexing of a permanent bracket structure, (b) the senior-bonus-deduction sunset (below — a *guaranteed* future staleness), (c) the RMD-age step (below), and (d) any future law change. **Stamp the legal basis (OBBBA-2025), not just the year**, so a future statutory change is falsifiable rather than mistaken for inflation drift.

### 2026 federal MFJ ordinary-income brackets (taxable income)

| Rate | MFJ taxable income |
|---|---|
| 10% | ≤ $24,800 |
| 12% | $24,801 – $100,800 |
| 22% | $100,801 – $211,400 |
| 24% | $211,401 – $403,550 |
| 32% | $403,551 – $512,450 |
| 35% | $512,451 – $768,700 |
| 37% | > $768,700 |

### The widow(er)'s-penalty drivers (the lever's headline math)

- **2026 MFJ standard deduction = $32,200.** Single ≈ **half** (≈ $16,100 — pin exact against the IRS Rev. Proc.; 2025 was MFJ $31,500 / single $15,750, exactly 2×).
- After the first death, an empty-nest retired couple files **SINGLE the year after** (year of death = still MFJ; Qualifying-Surviving-Spouse MFJ-equivalent rates apply for up to two following years **only with a dependent child in the home** — which the target couple almost never has, so **no QSS grace** — IRS Pub 501). The survivor's same real dollars then fall into **~half-width single brackets with ~half the standard deduction** → the "tax cliff" converting-while-both-file-MFJ defuses. The **joint→survivor two-regime boundary doubles as the MFJ→single filing-status switch** — no new boundary.
- **Additional age-65+ standard deduction** ≈ $1,650/spouse MFJ (2026) — supporting, pin exact.

### RMD start age — birth-year-derived, NOT a flat 73 (SECURE 2.0)

- born **≤ 1950 → 72**; born **1951–1959 → 73**; born **1960 or later → 75** (the 75 step is **effective 2033**). (The 1959 statutory drafting glitch resolves to **73** — current standard interpretation.) RMD = the IRS **Uniform Lifetime Table** divisor applied to the prior-year-end pre-tax balance; first RMD due by April 1 of the year after reaching RMD age. **The age is a per-person function of birth year and is legislatively scheduled to change (the 2033 step) — so it is a vintage-stamped / birth-year-keyed input, never a hardcoded literal.**

### Temporary Senior Bonus Deduction (OBBBA) — a guaranteed-to-go-stale provision

- **$6,000 per person age 65+ ($12,000 MFJ)**, on top of the standard deduction, claimable whether itemizing or not. **MAGI phase-out:** begins single > $75k / MFJ > $150k, reduced 6% per dollar over. Deduction = **$6,000 × (# spouses 65+)** reduced by **6% of (MAGI − $150k)** on a joint return. Fully gone: **single > $175k**; **MFJ > $250k when ONE spouse is 65+ ($6k), but MFJ > $350k when BOTH are 65+ ($12k)** — the both-65+ couple (the central post-65 conversion scenario) keeps it up to **$350k** MAGI. *(Source: IRS FS-2025-03; OBBBA P.L. 119-21 / H.R.1. A flat "MFJ > $250k" is the one-spouse case only and would overstate tax / understate conversion+IRMAA headroom in the $250–350k band — exactly where a conversion solver decides.)* **Available tax years 2025–2028 only; SUNSETS after 2028** unless extended. → The tax overlay must carry an explicit **sunset marker** (a calm note when an answer computed pre-2029 is viewed in/after 2029).

### Engine tax + health scope (decided 2026-06-04 — "the most complete picture")

**IN the two-control solver's tax + health model (withdrawal sequencing + Roth conversion):** federal MFJ + single ordinary-income brackets, the standard deduction (+ age-65 additions + the senior-bonus deduction with its phase-out & sunset), birth-year-derived RMDs (Uniform Lifetime), each year's withdrawal/conversion taxed as ordinary income stacked on that year's other ordinary income, **Social-Security provisional-income taxation (the "tax torpedo")**, **capital-gains / qualified-dividend stacking from taxable-account withdrawals**, and **income-dependent healthcare — pre-65 ACA-PTC (400% FPL cliff is the 2026 base case; "enhanced" = a scenario toggle) and post-65 IRMAA (2-year MAGI lookback, a distinct MAGI definition, hard cliffs)** — every effect that withdrawal sequencing or a conversion can move (see [pre65-healthcare.md](pre65-healthcare.md)). **OUT-but-disclosed (next to the delta, candidate future levers):** NIIT (3.8% surtax) and state income tax — neither moves with sequencing or conversion.

**The falsifiable IN/OUT line (so the scope stays principled, not self-justifying):** a tax/health effect is **IN** iff **withdrawal sequencing or a Roth conversion can move it** — ACA-PTC and IRMAA are income-dependent, so a sequencing/conversion change shifts ACA-MAGI or IRMAA-MAGI across their cliffs, and an omitted cliff *inverts which strategy wins*, not just its size (this is exactly why they come IN). It is **OUT-but-disclosed** iff neither control can move it (NIIT = a 3.8% surtax; state tax = a parallel system).

### Social-Security benefit taxation (the "tax torpedo" — the numbers + the landmines)

- **Provisional ("combined") income = AGI excluding SS + tax-exempt interest + 50% of SS benefits.** MFJ tiers (the fraction of benefits that enters ordinary taxable income): **provisional < $32,000 → 0%; $32,000–$44,000 → up to 50%; > $44,000 → up to 85%** (single: $25,000 / $34,000). Exact inclusion follows the IRS Pub. 915 worksheet.
- **These thresholds are NOT inflation-indexed — frozen since 1983 ($32k) / 1993 ($44k).** So they have **no vintage/staleness clock** (unlike the brackets, which inflation-index annually): they are constants, not a dated fixture, and a frozen constant cannot go "stale." (This is *why* more retirees are caught each year — a feature to model honestly, not a bug.)
- **Computational landmine — the circularity (a per-year fixed-point, NOT a one-pass transform):** taxable SS depends on provisional income, which depends on the year's other ordinary income — including the **gross-up** withdrawal needed to cover spending + tax, which depends on the tax. The overlay resolves this per simulated year as a **bounded fixed-point** (iterate provisional-income → taxable-SS → tax → gross-up to convergence, a few passes; deterministic, reads **zero** random draws — so still CRN-safe). The engine seam pins the convergence rule (iterate-to-stable or a fixed small pass count).
- **Not modeled (pending legislation):** the proposed "You Earned It, You Keep It Act" (would eliminate SS taxation) is **NOT law** as of 2026 — do not model speculative legislation; if enacted it becomes a Strand-5 update + a tax-vintage bump.

*(All of Strand 5 supports the two-control solver — withdrawal sequencing + Roth conversion — plus income-dependent healthcare. The survivor cliff is one driver among several, not the sole lever; the falsifiable IN/OUT line above bounds the scope.)*

---

## Pin-pass status (the exit-gates that were still open)

The strands above marked several items "still unverified — pin before the fixture is golden." **The P1-exit pin pass (2026-06-11) closed them.** What was a grounded-search figure is now parsed-and-pinned against a primary, sha256-snapshotted under `src/engine/reference/` and read by the canonical year-keyed constants table (`src/engine/constants/`). Status of each formerly-open gate:

| Formerly-open gate | Status | Where it is pinned |
|---|---|---|
| SSA cohort tables — table designations, the ~53%-at-least-one-to-90 anchor (SSA bot-blocks curl; was grounded-search-only) | **RESOLVED / PINNED** | `table4c7.html` proven nonexistent; real cohort CSVs (`CohLifeTables_{M,F}_Alt2_TR2024.csv`) committed sha256-pinned at `src/engine/reference/ssa-snapshot/`; household cohorts male 1969 / female 1972, S(90\|65) 0.3209 / 0.4348 → couple 0.6162, in `mortality.ts` |
| 2026 bracket edges + standard deduction + age-65 addition + senior-bonus figures (grounded-search, not parsed from the IRS primary) | **RESOLVED / PINNED** | Pinned against the IRS Revenue Procedure (2026 inflation adjustments) + Pub. 501 (filing status / QSS); read from `src/engine/constants/tax.ts` |
| RMD divisors (Uniform Lifetime Table) | **RESOLVED / PINNED** | Pinned against IRS Pub. 590-B; year-keyed in the canonical constants table |
| SS-tax thresholds / inclusion worksheet | **RESOLVED / PINNED** | Pinned against IRS Pub. 915; the $32k / $44k constants carry "frozen, no staleness clock" |
| Bengen 1966 bit-exactness (depends on the exact Ibbotson intermediate-government dataset) | **DIRECTIONAL by design** | Treated as a directional survive/fail test, not a golden number — the dataset gate is recorded above; do not assert a bit-exact SAFEMAX without the Ibbotson series |
| The reg / attorney-gate (Strand 3) | **LAPSED** | Personal / non-commercial tool (the regulatory rationale is canonical in [product.md](../product.md)); not a fixture exit gate |

What survives as a real gate is **honesty hygiene on the recommendation copy across both controls**: the headline must wear its probabilistic hedge (copyGuard's *require-the-hedge* lint), no false precision, and a wrong tax/health fact behind the verdict is the cardinal sin — the reset transferred the load onto honesty + engine validation, which get *stricter* for a recommender.

Constants discipline: every figure is keyed by year in the **single canonical table** and carries `{ value, citation, directionalUntilPinned }`. A figure the research names but doesn't value is an `Unsourced` sentinel whose `.value` throws — never a plausible default. The full constants rules live in [architecture.md](../architecture.md); this doc supplies the numbers, that doc supplies the discipline.

---

## Local-first / E2E architecture rationale

The storage + crypto layer is **local-first and zero-knowledge**: the financial picture is entered by hand, encrypted at rest in the browser, and never leaves the device. The load-bearing invariants — AES-GCM-256 under a PBKDF2-600k-hardened key, the non-extractable `CryptoKey`, the recovery-phrase + mandatory-export survivor backstop, the strict CSP — live once in [architecture.md §7.3 / §10](../architecture.md). This section keeps the *comparative* decisions behind them: why each rejected alternative was rejected.

- **Single Web Worker; skip `SharedArrayBuffer` + COOP/COEP.** One worker (with a future WASM port if the compute profile ever demands it) clears a 1,000-path Monte Carlo sub-second — the value is **determinism + headroom, not raw speed**. SAB buys a multi-threading we don't need and is PWA-hostile (it forces cross-origin-isolation headers), so it stays out.
- **The KDF is PBKDF2-HMAC-SHA256 @ 600,000 iterations** — the WebCrypto-native baseline (salt = 16 random bytes, AES-GCM-256, `extractable:false`). Argon2id-WASM (`m=19456,t=2,p=1` or `m=47104,t=1,p=1`) is the upgrade **only if** the engine ever ships WASM (OWASP's fallback order is Argon2id → scrypt → bcrypt → PBKDF2). The non-extractable key is **convenience, not the at-rest boundary** — it blocks script exfiltration, not an offline brute-force of an extracted blob; the real protection is the encrypted blob + the KDF's hardness. (For a personal friends-tool, PBKDF2-600k is the reasonable bar — the maximalist Argon2id justification is not load-bearing.)
- **No sync engine (Jazz rejected; Evolu held in reserve).** A single-device encrypted PWA needs no sync engine at all. Jazz is rejected as a foundation risk — a mid-rewrite 2.0-alpha API, too in-flux to build on; **if** device-to-device sync is ever added, Evolu (less in-flux) is the candidate to re-evaluate then.
- **Login recovery is separate from data-decryption recovery.** The recovery phrase recovers the **data** (it derives the key that unwraps the vault); an email/SMS-style reset is **login-only** and would strand the encrypted data. So the survivor's door is the recovery phrase + the mandatory encrypted export at onboarding, and IndexedDB eviction (WebKit ITP's ~7-day clear) is treated as best-effort — the exported phrase is the real durability backstop.
- **Future desktop-port landmine (Tauri — Phase-2, not MVP).** If ever ported to Tauri, **avoid Tauri Stronghold**: the upstream IOTA `stronghold.rs` has been unmaintained since 2025-04-23 (a sunset signal). Use the Rust `keyring` crate (e.g. `tauri-plugin-keyring`) + SQLCipher-encrypted SQLite instead, and spot-check the crate's maintenance before adopting.
