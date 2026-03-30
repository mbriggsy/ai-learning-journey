---
title: "feat: Hide and Seek — Top-Down 2D AI Hide-and-Seek Game"
type: feat
status: active
date: 2026-03-29
origin: docs/ideation/2026-03-29-hide-and-seek-brainstorm.md
deepened: 2026-03-29
---

# Hide and Seek — Implementation Plan

## Enhancement Summary

**Deepened on:** 2026-03-29
**Research agents used:** 16 (10 research + 6 review)
**Context7 doc queries:** 3 (Phaser 3.90, EasyStar.js, Vitest 4)

### Key Improvements Discovered

1. **CRITICAL: No .gitignore** — Phase 7 introduces API key. Must create .gitignore in Phase 0.
2. **FOV data structure** — `Set<string>` creates 60 allocations/sec. Use pre-allocated `Uint8Array`.
3. **Typed event system** — Phaser's untyped EventEmitter is a type safety black hole. Need `GameEventMap` + `TypedEmitter`.
4. **Discriminated unions** — `GameState` and `SeekerState` must use discriminated unions so illegal states are unrepresentable.
5. **`ReadonlyDeep<T>`** — shallow `Readonly<T>` doesn't protect nested objects/arrays.
6. **GameEngine class** — extract from Game.ts to prevent god-object. Reused by SpectatorGame.ts.
7. **FOV in game layer** — `FogRenderer` must NOT call `computeFOV()` directly. FOV computed in `fixedUpdate()`, stored in GameState.
8. **Tab backgrounding** — completely unspecified. Auto-pause + accumulator cap + AudioContext resume.
9. **Camera flash seizure risk** — `camera.flash(250, 255, 255, 255)` is a photosensitivity hazard. Need reduced-motion toggle.
10. **Phase 5 too large** — split into 5a (seeker tiers) and 5b (hider AI + spectator).
11. **Action layer below FSM** — door-opening is a tactical action within a strategic state. FSM can't model it alone.
12. **Canvas dimensions undefined** — affects every phase. Default: 1280x720, scale FIT.
13. **Controller dead in menus** — D-pad nav, A confirm, B back needed for all scenes.
14. **Zero accessibility spec** — reduced-motion, colorblind palette, key rebinding at minimum.
15. **`pixelArt: true`** missing from Phaser config — bilinear filtering blurs 32x32 tiles.

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tab backgrounding spikes accumulator | High | visibilitychange auto-pause + cap at 5 ticks |
| Camera flash photosensitivity | High | Reduced-motion toggle, softer flash |
| .gitignore missing (API key leak) | Critical | Create in Phase 0 |
| Renderer polling misses transitions | Medium | Push-based typed event system |
| Phase 5 context rot | Medium | Split into 5a/5b |
| Set<string> FOV GC pressure | Medium | Pre-allocated Uint8Array |

### Contradictions Resolved

1. **MRPAS vs symmetric shadowcasting** — Fog research recommended MRPAS; plan chose symmetric shadowcasting. Resolution: symmetry is critical for fair hide-and-seek (if A sees B, B sees A). MRPAS has approximate symmetry only. **Keep symmetric shadowcasting.**
2. **DynamicTilemapLayer terminology** — Phaser 3.50+ merged Dynamic/Static. In 3.90, all `createLayer()` returns TilemapLayer (always dynamic). Terminology is legacy. **Just use `createLayer()`.**
3. **strictPropertyInitialization** — Best practices says false for Phaser; TS review says strict. Resolution: keep `strict: true` in tsconfig, use definite assignment assertion (`!`) on Phaser-lifecycle properties in renderer classes only.
4. **EasyStar remove single point** — Research said no individual remove; Context7 docs confirm `stopAvoidingAdditionalPoint(x, y)` EXISTS. **Use it.**
5. **setTint vs multiply blend mode** — `setTint()` multiplies colors (darkening) but is NOT the multiply BLEND MODE. Per-tile `setTint()` for fog is safe. **The landmine about multiply blend mode refers to `Phaser.BlendModes.MULTIPLY` on transparent pixels.**
6. **Minimap approach** — All agents agree: second Phaser Camera at this scale. **Confirmed.**

---

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

### Research Insights — Architecture

**Best Practices:**
- The engine/renderer separation is architecturally sound and validated by review agents. The grep-based CI enforcement makes it a hard constraint, not just a convention.
- The fixed-timestep accumulator belongs in `src/game/`, NOT in the Phaser scene. Create a `GameEngine` class that owns the update loop. The Phaser scene calls `gameEngine.tick(delta)` and reads state for rendering. This prevents Game.ts from becoming a god-object and enables reuse by SpectatorGame.ts.
- Add a **pure-TS event emitter** (~20 lines) to the game layer. Events: `PHASE_CHANGED`, `DOOR_TOGGLED`, `DETECTION_OCCURRED`, `TIMER_EXPIRED`, `SONAR_PING_DUE`. The renderer subscribes. The game layer emits. This eliminates polling and guarantees no missed transitions. Also becomes the wire point for future multiplayer.

**Critical Type Design:**
- Model `GameState` as a **discriminated union** on `phase`. Each phase variant carries only its relevant data. Illegal states become unrepresentable.
- Use `ReadonlyDeep<T>` (recursive readonly), not shallow `Readonly<T>`. Without this, the renderer can mutate nested arrays/objects.
- Define a `TypedEmitter<TMap>` wrapper around Phaser's EventEmitter with a `GameEventMap` interface. Zero `any` in event payloads.
- `TileCoord` should be a branded type (`${number},${number}`) or a `TileCoordXY` interface. The relationship between grid coords and Set keys must be explicit.
- **No enums.** Use string/number literal unions with `as const satisfies`. Enums break tree-shaking and interact poorly with `verbatimModuleSyntax`.

