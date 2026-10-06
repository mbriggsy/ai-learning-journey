---
title: The live solve's Tier-1 survival tie-tolerance is an exact 0 — a selection ruling, with its known cost named
doc-type: decision
status: ratified
created: 2026-10-06
derives-from: [docs/product.md, docs/plans/4-recommendation.md, docs/backlog.md]
sources: [src/intake/solveDispatch.ts, src/engine/solver/select.ts, src/engine/solver/search.ts, src/engine/validation/evaluate.ts, src/engine/validation/heldOutSeed.ts, src/engine/constants/solver.ts, src/ui/copyGuard.ts, src/ui/__tests__/copyGuard.test.ts]
---

# The survival tie-tolerance

## What this record decides

The live solve ranks candidates lexicographically (R21, [`product.md`](../product.md)): Tier 1 is survival,
Tier 2 is the household's goal. `select.ts` decides the Tier-1 top set first — a candidate is in it when
`best − survival <= tieTolerance` — and only the top set competes on Tier 2. `buildSolveRequest`
(`src/intake/solveDispatch.ts`) passes **`tieTolerance: 0`**, so only the candidates tying the exact
maximum A-side survival count ever compete on the goal.

Until 2026-10-06 that 0 was justified only as a fallback-knob calibration pin (§S0.1, "the
conservative-safe live value"), while plan 4 contract #2, the U15 spec's S1, `search.ts` and
`evaluate.ts` all described a CRN-difference-keyed tolerance. That contradiction is closed here, in the
code's direction: **the 0 is the selection rule.** The plan text carries an ⚑ AMENDED note pointing here.

## Why 0, and not a looser tolerance

The full council (`wf_6e72eca9-c20`, eight elders, red team, chair, 0 abstentions, 8/10) ruled on the
measurement in the register entry *The live solve ranks survival at `tieTolerance` 0…* (its ⚑ RE-MEASURED
2026-10-06 on v10 block, `wf_822264de-dd5` — two independent legs, 160 cells, 0 disagreements). Four
options were weighed:

| Option | What it does on the 14 solvable dev seeds + two off-roster variants (v10, 16k paths) | Ruling |
|---|---|---|
| **T0** (shipped) | Crowns `nc` on a 4-path edge (z 0.76) that is a true tie — it reverses across 28 independent seed sets (16 better / 11 worse / 1 equal) and leaves ~$10,287 all-in on the table | **KEPT** |
| **T_crn** as pre-specified (`solverSelectionTieZ` 1.96 × the paired per-path survival SE) | Fixes `nc`, but also crowns `borderline` and `budget` candidates that survive WORSE on 27 / 28 and 28 / 28 seed sets (~0.1 pp, pooled z 5–7); `budget`'s admission is knife-edge (z 1.942 vs 1.96) and non-monotone, and flips its calm no-dollar card to an active one | **VETOED** |
| **Gap-closed T_crn** (admit everyone at or above the lowest admitted member) | Removes the non-monotonicity but is a LEVEL band: on `budget` it admits a CRN-resolvable gap (12/1 discordant, z ≈ 3) — the contract #2 failure — and still crowns the repeated loss | **VETOED** |
| **P5 / P20** fixed path counts | P5 moves only `nc` (the true tie — no measured survival loss); P20 is T_crn's move set, losses included. Both are vetoed as not CRN-keyed (contract #2's wording) and not pre-registered | **VETOED** |

**The decisive asymmetry:** T0's error on `nc` is *symmetric noise around a true tie*. Every loosening
that moves `borderline` / `budget` (T_crn, gap-closed T_crn, P20) carries a *systematic bias* toward the
candidate with more dollars and less survival; the one that does not (P5, which moves only `nc`) is not
CRN-keyed and not pre-registered, so it cannot satisfy contract #2 either. Under R21's absolute
floor and the cardinal rule, crowning a repeated survival loss is the sin; missing ~$10k on a true tie is
the named, lesser defect. The Honesty Hawk's veto covers every loosening (T_crn, gap-closed T_crn and P20 for the repeated loss;
P5 for its unregistered, non-CRN shape) and does not touch T0.

## The known cost — the winner's curse

At tolerance 0 the crown is a max over ~60–100 noisy A-side survival counts. It can therefore hold LOWER
true survival than a rival, with no disclosure — the `nc` crown is the measured case. Two consequences
are law:

1. **Never claim T0 "never overstates survival."** It can.
2. **No copy may call or imply the crown is safer, just as safe, or survival-equivalent, or that it won
   on survival.** This is the universal `survival-claim` gate (`src/ui/copyGuard.ts` `SURVIVAL_CLAIMS`,
   pinned by `src/ui/__tests__/copyGuard.test.ts`, mutation-proven). It is universal rather than keyed to
   seed A, because seed A decides the crown but seed B is what the reader sees (insight 099). The
   displayed-count readouts ("about 7 of 10 either way") stay legal — they quote the B display.

## What would reopen this

A loosening may be reconsidered only after a pre-registration on a **fresh A′ / B′ seed pair** (the
2026-10-06 pair is spent), covering all of:

- **(a) The essentials floor, measured first.** Every arm so far keyed joint full-spend `survivalFraction`,
  not R21's essentials floor. Whether a ~0.1 pp full-spend gap touches the floor at all is unmeasured — it
  can reframe the whole Tier-1 quantity, in either direction.
- **(b) A membership rule** where every admitted member passes the integer pairwise CRN test against the
  max-survival candidate, with **no level gap closure**, and a multiplicity-adjusted z.
- **(c) A per-household crown seed-stability gate**, not only a zero-hazard count (the knife-edge `budget`
  admission moved on half the seeds measured).
- **(d) Any trade disclosure keyed on the displayed seed-B tenths** and bound to the headline, never on A.
- **(e) Measurement through the shipped `selectCore`**, plus the 4,000-path fallback tier.
- **(f) Any build** as a union input with a precomputed membership set, integer arithmetic and a
  structured fingerprint (`SOLVER_CODE_VERSION` bump); the oracle cases' zero-volatility worlds keep their
  exact 0.

## Never

- Reuse the goal-difference `selectionTieTolerance` (`heldOutSeed.ts`) as the survival tolerance — it
  feeds the Tier-2 shrinkage only.
- Use a level-keyed or B-display band for survival equivalence (contract #2's ε split).
- Fit an X / Y gap cap or an equivalence margin to the 2026-10-06 numbers — post-hoc.
- Describe the `borderline` / `budget` moves as "survival-equivalent".

## The dissent (preserved)

The red team (attack 6) and the craftsman's opening held that T0 is not neutral: it applies a
zero-tolerance veto on full-spend survival — which may not be R21's quantity — so one noisy 4-path edge
outranks ~$10k of the household's goal, and the hero shows a confident $3,700 instead of $13,000.
**What flips it:** the essentials-floor measurement shows ~0.1 pp full-spend gaps never touch the floor,
AND a pre-registered rule meeting (b)–(f) on a fresh pair admits `nc`-type true ties but never a repeated
survival loss.
