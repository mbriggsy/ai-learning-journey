---
title: "Phase 3: Fog of War + Game Flow"
type: feat
status: deepened
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
agents: 13
contradictions_resolved: 13
---

# Phase 3: Fog of War + Game Flow

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 13 (fog-of-war, scene-management, camera-effects, architecture, performance, TypeScript, race-conditions, spec-flow, pattern-recognition, code-simplicity, Playwright-testing, HUD/UI, codebase-exploration)
**Context7 queries:** 3 (Phaser scenes API, camera effects API, tilemap/tile API)
**Contradictions resolved:** 13 (11 Phase 3 vs master plan + 2 additional)
**Simplifications evaluated:** 6 (3 accepted, 1 partially accepted, 2 rejected with justification)

### Key Improvements
1. **Dedicated fog overlay layer** — separate black-tile TilemapLayer with per-tile alpha, manual lerp transitions, distance-based vignette (not terrain tinting)
2. **PauseAuthority system** — reason-tracked pause prevents tab-visibility, PauseMenu, and cinematic from fighting (~20 LOC)
3. **EndOfRoundSequence as polling state machine** — SequenceStep[] data-driven, timeout safety per step, reduced-motion support, no softlocks (~40 LOC)
4. **Dual-camera CinematicManager** — UI camera at zoom=1 for splash text, main camera for game effects. Solves setScrollFactor zoom scaling problem
5. **13 new landmines documented** — stopFollow before pan, wake() doesn't call init, setTint is WebGL-only, and 10 more
6. **TestBridge architecture** — window.__GAME_TEST__ for Playwright integration testing with typed interface

### Contradictions Resolved

| # | Contradiction | Resolution |
|---|--------------|------------|
| 1 | Boot.ts "minimal" vs master plan "Click to Start gate" | INCLUDE gate — prevents Phase 6 audio retrofit |
| 2 | Missing loaderror handler | INCLUDE — show error + retry button |
| 3 | Controller nav only for pause vs all menus | INCLUDE for all interactive scenes |
| 4 | Missing fog reveal animation (150ms tween) | INCLUDE as manual lerp (lerpFactor=0.12, zero GC) |
| 5 | COUNTDOWN→HUNT instant vs camera fade | USE camera fade — 200ms out, reset fog, 300ms in |
| 6 | Fog: terrain tinting vs overlay layer | USE dedicated overlay layer (cleaner, no terrain modification) |
| 7 | Missing onboarding text | DEFER — not essential for Tier 1, game is intuitive |
| 8 | Missing reduced-motion toggle | INCLUDE — camera flash is photosensitivity hazard |
| 9 | Settings in PauseMenu | DEFER — no audio in Phase 3, nothing to control |
| 10 | Missing SceneTransition utility | INCLUDE — used 4+ times, type-safe via SceneDataMap |
| 11 | Missing EndOfRoundSequence utility | INCLUDE as polling state machine with timeout safety |
| 12 | FogRenderer computes FOV (boundary violation) | FIX — FogRenderer READS GameState.visibleTiles only |
| 13 | zoomTo(1.5) for Survived (jitter with roundPixels) | FIX — use zoomTo(2) for both, differentiate via color+text |

### Simplification Decisions

| Proposal | Decision | Rationale |
|----------|----------|-----------|
| Merge Boot + Preloader | **ACCEPT** | One scene handles: background → Click to Start → load assets → progress → MainMenu |
| Eliminate HUD parallel scene | **REJECT** | setScrollFactor(0) does NOT prevent zoom scaling during cinematics. Dual-camera or parallel scene required. Phase 2 explicitly planned this migration. |
| Remove renderer-side fog dirty flag | **ACCEPT** | Manual lerp IS the dirty check — tiles converge in ~3 frames. Game-layer FOV dirty flag KEPT (separate concern). |
| Simplify Found/Survived to 3 steps | **REJECT** | Full sequences are just array entries with data-driven approach. Dramatic moments ARE the game. Polling state machine handles reliability. |
| Remove Settings UI | **ACCEPT** | No player has played. Defaults in code. Tune via constants. Add settings UI later. |
| Remove AI vs AI button | **ACCEPT** | Dead UI element. Add in Phase 5 when functional. |

## Goal

Complete Tier 1 — fully playable, polished hide-and-seek with scene management, fog of war, and dramatic found/survived moments.

## Context

With the core game loop working (Phase 2), this phase adds the visual tension layer: fog of war, scene management (menu → game → results), and the dramatic end-of-round moments. After this phase, the game is a complete, playable product.

