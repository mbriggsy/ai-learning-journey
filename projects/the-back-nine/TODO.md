# The Back Nine — TODO

> Actionable items only. The live plan is `docs/plans/back-nine-mvp/roadmap.md` (the 4-phase spine). Product definition: `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines + solver-blocking exit gates live in the roadmap's "Risks" + "Validation Gates" sections. No session history here.

## Current State
**4-phase re-plan IN PROGRESS.** Foundation docs are clean on **both** axes — directional drift (sweep, commit `4d9af107`) and referential/logical integrity (audit, commit `82cd6e8a`). The **roadmap is written** (`docs/plans/back-nine-mvp/roadmap.md`): 4 phases / 18 units, the cross-cutting determinism-CRN-honesty spine, and all 5 open-question resolutions. The superseded `docs/plans/mvp-confidence-spine/` (roadmap + phase-1/2/3) is intact as history and is ≈80% mineable. **The 4 phase docs are NOT yet written — that is the immediate next step.**

## Next Steps (priority order)
1. **Draft the 4 phase docs in `docs/plans/back-nine-mvp/`** — `phase-1-foundation.md`, `phase-2-first-answer.md`, `phase-3-controls.md`, `phase-4-solver-recommendation.md` — in **one workflow** (per the phase-plan-drafting rule: all phase files in one pass, deepen after). For each agent: the roadmap (the unit map + decisions), requirements v2, foundation-findings §Strand 5, the healthcare doc, **and the corresponding superseded phase doc to mine**. Mining map:
   - **P1 ← superseded phase-1** (U0/U1/U4 port near-verbatim; U2 = elevate old Unit 8's tax overlay to core; **U3 healthcare overlay is net-new** — ACA-MAGI + IRMAA-MAGI calculators, ACA pre-65 fixed-point + cliff/enhanced toggle, IRMAA 2-yr lag, HSA 4th bucket; add **sequencing as a pluggable drawdown-policy** to U1).
   - **P2 ← superseded phase-2** (U5/U6/U7/U8 port near-verbatim; add the **passphrase-strength gate** to U8).
   - **P3 ← superseded phase-3** (U10 Roth + U12 sharpen + U13 re-entry port; **U9 budget builder + U11 healthcare surfaces + the manual sequencing control are net-new**). The old phase-3 "cascade ledger" (its end section) lists the tracked Phase-1/2 amendments — fold them in.
   - **P4 = net-new** (U14 validation harness gates U15 solver; U16 recommendation; U17 stale-rec). No superseded doc to mine — build from the roadmap + the north-star landmines.
   - Run a **cross-phase coherence pass** (the deepening-drift + cross-phase-seam anti-patterns are live risks).
2. **Then the `/ce:plan` confidence check (Phase 5.3) + the mandatory document-review** on the full plan set; set the roadmap's `deepened:` / `doc-reviewed:` stamps.
3. **Then `/ce:work` foundation-first** (run `/brief` first — the hook gates `ce:work`, not `ce:plan`). Start at P1·U0 (scaffold) → U1 (engine).

## Open Items (resolve in the phase docs or defer explicitly)
- **mulberry32 32-bit period vs a counter-based PRNG** at MC trial counts — U1 spike (the roadmap defers this to implementation; the phase doc should name the spike).
- **The "never depleted" persisted sentinel** — decide before the schema locks (NOT Infinity/NaN — they become `null` through JSON; learnings `archive/do-not-disturb/009`). P1·U4.
- **Exact ε** for the survival-equivalent band (P4·U14 oracle calibration); **exact passphrase-strength threshold** (P2·U8).
- **One canonical year-keyed tax/health constants module** (`src/engine/constants/`) — the phase docs must route every dated constant through it (plan/engine/tests/copyGuard-allowlist all read it; learnings `burned/057,061,063`).

## Cleanup
- **Stray temp file `UsersbriggAppDataLocalTempowasp_pw.html`** (~89KB, a Playwright temp artifact with a mangled-path filename) sits in the project root — delete before scaffolding, never commit. (Surfaced by the repo-research agent.)

## Landmines
The full set lives in the roadmap ("Risks & Dependencies" + "Validation Gates") and the north-star's "Carried landmines." The single most important: **"it's just for friends" must NEVER soften validation** — calm-but-wrong is the cardinal sin and the bar RISES for a recommender. And: **the solver optimality oracle (U14) must exist and pass BEFORE the solver (U15) is allowed to recommend** — the N=1 cold-read judges tone, not correctness.
