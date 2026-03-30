---
title: "feat: Hide and Seek — Top-Down 2D AI Hide-and-Seek Game"
type: feat
status: active
date: 2026-03-29
origin: docs/ideation/2026-03-29-hide-and-seek-brainstorm.md
---

# Hide and Seek — Implementation Plan

## Overview

Build a top-down 2D hide-and-seek game in the browser using Phaser 3 and TypeScript. The player hides from an AI seeker in indoor environments. The seeker counts down (configurable, default 10s), then hunts using line-of-sight and proximity detection. Survive the timer to win; get found and the seeker wins. An AI-vs-AI spectator mode lets you watch two agents compete in god-view.

This is a Spec-Driven Development project — fully autonomous SDLC. All code, assets, and configuration produced by AI agents. Briggsy is ATC.

## Problem Statement / Motivation

Briggsy wants to build a hide-and-seek game as a learning exercise in SDD. The game explores AI behavior (seeker intelligence, hider strategy), visibility systems (fog of war, line-of-sight), and the tension between information and uncertainty (sonar ping mechanic). The architecture must support future upgrades to isometric/3D rendering (Godot) without rewriting game logic.

## Proposed Solution

A Phaser 3.90.0 browser game with a clean engine/renderer separation:

- **`src/game/`** — Pure TypeScript game logic (AI, pathfinding, LOS, rules, state). Zero Phaser imports. Fully testable in Node.js with Vitest.
- **`src/renderer/`** — Phaser scenes, sprites, fog overlay, camera effects. Reads game state, never mutates it.
- **`src/main.ts`** — Composition root. Wires game logic to renderer. No logic here.