**Scene flow:** Boot → MainMenu → Game + HUD (parallel) → PauseMenu (overlay) → Results

**6 scenes** (down from 7 — merged Boot+Preloader):

| Scene | Type | Purpose |
|-------|------|---------|
| Boot | Sequential | Background → Click to Start → Load assets → progress bar → MainMenu |
| MainMenu | Sequential | Title + Play button with keyboard/gamepad nav |
| Game | Main | Gameplay + renderer systems (FogRenderer, CinematicManager) |
| HUD | Parallel | Timer display, phase indicator (launched from Game) |
| PauseMenu | Overlay | Resume / Quit to Menu (launched from Game) |
| Results | Sequential | Outcome + stats + Play Again / Main Menu |

### Key Technical Decisions

- **Fog rendering:** Dedicated black-tile TilemapLayer overlay at depth 100. Per-tile alpha controls visibility (1.0=UNEXPLORED, 0.6=EXPLORED, 0.0=VISIBLE). Manual lerp transitions (lerpFactor=0.12, ~200ms at 60fps). Distance-based alpha falloff within FOV for natural vignette. NOT multiply blend mode. NOT terrain tinting.
- **Player FOV:** 360° circle using same shadowcasting from Phase 2. Computed in game layer fixedUpdate(), stored in GameState.visibleTiles (Uint8Array). FogRenderer READS this — never computes FOV directly. Range 5-7 tiles (configurable).
- **Fog states:** UNEXPLORED (alpha 1.0), EXPLORED (alpha 0.55-0.65), VISIBLE (alpha 0.0 with distance falloff) — standard RTS pattern. 3 states KEPT (cheap to implement, essential for gameplay — explored areas let player navigate by memory).
- **Camera effects:** Promise-wrapped async sequencing via CinematicManager. Dual-camera (UI camera at zoom=1 for splash text). All effects use force:true and Phaser event constants.
- **Pause system:** PauseAuthority with reason tracking (MENU, TAB_HIDDEN, CINEMATIC). Game only resumes when ALL reasons cleared.
- **Scene transitions:** SceneTransition utility with camera fade, type-safe via SceneDataMap, input locked during transition.
- **End-of-round:** EndOfRoundSequence as polling state machine with SequenceStep[] discriminated union, timeout safety per step, reduced-motion support.
- **HUD communication:** TypedEmitter<GameEventMap> (NOT Phaser scene events). HUD pulls initial state on create, subscribes for transition events only. Reads timer from GameState each frame via getState().
- **Testing:** TestBridge (dev-only) exposes game state to Playwright via window.__GAME_TEST__.

### Critical Warnings

1. **NEVER use `multiply` blend mode for fog.** WebGL multiply on transparent pixels produces black. Per-tile alpha on overlay layer only. Documented in top-down-racer-04 as high-severity rendering bug.
2. **NEVER use `setTimeout`/`setInterval` in game code.** Always use `scene.time.delayedCall()` which respects scene sleep/pause. setTimeout runs on browser event loop, ignores scene lifecycle.
3. **FogRenderer must NEVER import from `src/game/` or call computeFOV().** It reads GameState.visibleTiles via ReadonlyDeep. Sacred engine/renderer boundary.

## Tasks

### Scene Management

- [ ] `src/renderer/scenes/Boot.ts` — Merged Boot + Preloader:
  - Set background color (dark)
  - "Click to Start" button (unlocks audio context for Phase 6)
  - On click: `this.load.start()` with all game assets
  - Progress bar (simple rectangle fill during load)
  - `this.load.on('loaderror', ...)` handler — show failed asset name + retry button
  - Load BitmapFont atlas for HUD text (generated from TTF via snowb.org)
  - On complete: SceneTransition fadeOut → start MainMenu
  - Verify `game.renderer.type === Phaser.WEBGL` — if Canvas, show unsupported browser message (setTint is WebGL-only)
  - Read `prefers-reduced-motion` media query, store in GameSettings.reducedMotion

- [ ] `src/renderer/scenes/MainMenu.ts` — Title screen:
  - Game title (BitmapText, large, centered)
  - "Play" button only (no Settings, no AI vs AI for Phase 3)
  - TextButton with keyboard nav (arrow up/down) + gamepad nav (D-pad, A confirm)
  - `Phaser.Input.Keyboard.JustDown()` for edge detection (not isDown)
  - SceneTransition: camera fadeOut → start Game with default GameSettings → fadeIn
  - Camera fadeIn(500) at end of create() (receiving scene handles its own fadeIn)

