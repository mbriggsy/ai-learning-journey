---
title: U7 items e1–e2 — the survivor-conditioned engine distribution + the survivor readout (as built)
doc-type: build-spec
date: 2026-06-27
status: shipped
note: e1 + e1b + e1c (engine) and e2 (UI) all shipped; e2 cold-read cleared 2026-06-27
phase: Act 2 · U7
modules: [src/engine/simulate.ts, src/engine/confidence.ts, src/shared/model.ts]
---

The whole unit shipped on 2026-06-27: the engine surface (e1 · e1b · e1c) and the `SurvivorReadout` UI
(e2), the latter cold-read-cleared the same day. Per-unit build status lives in the roadmap's
[You-Are-Here table](../../roadmap.md) — this doc records the decisions, the statistic's definition, and
the landmines the build caught. §3 is the blessed statistic and why the alternative was rejected; §4 the
fixture discipline; §5 where the code lives; §6–§7 what shipped and the calls made along the way.

## 1 · The gap this unit closed (confirmed 2026-06-24, re-confirmed first-hand 2026-06-27)

Before e1 the engine emitted no survivor-specific distribution. `Distribution` carried only the JOINT
`survivalFraction = survivors / paths` (`simulate.ts:1844`) — a path "survives" iff its portfolio
never depleted (`depletionYear === NEVER_DEPLETED`). That single number cannot separate "the plan held
while both were alive" from "the plan carried the SURVIVOR through widowhood." `bandFan.cohortFraction`
is household *existence* (≥1 alive), not survivor *survival* — it cannot substitute.

The survivor phase is the **fragile** one: at the first death one Social Security benefit ends, filing
flips MFJ→single (smaller brackets, half the deduction, lower SS-taxation thresholds), and spending only
steps down to `survivorSpendingRatio` (~0.75) — a partial offset. So the survivor-conditioned outcome is
**typically worse than the joint headline**, and a calm joint number *hides* that elevated risk. That is
the exact calm-but-wrong sin this readout exists to prevent. (The SS sub-engine review already caught an
optimistic survivor-floor bug — see insight 040. The cash math was already correct going in, and the
adversarial pass in §6 is what kept the optimism from re-entering at the *statistic* layer.)

## 2 · The approach — additive, observed-not-perturbed (the bandFan precedent)

Each path ALREADY simulates the full couple→survivor→both-dead timeline (`cashTermsForYear` bakes in the
step-down + §202 benefit). So e1 added ZERO new simulation — it OBSERVES per-path state already computed,
exactly as `buildBandFan` does:

