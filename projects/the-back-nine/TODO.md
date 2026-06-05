# The Back Nine — TODO

> Actionable items only. Live plan: `docs/plans/back-nine-mvp/roadmap.md` (4-phase spine). Product: `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines + solver-blocking gates live in the roadmap's "Risks" + "Validation Gates". Project insights: `docs/insights/`. No session history here — git log has it.

## Current State
**P1·U0 (foundation) SHIPPED + CI green on Linux (2026-06-05).** Buildable React 19 + TS `~5.9.3` strict-plus + Vite 8/rolldown PWA; 8-layer architecture (engine/crypto/store/intake/budget/viz/ui/shared) with alias paths; Comlink engine-worker boundary (stub) emitting + precaching its own hashed chunk; canonical year-keyed tax/health constants module (every figure sourced + directional-until-pinned; 3 research gaps throw-on-read); ACA re-verify CI gate; strict CSP via `vercel.json`; full CI gate (`verify-the-back-nine.yml`). **Verified: typecheck clean · 24 tests pass · initial JS 193 KiB ≤ 300 KiB budget · CI green (28s).** Engine-purity lint is airtight (proven by planted probes). 5 U0 insights in `docs/insights/`.

**Plan set remains LOCKED** (roadmap + 4 phase docs, `deepened:`+`doc-reviewed:` 2026-06-05). Superseded `docs/plans/mvp-confidence-spine/` = mined history — **do NOT `/ce:work` it.** The 4 ATC decisions are folded into the plan.

## Next Steps (priority order)
1. **`/brief`** — the Stop hook gates `/ce:work`. Surfaces the 5 new `docs/insights/` (CSP/CI/engine-purity bypasses) before code.
2. **`/ce:work` P1·U1 — the MC engine core (the correctness unit).** Per `docs/plans/back-nine-mvp/phase-1-foundation.md` (Unit 1):
   - Vendor `mulberry32` **verbatim** from `projects/burned/src/server/rng.ts` into `src/engine/rng.ts` (the `|0`/`Math.imul`/`>>>0` coercions are load-bearing — don't "clean up"). Write a **stateless** Box-Muller (consume 2 uniforms, NO cached spare; guard `Math.log(0)` since mulberry32 can return 0). Seed is INJECTED, never generated in the engine.
   - `longevity.ts`: joint-survivor from **cohort** tables (`table4c7.html`, not period `4c6`), retaining **per-path survivor identity** (the closed-form mixture alone doesn't). Survivor-spending ratio ~75% **grounded to Blanchett-range + source-stamped** (dangerous direction = too-low understates survivor need).
   - `simulate.ts`: max-horizon absolute-year normals matrix (CRN seam); pluggable drawdown-policy substrate (`proportional/taxable-first/pre-tax-first/bracket-fill`); log-drift μ = arithmetic − σ²/2.
   - `confidence.ts` (pure): quantize the headline statistic to a coarse grid BEFORE the band-edge decision (cross-engine screenshot robustness).
   - **Externally-derived** Trinity/Bengen golden fixtures (committed) — DERIVE by an independent path, NEVER via the engine's own formula (DND 012). Corrected numbers: Trinity 50/50=**95%**, 75/25=**100%**, 100%-stock=**98%**, 100%-bond≈**70%** (NOT 20–35%); Bengen **4.15% / 1966 cohort**. MC band high-80s–~90%, strictly below the historical anchor.
   - U1–U3 are parallelizable + zero-precedent → highest risk; lock U1 first.

## Open Items (decide at `/ce:work`, owned by the named unit)
- **U1 seed/RNG spike (immediate):** pin the exact `seedB` construction (SplitMix64-high-32 *or* SHA-256(seedA) mod 2³² — pin one) with a statistical-decorrelation acceptance bar (not just "reject seedA+1"), and define the deterministic **B-family** `seedB[0..m-1]` U14 grade-stability consumes (re-derivable from the one persisted seedB).
- **Plan-citation cleanup (fold during U1, when touching `confidence.ts`/`simulate.ts`):** the phase-1 doc over-attributes 3 items to the research — the "two-sided low-withdrawal MC caveat" and "log-σ vs simple-σ" aren't in §Strand 4, and "transcendentals differ across V8/JSC/SpiderMonkey" isn't in §Strand 2 (the doc says the broader "WASM buys deterministic float math across browsers"). The decisions are sound (quantize-before-band-edge stays); soften the citations.
- **U2 prerequisite — source the 3 constants gaps (they throw on read today):** single 2026 ordinary brackets + cap-gains 0/15/20% breakpoints (IRS Rev. Proc. 2026), Uniform Lifetime Table divisors **+ the Joint-Life & Last-Survivor table for a >10yr-younger sole-beneficiary spouse** (Pub 590-B). The tax overlay stays directional until these are pinned.
- **Exact ε** for the survival-equivalent band — calibrated against the U14 oracle (a gate; the oracle-cleared token is withheld until ε is calibrated).
- **U4 KDF-location spike:** main-thread + a rendered "unlocking…" pending state vs a dedicated crypto worker — decided by measured jank on the reference device.
- WASM compute-budget threshold + the mid-tier reference device (instrument-first). When WASM lands: add `'wasm-unsafe-eval'` to the CSP `script-src` (insight 001-adjacent).

## Landmines
- **Cardinal:** *"it's just for friends" must NEVER soften validation* — calm-but-wrong is the sin; the bar RISES for a recommender. The N=1 cold-read judges *tone*, never *correctness*.
- **Oracle-before-solver:** U14's optimality oracle must exist + pass BEFORE U15 can recommend — enforced as a harness-minted opaque token the solve entry requires (compile error to skip), withheld until every check passes AND every rec-relevant primary is pinned + ε calibrated.
- **Read `docs/insights/` before U1/U2:** engine-purity lint is airtight — keep it (ban global objects/dynamic-import/eval, not just named globals); don't compute golden fixtures via the engine; the full Risks set is in the roadmap.
- The full landmine set lives in the roadmap ("Risks & Dependencies" + "Validation Gates") and the north-star's "Carried landmines."
