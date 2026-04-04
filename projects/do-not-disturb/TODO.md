# Do Not Disturb — TODO

## Status: Phases 1-7 DONE — Phase 8 next

## Next Steps

1. **Execute Phase 8** (The Guest + Night 3) — Guest AI (ambush), lighter tool, 3-monster balance, inventory interface
2. **Execute sequentially** through Phase 10

## Test Baseline

- 222 tests across 25 files, all passing
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
