# Pac-Man Build Session — AI Development Summary

**Date:** February 21, 2026
**Folder:** Artificial Intelligence

---

## 1. VS Code Setup

Claude Code runs as a native VS Code extension. Key behaviours observed in this session:

- **Clickable file references** — file paths rendered as markdown links are clickable directly in the chat pane, jumping to the exact line.
- **IDE diagnostics forwarded automatically** — after each file edit, the extension surfaced TypeScript/JS hints without any manual action.
- **Opened-file context** — when the user opened `game.js` in the editor, a system note was injected into the conversation, letting Claude know which file was in focus.
- **Inline selection context** — highlighted code is automatically included as context, useful for targeted questions about a specific block.
- **Permission prompts** — tool calls outside the current permission mode are held for user approval before execution.

---

## 2. Agent Teams

The project began by spinning up a four-agent team using the Claude Agent SDK's `TeamCreate`, `Task`, and `SendMessage` toolset.

### Team: `pacman-build`

| Agent | Model | Responsibility |
|-------|-------|----------------|
| Architect | claude-opus-4-6 | Maze layout, data structures, game-loop pattern, ghost AI spec |
| Developer | claude-opus-4-6 | `index.html`, `style.css`, full `game.js` implementation |
| Tester | claude-sonnet-4-6 | `tests.html` and `tests.js` (self-contained browser test runner) |
| Documentation | claude-sonnet-4-6 | `README.md` |

### Coordination Protocol

1. Architect ran first, producing a `game.js` skeleton with a detailed spec comment block.
2. Developer waited for Architect signal, then implemented all three core files.
3. Tester and Documentation ran **in parallel** after Developer completion.
4. Main Claude (orchestrator) reviewed deliverables and shut agents down via `SendMessage` shutdown requests.

### Key Agent SDK Patterns Used

- `TeamCreate` creates a shared task list at `~/.claude/tasks/{team-name}/`
- `TaskUpdate` with `owner` assigns tasks to specific agents
- `SendMessage` with `type: "shutdown_request"` handles graceful teardown
- Agents go **idle between turns** — this is normal, not an error; messages wake them
- Agents are addressed by name, not UUID

---

## 3. The Pac-Man Build

**Target:** Standalone, zero-dependency web game — opens directly from `file://` with no server.

### Deliverables

```
PacMan1/
  index.html    — canvas + HUD, loads CSS and JS
  style.css     — dark background, score panel, overlay screens
  game.js       — ~1,550 lines, all game logic
  tests.html    — self-contained browser test runner
  tests.js      — 110 unit tests, pure JS, no npm
  README.md     — controls, scoring table, ghost personalities
```

### Technical Choices

- Single `<canvas>` element, 28x31 tile grid, `TILE_SIZE = 20px`
- No external dependencies — walls drawn with canvas primitives, audio via Web Audio API beeps
- Tile map encoded as a 2D number array: `0` = open, `1` = wall, `2` = pellet, `3` = power pellet, `4` = ghost door
- Game loop via `requestAnimationFrame`; delta-time capped at 1/15 s to prevent spiral-of-death
- Ghost AI uses greedy direction-picking toward a target tile, with distinct targeting logic per ghost personality
- Tests use plain `assert` / `assertEqual` helpers surfaced as green/red in `tests.html` — zero npm required

---

## 4. Debugging Process

Three distinct bug cycles were worked through, each requiring progressively deeper analysis.

---

### Bug Cycle 1 — Pac-Man spawns in a wall

**Symptom:** Pac-Man could not move at all from the start position.

**Root cause:** `PACMAN_START = { col: 13, row: 23 }` pointed to `ORIGINAL_MAP[23][13] = 1` (a wall tile).

**Fix:** Changed to `{ col: 13, row: 22 }` where `ORIGINAL_MAP[22][13] = 0` (open path).

**Lesson:** Spawn coordinates must be validated against the actual map array, not assumed from a visual inspection of the maze layout.

---

### Bug Cycle 2 — In-house ghosts frozen (not bobbing)

