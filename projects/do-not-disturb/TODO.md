# Do Not Disturb — TODO

## Status: Phases 1-9 DONE — Phase 10 next

## Next Steps

1. **Execute Phase 10** (Art, Sound & Polish) — Imagen 4 pipeline, sprites, animations, spatial audio, environmental polish

## Test Baseline

- 392 tests across 37 files, all passing
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
- Save system uses injectable Storage interface — tests use mock, production uses localStorage
- Monologue system uses Math.random() for line selection — not seeded, acceptable for flavor text
- Night manager's `start()` must be called to initialize — it does not self-start (insight 008 pattern)
