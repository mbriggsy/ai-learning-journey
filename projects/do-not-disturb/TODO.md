# Do Not Disturb — TODO

## Status: ALL 10 PHASES DONE — Code complete

## Remaining Work

1. **Generate actual art assets** — run Imagen 4 pipeline with API key (scripts/process-assets.ts ready)
2. **Generate/source audio** — jsfxr for SFX, record/license ambient loops and music box
3. **Wire main.ts** — connect Phaser scenes to game logic (placeholder currently)
4. **Playtest and tune** — balance constants, fix edge cases
5. **Briggsy sign-off** — "water beads off it" quality bar

## Completed This Session

- Greybox renderer + game session wired to Phaser (GameScene.ts, game-session.ts, greybox-level.ts, main.ts)
- **Bug fix:** hiding enter/exit same-frame bug — `game-session.ts:541` changed `if` to `else if`
- Playwright playtest confirmed: movement, stairs, escape, tools, monsters, catch/restart, hiding all functional

## Test Baseline

- 449 tests across 42 files, all passing
- 0 typecheck errors

## Project Structure

- **The Plan:** `docs/plans/the-plan.md`
- **Phase plans:** `docs/plans/phases/01-scaffolding.md` through `10-art-sound-polish.md`
- **Brainstorm:** `docs/ideation/2026-04-03-do-not-disturb-brainstorm.md`
- **Insights:** `docs/insights/` (10 docs)

## Landmines

- `src/main.ts` is still a placeholder — real scenes come when game loop is wired
- HidingSpotType defined in both state.ts and level.ts — level.ts is source of truth
- catch.ts uses spotId as HidingSpotType cast — works because spotId values match type names
- Renderer modules are thin Phaser adapters — verified by typecheck only until visual testing
- Guest ambush spots in night-config.ts are placeholder positions — replace with Tiled map data
- MutableLighterInventory is a separate type from InventoryState — engine must sync back
- Save system uses injectable Storage interface — tests use mock, production uses localStorage
- Monologue uses Math.random() for line selection — not seeded, acceptable for flavor text
- Night manager's `start()` must be called to initialize (insight 008 pattern)
- Asset pipeline scripts need Sharp + @google/genai as devDependencies (not yet installed)
- ANIMATION.WOBBLE_INTENSITY uses `as number` cast for tuneable zero check
- Phone (x=120) and stairs (x=96) overlap interaction range — phone intercepts E. Must answer phone before using stairs each night
