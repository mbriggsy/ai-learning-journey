---
title: The market-return model — i.i.d. parametric lognormal, and the three caveats it bets on
doc-type: decision
status: ratified
created: 2026-06-30
derives-from: [docs/product.md, docs/architecture.md]
sources: [src/engine/rng.ts, src/engine/simulate.ts, src/engine/confidence.ts, src/engine/reference/methodology.ts, src/engine/historical.ts, src/engine/__tests__/simulate.test.ts, src/engine/validation/blockBootstrap.ts, src/engine/validation/nearTieInversion.ts, scripts/stress-near-tie-inversion.ts]
---

# The market-return model

## What this record is

This is the **permanent decision record** for how the Monte Carlo spine generates market returns — the draw distribution (**§1**), the engineering that is *not* in question (**§2**), and the **three caveats the model bets on, each with its direction-of-error named** (**§3–§5**), the aggregate bet (**§6**), and the trigger that would force a richer draw (**§7**).

It exists because the cardinal rule — *calm-but-wrong is the sin* — demands that the model's one optimistic bet be a **§-cited contract on paper, with its direction named**, not tribal knowledge in a builder's head. Until this record landed, the best-documented calls in the repo were the tax ones ([ss-computation.md](ss-computation.md), [other-income-r40.md](other-income-r40.md)); the **least**-documented was the load-bearing one — the draw under everything. This closes that gap.

The load-bearing engine invariants this rides (the single shared market draw / CRN, stateless Box-Muller, reduce-to-spine) are canonical in [docs/architecture.md](../architecture.md). This record holds the *distributional* decision and its honesty caveats, and links there for the invariants.

> **Provenance.** The caveats in §3–§5 were sharpened in an adversarial exchange (two Claude sessions, 2026-06-30). The challenge was never the engineering (§2) — it was that the model bets optimistic on the one axis the product swears off, *right where the decision lives*, and that the guardrail meant to catch it is measured against a survivor. The exchange itself was never transcribed — **this record is its only preserved form**, written as fact rather than debate. (The council log carries the *downstream* rulings that cite these sections: the runway reconciliation 2026-07-18 and the U16 pre-build council `wf_8d4c6f65-415` 2026-07-22, whose honesty-hawk veto turns on §3–§6 naming the 70–90% band optimistic — [`docs/council-log.md`](../council-log.md).)

---

## §1 — The decision: i.i.d. parametric lognormal

Each path-year's market return is drawn from a **parameterized lognormal**, **independently** year to year. No historical sequence is sampled by the shipped draw — the only historical resampling in the repo is the validation-side block-bootstrap probe of §7, which never runs on a product path.

1. `buildDraws` generates a matrix of standard normals from one seeded `mulberry32` stream — stateless Box-Muller, two uniforms per normal, in a **dimension-only order** so two parameter sets under one seed consume byte-identical draws (the CRN substrate; `simulate.ts:62`, `rng.ts:46`). The only stochastic draws are **stock, bond, and longevity** — there is no third market factor (`simulate.ts:69-87`).
2. The user's **simple-space, real** moments `(mean, stdDev)` per asset convert to the exact `(μ, σ)` of the underlying normal via `toLogMoments`, **with the `−σ²/2` volatility drag** (`rng.ts:73`).
3. Each year: `simpleR = exp(μ + σ·z) − 1` (`simpleReturnFromNormal`, `rng.ts:82`) — a lognormal one-plus-return by construction.
4. Stock and bond are coupled by a **single Cholesky step**: `zb = ρ·zs + √(1−ρ²)·zbRaw` (`simulate.ts:1514`). One shared `(stock, bond)` draw per path-year drives every bucket; buckets differ only in tax treatment (the no-asset-location invariant).

