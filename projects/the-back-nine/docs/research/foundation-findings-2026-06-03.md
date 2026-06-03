---
date: 2026-06-03
topic: the-back-nine-foundation-findings
status: verified (research → adversarial verification), corrections applied
method: hand-rolled fan-out workflow (4 strands × research + adversarial verifier), gemini-grounding + curl. NOT the broken deep-research pipeline.
---

# The Back Nine — Foundation Findings (verified)

The cited evidence behind the requirements doc's locked decisions. Four strands, each researched then **adversarially verified** by a second agent that tried to refute every load-bearing claim. **All verifier corrections below are already applied** — the raw research contained real errors (fabricated benchmarks, a misstated crypto hierarchy, an inverted recovery-flow claim, a missing SEC counter-authority, and a dangerous wrong Trinity number); this doc carries the corrected version. Confidence tags are preserved — do **not** flatten "defensible" or "directional" into "verified."

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
2. **A non-extractable key is *convenience*, NOT the at-rest security boundary.** `extractable:false` stops **script** exfiltration only — it does **not** stop an attacker with file-system/disk access. The real at-rest protection is the **encrypted blob + the KDF**. → This forces an explicit product decision (**defer to /ce:plan**): (i) re-derive the key from the passphrase each session (more secure, more friction), or (ii) persist the unwrapped key but gate it behind device biometric / OS lock. **This decision gates whether R15's "we can't see your money" is honestly sayable.** (MDN + OWASP key-storage guidance.)
3. **KDF (OWASP Password Storage Cheat Sheet, verified line-by-line against the GitHub raw md):**
   - **Argon2id is OWASP-preferred:** `m=19456 (19 MiB), t=2, p=1` **or** `m=47104 (46 MiB), t=1, p=1`. **But Argon2id is NOT in browser WebCrypto** — it needs a WASM lib (`hash-wasm` / `argon2-browser`).
   - **PBKDF2-HMAC-SHA256 @ 600,000 iterations** is the WebCrypto-native fallback (SHA-512 = 220,000; SHA-1 = 1,400,000, legacy-only).
   - **Correction:** do **not** state "OWASP says PBKDF2 is the Argon2 fallback" — OWASP's stated fallback order is **Argon2id → scrypt → bcrypt (legacy) → PBKDF2 (only when FIPS-140 compliance is required)**. PBKDF2-600k is still OWASP-acceptable, so the build fork stands: **PBKDF2-600k (native, zero deps)** vs **Argon2id-WASM (memory-hard, GPU-resistant, preferred)**. Since we already ship a WASM engine, **Argon2id-WASM is low marginal cost — lean that way** (decision → /ce:plan). Salt = 16 random bytes (`crypto.getRandomValues`), stored with ciphertext; derive AES-GCM-256, `extractable:false`.
4. **Jazz DOWNGRADE.** The requirements doc called Jazz "the best-evidenced E2E engine" — **correct that.** Jazz is mid-rewrite: **"Jazz 2.0 alpha" (announced 2026-04-18), an entirely new API locked to the `alpha` prerelease channel.** Building a commercial financial-PII persistence core on an alpha API is a **foundation risk.** Bigger point: a **single-device encrypted PWA MVP may not need a sync engine at all** (E2E sync is already deferred to post-v1). If/when cross-device sync is added, **Evolu is *less in-flux* than Jazz** (12-word mnemonic identity, SQLite, CRDT; just finished an Effect-removal rewrite) — but **both are pre-stable**; "Evolu is stable" oversells it. (jazz.tools, github.com/garden-co/jazz; evolu.dev.)
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
- **Longevity:** use **cohort, not period** life tables (period understates longevity). **Joint-and-survivor must be DERIVED** from single-sex curves: **P(last survivor alive) = p_x + p_y − p_x·p_y**. ~25% of 65-year-olds live past 90; **~53% chance at least one of a 65-yo couple reaches 90**. **Do not model a fixed "to-age-90" horizon** — it systematically misstates ruin probability for a couple. SSA cohort tables = **`table4c7.html`** (period = `table4c6.html`).
- **Rebalancing:** Trinity/Bengen/FIRECalc all assume annual rebalance to target — match it or results drift.
- **Local oracle:** `github.com/boknows/cFIREsim-open` (Shiller data from 1871, rolling one-year-shifted windows) to generate golden historical outputs for our own input sets.

### Still-unverified (this strand)
- Case A (Bengen 1966) bit-exactness depends on the exact Ibbotson dataset — pin before relying.
- SSA figures (table designations, "~53% at-least-one-to-90") were grounded-search-verified, **not** parsed from the SSA tables directly (SSA bot-blocks curl) — confirm against the actual table files before load-bearing.

---

## What this changes in the requirements doc (summary)
1. **Problem Frame** — consumability thesis now evidence-verified; refine to "consumability AND trustworthy data handling."
2. **Technical Foundation / Engine** — add the validation contract; sharpen "arithmetic-average growth" → log-drift μ = arithmetic − σ²/2; cohort + joint-survivor longevity.
3. **Technical Foundation / Form factor** — single-worker WASM (skip SAB); non-extractable-key-is-convenience-not-boundary (gates R15); Argon2id-WASM vs PBKDF2-600k fork; **downgrade Jazz (alpha)**; keyring-crate path; recovery sharpening.
4. **Key Decisions / Regulatory** — "not securities advice" is the real defense; the **no-verdict/calculator guardrail is load-bearing** (Reg BI counter-authority); never name securities/asset-classes/asset-location; certainty hygiene; compensation prong is met; ProjectionLab Terms as model.
5. **Dependencies / Outstanding** — the two formerly-unverified fronts (UX, architecture) are now verified; residual gates are the lawyer-review (regulatory) and dataset/table confirmations (engine).
