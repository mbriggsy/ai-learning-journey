---
title: The market-return model — i.i.d. parametric lognormal, and the three caveats it bets on
doc-type: decision
status: ratified
created: 2026-06-30
derives-from: [docs/product.md, docs/architecture.md]
sources: [src/engine/rng.ts, src/engine/simulate.ts, src/engine/confidence.ts, src/engine/reference/methodology.ts, src/engine/historical.ts, src/engine/__tests__/simulate.test.ts]
---

# The market-return model

## What this record is

This is the **permanent decision record** for how the Monte Carlo spine generates market returns — the draw distribution (**§1**), the engineering that is *not* in question (**§2**), and the **three caveats the model bets on, each with its direction-of-error named** (**§3–§5**), the aggregate bet (**§6**), and the trigger that would force a richer draw (**§7**).

It exists because the cardinal rule — *calm-but-wrong is the sin* — demands that the model's one optimistic bet be a **§-cited contract on paper, with its direction named**, not tribal knowledge in a builder's head. Until this record landed, the best-documented calls in the repo were the tax ones ([ss-computation.md](ss-computation.md), [other-income-r40.md](other-income-r40.md)); the **least**-documented was the load-bearing one — the draw under everything. This closes that gap.

The load-bearing engine invariants this rides (the single shared market draw / CRN, stateless Box-Muller, reduce-to-spine) are canonical in [docs/architecture.md](../architecture.md). This record holds the *distributional* decision and its honesty caveats, and links there for the invariants.

> **Provenance.** The caveats in §3–§5 were sharpened in an adversarial exchange (two Claude sessions, 2026-06-30). The challenge was never the engineering (§2) — it was that the model bets optimistic on the one axis the product swears off, *right where the decision lives*, and that the guardrail meant to catch it is measured against a survivor. The exchange is preserved in [`docs/council-log.md`](../council-log.md); the verdict is recorded below as fact, not debate.

---

## §1 — The decision: i.i.d. parametric lognormal

Each path-year's market return is drawn from a **parameterized lognormal**, **independently** year to year. No historical sequence is sampled.

1. `buildDraws` generates a matrix of standard normals from one seeded `mulberry32` stream — stateless Box-Muller, two uniforms per normal, in a **dimension-only order** so two parameter sets under one seed consume byte-identical draws (the CRN substrate; `simulate.ts:62`, `rng.ts:46`). The only stochastic draws are **stock, bond, and longevity** — there is no third market factor (`simulate.ts:69-87`).
2. The user's **simple-space, real** moments `(mean, stdDev)` per asset convert to the exact `(μ, σ)` of the underlying normal via `toLogMoments`, **with the `−σ²/2` volatility drag** (`rng.ts:73`).
3. Each year: `simpleR = exp(μ + σ·z) − 1` (`simpleReturnFromNormal`, `rng.ts:82`) — a lognormal one-plus-return by construction.
4. Stock and bond are coupled by a **single Cholesky step**: `zb = ρ·zs + √(1−ρ²)·zbRaw` (`simulate.ts:1219`). One shared `(stock, bond)` draw per path-year drives every bucket; buckets differ only in tax treatment (the no-asset-location invariant).

Two moment sets exist (`methodology.ts`): `validationMarket` (Ibbotson SBBI, calibrates the Mode-B band only) and `productionMarket` (Pfau/Kitces high-CAPE, the conservative real-user default, ~3–3.5% safe band). Both are **REAL, simple-space**; both are fully user-overridable — the engine injects nothing.

---

## §2 — What is NOT in question (the clean engineering)

So that the caveats below are read as *distributional*, not as defect-hunting, the following are **correct and load-bearing** and this record does not relitigate them:

- **Volatility drag.** `toLogMoments` carries `−σ²/2`, derived from the *simple* σ (not a reused log-space σ). Omitting it is the #1 Monte Carlo bug; deriving σ_log from the simple s forbids the second-order sibling bug. Correct (`rng.ts:60-77`).
- **CRN / single shared draw.** One market draw per path-year across all buckets, dimension-only draw order, stateless Box-Muller. This is the right architecture for ranking K candidates on identical paths (`simulate.ts:55-88`, [architecture.md](../architecture.md)).
- **MC-below-historical, *as a rail*.** Asserting the MC band sits below the same-engine historical anchor in the stress region is a real guardrail, not theater (`simulate.test.ts:66`). Its *reach* is the subject of §4 — but the mechanism is sound.

---

## §3 — Caveat A: no sequence persistence — **direction: OPTIMISTIC**

i.i.d. lognormal has **zero autocorrelation**: `simpleReturnFromNormal(lm, z)` has no term that knows what last year did. The 1966 retiree was not killed by a single deep tail draw — they were killed by a **sustained, autocorrelated, inflation-front-loaded grind**. i.i.d. can only produce that shape as a freak run of independent unlucky years, at a probability mass **below** what history assigns it.

This is sharper than a tail-thinness complaint because of **how the headline is computed**: the reading is a **survival *count*** (`survivors / paths`), not a percentile of terminal wealth (`confidence.ts:6`). The on-track verdict that decides whether a friend retires fires at **85% survival** (`BANDS.onTrack = 0.85`, `confidence.ts:43-47`). What sets that count is *how many paths cross zero* — driven by clustered grinds in the **middle** of the distribution, exactly the shape i.i.d. under-samples. (The deep-tail p10 of terminal wealth feeds only the *dollar* room/trim hint, `confidence.ts:138` — not the headline state.)

**Net:** the model under-counts the paths that deplete via sequence risk → **overstates the survival fraction → overstates the X-of-10 headline, precisely at the 85% decision line.** Optimistic, on the axis the product swears off.