This mirrors the architecture validated across sibling projects (top-down-racer-02, 04, conway) and enables the Godot upgrade path: swap `src/renderer/`, keep `src/game/`.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────┐
│                  main.ts                     │
│            (composition root)                │
├──────────────────┬──────────────────────────┤
│   src/game/      │    src/renderer/          │
│   (pure TS)      │    (Phaser 3)             │
│                  │                           │
│  state.ts        │  scenes/                  │
│  map.ts          │    Boot, Preloader,       │
│  movement.ts     │    MainMenu, Game,        │
│  los.ts          │    HUD, PauseMenu,        │
│  detection.ts    │    Results                │
│  timer.ts        │  entities/                │
│  rules.ts        │    PlayerSprite,          │
│  ai/             │    SeekerSprite,          │
│    seeker.ts     │    DoorSprite             │
│    hider.ts      │  systems/                 │
│    pathfinding.ts│    FogRenderer,           │
│                  │    MinimapRenderer,        │
│                  │    SonarPing,              │
│                  │    InputManager            │
├──────────────────┴──────────────────────────┤
│  src/types/        src/constants.ts           │
└─────────────────────────────────────────────┘
```

**Sacred rules:**
- `src/game/` has ZERO imports from Phaser, the DOM, or any browser API
- Renderer reads game state via `Readonly<GameState>` — never mutates it
- All game logic runs inside a fixed-timestep accumulator (constant dt)
- All configurable values live in `src/constants.ts` with sensible defaults

### Technology Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | Phaser 3.90.0 | Latest stable, battle-tested, excellent tilemap/camera/gamepad support |
| Language | TypeScript (strict) | Conway-level strictness: noUncheckedIndexedAccess, verbatimModuleSyntax |
| Bundler | Vite 7.x | Fast HMR, Phaser template available |
| Testing | Vitest 4.x | Explicit imports, mirrors src/ structure |
| Package mgr | pnpm | Consistent with all sibling projects |
| Pathfinding | EasyStar.js | Async A*, dynamic obstacles via avoidAdditionalPoint() |
| LOS | Custom symmetric shadowcasting | Albert Ford's algorithm, ~200 lines, O(n²), grid-native |
| Tile editor | Tiled (JSON export) | Industry standard, first-class Phaser 3 support |
| Tile size | 32x32 | Sweet spot for detail, massive asset ecosystem, clean 2x/3x scaling |
| Art | Gemini Imagen 4 | Custom stylized cartoon assets, consistent style via prompt template |

### Key Technical Decisions

**LOS: Symmetric shadowcasting over phaser-raycaster plugin.**
The phaser-raycaster plugin (96 stars, 0 npm dependents) uses geometric raycasting — slower for grid-based FOV than shadowcasting. Albert Ford's symmetric variant guarantees: if A sees B, B sees A. Critical for fair gameplay. We implement it ourselves in `src/game/los.ts` — pure math, ~200 lines, fully testable. (Sources: RogueBasin comparative study, Albert Ford's shadowcasting paper, Ourcade Phaser 3 FOV tutorial)

**Pathfinding: EasyStar.js over PathFinding.js.**
EasyStar's async computation spreads pathfinding across frames — won't block the game loop. `avoidAdditionalPoint()` handles door state changes cleanly without grid rebuilds. If we hit performance walls on larger maps, PathFinding.js with Jump Point Search is the upgrade path. (Sources: EasyStar.js GitHub, Red Blob Games pathfinding)

**Seeker AI: Finite State Machine over behavior trees or utility AI.**
FSM is the standard for stealth/seeker games (Pac-Man, Hotline Miami, Metal Gear Solid). States: PATROL → SUSPICIOUS → SEARCH → CHASE. Simple to debug, easy to tier by difficulty. Behavior trees are overkill for our scope. We can layer utility scoring within states later (e.g., "which room to search next"). (Sources: GameInternals Pac-Man analysis, Hotline Miami AI analysis, Game AI Pro)

**Fog rendering: Per-tile alpha tinting.**
Simplest approach that looks professional. Three states per tile: unexplored (alpha 0 / black tile), explored-but-dark (dark tint), visible (normal). No shaders, no RenderTexture compositing, no blend mode traps. NEVER use multiply blend mode — institutional learning from top-down-racer-04: multiply on transparent pixels produces black artifacts. (Source: top-down-racer-04 render-clipping solution doc)

**Fixed timestep: Manual accumulator.**
Phaser 3 does NOT provide fixed timestep for game logic. We implement the classic accumulator pattern: all game logic in `fixedUpdate(dt)` where dt is constant (1000/60 ms). Input sampled ONCE at frame start, used for all ticks. Timers tracked as `tickCount * dt`, not accumulated floats (prevents drift). (Sources: Gaffer on Games "Fix Your Timestep", Phaser GitHub issue #2635)

### Game Mechanics (Resolved from brainstorm + SpecFlow)

| Mechanic | Decision | Source |
|----------|----------|--------|
| Detection | LOS AND proximity, instant | Brainstorm Q&A |
| Hider vision | 360° circle, configurable range (5-7 tiles) | Brainstorm Q&A |
| Fog memory | Explored areas stay dimly visible (3-state fog) | Default (RTS standard) |
| Seeker speed | 10-15% faster than hider (configurable) | Brainstorm |
| Seeker + doors | ALL tiers can open doors | Brainstorm Q&A |
| Door interaction | E key / A button, proximity-based | Brainstorm |
| Spawns | Opposite ends of map, seeker visible during countdown | Default |
| Countdown | Full map visible, hider moves freely, seeker stationary | Brainstorm |
| Hunt transition | Fog of war activates, sonar ping begins | Brainstorm |
| Found moment | Camera zoom + flash + "FOUND!" splash | Brainstorm |
| Survived moment | Mirror treatment — "SURVIVED!" splash | SpecFlow gap fill |
| Pause | Escape key, AI freezes, timer stops | SpecFlow gap fill |
| Replay | "Play again" with same settings (not recorded replay) | SpecFlow gap fill |
| Diagonal movement | Normalized (prevents 41% speed exploit) | SpecFlow gap fill |
| Furniture | Blocks LOS (hiding spots actually work) | SpecFlow gap fill |
| Pursuit | Seeker switches to direct chase when LOS acquired | SpecFlow gap fill |
| Mobile | Explicitly out of scope | SpecFlow gap fill |

## Implementation Phases

### Phase 0: Project Scaffolding

**Goal:** Project compiles, runs in browser, tests pass, architecture boundary enforced.

**Tasks:**
- [ ] `pnpm init`, install Phaser 3.90.0, TypeScript, Vite 7.x, Vitest 4.x
- [ ] tsconfig.json — Conway-level strictness (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strict: true`, target ES2022, module ESNext)
- [ ] vite.config.ts — Phaser chunked separately (`manualChunks`), `base: './'`
- [ ] vitest.config.ts — explicit imports, mirror src/ structure
- [ ] Project structure: `src/game/`, `src/renderer/scenes/`, `src/renderer/entities/`, `src/renderer/systems/`, `src/types/`, `src/constants.ts`, `src/main.ts`
- [ ] `src/constants.ts` — ALL configurable defaults:
  - `COUNTDOWN_DURATION: 10` (seconds)
  - `HUNT_TIME_LIMIT: 120` (seconds)
  - `SEEKER_SPEED_MULTIPLIER: 1.15`
  - `HIDER_VISION_RANGE: 6` (tiles)
  - `SEEKER_VISION_RANGE: 8` (tiles)
  - `SEEKER_VISION_ANGLE: 90` (degrees, for rendering cone — detection uses full FOV)
  - `PROXIMITY_THRESHOLD: 1.5` (tiles)
  - `SONAR_PING_INTERVAL: 5` (seconds)
  - `TILE_SIZE: 32`
  - `PLAYER_SPEED: 120` (pixels/second)
  - `DOOR_INTERACT_RANGE: 1.5` (tiles)
  - `HEARTBEAT_START_RANGE: 3.0` (tiles, 2x proximity threshold)
- [ ] Basic Boot scene — render a colored rectangle (proof of life)
- [ ] `src/main.ts` — Phaser.Game config with WebGL, gamepad enabled
- [ ] Architecture boundary test: grep-based check that `src/game/` contains zero Phaser/browser imports
- [ ] CLAUDE.md for the project
- [ ] npm scripts: `dev`, `build`, `test`, `typecheck`

