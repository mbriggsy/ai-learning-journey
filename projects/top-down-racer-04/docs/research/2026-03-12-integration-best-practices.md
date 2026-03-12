# Multi-Subsystem Browser Game Integration: Best Practices Research

**Date:** 2026-03-12
**Context:** Top-Down Racer v04 -- TypeScript + PixiJS v8 (WebGL) racing game
**Scope:** 8 research topics covering initialization, lifecycle, audio, AI inference, rendering, UI, error handling, and deployment

---

## Table of Contents

1. [Game Initialization Sequence](#1-game-initialization-sequence)
2. [Between-Race Lifecycle Cleanup](#2-between-race-lifecycle-cleanup)
3. [Web Audio API Lifecycle Management](#3-web-audio-api-lifecycle-management)
4. [ONNX Runtime Web Deployment](#4-onnx-runtime-web-deployment)
5. [PixiJS v8 Production Deployment](#5-pixijs-v8-production-deployment)
6. [DOM + WebGL Hybrid UI Patterns](#6-dom--webgl-hybrid-ui-patterns)
7. [Browser Game Error Handling](#7-browser-game-error-handling)
8. [Static Site Deployment for WebGL Games](#8-static-site-deployment-for-webgl-games)

---

## 1. Game Initialization Sequence

### The Problem

A racing game with 6+ async subsystems (PixiJS renderer, asset loading, audio context, ONNX model, DOM menus, game engine) needs a deterministic boot order. Getting this wrong produces race conditions, blank screens, or partially initialized state.

### Best Practice: Phased Boot with Progress Reporting

Production browser games use a phased initialization pattern where subsystems are grouped into dependency tiers. Each tier completes before the next begins, while independent subsystems within a tier load in parallel.

```typescript
async function boot(): Promise<void> {
  // === TIER 0: Platform (nothing depends on anything) ===
  const app = new Application();
  await app.init({
    resizeTo: window,
    backgroundColor: 0x1a1a1a,
    antialias: true,
    preference: 'webgl',   // Explicit: no WebGPU fallback attempts
  });
  document.body.appendChild(app.canvas);

  // === TIER 1: Loading screen (needs canvas only) ===
  const loadingScreen = new LoadingScreen(app);
  loadingScreen.show();

  // === TIER 2: Parallel asset + subsystem init ===
  // These have no interdependencies, so run concurrently
  const [_assets, _fonts, aiAvailable] = await Promise.allSettled([
    // Asset loading (textures, spritesheets)
    Assets.init({ basePath: 'assets/' })
      .then(() => Assets.load(CORE_BUNDLE))
      .then(() => loadingScreen.progress(0.4)),

    // Font loading with timeout
    Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]).then(() => loadingScreen.progress(0.5)),

    // ONNX model pre-load (non-blocking -- failure disables AI modes)
    preloadAIModel()
      .then(() => { loadingScreen.progress(0.6); return true; })
      .catch(() => false),
  ]);

  // === TIER 3: Subsystem construction (needs loaded assets) ===
  const soundManager = new SoundManager();          // AudioContext NOT created yet
  const gameLoop = new GameLoop(TRACKS[0].controlPoints);
  const screenManager = new ScreenManager({
    app, gameLoop, soundManager,
    aiAvailable: aiAvailable.status === 'fulfilled' && aiAvailable.value,
  });
  loadingScreen.progress(1.0);

  // === TIER 4: Hand off to menu ===
  loadingScreen.hide();
  screenManager.showMainMenu();
  // AudioContext created later on first user gesture
}
```

### Key Principles

**1. Never block boot on optional subsystems.** ONNX model loading and font loading use `Promise.allSettled` or `Promise.race` with timeouts. If they fail, the game still boots -- AI modes are disabled and system fonts are used.

**2. Show a loading screen immediately.** The canvas should display a loading indicator within the first 100ms. Build the loading screen with basic PixiJS Graphics (no asset dependencies). This is already done well in v02.

**3. Defer AudioContext creation.** Do NOT create an AudioContext during boot. Browser autoplay policy requires a user gesture. Create it lazily on the first click/keydown that enters gameplay. The SoundManager constructor should be a no-op; the actual `AudioContext` is created in `init()`.

**4. Upload textures to GPU before gameplay.** After `Assets.load()` resolves, the textures are in CPU memory. Use `app.renderer.prepare.upload(texture)` to push them to GPU memory before the race starts, preventing first-frame stutter.

```typescript
// In startGame(), after loading track-specific assets:
const trackBg = Assets.get<Texture>(`track${trackId}-bg`);
await app.renderer.prepare.upload(trackBg);
```

**5. Validate subsystem readiness before transitions.** Before transitioning from menu to gameplay, assert that all required subsystems are initialized:

```typescript
private canStartRace(mode: GameMode): boolean {
  if (mode !== 'solo' && !this.aiAvailable) return false;
  if (!Assets.cache.has(`track${this.selectedTrack}-bg`)) return false;
  return true;
}
```

### v04-Specific Application

The Phase 6 plan's 21-step `startGame()` sequence (Sub-Phase 6.1.1) already follows this phased pattern. The key addition from research: use `Promise.allSettled` for Tier 2 to handle partial failures gracefully, and add `app.renderer.prepare.upload()` after asset loading to prevent GPU upload stutter on the first frame of gameplay.

---

## 2. Between-Race Lifecycle Cleanup

### The Problem

The most common source of bugs in level-based games is stale state surviving between levels/races. Audio oscillators retain high-frequency state, particle emitters keep spawning, textures from the previous track consume VRAM, and timing data bleeds into the next race.

### Best Practice: Symmetric Init/Teardown with Checklist Verification

The industry pattern is to make `exitRace()` the exact inverse of `startGame()`, executed in reverse order. Every resource created during `startGame()` has a corresponding cleanup step.

```typescript
exitRace(): void {
  // === Reverse order of startGame() ===

  // 1. Stop the game loop FIRST (prevents new state from being generated)
  this.stopTicker();

  // 2. Hide gameplay containers
  this.worldContainer.visible = false;
  this.hudContainer.visible = false;

  // 3. Audio: reset THEN suspend (reset while context is running)
  this.soundManager.resetEngine();   // Zero all gains, reset frequencies
  this.soundManager.suspend();       // Suspend AudioContext

  // 4. Effects: clear all accumulated state
  this.effectsRenderer.reset();      // Clear skid RenderTexture, return particles to pool

  // 5. Filters: detach from containers
  this.filterManager.detach();       // Remove filter array from worldContainer

  // 6. Renderer: tear down container children
  this.worldRenderer.destroy();      // Remove all children, don't destroy shared textures

  // 7. Free track-specific VRAM
  await Assets.unload(`track${this.currentTrack}-bg`);

  // 8. Reset tracking state
  this.lastBestLapTicks = 0;
  this.lastAiBestLapTicks = 0;

  // 9. Reset engine state
  this.gameLoop.reset();

  // 10. Show menus
  this.domOverlay.show();
  this.trackSelect.show();
}
```

### Key Principles

**1. Stop producing state before cleaning it.** The ticker/game loop must stop before any cleanup begins. Otherwise, the game loop generates new state while you are tearing down old state, causing race conditions.

**2. Distinguish shared vs. per-race resources.** Car sprite atlases are shared across races (loaded once at boot). Track backgrounds are per-race (loaded when a specific track is selected). Only unload per-race resources in `exitRace()`. The PixiJS `Assets.unload()` call handles this cleanly.

```typescript
// SHARED (loaded at boot, never unloaded between races):
//   - Car sprite atlas
//   - Tile textures (asphalt, grass, curb)
//   - UI assets

// PER-RACE (loaded per track, unloaded between races):
//   - Track background PNG (2048x2048, ~16MB VRAM)
```

**3. RenderTexture accumulation must be explicitly cleared.** Skid marks in v04 use a RenderTexture that accumulates over the race. Between races, this texture must be cleared to a fully transparent state:

```typescript
// In EffectsRenderer.reset():
const rt = this.skidRenderTexture;
this.renderer.render({ container: new Container(), target: rt, clear: true });
```

**4. Audio oscillators need hard resets, not ramps.** Between races, do NOT use `setTargetAtTime` (exponential decay) -- use direct `.value` assignment for instant reset. Ramps leave residual gain/frequency during the next race's countdown:

```typescript
resetEngine(): void {
  // HARD reset -- no ramps, instant zero
  if (this.idleGain) this.idleGain.gain.value = 0;
  if (this.midGain) this.midGain.gain.value = 0;
  if (this.highGain) this.highGain.gain.value = 0;
  if (this.idleOsc) this.idleOsc.frequency.value = IDLE_FREQ;
}
```

**5. ONNX session disposal prevents WASM memory leaks.** v02 already does this correctly in `GameLoop.loadTrack()`:

```typescript
// Dispose previous AI runner to free WASM memory
if (this.aiRunner) {
  await this.aiRunner.dispose();
  this.aiRunner = null;
}
```

**6. Test with the "double race" pattern.** Every integration test should play TWO consecutive races on DIFFERENT tracks. If the second race works identically to the first, cleanup is correct. This is the single most effective test for stale state.

### v04-Specific Application

The Phase 6 plan's `exitRace()` checklist (Sub-Phase 6.2.1) covers all these points. The research validates the approach and adds the emphasis on hard audio resets and the shared-vs-per-race resource distinction.

---

## 3. Web Audio API Lifecycle Management

### The Problem

Web Audio in a browser game has four distinct challenges: autoplay policy blocks, the iOS Safari "interrupted" state, pause/resume without killing effects, and oscillator node cleanup for long-running sessions.

### Best Practice: Lazy Init + State Machine + Resilient Resume

#### 3.1 Autoplay Policy Handling

**Rule:** Never create an AudioContext before a user gesture. Create it on the first click/keydown that leads to gameplay.

```typescript
class SoundManager {
  private ctx: AudioContext | null = null;
  private initialized = false;

  // Called from main.ts on first user interaction
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.buildAudioGraph();
      this.initialized = true;
    } catch {
      // Web Audio not supported -- game plays silently
      console.warn('Web Audio API not available');
    }
  }
}

// In main.ts or ScreenManager:
const initAudio = () => {
  soundManager.init();
  window.removeEventListener('click', initAudio);
  window.removeEventListener('keydown', initAudio);
};
window.addEventListener('click', initAudio);
window.addEventListener('keydown', initAudio);
```

This is exactly the pattern v02 uses, and it is correct. Do not change it.

#### 3.2 The "interrupted" State (iOS Safari)

Safari on iOS introduces a fourth AudioContext state: `"interrupted"`. This occurs when the user switches tabs, minimizes the browser, or receives a phone call. The context cannot be resumed until the user returns to the tab.

```typescript
// Resilient resume that handles all 4 states
private safeResume(): void {
  if (!this.ctx) return;

  const state = this.ctx.state;
  if (state === 'running') return;
  if (state === 'closed') return;  // Cannot resume a closed context

  // Handles both 'suspended' (autoplay) and 'interrupted' (iOS)
  if (state === 'suspended' || state === 'interrupted') {
    if (this.resumeInFlight) return;  // Prevent 60 resume() calls/sec
    this.resumeInFlight = true;
    this.ctx.resume()
      .then(() => { this.resumeInFlight = false; })
      .catch(() => {
        this.resumeInFlight = false;
        // If resume fails, set flag -- game plays silently
        this.audioFailed = true;
      });
  }
}
```

**Critical:** The `resumeInFlight` guard (already in v02 as `resumeRequested`) prevents calling `resume()` 60 times per second in the game loop. Without this guard, each frame creates a new unresolved Promise, which degrades performance.

#### 3.3 Pause/Resume Pattern

When the game pauses, engine oscillators should silence but NOT stop. Stopping oscillators means you need to create new ones on resume, which is expensive and can produce clicks.

```typescript
pauseAudio(): void {
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  // Ramp to zero over 100ms (smooth fade, no click)
  this.engineGain?.gain.linearRampToValueAtTime(0, now + 0.1);
  this.screechGain?.gain.linearRampToValueAtTime(0, now + 0.1);
  // Do NOT call ctx.suspend() -- that kills all audio including UI sounds
}

resumeAudio(currentSpeed: number): void {
  if (!this.ctx) return;
  // Recalculate gains from current speed, apply immediately
  this.updateEngineSound(currentSpeed, true);
}
```

**Do NOT use `ctx.suspend()`/`ctx.resume()` for pause.** Use gain ramps. Reserve `ctx.suspend()`/`ctx.resume()` only for screen transitions (gameplay to menu).

#### 3.4 Statechange Listener for Recovery

```typescript
// In SoundManager.init(), after creating AudioContext:
this.ctx.addEventListener('statechange', () => {
  if (this.ctx?.state === 'running') {
    this.audioFailed = false;  // Clear failure flag on recovery
  }
});
```

#### 3.5 One-Shot Node Cleanup

Every one-shot sound (impact, beep, chime) creates temporary oscillator and gain nodes. These must be disconnected after use to prevent memory growth over long sessions:

```typescript
// v02 already does this correctly:
osc.onended = () => { osc.disconnect(); gain.disconnect(); };
```

This pattern is correct. The key rule: always set `onended` before calling `start()`, and always call `stop()` with a finite time so the `ended` event fires.

### v04-Specific Application

v02's SoundManager is already well-structured. For v04, the upgrades are:
- Add the `"interrupted"` state handling in `safeResume()`
- Add `statechange` listener for automatic recovery
- Use gain ramps for pause (not `ctx.suspend()`)
- Add `resetEngine()` for between-race hard reset (Phase 6 plan covers this)

---

## 4. ONNX Runtime Web Deployment

### The Problem

ONNX Runtime Web uses WebAssembly for CPU inference. The WASM binaries need correct serving configuration, the model needs to load without blocking the UI, and inference must not cause frame drops during 60fps gameplay.

### Best Practice: Single-Thread WASM + Backpressure + Model Pre-Load

#### 4.1 WASM Configuration

```typescript
import * as ort from 'onnxruntime-web';

// MUST be set BEFORE any InferenceSession.create()
if (ort.env?.wasm) {
  // Point to where WASM files are served
  ort.env.wasm.wasmPaths = '/assets/ort/';

  // Single thread: avoids crossOriginIsolated requirement
  // For a 23KB MLP model, multi-threading has zero benefit
  ort.env.wasm.numThreads = 1;

  // Do NOT enable proxy worker for tiny models --
  // the overhead of message passing exceeds inference time
  ort.env.wasm.proxy = false;
}
```

**Why single thread:** Multi-threading requires `crossOriginIsolated` mode (COOP/COEP headers), which breaks many CDN-served assets and third-party resources. For a model under 50KB, single-threaded WASM inference completes in under 1ms -- threading overhead would be larger than the computation.

#### 4.2 Model Loading Strategy

```typescript
async load(modelUrl: string, statsUrl: string): Promise<void> {
  const [session, statsJson] = await Promise.all([
    ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',    // Maximize optimization for tiny model
      enableCpuMemArena: true,          // Reuse memory across inference calls
      enableMemPattern: true,           // Pattern-based memory allocation
    }),
    fetch(statsUrl).then(r => {
      if (!r.ok) throw new Error(`Stats load failed: ${r.status}`);
      return r.json();
    }),
  ]);
  this.session = session;
  this.stats = statsJson;
}
```

**Load during boot, not during race start.** Pre-load the ONNX model during the Tier 2 parallel boot phase. If loading fails, set `aiAvailable = false` and disable vs-AI/Spectator modes in the UI. Solo mode must always work.

#### 4.3 Inference Backpressure Pattern

v02 already implements this correctly. The pattern prevents inference calls from stacking up if a frame takes longer than expected:

```typescript
// In GameLoop.tick():
if (this.aiWorld && this.aiRunner?.loaded && !this.aiInferInFlight) {
  const seq = ++this.aiInferSeq;
  this.aiInferInFlight = true;

  this.aiRunner.infer(observation).then(action => {
    if (seq === this.aiInferSeq) {  // Discard stale results
      this.aiAction = action;
    }
    this.aiInferInFlight = false;
  }).catch(err => {
    if (!this.aiInferErrorLogged) {
      console.warn('AI inference error:', err);
      this.aiInferErrorLogged = true;  // Log once, not 60/sec
    }
    this.aiInferInFlight = false;
  });
}
```

Key elements:
- **`aiInferInFlight` guard:** Only one inference in flight at a time
- **Sequence number:** Discard results from stale requests (e.g., after track change)
- **Log-once error guard:** Prevents console flooding at 60fps
- **The AI uses last-known-good action** while inference is in flight

#### 4.4 Tensor Disposal

ONNX Runtime allocates WASM-backed typed arrays for output tensors. These must be explicitly disposed to prevent memory growth:

```typescript
const results = await this.session.run({ obs: inputTensor });
const actions = results['actions'].data as Float32Array;

// Extract values BEFORE disposing
const output: [number, number, number] = [
  clamp(actions[0], -1, 1),
  clamp(actions[1], 0, 1),
  clamp(actions[2], 0, 1),
];

// Dispose ALL output tensors immediately
for (const key of Object.keys(results)) {
  results[key].dispose?.();
}
```

#### 4.5 Session Disposal Between Races

When switching tracks or exiting a race, dispose the ONNX session to free WASM memory:

```typescript
async dispose(): Promise<void> {
  if (this.session) {
    await this.session.release();
    this.session = null;
    this.stats = null;
  }
}
```

#### 4.6 Vite Configuration for ONNX

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web'],  // Don't pre-bundle ORT
  },
  assetsInclude: ['**/*.onnx'],    // Treat .onnx as static asset
});
```

Additionally, copy WASM files to public directory during build:

```javascript
// scripts/copy-ort-wasm.cjs
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/onnxruntime-web/dist');
const dest = path.join(__dirname, '../public/assets/ort');

fs.mkdirSync(dest, { recursive: true });

// Copy only the variants we need
const files = ['ort-wasm-simd-threaded.wasm'];
for (const file of files) {
  if (fs.existsSync(path.join(src, file))) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}
```

### v04-Specific Application

v02's `BrowserAIRunner` is already production-grade. For v04:
- Keep `numThreads = 1` (avoid COOP/COEP complexity)
- Pre-load during boot, not during race start
- Keep the backpressure + sequence number pattern unchanged
- Add the `copy-ort-wasm.cjs` script to the build pipeline

---

## 5. PixiJS v8 Production Deployment

### 5.1 WebGL Context Loss Handling

**Reality check:** PixiJS v8 does not have fully reliable automatic recovery from WebGL context loss. The browser can lose the WebGL context due to GPU driver crashes, memory pressure, or tab management. Recovery requires all GPU resources to be re-uploaded, and PixiJS's internal recovery has known edge cases (text disappearing, sprites not re-rendering).

**Recommended pattern: Detect and reload.**

```typescript
// After app.init(), listen for context loss
const canvas = app.canvas;

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();  // Prevent immediate context destruction
  console.error('WebGL context lost');

  // Show a DOM-based overlay (PixiJS can't render anymore)
  showContextLostOverlay();
});

canvas.addEventListener('webglcontextrestored', () => {
  // In production, a full page reload is more reliable than
  // trying to restore all GPU state
  location.reload();
});

function showContextLostOverlay(): void {
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:#000;color:#fff;
                display:flex;align-items:center;justify-content:center;
                font-family:sans-serif;z-index:9999;">
      <div style="text-align:center;">
        <h2>Graphics context lost</h2>
        <p>The game will reload automatically...</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
```

**Why not try to recover in-place:** For a racing game with filter chains, RenderTextures, sprite atlases, and dynamic content, the re-initialization needed after context restoration is essentially equivalent to a full boot. A clean reload is simpler, more reliable, and takes the same amount of time.

### 5.2 Texture Memory Management

#### Pre-upload Textures Before Gameplay

```typescript
// After Assets.load(), push textures to GPU
const trackBg = Assets.get<Texture>('track01-bg');
await app.renderer.prepare.upload(trackBg);
```

This eliminates the "first frame stutter" where the GPU uploads a 2048x2048 texture mid-render.

#### Garbage Collection Configuration

```typescript
await app.init({
  // ... other options
  textureGCActive: true,
  textureGCMaxIdle: 3600,      // ~60 seconds at 60fps (default)
  textureGCCheckCountMax: 600,  // Check every 10 seconds (default)
});
```

Defaults are fine for a racing game. The GC removes textures unused for ~60 seconds, which means track backgrounds from a previous race will be cleaned up naturally.

#### Explicit Unload for Large Assets

For 2048x2048 track backgrounds (~16MB VRAM each), do not rely on GC timing. Unload explicitly when switching tracks:

```typescript
// In exitRace():
await Assets.unload(`track${this.currentTrackId}-bg`);
```

#### VRAM Budget Awareness

Known issue: PixiJS v8 has a reported VRAM management regression compared to v7, particularly on iOS Safari where available VRAM is limited. Monitor total VRAM usage:

| Asset | Size | VRAM |
|-------|------|------|
| Track background (2048x2048 RGBA) | ~16MB | ~16MB |
| Car atlas (512x512 RGBA) | ~1MB | ~1MB |
| Tile textures (asphalt, grass, curb) | ~1.5MB | ~1.5MB |
| Skid RenderTexture (variable) | 4-16MB | 4-16MB |
| Filter render targets (~screen-size per filter) | ~8MB each | ~24MB |
| **Peak total (Track 3, all filters)** | | **~58MB** |

This is well within desktop GPU budgets but may stress mobile integrated GPUs. The quality tier system (low = no filters) provides the escape valve.

### 5.3 Filter Performance

#### Core Optimization Rules

```typescript
// 1. REUSE filter instances -- do not recreate per frame
const bloomFilter = new BloomFilter({ strength: 4 });
const motionBlurFilter = new MotionBlurFilter({ velocity: { x: 0, y: 0 } });
worldContainer.filters = [bloomFilter, motionBlurFilter];

// 2. Set filterArea to avoid bounds measurement overhead
worldContainer.filterArea = new Rectangle(0, 0, screenWidth, screenHeight);

// 3. Disable filters when not needed (e.g., car is stationary)
if (speed < 1) {
  motionBlurFilter.enabled = false;
} else {
  motionBlurFilter.enabled = true;
  motionBlurFilter.velocity = { x: vx * 0.1, y: vy * 0.1 };
}

// 4. Use lower resolution for expensive filters
bloomFilter.resolution = 0.5;  // Half resolution = 4x fewer pixels

// 5. Null out filters to release render targets when leaving gameplay
worldContainer.filters = null;
```

#### Quality Tiers

```typescript
function applyQualityTier(tier: 'high' | 'medium' | 'low'): void {
  switch (tier) {
    case 'high':
      worldContainer.filters = [bloomFilter, motionBlurFilter, dropShadowFilter, glowFilter];
      break;
    case 'medium':
      worldContainer.filters = [bloomFilter, dropShadowFilter];
      break;
    case 'low':
      worldContainer.filters = null;
      break;
  }
}
```

### 5.4 RenderTexture Best Practices

For the skid mark accumulation texture:

```typescript
// Create once per race
const skidRT = RenderTexture.create({
  width: trackAABB.width,
  height: trackAABB.height,
  resolution: 1,  // Reduce to 0.5 if VRAM is tight
});

// Clear between races
renderer.render({ container: new Container(), target: skidRT, clear: true });

// Destroy when done
skidRT.destroy(true);
```

---

## 6. DOM + WebGL Hybrid UI Patterns

### The Problem

v04 uses DOM-based menus (main menu, track select, settings) overlaying a WebGL canvas for gameplay (HUD, game world). Transitions between these two rendering systems need to be seamless.

### Best Practice: Z-Index Layering with CSS Transitions

#### 6.1 Layout Structure

```html
<body>
  <!-- WebGL canvas: always present, always at z-index 0 -->
  <canvas id="game-canvas" style="position:fixed;inset:0;z-index:0;"></canvas>

  <!-- DOM overlay: menus sit above canvas -->
  <div id="dom-overlay" style="position:fixed;inset:0;z-index:10;pointer-events:auto;">
    <div id="main-menu" class="screen"></div>
    <div id="track-select" class="screen"></div>
    <div id="settings" class="screen"></div>
  </div>
</body>
```

#### 6.2 Transition Pattern

```typescript
// Entering gameplay: hide DOM, show canvas content
enterGameplay(): void {
  const overlay = document.getElementById('dom-overlay')!;
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  // CSS transition handles the fade
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);  // Match CSS transition duration

  this.worldContainer.visible = true;
  this.hudContainer.visible = true;
}

// Exiting gameplay: show DOM, hide canvas content
exitToMenu(): void {
  this.worldContainer.visible = false;
  this.hudContainer.visible = false;

  const overlay = document.getElementById('dom-overlay')!;
  overlay.style.display = 'flex';
  // Force reflow before changing opacity
  void overlay.offsetHeight;
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'auto';
}
```

```css
#dom-overlay {
  transition: opacity 0.3s ease;
}

.screen {
  display: none;
}
.screen.active {
  display: flex;
}
```

#### 6.3 Key Principles

**1. The canvas never stops running.** PixiJS's ticker keeps running even when DOM menus are visible. This is fine -- the world and HUD containers are hidden (`visible = false`), so no actual rendering work occurs. Do NOT call `app.stop()` when showing menus, as restarting introduces frame timing jitter.

**2. Input routing is state-based.** A single keydown listener on `document`, owned by the ScreenManager, routes input based on the current screen state. DOM menus should NOT add their own keyboard listeners for navigation keys (Escape, Enter) -- the ScreenManager handles all routing.

**3. DOM menus are always in the DOM.** Do not create/destroy DOM elements on each transition. Create all screens at boot, toggle visibility with CSS classes. This is faster and avoids layout thrashing.

**4. Pointer events control interaction layer.** When the canvas is active, set `pointer-events: none` on the DOM overlay. When menus are active, set `pointer-events: auto`. This prevents click-through from DOM menus to the canvas.

**5. Accessibility is free with DOM menus.** DOM-based menus give you keyboard navigation, screen reader support, and standard form controls without extra work. This is a genuine advantage over canvas-based menus.

---

## 7. Browser Game Error Handling

### The Problem

A browser game has multiple failure modes: assets fail to load, WebGL context is lost, ONNX model fails, audio is blocked, localStorage is full, and the user's GPU can't handle the filter chain. Each needs a different response.

### Best Practice: Error Categories with Graduated Responses

#### 7.1 Error Severity Categories

| Category | Example | Response |
|----------|---------|----------|
| **Fatal** | PixiJS init fails, WebGL not available | Show DOM error page, offer reload |
| **Degraded** | ONNX load fails, Audio blocked | Disable affected feature, continue playing |
| **Transient** | localStorage write fails, Font load timeout | Ignore, use defaults, log warning |
| **Recoverable** | WebGL context loss | Auto-reload page |

#### 7.2 Fatal Error Boundary

```typescript
// src/main.ts
async function boot(): Promise<void> {
  const app = new RendererApp();
  await app.init();
}

boot().catch((err: Error) => {
  console.error('Fatal boot error:', err);

  // DOM-based error display (PixiJS may not have initialized)
  document.body.innerHTML = `
    <div style="font-family:system-ui,sans-serif;text-align:center;
                padding:60px 20px;background:#111;color:#eee;min-height:100vh;">
      <h1 style="font-size:24px;margin-bottom:16px;">Failed to start game</h1>
      <p style="color:#999;margin-bottom:24px;">${escapeHtml(err.message)}</p>
      <button onclick="location.reload()"
              style="padding:12px 24px;font-size:16px;cursor:pointer;
                     background:#44aaff;color:#fff;border:none;border-radius:4px;">
        Retry
      </button>
    </div>`;
});

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );
}
```

#### 7.3 Degraded Mode: ONNX Failure

```typescript
// During boot (Tier 2):
let aiAvailable = false;
try {
  await aiRunner.load('/assets/model.onnx', '/assets/vecnorm_stats.json');
  aiAvailable = true;
} catch (err) {
  console.warn('AI model failed to load -- AI modes disabled:', err);
}

