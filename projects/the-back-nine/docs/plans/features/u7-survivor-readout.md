---
title: U7 item (e1) — the survivor-conditioned engine distribution (design, PENDING BLESSING)
date: 2026-06-27
status: e1 + e1b + e1c BUILT & adversarially verified 2026-06-27 · e2 (UI) remaining — eye-oracle, deferred to a cold-read
phase: Act 2 · U7
modules: [src/engine/simulate.ts, src/engine/confidence.ts, src/shared/model.ts]
---

> **UPDATE 2026-06-27:** Briggsy blessed statistic **(A)** (§3). **e1 — the engine distribution — is
> BUILT**: `simulate`'s opt-in `survivorConditioned` surface emits the equal-weight survivor-conditioned
> survival fraction (`SurvivorConditioned` in `model.ts`; `isSurvivorPhasePath`/`buildSurvivorConditioned`
> in `simulate.ts`), externally-derived + reduce-to-spine + byte-identity tested
> (`survivorConditioned.test.ts`). **e1b + e1c are now also BUILT & adversarially verified (see §6).
> Remaining: e2 only** (`SurvivorReadout` — eye-oracle, deferred to a cold-read). The §3–§5 below are the
> as-blessed recipe; §6 records what shipped and the open cold-read questions.

## 1 · The gap (confirmed 2026-06-24, re-confirmed first-hand 2026-06-27)

The engine emits NO survivor-specific distribution. `Distribution` carries only the JOINT
`survivalFraction = survivors / paths` (`simulate.ts:1309`) — a path "survives" iff its portfolio
never depleted (`depletionYear === NEVER_DEPLETED`). That single number cannot separate "the plan held
while both were alive" from "the plan carried the SURVIVOR through widowhood." `bandFan.cohortFraction`
is household *existence* (≥1 alive), not survivor *survival* — it cannot substitute.

The survivor phase is the **fragile** one: at the first death one Social Security benefit ends, filing
flips MFJ→single (smaller brackets, half the deduction, lower SS-taxation thresholds), and spending only
steps down to `survivorSpendingRatio` (~0.75) — a partial offset. So the survivor-conditioned outcome is
**typically worse than the joint headline**, and a calm joint number *hides* that elevated risk. That is
the exact calm-but-wrong sin this readout exists to prevent. (The SS sub-engine review already caught an
optimistic survivor-floor bug — see insight 040. The cash math is now correct; this unit must not
re-introduce the optimism at the *statistic* layer.)

## 2 · The approach — additive, observed-not-perturbed (the bandFan precedent)

Each path ALREADY simulates the full couple→survivor→both-dead timeline (`cashTermsForYear` bakes in the
step-down + §202 benefit). So e1 needs ZERO new simulation — it OBSERVES per-path state already computed,
exactly as `buildBandFan` does:

- Per path the loop has `deathOffsets` (each spouse's sampled death year) and the resolved `depletionYear`.
  A **survivor phase** exists iff `min(deathOffsets) < max(deathOffsets)` and `min(deathOffsets) < horizon`
  (one spouse outlives the other within the window).
- Collect a survivor-conditioned statistic in a presence-keyed, opt-in sink (mirroring `wantFan`), reduced
  after the loop. A run WITHOUT the option allocates nothing and is **byte-identical** (reduce-to-spine).
  `fixed-horizon` mode (nobody dies) yields no survivor phase ⇒ the surface is absent — byte-identical to
  the Trinity/Bengen goldens.

This inherits every engine invariant for free: one shared draw / CRN (we read state, never draw), the
reduce-to-spine byte-identity guard, presence-keyed never value-derived.

## 3 · THE DECISION (Briggsy's call) — what survivor statistic?

The honest survivor coverage reading is "as the survivor, your plan covers **X of 10** futures." The
question is the denominator/numerator definition. My recommendation first:

**(A) — RECOMMENDED — survivor-conditioned survival fraction.** Among paths WITH a survivor phase, the
fraction whose portfolio never depleted. Simple, observed-not-perturbed, and it surfaces the survivor's
elevated risk (it comes out ≤ the joint number on a fragile plan — the honest signal). A path that
depleted *before* the first death counts as a failure (the survivor inherits a failed plan).

**(B) — survivor-phase-isolated.** Among paths with a survivor phase, the fraction that depleted DURING
or after the survivor phase specifically (`depletionYear ≥ firstDeathOffset`). Isolates survivor-caused
failures from all-alive failures — more precise, but it can read *higher* than (A), which risks
under-stating the survivor's inherited risk. I do NOT recommend this as the headline.

**Open sub-question on (A):** weight the denominator toward EARLY widowhood (the long, fragile survivor
phase — the dangerous case), or treat every survivor phase equally? Equal-weight is simpler and already
conservative; an early-widowhood emphasis is more pointed but more complex. **My lean: equal-weight (A)
for v1**, revisit if the cold-read wants sharper early-widowhood emphasis.

Plus the **income step-down magnitude** (the $ figure `slots.verdictSurvivorStepDown` already expects):
the representative per-month household-income drop at widowhood (one SS benefit ends + the bracket flip,
net of the spending step-down). Observed from the cash terms at the first-death boundary; median across
survivor-phase paths. (Sub-decision: separate observed statistic vs. derived — minor, I'll recommend at
build time.)

## 4 · Externally-derived fixtures (DND 012) + danger

A golden computed via the engine's own survivor formula proves typing, not correctness. Hand-construct a
tiny deterministic scenario — fixed `deathOffsets` (force an early first death), known flat returns, a
known spend + SS — where the survivor-phase depletion year is **hand-computable on paper**, independent
of the engine. Assert the survivor-conditioned fraction against that. Pair an EARLY-widowhood path that
DEPLETES with a both-survive-long path that holds, so the conditioning is non-vacuous (insight 029 — an
equality on a structurally-zero surface discriminates nothing).

Danger gates: (a) the survivor fraction must be ≤ the joint fraction on the fragile fixture (the honest
direction); a fixture where it reads *higher* is a design smell to investigate, not accept. (b) the
reduce-to-spine byte-identity test (a fixed-horizon / no-death run emits nothing and is bit-identical on
`terminalValuesReal`/`survivalFraction`/`depletionYears`).

## 5 · Build plan (once §3 is blessed)

1. `model.ts`: add the additive, optional `survivorConditioned?` surface on `Distribution` (presence-keyed,
   the `bandFan`/`taxAware` precedent) — the fraction + the step-down magnitude + the survivor-phase count.
2. `simulate.ts`: an opt-in sink (mirroring `wantFan`); observe per-path firstDeath/depletion in the loop;
   reduce + emit after. ZERO perturbation; reduce-to-spine guard extended.
3. Externally-derived fixtures + the reduce-to-spine/byte-identity tests + the ≤-joint danger assertion.
4. `confidence.ts`: derive the survivor reading (the same vocabulary as the joint reading — "X of 10").
5. THEN e2: `SurvivorReadout.tsx` (eye-oracle) — DEFERRED to a Briggsy cold-read.

## 6 · e1b + e1c — BUILT & adversarially verified (2026-06-27)

**e1b — the income step-down magnitude.** `SurvivorConditioned.incomeStepDownMonthlyReal` (real $/month,
≥ 0), computed by `survivorIncomeStepDownMonthlyReal()` in `simulate.ts`. `cashTermsForYear` gained an
additive, draw-free return field `nonPortfolioIncomeReal = earned + ongoing + ss`. The helper re-runs the
pure cash function in the POST-LOOP reduction (zero draws → reduce-to-spine byte-identity preserved).

**Locked decisions (all mine under full delegation; flagged for the e2 cold-read):**
- **$X = gross PRE-TAX non-portfolio income drop** (SS + ongoing other income + earned), **not** "net of the
  spending step-down" — the copy says *income*, and netting the spending relief would understate it (the
  cardinal direction) and contradict the words.