- Per path the loop has `deathOffsets` (each spouse's sampled death year) and the resolved `depletionYear`.
  A **survivor phase** exists iff `min(deathOffsets) < max(deathOffsets)` and `min(deathOffsets) < horizon`
  (one spouse outlives the other within the window) — `isSurvivorPhasePath` (`simulate.ts:1119`).
- The survivor-conditioned statistic rides a presence-keyed, opt-in sink (`options.survivorConditioned`,
  mirroring `wantFan`), reduced after the loop by `buildSurvivorConditioned`. A run WITHOUT the option
  allocates nothing and is **byte-identical** (reduce-to-spine). `fixed-horizon` mode (nobody dies) yields
  no survivor phase ⇒ the surface is absent — byte-identical to the Trinity/Bengen goldens.

This inherits every engine invariant for free: one shared draw / CRN (we read state, never draw), the
reduce-to-spine byte-identity guard, presence-keyed never value-derived.

## 3 · THE DECISION (Briggsy's call, 2026-06-27) — what survivor statistic?

The honest survivor coverage reading is "as the survivor, your plan covers **X of 10** futures." The
question was the denominator/numerator definition. **Briggsy blessed (A), equal-weight**, my recommended
option; that is what `buildSurvivorConditioned` computes.

**(A) — BLESSED — survivor-conditioned survival fraction.** Among paths WITH a survivor phase, the
fraction whose portfolio never depleted. Simple, observed-not-perturbed, and it surfaces the survivor's
elevated risk (it typically comes out ≤ the joint number on a fragile plan — the honest signal). A path
that depleted *before* the first death counts as a failure (the survivor inherits a failed plan).

**(B) — REJECTED — survivor-phase-isolated.** Among paths with a survivor phase, the fraction that
depleted DURING or after the survivor phase specifically (`depletionYear ≥ firstDeathOffset`). Isolates
survivor-caused failures from all-alive failures — more precise, but it can read *higher* than (A), which
risks under-stating the survivor's inherited risk, so it was not taken as the headline.

**The sub-question on (A) — equal-weight, not early-widowhood-weighted.** Weighting the denominator toward
EARLY widowhood (the long, fragile survivor phase) is more pointed but more complex; equal-weight is
simpler and already conservative, so v1 shipped equal-weight. The cold-read did not ask for a sharper
early-widowhood emphasis, so it stands.

Plus the **income step-down magnitude** (the $ figure `slots.verdictSurvivorStepDown` expects): the
representative per-month household-income drop at widowhood, median across survivor-phase paths, observed
from the cash terms. §6 records the shipped semantics — a GROSS pre-tax income drop measured at a
steady-state year, *not* the "net of the spending step-down, at the first-death boundary" this section
originally sketched.

## 4 · Externally-derived fixtures (DND 012) + danger

A golden computed via the engine's own survivor formula proves typing, not correctness. The fixtures in
`src/engine/__tests__/survivorConditioned.test.ts` are hand-built deterministic scenarios — fixed
`deathOffsets`, `pia = 0` on the people so no §202 survivor benefit muddies the all-alive leg, known
spend + SS — where every income drop is exact paper arithmetic independent of the engine. Depleting and
holding paths are paired so the conditioning is non-vacuous (insight 029 — an equality on a
structurally-zero surface discriminates nothing). That same `pia = 0` device cut both ways: it
structurally zeroed the §202 mechanism, so the original `≥ 0` guard over those fixtures was vacuous —
exactly the 029 trap. A dedicated §202-present fixture family (section 4b of the test file) closes it,
and is where the steady-state-anchor goldens live.

Danger gates, as shipped: (a) the ≤-joint inequality is **deliberately NOT asserted**. It is the honest
*typical* direction, not a guarantee — paths with no survivor phase are excluded from the survivor
denominator but counted in the joint one, so a legitimate run can invert it. The fragile-plan test instead
pins that the statistic is live (`survivorPhasePaths > 0`) and `< 1` on a plan that genuinely fails often,
which is the case the reading exists to surface. (b) the reduce-to-spine byte-identity test holds on both
arms — a fixed-horizon / no-death run emits nothing, and a survivor-on run is bit-identical on
`terminalValuesReal`/`survivalFraction`/`depletionYears` including alongside `taxAware` and `bandFan`.

## 5 · Where the code lives

- `src/shared/model.ts` — `SurvivorConditioned` (the fraction, the survivor-phase count, and
  `incomeStepDownMonthlyReal`) hanging optional off `Distribution`, and `SurvivorReading` hanging optional
  off `SimulationResult`. Both presence-keyed, the `bandFan`/`taxAware` precedent.
- `src/engine/simulate.ts` — `isSurvivorPhasePath`, `buildSurvivorConditioned`,
  `survivorIncomeStepDownMonthlyReal`, the `options.survivorConditioned` opt-in sink, and
  `cashTermsForYear`'s additive `nonPortfolioIncomeReal` return field.
- `src/engine/confidence.ts` — `buildSurvivorReading`, emitting `survivorReading` presence-keyed.
- `src/engine/engineProtocol.ts` · `engineWire.ts` · `roth.ts` — the presence-keyed pass-through that
  carries `survivorConditioned` + `survivorReading` across the worker boundary and the Roth wrapper.
- `src/ui/SurvivorReadout.tsx` + `src/ui/styles/survivor.css` — the e2 surface, mounted by
  `ConfidenceStatement.tsx` and fed by `answerView.ts`.
- Tests: `src/engine/__tests__/survivorConditioned.test.ts` and
  `src/ui/__tests__/SurvivorReadout.test.tsx`; preview fixtures in `src/ui/preview/fixtures.ts`.

## 6 · e1b + e1c — the income step-down + the survivor reading (adversarially verified 2026-06-27)

**e1b — the income step-down magnitude.** `SurvivorConditioned.incomeStepDownMonthlyReal` (real $/month,
≥ 0), computed by `survivorIncomeStepDownMonthlyReal()` in `simulate.ts`. `cashTermsForYear` gained an
additive, draw-free return field `nonPortfolioIncomeReal = earned + ongoing + ss`. The helper re-runs the
pure cash function in the POST-LOOP reduction (zero draws → reduce-to-spine byte-identity preserved).

**Locked decisions (all mine under full delegation; carried into the e2 cold-read in §7):**
- **$X = gross PRE-TAX non-portfolio income drop** (SS + ongoing other income + earned), **not** "net of the
  spending step-down" — the copy says *income*, and netting the spending relief would understate it (the
  cardinal direction) and contradict the words.