Two moment sets exist (`methodology.ts`): `validationMarket` (Ibbotson SBBI, calibrates the Mode-B band only) and `productionMarket` (Pfau/Kitces high-CAPE, the conservative real-user default, ~3–3.5% safe band). Both are **REAL, simple-space**; both are fully user-overridable — the engine injects nothing.

---

## §2 — What is NOT in question (the clean engineering)

So that the caveats below are read as *distributional*, not as defect-hunting, the following are **correct and load-bearing** and this record does not relitigate them:

- **Volatility drag.** `toLogMoments` carries `−σ²/2`, derived from the *simple* σ (not a reused log-space σ). Omitting it is the #1 Monte Carlo bug; deriving σ_log from the simple s forbids the second-order sibling bug. Correct (`rng.ts:60-77`).
- **CRN / single shared draw.** One market draw per path-year across all buckets, dimension-only draw order, stateless Box-Muller. This is the right architecture for ranking K candidates on identical paths (`simulate.ts:55-88`, [architecture.md](../architecture.md)).
- **MC-below-historical, *as a rail*.** Asserting the MC band sits below the same-engine historical anchor in the stress region is a real guardrail, not theater (`simulate.test.ts:68-80`). Its *reach* is the subject of §4 — but the mechanism is sound.

---

## §3 — Caveat A: no sequence persistence — **direction: OPTIMISTIC**

i.i.d. lognormal has **zero autocorrelation**: `simpleReturnFromNormal(lm, z)` has no term that knows what last year did. The 1966 retiree was not killed by a single deep tail draw — they were killed by a **sustained, autocorrelated, inflation-front-loaded grind**. i.i.d. can only produce that shape as a freak run of independent unlucky years, at a probability mass **below** what history assigns it.

This is sharper than a tail-thinness complaint because of **how the headline is computed**: the reading is a **survival *count*** (`survivors / paths`), not a percentile of terminal wealth (`confidence.ts:6`). The on-track verdict that decides whether a friend retires fires at **85% survival** (`BANDS.onTrack = 0.85`, `confidence.ts:43-47`). What sets that count is *how many paths cross zero* — driven by clustered grinds in the **middle** of the distribution, exactly the shape i.i.d. under-samples. (The deep-tail p10 of terminal wealth feeds only the *dollar* room/trim hint, `confidence.ts:207` — not the headline state.)

**Net:** the model under-counts the paths that deplete via sequence risk → **overstates the survival fraction → overstates the X-of-10 headline, precisely at the 85% decision line.** Optimistic, on the axis the product swears off.

---

## §4 — Caveat B: the rail is US-survivor-anchored and does not bite at the decision boundary — **direction: the guardrail does not catch optimism where it matters**

The MC-below-historical assertion is real but its **reach is narrow**, by the test's own words:

- It bites at **4% spend, where historical saturates ≥97% and MC lands in (0.88, 0.97)** — the over-funded deep end (`simulate.test.ts:68-80`).
- The **very next test is titled *"the relation is TWO-SIDED"*** and **explicitly disclaims the rail in the 70–90% survival band**: "MC no longer sits below history… may cross" (`simulate.test.ts:82-91`). That 70–90% band is **exactly where the 85% on-track decision sits.**

So the guardrail holds where plans are already over-funded and is *deliberately not asserted* at the go/no-go line. The friend's actual decision boundary is **unrailed**.

And the anchor itself is a high-side draw: the historical series are **US-only** — Shiller 1925–1995 + Damodaran total-return, with `validationMarket` calibrated to Ibbotson SBBI (US) (`historical.ts:1-22`, `methodology.ts:32-48`). There is **no non-survivor path** (no Japan-1990, no global ex-US). "Below US history" is therefore a **kind ceiling**: a model can sit obediently under the single luckiest major equity market of the 20th century and still be optimistic about risk in absolute terms.

**Net:** the rail constrains the over-funded region against a survivor benchmark; it does **not** constrain the 1st–15th-percentile region at the 85% decision line, which is where lognormal thinness + survivor-anchoring compound.

