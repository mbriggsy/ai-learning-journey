# The Back Nine — TODO

> Actionable items only. The product definition lives in `docs/plans/direction-reset-2026-06-04.md` (north-star) + `docs/brainstorms/the-back-nine-requirements.md` (v2). Landmines live in the north-star's "Carried landmines" section + memory. No session history here.

## Current State
**Thesis reset 2026-06-04 — ratified ("cleared for takeoff").** The Back Nine is now a **personal** tool (not commercial): a **recommend-second co-pilot with a solver** over two controls (withdrawal **sequencing** + Roth **conversion**) that funds a **user-built budget** toward a **user-picked goal**, safety-floor-first. Reg guardrails relaxed to wording; the load transferred to honesty + validation (which harden).

**Foundation docs cascaded (done 2026-06-04):** north-star written + ratified; **requirements rewritten to v2**; foundation-findings **§Strand 3 → archive-as-rationale, §Strand 4 grown (solver validation), §Strand 5 grown (multi-control + healthcare)**; **healthcare research persisted** (`docs/research/pre65-healthcare-aca-hsa-2026-06-04.md`); **memory updated**. The **3 deepened phase docs in `docs/plans/mvp-confidence-spine/` are SUPERSEDED-pending-replan** (they describe the old 3-phase single-Roth-lever direction).

## Next Steps (priority order)
1. **The 4-phase RE-PLAN via `/ce:plan`** — Foundation → First Answer → **Controls** (manual sequencing + conversion, a shippable cold-read milestone) → **Solver & Recommendation**. Reuse: Phase 1 engine + Phase 2 confidence statement are largely intact; the **solver + recommendation surface + budget builder + the tax/healthcare overlay** are the new layer. Within the re-plan:
   - Fold the full healthcare grounding note into the §Strand-5 plan surfaces; bake the §Strand-4 **solver validation** (optimality oracle, ranking-stability, grade calibration) into the engine plan as **gating before the solver speaks**.
   - Carry the adversarial landmines from the north-star (objective ≡ headline metric; optimizer's curse → held-out seed; disclosed-omission-inverts-ranking; stale saved rec = an executed action; require-the-hedge lint).
2. **Then `/ce:work`** foundation-first (run `/brief` first — the hook gates `ce:work`, not `ce:plan`).

## Open Items
- [ ] **MVP solver search-space + compute profile** — confirm "named drawdown policies × conversion grid" (proportional / taxable-first / pre-tax-first / bracket-fill) and measure candidate-count × 1k-path cost to re-confirm **TS-vs-WASM** (WASM may move from fast-follow toward load-bearing; rec is solve-once-on-demand, not live-drag).
- [ ] **Lexicographic objective — define the "survival-equivalent" band** (so the over-funded pivot to the surplus metric is crisp, not arbitrary).
- [ ] **Passphrase-strength floor** — min-entropy gate at creation (PBKDF2-600k is the only brute-force defense).
- [ ] **Spending-trajectory + SS-claiming-age** — confirmed chapter-two levers (SS-timing especially matters for the survivor benefit). Out of MVP; flagged so they aren't lost.

## Exit gates (now SOLVER-BLOCKING — block calling a fixture/recommendation "golden")
- [ ] **SSA cohort curves** vs the real `table4c7.html` (bot-blocks fetch → manual + committed snapshot) — load-bearing for the survivor differentiator.
- [ ] **Pin engine datasets:** Bengen's Ibbotson intermediate-government series; a true long-term-CORPORATE series for Trinity (cFIREsim is Shiller=government → directional, not exact).
- [ ] **Pin §Strand-5 tax+health numbers to primaries:** 2026 Rev. Proc. (brackets/std-ded), Pub. 590-B (Uniform Lifetime Table), Pub. 915 (SS-tax), **Pub. 969 (HSA), §36B/Pub. 974 (ACA-PTC), CMS (IRMAA brackets + 2026 Part B)**.
- [ ] **Re-verify the enhanced-ACA-subsidy legislative status at EVERY build** — live, possibly-retroactive policy (expired 12/31/2025, unre-enacted as of 2026-06-04). Model 400% FPL cliff as base; "enhanced" = a scenario toggle.
- [ ] **NEW — the solver optimality oracle** (a hand-computable known-best drawdown/conversion case) must exist before the solver is allowed to recommend. The N=1 cold-read judges grade *tone*, not *correctness*.

## Landmines
See the north-star's **"Carried landmines"** section (`docs/plans/direction-reset-2026-06-04.md`) and `project-the-back-nine` memory for the full set — they're maintained there to avoid drift. The single most important: **"it's just for friends" must NEVER soften validation** — friends risk identical real money with less protection. Calm-but-wrong is the cardinal sin.