- [ ] `src/renderer/scenes/Game.ts` — Main gameplay scene:
  - Composition root for renderer systems — delegate to setup helpers in create() (avoid 500-line method):
    - `setupTilemap()`, `setupEntities()`, `setupFog()`, `setupCinematic()`, `setupInput()`
  - Create FogRenderer, CinematicManager, PauseAuthority
  - Launch HUD: `this.scene.launch('HUD', { listener, getState })` with typed HUDSceneData
  - Read gameFlow.kind from GameState each frame:
    - `'countdown'`: player moves, seeker visible, fog all-transparent (playerFov filled with 1s by game layer)
    - `'hunt'`: full gameplay with fog, seeker visibility tied to fogRenderer.isTileVisible()
    - `'found'`: trigger EndOfRoundSequence.playFound() — game logic frozen (terminal state)
    - `'survived'`: trigger EndOfRoundSequence.playSurvived() — game logic frozen (terminal state)
  - Seeker sprite visibility: `seekerSprite.setVisible(fogRenderer.isTileVisible(seekerTileX, seekerTileY))` — NOT inside FogRenderer (SRP)
  - COUNTDOWN→HUNT transition handler (on PHASE_CHANGED event):
    1. Camera fadeOut(200ms)
    2. On camerafadeoutcomplete: fogRenderer.transitionToHunt() (reset all tiles to UNEXPLORED)
    3. Camera fadeIn(300ms) — player sees fog of war with FOV circle already applied
  - Escape key handler:
    - Check `pauseAuthority.isPaused` — if true, ignore (cinematic or already paused)
    - Check `SceneTransition.isTransitioning` — if true, ignore
    - Use `JustDown(escapeKey)` for edge detection
    - Guard: `if (this.scene.isActive('PauseMenu')) return` (prevent double-launch)
    - `pauseAuthority.request(PAUSE_REASONS.MENU)`
    - `this.scene.sleep('Game')` + `this.scene.sleep('HUD')`
    - `this.scene.launch('PauseMenu')` + `this.scene.bringToTop('PauseMenu')`
  - Shutdown handler (`this.events.on('shutdown', ...)`):
    - `this.scene.stop('HUD')` — stop parallel scene
    - `fogRenderer.destroy()`
    - `cinematicManager.destroy()`
    - Remove all TypedEmitter listeners via `.off()` with named functions
    - GameEngine.dispose() — cancels EasyStar paths, sets disposed flag, emitter.offAll()
    - Remove DOM event listeners (visibilitychange)

- [ ] `src/renderer/scenes/HUD.ts` — Parallel scene overlay:
  - Receives HUDSceneData via init(data): `{ listener: TypedListener<GameEventMap>, getState: () => ReadonlyDeep<PlayingState> }`
  - Camera at (0,0), never moves, zoom=1 — screen-space, not world-space
  - BitmapText for timer display (top-right, right-aligned) — NOT Phaser Text (avoids texture re-upload on setText)
  - BitmapText for phase indicator (top-center)
  - PULL initial state on create: `const state = getState(); this.updateTimer(state.gameFlow.ticksRemaining); this.updatePhase(state.gameFlow.kind)`
  - Subscribe to listener for PHASE_CHANGED events (one-shot transitions)
  - Read timer from getState() each frame in update() — NOT via events (continuous value)
  - Timer formatting: `Math.ceil()` (shows "00:00" only when time is actually up)
  - Timer warning state machine:
    - NORMAL (white) → WARNING <30s (amber 0xffcc00, scale pulse tween) → CRITICAL <10s (red 0xff3333, alpha blink tween)
  - Phase transition animation: scale down (Back.easeIn 200ms) → swap text+tint → scale up (Back.easeOut 300ms)
  - Sleeps alongside Game on pause, stops when Game stops
  - Shutdown handler: remove TypedEmitter listeners via .off()

- [ ] `src/renderer/scenes/PauseMenu.ts` — Pause overlay:
  - Launched (not started) as overlay — `create()` runs fresh each time
  - Use `stop()` when done, not `sleep()` — no state worth preserving
  - Semi-transparent black background rectangle (alpha 0.7)
  - "PAUSED" title (BitmapText, large, centered)
  - Buttons (TextButton with keyboard/gamepad nav):
    - "Resume" → `pauseAuthority.release(PAUSE_REASONS.MENU)` → `scene.wake('Game')` + `scene.wake('HUD')` → `scene.stop('PauseMenu')`
    - "Quit to Menu" → `scene.stop('Game')` + `scene.stop('HUD')` → SceneTransition to MainMenu
  - Escape key also triggers Resume (same as Resume button)
  - `bringToTop('PauseMenu')` after launch to guarantee z-ordering

