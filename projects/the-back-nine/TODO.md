# The Back Nine — TODO

> Actionable items only. The live plan is `docs/plans/back-nine-mvp/roadmap.md` (the 4-phase spine). Product definition: `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines + solver-blocking exit gates live in the roadmap's "Risks" + "Validation Gates" sections. No session history here.

## Current State
**4-phase re-plan: phase docs WRITTEN + coherence-swept.** The roadmap **and all 4 phase docs** are written in `docs/plans/back-nine-mvp/`: `phase-1-foundation.md` (U0–U4), `phase-2-first-answer.md` (U5–U8), `phase-3-controls.md` (U9–U13), `phase-4-solver-recommendation.md` (U14–U17). A 3-lens cross-phase coherence pass ran (seams / requirements-coverage / carried-landmines) and **all findings are applied** — referential integrity verified (57/57 cross-phase unit refs valid), zero deepening-drift residue (no "tracked amendment" headers / cascade ledgers), unit headers contiguous U0–U17. The roadmap's `deepened:` / `doc-reviewed:` stamps are still **BLANK** — the formal deepen + document-review is the next step (the coherence pass was a logical-integrity sweep, NOT the adversarial/persona document-review). Superseded `docs/plans/mvp-confidence-spine/` stays as mined history.

## Next Steps (priority order — the next session)
1. **Weighted deepen** of the plan set — Briggsy's call 2026-06-04: **weighted, not blanket** (re-deepening already-reviewed ported material is motion):
   - **Full broad deepen** — say **"do not use fast path"** (ultracode short-circuits to Phase 5.3 otherwise; see [[reference-ce-plan-deepen-fast-path]]) — on the **net-new, never-stress-tested, highest-stakes surface**: **all of P4** (U14 validation harness → U15 solver → U16 recommendation → U17 stale-rec), **P1·U3** (healthcare overlay), **P3·U9** (budget builder), **P3·U11** (healthcare surfaces). Smaller net-new bits to sweep in the same pass: **P2·U8** passphrase-strength gate, the **manual-sequencing-control** half of **P3·U10**.
   - **Light touch** on the ported units (P1·U0/U1/U4, P2·U5–U7, the Roth-lever half of P3·U10, P3·U12/U13): they carry the superseded docs' `deepened`+`doc-reviewed` lineage (2026-06-03/04) — **verify only the reset-delta seams** (the sequencing substrate added to P1·U1, the six-state set in P2·U7, the overlay-now-a-dependency in P3·U10), don't re-litigate settled depth.
   - **Fold findings in CLEAN** (the landmine): apply deepen findings as plain body content — do **NOT** let ce:plan bolt them on as "tracked amendment" headers / a cascade ledger (that regresses the clean fold in commit `91d17f84`; [[feedback-deepening-drift-anti-pattern]]). Use Sequential Thinking for synthesis; verify critical fixes against source ([[deepen-plan-lessons]]).
2. **Then document-review** (the adversarial/persona pass — feasibility, scope-guardian, security-lens, product-lens, coherence, adversarial) on the FULL set; fold findings clean. **Set the roadmap's `deepened:` / `doc-reviewed:` stamps** once both passes are done.
3. **Then `/ce:work` foundation-first** (run `/brief` first — the hook gates `ce:work`, not `ce:plan`). Start at P1·U0 (scaffold) → U1 (engine).

## Open Items (deferred-in-doc — decide at `/ce:work`, owned by the named unit)
- **mulberry32 32-bit period vs a counter-based PRNG** at MC trial counts — the U1 spike (named in P1·U1, decided at implementation).
- **Exact ε** for the survival-equivalent band (P4·U14 oracle calibration, directional-until-pinned); **exact passphrase-strength threshold + library pin** (P2·U8).
- *(Resolved in-doc: the "never depleted" sentinel is decided in P1·U4 — a tagged-union discriminant / out-of-domain integer, never Infinity/NaN/null. The canonical year-keyed constants module is introduced in P1·U0 and every dated constant routes through it.)*

## Landmines
The full set lives in the roadmap ("Risks & Dependencies" + "Validation Gates") and the north-star's "Carried landmines." The single most important: **"it's just for friends" must NEVER soften validation** — calm-but-wrong is the cardinal sin and the bar RISES for a recommender. And: **the solver optimality oracle (U14) must exist and pass BEFORE the solver (U15) is allowed to recommend** — the N=1 cold-read judges tone, not correctness.