---

## §4 — Caveat B: the rail is US-survivor-anchored and does not bite at the decision boundary — **direction: the guardrail does not catch optimism where it matters**

The MC-below-historical assertion is real but its **reach is narrow**, by the test's own words:

- It bites at **4% spend, where historical saturates ≥97% and MC lands in (0.88, 0.97)** — the over-funded deep end (`simulate.test.ts:66-78`).
- The **very next test is titled *"the relation is TWO-SIDED"*** and **explicitly disclaims the rail in the 70–90% survival band**: "MC no longer sits below history… may cross" (`simulate.test.ts:80-89`). That 70–90% band is **exactly where the 85% on-track decision sits.**

So the guardrail holds where plans are already over-funded and is *deliberately not asserted* at the go/no-go line. The friend's actual decision boundary is **unrailed**.

And the anchor itself is a high-side draw: the historical series are **US-only** — Shiller 1925–1995 + Damodaran total-return, with `validationMarket` calibrated to Ibbotson SBBI (US) (`historical.ts:1-22`, `methodology.ts:32-48`). There is **no non-survivor path** (no Japan-1990, no global ex-US). "Below US history" is therefore a **kind ceiling**: a model can sit obediently under the single luckiest major equity market of the 20th century and still be optimistic about risk in absolute terms.

**Net:** the rail constrains the over-funded region against a survivor benchmark; it does **not** constrain the 1st–15th-percentile region at the 85% decision line, which is where lognormal thinness + survivor-anchoring compound.

---

## §5 — Caveat C: inflation is a fixed deflator — **direction: OPTIMISTIC for inflation-driven regimes**

The spine is **real-space only**: `validateParams` rejects nominal returns (`market.returnsAreReal` must be true, `market.space` must be `'simple'`; `simulate.ts:546-547`), and `buildDraws` generates **no inflation draw** — `simulate.ts` never reads `.inflation` (zero references). Inflation is a **constant 3% deflator** baked into the real moments.

The tell: `methodology.ts:36` carries `inflation: { mean: 0.03, stdDev: 0.041 }` — **a standard deviation that sits in the assumptions and is consumed by nothing.** Inflation *variance*, and its *correlation to poor real returns* — the actual engine of 1966, where a high-inflation regime erodes real returns in a sustained, correlated way — are **not modeled**. There is no back door; the field is inert.

**Net:** for high-inflation sequences, the correlated real-return erosion that actually depletes early retirees is **absent** → survival is **overstated** for exactly those regimes. Optimistic. Stochastic-correlated inflation would recapture a large share of regime risk; until it exists, this caveat is at **full magnitude**.

---

## §6 — The aggregate bet (and why v1 accepted it)

All three caveats push the **same direction — optimistic — on sequence/inflation *regime* risk**, the one axis the product's cardinal rule swears off. That concentration is the reason this record exists and is ratified rather than silently carried.

**Why v1 ships on it anyway, honestly:**

- The **production default is deliberately conservative** (Pfau/Kitces high-CAPE real moments → ~3–3.5% safe band, `methodology.ts:56-72`). Pulling the *mean* down is a blunt, documented hedge against the *shape* gap — it does not reproduce sequence risk, but it does not pretend to, and it biases the headline pessimistic on the level even while the shape is optimistic.
- The MC band **is** asserted below the historical anchor where it can be (§2/§4) — a real, if narrow, floor.
- A richer draw (block-bootstrap + stochastic correlated inflation) needs **externally-derived golden fixtures** (DND 012 — a value computed by the engine's own formula proves typing, not correctness), which is a deliberate, scoped piece of work, not a one-line swap.

What v1 must **not** do is let the conservative mean *launder* the shape gap into a "we're conservative, therefore safe" claim. The level is conservative; the **shape is optimistic**; those are different axes and this record keeps them separate.

---

## §7 — The trigger that forces a richer draw

Build the richer model when **any** of these fire:

1. The product moves from "directional, conservative-mean" to **claiming a calibrated probability** at the 85% line (the moment the headline's *number* — not just its direction — is load-bearing for a real retire/no-retire call).
2. A **non-survivor or global series** is added to the historical anchor (Japan-1990, global ex-US), making the §4 ceiling honest — at which point the MC band should be re-asserted against it across the 70–90% range, not only the saturated region.
3. Inflation display/nominal mode ships (the inert `stdDev` at `methodology.ts:36` becomes live), at which point inflation **must** become a stochastic factor correlated to real returns, not a deflator.

**What the build requires** (so the future pass inherits the constraints):

- **Block bootstrap of the real series** (preserve autocorrelation + the inflation-front-loaded shape) and/or a **regime-switching draw**, as a new draw mode behind the existing `(params, seed)` purity contract — the CRN dimension-only draw order and the single-shared-draw invariant **do not move** (architecture.md).
- **Stochastic, real-return-correlated inflation** as a third market factor in `buildDraws` (a new normal per path-year), wired through the deflator the overlay and SS COLA read.
- **Externally-derived fixtures** for both (DND 012): block-bootstrap success rates and inflation-correlation moments derived by an independent path, committed, and proven by the hide-the-artifact clean-clone discipline (AJS 008) — never the engine validating itself.
- The **MC-below-historical assertion re-scoped** to state explicitly which percentile band it constrains, so a future reader cannot mistake the over-funded-region rail (§4) for a decision-boundary guarantee.

Until then: **the model is i.i.d. parametric lognormal with a deliberately conservative mean and a fixed deflator — optimistic on regime risk, by the amounts named in §3–§5, conservative on the level by §6.** That is the honest contract.