**Success criteria:** `pnpm dev` shows a colored rectangle. `pnpm test` passes. `pnpm typecheck` passes. Architecture boundary test passes.

### Phase 1: Map + Movement

**Goal:** Walk around an indoor map, bump into walls, with keyboard and controller.

**Tasks:**
- [ ] Design first map in Tiled editor:
  - Indoor house: 6-8 rooms, hallways, 2 entrances between sections
  - Layers: Ground, Walls, BelowPlayer (furniture bases), AbovePlayer (overhead elements)
  - Object layers: Spawns (hider_spawn, seeker_spawn), Entities (doors, furniture)
  - Collision via tile property `collides: true`
  - "Prospect and Refuge" spatial design — safe spots with observation points
  - Furniture as LOS blockers (couches, tables, bookshelves)
  - Export as JSON
- [ ] `src/game/map.ts` — Map data structure: grid of tiles with collision flags, entity positions
- [ ] `src/game/state.ts` — GameState, PlayerState types (position, velocity, facing direction)
- [ ] `src/game/movement.ts` — Movement logic: apply velocity, collision response against walls
- [ ] `src/renderer/systems/InputManager.ts` — Dual input abstraction:
  - WASD + keyboard → direction vector
  - Xbox controller left stick → direction vector (deadzone 0.15)
  - Both active simultaneously, produce unified `InputState { moveX, moveY, interact, pause }`
  - Diagonal normalization (cap vector magnitude to 1.0)
- [ ] `src/renderer/scenes/Game.ts` — Main game scene:
  - Load tilemap JSON + tileset
  - Create tile layers in correct order
  - Set collision by property
  - Fixed timestep accumulator in `update()`
- [ ] `src/renderer/entities/PlayerSprite.ts` — Player sprite (placeholder colored rectangle)
  - Follows player position from game state
  - Facing direction indicator
- [ ] Camera: `startFollow(player, true, 0.1, 0.1)`, bounded to map, integer zoom
- [ ] Spawn player at hider_spawn position from Tiled Object Layer
- [ ] Unit tests: movement normalization, collision detection, map tile queries

**Success criteria:** Player walks around the map with WASD and Xbox controller. Walls block movement. Camera follows smoothly. No diagonal speed exploit.

### Phase 2: Seeker + Detection

**Goal:** Playable hide-and-seek with a dumb seeker. Countdown, hunt, found/survived.

**Tasks:**
- [ ] Install EasyStar.js: `pnpm add easystarjs`
- [ ] `src/game/ai/pathfinding.ts` — Pathfinding wrapper:
  - Initialize grid from map collision data
  - `findPath(from, to): Promise<Point[]>` — async A*
  - `setTileBlocked(x, y, blocked)` — for dynamic obstacles (doors)
  - Path smoothing: line-of-sight string-pulling post-processing
  - Calculate in fixed update, not every frame
- [ ] `src/game/ai/seeker.ts` — Seeker FSM:
  - PATROL state (Easy): pick random walkable tile, pathfind to it, repeat
  - CHASE state: pathfind directly to hider position (only when hider is in LOS + proximity)
  - State transitions: PATROL→CHASE (detection), CHASE→PATROL (lost LOS for N seconds)
- [ ] `src/game/los.ts` — Symmetric shadowcasting (Albert Ford):
  - `computeFOV(origin, range, isBlocking): Set<TileCoord>` — returns visible tile set
  - Grid-native, works on tile coordinates
  - `isBlocking(x, y)` callback checks walls, closed doors, furniture
  - Unit tests: symmetry (A sees B ↔ B sees A), corners, doorways, open rooms, corridors
- [ ] `src/game/detection.ts` — Found mechanic:
  - `checkDetection(seekerState, hiderState, seekerFOV): boolean`
  - Condition: hider tile is in seeker's FOV set AND euclidean distance ≤ PROXIMITY_THRESHOLD
  - Returns true = instant found
- [ ] `src/game/timer.ts` — Game timers:
  - Countdown timer (ticks down from COUNTDOWN_DURATION)
  - Hunt timer (ticks down from HUNT_TIME_LIMIT)
  - Track as `tickCount * dt` (no float accumulation drift)
- [ ] `src/game/rules.ts` — Game flow state machine:
  - States: COUNTDOWN → HUNT → FOUND | SURVIVED
  - COUNTDOWN: hider moves, seeker stationary, timer counting down
  - HUNT: both move, seeker AI active, hunt timer counting
  - FOUND: detection triggered
  - SURVIVED: hunt timer expired
- [ ] `src/renderer/entities/SeekerSprite.ts` — Seeker sprite (placeholder colored rectangle, different color)
  - Follows seeker position from game state
  - Visual indicator when in CHASE state (color change)
- [ ] HUD overlay: countdown display, hunt timer display
- [ ] Unit tests: pathfinding correctness, FOV symmetry, detection logic, timer accuracy, FSM transitions

**Success criteria:** Countdown ticks down. Seeker wanders randomly during hunt. Getting close + visible = "found". Timer expiry = "survived". Core game loop works.