- **Pre-tax**, MFJ→single bracket flip left as a SEPARATE qualitative clause. Its sign on the after-tax cliff
  is genuinely household-dependent (higher rate, less income), so folding an ambiguous tax delta into $X
  would be dishonest precision.
- **Median, not mean** (outlier-robust).
- **Counterfactual at the STEADY-STATE year** `tStar = min(maxHorizonYears − 1, survivorDeath − 1,
  max(fd, claimYear))` — no lower clamp is needed because `survivorDeath > fd ≥ 0` on any survivor-phase
  path, so `tStar ≥ fd`. `claimYear` is the later of the two SS-claim offsets. The per-path drop is
  floored at 0 (`max(0, incomeBothAlive − incomeSurvivor)`).

**The landmine the adversarial pass caught (and fixed) — keep it caught.** The first draft anchored the
counterfactual at the RAW first-death year `fd`. For a death that lands **after retirement but before
claiming** (e.g. delay-SS-to-70), the all-alive leg at `fd` has $0 SS (neither spouse claimed yet) while the
survivor already draws a §202 widow(er) benefit at 60 → the per-path "drop" goes **negative** (income
"rising" at widowhood), dragging the median **down** = the cardinal **understatement**. A 4-lens adversarial
workflow empirically reproduced **−$2,753/mo** on a real household (the generalized lesson is
[insight 045](../../insights/045-a-counterfactual-differenced-at-an-event-understates-when-a-streams-onset-is-decoupled-from-the-event.md),
its canonical home). Fix: the steady-state anchor (measure once
both would-be benefits are in pay status, capturing the deceased's delayed benefit the household would have
received) + a `max(0, …)` floor (covers the residual edge where the survivor dies before the steady state).
Regression guard: `survivorConditioned.test.ts` pins a pre-claim-death golden of **$1,000/mo** — a raw fd
anchor yields negative, a floor-only fix yields 0; **only the steady-state anchor yields 1,000**.

**e1c — the survivor reading.** `SurvivorReading` + `SimulationResult.survivorReading?` (presence-keyed).
`buildSurvivorReading()` in `confidence.ts` runs the survivor fraction through the SAME quantize → 9-cap
honesty clamp → `selectOutcomeState` bands as the joint headline (so a calm joint 9-of-10 surfaces a fragile
4-of-10 survivor outlook). `already-failing` keys to the JOINT early-death signal by design (a survivor can't
be a calm survivor of a year-0-unfundable plan). Tests are externally-derived (`confidence.test.ts`): each
fixture fraction is pinned to its `xOfTen` AND its band word, the 9-cap is pinned on an all-survive
survivor fraction, and the presence/absence keying and the joint-vs-survivor divergence are pinned too.

## 7 · e2 — the `SurvivorReadout` UI (cold-read cleared 2026-06-27)

