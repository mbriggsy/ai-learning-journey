# Do Not Disturb — TODO

## Status: All 10 phase plans DEEPENED — ready for contradiction check + execution

## Next Steps

1. **~~Check for contradictions across all 10 phase plans~~** — DONE (2026-04-04). Report at `docs/plans/contradiction-report.md`
2. **Fix contradictions** — 5 critical, 12 medium, 7 low. Apply fixes to phase plan files, then re-verify.
3. **Execute Phase 1** (Scaffolding) — first code written
4. **Execute sequentially** through Phase 10

## Contradiction Summary

Full report: `docs/plans/contradiction-report.md`

**Critical (must fix before executing):**
1. Bellhop visibility contradiction (Phase 6 vs 8) — lighter makes NOISE for Bellhop, not visual
2. Lighter fuel model conflict — add `lighterCharges` to InventoryState
3. Missing Bellhop constants in Phase 2 — 6 constants referenced but undefined
4. WorldState type undefined in Phase 2
5. Emitter type not exported from Phase 2

Each fix has a prescription in the report. No ambiguity — just apply them.

## Project Structure

- **The Plan:** `docs/plans/the-plan.md` — master plan + dashboard tracker
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md` (locked, 13 decisions)
- **Insights:** `docs/insights/` (7 present, 3 more to copy from hide-and-seek in Phase 1)

## Phase Status Convention

Each phase file has frontmatter `status:` that progresses: `outline → deep → active → done`

Dashboard table at top of `the-plan.md` tracks all 10 phases.

## Landmines

- 3 insight docs (006, 009, 010) need to be copied from hide-and-seek during Phase 1 execution
- SpecFlow found 27 implementation gaps — all resolved with defaults baked into phase plans
- No code exists yet. Tech stack decided (Phaser 3 + TS + Vite + Vitest + pnpm) but not scaffolded