### Phase 3: Fog of War + Game Flow

**Goal:** Complete Tier 1 — fully playable, polished hide-and-seek with scene management.

**Tasks:**
- [ ] `src/renderer/scenes/Boot.ts` — Minimal boot (set background color)
- [ ] `src/renderer/scenes/Preloader.ts` — Load all assets, show loading bar
- [ ] `src/renderer/scenes/MainMenu.ts` — Title screen:
  - Game title
  - "Play" button → start game (default settings)
  - "Settings" → difficulty, time limit, countdown duration
  - "AI vs AI" → spectator mode (greyed out until Phase 5)
- [ ] `src/renderer/scenes/Results.ts` — End-of-round screen:
  - Outcome: "FOUND!" or "SURVIVED!"
  - Stats: time survived, distance traveled
  - "Play Again" button (same settings)
  - "Main Menu" button
- [ ] `src/renderer/scenes/PauseMenu.ts` — Pause overlay:
  - Triggered by Escape / Start button
  - Game logic frozen, timers paused
  - "Resume" and "Quit to Menu" options
- [ ] `src/renderer/scenes/HUD.ts` — Parallel scene overlay:
  - Countdown/hunt timer display
  - Current phase indicator (COUNTDOWN / HUNT)
  - Communicates with Game scene via events
- [ ] `src/renderer/systems/FogRenderer.ts` — Fog of war:
  - Maintains per-tile fog state: UNEXPLORED (0) / EXPLORED (1) / VISIBLE (2)
  - During COUNTDOWN: all tiles VISIBLE (full map shown)
  - COUNTDOWN→HUNT transition: all tiles → UNEXPLORED, then apply player FOV
  - Each frame during HUNT: recalculate player FOV, update tile states
  - Tiles entering FOV: VISIBLE (normal alpha/tint)
  - Tiles leaving FOV: EXPLORED (dark tint, e.g., `setTint(0x404040)`)
  - Tiles never seen: UNEXPLORED (black/invisible, `setAlpha(0)` or black tile overlay)
  - Only update tiles that changed state (dirty flag optimization)
  - CRITICAL: Use alpha/tint, NOT multiply blend mode
  - Seeker sprite: only visible when in player's FOV
  - Entities on explored-but-dark tiles: show terrain but hide seeker
- [ ] Scene transitions with camera fade (fadeOut → switch → fadeIn)
- [ ] "Found" moment sequence:
  1. Game state → FOUND
  2. Reveal seeker position (fog clears around encounter)
  3. Camera `zoomTo(2, 500)` + `pan()` to encounter point
  4. Camera `flash(250, 255, 255, 255)`
  5. "FOUND!" text splash (1.5s hold)
  6. Camera `fadeOut(500)` → Results scene
- [ ] "Survived" moment sequence:
  1. Game state → SURVIVED
  2. Camera `zoomTo(1.5, 500)` on player
  3. Camera `flash(250, 255, 215, 0)` (gold flash)
  4. "SURVIVED!" text splash (1.5s hold)
  5. Camera `fadeOut(500)` → Results scene
- [ ] Scene data passing: game stats flow from Game → Results via `scene.start('Results', data)`
- [ ] Playwright visual tests: fog states, found moment, survived moment

**Success criteria:** Full game loop: Menu → Countdown → Hunt (with fog of war) → Found/Survived → Results → Play Again/Menu. Fog of war creates real tension. Moments feel dramatic. Pause works.

### Phase 4: Doors + Minimap

**Goal:** Complete Tier 2 — tactical hide-and-seek with interactive environment and information systems.

**Tasks:**
- [ ] `src/game/state.ts` — DoorState type: `{ id, tileX, tileY, isOpen: boolean }`
- [ ] `src/game/map.ts` — Door management:
  - Load door positions from Tiled Object Layer
  - `toggleDoor(id)` — flip isOpen, update collision grid, update LOS blocking
  - `getDoorsNear(position, range): DoorState[]` — for interaction check
  - Track initial door states (for Hard AI evidence system later)
- [ ] Door affects systems:
  - LOS: `isBlocking(x, y)` checks door.isOpen — open doors don't block
  - Pathfinding: `setTileBlocked(doorX, doorY, !door.isOpen)` — closed doors block pathing
  - When door state changes: cancel seeker's current path, recalculate
- [ ] `src/renderer/entities/DoorSprite.ts` — Door visual:
  - Two states: open (transparent/removed wall segment) and closed (wall-colored)
  - Swap sprite frame on state change
- [ ] Door interaction in InputManager:
  - E key / A button → `interact` flag in InputState
  - Game logic: if interact AND door within DOOR_INTERACT_RANGE → toggleDoor
  - Seeker AI: all tiers can open closed doors (navigate to door, toggle, continue)
- [ ] `src/renderer/systems/MinimapRenderer.ts` — Minimap:
  - Small-scale map rendering in screen corner (top-right)
  - Shows: map layout (walls, rooms), player position (dot), door states
  - Fog states reflected (unexplored = black, explored = dim, visible = bright)
  - Fixed size on screen, scrolls with player
  - Implementation: second Phaser Camera with small viewport + zoom, or RenderTexture