- [ ] `src/renderer/scenes/Results.ts` — End-of-round screen:
  - Receives ResultsSceneData via init(data): `{ outcome: 'found' | 'survived', timeSurvivedMs: number, distanceTraveled: number }`
  - Outcome text: "FOUND!" (red) or "SURVIVED!" (gold) — large BitmapText, centered
  - Stats display: time survived (formatted MM:SS), distance traveled (in tiles)
  - Buttons (TextButton with keyboard/gamepad nav):
    - "Play Again" → SceneTransition to Game (same GameSettings)
    - "Main Menu" → SceneTransition to MainMenu
  - Camera fadeIn(500) at end of create()

### Fog of War

- [ ] `src/renderer/systems/FogRenderer.ts` — Fog of war system:
  - **Overlay layer setup:**
    - Create blank TilemapLayer same dimensions as game map
    - Fill with solid black tile (single 32x32 black tile in tileset)
    - `setDepth(100)` — renders above all game objects
    - Register with CinematicManager: `cinematicManager.ignoreOnUI(fogLayer)`
  - **Pre-allocation (zero runtime allocation):**
    - `fogState: Uint8Array(width * height)` — per-tile state (0=UNEXPLORED, 1=EXPLORED, 2=VISIBLE)
    - `alphaTarget: Float32Array(width * height)` — lerp targets, initialized to 1.0
    - `fogTiles: Tile[]` — cached tile references (avoid getTileAt per frame)
    - `previouslyVisible: number[]` — flat indices of last-frame VISIBLE tiles
  - **FogState constants:**
    ```
    const FOG = { UNEXPLORED: 0, EXPLORED: 1, VISIBLE: 2 } as const
    type FogState = typeof FOG[keyof typeof FOG]  // 0 | 1 | 2
    ```
  - **Per-frame update (HUNT phase):**
    1. Read `GameState.visibleTiles` (Uint8Array from game layer — NEVER compute FOV)
    2. Demote: iterate `previouslyVisible` array (NOT full fogState scan), set each to EXPLORED, set alphaTarget to 0.6
    3. Promote: iterate visibleTiles, for each visible tile set to VISIBLE, compute distance-based alpha target, push index to previouslyVisible
    4. Manual lerp (camera-culled): only iterate tiles within camera.worldView bounds
       - `tile.alpha += (alphaTarget[idx] - tile.alpha) * 0.12`
       - Skip if `Math.abs(tile.alpha - target) < 0.01` (convergence threshold)
  - **Distance-based alpha falloff (vignette):**
    - Inner radius (50% of vision range): alpha target = 0.0 (fully clear)
    - Outer radius (100% of vision range): alpha target = 0.15 (slightly dimmed)
    - Linear interpolation between inner and outer
    - Masks discrete tile boundaries, creates natural spotlight feel
  - **COUNTDOWN phase:** All tiles alpha 0 (game layer fills playerFov with 1s — FogRenderer treats uniformly)
  - **transitionToHunt():** Reset all fogState to UNEXPLORED, all alphaTarget to 1.0, clear previouslyVisible. Called during camera fadeOut blackout.
  - **isTileVisible(tileX, tileY): boolean** — returns `fogState[y * width + x] === FOG.VISIBLE`. Used by Game.ts for seeker sprite visibility (SRP).
  - **reset():** Full state reset for Play Again. Called when Game scene restarts.
  - **destroy():** Clean up fog layer.

### Camera & Cinematics

- [ ] `src/renderer/systems/CinematicManager.ts` — Dual-camera system:
  - Create UI camera: `cameras.add(0, 0, width, height, false, 'ui')` at zoom=1, scroll (0,0)
  - `ignoreOnUI(gameObject)`: registers game objects so UI camera ignores them (main camera sees game world, UI camera sees only splash text)
  - Promise wrappers for camera effects:
    - `zoomTo(zoom, duration, ease)` → resolves on `ZOOM_COMPLETE`
    - `panTo(x, y, duration, ease)` → resolves on `PAN_COMPLETE`
    - `flash(duration, r, g, b)` → resolves on `FLASH_COMPLETE`
    - `fadeOut(duration)` → resolves on `FADE_OUT_COMPLETE`
    - `shake(duration, intensity)` → fire-and-forget (flavor, not sequencing gate)
    - `wait(ms)` → `scene.time.delayedCall` wrapped in Promise
    - ALL effects use `force: true`
    - ALL events use Phaser constants (`Phaser.Cameras.Scene2D.Events.ZOOM_COMPLETE`), not string literals
  - `showSplash(text, color)`: creates BitmapText at screen center, `mainCamera.ignore()` on it (only UI camera renders it). Unaffected by main camera zoom/pan.
  - `hideSplash()`: destroys splash text
  - `destroy()`: removes UI camera, cleans up splash text