**State Management:**
- Split `SeekerState` into render-facing (`x, y, facingDirection, fsmState` — exposed in GameState) and AI-internal (`currentPath, roomTracking, evidenceMap` — internal to `src/game/ai/`). The renderer should only see what it needs to render.
- Define a `createGameState(mapData, settings): GameState` factory for clean initialization and "Play Again" reset.
- Establish state mutation convention in Phase 1: pure functions return new state, or document where mutation is acceptable.

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
│  engine.ts  ←NEW │  scenes/                  │
│  state.ts        │    Boot, Preloader,       │
│  map.ts          │    MainMenu, Game,        │
│  movement.ts     │    HUD, PauseMenu,        │
│  los.ts          │    Results                │
│  detection.ts    │  entities/                │
│  timer.ts        │    PlayerSprite,          │
│  rules.ts        │    SeekerSprite,          │
│  doors.ts   ←NEW │    DoorSprite             │
│  ai/             │  systems/                 │
│    seeker.ts     │    FogRenderer,           │
│    hider.ts      │    MinimapRenderer,        │
│    pathfinding.ts│    SonarPing,              │
│    actions.ts←NEW│    InputManager            │
│                  │  utils/               ←NEW │
│                  │    SceneTransition,        │
│                  │    InterpolatedSprite,     │
│                  │    EndOfRoundSequence      │
├──────────────────┴──────────────────────────┤
│  src/types/        src/constants.ts           │
│    state.ts        (all configurable values)  │
│    events.ts  ←NEW                            │
│    grid.ts    ←NEW                            │
│    utility.ts ←NEW                            │
└─────────────────────────────────────────────┘
```

**Sacred rules:**
- `src/game/` has ZERO imports from Phaser, the DOM, or any browser API
- Renderer reads game state via `ReadonlyDeep<GameState>` — never mutates it
- All game logic runs inside a fixed-timestep accumulator (constant dt) in `GameEngine`
- All configurable values live in `src/constants.ts` with sensible defaults
- Game-to-renderer communication via typed event system, not polling
- FOV computation happens in game layer `fixedUpdate()`, result stored in GameState

### Game Config (NEW — discovered gap)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Canvas size | 1280x720 | Standard 16:9, fits most screens |
| Scale mode | `Phaser.Scale.FIT` | Maintains aspect ratio, fills container |
| Renderer | WebGL (`Phaser.WEBGL`) | Required for tint/alpha. No Canvas fallback. |
| `pixelArt` | `true` | Disables bilinear filtering on 32x32 tiles |
| `antialias` | `false` | No subpixel smoothing for pixel art |
| `roundPixels` | `true` | Snap to integer positions |
| `fps.target` | 60 | Standard |

### Technology Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | Phaser 3.90.0 | Latest stable, battle-tested, excellent tilemap/camera/gamepad support |
| Language | TypeScript (strict) | Conway-level strictness: noUncheckedIndexedAccess, verbatimModuleSyntax |
| Bundler | Vite 7.x | Fast HMR, Phaser template available |
| Testing | Vitest 4.x | Explicit imports, mirrors src/ structure, projects array for unit+browser |
| Package mgr | pnpm | Consistent with all sibling projects |
| Pathfinding | EasyStar.js | Async A*, dynamic obstacles via avoidAdditionalPoint(), cancelPath(instanceId) |
| LOS | Custom symmetric shadowcasting | Albert Ford's algorithm, ~200 lines, O(n²), grid-native, rational number slopes |
| Tile editor | Tiled (JSON export, CSV format) | Industry standard, first-class Phaser 3 support |
| Tile size | 32x32 | Sweet spot for detail, massive asset ecosystem, clean 2x/3x scaling |
| Art | Gemini Imagen 4 / Nano Banana Pro | Custom stylized cartoon assets, consistent style via reference images |

### Key Technical Decisions

**LOS: Symmetric shadowcasting over phaser-raycaster plugin.**
The phaser-raycaster plugin (96 stars, 0 npm dependents) uses geometric raycasting — slower for grid-based FOV than shadowcasting. Albert Ford's symmetric variant guarantees: if A sees B, B sees A. Critical for fair gameplay. We implement it ourselves in `src/game/los.ts` — pure math, ~200 lines, fully testable. **Use rational numbers (integer numerator/denominator pairs) for slopes, NOT floating-point — precision errors break symmetry.** Model floor tiles as center points, wall tiles as inscribed diamonds. Return results via pre-allocated `Uint8Array(MAP_WIDTH * MAP_HEIGHT)`, not `Set<string>` (eliminates 60 allocations/sec, zero GC pressure). (Sources: Albert Ford's shadowcasting paper, RogueBasin comparative study, Red Blob Games visibility, Ourcade Phaser 3 FOV tutorial)

### Research Insights — Shadowcasting

**Performance:** ~0.1-0.5ms per FOV calculation at vision range 8 on 50x50 grid. Well within 16.6ms frame budget. No optimization needed beyond the Uint8Array data structure.

**Edge Cases to Test:**
- Corners: visibility around single wall corner (both sides visible)
- Doorways: 1-tile-wide gaps must be visible from appropriate angles
- Adjacent walls: observer next to wall correctly creates shadow zones
- Range boundary: inclusive (tiles at exactly max range ARE visible)
- Furniture: `isBlocking(x, y)` callback checks walls, closed doors, AND furniture tiles

**Dynamic Blockers (Doors):** Full FOV recompute when door state changes. Cost: <1ms. No caching needed at this scale. Just recalculate.

**Pathfinding: EasyStar.js over PathFinding.js.**
EasyStar's async computation spreads pathfinding across frames — won't block the game loop. `avoidAdditionalPoint()` handles door state changes. `stopAvoidingAdditionalPoint(x, y)` removes individual points (confirmed via Context7 docs). `findPath()` returns an instance ID for `cancelPath()` — critical for door-change path invalidation. `setIterationsPerCalculation(100-200)` is fine for 50x50 grid (path completes in 1-2 frames). If we hit performance walls on larger maps, PathFinding.js with Jump Point Search is the upgrade path. (Sources: EasyStar.js GitHub, Context7 docs, Red Blob Games pathfinding)

### Research Insights — EasyStar.js

**API Patterns:**
- `findPath()` returns instanceId → store for `cancelPath()` on door toggle
- `calculate()` must be called every frame in the game loop (processes queued paths)
- `enableDiagonals()` + `disableCornerCutting()` for natural AI movement
- `setTileCost()` for terrain variation (optional, not needed initially)
- Timestamp-validate paths: if door state changed after path was requested but before callback fires, discard the stale path and re-request

**Path Smoothing (String-Pulling):**
Post-process A* paths to remove unnecessary waypoints. Check LOS from waypoint[i] to waypoint[i+2]; if clear, remove waypoint[i+1]. Uses Bresenham line for LOS check. This is a **visual quality improvement** (natural AI movement), not a performance optimization.

**Seeker AI: Finite State Machine over behavior trees or utility AI.**
FSM is the standard for stealth/seeker games (Pac-Man, Hotline Miami, Metal Gear Solid). States: PATROL → SUSPICIOUS → SEARCH → CHASE. Simple to debug, easy to tier by difficulty. Behavior trees are overkill for our scope. We can layer utility scoring within states later (e.g., "which room to search next"). (Sources: GameInternals Pac-Man analysis, Hotline Miami AI analysis, Game AI Pro, Alien: Isolation Director analysis)

### Research Insights — Stealth AI

**FSM Architecture:**
- Use class-based State pattern: each state is its own class with `onEnter()`, `onUpdate(dt)`, `onExit()` hooks
- Generic FSM type with `as const satisfies` for compile-time transition validation
- Add **action/behavior layer below FSM**: FSM decides strategy (PATROL, CHASE); action queue handles tactics (move to waypoint, open door, resume path). This prevents ad-hoc door logic bolted onto FSM states.

**Director System (Alien: Isolation style):**
- Macro AI (Director) knows player's true location at all times
- Gives zone-level hints to seeker AI, NEVER exact coordinates
- Only intervenes after seeker has genuinely failed to find player (30+ seconds)
- Menace gauge: forces seeker into PATROL after 20s of active chasing (prevents constant pressure)
- Design principle: player never suspects the seeker "knows" their location

**Near-Miss Design:**
- Consider visibility score system (not binary detection) for tension: accumulate score when player is in view, trigger detection at threshold
- 10-15% detection miss rate even on Hard (random), occasional wrong-door choices
- Pac-Man scatter/chase modes: periodic "rest" prevents monotony
- Tune parameters: Easy >80% win rate, Medium 40-60%, Hard 20-30%

**Fog rendering: Per-tile alpha tinting.**
Simplest approach that looks professional. Three states per tile: unexplored (alpha 1.0 / black overlay), explored-but-dark (alpha 0.6), visible (alpha 0). No shaders, no RenderTexture compositing, no blend mode traps. NEVER use multiply blend mode — institutional learning from top-down-racer-04: multiply on transparent pixels produces black artifacts. (Source: top-down-racer-04 render-clipping solution doc)

### Research Insights — Fog of War

**Implementation:**
- Create a separate TilemapLayer filled with black tiles as fog overlay (above terrain, below AbovePlayer)
- Adjust alpha per tile: 1.0 = UNEXPLORED, 0.6 = EXPLORED, 0 = VISIBLE
- In Phaser 3.90, `createLayer()` always returns dynamic layer (DynamicTilemapLayer terminology is legacy)
- Dirty flag optimization: only update tiles that changed fog state (30-80 tiles/frame when moving, 0 when stationary)
- Use `Uint8Array` for dirty tracking (1 byte per tile, 2500 bytes for 50x50)

**Transitions:**
- COUNTDOWN→HUNT: perform fog transition during camera fade-out (while screen is black) to avoid 1-frame stutter
- Animated fog reveal: tween alpha changes over 150ms instead of instant pop for newly-visible tiles
- Explored tiles slightly lighter than unexplored (0.6 vs 1.0) for visual hierarchy

**Entity Visibility:**
- Seeker sprite: `setVisible(true)` when in VISIBLE tiles, `setVisible(false)` otherwise
- `setVisible()` is a simple flag flip, not expensive — batch after FOV recalculation

**Performance:** Total fog overhead ~3-13ms including FOV calc + tile updates. Well within budget.

**Fixed timestep: Manual accumulator.**
Phaser 3 does NOT provide fixed timestep for game logic. We implement the classic accumulator pattern: all game logic in `fixedUpdate(dt)` where dt is constant (1000/60 ms). Input sampled ONCE at frame start, used for all ticks. Timers tracked as `tickCount * dt`, not accumulated floats (prevents drift). (Sources: Gaffer on Games "Fix Your Timestep", Phaser GitHub issue #2635)

### Research Insights — Fixed Timestep

**Accumulator Cap (Spiral of Death Prevention):**
```
accumulator = Math.min(accumulator, FIXED_STEP * MAX_CATCHUP_TICKS) // MAX_CATCHUP_TICKS = 5
```
If browser tab hitches, cap prevents 600 ticks in one frame. One line, trivial, must be in Phase 1.

**Render Interpolation:**
Interpolate sprite positions between fixed ticks for visual smoothness:
```
alpha = accumulator / FIXED_STEP  // 0 to 1
renderX = lerp(prevX, currX, alpha)
```
Prevents jitter between fixed tick and variable render frame.

**Tab Backgrounding (NEW — critical gap):**
When tab is backgrounded, `requestAnimationFrame` stops. On return, delta spikes. Must handle:
1. `document.addEventListener('visibilitychange', ...)` → auto-pause game
2. Cap accumulated delta (already handled by accumulator cap)
3. `AudioContext.resume()` on tab return (Phase 6)

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
| Detection during COUNTDOWN | **Disabled** — seeker has no FOV during countdown | Spec flow review (NEW) |
| Input during cinematics | **Locked** — no input from FOUND/SURVIVED trigger until Results | Spec flow review (NEW) |
| Tab focus loss | **Auto-pause** — game pauses when tab hidden | Spec flow/perf review (NEW) |
| Close-call stat | **Debounced** — enter/exit zone event, not per-tick | Spec flow review (NEW) |

## Implementation Phases

### Phase 0: Project Scaffolding

**Goal:** Project compiles, runs in browser, tests pass, architecture boundary enforced, type system designed.

**Tasks:**
- [ ] `pnpm init`, install Phaser 3.90.0, TypeScript, Vite 7.x, Vitest 4.x
- [ ] **.gitignore** — `.env`, `.env.*`, `node_modules/`, `dist/`, `*.local` (CRITICAL — Phase 7 API key)
- [ ] tsconfig.json — Conway-level strictness (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strict: true`, target ES2022, module ESNext). Use definite assignment (`!`) for Phaser-lifecycle renderer properties only.
- [ ] vite.config.ts — Phaser chunked separately (`manualChunks`), `base: './'`, `build.sourcemap: false`
- [ ] vitest.config.ts — explicit imports, mirror src/ structure, projects array for unit (node) + browser (playwright)
- [ ] **index.html** — CSP meta tag: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:`
- [ ] Project structure: `src/game/`, `src/renderer/scenes/`, `src/renderer/entities/`, `src/renderer/systems/`, `src/renderer/utils/`, `src/types/`, `src/constants.ts`, `src/main.ts`
- [ ] **Type system design** (NEW):
  - `src/types/utility.ts` — `ReadonlyDeep<T>` recursive readonly utility type
  - `src/types/grid.ts` — `TileCoord` branded type, `TileGrid<T>` abstraction for `noUncheckedIndexedAccess`-safe 2D array access (flat `Uint8Array` with computed index)
  - `src/types/state.ts` — `GameState` discriminated union on `phase`, `SeekerRenderState`, `PlayerState`, `DoorState`, `FogState` (numeric: 0/1/2)
  - `src/types/events.ts` — `GameEventMap` interface + `TypedEmitter<TMap>` wrapper
  - `src/types/fsm.ts` — Generic `FSMConfig<TState>` with `as const satisfies` transition validation
  - Convention: **no enums**, use string/number literal unions. `import type` for all type-only imports.
- [ ] `src/constants.ts` — ALL configurable defaults with `as const satisfies Record<string, number>`:
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
  - `MAX_CATCHUP_TICKS: 5` (spiral of death prevention) (NEW)
  - `CANVAS_WIDTH: 1280` (NEW)
  - `CANVAS_HEIGHT: 720` (NEW)
- [ ] Basic Boot scene — render a colored rectangle (proof of life)
- [ ] `src/main.ts` — Phaser.Game config with WebGL, gamepad enabled, `pixelArt: true`, `antialias: false`, `roundPixels: true`, scale mode FIT, 1280x720
- [ ] Architecture boundary test: grep-based check that `src/game/` contains zero Phaser/browser imports
- [ ] CLAUDE.md for the project
- [ ] npm scripts: `dev`, `build`, `test`, `typecheck`, `audit` (pnpm audit)
- [ ] Pin exact dependency versions in package.json (no `^` ranges for Phaser, EasyStar)

**Success criteria:** `pnpm dev` shows a colored rectangle. `pnpm test` passes. `pnpm typecheck` passes. Architecture boundary test passes. Type system compiles. .gitignore excludes .env.

### Phase 1: Map + Movement

**Goal:** Walk around an indoor map, bump into walls, with keyboard and controller. GameEngine owns the update loop.

**Tasks:**
- [ ] **`src/game/engine.ts`** (NEW) — GameEngine class:
  - Owns fixed timestep accumulator with `MAX_CATCHUP_TICKS` cap
  - `tick(delta)` method called by Phaser scene's `update()`
  - Calls `fixedUpdate(dt)` with constant dt
  - Dispatches to movement, AI, detection, timers, rules modules
  - Stores `GameState`, exposes via `ReadonlyDeep<GameState>`
  - Both `Game.ts` and future `SpectatorGame.ts` instantiate this
- [ ] **Tab visibility handler** (NEW): `document.addEventListener('visibilitychange', ...)` → auto-pause game when tab hidden, resume on return
- [ ] Design first map in Tiled editor:
  - Indoor house: 6-8 rooms, hallways, 2 entrances between sections
  - Layers: Ground, Walls, BelowPlayer (furniture bases), AbovePlayer (overhead elements)
  - Object layers: Spawns (hider_spawn, seeker_spawn), Entities (doors, furniture)
  - Collision via tile property `collides: true`
  - LOS blocking via tile property `blocks_los: true` (separate from collision)
  - "Prospect and Refuge" spatial design — cover with escape routes, no long dead-end corridors
  - Furniture as LOS blockers (couches, tables, bookshelves)
  - Export as JSON with **CSV tile layer format** (Phaser can't read compressed)
- [ ] `src/game/map.ts` — Map data structure: grid of tiles with collision flags, entity positions
- [ ] `src/game/state.ts` — GameState discriminated union, PlayerState types (position, velocity, facing direction), `createGameState()` factory
- [ ] `src/game/movement.ts` — Movement logic: apply velocity, collision response against walls, corner sliding (don't stop dead at angles)
- [ ] `src/renderer/systems/InputManager.ts` — Dual input abstraction:
  - WASD + keyboard → direction vector
  - Xbox controller left stick → direction vector (deadzone 0.15)
  - Both active simultaneously, produce unified `InputState { moveX, moveY, interact, pause }`
  - Diagonal normalization: normalize AFTER combining inputs, BEFORE applying speed (cap magnitude to 1.0)
  - Gamepad requires user interaction first — handle gracefully
- [ ] `src/renderer/scenes/Game.ts` — Main game scene:
  - Load tilemap JSON + tileset
  - Create tile layers in correct depth order (Ground=0, Walls=1, BelowPlayer=2, player=5, AbovePlayer=10)
  - Set collision by property
  - Call `gameEngine.tick(delta)` in `update()`, read state for rendering
  - Cleanup listeners in `shutdown` handler (prevent memory leaks)
- [ ] `src/renderer/entities/PlayerSprite.ts` — Player sprite (placeholder colored rectangle)
  - Follows player position from game state
  - **Render interpolation** between fixed ticks for smooth visuals
  - Facing direction indicator
- [ ] `src/renderer/utils/InterpolatedSprite.ts` (NEW) — Base class/mixin for smooth interpolation between fixed-step positions. Shared by PlayerSprite and SeekerSprite.
- [ ] Camera: `startFollow(player, true, 0.1, 0.1)`, bounded to map (`setBounds`), integer zoom only, `setCullPadding(2, 2)` for tight culling
- [ ] Spawn player at hider_spawn position from Tiled Object Layer
- [ ] Unit tests: movement normalization, collision detection, map tile queries, accumulator cap, tick-based timer

**Success criteria:** Player walks around the map with WASD and Xbox controller. Walls block movement. Camera follows smoothly. No diagonal speed exploit. Tab switch auto-pauses. GameEngine owns the loop.

### Phase 2: Seeker + Detection

**Goal:** Playable hide-and-seek with a dumb seeker. Countdown, hunt, found/survived.

**Tasks:**
- [ ] Install EasyStar.js: `pnpm add easystarjs`
- [ ] `src/game/ai/pathfinding.ts` — Pathfinding wrapper:
  - Initialize grid from map collision data
  - `findPath(from, to): PathResult` — async A*, returns discriminated union (`found: true` with path, or `found: false` with reason)
  - `cancelPath(instanceId)` — for door state changes
  - `setTileBlocked(x, y, blocked)` — uses `avoidAdditionalPoint()` / `stopAvoidingAdditionalPoint()`
  - Path smoothing: Bresenham LOS string-pulling post-processing
  - `setIterationsPerCalculation(100-200)` — fine for 50x50 grid
  - `enableDiagonals()` + `disableCornerCutting()`
  - Calculate in fixed update, not every frame
- [ ] `src/game/ai/actions.ts` (NEW) — Action/behavior layer below FSM:
  - Action queue for tactical operations (moveTo, openDoor, lookAround, wait)
  - FSM decides strategy, action layer executes tactics
  - Enables door-opening without bolting ad-hoc logic onto FSM states
- [ ] `src/game/ai/seeker.ts` — Seeker FSM (class-based State pattern):
  - `onEnter()`, `onUpdate(dt)`, `onExit()` hooks per state
  - PATROL state (Easy): pick random walkable tile, pathfind to it, repeat
  - CHASE state: pathfind directly to hider position (only when hider is in LOS + proximity)
  - State transitions: PATROL→CHASE (detection), CHASE→PATROL (lost LOS for N seconds)
  - Transition delays prevent "flickering" (2-3 second buffer)
  - SeekerConfig data object for per-tier parameters
- [ ] `src/game/los.ts` — Symmetric shadowcasting (Albert Ford):
  - `computeFOV(origin, range, isBlocking, visibleTiles: Uint8Array): void` — writes to pre-allocated array
  - **Rational number slopes** (integer numerator/denominator pairs, NOT floating-point)
  - Grid-native, works on tile coordinates
  - `isBlocking(x, y)` callback checks walls, closed doors, furniture (`blocks_los` property)
  - Unit tests: symmetry (A sees B ↔ B sees A), corners, doorways, open rooms, corridors, range boundaries, adjacent walls
- [ ] `src/game/detection.ts` — Found mechanic:
  - `checkDetection(seekerState, hiderState, visibleTiles: Uint8Array): boolean`
  - Condition: hider tile is visible in Uint8Array AND euclidean distance ≤ PROXIMITY_THRESHOLD
  - Returns true = instant found
  - **Detection completely disabled during COUNTDOWN phase**
- [ ] `src/game/timer.ts` — Game timers:
  - Countdown timer (ticks down from COUNTDOWN_DURATION)
  - Hunt timer (ticks down from HUNT_TIME_LIMIT)
  - Track as `tickCount * dt` (no float accumulation drift)
- [ ] `src/game/rules.ts` — Game flow state machine:
  - States: COUNTDOWN → HUNT → FOUND | SURVIVED
  - COUNTDOWN: hider moves, seeker stationary, **no detection checks**, timer counting down
  - HUNT: both move, seeker AI active, hunt timer counting
  - FOUND: detection triggered → emit `DETECTION_OCCURRED` event
  - SURVIVED: hunt timer expired → emit `TIMER_EXPIRED` event
- [ ] `src/renderer/entities/SeekerSprite.ts` — Seeker sprite (placeholder colored rectangle, different color)
  - Uses InterpolatedSprite base for smooth rendering
  - Visual indicator when in CHASE state (color change)
- [ ] HUD overlay: countdown display, hunt timer display
- [ ] Unit tests: pathfinding correctness, FOV symmetry, detection logic, timer accuracy, FSM transitions, action queue

**Success criteria:** Countdown ticks down. Seeker wanders randomly during hunt. Getting close + visible = "found". Timer expiry = "survived". Core game loop works. Events emitted on transitions.

### Phase 3: Fog of War + Game Flow

**Goal:** Complete Tier 1 — fully playable, polished hide-and-seek with scene management.

**Tasks:**
- [ ] `src/renderer/scenes/Boot.ts` — Minimal boot (set background color). **"Click to Start" gate for audio context unlock** (browser autoplay policy).
- [ ] `src/renderer/scenes/Preloader.ts` — Load all assets, show loading bar. Add `loaderror` event handler for failed assets.
- [ ] `src/renderer/scenes/MainMenu.ts` — Title screen:
  - Game title
  - "Play" button → start game (default settings)
  - "Settings" → difficulty, time limit, countdown duration
  - "AI vs AI" → spectator mode (greyed out until Phase 5)
  - **Controller navigation**: D-pad up/down, A confirm, B back (NEW)
- [ ] `src/renderer/scenes/Results.ts` — End-of-round screen:
  - Outcome: "FOUND!" or "SURVIVED!"
  - Stats: time survived, distance traveled
  - "Play Again" button (same settings) — calls `createGameState()` for clean reset
  - "Main Menu" button
  - **Controller navigation** (NEW)
- [ ] `src/renderer/scenes/PauseMenu.ts` — Pause overlay:
  - Triggered by Escape / Start button
  - Game logic frozen, timers paused
  - "Resume" and "Quit to Menu" options
  - **Volume settings accessible from pause** (NEW — spec flow gap)
  - **Controller navigation** (NEW)
- [ ] `src/renderer/scenes/HUD.ts` — Parallel scene overlay:
  - Countdown/hunt timer display
  - Current phase indicator (COUNTDOWN / HUNT)
  - Communicates with Game scene via **typed event system** (not Phaser scene events)
  - **First-time onboarding text during countdown** (NEW): "Find a hiding spot! WASD to move, E for doors."
- [ ] `src/renderer/systems/FogRenderer.ts` — Fog of war:
  - Maintains per-tile fog state: UNEXPLORED (0) / EXPLORED (1) / VISIBLE (2)
  - **Reads `GameState.visibleTiles` (Uint8Array) — NEVER calls los.ts directly**
  - During COUNTDOWN: all tiles VISIBLE (full map shown)
  - COUNTDOWN→HUNT transition: **perform during camera fade-out** (avoid 1-frame stutter)
  - Each frame during HUNT: read visibleTiles from GameState, update tile states
  - Tiles entering FOV: VISIBLE (alpha 0, **tween from 0.6→0 over 150ms** for smooth reveal)
  - Tiles leaving FOV: EXPLORED (alpha 0.6)
  - Tiles never seen: UNEXPLORED (alpha 1.0, black overlay)
  - Only update tiles that changed state (dirty flag optimization via Uint8Array)
  - CRITICAL: Use alpha tinting, NOT multiply blend mode
  - Seeker sprite: only visible when in player's VISIBLE tiles
- [ ] `src/renderer/utils/SceneTransition.ts` (NEW) — Reusable fadeOut-switch-fadeIn utility (used 4+ times)
- [ ] `src/renderer/utils/EndOfRoundSequence.ts` (NEW) — Parameterized end-of-round camera sequence:
  - Config: zoom level, flash color, flash intensity, text content, pan target
  - "Found" config: zoom 2, white flash (reduced intensity), pan to encounter, "FOUND!" text
  - "Survived" config: zoom 1.5, gold flash, stay on player, "SURVIVED!" text
  - **Reduced-motion mode**: skip flash entirely, use simple fade instead (photosensitivity safety)
  - **All input locked during sequence**
- [ ] **Accessibility settings** (NEW — spec flow gap):
  - Reduced-motion toggle (disables camera flash + zoom, uses simple fade)
  - Stored in localStorage alongside other settings
- [ ] Scene data passing: game stats flow from Game → Results via `scene.start('Results', data)`
- [ ] Playwright visual tests: fog states, found moment, survived moment
- [ ] Scene memory leak prevention: cleanup all event listeners in `shutdown` handler

**Success criteria:** Full game loop: Menu → Countdown → Hunt (with fog of war) → Found/Survived → Results → Play Again/Menu. Fog of war creates real tension. Moments feel dramatic. Pause works. Controller navigates all menus. Reduced-motion toggle available.

### Phase 4: Doors + Minimap

**Goal:** Complete Tier 2 — tactical hide-and-seek with interactive environment and information systems.

**Tasks:**
- [ ] `src/game/doors.ts` (NEW — extracted from map.ts for SRP):
  - `DoorState` type: `{ id, tileX, tileY, isOpen: boolean }`
  - Door management: load positions from Tiled Object Layer
  - `toggleDoor(id)` — flip isOpen, emit `DOOR_TOGGLED` event
  - `getDoorsNear(position, range): DoorState[]` — for interaction check
  - Track initial door states (for Hard AI evidence system later)
- [ ] Door affects systems (via event cascade):
  - LOS: `isBlocking(x, y)` checks door.isOpen — open doors don't block
  - Pathfinding: `stopAvoidingAdditionalPoint()` on open, `avoidAdditionalPoint()` on close
  - When door state changes: cancel seeker's current path (via instanceId), recalculate
  - **Timestamp-validate paths**: if door changed after path requested but before callback, discard stale path
- [ ] `src/renderer/entities/DoorSprite.ts` — Door visual:
  - Two states: open (transparent/removed wall segment) and closed (wall-colored)
  - Swap sprite frame on state change
- [ ] Door interaction in InputManager:
  - E key / A button → `interact` flag in InputState
  - Game logic: if interact AND door within DOOR_INTERACT_RANGE → toggleDoor
  - **Multiple doors in range**: nearest by euclidean distance
  - Seeker AI: all tiers can open closed doors (via action layer: navigate to door, toggle, continue)
  - **Edge case**: seeker opens door, player on other side → brief reaction delay before detection check
- [ ] `src/renderer/systems/MinimapRenderer.ts` — Minimap:
  - **Second Phaser Camera** with small viewport (top-right corner)
  - Shows: map layout (walls, rooms), player position (dot), door states
  - Fog states reflected automatically (camera sees tint/alpha changes)
  - Fixed size on screen, scrolls with player
  - **Colorblind-safe**: blue hider dot + orange seeker blip (not red-green)
  - Semi-transparent background, border frame
- [ ] `src/renderer/systems/SonarPing.ts` — Sonar ping on minimap:
  - Every SONAR_PING_INTERVAL seconds: **game layer sets `sonarPingDue: true` in GameState** (timer in game layer, not renderer)
  - Visual: expanding ring tween (`scaleX/Y` 0→max, `alpha` 1→0, **Sine.easeOut**, ~1.5s)
  - Seeker blip: dot appears at seeker's minimap position, holds 2s, fades out over 1s
  - Stagger: blip delay based on distance to seeker
  - Cleanup completed tweens (onComplete → destroy)
  - Configurable interval
- [ ] **Settings validation** (NEW): min/max constraints for sonar interval (2-15s)
- [ ] Unit tests: door toggle, LOS with doors, pathfinding with doors, timestamp validation
- [ ] Playwright tests: minimap rendering, sonar ping animation

**Success criteria:** Doors open/close with E/A button. Closing a door blocks seeker's path and LOS. Seeker can open doors. Minimap shows map layout. Sonar ping reveals seeker position periodically. Tactical gameplay emerges.

### Phase 5a: AI Depth (NEW — split from original Phase 5)

**Goal:** Intelligent AI with personality across 3 difficulty tiers.

**Tasks:**
- [ ] `src/game/ai/seeker.ts` — Full FSM expansion:
  - PATROL: wander/patrol (Easy=random, Medium=systematic, Hard=strategic)
  - SUSPICIOUS: investigate stimulus (door change sound, nearby movement)
  - SEARCH: focused search around last-known-position or evidence location
  - CHASE: direct pursuit to hider (triggered by LOS + within vision range)
  - Transitions with configurable delays (Easy=slow reactions, Hard=fast)
- [ ] **Strategy pattern decomposition**: `seeker-easy.ts`, `seeker-medium.ts`, `seeker-hard.ts` behind `SeekerBehavior` interface
- [ ] Medium AI — Systematic searcher:
  - Track rooms as cleared/uncleared (visited within last N seconds = cleared)
  - Always path to nearest uncleared room
  - Clear room = walk to center, rotate view, mark cleared
  - Predictable but thorough — player can learn pattern
- [ ] Hard AI — Evidence-based hunter:
  - Track door state deltas (compare current vs initial — changed = evidence)
  - Last-known-position: remember where hider was last seen, expand search radius over time
  - "Director" system: zone-level hints after 30s failed search, menace gauge forces PATROL after 20s chase
  - Check likely hiding spots first (corners, behind furniture, dead ends)
  - Fast reaction time, wide vision range, long memory
- [ ] AI personality parameters per tier (typed as `SeekerConfig`):

  | Parameter | Easy | Medium | Hard |
  |-----------|------|--------|------|
  | Vision range | 4 tiles | 6 tiles | 8 tiles |
  | Reaction delay | 1.5s | 0.75s | 0.25s |
  | Memory duration | 3s | 8s | 20s |
  | Search radius | 3 tiles | 5 tiles | 8 tiles |
  | Search thoroughness | check 1-2 spots | clear full room | clear room + adjacent |
  | Detection miss rate | 20% | 10% | 5% |

- [ ] Path smoothing for all AI movement (string-pulling, smooth lerp between waypoints)
- [ ] **Near miss design**: tune parameters so seeker occasionally walks past hider. Periodic scatter/rest prevents constant pressure.
- [ ] Unit tests: FSM state transitions, medium clearing logic, hard evidence tracking, action queue

**Success criteria:** Medium seeker methodically clears rooms. Hard seeker uses evidence and director hints. Near misses happen regularly. Each difficulty feels distinct.

### Phase 5b: AI Hider + Spectator (NEW — split from original Phase 5)

**Goal:** AI-vs-AI spectator mode with intelligent hider.

**Tasks:**
- [ ] `src/game/ai/hider.ts` — AI hider:
  - Easy: pick random walkable tile at start, sit there
  - Medium: evaluate hiding spots (score by: distance from seeker spawn, LOS blockers, escape routes). Pick best, sit.
  - Hard: reposition when seeker approaches (uses own FOV). Close doors strategically. Move to new hiding spot when current one compromised.
- [ ] AI-vs-AI spectator mode:
  - God-view camera: show entire map, no fog of war
  - Render both agents' vision cones (semi-transparent colored arcs)
  - Show both agents' current FSM state labels above their sprites
  - Show pathfinding paths as debug lines (optional toggle)
  - Seeker difficulty + hider difficulty independently configurable
  - **Pause/resume** (Escape works in spectator mode)
  - **End-of-round flow**: same found/survived moment, simplified Results with "Watch Again" / "Main Menu"
  - **Audio**: no heartbeat (no player perspective), both agents' footsteps audible
- [ ] MainMenu: enable "AI vs AI" button, difficulty selection for each agent
- [ ] **Settings validation** (NEW): difficulty dropdowns for seeker + hider
- [ ] Unit tests: AI hider spot evaluation, repositioning logic

**Success criteria:** AI hider picks smart spots and repositions. AI-vs-AI spectator shows both agents' thinking. Spectator has pause, end-of-round, and restart flow.

### Phase 6: Sound + Scoring

**Goal:** Complete Tier 3 — polished game with audio atmosphere and progression tracking.

**Tasks:**
- [ ] Phaser Sound Manager setup:
  - Web Audio API preferred (Phaser handles fallback)
  - Volume controls in settings menu (master, SFX, ambient channels)
  - Mute toggle
  - Audio context resume on first user interaction (Boot scene "Click to Start" gate)
  - **AudioContext suspend/resume on tab visibility change** (NEW)
- [ ] Sound effects:
  - Player footsteps (triggered by movement, paced by speed, **sound pool of 2-3 instances**)
  - Seeker footsteps (only audible within hearing range — **PannerNode with distanceModel:'inverse', maxDistance:300px**)
  - Door open/close creak (pitch/rate variation for naturalism)
  - Countdown tick (final 3 seconds: louder ticks)
  - Hunt phase start sound (ominous tone)
  - "Found" sting (dramatic hit)
  - "Survived" sting (triumphant chord)
  - UI sounds (menu clicks, transitions)
- [ ] Heartbeat proximity warning:
  - Starts when seeker is within HEARTBEAT_START_RANGE (2x proximity threshold)
  - **OscillatorNode created ONCE + GainNode for on/off** (OscillatorNode.start() can only be called ONCE)
  - Tempo increases linearly as distance decreases (60 BPM → 180 BPM)
  - Volume increases as distance decreases (via `setTargetAtTime()` for smooth transitions)
  - Directional stereo panning (seeker left = heartbeat pans left) — stretch goal
  - **Audio paused: instant mute all during pause, no sound**
- [ ] Ambient indoor sounds:
  - Subtle background hum (looping, 0.2 volume)
  - Random creaks (3-8 second intervals, NOT player-caused)
  - **Layer separation with BiquadFilter**: hum 40-200Hz, creaks 200-2000Hz, ticks 2000-5000Hz (prevents muddy audio)
- [ ] `src/game/state.ts` — ScoreState:
  - Time survived (seconds)
  - Distance traveled (pixels → converted to tiles for display)
  - Close calls (**debounced**: enter/exit zone event, not per-tick check)
  - Closest approach (minimum distance to seeker during hunt)
  - Doors interacted with
  - Win/loss result (type derived from GamePhase: `Extract<GamePhase, 'FOUND' | 'SURVIVED'>`)
- [ ] Scoring system:
  - Track stats during gameplay in game state
  - Calculate score: base points for surviving + bonus for close calls + time bonus
  - Display on Results screen with breakdown
- [ ] Stats persistence (localStorage):
  - **Runtime type guard**: `isValidStats(data: unknown): data is StatsSchema`
  - **All operations in try/catch**: handle corrupt data, quota exceeded, disabled storage
  - **Clamp all numeric values to reasonable bounds** (totalGames >= 0, wins <= totalGames)
  - Total games played, win/loss record per difficulty, best survival time
  - Settings persistence (last-used difficulty, time limit, etc.)
  - **"Reset to defaults" button** in settings (NEW)
- [ ] Results screen enhancement:
  - Full stat breakdown
  - Personal best indicators
  - Win streak tracking (**definition**: changing difficulty breaks streak, quitting breaks streak)
- [ ] **Settings validation** (NEW): min/max constraints for all values:
  - Countdown: 3-30 seconds
  - Hunt time limit: 30-300 seconds
  - Sonar interval: 2-15 seconds
  - Slider/stepper UI, not free-text input
- [ ] Sound settings in menu: master volume, SFX volume, ambient volume, mute all
- [ ] Unit tests: score calculation, stat tracking, localStorage type validation
- [ ] **SFX sourcing**: jsfxr (sfxr.me) for procedural retro effects, freesound.org for ambient

**Success criteria:** Audio creates real tension (heartbeat when seeker is close, footstep audio cues). Scoring gives reason to replay. Stats persist across sessions. Sound settings work. localStorage handles corrupt data gracefully.

### Phase 7: Art Pipeline

**Goal:** Replace all placeholder art with AI-generated stylized cartoon assets.

**Tasks:**
- [ ] Art style guide document:
  - Style: stylized cartoon, clean black outlines (2-3px at 256px), bold colors, slightly exaggerated proportions
  - Palette: warm indoor colors (wood brown #8B4513, carpet red #C41E3A, cream wall #F5E6D3), cool accents (sonar blue #0047AB, alert red #FF2400), outline black #000000
  - Perspective: strict top-down
  - Tile size: 32x32 pixels (generate at 256x256, downscale with nearest-neighbor)
  - Character size: 32x32 (fits one tile)
  - Prompt template for consistency across all generations
- [ ] **Consider Nano Banana Pro** (gemini-3.1-flash-image-preview) over Imagen 4 for batch generation:
  - Accepts up to 14 reference images per request for style transfer
  - Generate 1-2 hero assets first, use as style reference for all subsequent generations
  - 50% batch discount vs Imagen 4 (cost-effective for 100+ assets)
- [ ] Asset generation script (`scripts/generate-assets.ts`):
  - Load API key from .env (`set -a && source .env && set +a`)
  - **API key variable: `GEMINI_API_KEY`, NOT `VITE_GEMINI_API_KEY`** (Vite auto-exposes VITE_ prefix to client)
  - **Build verification**: `grep -r "GEMINI" dist/` must return 0 matches
  - Batch generation with delays (rate limit safety)
  - Save to `public/assets/` with descriptive filenames
  - **Idempotent**: hash-based registry, skip assets that already exist and match hash
  - **Post-processing**: nearest-neighbor downscale 256→32, background removal, color palette normalization
- [ ] Tileset generation:
  - Floor tiles: wood planks, carpet, kitchen tile, bathroom tile (4+ variants)
  - Wall tiles: interior walls, exterior walls, corners, T-junctions
  - Door tiles: open state, closed state
  - Furniture: couch (2x1), table (2x2), bookshelf (1x2), chair (1x1), bed (2x2), desk (2x1)
  - Decorative: rug, lamp, plant, picture frame
  - **Seamless tiling**: test in 2x2 grids, use prompt constraints for edge matching
- [ ] Character sprites:
  - Hider: 4 directional frames (N/S/E/W), idle + walking animation (2-frame minimum)
  - Seeker: 4 directional frames, idle + walking + chase animation, visually distinct (maybe flashlight, cap)
  - AI hider variant (different color/outfit)
  - **Generate full sprite sheet, then slice** (more consistent than individual generation)
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
  - **Tools**: I Love Sprites (free web), Free Texture Packer (open-source CLI)
- [ ] Integration:
  - Update Preloader to load new assets
  - Update all sprite references
  - Update Tiled tileset reference
  - Verify all visuals at 2x and 3x scale
- [ ] Visual polish pass:
  - Consistent lighting direction across all assets
  - Color coherence check (all assets use 7-color palette)
  - Readability at game zoom level
  - Playwright screenshot regression tests

**Success criteria:** All placeholder art replaced. Consistent stylized cartoon look. Assets readable at all zoom levels. Game looks polished and professional. No API keys in build output.

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
| `Set<string>` for FOV results | Creates 60 allocations/sec, steady GC pressure causing micro-stutters. Pre-allocated `Uint8Array` is zero-allocation. (NEW) |
| Phaser EventEmitter for game→renderer | Untyped — string event names + `any` payloads. Custom `TypedEmitter<GameEventMap>` enforces type safety. (NEW) |
| Shallow `Readonly<T>` for state access | Doesn't protect nested objects/arrays. `ReadonlyDeep<T>` recursively freezes the entire state tree. (NEW) |

## System-Wide Impact

### Interaction Graph

**Detection event chain:**
```
GameEngine.fixedUpdate() → moveSeeker() → computeFOV(Uint8Array) → checkDetection()
  → if detected: GameState.phase = FOUND
  → GameEngine emits DETECTION_OCCURRED event (typed)
  → FogRenderer reveals seeker position
  → EndOfRoundSequence(foundConfig) → camera zoom+flash → "FOUND!" splash
  → After animation → scene.start('Results', stats)