- [ ] `src/renderer/systems/SonarPing.ts` — Sonar ping on minimap:
  - Every SONAR_PING_INTERVAL seconds: reveal seeker position on minimap
  - Visual: expanding ring tween (`scaleX/Y` 0→max, `alpha` 1→0, Sine.easeOut, ~1.5s)
  - Seeker blip: dot appears at seeker's minimap position, holds 2s, fades out over 1s
  - Stagger: ring spawns, blip appears when ring reaches seeker's distance
  - Configurable interval
- [ ] Menu: add sonar ping frequency to settings
- [ ] Unit tests: door toggle, LOS with doors, pathfinding with doors
- [ ] Playwright tests: minimap rendering, sonar ping animation

**Success criteria:** Doors open/close with E/A button. Closing a door blocks seeker's path and LOS. Seeker can open doors. Minimap shows map layout. Sonar ping reveals seeker position periodically. Tactical gameplay emerges.

### Phase 5: AI Depth + Spectator

**Goal:** Complete Tier 3a — intelligent AI with personality, AI-vs-AI spectator mode.

**Tasks:**
- [ ] `src/game/ai/seeker.ts` — Full FSM expansion:
  - PATROL: wander/patrol (Easy=random, Medium=systematic, Hard=strategic)
  - SUSPICIOUS: investigate stimulus (door change sound, nearby movement)
  - SEARCH: focused search around last-known-position or evidence location
  - CHASE: direct pursuit to hider (triggered by LOS + within vision range)
  - Transitions with configurable delays (Easy=slow reactions, Hard=fast)
- [ ] Medium AI — Systematic searcher:
  - Track rooms as cleared/uncleared (visited within last N seconds = cleared)
  - Always path to nearest uncleared room
  - Clear room = walk to center, rotate view, mark cleared
  - Predictable but thorough — player can learn pattern
- [ ] Hard AI — Evidence-based hunter:
  - Track door state deltas (compare current vs initial — changed = evidence)
  - Last-known-position: remember where hider was last seen, expand search radius over time
  - "Director" system (simplified Alien: Isolation):
    - Tracks time since last detection event
    - After long search: suggest a zone near the hider (not exact position)
    - After short search: no hints (let AI work naturally)
    - Never gives exact position — just narrows the search area
  - Check likely hiding spots first (corners, behind furniture, dead ends)
  - Fast reaction time, wide vision range, long memory
- [ ] AI personality parameters per tier:

  | Parameter | Easy | Medium | Hard |
  |-----------|------|--------|------|
  | Vision range | 4 tiles | 6 tiles | 8 tiles |
  | Reaction delay | 1.5s | 0.75s | 0.25s |
  | Memory duration | 3s | 8s | 20s |
  | Search radius | 3 tiles | 5 tiles | 8 tiles |
  | Search thoroughness | check 1-2 spots | clear full room | clear room + adjacent |

- [ ] Path smoothing for all AI movement:
  - String-pulling: remove waypoints with clear LOS to next-next waypoint
  - Smooth lerp between waypoints (not grid-snapped)
  - Result: AI walks naturally, not in robotic zigzags
- [ ] `src/game/ai/hider.ts` — AI hider:
  - Easy: pick random walkable tile at start, sit there
  - Medium: evaluate hiding spots (score by: distance from seeker spawn, number of LOS blockers nearby, number of adjacent escape routes). Pick best, sit.
  - Hard: reposition when seeker approaches (uses own FOV to detect seeker). Close doors strategically. Move to new hiding spot when current one is compromised.
- [ ] AI-vs-AI spectator mode:
  - God-view camera: show entire map, no fog of war
  - Render both agents' vision cones (semi-transparent colored arcs)
  - Show both agents' current FSM state labels above their sprites
  - Show pathfinding paths as debug lines (optional toggle)
  - Seeker difficulty + hider difficulty independently configurable
- [ ] MainMenu: enable "AI vs AI" button, difficulty selection for each agent
- [ ] Unit tests: FSM state transitions, medium clearing logic, hard evidence tracking, AI hider spot evaluation
- [ ] "Near miss" design: tune parameters so the seeker occasionally walks past the hider's hiding spot, pauses, then moves on. This is where the fun lives.

**Success criteria:** Medium seeker methodically clears rooms. Hard seeker uses evidence and director hints. AI hider picks smart spots and repositions. AI-vs-AI spectator shows both agents' thinking. Near misses happen regularly. Each difficulty feels distinct.

### Phase 6: Sound + Scoring

**Goal:** Complete Tier 3 — polished game with audio atmosphere and progression tracking.

**Tasks:**
- [ ] Phaser Sound Manager setup:
  - Web Audio API preferred (Phaser handles fallback)
  - Volume controls in settings menu
  - Mute toggle
  - Audio context resume on first user interaction (browser requirement)
