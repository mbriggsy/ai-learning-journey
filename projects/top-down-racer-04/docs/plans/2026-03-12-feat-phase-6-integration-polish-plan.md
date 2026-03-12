---
title: "Phase 6: Integration & Polish"
type: feat
status: active
date: 2026-03-12
deepened: 2026-03-12
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

## Enhancement Summary

**Deepened on:** 2026-03-12
**Research agents used:** 10 (architecture-strategist, code-simplicity-reviewer, deployment-verification-agent, julik-frontend-races-reviewer, kieran-typescript-reviewer, performance-oracle, security-sentinel, pattern-recognition-specialist, framework-docs-researcher, best-practices-researcher)

### Critical Fixes (Plan was wrong -- implementation would fail)

1. **XSS in boot error boundary** -- `${err.message}` interpolated into `innerHTML` is an injection vector. Must use `textContent` + DOM element creation. Also type `err` as `unknown` with a type guard.
2. **`startGame()` canonical sequence missing 4-5 steps** -- omits `overlayRenderer.setGraceInfoSource()`, storage of `activeTrackIndex`/`currentMode`/`targetLaps`, `lastBestLapTicks = 0` reset, and ticker callback attachment. Following the 21-step checklist literally would break vs-AI leaderboards and grace countdown overlay.
3. **Tab visibility handler NEVER RESOLVED** -- listed as gap T6 in the problem statement but no sub-phase addresses it. Player Alt-Tabs during a race, returns to physics jump + audio desync. Need `visibilitychange` auto-pause handler (~6 lines).
4. **ONNX model path breaks subdirectory deployments** -- absolute `/ai/model.onnx` not rewritten by Vite's `base: './'`. Must use `import.meta.env.BASE_URL + 'ai/model.onnx'` for both model and vecnorm stats.
5. **Build size estimate is wrong** -- plan says 30-60MB but excludes ORT WASM files (~78MB all variants). Actual unoptimized: ~100-107MB. With jsep-only WASM variant: ~47-56MB. GitHub Pages has 100MB soft limit.
6. **`exitRace()` checklist contradicts prose** -- Sub-Phase 6.2.2 says `resetEngine()` is called before `suspend()` in exitRace, but the 6.2.1 checklist step 3 shows only `SoundManager.suspend()`. Implementers following the checklist literally will get a high-RPM audio burst on the next race.
7. **Escape during async `loadTrack()` traps user** -- `pendingCancel` was flagged in Phase 4 Enhancement #6 but never wired into Phase 6's 21-step sequence. User presses Escape during multi-second asset load, input is silently swallowed.
8. **Vite 7.x: `rollupOptions` is DEPRECATED** -- must use `rolldownOptions`. Plan's Vite config uses wrong API. (Also `optimizeDeps.esbuildOptions` deprecated in favor of `optimizeDeps.rolldownOptions`.)
9. **PixiJS v8 bug: Text disappears after WebGL context loss** (issue #11685) -- plan says "PixiJS v8 built-in handler" for WebGL recovery, but Text objects require manual re-creation in `contextChange` handler. Cannot rely on automatic restoration.
10. **ONNX inputTensor WASM memory leak** -- v02's `BrowserAIRunner.infer()` creates a new `ort.Tensor` every call but never disposes the INPUT tensor. ~3.4KB/sec of WASM heap growth. Phase 5 identified fix (`inputTensor.dispose()` in `try/finally`) but Phase 6 must verify it is implemented before integration testing.

### Key Performance Insights

1. **Default skid RenderTexture to half-resolution (0.5x AABB)** -- 1:1 mapping on Track 3's AABB could be 36MB RGBA. At 0.5x = 9MB. Skid marks at 0.5x are still ~1px wide (visible). Make half-res the default, not a fallback.
2. **Disable `motionBlurFilter.enabled` when speed < threshold** -- saves 1 full filter pass (~8.3M pixels at 1080p) during countdown, pause, slow corners, post-finish. ~30-40% of gameplay time. 3 lines of code.
3. **Ship only jsep WASM variant** -- one-line filter change in `copy-ort-wasm.cjs` saves ~55MB from build. Other variants (asyncify, jspi, base) target exotic environments this project doesn't need.
4. **Pre-allocate and reuse ONNX input tensors** -- reuse a single `Float32Array` + `ort.Tensor` per frame instead of creating new ones. Avoids per-frame GC pressure.
5. **BitmapText for HUD speedometer + timer** -- eliminates 60-180 Canvas2D texture uploads/sec. BitmapText uses pre-rendered glyph atlas (GPU-native).
6. **`cancelScheduledValues()` before gain ramps** -- rapid pause/resume without cancellation causes `linearRampToValueAtTime` to queue (not replace), producing audio parameter conflicts.
7. **Track PNG to WebP should be a 6.5 task, not a footnote** -- reduces 18-36MB of PNGs to 6-12MB. PixiJS v8 supports WebP natively. Cuts total build to ~35-40MB.
8. **SpritePool swap-and-pop for particle removal** -- O(1) instead of v02's `Array.splice` O(n). Standard game dev pattern. Prevents hitches when many particles die on same frame (wall collision burst).

### Structural Recommendations

1. **Replace `transitioning` boolean with `ScreenState = 'loading'`** -- uses v02's existing `VALID_TRANSITIONS` state machine. Also prevents double-start without a separate flag. If `startGame()` fails during loading, transition back to `'track-select'`.
2. **`AiLoadState` tri-state: `'pending' | 'loaded' | 'failed'`** -- boolean loses loading-in-progress state. UI can show spinner during load, disabled on failure, enabled on success.
3. **ONNX boot-time singleton** -- load ONNX once at boot, share session across all races. Inject pre-loaded `BrowserAIRunner` into `GameLoop.loadTrack()`. Eliminates per-race ONNX latency (~50-200ms). Documented departure from v02's per-race creation pattern.
4. **Remove GraceCountdown from escape routing table** -- it is NOT a `GamePhase`; it is a concurrent `VsAiGraceState`. Let underlying GamePhase rules govern escape behavior during grace periods.
5. **Collapse quality tiers from 3 to 2 (On/Off)** -- portfolio project doesn't need a medium tier. "On" = all P0+P1 effects. "Off" = no filters. Simplifies settings UI, testing (2 permutations not 3), and filter configuration branching.
6. **Delete VRAM audit sub-phase (6.4.3)** -- concludes "well within budget" then mitigates a non-problem. VRAM issues would surface during the 9-combination smoke test. No separate audit step needed.
7. **Document GameLoop lifetime as singleton** -- one instance for app lifetime, one ticker callback (never removed), uses `if (state !== 'playing') return` guard per v02 pattern. Prevents zombie ticker and callback leak concerns.
8. **Group `startGame()` into 5 named private methods** -- Guard (steps 1-3), Asset (steps 4-6), Audio (steps 7-9), Scene (steps 10-17), Transition (steps 18-25). Top-level reads like documentation while preserving ordering.
9. **Separate build verification tests** from `pnpm test` -- they require `dist/` to exist. Use `"test:build": "vitest run tests/integration/"` as a dedicated script.
10. **Restructure smoke test** from "per-combination full checklist" to "mechanism tests once + 9 quick sweep passes." Tests mechanisms on one track/mode, then verifies 9 combinations with a quick play-through (load, drive, finish, no crash).

### New Risks Discovered

1. Ticker renders destroyed containers for 1 frame during exitRace -- must set state to non-`'playing'` BEFORE teardown (HIGH)
2. `transitioning` cleared before countdown ends -- must `await` countdown at step 20 before clearing (MEDIUM)
3. DOM-to-PixiJS transition flash -- show world BEFORE hiding DOM overlay; countdown masks the transition (LOW-MEDIUM)
4. Spectator car texture swap timing unspecified -- must happen in `WorldRenderer.create()` based on mode (HIGH)
5. Skid RenderTexture not resized for different track AABBs -- `EffectsRenderer.reset()` must recreate texture if AABB changed (HIGH)
6. `SoundManager.init()` idempotency unspecified -- must no-op if AudioContext already exists (MEDIUM)
7. SFX nodes not silenced in exitRace -- tire screech carries through suspend/resume (MEDIUM)
8. WASM copy redundancy -- both `copy-ort-wasm.cjs` AND Vite `writeBundle` hook copy WASM files; remove one (MEDIUM)
9. SharedArrayBuffer needs COOP/COEP headers -- GitHub Pages cannot set these; ORT degrades to single-threaded WASM (HIGH)
10. RenderTextures NOT auto-collected by PixiJS GC system -- must be explicitly destroyed in between-race cleanup (MEDIUM)
11. Motion blur velocity not reset on filter reattach -- first frame of new race shows stale blur from previous race (MEDIUM)
12. GameLoop key-state flags (`escapeWasDown`, `rWasDown`, `qWasDown`) not reset between races (MEDIUM)
13. Minimap dot uses player color in spectator mode while tracking AI car -- should use AI styling (MEDIUM)
14. `previousScreen` tracking needed for settings escape-back -- v02 hardcodes main-menu; v04 may allow settings from track-select (MEDIUM)
15. Render callback leak risk -- `GameLoop.renderCallbacks` not cleared in `reset()`. Verify wired once during init, never re-registered per race (HIGH)
16. `exponentialRampToValueAtTime` CANNOT target 0 (would be -Infinity dB) -- must use `linearRamp` for fade-outs. Plan's `pauseEngine()` correctly uses linearRamp. (INFO)
17. `ModeConfig` record opportunity -- extract `showPlayerCar`, `showAiCar`, `showPositionIndicator`, `cameraTarget`, `writeLeaderboard` into a `Record<GameMode, ModeConfig>` with `satisfies` to avoid scattered `if (mode === 'spectator')` checks (MEDIUM)

### Deployment Insights

1. **COOP/COEP headers** needed for full-speed multi-threaded ONNX inference. GitHub Pages cannot set custom headers (degrades to single-threaded). Netlify uses `_headers` file; Vercel uses `vercel.json`. Document host-specific behavior.
2. **Content-Security-Policy** recommended for hardening (not blocking for Phase 6): `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; worker-src 'self' blob:;`
3. **Additional build tests needed**: total `dist/` size < 80MB, ONNX model < 100KB (spec says <=50KB), no `.ts`/`.d.ts` files in dist (v02 had tsc emission pollution), WASM files > 1MB (catches truncated copies).
4. **Explicitly disable source maps**: `build: { sourcemap: false }` -- Vite defaults to false but make intent explicit.
5. **ONNX model path resolution**: `dist/ai/` (plan) vs `dist/assets/` (v02). Must choose one and update `BrowserAIRunner` fetch path to match. Use `import.meta.env.BASE_URL` prefix for subdirectory support.
6. **Gemini API key in `.env`** -- gitignored but present on disk. Recommend rotation + git pre-commit hook to reject `.env*` staging. Not a Phase 6 code concern but an operational hygiene item.

### Security Notes

1. **Boot error boundary XSS** -- use `textContent` + `document.createElement` + `addEventListener` (not `onclick`). CSP-friendly.
2. **localStorage input validation** -- add type validation/sanitization when reading. Parse with defaults, clamp numeric values, validate enum strings. Prevents tampered data from causing runtime errors.
3. **No text input fields** -- the game has zero user text input, zero form submissions, zero URL parameter reads. Attack surface is near-zero for a static client-side game.

### Framework Version Notes (as of 2026-03-12)

- **PixiJS v8.17.0**: Known bugs -- Text not restored after WebGL context loss (#11685), Graphics memory leak on rapid create/destroy (#10586), app.destroy(true) crash after generateTexture() (#11667). All affect this project.
- **Vite 7.3.1**: `rollupOptions` deprecated (use `rolldownOptions`), `optimizeDeps.esbuildOptions` deprecated (use `optimizeDeps.rolldownOptions`). Default build target is `'baseline-widely-available'`.
- **Web Audio API**: `interrupted` AudioContext state shipping in WebKit, Origin Trial in Chromium. TypeScript's `lib.dom.d.ts` does not include `"interrupted"` in `AudioContextState` union -- check for `"running"` only to avoid type errors.
- **ONNX Runtime Web**: `env.wasm.proxy = true` offloads inference to Web Worker. `numThreads: 1` for broad compatibility without COOP/COEP headers.

---

# Phase 6: Integration & Polish

## Overview

Phase 6 is the final build phase. It wires the outputs of Phases -1 through 5 into a single, playable, deployable game. No new features — only integration, correctness, resilience, and deployment readiness.

The prior 7 phases each produced isolated subsystems: a frozen engine, generated assets, a processing pipeline, a visual renderer, post-processing effects, commercial UI/audio, and a retrained AI model. Phase 6's job is to make them function as one coherent product, verify every combination works (3 tracks x 3 game modes = 9 permutations), and produce a static build that runs on any web host.

**What Phase 6 is NOT:** No new visual effects, no new UI screens, no new game features, no engine changes, no AI retraining. If it wasn't built in Phases -1 through 5, it doesn't exist in Phase 6.

## Problem Statement

Integration is where games break. Each prior phase was planned and tested in isolation. Cross-phase concerns — like the exact initialization order when starting a race, or what happens when you play two races back-to-back, or how spectator mode interacts with the leaderboard — live in the seams between phases. The SpecFlow analysis identified 20+ gaps that no individual phase plan resolves:

- **Spectator mode** has 4 unresolved rendering/data issues (camera target, car visibility dispatch, minimap dots, leaderboard corruption)
- **Audio lifecycle** has 4 gaps (no engine reset between races, pause behavior undefined, AudioContext "interrupted" state, mute/volume contradiction)
- **State transitions** have 6 gaps (lap count never reaches engine, escape key collision, overlay-to-DOM bridge, filter reattachment, between-race cleanup incomplete, tab visibility)
- **Error recovery** has 4 gaps (no boot error boundary, ONNX load failure unhandled, WebGL context loss, localStorage unavailable)
- **Deployment** has 4 gaps (WASM MIME types, Google Fonts CDN dependency, build output structure, base path config)

Phase 6 resolves all of them.

## Proposed Solution

Seven sub-phases, executed sequentially. Each sub-phase has a clear deliverable and acceptance gate. The ordering matters — wiring must come before testing, and testing must come before deployment.

| Sub-Phase | Focus | Deliverable |
|-----------|-------|-------------|
| 6.1 | Cross-Phase Wiring | Canonical `startGame()` sequence, spectator mode fix, lap count wiring, escape routing, overlay bridge |
| 6.2 | Between-Race Lifecycle | Complete cleanup/re-init checklist, second-race-works guarantee |
| 6.3 | Error Handling & Resilience | Boot error boundary, ONNX fallback, localStorage guards, audio resilience |
| 6.4 | Performance Verification | 60fps on all tracks at high quality, VRAM audit, worst-case (Track 3) validation |
| 6.5 | Deployment Build | Vite production config, WASM handling, font strategy, build output audit |
| 6.6 | Integration Smoke Tests | 9-combination manual checklist + automated build verification tests |
| 6.7 | Final Acceptance | Human play-through of all 9 combinations, visual quality sign-off |

## Technical Approach

### Sub-Phase 6.1: Cross-Phase Wiring

The most critical sub-phase. Resolves the integration seams between phases.

#### 6.1.1 — Canonical `startGame()` Sequence

**Problem:** The race initialization sequence is scattered across Phases 2, 3, 4, and 5. No single location defines the complete ordered list. Missing a step means a race-specific bug.

**The definitive sequence** (derived from cross-referencing all phase plans + v02 `ScreenManager.ts`):

```
startGame(trackId: TrackId, mode: GameMode):
  --- GUARD PHASE ---
  1.  Guard: if state === 'loading', return (prevent double-start)        [Deepened: use ScreenState, not boolean]
  2.  this.goto('loading')  — state machine transition                    [Deepened: replaces transitioning boolean]
  3.  Show loading indicator on DOM overlay

  --- ASSET PHASE ---
  4.  Read lapCount from loadSettings().lapCount                          [Phase 4]
  5.  await AssetManager.loadTrack(trackId)                               [Phase 2]
  5a. if (this.pendingCancel) { unload; goto('track-select'); return }    [Deepened: Phase 4 Fix #6]
  6.  app.renderer.prepare.upload(trackBgTexture)                         [Phase 2]

  --- AUDIO PHASE ---
  7.  SoundManager.init()  — idempotent: no-op if AudioContext exists     [Phase 4, Deepened: idempotency]
  8.  SoundManager.resetEngine()  — zero all layer gains + idle freq      [Phase 4, Gap A1]
  9.  SoundManager.resume()  — wrap in try/catch; set audioFailed on err  [Phase 4]

  --- SCENE PHASE ---
  10. GameLoop.loadTrack(controlPoints, lapCount, mode, aiRunner)         [Engine, Deepened: pass singleton aiRunner]
  11. WorldRenderer.create(trackId, mode)  — builds containers + textures [Phase 2, Deepened: spectator texture swap here]
  12. EffectsRenderer.reset(trackAABB)  — recreate skid texture if AABB   [Phase 3, Deepened: AABB-aware resize]
       changed, clear sprite pool
  13. FilterManager.attach(worldContainer, carLayer, aiCarContainer)      [Phase 3]
  14. OverlayRenderer.setGraceInfoSource(                                 [Deepened: MISSING from original]
        () => this.gameLoop.vsAiGraceState)
  15. HudRenderer.reset()                                                 [Phase 4]
  16. HudRenderer.setMode(mode)  — position indicator visibility          [Phase 4]
  17. OverlayRenderer.setMode(mode)                                       [Phase 2]

  --- STATE BOOKKEEPING ---                                               [Deepened: MISSING from original]
  17a. this.activeTrackIndex = trackIndex
  17b. this.currentMode = mode
  17c. this.targetLaps = lapCount
  17d. this.lastBestLapTicks = 0; this.lastAiBestLapTicks = 0
  17e. Attach ticker callback (if not already running — v02 lazy pattern)

  --- TRANSITION PHASE ---
  18. worldContainer.visible = true; hudContainer.visible = true          [Deepened: BEFORE DomOverlay.hide]
  19. DomOverlay.hide()  — DOM menus disappear over countdown overlay     [Deepened: swapped order with 18]
  20. await OverlayRenderer.startCountdown()  — 3-2-1-GO with beeps      [Deepened: AWAIT before clearing state]
  21. this.goto('playing')  — state machine transition, enables ticker    [Deepened: replaces transitioning = false]
```

**Implementation:** This sequence lives in `ScreenManager.startGame()`. It is the single source of truth for race initialization. Every step references the phase that created the subsystem. Steps marked `[Deepened]` were added or corrected during plan deepening.

**Deepened: AI state source wiring (step 14 in original plan) should be ONE-TIME in ScreenManager constructor**, not per-race. The getter closures capture `this.gameLoop` which is the same instance across all races. Move to constructor setup per v02 pattern (ScreenManager.ts lines 96-102).

**Deepened: `startGame()` should be organized into 5 named private methods** for readability: `guardPhase()`, `loadAssets()`, `prepareAudio()`, `buildScene()`, `beginRace()`. The top-level `startGame()` becomes a 5-line orchestrator that reads like documentation while preserving ordering.

**Files touched:** `src/renderer/ScreenManager.ts`

#### 6.1.2 — Spectator Mode Rendering Fix

**Problem:** Four related gaps make spectator mode non-functional:
- S1: Minimap shows stationary player dot at spawn
- S2: Camera must follow AI car, not player
- S3: AI car sprite never updates (dispatch routes to hidden player)
- S4: Leaderboard writes AI times as human times

**Resolution — follow v02's dispatch-swap pattern:**

v02 solves this in `GameLoop.ts` (lines 209-221): in spectator mode, the dispatched `curr`/`prev` contain AI world state swapped into the "primary" position. The WorldRenderer, CameraController, HudRenderer, and SoundManager all read from the dispatched `curr` — they don't know or care whether it's human or AI data. The AiCarRenderer receives `null` (since the AI state was moved to primary). The CarRenderer (player) is hidden via `container.visible = false`.

**v04 adaptation:**
- `GameLoop` dispatches AI state as primary `curr`/`prev` in spectator mode (preserve v02 exactly)
- `CarRenderer` (player sprite) renders the dispatched primary state — in spectator, this is the AI
- `AiCarRenderer` receives `null` state, its container is hidden
- Player sprite uses AI car texture in spectator mode (swap tint/texture on mode change)
- Camera follows dispatched primary position/heading (already how v02 works)
- Minimap: skip drawing `playerPos` dot when `mode === 'spectator'`; draw only AI dot (which is now the primary dispatched position)
- `checkBestTime()` ALWAYS reads from the original, un-dispatched human world state (`this.gameLoop.originalWorldState`), NOT from `curr`. This is how v02 prevents leaderboard corruption. The human car in spectator mode never crosses checkpoints (frozen with `ZERO_INPUT`), so `bestLapTicks` is always 0, and the leaderboard write no-ops.

**Files touched:** `src/renderer/GameLoop.ts`, `src/renderer/WorldRenderer.ts`, `src/renderer/CarRenderer.ts`, `src/renderer/HudRenderer.ts`, `src/renderer/ScreenManager.ts`

#### 6.1.3 — Lap Count Wiring

**Problem:** `GameSettings.lapCount` is saved to localStorage but never reaches the engine (Phase 4, gap 36).

**Resolution — explicit wiring chain:**

```
DomSettings (user changes stepper)
  → GameSettings.lapCount updated
  → saveSettings() writes to localStorage

ScreenManager.startGame(trackId, mode):
  → const { lapCount } = loadSettings()
  → GameLoop.loadTrack(controlPoints, lapCount, mode)
  → Engine creates World with lapCount
```

The key: `startGame()` reads `lapCount` from `loadSettings()` at call time, not from a cached value. This guarantees the latest setting is always used.

**Files touched:** `src/renderer/ScreenManager.ts`

#### 6.1.4 — Escape Key Routing Table

**Problem:** Escape serves 6+ purposes across DOM and PixiJS states (Phase 4, gap 40).

**Resolution — single `keydown` listener with state-based routing:**

| Screen State | Game Phase | Escape Action |
|-------------|------------|---------------|
| `loading` | n/a | Set `pendingCancel = true` (Deepened) |
| `track-select` | n/a | `goto('main-menu')` |
| `settings` | n/a | `goto(previousScreen)` (Deepened: requires `previousScreen` field) |
| `playing` | `Racing` | Pause |
| `playing` | `Paused` | Resume |
| `playing` | `Finished` | `goto('track-select')` — same as Continue button |

**Deepened: Rows removed.** `main-menu` (no-op is the default), `Countdown` (no-op is the default), `Respawning` (no-op is the default). Only list rows that DO something. `GraceCountdown` removed because it is NOT a `GamePhase` -- it is a concurrent `VsAiGraceState`. Escape during grace follows the underlying GamePhase rules (Racing → Pause, Finished → track-select).

**Deepened: `loading` state added** to handle the async transition window (was missing -- user could get trapped).

**Deepened: `previousScreen` field.** Add `private previousScreen: ScreenState` to ScreenManager. Set it when entering settings. v02 hardcodes `main-menu`; v04 may allow settings from track-select.

**Deepened: Implementation pattern.** Use a discriminated context type for exhaustive checking:

```typescript
type EscapeContext =
  | { screen: 'loading' }
  | { screen: 'track-select' }
  | { screen: 'settings' }
  | { screen: 'playing'; phase: GamePhase };

// TypeScript checks exhaustiveness. If GamePhase gains a new variant, compiler catches it.
```

**Implementation:** One `keydown` listener on `document`, owned by `ScreenManager`. Checks `this.state` and `this.gameLoop?.gamePhase`. DOM menu listeners do NOT add their own Escape handlers.

**Files touched:** `src/renderer/ScreenManager.ts`, `src/renderer/dom/DomSettings.ts` (remove any local Escape handler)

#### 6.1.5 — OverlayRenderer "Continue" to DOM Track Select Bridge

**Problem:** Race results PixiJS overlay has a "Continue" action that must trigger DOM screen transition (Phase 4, gap 42).

**Resolution — preserve v02's callback pattern:**

```typescript
// In ScreenManager, when wiring GameLoop:
this.gameLoop.onQuitToMenu = () => this.goto('track-select');

// OverlayRenderer "Continue" button click:
this.onContinue?.();  // fires same callback as pause "Quit"

// Both paths converge to goto('track-select'), which:
//   1. Hides worldContainer + hudContainer
//   2. Runs between-race cleanup (Sub-Phase 6.2)
//   3. Shows DomOverlay + DomTrackSelect
```

**Files touched:** `src/renderer/ScreenManager.ts`, `src/renderer/OverlayRenderer.ts`

---

### Sub-Phase 6.2: Between-Race Lifecycle

**Problem:** No phase plan provides a complete checklist of what must happen between races. Operations are scattered across 4 phases. Missing any one creates a bug visible only on the second race (Gap T5).

#### 6.2.1 — Complete Cleanup Checklist (`goto('track-select')`)

When the player exits a race (via Continue, Quit, or Escape from Finished state):

```
exitRace():
  1.  this.goto('exiting')  — disables ticker guard immediately   [Deepened: prevents 1-frame render of destroyed containers]
  2.  worldContainer.visible = false                              [Phase 2]
  3.  hudContainer.visible = false                                [Phase 2]
  4.  SoundManager.resetEngine()  — zero gains before suspend     [Deepened: was MISSING from checklist, only in prose]
  5.  SoundManager.resetSfx()  — silence tire screech if playing  [Deepened: SFX carried through suspend/resume]
  6.  SoundManager.suspend()  — AudioContext suspended            [Phase 4]
  7.  EffectsRenderer.reset()  — clear skid RenderTexture         [Phase 3]
      (explicit destroy — PixiJS RenderTextures are NOT auto-GC'd),
      release all active sprite pool particles
  8.  FilterManager.detach()  — remove filters from containers    [Phase 3]
  8a. FilterManager.resetState()  — zero motion blur velocity     [Deepened: prevents stale blur on next race]
  9.  WorldRenderer.destroy()  — tear down container children     [Phase 2]
  10. Assets.unload(currentTrackBG)  — free VRAM                  [Phase 2]
  11. Reset lastBestLapTicks, lastAiBestLapTicks                  [v02 pattern]
  12. GameLoop.reset()  — clear world state + reset key flags     [Engine, Deepened: reset escapeWasDown etc.]
  13. DomOverlay.show()                                           [Phase 4]
  14. DomTrackSelect.show()  — refreshes best times from          [Phase 4]
      Leaderboard
  15. this.goto('track-select')  — state machine transition       [Deepened: explicit final state]
```

**Deepened: Step 1 is the critical fix.** v02's ticker guard (`if state !== 'playing') return`) prevents tick processing. By transitioning to `'exiting'` BEFORE any teardown, the ticker skips the frame. Without this, one tick fires against destroyed containers.

**The second-race guarantee:** After `exitRace()` completes, the game state is identical to what it was after cold boot + navigating to track select. No stale textures, no lingering audio, no zombie particles, no stale filter state, no held-key ghosts. `startGame()` (Sub-Phase 6.1.1) builds everything fresh.

**Files touched:** `src/renderer/ScreenManager.ts`

#### 6.2.2 — `SoundManager.resetEngine()` Method

**Problem:** After a race ends at high speed, oscillators retain high-gain/high-frequency state. Next race starts with a burst of high-RPM audio during countdown (Gap A1).

**Deepened: Extract `EngineLayer` interface** -- iterate over an array instead of repeating 3 gain/oscillator pairs:

```typescript
interface EngineLayer {
  readonly oscillator: OscillatorNode;
  readonly gain: GainNode;
  readonly idleFrequency: number;
}

// In SoundManager:
private engineLayers: EngineLayer[] = []; // populated in init()

resetEngine(): void {
  for (const layer of this.engineLayers) {
    layer.gain.gain.value = 0;
    layer.oscillator.frequency.value = layer.idleFrequency;
  }
}
```

Called in `startGame()` step 8 (before `resume()`) and in `exitRace()` step 4 (before `suspend()`).

**Deepened: Also add `resetSfx()` for tire screech + collision SFX gain nodes** -- zeros the SFX gain node that gates all one-shot sounds. Without this, a tire screech playing at race exit carries through `suspend()`/`resume()` to the next race.

**Files touched:** `src/renderer/SoundManager.ts`

#### 6.2.3 — Pause Audio Behavior

**Problem:** Engine oscillators continue during pause, producing a drone at frozen RPM (Gap A2).

**Resolution:** On pause, ramp all 3 engine layer gains to 0 over 100ms. On resume, restore gains to values matching current speed. Do NOT call `AudioContext.suspend()` — that kills all audio including the resume sound effect.

**Deepened: Must call `cancelScheduledValues()` before both pause and resume.** Without cancellation, `linearRampToValueAtTime` QUEUES (does not replace) -- rapid pause/resume within 100ms causes gain parameter conflicts and audio glitches.

```typescript
pauseEngine(): void {
  const now = this.audioCtx.currentTime;
  for (const layer of this.engineLayers) {
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.linearRampToValueAtTime(0, now + 0.1);
  }
}

resumeEngine(speed: number): void {
  const now = this.audioCtx.currentTime;
  for (const layer of this.engineLayers) {
    layer.gain.gain.cancelScheduledValues(now);
  }
  this.updateEngine(speed);
}
```

**Deepened: Note on `exponentialRampToValueAtTime`** -- it CANNOT target 0 (would be -Infinity dB). The plan's use of `linearRamp` is correct. Never substitute exponentialRamp for fade-outs.

**Deepened: Mute implementation** -- split into separate `mute()` and `unmute(volume: number)` instead of `toggleMute()`. On mute, set `masterGain.gain.value = 0`. On unmute, accept the current volume as a parameter (read from settings at call site). Do NOT cache pre-mute volume -- per Phase 4 deepening fix #5.

**Files touched:** `src/renderer/SoundManager.ts`

---

### Sub-Phase 6.3: Error Handling & Resilience

#### 6.3.1 — Boot Error Boundary

**Problem:** If asset loading, PixiJS init, or ONNX loading fails, the user sees a blank canvas or console errors (Gap E1).

**Resolution:** Wrap `main.ts` initialization in a top-level try/catch. On failure, display a DOM error message (NOT PixiJS, which may not have initialized):

**Deepened: CRITICAL XSS FIX.** Original used `${err.message}` in `innerHTML` -- injection vector. Must use `textContent` + DOM creation. Also type `err` as `unknown`.

```typescript
// src/main.ts
async function boot() {
  const app = new RendererApp();
  await app.init();
}

boot().catch((err: unknown) => {
  console.error('Fatal boot error:', err);
  const message = err instanceof Error ? err.message : 'Unknown error';

  const container = document.createElement('div');
  container.style.cssText = 'font-family:sans-serif;text-align:center;padding:40px;';

  const heading = document.createElement('h1');
  heading.textContent = 'Failed to load game';

  const detail = document.createElement('p');
  detail.textContent = message;  // textContent auto-escapes HTML

  const retry = document.createElement('button');
  retry.textContent = 'Retry';
  retry.addEventListener('click', () => location.reload());  // CSP-friendly

  container.append(heading, detail, retry);
  document.body.replaceChildren(container);
});
```

**Files touched:** `src/main.ts`

#### 6.3.2 — ONNX Model Load Failure Handling

**Problem:** If `model.onnx` or `vecnorm_stats.json` fails to load, vs-AI and spectator modes are broken (Gap E2).

**Deepened: Use tri-state `AiLoadState = 'pending' | 'loaded' | 'failed'`** instead of boolean. During `'pending'`, show mode buttons with spinner/disabled state. On `'loaded'`, enable. On `'failed'`, disable with tooltip.

**Deepened: Boot-time singleton pattern.** Load ONNX once at boot, share the session across all races. Inject the pre-loaded `BrowserAIRunner` into `GameLoop.loadTrack()` as a parameter. Eliminates per-race ONNX latency (~50-200ms). This is an explicit departure from v02's per-race creation pattern.

**Deepened: Fix asset paths for subdirectory deployment.** Use `import.meta.env.BASE_URL + 'ai/model.onnx'` (not absolute `/ai/model.onnx`). Vite's `base: './'` does NOT rewrite string literals in `fetch()` calls.

**Deepened: Pre-allocate input tensors.** Reuse a single `Float32Array` + `ort.Tensor` per frame instead of creating new ones. Verify Phase 5's `inputTensor.dispose()` fix in `try/finally` block is implemented (prevents ~3.4KB/sec WASM heap leak).

**Deepened: Configure ORT.** `ort.env.wasm.proxy = true` (offloads inference to Web Worker), `ort.env.wasm.numThreads = 1` (broad compatibility without COOP/COEP headers).

**Resolution:**
- `BrowserAIRunner.load()` called during boot (async, non-blocking)
- `aiLoadState: AiLoadState` tracks `'pending'` → `'loaded'` or `'failed'`
- `DomTrackSelect` reads `aiLoadState` — spinner during pending, disabled on failed, enabled on loaded
- Solo mode always works regardless of AI availability

**Files touched:** `src/renderer/RendererApp.ts`, `src/ai/BrowserAIRunner.ts`, `src/renderer/dom/DomTrackSelect.ts`

#### 6.3.3 — localStorage Guards

**Problem:** In private browsing mode, `localStorage.setItem()` throws on some browsers (Gap E4).

**Deepened: v02's Leaderboard already has try/catch guards** (lines 31-51 of `Leaderboard.ts`). This is NOT a v04 action item — carry v02's implementation forward unchanged.

**Deepened: Add input validation when READING from localStorage.** Tampered or corrupted values could cause runtime errors:

```typescript
function loadSettings(): GameSettings {
  try {
    const raw = JSON.parse(localStorage.getItem('settings') ?? '{}');
    return {
      volume: clamp(Number(raw.volume) || 0.7, 0, 1),
      quality: ['on', 'off'].includes(raw.quality) ? raw.quality : 'on',
      lapCount: clamp(Math.floor(Number(raw.lapCount) || 3), 1, 99),
    };
  } catch { return DEFAULT_SETTINGS; }
}
```

**Files touched:** `src/renderer/GameSettings.ts` (add validation to reads)

#### 6.3.4 — AudioContext Resilience

**Problem:** New browser `"interrupted"` state causes `resume()` to reject (Gap A3). Mute/volume state contradiction (Gap A4).

**Deepened: Simplified resilience (drop `statechange` listener).** For a portfolio project, try/catch on `resume()` is sufficient. If interrupted, game plays silently. User can reload.

**Resolution:**
- Wrap `AudioContext.resume()` in try/catch. If rejected, set `this.audioFailed = true` and skip all audio operations. Game plays silently.
- No `statechange` recovery listener — unnecessary complexity for a portfolio project.
- `SoundManager.init()` must be idempotent — no-op if `this.audioCtx` already exists (prevents leak on second race).
- Mute: separate `mute()` / `unmute(volume: number)` methods per Phase 4 deepening fix #5.

**Deepened: TypeScript note** — `"interrupted"` AudioContext state is NOT in TypeScript's `lib.dom.d.ts` `AudioContextState` union. Check for `"running"` only to avoid type errors. Cast `audioCtx.state as string` if you must check for non-standard states.

**Files touched:** `src/renderer/SoundManager.ts`

#### 6.3.5 — Tab Visibility Handler (Deepened: Gap T6 — was NEVER RESOLVED)

**Problem:** Listed as gap T6 in the problem statement but no sub-phase addressed it. When the user Alt-Tabs during a race, the browser pauses `requestAnimationFrame`. On return, the ticker fires with a massive `deltaMS`. The accumulator cap (200ms) limits physics catch-up but still causes a lurch. Audio oscillators may have drifted. Filter time uniforms jump.

**Resolution — auto-pause on visibility change:**

```typescript
// In ScreenManager constructor:
document.addEventListener('visibilitychange', () => {
  if (document.hidden && this.state === 'playing') {
    const phase = this.gameLoop?.gamePhase;
    if (phase === GamePhase.Racing || phase === GamePhase.Countdown) {
      this.gameLoop.togglePause();
    }
  }
});
```

User returns to a paused game. Presses Escape to resume. Everything is in sync — no time delta problem, no audio drift, no filter desync.

**Files touched:** `src/renderer/ScreenManager.ts`

#### 6.3.6 — WebGL Context Loss Recovery (Deepened)

**Problem:** Plan says "PixiJS v8 built-in handler" but PixiJS v8.17.0 has a known bug (#11685): **Text objects disappear after WebGL context loss and restoration.** HUD text (speedometer, lap counter, timer) would vanish.

**Resolution:** Listen for `renderer.runners.contextChange` and re-create HUD Text objects:

```typescript
app.renderer.runners.contextChange.add(() => {
  hudRenderer.rebuildText();
  // EffectsRenderer: recreate skid RenderTexture (not auto-restored)
  effectsRenderer.recreateRenderTexture();
});
```

**Files touched:** `src/renderer/RendererApp.ts`, `src/renderer/HudRenderer.ts`, `src/renderer/EffectsRenderer.ts`

---

### Sub-Phase 6.4: Performance Verification

**Deepened: Mostly verification, but 2 performance fixes should be applied here.**

#### 6.4.0 — Performance Fixes (Deepened)

Apply before verification:

1. **Disable `motionBlurFilter.enabled` when speed < threshold** — 3 lines in FilterManager update. Saves a full filter pass during ~30-40% of gameplay.
2. **Default skid RenderTexture to half-resolution (0.5x AABB)** — prevents 36MB worst-case on Track 3. At 0.5x, skid marks render as ~1px wide (still visible). Full-res is the luxury option for "On" quality tier only if performance allows.

#### 6.4.1 — 60fps Validation

For each track at "high" quality tier:
- Load the track in Solo mode
- Drive 3 laps
- Monitor PixiJS ticker FPS (exposed via `app.ticker.FPS`)
- Verify average FPS >= 58 and no frame drops below 30fps for more than 100ms

**Track 3 (Gauntlet) is the worst case** — largest geometry, largest skid RenderTexture, most varied corners generating more particles.

#### 6.4.2 — Filter Quality Tier Verification (Deepened: 2 tiers, not 3)

**Deepened: Collapsed from 3 tiers to 2.** A portfolio project doesn't need a medium tier. The meaningful toggle is "effects on" vs "effects off."

- **On (default):** Bloom + MotionBlur + DropShadow + Glow (all P0+P1 effects)
- **Off:** No filters (`container.filters = null` — zero overhead)

Settings UI: single toggle instead of dropdown. If hardware can't maintain 60fps with effects on, user toggles to off. This eliminates the need to define and test which filters belong to which tier.

#### ~~6.4.3 — VRAM Budget Audit~~ (Deepened: REMOVED)

**Deleted.** The original analysis concluded "30-50MB — well within modern GPU budgets" then proposed mitigations for a non-problem. If VRAM issues surface during the 9-combination smoke test, investigate then. The half-resolution skid texture default (6.4.0) already addresses the largest variable.

---

### Sub-Phase 6.5: Deployment Build

#### 6.5.1 — Vite Production Configuration

Verify `vite.config.ts` handles:

**Deepened: Updated for Vite 7.x** — `rollupOptions` deprecated, use `rolldownOptions`. Added `sourcemap: false` explicitly.

```typescript
export default defineConfig({
  base: './',                        // Relative paths — works in any subdirectory
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,            // Never inline assets as base64
    sourcemap: false,                // Deepened: explicit, no source map leakage
  },
  assetsInclude: ['**/*.onnx'],      // Include ONNX as asset
  optimizeDeps: {
    include: ['pixi.js'],            // Deepened: pre-bundle PixiJS for faster dev
    exclude: ['onnxruntime-web'],    // Don't pre-bundle ORT (has WASM files)
  },
  // ORT WASM plugin (from Phase -1) — keep configureServer middleware for dev,
  // REMOVE writeBundle hook (redundant with copy-ort-wasm.cjs pre-build script)
});
```

**Key:** `base: './'` ensures the build works whether deployed to `example.com/` or `example.com/racer/`.

#### 6.5.2 — WASM File Handling

**Deepened: CRITICAL — ship only jsep WASM variant.** All ORT WASM variants total ~78MB. Only the `.jsep` variant is used by modern browsers. One-line filter change saves ~55MB:

```javascript
// In copy-ort-wasm.cjs:
const files = fs.readdirSync(src).filter(f => f.startsWith('ort-wasm-simd-threaded.jsep'));
```

**Deepened: Remove WASM copy redundancy.** Both `copy-ort-wasm.cjs` AND the Vite `writeBundle` hook copy WASM files. Keep only the pre-build script (also needed for dev serving via `public/`). Remove the `writeBundle` hook from `ortWasmPlugin`.

ORT WASM files must be in the build output:
- `scripts/copy-ort-wasm.cjs` copies jsep WASM variant to `public/assets/ort/`
- Vite copies all `public/` contents to `dist/` during build
- Static hosts all serve `.wasm` with correct MIME type by default

**Build script in `package.json`:**
```json
"build": "node scripts/copy-ort-wasm.cjs && tsc --noEmit && vite build"
```

#### 6.5.3 — Google Fonts Strategy

Keep the CDN link in `index.html`. Add a CSS fallback stack:

```css
font-family: 'Orbitron', 'Segoe UI', system-ui, sans-serif;
```

**Deepened: Drop the 3-second font timeout.** CSS fallback stacks handle font unavailability automatically — that is what they do. A JavaScript `Promise.race` timeout adds a race condition (font arrives at 3.1s → flash of font swap mid-menu). Just `await document.fonts.ready` alongside `Assets.load()` in parallel. If CDN is down, the browser renders with the next available font immediately.

#### 6.5.4 — Build Output Audit

After `pnpm run build`, verify `dist/` contains:

```
dist/
  index.html
  assets/
    main-[hash].js              (bundled game code)
    main-[hash].css             (if any extracted CSS)
    sprites/
      cars-atlas.png
      cars-atlas.json
    tracks/
      track01-bg.png
      track02-bg.png
      track03-bg.png
    textures/
      asphalt-tile.png
      grass-tile.png
      curb-tile.png
    ui/
      menu-bg.png
    ort/
      ort-wasm-simd-threaded.wasm
      (other ORT WASM variants)
  ai/
    model.onnx
    vecnorm_stats.json
```

**Deepened: Corrected build size estimate.** Original said 30-60MB but excluded ORT WASM files. Actual breakdown:

| Component | Size |
|-----------|------|
| ORT jsep WASM (after variant pruning) | ~25MB |
| Track PNGs (3x 2048x2048) | ~15-24MB |
| JS bundle (PixiJS + game) | ~1.5MB |
| Car atlas + tiles + menu assets | ~5MB |
| ONNX model + vecnorm stats | ~50KB |
| **Total (PNG tracks)** | **~47-56MB** |
| **Total (WebP tracks)** | **~35-40MB** |

**Deepened: Convert track PNGs to WebP as a 6.5 task** — PixiJS v8 supports WebP natively. Reduces track assets from 15-24MB to 6-12MB. This is a build pipeline task, not a runtime change.

#### 6.5.5 — Static Server Verification

```bash
pnpm run build
npx serve dist -l 3000
# Open http://localhost:3000 — verify game loads and plays
```

This catches any path resolution issues that only appear in production builds.

---

### Sub-Phase 6.6: Integration Smoke Tests

#### 6.6.1 — Automated Build Verification Tests

Add to Vitest (headless, no PixiJS):

```
tests/integration/build-verification.test.ts
```

**Deepened: Run as separate script** `"test:build": "vitest run tests/integration/"` — these require `dist/` to exist and should NOT run during normal `pnpm test`.

Tests:
- [ ] `dist/index.html` exists after `pnpm run build`
- [ ] All asset manifest entries resolve to real files in `dist/`
- [ ] `dist/ai/model.onnx` exists and is > 10KB and < 100KB (Deepened: upper bound catches bloated models)
- [ ] `dist/ai/vecnorm_stats.json` exists and is valid JSON
- [ ] ORT WASM files exist in `dist/assets/ort/` and are > 1MB each (Deepened: catches truncated copies)
- [ ] All 3 track backgrounds exist in `dist/assets/tracks/`
- [ ] Car atlas exists in `dist/assets/sprites/`
- [ ] No `.env` or `.env.*` files in `dist/`
- [ ] Total `dist/` size < 80MB (Deepened: catches asset bloat before deploy)
- [ ] No `.ts` or `.d.ts` files in `dist/` (Deepened: v02 had tsc emission pollution)
- [ ] No `.map` files in `dist/` (Deepened: source maps disabled)

#### 6.6.2 — Manual 9-Combination Smoke Test Checklist

For each of the 9 combinations (Track 1/2/3 x Solo/vs-AI/Spectator), verify:

**Track Loading:**
- [ ] Track background renders (no white/black canvas)
- [ ] Road surface texture tiles correctly
- [ ] Grass and curb textures visible
- [ ] No visual artifacts at track boundaries

**Car Rendering:**
- [ ] Player car sprite visible and rotates smoothly (Solo, vs-AI)
- [ ] Player car hidden in Spectator
- [ ] AI car visible with glow effect (vs-AI, Spectator)
- [ ] AI car hidden in Solo
- [ ] Cars cast drop shadows

**HUD:**
- [ ] Speedometer needle moves with car speed
- [ ] Lap counter shows correct current/total (matches lap count setting)
- [ ] Timer counts up during race
- [ ] Best lap displays after first lap completion
- [ ] Minimap shows track outline + car dot(s) appropriate to mode
- [ ] Position indicator shows in vs-AI mode only

**Audio:**
- [ ] Engine sound starts at idle during countdown
- [ ] Engine pitch increases with speed
- [ ] Tire screech on hard cornering
- [ ] Checkpoint chime on checkpoint crossing
- [ ] No audio burst on race start (SoundManager.resetEngine working)
- [ ] Audio silences on pause

**Post-Processing:**
- [ ] Bloom visible on car/headlights
- [ ] Motion blur visible at high speed
- [ ] Effects absent in "low" quality tier

**Race Flow:**
- [ ] Countdown 3-2-1-GO plays correctly
- [ ] Race completes on final lap (or AI final lap in Spectator)
- [ ] Results screen shows lap times, best lap, medal
- [ ] Leaderboard updates in Solo and vs-AI (NOT Spectator)
- [ ] "Continue" returns to track select
- [ ] Best times refresh on track select screen

**Pause/Resume:**
- [ ] Escape pauses during racing
- [ ] Escape resumes during pause
- [ ] "Quit" from pause returns to track select
- [ ] Engine audio silences on pause, resumes on unpause

**Second Race:**
- [ ] Starting a new race after completing one works cleanly
- [ ] No stale textures, audio, or HUD data from previous race
- [ ] Switching tracks between races loads correct assets

#### 6.6.3 — Edge Case Verification

- [ ] Rapid track switching: select Track 1, immediately switch to Track 3 before loading completes
- [ ] Double-click START: only one race starts (`transitioning` guard)
- [ ] Escape during countdown: ignored (not pause)
- [ ] Full lap count range: set lap count to 1, verify race ends after 1 lap; set to 99, verify counter shows correctly
- [ ] Settings persistence: change volume + quality + laps, refresh browser, verify settings restored
- [ ] Leaderboard persistence: set a best time, refresh browser, verify it appears on track select
- [ ] Browser resize during gameplay: canvas resizes, HUD repositions
- [ ] Tab switch during race: return to tab, game continues without crash

---

### Sub-Phase 6.7: Final Acceptance

Human play-through by Briggsy. This is the spec's success gate:

> A human who has never seen v02 should look at v04 and say: "That looks like a real game."

**Acceptance criteria from spec:**

| Criterion | Pass/Fail |
|-----------|-----------|
| Car sprites: High-res, visually distinct player vs AI | |
| Track art: All 3 look like racing circuits, not geometry tests | |
| Track 2: Longer, high-speed, distinct from v02 | |
| Track 3: Mixed-radius corners, no two the same | |
| AI generalization: v02 ONNX fails Track 3, v04 model completes it | |
| Post-processing: Bloom visible, motion blur at speed, no perf drop | |
| Menu: Could pass for a commercial game's main screen | |
| HUD: Speedometer, lap timer, mini-map all functional and readable | |
| Performance: 60fps with all effects active | |
| Build integrity: Zero hand-written game code | |

---

## System-Wide Impact

### Interaction Graph

```
User clicks START on DomTrackSelect
  → DomTrackSelect.onStartGame(trackId, mode) fires
  → ScreenManager.startGame(trackId, mode) — the 21-step canonical sequence
    → AssetManager.loadTrack()  → PixiJS Assets.load()
    → SoundManager.init/reset/resume  → AudioContext lifecycle
    → GameLoop.loadTrack()  → Engine World creation
    → WorldRenderer.create()  → container hierarchy + sprites
    → EffectsRenderer.reset()  → sprite pool + RenderTexture
    → FilterManager.attach()  → filters on worldContainer/carLayer
    → HudRenderer.reset/setMode()  → HUD state
    → OverlayRenderer.startCountdown()  → countdown sequence
    → PixiJS Ticker fires  → GameLoop.tick()
      → Engine world.step()  → physics
      → BrowserAIRunner.infer()  → ONNX inference (if AI mode)
      → WorldRenderer.render()  → visual state
      → HudRenderer.update()  → HUD state
      → SoundManager.update()  → audio state
      → EffectsRenderer.update()  → particles + skids
      → Leaderboard.checkBestTime()  → localStorage write
```

### Error Propagation

| Error Source | Caught Where | Recovery |
|-------------|-------------|----------|
| Asset load failure | `boot().catch()` in main.ts | DOM error message + retry button |
| ONNX load failure | `BrowserAIRunner.load()` | `aiAvailable = false`, disable AI modes |
| AudioContext blocked | `SoundManager.resume()` catch | `audioFailed = true`, silent gameplay |
| localStorage full/blocked | try/catch in Leaderboard | No-op, game continues |
| WebGL context loss | PixiJS v8 built-in handler | Auto-restore on `webglcontextrestored` |

### State Lifecycle Risks

**Between-race cleanup** is the primary risk. If any step in `exitRace()` is missed, the second race inherits stale state. The complete checklist (Sub-Phase 6.2.1) is the mitigation. Testing verifies by running two consecutive races.

**Spectator mode data integrity** is the second risk. The leaderboard guard (always read from original un-dispatched human world state) prevents AI times corrupting human bests. This is verified by the 9-combination smoke test.

### API Surface Parity

All game modes share the same `startGame()` and `exitRace()` entry points. Mode-specific behavior is handled by branching inside these methods (e.g., `if mode === 'spectator'`), not by separate code paths. This ensures all modes get the same initialization and cleanup.

---

## Acceptance Criteria

### Functional Requirements

- [ ] All 9 track x mode combinations complete a full race without errors
- [ ] Second consecutive race works identically to first (between-race cleanup verified)
- [ ] Lap count setting correctly controls race length
- [ ] Escape key behaves correctly in every game state
- [ ] "Continue" from results returns to track select
- [ ] Spectator mode: camera follows AI, no player dot on minimap, no leaderboard write
- [ ] vs-AI mode: both cars visible, position indicator works, both leaderboard entries write
- [ ] Solo mode: no AI car, no position indicator, leaderboard writes

### Non-Functional Requirements

- [ ] 60fps average on all tracks at "high" quality
- [ ] No frame drops below 30fps for more than 100ms
- [ ] Boot-to-menu time < 3 seconds on localhost
- [ ] `pnpm run build` succeeds without errors
- [ ] `dist/` serves correctly from static host
- [ ] Game degrades gracefully: ONNX fail → AI modes disabled, audio fail → silent, localStorage fail → no persistence

### Quality Gates

- [ ] All existing tests pass (377+ engine/AI tests + Phase 1 asset tests + Phase 5 config sync test)
- [ ] Build verification tests pass (Sub-Phase 6.6.1)
- [ ] 9-combination smoke test checklist all green (Sub-Phase 6.6.2)
- [ ] Edge case verification all green (Sub-Phase 6.6.3)
- [ ] Briggsy final acceptance sign-off (Sub-Phase 6.7)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Crash-free 9-combo sweep | 0 crashes | Manual play-through |
| FPS on Track 3 (worst case) | >= 58 avg | PixiJS ticker FPS readout |
| Build size | < 60MB | `du -sh dist/` |
| Boot time | < 3s | Stopwatch, localhost |
| Test pass rate | 100% | `pnpm test` |
| Second-race clean | Zero stale state | Play 2 races back-to-back, different tracks |

---

## Dependencies & Prerequisites

| Dependency | Phase | Status |
|-----------|-------|--------|
| Frozen engine + all tests green | Phase -1 | Plan complete (deepened) |
| All assets generated + processed | Phase 0 + 1 | Plans complete (deepened) |
| Renderer with container hierarchy | Phase 2 | Plan complete (deepened) |
| Post-processing filters + sprite pool | Phase 3 | Plan complete (deepened) |
| DOM menus + PixiJS HUD + audio | Phase 4 | Plan complete (deepened) |
| ONNX model trained + exported | Phase 5 | Plan complete (deepened) |

**Phase 6 can only execute after ALL prior phases have been built and individually tested.**

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Spectator mode dispatch breaks with Phase 2's dual-renderer | Medium | High | Follow v02's dispatch-swap pattern exactly; test spectator mode first |
| Second-race stale state | High | Medium | Complete cleanup checklist; always test 2 consecutive races |
| Track 3 performance below 60fps | Low | Medium | FilterManager quality fallback to "medium"; reduce skid texture resolution |
| ONNX model too large for browser | Low | High | Phase 5 targets ≤50KB; if exceeded, quantize model |
| Google Fonts CDN unavailable | Low | Low | CSS fallback stack with system fonts; boot timeout |
| AudioContext blocked by browser policy | Medium | Low | Graceful degradation — game plays silently |

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: all 3 story threads equal weight, skip Google Stitch, AI scripts from v02 verbatim, fully autonomous SDLC

### Internal References

- **Spec (success criteria, ADRs):** `docs/Top-Down-Racer-v04-CE-Spec.md`
- **Phase -1 plan:** `docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md`
- **Phase 0 plan:** `docs/plans/2026-03-11-feat-phase-0-asset-generation-plan.md`
- **Phase 1 plan:** `docs/plans/2026-03-11-feat-phase-1-asset-pipeline-track-redesign-plan.md`
- **Phase 2 plan:** `docs/plans/2026-03-11-feat-phase-2-core-visual-upgrade-plan.md`
- **Phase 3 plan:** `docs/plans/2026-03-12-feat-phase-3-post-processing-effects-plan.md`
- **Phase 4 plan:** `docs/plans/2026-03-12-feat-phase-4-commercial-ui-audio-plan.md`
- **Phase 5 plan:** `docs/plans/2026-03-12-feat-phase-5-ai-retraining-validation-plan.md`
- **v02 ScreenManager (integration reference):** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\renderer\ScreenManager.ts`
- **v02 GameLoop (spectator dispatch):** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\renderer\GameLoop.ts`

### SpecFlow Analysis

Phase 6 SpecFlow analysis identified 20+ gaps across 6 categories (Spectator, Audio, State Transitions, Error Recovery, Performance, Deployment). All critical gaps are resolved in this plan. Key gaps addressed:
- S1-S4: Spectator mode rendering, camera, minimap, leaderboard
- A1-A4: Engine reset, pause audio, AudioContext resilience, mute state
- T1-T6: Lap count, escape routing, overlay bridge, filter reattach, cleanup, tab visibility
- E1-E4: Boot boundary, ONNX fallback, localStorage, WebGL context
- D1-D4: Vite config, WASM serving, fonts, build audit