// In track select UI:
if (!aiAvailable) {
  vsAiButton.disabled = true;
  vsAiButton.title = 'AI model failed to load';
  spectatorButton.disabled = true;
  spectatorButton.title = 'AI model failed to load';
}
```

#### 7.4 Degraded Mode: Audio Failure

```typescript
// All SoundManager methods should early-return on failure
update(prev: WorldState, curr: WorldState, alpha: number, race: RaceState): void {
  if (!this.ctx || !this.initialized || this.audioFailed) return;
  // ... normal audio update
}
```

The game runs silently. No error displayed to the user -- silent gameplay is acceptable; a crash is not.

#### 7.5 Transient: localStorage Guards

```typescript
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing, storage full, or disabled
    // Game continues -- settings/leaderboard just won't persist
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
```

#### 7.6 What NOT to Catch

**Let these crash visibly (with the fatal error boundary):**
- TypeErrors from null access in engine code (indicates a real bug)
- Missing required assets that the build should have included
- PixiJS Application init failure

**Rationale:** Silently swallowing bugs makes debugging impossible. The fatal error boundary catches everything that reaches the top, displays a useful message, and the console has the full stack trace.

---

## 8. Static Site Deployment for WebGL Games

### The Problem

A WebGL game with WASM files, large PNG textures, and an ONNX model has specific hosting requirements around MIME types, caching, and CORS headers.

### 8.1 Vite Production Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                         // Relative paths -- works in any subdirectory
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,             // NEVER inline assets as base64
    rollupOptions: {
      output: {
        // Ensure predictable output structure
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  assetsInclude: ['**/*.onnx'],       // Treat .onnx files as static assets
  optimizeDeps: {
    exclude: ['onnxruntime-web'],     // Don't pre-bundle ORT
  },
});
```