- [ ] Sound effects:
  - Player footsteps (triggered by movement, paced by speed)
  - Seeker footsteps (only audible when seeker is within hearing range — player's FOV + buffer)
  - Door open/close creak
  - Countdown tick (final 3 seconds: louder ticks)
  - Hunt phase start sound (ominous tone)
  - "Found" sting (dramatic hit)
  - "Survived" sting (triumphant chord)
  - UI sounds (menu clicks, transitions)
- [ ] Heartbeat proximity warning:
  - Starts when seeker is within HEARTBEAT_START_RANGE (2x proximity threshold)
  - Tempo increases linearly as distance decreases
  - Volume increases as distance decreases
  - Directional stereo panning (seeker left = heartbeat pans left) — stretch goal
  - `OscillatorNode.start()` can only be called ONCE — use gain node for on/off
- [ ] Ambient indoor sounds:
  - Subtle background hum
  - Occasional random creaks (not from player — atmosphere)
  - Clock ticking (if time pressure)
- [ ] `src/game/state.ts` — ScoreState:
  - Time survived (seconds)
  - Distance traveled (pixels → converted to tiles for display)
  - Close calls (number of times seeker was within 2x proximity threshold)
  - Closest approach (minimum distance to seeker during hunt)
  - Doors interacted with
  - Win/loss result
- [ ] Scoring system:
  - Track stats during gameplay in game state
  - Calculate score: base points for surviving + bonus for close calls + time bonus
  - Display on Results screen with breakdown
- [ ] Stats persistence (localStorage):
  - Total games played
  - Win/loss record per difficulty
  - Best survival time per difficulty
  - Settings persistence (last-used difficulty, time limit, etc.)
- [ ] Results screen enhancement:
  - Full stat breakdown
  - Personal best indicators
  - Win streak tracking
- [ ] Sound settings in menu: master volume, SFX volume, music volume, mute all
- [ ] Unit tests: score calculation, stat tracking

**Success criteria:** Audio creates real tension (heartbeat when seeker is close, footstep audio cues). Scoring gives reason to replay. Stats persist across sessions. Sound settings work.

### Phase 7: Art Pipeline

**Goal:** Replace all placeholder art with Gemini Imagen 4 generated stylized cartoon assets.

**Tasks:**
- [ ] Art style guide document:
  - Style: stylized cartoon, clean black outlines, bold colors, slightly exaggerated proportions
  - Palette: warm indoor colors (wood browns, carpet reds, wall creams), cool accent (blue sonar, red alert)
  - Perspective: strict top-down
  - Tile size: 32x32 pixels
  - Character size: 32x32 (fits one tile)
  - Prompt template for consistency across all generations
- [ ] Asset generation script (`scripts/generate-assets.ts`):
  - Load API key from .env (`set -a && source .env && set +a`)
  - Batch generation with delays (rate limit safety)
  - Save to `public/assets/` with descriptive filenames
  - Idempotent: skip assets that already exist
- [ ] Tileset generation:
  - Floor tiles: wood planks, carpet, kitchen tile, bathroom tile (4+ variants)
  - Wall tiles: interior walls, exterior walls, corners, T-junctions
  - Door tiles: open state, closed state
  - Furniture: couch (2x1), table (2x2), bookshelf (1x2), chair (1x1), bed (2x2), desk (2x1)
  - Decorative: rug, lamp, plant, picture frame
- [ ] Character sprites:
  - Hider: 4 directional frames (N/S/E/W), idle + walking animation (2-frame minimum)
  - Seeker: 4 directional frames, idle + walking + chase animation, visually distinct (maybe flashlight, cap)
  - AI hider variant (different color/outfit)
- [ ] UI elements:
  - Minimap frame/border
  - Timer display background
  - "FOUND!" splash graphic
  - "SURVIVED!" splash graphic
  - Menu background
  - Button sprites
- [ ] Texture atlas creation:
  - Combine sprites into atlas for fewer draw calls
  - Phaser JSON Atlas format
  - Separate atlases: characters, UI, tileset (tileset stays as tilemap image)
- [ ] Integration:
  - Update Preloader to load new assets
  - Update all sprite references
  - Update Tiled tileset reference
  - Verify all visuals at 2x and 3x scale
- [ ] Visual polish pass:
  - Consistent lighting direction across all assets
  - Color coherence check
  - Readability at game zoom level
  - Playwright screenshot regression tests

**Success criteria:** All placeholder art replaced. Consistent stylized cartoon look. Assets readable at all zoom levels. Game looks polished and professional.

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| phaser-raycaster plugin for LOS | Geometric raycasting is slower than shadowcasting for grid-based FOV. 96 stars, 0 npm dependents — risky dependency. |
| Behavior trees for seeker AI | Overkill for our scope (3 difficulty tiers, 1 seeker type). FSM is simpler, easier to debug, validated by shipped games. |
| RenderTexture fog of war | More complex (compositing, blend modes). Per-tile tinting is simpler and avoids the multiply blend mode black artifact trap. Upgrade path available later for soft edges. |
| PathFinding.js (with JPS) | Synchronous — could block game loop. EasyStar's async model is safer. JPS is an upgrade path if we need it. |
| Phaser 4 | Still in RC7, not production-ready. v3.90 is stable and sufficient. Game logic is Phaser-independent anyway. |
| rot.js for FOV | Mature, but GitHub issue #110 documents GC churn in real-time (non-turn-based) usage. Rolling our own is ~200 lines and avoids the dependency. |
| Canvas renderer (instead of WebGL) | WebGL is significantly faster. No reason to use Canvas fallback. |

## System-Wide Impact

### Interaction Graph

**Detection event chain:**
```
fixedUpdate() → moveSeeker() → computeSeekerFOV() → checkDetection()
  → if detected: GameState.phase = FOUND
  → Renderer reads FOUND → triggers camera zoom + flash sequence
  → HUD reads FOUND → shows "FOUND!" splash
  → After animation → scene.start('Results', stats)
```

**Door toggle chain:**
```
InputManager.interact → game.toggleDoor(id)
  → door.isOpen flips
  → LOS: isBlocking() return value changes (shadowcasting affected next frame)
  → Pathfinding: setTileBlocked() called → seeker path recalculated
  → Hard AI: door delta recorded as evidence
  → Renderer: DoorSprite swaps frame
  → Sound: door creak plays
```

**Sonar ping chain:**
```
Timer fires every SONAR_PING_INTERVAL
  → Game state: seekerPosition sampled
  → MinimapRenderer: expanding ring tween spawned
  → MinimapRenderer: seeker blip appears at position, holds 2s, fades
  → Player sees blip → makes strategic decision
```

### Error Propagation
- Game logic errors stay in game/: a bad pathfinding result produces wrong movement, never crashes the renderer
- Renderer errors stay in renderer/: a failed tween or missing sprite doesn't corrupt game state
- Fixed timestep prevents timing-related desync between game logic and rendering

### State Lifecycle Risks
- Door toggle is atomic (single boolean flip) — no partial state risk
- Pathfinding is async but cancellable — door change cancels pending path, requests new one
- Fog state array updated in-place each frame — no orphaned state
- Scene transitions use Phaser's built-in lifecycle — `scene.start()` properly destroys previous scene

### Integration Test Scenarios
1. Player closes door → seeker was pathing through that tile → seeker recalculates and finds alternate route
2. Sonar ping fires during "found" animation → ping should be suppressed (game is in FOUND state, not HUNT)
3. Player stands on door tile and toggles → player shouldn't get stuck inside wall geometry
4. Countdown expires while player is mid-movement → hunt phase starts cleanly, fog activates without visual glitch
5. Seeker acquires LOS through an open door → player closes door → seeker loses LOS → seeker transitions to SEARCH at last-known-position

## Acceptance Criteria

### Functional Requirements
- [ ] Player can hide from AI seeker using WASD or Xbox controller
- [ ] Seeker counts down, then hunts using LOS + proximity
- [ ] Detection is LOS AND proximity, instant
- [ ] Fog of war with 3 states (unexplored/explored/visible)
- [ ] Sonar ping reveals seeker on minimap periodically
- [ ] Interactive doors break LOS and block pathfinding
- [ ] 3 seeker difficulty tiers with distinct behaviors
- [ ] 3 hider AI tiers for AI-vs-AI mode
- [ ] AI-vs-AI spectator with god-view and vision cones
- [ ] Sound effects create atmospheric tension
- [ ] Scoring tracks performance across sessions
- [ ] All placeholder art replaced with Imagen 4 generated assets
- [ ] All configurable parameters adjustable via settings menu

### Non-Functional Requirements
- [ ] 60fps on modern browsers (Chrome, Firefox, Edge)
- [ ] Fixed timestep ensures consistent gameplay across framerates
- [ ] Game logic has zero Phaser dependencies (architecture boundary)
- [ ] Game state interfaces use `Readonly<>` to prevent renderer mutation

### Quality Gates
- [ ] Unit test coverage for all game logic (LOS, detection, pathfinding, AI FSM, timers)
- [ ] Playwright visual tests for fog states, found/survived moments, sonar ping
- [ ] Architecture boundary grep test passes in CI
- [ ] TypeScript strict mode — zero `any` types, zero `@ts-ignore`
- [ ] All configurable values in constants.ts (no magic numbers in code)

## Success Metrics

- **Tier 1 complete:** Playable hide-and-seek with fog of war (Phases 0-3)
- **Tier 2 complete:** Tactical gameplay with doors and sonar minimap (Phase 4)
- **Tier 3 complete:** Deep AI, spectator mode, sound, scoring (Phases 5-6)
- **Visual upgrade:** Placeholder art replaced with Imagen 4 assets (Phase 7)
- **"Near miss" rate:** Hard AI creates at least 1-2 near-miss moments per round (tuning target)
- **Replay motivation:** Scoring + stats give reason to play again on higher difficulty

## Dependencies & Prerequisites

| Dependency | Phase | Risk |
|------------|-------|------|
| Phaser 3.90.0 | 0 | Low — stable, latest v3 |
| EasyStar.js | 2 | Low — established library, async A* |
| Tiled editor | 1 | Low — industry standard, free |
| Gemini Imagen 4 API | 7 | Medium — API key required, generation consistency |
| Playwright | 3+ | Low — for visual tests |

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Shadowcasting implementation bugs | High — unfair detection | Medium | Exhaustive unit tests for symmetry, corners, doorways. Albert Ford's algorithm is well-documented. |
| Phaser 3 end-of-life (v4 takeover) | Low — game logic is independent | Low | v3.90 works. Renderer is swappable. |
| EasyStar.js async timing issues | Medium — stale paths | Low | Cancel+recalculate on world changes. Only recalc when needed. |
| Fog of war performance (many tiles) | Medium — frame drops | Low | Dirty flag optimization. Only update changed tiles. Profile early. |
| Imagen 4 style inconsistency | Medium — visual incoherence | Medium | Strict prompt template. Batch generation. Manual review pass. |
| AI feels unfair or broken | High — bad gameplay | Medium | Extensive playtesting per tier. Tune parameters. "Near miss" design principle. |
| Context rot during long phases | Medium — quality degradation | High | Fresh context window per phase (established practice). Target <50% utilization. |

## Future Considerations (Tier 4+)

- Movable furniture (push to block doorways)
- Fort building / barricading rooms
- Multiple themed maps (mansion, office, warehouse)
- Procedural map generation
- Godot port (3D renderer, same game logic)
- Replay recording system (game state, not pixels)
- Online multiplayer (human seeker vs human hider)
- Mobile touch controls

## Documentation Plan

- [ ] CLAUDE.md — project conventions, architecture rules, commands
- [ ] README.md — update with current features after each tier completion
- [ ] TODO.md — update after each session

## Sources & References

### Origin
- **Brainstorm document:** [docs/ideation/2026-03-29-hide-and-seek-brainstorm.md](docs/ideation/2026-03-29-hide-and-seek-brainstorm.md) — all design decisions, game modes, configurable parameters, feature tiers, upgrade path

### Internal References
- Architecture pattern: top-down-racer-02, top-down-racer-04 (engine/renderer separation)
- TypeScript config: conway_game_of_life/tsconfig.json (strictest baseline)
- Render bug prevention: top-down-racer-04/docs/solutions/ui-bugs/render-clipping-dark-artifacts-filtermanager-20260312.md (never multiply blend with transparency)
- Fixed timestep: top-down-racer-02/.planning/research/PITFALLS.md (accumulator pattern, tick-based timers)
- Process: gsd-autopilot/LESSONS-LEARNED.md (deepen plans, context rot at 50%)

### External References — Framework
- [Phaser 3.90.0 "Tsugumi"](https://phaser.io/download/stable) — latest stable
- [Phaser Vite TypeScript Template](https://github.com/phaserjs/template-vite-ts)
- [Phaser Camera API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)
- [Phaser Scene Concepts](https://docs.phaser.io/phaser/concepts/scenes)
- [Phaser Gamepad Module](https://docs.phaser.io/api-documentation/namespace/input-gamepad)
- [Phaser Tilemap API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)
- [Modular Game Worlds in Phaser 3 — Michael Hadley](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)
- [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)

### External References — Algorithms
- [Symmetric Shadowcasting — Albert Ford](https://www.albertford.com/shadowcasting/)
- [Comparative Study of FOV Algorithms — RogueBasin](https://www.roguebasin.com/index.php/Comparative_study_of_field_of_view_algorithms_for_2D_grid_based_worlds)
- [2D Visibility — Red Blob Games](https://www.redblobgames.com/articles/visibility/)
- [A* Implementation — Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/implementation.html)
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)
- [Shadow Casting FOV in Phaser JS — EvolvingDeveloper](https://evolvingdeveloper.com/shadow-casting-fov-phaser-js/)
- [MRPAS FOV with Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser3-mrpas-fov-field-of-view-algorithm-roguelike-dungeon-crawler/)
- [Simple Fog of War for Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)

### External References — Game Design
- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
- [Hotline Miami AI Analysis — Rodrigo Fernandez Diaz](https://medium.com/@RodFernandez91/an-analysis-of-hotline-miami-ai-23c37dbcb156)
- [Stealth Game Spatial Strategies — Enrico Ottonello](https://www.artstation.com/artwork/28lPBY)
- [Cover — The Level Design Book](https://book.leveldesignbook.com/process/combat/cover)
- [The Anatomy of a Stealth Encounter — Gamedeveloper](https://www.gamedeveloper.com/design/the-anatomy-of-a-stealth-encounter)
- [Bloodhound Sonar — Apex Legends Wiki](https://apexlegends.fandom.com/wiki/Bloodhound)

### External References — Sonar/Ping UI
- [CSS Radar Sweep Animation](https://css-zone.com/animation/radar)
- [Sonar Ping CodePen — omercetin](https://codepen.io/omercetin/pen/GoeWwq)
- [Phaser 3 Tweens Documentation](https://docs.phaser.io/phaser/concepts/tweens)
