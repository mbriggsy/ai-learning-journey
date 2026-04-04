# Do Not Disturb — TODO

## Status: Phases 1-3 DONE — Phase 4 next

## Next Steps

1. **Execute Phase 4** (Hotel World) — 5-floor Tiled maps, doors, stairs, elevator, hiding spots, surface types, light zones
2. **Execute sequentially** through Phase 10

## Test Baseline

- 95 tests across 10 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- IEEE 754 precision: fixed-timestep accumulator with `1/60 * 1000` dt — test boundary conditions with +1ms tolerance
- `src/main.ts` is still a placeholder (Phaser title screen) — real scenes come in later phases
- CollisionResult is a type only — actual Phaser Arcade Physics collision wiring happens when renderer is built