**Symptom:** Pinky, Inky, and Clyde were stationary inside the ghost house.

**Root cause:** In-house ghosts were initialised with `DIR_LEFT = { dx: -1, dy: 0 }`. The bobbing formula is `ghost.y += direction.dy * speed * dt`. Because `DIR_LEFT.dy === 0`, displacement was always zero.

**Fix:** Initialise in-house ghosts with `DIR_DOWN = { dx: 0, dy: 1 }`.

---

### Bug Cycle 3 — Pac-Man and all ghosts still frozen after Cycles 1 and 2

**Symptom:** After the first two fixes, Pac-Man still couldn't move at intersections and all four ghosts remained motionless.

**Root cause — Oscillation bug (affects both Pac-Man and ghosts):**

At 60 fps, `dt ≈ 0.0167 s`:

- Pac-Man speed = 80 px/s → 1.33 px/frame
- Ghost speed = 75 px/s → 1.25 px/frame

Both `movePacMan` and `updateGhostAI` had a `distToCentre < 2` block that unconditionally snapped the entity back to the tile centre every frame. Because each frame's movement (1.25–1.33 px) was less than the 2 px threshold, the snap reset all progress. The entity oscillated in place and never escaped.

**Root cause — Ghost house exit destination:**

The ghost exited to `tileToCentre(13, 12)`, which is the ghost **door** tile (value `4`). From that tile, the no-up zone blocked UP, LEFT was a wall, and RIGHT was the reverse — so only DOWN was valid, which sent the ghost straight back into the house.

**Fixes applied:**

| # | Location | Fix |
|---|----------|-----|
| 1 | `Ghost` constructor | Added `lastPickedTileCol = -1` and `lastPickedTileRow = -1` |
| 2 | `movePacMan` | Only snap to tile centre when direction **actually changes** (turning), not when continuing straight |
| 3 | `updateGhostAI` inHouse exit | Exit to row 11 — one tile above the door, in open corridor |
| 4 | `updateGhostAI` dead ghost | Added `lastPickedTile` guard — only pick direction on first entry into each tile |
| 5 | `updateGhostAI` normal movement | Same `lastPickedTile` guard |
| 6 | `initLevel` | Initialise `lastPickedTile = -1` for each ghost |
| 7 | `resetPositions` | Same reset on each life lost |

---

### Bug Cycle 4 — Frightened ghosts pass through walls; ghost escapes off top of map

**Symptom:** After eating a power pellet, ghosts occasionally passed through walls. In one instance, Blinky escaped off the top of the board and disappeared until the next level.

**Root cause — two interacting issues:**

**Issue A:** `activateFrightenedMode` reversed each ghost's direction but did **not** reset `lastPickedTileCol/Row`. The sequence that caused the escape:

1. Ghost going DOWN at tile (6, 1). `lastPickedTile = (6, 1)`.
2. Power pellet eaten → direction reversed to UP. `lastPickedTile` unchanged.
3. Ghost reaches tile (6, 1) centre: `lastPickedTile == (6, 1)` → the "new tile" guard skips direction evaluation.
4. Ghost flies UP unchecked, crosses into wall row 0 (all walls).
5. At tile (6, 0): all non-reverse directions are walls, `validDirs` is empty → ghost keeps going UP.
6. Ghost's `y` goes negative — vanishes off the top of the map.

**Issue B:** When `validDirs` was empty in the frightened random picker, the ghost silently kept its current (wall-bound) direction. No fallback to the reverse direction was implemented.

**Fixes:**

Fix A — `activateFrightenedMode`: reset `lastPickedTile` on every reversal so direction re-evaluation fires at the ghost's current tile.

Fix B — frightened direction picker: if `validDirs` is empty after excluding the reverse, allow the reverse direction as a last resort rather than continuing into a wall.

---

## 5. Testing Strategy

Tests were written in two phases: after the agent team delivered the initial build, and after each major bug fix cycle.

### Test File Structure

