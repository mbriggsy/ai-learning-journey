# The Back Nine — TODO

> Actionable items only. The live plan is `docs/plans/back-nine-mvp/roadmap.md` (the 4-phase spine). Product definition: `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines + solver-blocking exit gates live in the roadmap's "Risks" + "Validation Gates" sections. No session history here.

## Current State
**Document-review DONE + folded clean (2026-06-05). The plan set is LOCKED.** A 13-agent persona document-review (coherence · feasibility · scope-guardian · security-lens · product-lens · design-lens · adversarial — 2 holistic + 1 focused tier, 78 raw findings) ran on the full deepened set. All verified findings folded as **plain body prose, no amendment headers** across the roadmap + 4 phase docs; both `deepened:` + `doc-reviewed:` stamps now set to 2026-06-05 (both passes complete). Drift-swept clean (the one real straggler — a lexicographic test deciding survival-equivalence on seed-B — fixed). The superseded `docs/plans/mvp-confidence-spine/` stays as mined history.

**The 4 ATC decisions (Briggsy, folded):** ① *live bigger now* = a Tier-2 statistic = **held-out confidence the user's chosen front-loaded discretionary shape holds** (spending stays user-set; the "how much MORE could I spend" spending-solver stays chapter-two). ② *leave more* = **after-tax-to-heirs** — a first-order §1014/IRD adjustment modeled INTO the objective at a disclosed assumed heir bracket (§1014 moved OUT→IN). ③ **selection-stage shrinkage** toward the conventional-ordering prior is **IN MVP** (defends the *pick*, not just the grade). ④ **Both solver axes co-equal** in v1 (sequencing × conversion grid) — so the compute fallback ladder + shrinkage are load-bearing.

## Next Steps (priority order — the next session)
1. **`/brief`** (the Stop hook gates `ce:work`, not `ce:plan`/document-review) — surface gotchas before any code.
2. **`/ce:work` foundation-first.** Start at **P1·U0** (scaffold, conventions, PWA shell, CI, canonical constants module, strict CSP) → **P1·U1** (MC engine + determinism/CRN + joint-survivor longevity + Trinity/Bengen fixtures). U1–U3 are parallelizable and zero-precedent → highest risk, lock first.

## Open Items (deferred-in-doc — decide at `/ce:work`, owned by the named unit)
- **U1 seed/RNG spike:** pin the exact `seedB` construction (SplitMix64-high-32 *or* SHA-256(seedA) mod 2³² — pin one) with a real statistical-decorrelation acceptance bar (not just "reject seedA+1"), and define the deterministic **B-family** `seedB[0..m-1]` the U14 grade-stability consumes (re-derivable from the one persisted seedB).
- **Exact ε** for the survival-equivalent band — calibrated against the U14 oracle; it is a **gate** (the oracle-cleared token is withheld until ε is calibrated), not a free constant.
- **U4 KDF-location spike:** main-thread + the rendered "unlocking…" pending state vs a dedicated crypto worker — decided by measured jank on the reference device (the pending-state contract holds either way).
- WASM compute-budget threshold + the mid-tier reference device (instrument-first); exact named-policy-set tuning if the four prove insufficient.

## Landmines
The full set lives in the roadmap ("Risks & Dependencies" + "Validation Gates") and the north-star's "Carried landmines." The cardinal one: **"it's just for friends" must NEVER soften validation** — calm-but-wrong is the sin and the bar RISES for a recommender. And the structural defense the whole plan turns on: **the solver's optimality oracle (U14) must exist and pass BEFORE the solver (U15) can recommend** — now enforced as a *harness-minted opaque token* the solve entry takes as a required parameter (a compile error to skip), withheld until every check passes AND every rec-relevant primary is pinned + ε calibrated. The N=1 cold-read judges *tone*, never *correctness*.
