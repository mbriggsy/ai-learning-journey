# Do Not Disturb — TODO

## Status: Phases 1-6 DONE — Phase 7 next

## Next Steps

1. **Execute Phase 7** (The Housekeeper + Night 2) — Housekeeper AI, DND sign system, two-monster balance
2. **Execute sequentially** through Phase 10

## Test Baseline

- 204 tests across 22 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- IEEE 754 precision: fixed-timestep accumulator — test boundary conditions with +1ms tolerance
- `src/main.ts` is still a placeholder — real scenes come when game loop is wired
- HidingSpotType defined in both state.ts and level.ts — level.ts is source of truth
- catch.ts uses spotId as HidingSpotType cast — works because spotId values match type names
- Renderer modules are thin Phaser adapters — verified by typecheck only until visual testing