- **Pre-tax**, MFJ→single bracket flip left as a SEPARATE qualitative clause. Its sign on the after-tax cliff
  is genuinely household-dependent (higher rate, less income), so folding an ambiguous tax delta into $X
  would be dishonest precision.
- **Median, not mean** (outlier-robust).
- **Counterfactual at the STEADY-STATE year** `tStar = clamp(max(fd, claimYear), fd, min(maxHorizon−1,
  survivorDeath−1))`, both legs floored at 0.

**The landmine the adversarial pass caught (and fixed) — keep it caught.** The first draft anchored the
counterfactual at the RAW first-death year `fd`. For a death that lands **after retirement but before
claiming** (e.g. delay-SS-to-70), the all-alive leg at `fd` has $0 SS (neither spouse claimed yet) while the
survivor already draws a §202 widow(er) benefit at 60 → the per-path "drop" goes **negative** (income
"rising" at widowhood), dragging the median **down** = the cardinal **understatement**. A 4-lens adversarial
workflow empirically reproduced **−$2,753/mo** on a real household. Fix: the steady-state anchor (measure once
both would-be benefits are in pay status, capturing the deceased's delayed benefit the household would have
received) + a `max(0, …)` floor (covers the residual edge where the survivor dies before the steady state).
Regression guard: `survivorConditioned.test.ts` pins a pre-claim-death golden of **$1,000/mo** — a raw fd
anchor yields negative, a floor-only fix yields 0; **only the steady-state anchor yields 1,000**.

**e1c — the survivor reading.** `SurvivorReading` + `SimulationResult.survivorReading?` (presence-keyed).
`buildSurvivorReading()` in `confidence.ts` runs the survivor fraction through the SAME quantize → 9-cap
honesty clamp → `selectOutcomeState` bands as the joint headline (so a calm joint 9-of-10 surfaces a fragile
4-of-10 survivor outlook). `already-failing` keys to the JOINT early-death signal by design (a survivor can't
be a calm survivor of a year-0-unfundable plan). Tests are externally-derived; survivor band edges pinned.

**OPEN cold-read questions for e2 (do NOT resolve these without Briggsy's eye — wording is his domain):**
1. **The tax clause em-dash (P2, conf 0.4).** `verdictSurvivorStepDown` reads "...the household's monthly
   income steps down about $X — one Social Security benefit ends, and taxes move to a single filer's
   brackets." `$X` is the PRE-TAX income drop; the em-dash can let a reader fold the (excluded) tax effect
   INTO $X → understatement. Decide at cold-read whether to split the tax shift into its own sentence /
   label $X as before-tax. (The number's semantics are honest in the `model.ts` contract; only the typographic
   binding is at issue.)
2. **The SS-only attribution (P3, conf 0.3).** $X also includes lost earned + ongoing other income, but the
   copy explains it solely as "one Social Security benefit ends." Honest for the SS-dominated MEDIAN (the
   representative retired late-widowhood path) but incomplete for a working-age or pension-reliant household.
   Decide whether to keep the median scoped (so the SS clause stays representative) or generalize the clause.
3. **The whole survivor sentence + glyph** — the eye-oracle call e2 was always reserved for.