**Critical:** `base: './'` makes all asset paths relative, allowing deployment to any subdirectory (e.g., `example.com/racer/` or `example.com/`).

### 8.2 Build Script

```json
{
  "scripts": {
    "build": "node scripts/copy-ort-wasm.cjs && tsc --noEmit && vite build",
    "preview": "vite preview",
    "serve:dist": "npx serve dist -l 3000"
  }
}
```

Always test with `serve:dist` after building -- it catches path resolution bugs that only appear in production builds.

### 8.3 MIME Types by Host

#### GitHub Pages

GitHub Pages serves `.wasm` files with `application/wasm` MIME type by default. No additional configuration needed.

**Required:** Add a `.nojekyll` file to the repo root to prevent Jekyll processing (which would skip files/folders starting with underscore).

#### Netlify

Netlify serves `.wasm` correctly by default. For custom caching, create a `_headers` file:

```
# public/_headers (Netlify)

# Hashed assets: cache forever
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# WASM files: cache forever (content-addressed by Vite hash)
/assets/ort/*.wasm
  Content-Type: application/wasm
  Cache-Control: public, max-age=31536000, immutable

# ONNX model: cache for 1 day (may be retrained)
/assets/ai/*.onnx
  Cache-Control: public, max-age=86400

# HTML: never cache (ensures users get latest build)
/index.html
  Cache-Control: no-cache

# Enable CORS for asset loading from subdomains
/*
  Access-Control-Allow-Origin: *
```