- Zero dependencies — pure JS, runs in the browser via `tests.html` or directly in Node.js
- Constants and pure functions are inlined (copied from `game.js`) so tests are fully independent
- Helper functions (`isWalkableForGhost`, `frightenedPickDirs_withFallback`, `mockActivateFrightenedMode`) inline the fixed logic for isolated verification

### Test Count Progression

| After | Tests |
|-------|-------|
| Initial agent delivery | 66 |
| Bug Cycles 1 and 2 (spawn / bobbing) | 79 |
| Bug Cycles 3 and 4 (movement / escape) | 110 |

### Notable Test Patterns

**Structural invariants** — verify the map's boundary rows and columns are walls. If someone edits the map and opens a gap in row 0, these tests fire immediately.

**Behavioural contracts** — verify that `activateFrightenedMode` resets the correct fields after a direction reversal.

**Exhaustive maze scan** — iterates every walkable tile × every direction (approximately 3,472 combinations) and confirms the direction picker never returns a wall-bound direction. A single failure indicates a tile+direction combination where a ghost could become stuck or escape.

**Regression documentation** — some tests explicitly describe the pre-fix behaviour so future readers understand why the test exists. For example: "without reset, `lastPickedTile == (6,1)` would cause the guard to skip direction picking."

---

## 6. Key Learnings

### On Agent Teams

- **Parallel agents are powerful but require clear handoff signals.** Tester and Documentation ran in parallel successfully; the bottleneck was waiting for Developer to finish before either could start.
- **Agents go idle between turns — this is normal, not a failure.** Sending a message to an idle agent wakes it. Misreading idle as "done" would stall the pipeline.
- **Spawn agents with the right tool set.** Read-only agents (Explore, Plan) cannot edit files. Assigning implementation work to them silently fails.
- **Team config at `~/.claude/teams/{name}/config.json`** lists all members by name — agents should read this to discover peers rather than hard-coding names.

### On Debugging Physics and Game Logic

- **Frame-rate arithmetic first.** Before reading code, calculate `speed × dt` at 60 fps. If that value is smaller than any threshold in the code (such as a 2 px snap zone), oscillation is the likely cause.
- **Unconditional snaps are dangerous.** Snapping to a tile centre "every frame when close" is different from snapping "when crossing into a new tile." The first causes oscillation; the second enables smooth movement.
- **State resets on mode transitions are easy to miss.** Reversing direction is one line. Resetting dependent state (`lastPickedTile`) is a second line that is easy to forget — and without it, the direction guard silently breaks.
- **Ghost AI has no post-movement wall check.** Pac-Man has a wall collision snap after movement; ghosts rely entirely on the tile-centre direction picker. Any scenario where direction picking is skipped leaves ghosts unprotected against walls.

### On Testing Game Logic

- **Test the invariants the code relies on, not just the code itself.** The escape bug required row 0 to be all walls. A test asserting that structural invariant catches any future map edit that breaks it — before the bug reappears.
- **Document pre-fix behaviour explicitly.** Tests that say "without X, Y would happen" are as valuable as tests that verify the fix — they explain why the fix matters to future maintainers.
- **Exhaustive scans beat sampling.** The maze-scan test group covers ~3,472 tile+direction combinations and catches regressions that spot-checks might miss.
- **Inlining pure functions in tests pays off.** Because `isWalkableForGhost`, `pixelToTile`, and others were inlined rather than imported, the test file runs as a standalone HTML page with no build step, no server, and no npm.

### On Standalone Browser Games

- **`file://` URL restrictions apply.** No `fetch`, no ES modules with relative imports — everything must be loaded via `<script>` tags in a single page.
- **Web Audio API for sound** removes the need for any audio assets. Simple beeps via `OscillatorNode` are sufficient for arcade-style feedback.
- **`requestAnimationFrame` with a delta-time cap** (`dt = min(dt, 1/15)`) prevents the spiral-of-death where a slow frame causes the next frame to simulate too much time, creating runaway physics.

---

*Session conducted in Claude Code (VS Code extension) using claude-sonnet-4-6 as the orchestrator and claude-opus-4-6 / claude-sonnet-4-6 for agent subprocesses.*