`src/ui/SurvivorReadout.tsx` + `src/ui/styles/survivor.css` (+ `__tests__/SurvivorReadout.test.tsx`). The
quieter SECOND statement — same verdict grammar as the joint surface (glyph + word + "X of 10"
+ magnitude) at one step down in scale (`--text-xl` vs the joint `--text-2xl`), set off by a `--line-soft`
hairline, so it reads as "and here's the survivor's view," never a competing headline. Consumes
`SurvivorReading` directly. Two new copy keys (`survivorReadoutEyebrow`, `survivorReadoutCoverage`), both
survivor- AND verdict-scoped through copyGuard (`isSurvivorKey` matches on `survivor`, `isVerdictKey` on
the `readout` substring). Preview fixtures in `src/ui/preview/fixtures.ts` cover the five worded states
plus a ~$0-cliff suppression case (`SURVIVOR_NO_STEPDOWN`) and a just-above-the-boundary case
(`SURVIVOR_TINY_STEPDOWN`) — that pair straddles `formatPerMonth`'s rounding boundary deliberately, so a
naive `!== 0` suppression check fails loud (burned/070). Those two fixtures came out of a focused 4-lens
review that caught a regression-net hole over the $0-cliff suppression, after the N=1 cold-read.

The live-app wiring landed 2026-06-28 (council-chosen): `ConfidenceStatement` mounts the readout beneath
the spine verdict — inline when it is the only subordinate face, folded behind a calm `<details>` when the
floor relief already holds the one inline X-of-10 slot (build-gate 7: at most ONE subordinate count on the
first frame). Both render below the band so the scrub tap-targets never move (insight 035).

**Load-bearing correctness pins (in `SurvivorReadout.test.tsx`):**
- The over-funded near-ceiling reads the PROPORTION "better than 9 in 10" via `xOfTenAtCeiling` (the
  10-of-10 honesty clamp), exactly as the joint surface — never a bare "9 of 10" / "10 of 10".
- The income-cliff clause **SUPPRESSES** when the step-down rounds to ~$0 (the residual edge where the
  survivor dies before the steady-state anchor) — never "steps down about $0". The check rides the SAME
  formatter the slot renders, so "shown" and "non-zero" cannot disagree.
- `indeterminate` → renders **nothing** (defensive absent, not a wordless verdict). The engine never tags a
  survivor reading indeterminate (`selectOutcomeState` reserves it for the degenerate-input early-return,
  which fires before any survivor reading is built), but the type allows it — insight 044: fail to absent,
  never bake "can't happen" into the render.

**The three open cold-read questions — RESOLVED (2026-06-27, Briggsy's calls; my rec taken on each):**
1. **The tax clause em-dash → SPLIT.** `verdictSurvivorStepDown` reads "If one of you is on your own later,
   the household's monthly income steps down about $X — as one Social Security benefit ends. **Taxes also
   move to a single filer's brackets.**" The tax shift is its OWN sentence (not appositive to $X), so the
   em-dash binds only to the SS income cause and $X reads cleanly as the pre-tax income drop. (The $X
   semantics were already honest in `model.ts`; this fixed the typographic fold-risk.)
2. **The SS-only attribution → KEPT median-scoped for v1.** "one Social Security benefit ends" stays (the
   representative retired household; $X also covers any lost pension/earned income, the minority case).
   D2 wired real households on 2026-06-28 and the string is unchanged, but the revisit is still OWED, not
   settled: `copy.ts`'s own comment above `verdictSurvivorStepDown` still reads "revisit when D2 wires
   real households", and no re-read is recorded anywhere. A future reader inherits that obligation.
3. **The eyebrow echo → DE-ECHOED.** The eyebrow was a near-verbatim prefix of the income clause; it now
   reads "And if you're on your own" (frames the survivor statement as the follow-on to the joint answer;
   the "on your own" motif recurs intentionally, the verbatim repeat is gone). The glyphs + the whole
   sentence read calm-but-honest (the already-failing drop-to-floor glyph is not alarmist).