- [ ] `src/renderer/utils/EndOfRoundSequence.ts` — Polling state machine:
  - **SequenceStep discriminated union:**
    ```
    type SequenceStep =
      | { type: 'pause'; durationMs: number }
      | { type: 'zoom'; target: number; durationMs: number; ease: string }
      | { type: 'pan'; x: number; y: number; durationMs: number; ease: string }
      | { type: 'flash'; durationMs: number; r: number; g: number; b: number }
      | { type: 'shake'; durationMs: number; intensity: number }
      | { type: 'text'; content: string; color: string; holdMs: number }
      | { type: 'fade'; direction: 'out'; durationMs: number }
    ```
  - **FOUND_SEQUENCE** (readonly SequenceStep[]):
    1. `{ type: 'pause', durationMs: 200 }` — let the moment land
    2. `{ type: 'shake', durationMs: 100, intensity: 0.015 }` — visceral impact (fire-and-forget)
    3. `{ type: 'zoom', target: 2, durationMs: 500, ease: 'Quad.easeInOut' }` — zoom + pan run simultaneously via Promise.all
    4. `{ type: 'flash', durationMs: 250, r: 255, g: 255, b: 255 }` — white flash (SKIP if reducedMotion)
    5. `{ type: 'text', content: 'FOUND!', color: '#ff4444', holdMs: 1500 }` — splash on UI camera
    6. `{ type: 'fade', direction: 'out', durationMs: 500 }` — fade to black → Results
  - **SURVIVED_SEQUENCE** (readonly SequenceStep[]):
    1. `{ type: 'pause', durationMs: 200 }`
    2. `{ type: 'zoom', target: 2, durationMs: 500, ease: 'Quad.easeInOut' }` — zoom to 2x (NOT 1.5 — integer zoom with roundPixels)
    3. `{ type: 'flash', durationMs: 250, r: 255, g: 215, b: 0 }` — gold flash (SKIP if reducedMotion)
    4. `{ type: 'text', content: 'SURVIVED!', color: '#ffd700', holdMs: 1500 }`
    5. `{ type: 'fade', direction: 'out', durationMs: 500 }`
  - **Polling executor:**
    - `startStep()`: calls CinematicManager method, records start time
    - `update(delta)`: checks elapsed time. If step completed (via camera effect isRunning check) → advance. If exceeded timeout (duration + 500ms) → force-advance.
    - Scene-alive guard before each step: `if (!this.scene.isActive()) return`
    - `camera.stopFollow()` at sequence start
    - `camera.resetFX()` at sequence start (clear any in-flight effects)
    - Requests `PauseAuthority.CINEMATIC` at start, releases at end
    - Hides HUD at start (`scene.sleep('HUD')`)
    - `onComplete` callback: `scene.start('Results', resultsData)` via SceneTransition
    - Abortable: `abort()` method jumps to final step
  - **Reduced-motion support:**
    - At construction, filter FOUND/SURVIVED arrays: remove 'flash' steps, keep everything else
    - Check `GameSettings.reducedMotion` (set at boot from prefers-reduced-motion)
  - **Found-specific:** Before sequence, call `fogRenderer.revealArea(midX, midY, radius)` to clear fog around encounter point. Pan target = midpoint between seeker and hider.
  - **Survived-specific:** Pan target = player position.

- [ ] `src/renderer/utils/SceneTransition.ts` — Type-safe scene transitions:
  - `startScene<K extends keyof SceneDataMap>(plugin, key, data?)`:
    - Set `isTransitioning = true` (checked by input handlers)
    - `camera.fadeOut(500, 0, 0, 0)`
    - On `FADE_OUT_COMPLETE`: `plugin.start(key, data)` → `isTransitioning = false`
    - Receiving scene calls `camera.fadeIn(500)` at end of its `create()`
  - Static `isTransitioning` flag readable by Escape handler, button handlers
  - Used by: MainMenu→Game, Game→Results, Results→MainMenu, Results→Game, PauseMenu→MainMenu

### Pause System

