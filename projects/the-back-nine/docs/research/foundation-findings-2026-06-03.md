---
date: 2026-06-03
topic: the-back-nine-foundation-findings
status: verified (research → adversarial verification), corrections applied
revised: 2026-06-04   # thesis-reset cascade: §Strand 3 → archive-as-rationale; §Strand 4 solver-validation subsection; §Strand 5 added + grown to multi-control + healthcare. See ../plans/direction-reset-2026-06-04.md.
method: hand-rolled fan-out workflow (4 strands × research + adversarial verifier), gemini-grounding + curl. NOT the broken deep-research pipeline.
---

# The Back Nine — Foundation Findings (verified)

The cited evidence behind the requirements doc's locked decisions. Four strands, each researched then **adversarially verified** by a second agent that tried to refute every load-bearing claim. **All verifier corrections below are already applied** — the raw research contained real errors (fabricated benchmarks, a misstated crypto hierarchy, an inverted recovery-flow claim, a missing SEC counter-authority, and a dangerous wrong Trinity number); this doc carries the corrected version. Confidence tags are preserved — do **not** flatten "defensible" or "directional" into "verified."

> **Strand 5 (tax reference) was added 2026-06-04 (pre-reset Phase-3 planning), then GROWN the same day by the thesis reset** — it began as the numbers for a single Roth lever; the reset makes the product a two-control solver (withdrawal sequencing + conversion) with income-dependent healthcare, so its scope is now multi-control + ACA/IRMAA/HSA (see its section header + top banner). It was verified via gemini-grounding (multi-source, 2026-06-04), carries its own provenance + exit-gate, and is held to the same "pin the primary before calling it golden" discipline as Strand 4's datasets.

> Requirements decisions live in `../brainstorms/the-back-nine-requirements.md`. This doc is the *why*; that doc is the *what*. Reference numbers live **here only** (avoid stat-drift).

---

## Strand 1 — Voice-of-user UX pain → thesis SUPPORTED

**Verdict: the consumability thesis holds, with one refinement.** Across ProjectionLab, Boldin, Monarch, Empower, and Fidelity/Vanguard, the dominant, repeated complaints are *consumability* failures, not capability gaps. Nobody complains the tools can't compute enough; they complain the tools are exhausting, intimidating, and hard to believe.

Strongest, most refutation-resistant findings:
- **"Wildly different answers → distrust of any single number."** Users run Fidelity, NerdWallet, ProjectionLab, FireCalc and get results "from 'good to retire' to 'much grimmer'," eroding trust in all of them; tools perceived as opaque "black boxes." *Best-sourced cross-product finding — this is the wedge.* (financialmentor.com, retirementsuccessapp.com + FIRE/personalfinance threads.)
- **Users want "permission and confidence," not another precise-but-opaque number.** *(Treat as a synthesized insight across category commentary, NOT a verbatim quote — the quotation marks in the raw research were not traceable to one canonical post.)*
- **Boldin:** "super steep initial learning curve," users wishing for a "we do the first-time setup with you" session; black-box distrust (tool zeroes out a bank account in future years with no explanation, forcing a manual "Extra Cash" hack). (r/Bogleheads, r/retirement aggregated — High.)
- **Fidelity 2024 redesign regression:** retirement score gauge moved/removed and hard to find; year-by-year forecasts replaced by a short PDF dominated by legal disclosures. (r/fidelityinvestments — High.)
- **Monarch:** account-sync breakage is the #1 complaint and primary cancellation driver. (r/MonarchMoney — High.)

**The refinement (matters for our positioning):** the hardest incumbent failure is **data plumbing** — account-sync breakage and aggregator-driven duplicate cleanup (Monarch, Empower). That's an infrastructure problem a prettier funnel won't fix — but a **manual-first, local-first** design *sidesteps the entire class*. Frame the thesis as **"consumability AND trustworthy data handling,"** not consumability alone.

**Honest caveats:** (a) the corpus is power-user/FIRE-skewed, so consumability pain for *mainstream* users is more likely **understated** than overstated — a point in our favor. (b) The Boldin "flawed compounding" gripe is real (simple-average COLA ~2.54% vs compounded ~2.62%; Boldin shipped a July 2025 Monte Carlo correction) but it is a **math-accuracy/trust** issue, *not* consumability — do not use it to bolster the consumability case. (c) Empower's sales-call hostility and AUM-fee skepticism are *business-model* hostility, not UI.

