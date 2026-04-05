# Do Not Disturb

A side-scrolling 2D playful horror game. You're a kid who wakes up in an abandoned hotel with no memory of how you got there. A phone rings. A voice gives you cryptic guidance. Then the monsters wake up.

Survive 5 nights. Learn their rules. Escape through the front door.

## The Monsters

| Monster | Hunts By | Counter-Tool | Introduced |
|---------|----------|-------------|------------|
| **The Bellhop** | Sound — rushes toward footsteps, doors, elevator dings | Throwables (shoes, books, bottles) — create decoy noise | Night 1 |
| **The Housekeeper** | Patrol — checks every room L-to-R, floor by floor | DND Signs — hang on door, she skips that room | Night 2 |
| **The Guest** | Ambush — sits still disguised as furniture, lunges when close | Lighter — illuminate dark areas, spot the glow | Night 3 |

## The Hotel

5 floors connected by stairs and a rickety elevator. Each floor has its own personality, lighting, and dangers.

| Floor | Vibe |
|-------|------|
| Attic | Tight spaces, moonlight through roof holes |
| Floor 3 | Guest rooms, long dark corridor |
| Floor 2 | Guest rooms, laundry chute shortcut to basement |
| Lobby | Front desk, piano, tall windows — the escape door |
| Basement | Kitchen, freezer, boiler room — near pitch black |

## Night Progression

| Night | Monsters | Escape Window | Twist |
|-------|----------|---------------|-------|
| 1 | Bellhop | 20s | Learn the sound rules |
| 2 | + Housekeeper | 18s | Learn the patrol patterns |
| 3 | + Guest | 15s | Full monster roster |
| 4 | All three, faster | 12s | Pressure test |
| 5 | All three + layout changes | 10s | Everything you memorized is wrong |

## Art Direction

Hand-drawn / sketchy style inspired by Don't Starve and Bendy and the Ink Machine. Thick uneven outlines, crosshatch shading, per-area color palettes. Generated with Imagen 4.

## Tech Stack

- **Engine:** Phaser 3.90
- **Language:** TypeScript 5.9+
- **Build:** Vite 7
- **Test:** Vitest 4
- **Package Manager:** pnpm 10
- **Art Generation:** Imagen 4 via @google/genai
- **Maps:** Tiled (exported as JSON)

## Architecture

Game logic lives in `src/game/` with **zero** Phaser imports. The renderer reads game state through `ReadonlyDeep<GameState>` and never mutates it. All game logic runs inside a fixed-timestep accumulator. This means the entire game engine is testable in Node without a browser.

## Project Status

**Planning complete.** 10 phase plans deepened and contradiction-checked. No code written yet.

See `docs/plans/the-plan.md` for the full build plan and phase tracker.

## Development

```bash
pnpm install
pnpm dev          # start dev server
pnpm build        # typecheck + production build
pnpm test         # run all tests
pnpm typecheck    # TypeScript check only
```