- [ ] `src/renderer/systems/PauseAuthority.ts` — Reason-tracked pause:
  - `PAUSE_REASONS = { MENU, TAB_HIDDEN, CINEMATIC } as const` (Symbols)
  - `request(reason)`: add to activeReasons Set. If first reason → call doPause()
  - `release(reason)`: remove from Set. If empty → call doResume()
  - `isPaused: boolean` getter — `activeReasons.size > 0`
  - `doPause()`: engine.pause() (the true freeze — checked in fixedUpdate before accumulator)
  - `doResume()`: engine.resume()
  - Escape key handler checks `isPaused` — if true AND reason includes CINEMATIC, ignore. If true AND reason is only MENU, treat as Resume.
  - Tab visibility handler: `request(TAB_HIDDEN)` on hidden, `release(TAB_HIDDEN)` on visible
  - Cinematic: `request(CINEMATIC)` at sequence start, `release(CINEMATIC)` at sequence end

### Game State Additions (Game Layer)

- [ ] Add `playerFov: Uint8Array` to PlayingState interface — game layer computes in fixedUpdate(), renderer reads
- [ ] `playerFov.fill(1)` on entering COUNTDOWN state — all tiles visible, FogRenderer treats uniformly (no phase branching needed in renderer)
- [ ] Add `GameStats` interface to PlayingState: `{ distanceTraveled: number }`
- [ ] Accumulate `distanceTraveled` in fixedUpdate during HUNT phase: `stats.distanceTraveled += Math.hypot(dx, dy)`. COUNTDOWN movement excluded.
- [ ] `GameEngine.dispose()`:
  - Set `this.disposed = true`
  - Cancel all pending EasyStar paths
  - `emitter.offAll()`
  - Every EasyStar callback checks `if (this.disposed) return` before acting

### Types

- [ ] `src/types/scenes.ts`:
  ```
  interface SceneDataMap {
    Boot: undefined
    MainMenu: undefined
    Game: GameSceneData
    HUD: HUDSceneData
    PauseMenu: undefined
    Results: ResultsSceneData
  }

  interface GameSceneData {
    readonly settings: GameSettings
  }

  interface HUDSceneData {
    readonly listener: TypedListener<GameEventMap>
    readonly getState: () => ReadonlyDeep<PlayingState>
  }

  interface ResultsSceneData {
    readonly outcome: 'found' | 'survived'
    readonly timeSurvivedMs: number
    readonly distanceTraveled: number
  }
  ```
  - Typed wrapper: `startScene<K>(plugin, key, ...args)` with conditional rest params (scenes with no data require no second argument)

- [ ] `src/types/settings.ts`:
  ```
  interface GameSettings {
    readonly countdownDuration: number   // seconds
    readonly huntTimeLimit: number       // seconds
    readonly difficulty: 'easy'          // only 'easy' until Phase 5
    readonly reducedMotion: boolean      // from prefers-reduced-motion
  }

  const DEFAULT_SETTINGS: Readonly<GameSettings> = {
    countdownDuration: 10,
    huntTimeLimit: 120,
    difficulty: 'easy',
    reducedMotion: false,  // overridden at boot from media query
  }
  ```

### Playwright Testing

- [ ] `src/test/TestBridge.ts` — Dev-only game state exposure:
  - Guard: `if (!import.meta.env.DEV && import.meta.env.MODE !== 'test') return`
  - `window.__GAME_TEST__` with typed GameTestBridge interface:
    - `ready: boolean`
    - `sceneInfo()`: active/visible/status for each scene key
    - `cameraState()`: zoom, scroll, isFlashing/isZooming/isPanning/isFading
    - `fogState()`: Array.from(fogState Uint8Array)
    - `gameFlowState()`: current gameFlow.kind string
    - `splashText()`: currently displayed splash text or null
    - `triggerFound()` / `triggerSurvived()`: test commands via scene events
  - Tree-shaken from production builds

- [ ] `e2e/types.d.ts` — TypeScript declaration for `window.__GAME_TEST__`

