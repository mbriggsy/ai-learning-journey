# Do Not Disturb — TODO

## Status: Phases 1-8 DONE — Phase 9 next

## Next Steps

1. **Execute Phase 9** (Night Progression & Narrative) — 5-night state machine, night scaling, phone call system, inner monologue, save persistence
2. **Execute Phase 10** (Art, Sound & Polish)

## Test Baseline

- 301 tests across 30 files, all passing
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
- Guest ambush spots in night-config.ts are placeholder positions — will be replaced with Tiled map data when levels are built
- MutableLighterInventory is a separate type from InventoryState to allow mutation — engine must sync back to state