---

## Strand 2 — Local-first / E2E architecture

### Confirmed
- **WASM + Web Workers easily clears a 1,000-path Monte Carlo sub-second.** Feasibility was never the question; even plain JS would likely clear it. WASM buys *headroom* and *deterministic float math across browsers* (matters for a "probability of adjustment" number users screenshot). *(The raw research cited a "~900ms / 1M iterations" byteiota benchmark and a "Metrologia 2023" PDF — **both URLs are HTTP 404 / fabricated; dropped.** Ground the perf argument on determinism + headroom, not invented benchmarks.)*
- **Non-extractable `CryptoKey` in IndexedDB is the canonical browser-E2E pattern** (Bitwarden/Proton/Signal-web). A `CryptoKey` created `extractable:false` round-trips through IndexedDB as an opaque handle; raw bytes never reach JS. (MDN SubtleCrypto/CryptoKey.)
- **Recovery-phrase + mandatory-export, no provider password-reset for data** is the industry-standard zero-knowledge model. (Signal PIN/SVR, Bitwarden master-password + Emergency Kit, Proton recovery phrase/file.)

### Build-shaping flags (NEW / changes the build)
1. **Skip `SharedArrayBuffer` + COOP/COEP.** Single-threaded WASM in **one** Worker is plenty for 1k paths. `SharedArrayBuffer` needs `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`, which are PWA-hostile (break third-party embeds, complicate the service worker). Only revisit if we ever scale to 10k+ paths with heavy per-path work. (MDN SharedArrayBuffer; web.dev/articles/coop-coep.)
2. **A non-extractable key is *convenience*, NOT the at-rest security boundary.** `extractable:false` stops **script** exfiltration only — it does **not** stop an attacker with file-system/disk access. The real at-rest protection is the **encrypted blob + the KDF**. → This forces an explicit product decision (**defer to /ce:plan**): (i) re-derive the key from the passphrase each session (more secure, more friction), or (ii) persist the unwrapped key but gate it behind device biometric / OS lock. **This decision sets the strength of the at-rest privacy posture (local-first; the key never leaves the device) — now R16 encrypted-at-rest hygiene, not the dropped R15 "we can't see your money" marketing claim.** (MDN + OWASP key-storage guidance.)
3. **KDF (OWASP Password Storage Cheat Sheet, verified line-by-line against the GitHub raw md):**
   - **Argon2id is OWASP-preferred:** `m=19456 (19 MiB), t=2, p=1` **or** `m=47104 (46 MiB), t=1, p=1`. **But Argon2id is NOT in browser WebCrypto** — it needs a WASM lib (`hash-wasm` / `argon2-browser`).
   - **PBKDF2-HMAC-SHA256 @ 600,000 iterations** is the WebCrypto-native fallback (SHA-512 = 220,000; SHA-1 = 1,400,000, legacy-only).
   - **Correction:** do **not** state "OWASP says PBKDF2 is the Argon2 fallback" — OWASP's stated fallback order is **Argon2id → scrypt → bcrypt (legacy) → PBKDF2 (only when FIPS-140 compliance is required)**. PBKDF2-600k is still OWASP-acceptable, so the build fork stands — **and it is genuinely open** (R16: PBKDF2-600k is acceptable and the maximalist Argon2id justification is *no longer load-bearing* once the marketing claim dropped): **PBKDF2-600k (native, zero deps)** is the working baseline; **Argon2id-WASM (memory-hard, GPU-resistant)** stays an option **only if the engine ships WASM** — itself pending (v2 Technical Foundation: the TS-vs-WASM call hinges on the solver compute profile), so its marginal cost is no longer assumed-low. Decide at /ce:plan. Salt = 16 random bytes (`crypto.getRandomValues`), stored with ciphertext; derive AES-GCM-256, `extractable:false`.
