# Do Not Disturb — TODO

## Status: Phases 1-2 DONE — Phase 3 next

## Next Steps

1. **Execute Phase 3** (Player & Physics) — gravity, 6 movement modes, noise emission, surface types, collision
2. **Execute sequentially** through Phase 10

## Test Baseline

- 53 tests across 7 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- IEEE 754 precision: fixed-timestep accumulator with `1/60 * 1000` dt — test boundary conditions with +1ms tolerance
- `src/main.ts` is still a placeholder (Phaser title screen) — real scenes come in later phases
