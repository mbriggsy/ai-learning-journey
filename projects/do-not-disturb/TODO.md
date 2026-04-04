# Do Not Disturb — TODO

## Status: Plans complete, contradictions fixed — READY TO BUILD

## Next Steps

1. **Execute Phase 1** (Scaffolding) — pnpm init, Phaser, TypeScript, Vite, Vitest, directory structure
2. **Execute sequentially** through Phase 10

## What Was Done

- Brainstorm locked (13 design decisions)
- 10 phase plans deepened with code patterns, data structures, acceptance criteria
- Contradiction check found 24 issues — all critical and medium fixes applied to phase files
- README written

## Key Fixes Applied

- Bellhop stays pure sound-only. Lighter makes a flick SOUND (Bellhop hears), Housekeeper SEES the light
- InventoryState now has both `lighterFuel` (seconds) AND `lighterCharges` (reserve count)
- Missing constants added: Bellhop thresholds, Housekeeper timers, Guest visibility, catch durations, slide duration
- WorldState, EndingState, Emitter type, DoorEvent, MonsterAlertEvent all defined in Phase 2
- MONSTER_SPOTTED, ZONE_ENTER events added to GameEventMap
- Monologue triggers split into event-driven vs condition-driven
- Furniture hiding is probabilistic (50%), not guaranteed detection
- Tools blocked during Run, Slide, AND Jump
- Dynamic light is additive on ambient, capped at 1.0
- Guest eye glow visibility thresholds defined

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Contradiction report:** `docs/plans/contradiction-report.md` (all fixes applied)
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (7 present, 3 more to copy from hide-and-seek in Phase 1)

## Landmines

- 3 insight docs (006, 009, 010) still need to be copied from hide-and-seek during Phase 1
- No code exists yet — Phase 1 is the first code written