4. **Jazz DOWNGRADE.** The requirements doc called Jazz "the best-evidenced E2E engine" — **correct that.** Jazz is mid-rewrite: **"Jazz 2.0 alpha" (announced 2026-04-18), an entirely new API locked to the `alpha` prerelease channel.** Building a financial-PII persistence core on an alpha API is a **foundation risk.** Bigger point: a **single-device encrypted PWA MVP may not need a sync engine at all** (E2E sync is already deferred to post-v1). If/when cross-device sync is added, **Evolu is *less in-flux* than Jazz** (12-word mnemonic identity, SQLite, CRDT; just finished an Effect-removal rewrite) — but **both are pre-stable**; "Evolu is stable" oversells it. (jazz.tools, github.com/garden-co/jazz; evolu.dev.)
5. **Tauri (Phase-2, not MVP-blocking):** avoid **Stronghold** — not formally deprecated in the v2 docs, but the signal it's on a sunset path is broad (maintainer + issue discussion that it'll be deprecated/removed in v3, though **no dated official roadmap entry**), and the upstream IOTA `stronghold.rs` engine has had **no code push since 2025-04-23**. Use **OS keychain (Rust `keyring` crate — drop-in community plugins exist, e.g. `tauri-plugin-keyring`) + SQLCipher-encrypted SQLite.** Spot-check specific SQLCipher plugin crates before adopting.
6. **Recovery, sharpened:**
   - **Separate *login* recovery from *data-decryption* recovery.** (Proton model. NOTE: the raw research *inverted* this — verifier fixed it: the **recovery phrase recovers BOTH login and data**; the **email/SMS reset** is the login-only path that strands encrypted data. Conflating them = users reset their password, get back in, find their plan unreadable.)
   - **Mandatory export at onboarding** (prompt-and-confirm the phrase during account creation, present as a printable kit) — a "remind me later" path is where users get burned. The phrase is itself a full credential (offline storage, phishing/screenshot threat model).
   - **IndexedDB eviction:** Safari/WebKit can clear script-writable storage after ~7 days of Safari use *without interaction with the site*. **Materially mitigated for a home-screen-installed PWA** (its use-counter is tied to PWA use) **+ `navigator.storage.persist()`** — but treat as best-effort. So the **exported phrase is the real durability backstop** after eviction, not optional resilience. (WebKit ITP storage policy; MDN Storage API.)