```

**Door toggle chain:**
```
InputManager.interact → game.doors.toggleDoor(id)
  → door.isOpen flips
  → GameEngine emits DOOR_TOGGLED event (typed, includes doorId + isOpen)
  → LOS: isBlocking() return value changes (shadowcasting affected next tick)
  → Pathfinding: avoidAdditionalPoint/stopAvoidingAdditionalPoint → cancel stale paths (via instanceId), recalculate
  → Hard AI: door delta recorded as evidence
  → DoorSprite: swaps frame (subscribes to DOOR_TOGGLED event)
  → Sound: door creak plays (subscribes to DOOR_TOGGLED event)
```

**Sonar ping chain:**
```
GameEngine.fixedUpdate() → sonar timer expires → GameState.sonarPingDue = true
  → GameEngine emits SONAR_PING_DUE event (typed, includes seekerPosition)
  → SonarPing: expanding ring tween spawned (Sine.easeOut, 1.5s)
  → MinimapRenderer: seeker blip appears at position, holds 2s, fades
  → Player sees blip → makes strategic decision
```

**Tab visibility change chain (NEW):**
```
document.visibilitychange → tab hidden
  → GameEngine.pause() → fixedUpdate stops, timers frozen
  → AudioContext.suspend()
  → On tab return: GameEngine.resume(), AudioContext.resume()
  → Accumulator capped at MAX_CATCHUP_TICKS * FIXED_STEP
