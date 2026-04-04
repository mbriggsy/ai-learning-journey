# Do Not Disturb — TODO

## Status: Phases 1-4 DONE — Phase 5 next

## Next Steps

1. **Execute Phase 5** (Camera & Visibility) — lead-ahead, zoom-on-hide, parallax, light zone rendering, monster lights
2. **Execute sequentially** through Phase 10

## Test Baseline

- 138 tests across 15 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- IEEE 754 precision: fixed-timestep accumulator with `1/60 * 1000` dt — test boundary conditions with +1ms tolerance
- `src/main.ts` is still a placeholder — real scenes come when renderer is built
- CollisionResult is a type only — Phaser Arcade Physics wiring happens in renderer
- HidingSpotType is defined in BOTH `src/types/state.ts` and `src/types/level.ts` — level.ts is the source of truth, state.ts should import from there in a future cleanup