### Still-unverified (this strand)
- `cfu288.com` non-extractable-key article (site unreachable; topic corroborated by MDN — lean on MDN).
- Presence/absence of deprecation text on the JS-rendered Tauri v2 Stronghold docs page (couldn't confirm from static HTML).
- Exact SQLCipher plugin crate names (`tauri-plugin-rusqlite2`, `tauri-plugin-libsql`) — plausible, spot-check.

---

## Strand 3 — Regulatory: Roth what-if vs the Investment Advisers Act

> **⚠️ ARCHIVE-AS-RATIONALE (2026-06-04 thesis reset).** The Back Nine is now a **personal, non-commercial tool** (`../plans/direction-reset-2026-06-04.md`). Reg BI / the Investment Advisers Act govern *compensated advice to clients*; this product meets neither the relationship nor the compensation prong, so **this entire strand is no longer a live constraint.** It is retained as the documented *why* — the rationale behind the v1 guardrails (no-verdict, no-optimizer, categorical-only triggers, the attorney-gate) — so a future **re-commercialization** can re-instate them deliberately rather than rediscover them. The honesty descendants survive on their own merits (certainty-hygiene, no-false-precision); only the *regulatory* obligations lapse. Nothing below binds the current build.

### Bottom line
**The posture holds — but the load-bearing defense is not the disclaimer.** It is that **a Roth-conversion what-if that names no securities is probably not "advice about securities" at all**, so the IAA threshold (Prong A of the §202(a)(11) ABC(S) test) likely never closes. A Roth conversion is a decision about the *tax wrapper and timing of income recognition*, not the *advisability of investing in/buying/selling securities*. The disclaimer is good hygiene; **"not securities advice" is the actual shield.** Confidence: **defensible, not airtight** — there is **no on-point SEC no-action letter**, and the defense degrades on drift.

### The counter-authority (the most important new fact)
Under **Reg BI** and the SEC's **2019 RIA Interpretation (IA-5249)**, the SEC treats a recommendation of an **account type** — explicitly including **Traditional-vs-Roth IRA and rollover recommendations** — as a **"recommendation of an investment strategy involving securities,"** and the **April 2023 SEC Staff Bulletin** folds a client's **tax status** into the securities "investment profile." Two caveats keep this from sinking the posture: (a) those frameworks regulate **firms already in a securities-advisory/brokerage relationship making recommendations to specific clients** — they don't independently convert a standalone educational tool into an adviser; and (b) they bite on a **recommendation** ("you should convert $X"), not a hypothetical calculator.

**→ NET, the single most important planning constraint from this whole workflow:** a **user-driven calculator** likely stays clear of the line; a **personalized Roth *verdict*** plausibly *is* an "investment strategy involving securities" in the SEC's current view — **even though it names no individual ticker.** Our **categorical-trigger + user-initiated + no-imperative** design is therefore *more load-bearing than assumed and exactly right.* The "no verdicts, it's a calculator the user drives" guardrail is the ballgame.

### Where real risk actually lives (ranked)
1. **Securities DRIFT (the only place the IAA bites).** The gate closes the instant copy/mechanic touches *which securities* — "convert your equities," asset-**location** advice ("hold high-growth assets in the Roth" — IA-1092 treats *categories of securities* as securities advice), or presenting an assumed growth rate as a *recommendation* vs a hypothetical input. **Keep the lever strictly about tax dollars, brackets, RMD/IRMAA, and break-even. Never name securities, asset classes, or asset location.** A disclaimer will **not** cure status — substance over form.
2. **The compensation prong IS met.** A subscription is "compensation for" the service (IA-1092: indirect/integrated fees count). **Don't hide behind "educational/free."** We win on Prong A (not securities advice) + tool framing, **not** on compensation.
3. **Tax-practice / state consumer-protection law — the likelier real exposure.** Individualized *tax* output sits under tax-practice rules and state UPL/consumer law, not the IAA. The instructive precedent is **Intuit/FTC-style deceptive-practices** (*not* SEC). → **Certainty hygiene:** "estimated / projected / hypothetical / may," never "you will save / guaranteed / optimal."
4. **State (NASAA) adviser law** mirrors federal but can be more aggressive; "holding out as a financial planner" is a state factor → call it a "planning tool / calculator / what-if simulator," not a "financial planner."

### Market calibration (verified)
**Boldin and ProjectionLab both ship PAID, personalized Roth optimization** — Boldin's Roth Conversion Explorer *identifies opportune conversion years*; ProjectionLab's Optimizer (v4.6.0, Apr 2026) *auto-selects conversion amounts to hit a target bracket* — **and still hold the education line.** So personalized math + a subscription fee ≠ IAA adviser, and the **practical industry line is "no securities named," not "no personalization."** We can choose to be **more conservative** (a calculator, not an optimizer that issues a verdict) given the Reg BI counter-authority — a deliberate, defensible choice, not timidity. **ProjectionLab Terms §6** (verified verbatim, "Last Updated Feb 10, 2026" — "Educational and Informational Purposes Only… not… financial, tax, or legal advice… No Reliance…") is our **model Terms language.**

### Citation corrections (do NOT carry the bad ones into a Terms doc)
- **FTC final order against Intuit was VACATED by the 5th Circuit (~Mar 2026)** on separation-of-powers grounds (in-house ALJ). Cite the **intact $141M 50-state AG settlement (May 2022)** as the durable deceptive-practices precedent, not the vacated FTC order.
- **DOL "April 20, 2026"** = the *effective date of the 2024-rule removal* restoring the **1975 five-part test** (notice published Mar 20, 2026), not a freestanding event; the 2024 rule never took effect (enjoined July 2024). Net effect on our posture: unchanged/strengthened. Confirm currency at build time (politically contingent).
- Drop bare `sec.gov` / `nasaa.org` / `velocitylaw.com` / `achievable.me` / `intuit.com/legal/terms/` index links as load-bearing. Keep the pinned primaries: **Cornell LII** (15 U.S.C. §80b-2; Lowe v. SEC 472 U.S. 181), **eCFR** (29 CFR §2509.96-1, DOL IB 96-1 Category 4 = "questionnaires, worksheets, software"), **federalregister.gov**, **projectionlab.com/terms**.

### Lawyer-gate before this is load-bearing in a real Terms doc / marketing claim
The Reg BI/RIA contradiction; the absence of an on-point SEC no-action letter; and the drift edges (**asset-location guidance, growth-rate-as-recommendation**) are a "get securities/IA counsel to bless the exact lever copy and the no-securities/no-asset-location boundary" gate. Cheap insurance against the drift risk that is the whole ballgame.

---

## Strand 4 — Engine correctness reference cases (the validation contract)

The Success Criteria demand the engine be "validated against known-good reference cases." Here they are. **Verifier corrections applied — the raw research had a landmine (a wrong Trinity bond number designated as a golden oracle, which would have failed a *correct* engine).**

### Solver validation — NEW (2026-06-04): the *recommendation* must be right, not just the number
The 2026-06-04 thesis reset (`../plans/direction-reset-2026-06-04.md`) makes the product **recommend** a strategy, so the contract GROWS. The cases below validate the engine's *number*; a recommender needs three more classes, all **gating before the solver is allowed to speak** (a wrong recommended strategy costs real dollars):
- **(a) Optimality / ranking oracle** — hand-computable cases where the best drawdown/conversion order is *known* (conventional taxable→tax-deferred→Roth ordering; a textbook bracket-filling Roth optimum), so a confidently-wrong recommendation **fails loud** — the way Trinity/Bengen make "the number is right" testable.
- **(b) Ranking-stability under CRN** — the *ranking* (not just each pairwise delta) must be stable on the shared draw matrix, or the recommendation jitters. Generalize the 2-arm CRN test to **K candidate strategies → identical normals path-for-path** across the survivor MFJ→single transition.
- **(c) Grade calibration** — "just do it" must *actually* be robust across the futures and "coin-flip" *actually* a coin-flip. The sole human gate (N=1 cold-read) judges a grade's **tone** but is structurally unable to judge its **correctness** — so this automated oracle is the only backstop on a tool moving real money.
- **Optimizer's-curse correction (part of the contract):** argmax over many candidates on ONE seed overfits that seed's noise → the in-sample winner's score is optimistically biased. **Report graded confidence on an independent held-out seed-set** (or paired top-K dispersion). Compounded: directional-until-pinned fixtures decide the exact near-ties the optimizer overfits, so **pinning the §Strand-5 primaries is a hard solver prerequisite**, not a residual gate.

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
- **Pfau/Kitces:** high-CAPE environments imply a **3–3.5%** safe rate, not 4% — corroborates the requirements doc's "deliberately conservative real returns" decision.

### Methodology landmines (bake into engine tests)
- **Volatility drag (the #1 MC bug).** Geometric ≈ Arithmetic − σ²/2. For a lognormal sim use **log-drift μ = arithmetic_mean − σ²/2**, else you **overstate** compounding. *(This nuances the requirements doc's "arithmetic-average growth, not compound" line — the precise statement: feed the arithmetic mean but subtract σ²/2 as drift.)* **Unit test:** +50% then −50% → **two-year cumulative −25%, annualized geometric −13.4%** *(verifier relabel — don't conflate cumulative with annualized).*
- **"Success" = $1 remaining hides magnitude.** Also report **terminal-value percentiles + depth-of-failure**, not just pass/fail — this is what feeds the "probability of adjustment" dollar-grammar (we need the distribution, not a binary).
- **Longevity:** use **cohort, not period** life tables (period understates longevity). **Joint-and-survivor must be DERIVED** from single-sex curves: **P(last survivor alive) = p_x + p_y − p_x·p_y**. ~25% of 65-year-olds live past 90; **~53% chance at least one of a 65-yo couple reaches 90**. *(The ~53% is NOT the symmetric ~25% applied to both — that yields 43.75% under p_x+p_y−p_x·p_y; the ~53% reflects **sex-differentiated** cohort survival (women materially higher), so the engine must use **sex-specific curves per spouse**, never one rate for both, and the longevity test asserts the couple figure = the formula on the two shipped curves, not a hardcoded constant. Independence is assumed — real spousal mortality is positively correlated, mildly overstating last-survivor probability, which errs safe for a survival floor.)* **Do not model a fixed "to-age-90" horizon** — it systematically misstates ruin probability for a couple. SSA cohort tables = **`table4c7.html`** (period = `table4c6.html`). **[CORRECTED 2026-06-11 at the pin pass: `table4c7.html` does NOT exist (404) — "4.C7" is Trustees-Report table NUMBERING, not a filename; only the period table URL is real. The actual cohort tables are SSA's HistEst downloadables (`CohLifeTables_{M,F}_Alt2_TR2024.csv`), now committed sha256-pinned at `src/engine/reference/ssa-snapshot/`. The ~25%/~53% anchors above were the grounded-search-era population figures; the PINNED household cohorts (male 1969 / female 1972) give S(90|65) 0.3209/0.4348 → couple 0.6162 — younger cohorts survive materially longer.]**
- **Rebalancing:** Trinity/Bengen/FIRECalc all assume annual rebalance to target — match it or results drift.
- **Local oracle:** `github.com/boknows/cFIREsim-open` (Shiller data from 1871, rolling one-year-shifted windows) to generate golden historical outputs for our own input sets.

### Still-unverified (this strand)
- Case A (Bengen 1966) bit-exactness depends on the exact Ibbotson dataset — pin before relying.
- SSA figures (table designations, "~53% at-least-one-to-90") were grounded-search-verified, **not** parsed from the SSA tables directly (SSA bot-blocks curl) — confirm against the actual table files before load-bearing.

---

## Strand 5 — Tax reference for the strategy solver (added 2026-06-04; scope grown to multi-control + healthcare)

> **Scope grown (2026-06-04 thesis reset).** Strand 5 began as the numbers for a *single Roth lever*; the reset makes the product a **multi-control solver** (withdrawal sequencing + conversion) with **income-dependent healthcare**, so the tax surface is bigger. **§Strand 5 is now TWO sources together:** the bracket/RMD/SS-tax reference below **plus** the dedicated **`./pre65-healthcare-aca-hsa-2026-06-04.md`** grounding note (ACA-PTC, IRMAA, HSA — cited, directional until pinned). **New falsifiable IN/OUT line:** a tax/health effect is **IN iff withdrawal sequencing or a conversion can move it** — IN: ordinary brackets, standard deduction, RMDs, SS-taxation, MFJ→single, **ACA-PTC (pre-65), IRMAA (post-65), cap-gains/qualified-dividend stacking**; OUT-but-disclosed: NIIT, state. **Two distinct MAGI calculators** (ACA-MAGI ≠ IRMAA-MAGI). **Legislative landmine:** the enhanced ACA subsidies **expired 12/31/2025, unre-enacted as of 2026-06-04** → model the **400% FPL cliff as the 2026 base case**, expose "enhanced" as a scenario toggle, **re-verify every build.**

*Per the single-source rule ("reference numbers live in the findings doc only"), tax numbers live **here**, not inlined in the plan. Verified via gemini-grounding 2026-06-04 (Tax Foundation 2026 bracket tables; IRS RMD FAQ; SECURE 2.0; OBBBA; + the healthcare note's IRS/CMS primaries). **Confidence: defensible/directional — NOT yet pinned to the IRS primaries (see exit gate). Mark fixtures "directional" in code until pinned, exactly as Strand 4 does.***

### The legal basis (this is itself a staleness-stamp fact)
**The One Big Beautiful Bill Act (OBBBA), signed 2025-07-04, made the TCJA individual rate structure (10/12/22/24/32/35/37) and the elevated standard deduction PERMANENT** — so 2026 is **not** a TCJA-sunset reversion to pre-2018 brackets, which is what would have happened absent legislation (TCJA individual provisions were set to expire 12/31/2025). **Why this matters for the build:** Unit 9's "tax-table vintage" staleness clock is therefore *not* tracking a known one-time 2026 reversion — it tracks (a) annual inflation indexing of a permanent bracket structure, (b) the senior-bonus-deduction sunset (below — a *guaranteed* future staleness), (c) the RMD-age step (below), and (d) any future law change. **Stamp the legal basis (OBBBA-2025), not just the year**, so a future statutory change is falsifiable rather than mistaken for inflation drift.

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
- After the first death, an empty-nest retired couple files **SINGLE the year after** (year of death = still MFJ; Qualifying-Surviving-Spouse MFJ-equivalent rates apply for up to two following years **only with a dependent child in the home** — which the target couple almost never has, so **no QSS grace** — IRS Pub 501). The survivor's same real dollars then fall into **~half-width single brackets with ~half the standard deduction** → the "tax cliff" converting-while-both-file-MFJ defuses. The **joint→survivor two-regime boundary Phase 1 already models doubles as the MFJ→single filing-status switch** — no new boundary.
- **Additional age-65+ standard deduction** ≈ $1,650/spouse MFJ (2026) — supporting, pin exact.

### RMD start age — birth-year-derived, NOT a flat 73 (SECURE 2.0)
- born **≤ 1950 → 72**; born **1951–1959 → 73**; born **1960 or later → 75** (the 75 step is **effective 2033**). (The 1959 statutory drafting glitch resolves to **73** — current standard interpretation.) RMD = the IRS **Uniform Lifetime Table** divisor applied to the prior-year-end pre-tax balance; first RMD due by April 1 of the year after reaching RMD age. **The age is a per-person function of birth year and is legislatively scheduled to change (the 2033 step) — so it is a vintage-stamped/birth-year-keyed input, never a hardcoded literal.**

### Temporary Senior Bonus Deduction (OBBBA) — a guaranteed-to-go-stale provision
- **$6,000 per person age 65+ ($12,000 MFJ)**, on top of the standard deduction, claimable whether itemizing or not. **MAGI phase-out:** begins single > $75k / MFJ > $150k, reduced 6% per dollar over. Deduction = **$6,000 × (# spouses 65+)** reduced by **6% of (MAGI − $150k)** on a joint return. Fully gone: **single > $175k**; **MFJ > $250k when ONE spouse is 65+ ($6k), but MFJ > $350k when BOTH are 65+ ($12k)** — the both-65+ couple (the central post-65 conversion scenario) keeps it up to **$350k** MAGI. *(Source: IRS FS-2025-03; OBBBA P.L. 119-21 / H.R.1. A flat "MFJ > $250k" is the one-spouse case only and would overstate tax / understate conversion+IRMAA headroom in the $250–350k band — exactly where a conversion solver decides.)* **Available tax years 2025–2028 only; SUNSETS after 2028** unless extended. → Unit 9 must carry an explicit **sunset marker** (a calm note when an answer computed pre-2029 is viewed in/after 2029).

### Engine tax + health scope (decided 2026-06-04, Briggsy's call — "the most complete picture")
**IN the two-control solver's tax + health model (withdrawal sequencing + Roth conversion):** federal MFJ + single ordinary-income brackets, the standard deduction (+ age-65 additions + the senior-bonus deduction with its phase-out & sunset), birth-year-derived RMDs (Uniform Lifetime), each year's withdrawal/conversion taxed as ordinary income stacked on that year's other ordinary income, **Social-Security provisional-income taxation (the "tax torpedo")**, **capital-gains/qualified-dividend stacking from taxable-account withdrawals**, and **income-dependent healthcare — pre-65 ACA-PTC (400% FPL cliff is the 2026 base case; "enhanced" = a scenario toggle) and post-65 IRMAA (2-year MAGI lookback, a distinct MAGI definition, hard cliffs)** — every effect that withdrawal sequencing or a conversion can move (see the §Strand 5 banner above + `./pre65-healthcare-aca-hsa-2026-06-04.md`). **OUT-but-disclosed (next to the delta, candidate future levers):** NIIT (3.8% surtax) and state income tax — neither moves with sequencing or conversion.

**The falsifiable IN/OUT line (so the scope stays principled, not self-justifying):** a tax/health effect is **IN** iff **withdrawal sequencing or a Roth conversion can move it** — ACA-PTC and IRMAA are income-dependent, so a sequencing/conversion change shifts ACA-MAGI or IRMAA-MAGI across their cliffs, and an omitted cliff *inverts which strategy wins*, not just its size (this is exactly why they come IN). It is **OUT-but-disclosed** iff neither control can move it (NIIT = a 3.8% surtax; state tax = a parallel system). This **supersedes** the v1 single-Roth-lever bright line per the 2026-06-04 reset (`../plans/direction-reset-2026-06-04.md`).

### Social-Security benefit taxation (the "tax torpedo" — the numbers + the landmines)
- **Provisional ("combined") income = AGI excluding SS + tax-exempt interest + 50% of SS benefits.** MFJ tiers (the fraction of benefits that enters ordinary taxable income): **provisional < $32,000 → 0%; $32,000–$44,000 → up to 50%; > $44,000 → up to 85%** (single: $25,000 / $34,000). Exact inclusion follows the IRS Pub. 915 worksheet.
- **These thresholds are NOT inflation-indexed — frozen since 1983 ($32k) / 1993 ($44k).** So they have **no vintage/staleness clock** (unlike the brackets, which inflation-index annually): they are constants, not a dated fixture, and a frozen constant cannot go "stale." (This is *why* more retirees are caught each year — a feature to model honestly, not a bug.)
- **Computational landmine — the circularity (a per-year fixed-point, NOT a one-pass transform):** taxable SS depends on provisional income, which depends on the year's other ordinary income — including the **gross-up** withdrawal needed to cover spending + tax, which depends on the tax. The overlay resolves this per simulated year as a **bounded fixed-point** (iterate provisional-income → taxable-SS → tax → gross-up to convergence, a few passes; deterministic, reads **zero** random draws — so still CRN-safe). The engine seam must pin the convergence rule (iterate-to-stable or a fixed small pass count).
- **Not modeled (pending legislation):** the proposed "You Earned It, You Keep It Act" (would eliminate SS taxation) is **NOT law** as of 2026 — do not model speculative legislation; if enacted it becomes a §Strand-5 update + a tax-vintage bump.
- Pin all the above against **IRS Pub. 915** before the SS-tax fixture is golden.

*(All of §Strand 5 supports the two-control solver — withdrawal sequencing + Roth conversion — plus income-dependent healthcare. The survivor cliff is one driver among several, not the sole lever; the falsifiable IN/OUT line above (and the §Strand 5 banner) bounds the scope.)*

### Still-unverified (this strand — the exit gate; clear before any fixture is "golden")
- The 2026 bracket edges + standard deduction + age-65 addition + senior-bonus figures were **grounded-search-verified (Tax Foundation et al.), not parsed from the IRS primary**. Pin against the **IRS Revenue Procedure** publishing the 2026 inflation adjustments and **Pub. 501** (filing status / QSS) before the fixture is load-bearing.
- RMD divisors: pin against **IRS Pub. 590-B** (Uniform Lifetime Table) — same posture as Strand 4's Ibbotson/SSA gates.
- **The reg/attorney-gate has LAPSED** (personal-tool reset — see the §Strand 3 ARCHIVE-AS-RATIONALE banner above and `../plans/direction-reset-2026-06-04.md`); it is **not** a fixture exit gate. What survives as a real gate is **honesty hygiene on the recommendation copy across both controls**: the headline must wear its probabilistic hedge (copyGuard's *require-the-hedge* lint), no false precision, and a wrong tax/health fact behind the verdict is the cardinal sin — the reset transfers the load onto honesty + engine validation, which get *stricter* for a recommender. (The §Strand 3 categorical-trigger / no-securities / one-regulated-lever framing is preserved there only as the documented WHY for a future re-commercialization; it does not bind this build.)

---

## What this changes in the requirements doc (summary)

> **Superseded in part by the 2026-06-04 thesis reset.** The summary below reflects what the 2026-06-03 research changed in the *v1* requirements. Item 4 (Regulatory) is now **archive-as-rationale** — see the Strand 3 banner and `../plans/direction-reset-2026-06-04.md`. Items 1–3, 5 still hold (and the engine validation contract has since GROWN for the solver — see the Strand 4 "Solver validation" subsection).
1. **Problem Frame** — consumability thesis now evidence-verified; refine to "consumability AND trustworthy data handling."
2. **Technical Foundation / Engine** — add the validation contract; sharpen "arithmetic-average growth" → log-drift μ = arithmetic − σ²/2; cohort + joint-survivor longevity.
3. **Technical Foundation / Form factor** — single-worker WASM (skip SAB); non-extractable-key-is-convenience-not-boundary (gates R16 encrypted-at-rest hygiene); Argon2id-WASM vs PBKDF2-600k fork; **downgrade Jazz (alpha)**; keyring-crate path; recovery sharpening.
4. **Key Decisions / Regulatory** — "not securities advice" is the real defense; the **no-verdict/calculator guardrail is load-bearing** (Reg BI counter-authority); never name securities/asset-classes/asset-location; certainty hygiene; compensation prong is met; ProjectionLab Terms as model.
5. **Dependencies / Outstanding** — the two formerly-unverified fronts (UX, architecture) are now verified; residual gates are the lawyer-review (regulatory) and dataset/table confirmations (engine).