- [ ] `playwright.config.ts`:
  - Chromium only (Firefox/WebKit can't render WebGL headless)
  - Viewport: match game resolution (e.g., 800x600 or 1280x720)
  - `maxDiffPixelRatio: 0.01` (1% tolerance)
  - `threshold: 0.2` (per-pixel color distance)
  - WebServer: `pnpm run dev` on port 5173
  - Two projects: `visual` (screenshot tests) and `functional` (state assertions)

- [ ] `e2e/fog.visual.spec.ts` — Fog state rendering:
  - Seed randomness via URL param `?seed=42`
  - Verify fogState() contains all 3 values (UNEXPLORED, EXPLORED, VISIBLE)
  - Screenshot comparison of fog rendering

- [ ] `e2e/found-moment.visual.spec.ts` — Found camera sequence:
  - Start game → wait for HUNT → triggerFound()
  - Verify: gameFlowState === 'found', zoom === 2, splashText === 'FOUND!', Results active
  - Screenshot during splash

- [ ] `e2e/survived-moment.visual.spec.ts` — Survived camera sequence:
  - Start game → wait for HUNT → triggerSurvived()
  - Verify: gameFlowState === 'survived', zoom === 2, splashText === 'SURVIVED!', Results active

- [ ] `e2e/scene-flow.func.spec.ts` — Full scene flow:
  - MainMenu → Game + HUD (both active) → Escape → PauseMenu (Game sleeping) → Resume → Game → End → Results → Play Again → Game
  - All via keyboard (validates accessibility)

- [ ] `e2e/reduced-motion.func.spec.ts` — Accessibility:
  - `page.emulateMedia({ reducedMotion: 'reduce' })`
  - Trigger Found → verify flash never ran → sequence still completes → Results active

- [ ] `e2e/keyboard-nav.func.spec.ts` — Menu navigation:
  - All menus navigable by keyboard (arrow keys + Enter)
  - Escape pauses and resumes

- [ ] **CI considerations:**
  - Baselines generated on CI (Linux), NOT local Windows — rendering differs
  - Use Playwright Docker image for consistent GPU/font rendering
  - Upload playwright-report as artifact on failure
  - Verify Playwright Clock API + Phaser rAF compatibility in Phase 0 scaffolding

## Success Criteria

1. Full game loop: Boot (Click to Start) → MainMenu → Game (COUNTDOWN → camera fade → HUNT with fog) → Found/Survived cinematic → Results → Play Again/Menu
2. Fog of war creates real tension (can't see seeker outside FOV, explored areas dimly visible)
3. Seeker only visible when in player's FOV (controlled by Game.ts, not FogRenderer)
4. Found/Survived moments feel dramatic (zoom, flash, splash text via dual-camera, camera fade)
5. Pause works with PauseAuthority (Escape freezes everything, resume continues, no conflicts with tab-visibility or cinematics)
6. Reduced-motion mode skips camera flash (accessibility safety)
7. Controller navigation works in all menus (D-pad + A/B)
8. No softlocks (EndOfRoundSequence has timeout safety, PauseMenu launch guarded, EasyStar disposed)
9. Clean scene lifecycle (no listener leaks on Play Again, HUD lifecycle managed)
10. TestBridge exposes game state for Playwright testing
11. All Playwright tests pass in CI

## Dependencies

- Phase 2 complete (seeker AI, shadowcasting/LOS, detection, game flow state machine, TypedEmitter, GameFlowState discriminated union)
- BitmapFont atlas generated for HUD text (snowb.org or Hiero from any TTF)
- Single 32x32 solid black tile for fog overlay layer

## Risks

| Risk | Mitigation | Source |
|------|------------|--------|
| FogRenderer computes FOV (boundary violation) | READS GameState.visibleTiles ONLY — never imports from src/game/ | Architecture review |
| Fog overlay performance on large maps | Manual lerp (zero GC), camera-culled, tracked visible set (not full-array scan) | Fog + Performance research |
| Multiply blend mode trap | NEVER use multiply. Per-tile alpha on dedicated overlay layer only. Hard rule. | top-down-racer-04 post-mortem |
| zoomTo jitter with roundPixels | Use zoomTo(2) for BOTH sequences — integer zoom only | Performance review |
| EndOfRoundSequence softlock | Polling state machine with step timeouts (duration + 500ms buffer) | Race conditions review |
| HUD deaf on first frame / after restart | HUD PULLS initial state on create, stop/relaunch on Play Again | Race conditions review |
| Dual pause authority conflict | PauseAuthority with reason tracking (~20 LOC) | Race conditions review |
| Escape during cinematic softlocks | CINEMATIC reason blocks Escape handler | Race conditions review |
| Double-tap Escape spawns multiple PauseMenus | isActive guard + JustDown edge detection | Race conditions review |
| COUNTDOWN→HUNT 1-frame black flash | Camera fadeOut(200ms) → reset fog during blackout → fadeIn(300ms) | Spec flow + Race conditions |
| EasyStar setTimeout ghost callbacks | GameEngine.dispose() + disposed flag guard on all callbacks | Race conditions + Performance |
| setTint is WebGL-only | Verify renderer type at boot, show unsupported message for Canvas | Performance review |
| Camera pan ignored during follow | camera.stopFollow() before cinematic sequences | Camera research |
| setScrollFactor doesn't prevent zoom scaling | Dual-camera approach for splash text (UI camera at zoom=1) | Camera research |
| Scene sleep deferred 1 frame | GameEngine pause flag is true freeze (checked in fixedUpdate before accumulator) | Performance + Scene research |
| wake() doesn't call init()/create() | Use 'wake' event listener for data passing on wake | Scene research |
| Camera flash photosensitivity hazard | Reduced-motion toggle via prefers-reduced-motion + GameSettings flag | Spec flow + Playwright research |
| External emitter listeners survive shutdown | Manual .off() with named functions in shutdown handler | Scene research |
| Playwright visual test baseline drift | Chromium-only, baselines on CI, seed randomness, 1% tolerance | Playwright research |
| scene.launch() is deferred (1 frame) | HUD pulls initial state, doesn't rely on catching first event | Race conditions review |
| Camera effects silently no-op without force:true | ALL camera effects in sequences use force:true | Camera research |
| In-flight camera effects block new ones | camera.resetFX() at EndOfRoundSequence start | Race conditions review |
| Timer display shows "0" with time remaining | Use Math.ceil, not Math.floor — "00:00" only at actual expiry | HUD research |

## Deferred Items (Explicitly Out of Scope)

| Item | Deferred To | Rationale |
|------|-------------|-----------|
| Settings UI (difficulty, time limit, countdown) | Phase 4+ | No player has played. Tune via coded defaults. |
| AI vs AI button/mode | Phase 5 | Not functional until AI tiers exist |
| Volume controls in PauseMenu | Phase 6 | No audio system in Phase 3 |
| Onboarding text during countdown | Phase 4+ | Game is intuitive (WASD to move). Not essential for Tier 1. |
| Renderer-side fog dirty flag | Never (unless perf issue) | Manual lerp converges in ~3 frames. Not needed at <10K tiles. |
| Controller vibration/haptics | Phase 6+ | Polish item |
| Mobile/touch support | Phase 7+ | Desktop-first |
| Score persistence / leaderboards | Phase 6 | Scoring system not yet designed |
| Settings persistence (localStorage) | Phase 6 | No settings UI yet |
| Fog reveal per-tile tweens | Never | Manual lerp is zero-GC and visually equivalent |

## Sources

### Official Documentation (Context7)
- [Phaser Scene API](https://docs.phaser.io/api-documentation/class/scenes-sceneplugin) — start, launch, sleep, wake, stop, switch
- [Phaser Camera API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) — fadeOut, fadeIn, zoomTo, pan, flash, shake
- [Phaser Camera Events](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events) — FADE_OUT_COMPLETE, ZOOM_COMPLETE, etc.
- [Phaser TilemapLayer.setTint](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) — per-tile and region tinting
- [Phaser Tile alpha/visible](https://docs.phaser.io/api-documentation/class/tilemaps-tile) — per-tile alpha, visibility, tint properties
- [Phaser Scene Concepts](https://docs.phaser.io/phaser/concepts/scenes) — lifecycle, parallel scenes, cross-scene communication

### Research & Community
- [Albert Ford: Symmetric Shadowcasting](https://www.albertford.com/shadowcasting/) — reference algorithm
- [Ourcade: Fog of War for Phaser 3](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)
- [Ourcade: Scene Transitions with Fade](https://blog.ourcade.co/posts/2020/phaser-3-fade-out-scene-transition/)
- [Promisifying Phaser (async/await camera effects)](https://dev.to/pincfloit/promisifying-phaser-2oak)
- [Rex's Camera Effects Notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/camera-effects/)
- [Rex's Easing Function Reference](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ease-function/)
- [WebGL Fundamentals: Alpha](https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html) — why multiply blend fails
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- top-down-racer-04 render-clipping solution doc (never multiply blend)

### Project Plans (Cross-References)
- [Master Plan](2026-03-29-001-feat-hide-and-seek-game-plan.md) — architecture, sacred rules, phase overview
- [Phase 0: Scaffolding](2026-03-29-002-phase-0-project-scaffolding-plan.md) — Vite, TS, Vitest, type system
- [Phase 1: Map & Movement](2026-03-29-003-phase-1-map-movement-plan.md) — GameEngine, fixed timestep, tilemap, input
- [Phase 2: Seeker & Detection](2026-03-29-004-phase-2-seeker-detection-plan.md) — shadowcasting, EasyStar, FSM, TypedEmitter, GameFlowState