```

**First user interaction chain (NEW):**
```
Boot scene: "Click to Start" button
  → User clicks → this.sound.unlock() / AudioContext.resume()
  → Audio context state: running
  → Proceed to Preloader → MainMenu
```

### Error Propagation
- Game logic errors stay in game/: a bad pathfinding result produces wrong movement, never crashes the renderer
- Renderer errors stay in renderer/: a failed tween or missing sprite doesn't corrupt game state
- Fixed timestep prevents timing-related desync between game logic and rendering
- **Typed event system prevents missed transitions** — push-based, not polling (NEW)
- **localStorage errors caught by try/catch** — corrupt data triggers reset to defaults, never crashes (NEW)

### State Lifecycle Risks
- Door toggle is atomic (single boolean flip) — no partial state risk
- Pathfinding is async but cancellable — door change cancels pending path (via instanceId), requests new one
- Fog state array updated in-place each frame — no orphaned state
- Scene transitions use Phaser's built-in lifecycle — `scene.start()` properly destroys previous scene
- **"Play Again" uses `createGameState()` factory** — prevents stale references to old state (NEW)

### Integration Test Scenarios
1. Player closes door → seeker was pathing through that tile → seeker recalculates and finds alternate route
2. Sonar ping fires during "found" animation → ping should be suppressed (game is in FOUND state, not HUNT)
3. Player stands on door tile and toggles → player shouldn't get stuck inside wall geometry
4. Countdown expires while player is mid-movement → hunt phase starts cleanly, fog activates without visual glitch
5. Seeker acquires LOS through an open door → player closes door → seeker loses LOS → seeker transitions to SEARCH at last-known-position
6. **Tab backgrounded during hunt → auto-pause → resume → game state consistent, no accumulated ticks** (NEW)
7. **Controller-only player navigates menu → starts game → pauses → quits to menu** (NEW)
8. **Player walks to stationary seeker during countdown → no detection triggered** (NEW)
9. **localStorage is corrupt → game loads with default stats, no crash** (NEW)

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
- [ ] All placeholder art replaced with AI-generated assets
- [ ] All configurable parameters adjustable via settings menu
- [ ] **Game auto-pauses on tab visibility change** (NEW)
- [ ] **Audio unlocks on first user interaction** (NEW)
- [ ] **Reduced-motion toggle disables camera flash** (NEW)
- [ ] **Controller navigates all menus** (NEW)
- [ ] **Settings have min/max validation** (NEW)

### Non-Functional Requirements
- [ ] 60fps on modern browsers (Chrome, Firefox, Edge)
- [ ] Fixed timestep ensures consistent gameplay across framerates
- [ ] Game logic has zero Phaser dependencies (architecture boundary)
- [ ] Game state interfaces use `ReadonlyDeep<>` to prevent renderer mutation
- [ ] **FOV uses pre-allocated Uint8Array (zero per-frame allocations)** (NEW)
- [ ] **.gitignore excludes .env and build artifacts** (NEW)
- [ ] **No source maps in production build** (NEW)
- [ ] **No API keys in dist/ output** (NEW)

### Quality Gates
- [ ] Unit test coverage for all game logic (LOS, detection, pathfinding, AI FSM, timers)
- [ ] Playwright visual tests for fog states, found/survived moments, sonar ping
- [ ] Architecture boundary grep test passes in CI
- [ ] TypeScript strict mode — zero `any` types, zero `@ts-ignore`
- [ ] All configurable values in constants.ts (no magic numbers in code)
- [ ] **pnpm audit passes (no known vulnerabilities)** (NEW)
- [ ] **Typed event system — zero `any` in event payloads** (NEW)
- [ ] **localStorage operations wrapped in try/catch with type validation** (NEW)
- [ ] **CSP meta tag present in index.html** (NEW)
- [ ] **Build verification: no API keys in dist/** (NEW)

## Success Metrics

- **Tier 1 complete:** Playable hide-and-seek with fog of war (Phases 0-3)
- **Tier 2 complete:** Tactical gameplay with doors and sonar minimap (Phase 4)
- **Tier 3 complete:** Deep AI, spectator mode, sound, scoring (Phases 5a-6)
- **Visual upgrade:** Placeholder art replaced with AI-generated assets (Phase 7)
- **"Near miss" rate:** Hard AI creates at least 1-2 near-miss moments per round (tuning target)
- **Replay motivation:** Scoring + stats give reason to play again on higher difficulty

## Dependencies & Prerequisites

| Dependency | Phase | Risk |
|------------|-------|------|
| Phaser 3.90.0 | 0 | Low — stable, latest v3 |
| EasyStar.js | 2 | Low — established library, async A* |
| Tiled editor | 1 | Low — industry standard, free |
| Gemini Imagen 4 / Nano Banana Pro API | 7 | Medium — API key required, generation consistency |
| Playwright | 3+ | Low — for visual tests |

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Shadowcasting implementation bugs | High — unfair detection | Medium | Exhaustive unit tests for symmetry, corners, doorways. Albert Ford's algorithm is well-documented. Use rational numbers, not floats. |
| Phaser 3 end-of-life (v4 takeover) | Low — game logic is independent | Low | v3.90 works. Renderer is swappable. |
| EasyStar.js async timing issues | Medium — stale paths | Low | Cancel+recalculate on world changes. Timestamp-validate paths. Use instanceId from findPath(). |
| Fog of war performance (many tiles) | Medium — frame drops | Low | Dirty flag optimization. Only update changed tiles. Uint8Array for FOV. Profile early. |
| Imagen 4 style inconsistency | Medium — visual incoherence | Medium | Strict prompt template. Reference images (Nano Banana Pro accepts 14). Manual review pass. |
| AI feels unfair or broken | High — bad gameplay | Medium | Extensive playtesting per tier. Tune parameters. Near miss design. Detection miss rate per tier. Director with menace gauge. |
| Context rot during long phases | Medium — quality degradation | High | Fresh context window per phase. Split Phase 5 into 5a/5b. Target <50% utilization. |
| **Tab backgrounding spikes accumulator** | **High — freeze/teleport** | **High** | **visibilitychange auto-pause + MAX_CATCHUP_TICKS=5 cap** (NEW) |
| **Camera flash photosensitivity** | **High — seizure risk** | **Medium** | **Reduced-motion toggle, softer flash intensity, shorter duration** (NEW) |
| **.gitignore missing (API key leak)** | **Critical — credential exposure** | **High** | **Create .gitignore in Phase 0 before any .env file exists** (NEW) |
| **Renderer polling misses state transitions** | **Medium — ghost bugs** | **Medium** | **Push-based typed event system replaces polling** (NEW) |
| **Phase 5 too large for context window** | **Medium — quality degradation** | **High** | **Split into 5a (seeker tiers) and 5b (hider AI + spectator)** (NEW) |
| **Set\<string\> FOV GC pressure** | **Medium — micro-stutters** | **High** | **Pre-allocated Uint8Array, reused every tick** (NEW) |

## Future Considerations (Tier 4+)

- Movable furniture (push to block doorways)
- Fort building / barricading rooms
- Multiple themed maps (mansion, office, warehouse)
- Procedural map generation
- Godot port (3D renderer, same game logic)
- Replay recording system (game state, not pixels)
- Online multiplayer (human seeker vs human hider) — typed event system is the wire point
- Mobile touch controls
- Key rebinding (accessibility improvement)
- Colorblind mode (pattern overlays on fog states)
- Speed control for spectator mode

## Documentation Plan

- [ ] CLAUDE.md — project conventions, architecture rules, commands, no-enum convention, import type convention
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
- [Phaser Scene Cross-Scene Communication](https://docs.phaser.io/phaser/concepts/scenes/cross-scene-communication)
- [Phaser Gamepad Module](https://docs.phaser.io/api-documentation/class/input-gamepad-gamepad)
- [Phaser Tilemap API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)
- [Phaser Tween System](https://docs.phaser.io/phaser/concepts/tweens)
- [Phaser Audio Concepts](https://docs.phaser.io/phaser/concepts/audio)
- [Modular Game Worlds in Phaser 3 — Michael Hadley](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)
- [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Ourcade: Tiled Tilemaps in Phaser 3](https://blog.ourcade.co/posts/2020/phaser-3-noob-guide-loading-tiled-tilemaps/)

### External References — Algorithms
- [Symmetric Shadowcasting — Albert Ford](https://www.albertford.com/shadowcasting/)
- [Comparative Study of FOV Algorithms — RogueBasin](https://www.roguebasin.com/index.php/Comparative_study_of_field_of_view_algorithms_for_2D_grid_based_worlds)
- [2D Visibility — Red Blob Games](https://www.redblobgames.com/articles/visibility/)
- [A* Implementation — Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/implementation.html)
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)
- [Shadow Casting FOV in Phaser JS — EvolvingDeveloper](https://evolvingdeveloper.com/shadow-casting-fov-phaser-js/)
- [MRPAS FOV with Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser3-mrpas-fov-field-of-view-algorithm-roguelike-dungeon-crawler/)
- [Simple Fog of War for Phaser 3 — Ourcade](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)
- [Dirty Flag Pattern — Game Programming Patterns](https://gameprogrammingpatterns.com/dirty-flag.html)
- [State Pattern — Game Programming Patterns](https://gameprogrammingpatterns.com/state.html)
- [Command Pattern — Game Programming Patterns](https://gameprogrammingpatterns.com/command.html)

### External References — Game Design
- [Understanding Pac-Man Ghost Behavior — GameInternals](https://gameinternals.com/understanding-pac-man-ghost-behavior)
- [Hotline Miami AI Analysis — Rodrigo Fernandez Diaz](https://medium.com/@RodFernandez91/an-analysis-of-hotline-miami-ai-23c37dbcb156)
- [The Perfect Organism: AI of Alien: Isolation — Game Developer](https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation)
- [Revisiting Alien: Isolation AI — AI and Games](https://www.aiandgames.com/p/revisiting-alien-isolation)
- [Stealth Game Spatial Strategies — Enrico Ottonello](https://www.artstation.com/artwork/28lPBY)
- [Cover — The Level Design Book](https://book.leveldesignbook.com/process/combat/cover)
- [Prospect-Refuge Theory — The Level Design Book](https://book.leveldesignbook.com/process/blockout/massing/prospect-refuge)
- [The Anatomy of a Stealth Encounter — Gamedeveloper](https://www.gamedeveloper.com/design/the-anatomy-of-a-stealth-encounter)
- [Bloodhound Sonar — Apex Legends Wiki](https://apexlegends.fandom.com/wiki/Bloodhound)
- [Dynamic Patrol Behavior in Stealth Games](https://leanrada.com/notes/dynamic-patrol-stealth-games/)

### External References — Audio
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio Spatialization — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics)
- [OscillatorNode — MDN](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [PannerNode — MDN](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode)
- [Web Audio Best Practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [JSFXR Retro SFX Generator](https://sfxr.me/)

### External References — Sonar/Ping UI
- [CSS Radar Sweep Animation](https://css-zone.com/animation/radar)
- [Sonar Ping CodePen — omercetin](https://codepen.io/omercetin/pen/GoeWwq)

### External References — Art Pipeline
- [Gemini API Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Imagen 4 Models](https://ai.google.dev/gemini-api/docs/models/imagen)
- [Nano Banana Pro Asset Generation Guide](https://help.apiyi.com/nano-banana-pro-game-assets-generation-en.html)
- [I Love Sprites Atlas Tool](https://ilovesprites.com/)
- [Free Texture Packer](https://www.codeandweb.com/free-sprite-sheet-packer)
- [Pipoya Free RPG Tileset 32x32](https://pipoya.itch.io/pipoya-rpg-tileset-32x32)
- [Modern Interiors by LimeZu](https://limezu.itch.io/moderninteriors)

### External References — Testing
- [Vitest Documentation](https://vitest.dev)
- [Playwright Visual Testing](https://playwright.dev/docs/test-snapshots)

### External References — Input
- [Using the Gamepad API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- [Phaser Merged Input Plugin](https://github.com/GaryStanton/phaser3-merged-input)