---

## §5 — Caveat C: inflation is a fixed deflator — **direction: OPTIMISTIC for inflation-driven regimes**

The spine is **real-space only**: `validateParams` rejects nominal returns (`market.returnsAreReal` must be true, `market.space` must be `'simple'`; `simulate.ts:600-601`), and `buildDraws` generates **no inflation draw** — `simulate.ts` never reads `.inflation` (zero references). Inflation is a **constant 3% deflator** baked into the real moments.

The tell: `methodology.ts:36` carries `inflation: { mean: 0.03, stdDev: 0.041 }` — **a standard deviation that sits in the assumptions and is consumed by nothing.** Inflation *variance*, and its *correlation to poor real returns* — the actual engine of 1966, where a high-inflation regime erodes real returns in a sustained, correlated way — are **not modeled**. There is no back door: nothing in `src/` reads `inflation.stdDev` — that field is inert. The *mean* is not inert, but both of its consumers are deterministic and sit outside the spine — `intakeMap.ts:544` hands it to `compileIncomeStreams` as the R40 point estimate that grows a fixed-pct stream, and `AssumptionPanel.tsx:546` renders it to the user as "about 3% a year". Neither introduces a draw.

**Net:** for high-inflation sequences, the correlated real-return erosion that actually depletes early retirees is **absent** → survival is **overstated** for exactly those regimes. Optimistic. Stochastic-correlated inflation would recapture a large share of regime risk; until it exists, this caveat is at **full magnitude**.

---

## §6 — The aggregate bet (and why v1 accepted it)

All three caveats push the **same direction — optimistic — on sequence/inflation *regime* risk**, the one axis the product's cardinal rule swears off. That concentration is the reason this record exists and is ratified rather than silently carried.

**Why v1 ships on it anyway, honestly:**

