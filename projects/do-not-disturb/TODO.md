# Do Not Disturb — TODO

## Status: PIVOT — Merging DND design with Hide and Seek top-down engine

Greybox playtest revealed side-scroller format fights the hotel design. Rooms-off-corridors, DND signs, spatial hiding — all designed for top-down. Decision: merge DND game design onto hide-and-seek's top-down engine.

## Next Steps

1. **Plan the DND + Hide-and-Seek merge** — DND game logic (monsters, tools, nights) on top-down engine (rooms, corridors, floor plans). Write a merge plan before touching code.
2. **Design actual hotel floor plans** — top-down rooms off corridors, doors, hiding spots that make spatial sense
3. **Port monster AI to top-down movement** — bellhop patrol routes, housekeeper room-checking, guest ambush spots
4. **Art + audio** — after the engine merge is solid

## What Works (Keep)

- Monster FSMs: bellhop (sound-hunting), housekeeper (methodical patrol), guest (ambush)
- Tool system: throwables, DND signs, lighter
- Night progression: 5 nights, escalating difficulty, phone calls
- Escape window mechanic
- Noise propagation, hiding/breath system
- Xbox controller support
- 449 tests on game logic layer

## What's Broken (Side-Scroller Issues Found in Playtest)

- Level is just a corridor — no spatial strategy
- DND signs useless (can't skip a hallway segment)
- No motivation to move (can camp exit)
- Rooms don't feel like rooms
- Hiding spots don't matter if monsters never patrol near you

## Bugs Fixed This Session

- Door state not syncing to renderer (stale `loaded.world` snapshot)
- Player/monster walking through closed doors (no collision)
- catch.ts using spotId instead of spotType → crash on night 2
- Breath rhythm tap not wired (Space while hiding)
- Attic vent overlapping stairs (4px apart)
- Typecheck broken by Playwright e2e in main tsconfig

## Test Baseline

- 449 tests across 42 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (13 docs)
- **Hide and Seek engine:** `../hide-and-seek/` (336 tests, top-down engine)

## Landmines

- Side-scroller renderer (GameScene.ts) will be replaced in the merge — don't invest more in it
- greybox-level.ts layout is throwaway — new top-down floor plans needed
- HidingState now carries spotType (added this session) — keep this pattern in the merge
- Escape timing constants changed (45s, was 90s) — tune after merge
- Bellhop multi-floor patrol + elevator riding added but moot if switching to top-down