Or in `netlify.toml`:

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/ort/*.wasm"
  [headers.values]
    Content-Type = "application/wasm"
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache"
```

#### Vercel

Vercel serves `.wasm` correctly by default. Use `vercel.json` for custom headers if needed.

### 8.4 Caching Strategy

| File Type | Cache Policy | Rationale |
|-----------|-------------|-----------|
| `index.html` | `no-cache` | Always check for new deployments |
| `assets/main-[hash].js` | `immutable, max-age=1yr` | Content-hashed -- new code = new hash |
| `assets/*.png` | `immutable, max-age=1yr` | Content-hashed by Vite |
| `assets/ort/*.wasm` | `immutable, max-age=1yr` | Versioned with ORT package |
| `assets/ai/model.onnx` | `max-age=1day` | May be updated during AI retraining |
| `assets/ai/vecnorm_stats.json` | `max-age=1day` | Paired with model |

### 8.5 CORS Considerations

For single-origin deployment (everything served from the same domain), CORS is not an issue. If assets are served from a CDN on a different domain, the CDN must return `Access-Control-Allow-Origin: *` headers, and textures loaded cross-origin require `crossorigin="anonymous"` on the image/fetch.

For ONNX Runtime Web with `numThreads > 1`, the page requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for `SharedArrayBuffer` access. **Since v04 uses `numThreads = 1`, these headers are NOT required.**

### 8.6 Build Output Verification

After `pnpm run build`, verify the dist directory:

```typescript
// tests/integration/build-verification.test.ts
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const DIST = resolve(__dirname, '../../dist');

describe('Build output', () => {
  test('index.html exists', () => {
    expect(existsSync(resolve(DIST, 'index.html'))).toBe(true);
  });

  test('ONNX model exists and is non-trivial size', () => {
    const modelPath = resolve(DIST, 'assets/ai/model.onnx');
    expect(existsSync(modelPath)).toBe(true);
    expect(statSync(modelPath).size).toBeGreaterThan(10_000);
  });

  test('ORT WASM binary exists', () => {
    expect(existsSync(resolve(DIST, 'assets/ort/ort-wasm-simd-threaded.wasm'))).toBe(true);
  });

  test('No .env files in dist', () => {
    expect(existsSync(resolve(DIST, '.env'))).toBe(false);
    expect(existsSync(resolve(DIST, '.env.local'))).toBe(false);
  });
});
```

### 8.7 Total Build Size Budget

| Component | Expected Size |
|-----------|--------------|
| JavaScript bundle | ~200KB (gzipped) |
| Track backgrounds (3x 2048x2048 PNG) | ~30MB |
| Car sprite atlas | ~500KB |
| Tile textures | ~1MB |
| ONNX model + stats | ~50KB |
| ORT WASM binary | ~4MB |
| **Total** | **~35MB** |

If track backgrounds push this too high, convert to WebP (PixiJS v8 supports WebP textures) for ~70% size reduction.

---

## Summary: Top 10 Actionable Recommendations for v04

1. **Use phased boot with `Promise.allSettled`** for parallel subsystem init with graceful partial failure handling.

2. **Pre-upload textures with `app.renderer.prepare.upload()`** before each race to eliminate first-frame GPU stutter.

3. **Make `exitRace()` the exact inverse of `startGame()`** -- every created resource has a corresponding cleanup step.

4. **Test every change with the "double race" pattern** -- play two consecutive races on different tracks.

5. **Handle the iOS Safari `"interrupted"` AudioContext state** alongside `"suspended"` in the resume logic.

6. **Keep ONNX Runtime at `numThreads = 1`** -- avoids COOP/COEP header complexity with zero performance cost for a 50KB model.

7. **Use DOM-based error display for fatal boot failures** -- PixiJS may not have initialized when the error occurs.

8. **Detect WebGL context loss and reload the page** -- in-place recovery is unreliable in PixiJS v8.

9. **Set `base: './'` in Vite config** -- enables deployment to any URL subdirectory.

10. **Set `Cache-Control: no-cache` on `index.html` only** -- let Vite's content-hashed assets be cached forever.

---

## Sources

### Official Documentation
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio Autoplay Policy - Chrome Blog](https://developer.chrome.com/blog/web-audio-autoplay)
- [Autoplay Guide - MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [ONNX Runtime Web Tutorials](https://onnxruntime.ai/docs/tutorials/web/)
- [ONNX Runtime Web Deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html)
- [ONNX Runtime Web Performance Diagnosis](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)
- [ONNX Runtime Web Env Flags & Session Options](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)
- [PixiJS v8 Garbage Collection Guide](https://pixijs.com/8.x/guides/concepts/garbage-collection)
- [PixiJS v8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [PixiJS v8 Filters Guide](https://pixijs.com/8.x/guides/components/filters)
- [PixiJS v8 Assets Guide](https://pixijs.com/8.x/guides/components/assets)
- [Vite Build for Production](https://vite.dev/guide/build)
- [Vite Static Asset Handling](https://vite.dev/guide/assets)
- [Netlify Caching Overview](https://docs.netlify.com/platform/caching/)

### Browser & Platform Issues
- [AudioContext "interrupted" in Safari - WebAudio Issue #2585](https://github.com/WebAudio/web-audio-api/issues/2585)
- [AudioContext state property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)
- [PixiJS WebGL Context Loss - Issue #6494](https://github.com/pixijs/pixijs/issues/6494)
- [PixiJS v8 VRAM Regression - Issue #11331](https://github.com/pixijs/pixijs/issues/11331)
- [PixiJS Text After Context Loss - Issue #11685](https://github.com/pixijs/pixijs/issues/11685)
- [SwiftShader Fallback Removal - Chromium](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM)
- [Vite + ONNX Runtime Web Discussion #15962](https://github.com/vitejs/vite/discussions/15962)

### Community & Guides
- [JavaScript Game Development Techniques 2025](https://playgama.com/blog/general/javascript-game-development-core-techniques-for-browser-based-games/)
- [WebGL Game Development Guide 2025](https://generalistprogrammer.com/tutorials/webgl-game-development-complete-browser-gaming-guide-2025)
- [Deploying Rust and WASM to Production](https://rustwasm.github.io/book/reference/deploying-to-production.html)
- [Hosting WASM on GitHub Pages (Bevy)](https://bevy-cheatbook.github.io/platforms/wasm/gh-pages.html)
- [Hosting Compressed Unity WebGL on Netlify](https://www.ankursheel.com/blog/host-compressed-unity-webgl-game-on-netlify)
- [WASM MIME Types Reference](https://gist.github.com/WesThorburn/62ea13952749d6563ce2fb15b45f1ba8)
- [Optimizing Transformers.js for Production](https://www.sitepoint.com/optimizing-transformers-js-production/)
- [Howler.js "interrupted" State Handling - PR #928](https://github.com/goldfire/howler.js/pull/928)