- The **production default is deliberately conservative** (Pfau/Kitces high-CAPE real moments → ~3–3.5% safe band, `methodology.ts:56-72`). Pulling the *mean* down is a blunt, documented hedge against the *shape* gap — it does not reproduce sequence risk, but it does not pretend to, and it biases the headline pessimistic on the level even while the shape is optimistic.
- The MC band **is** asserted below the historical anchor where it can be (§2/§4) — a real, if narrow, floor.
- A richer draw (block-bootstrap + stochastic correlated inflation) needs **externally-derived golden fixtures** (DND 012 — a value computed by the engine's own formula proves typing, not correctness), which is a deliberate, scoped piece of work, not a one-line swap. The deferral was **stress-tested, not assumed**: the U16 §S0.2 near-tie inversion probe ran the block-bootstrap shape against the shipped i.i.d. draw on 2026-07-22 and did **not** fire, ratifying the deferral on the record (the run, its pre-registered criterion, and what it does *not* buy are in §7).

What v1 must **not** do is let the conservative mean *launder* the shape gap into a "we're conservative, therefore safe" claim. The level is conservative; the **shape is optimistic**; those are different axes and this record keeps them separate.

---

## §7 — The trigger that forces a richer draw

Build the richer model when **any** of these fire:

1. The product moves from "directional, conservative-mean" to **claiming a calibrated probability** at the 85% line (the moment the headline's *number* — not just its direction — is load-bearing for a real retire/no-retire call). This trigger has already bitten once, as a **copy** gate rather than a build one: the U16 honesty-hawk veto (2026-07-18 runway reconciliation, re-affirmed by council `wf_8d4c6f65-415` 2026-07-22) ruled that the surplus-pivot absolute *"you're safe either way"* fires trigger 1 **deterministically**, because it is a survival-ceiling claim in the 70–90% band §3–§5 name optimistic. The sanctioned exit taken was the reframe — delta-as-hero, survival context source-bound to the spine's own confidence object — not the richer draw.
2. A **non-survivor or global series** is added to the historical anchor (Japan-1990, global ex-US), making the §4 ceiling honest — at which point the MC band should be re-asserted against it across the 70–90% range, not only the saturated region.
3. Inflation display/nominal mode ships (the inert `stdDev` at `methodology.ts:36` becomes live), at which point inflation **must** become a stochastic factor correlated to real returns, not a deflator.

**What the build requires** (so the future pass inherits the constraints):

- **Block bootstrap of the real series** (preserve autocorrelation + the inflation-front-loaded shape) and/or a **regime-switching draw**, as a new draw mode behind the existing `(params, seed)` purity contract — the CRN dimension-only draw order and the single-shared-draw invariant **do not move** (architecture.md). The bootstrap half already exists **validation-side** and is the prototype a shipped mode starts from: `src/engine/validation/blockBootstrap.ts` moving-block-resamples the committed Shiller series’ 70 real years (1926–1995, deflated through the shipped `toRealSeries`) in standardized log space — the world keeps its own marginal `(μ, σ)` and varies **only** in temporal shape, longevity uniforms held verbatim — and feeds `simulate` through the harness-only `_injectedDraws` seam (`simulate.ts:1268`), proven byte-identical to a plain run when handed `buildDraws`' own matrix. It is a **probe, never a draw mode**: no externally-derived fixtures, and it refuses a ρ≠0 world (the injected normals bypass the engine's Cholesky step).
- **Stochastic, real-return-correlated inflation** as a third market factor in `buildDraws` (a new normal per path-year), wired through the deflator the overlay and SS COLA read.
- **Externally-derived fixtures** for both (DND 012): block-bootstrap success rates and inflation-correlation moments derived by an independent path, committed, and proven by the hide-the-artifact clean-clone discipline (AJS 008) — never the engine validating itself.
- The **MC-below-historical assertion re-scoped** to state explicitly which percentile band it constrains, so a future reader cannot mistake the over-funded-region rail (§4) for a decision-boundary guarantee.

**The one measurement taken since (2026-07-22) — and what it does not buy.** The U16 §S0.2 gate asked the narrow question the recommendation surface depends on: does the *difference-keyed* conversion-vs-no-conversion advantage **invert** under the historical temporal shape at the near-tie line? Run by `scripts/stress-near-tie-inversion.ts` on the measured Q4d Medicare-bearing near-tie class (16k paths × 12 pre-registered seeds, against a fires-criterion fixed in `nearTieInversion.ts` before the first run): control mean advantage +0.00264 (conversion winner 12/12); L=10 bootstrap +0.00236, L=5 +0.00285, L=1 permutation null +0.00242 — 12/12 positive in every arm, the sign never inverting in any of the 36 rep-arms. **NO FIRE**, so the richer-draw deferral is ratified on the record and the conversion-near-tie demotion carries the residual (verdict stamped in `docs/plans/features/act4-u16-recommendation-surface-build-spec.md` §S0.2). This buys nothing for §3–§5: it measured a *difference* between two candidates on identical draws, where the common-mode shape bias largely cancels — **not** the absolute survival level, which is where the three caveats bite. §3–§5 stand at full magnitude and the §7 triggers stay live. One committed-data fact worth inheriting rather than re-deriving: on the committed Shiller series’ 70 real years (1926–1995) the **annual equity** lag-1 autocorrelation is only **≈ +0.03** in log space, while the **bond/inflation** leg reads **≈ +0.59** — so a block bootstrap's persistence witness is the bond channel (the §5 grind), not equities, and per-path equity lag-1 measured over short horizon rows is dominated by the −1/(n−1) finite-sample bias rather than any real signal (the witness is pinned on the bond leg for exactly that reason, `blockBootstrap.test.ts:125-150`).

Until then: **the model is i.i.d. parametric lognormal with a deliberately conservative mean and a fixed deflator — optimistic on regime risk, by the amounts named in §3–§5, conservative on the level by §6.** That is the honest contract.
