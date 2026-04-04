# Do Not Disturb — TODO

## Status: Phases 1-5 DONE — Phase 6 next

## Next Steps

1. **Execute Phase 6** (The Bellhop + Night 1) — Bellhop AI FSM, throwable system, escape window, phone call, breath mechanic, HUD, catch/restart
2. **Execute sequentially** through Phase 10

## Test Baseline

- 167 tests across 17 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- IEEE 754 precision: fixed-timestep accumulator — test boundary conditions with +1ms tolerance
- `src/main.ts` is still a placeholder — real scenes come when game loop is wired
- CollisionResult is a type only — Phaser Arcade Physics wiring happens in renderer
- HidingSpotType defined in both state.ts and level.ts — level.ts is source of truth
- Renderer modules (camera-controller, parallax, lighting-renderer, lightning) are thin Phaser adapters — verified by typecheck only, visual testing when game runs
