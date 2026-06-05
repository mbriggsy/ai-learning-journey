# The Back Nine — TODO

> Actionable items only. The live plan is `docs/plans/back-nine-mvp/roadmap.md` (the 4-phase spine). Product definition: `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines + solver-blocking exit gates live in the roadmap's "Risks" + "Validation Gates" sections. No session history here.

## Current State
**4-phase re-plan: phase docs WRITTEN + coherence-swept.** The roadmap **and all 4 phase docs** are written in `docs/plans/back-nine-mvp/`: `phase-1-foundation.md` (U0–U4), `phase-2-first-answer.md` (U5–U8), `phase-3-controls.md` (U9–U13), `phase-4-solver-recommendation.md` (U14–U17). A 3-lens cross-phase coherence pass ran (seams / requirements-coverage / carried-landmines) and **all findings are applied** — referential integrity verified (57/57 cross-phase unit refs valid), zero deepening-drift residue (no "tracked amendment" headers / cascade ledgers), unit headers contiguous U0–U17. The roadmap's `deepened:` / `doc-reviewed:` stamps are still **BLANK** — the formal deepen + document-review is the next step (the coherence pass was a logical-integrity sweep, NOT the adversarial/persona document-review). Superseded `docs/plans/mvp-confidence-spine/` stays as mined history.

## Next Steps (priority order)
1. **`/ce:plan` confidence check (Phase 5.3) + the mandatory document-review** on the full plan set (roadmap + 4 phase docs); set the roadmap's `deepened:` / `doc-reviewed:` stamps. (The cross-phase coherence pass already cleared referential/seam integrity — document-review is the deeper adversarial/persona pass on the decisions themselves, not a re-do of coherence.)
2. **`/ce:work` foundation-first** (run `/brief` first — the hook gates `ce:work`, not `ce:plan`). Start at P1·U0 (scaffold) → U1 (engine).

## Open Items (deferred-in-doc — decide at `/ce:work`, owned by the named unit)
- **mulberry32 32-bit period vs a counter-based PRNG** at MC trial counts — the U1 spike (named in P1·U1, decided at implementation).
- **Exact ε** for the survival-equivalent band (P4·U14 oracle calibration, directional-until-pinned); **exact passphrase-strength threshold + library pin** (P2·U8).
- *(Resolved in-doc: the "never depleted" sentinel is decided in P1·U4 — a tagged-union discriminant / out-of-domain integer, never Infinity/NaN/null. The canonical year-keyed constants module is introduced in P1·U0 and every dated constant routes through it.)*

## Landmines
The full set lives in the roadmap ("Risks & Dependencies" + "Validation Gates") and the north-star's "Carried landmines." The single most important: **"it's just for friends" must NEVER soften validation** — calm-but-wrong is the cardinal sin and the bar RISES for a recommender. And: **the solver optimality oracle (U14) must exist and pass BEFORE the solver (U15) is allowed to recommend** — the N=1 cold-read judges tone, not correctness.
