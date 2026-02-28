# Phase 2: PixiJS Renderer + Playable Game — Research

**Researched:** 2026-02-27
**Domain:** PixiJS v8 rendering, fixed-timestep game loops, browser input handling, camera math
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Camera rotation | Car-facing-up | Steer left = go left, always. Standard for top-down racers |
| Camera zoom | Medium-tight + dynamic | Speed-based zoom + slide zoom-out for drama and info |
| Visual style | Clean/geometric | Best look with least art effort, ages well |
| Track colors | Dark grey / light tan / red-brown | Dark=safe, light=warning, red=danger hierarchy |
| Car sprite | Rectangle + pointed nose | Instant heading readability, reusable for AI car |
| Finish line | Painted checkered strip | Flat aesthetic, no 3D gate |
| HUD layout | Corners only | Maximum immersion, minimum clutter |
| Minimap | Outline + dot, bottom-right | Thin line, spatial awareness only |
| Speedometer | Vertical bar fill | Geometric, glanceable, no number reading |
| Best lap display | Always visible (dashes before first) | Motivation, no layout shift |
| Lap time feedback | Green flash for new best | Instant emotional hit |
| HUD backgrounds | Semi-transparent dark panels | Guaranteed readability over any surface |
| Countdown | 1s beats, driving camera, initial load only | Simcade pacing, functional not cinematic |
| Lap completion | Center-screen overlay, ~1s fade | Catches attention at racing speed |
| Race structure | Freeplay / time attack | Simplest, purest lap-chasing loop |
| Respawn | Fade-to-black, 5s stuck timeout | Clear beat, not disorienting or overengineered |
| Pause menu | Pause/Resume only | No menu exists yet, clean scope |
| Key mapping | Arrows + WASD both active | Zero friction, no config needed |
| Input smoothing | Ship engine defaults | Tune after first playtest, not blind |
| Fullscreen | F + F11 both work | Two instincts, zero friction |
| Restart (R) | Immediate, no countdown | Instant means instant |
| Loading screen | Title + progress bar | Professional first impression |

### Claude's Discretion

All UI specifics are locked. Claude has discretion over:
- Implementation structure within `src/renderer/`
- How layers are organized in the PixiJS scene graph
- Interpolation implementation details
- Whether to hand-roll the fixed-timestep loop vs. use a plugin

### Deferred Ideas (OUT OF SCOPE)

None raised during discussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | Smooth camera following car with slight lag/lerp | Camera container pattern: world container pivot + lerp, car-facing-up via heading rotation |
| VIS-02 | Car sprite rotation smoothed between ticks | Render interpolation: lerp heading between prev and current CarState |
| VIS-05 | Finish line visual (checkered pattern) | Graphics.poly() to draw checkered squares along the gate at checkpoint[0]; static, cached |
| HUD-01 | Speedometer display | PixiJS Graphics rect fill scaled to car.speed / CAR.maxSpeed; updated each render frame |
| HUD-02 | Current lap time (running) | PixiJS Text object updated from timing.currentLapTicks / 60; formatted as M:SS.mmm |
| HUD-03 | Best lap time (persistent) | PixiJS Text; shows dashes until timing.bestLapTicks > 0 |
| HUD-04 | Lap counter (X / Total) | PixiJS Text updated from timing.currentLap |
| HUD-05 | Minimap showing car position on track | Graphics line tracing track boundary + dot at car position; static overlay container |
| MECH-12 | Countdown start sequence (3-2-1-GO) | GameLoop state machine: COUNTDOWN state blocks input, Text overlay, 1s intervals via ticker |
| MECH-13 | Respawn to last checkpoint after stuck timeout | WorldState extension: stuck timer, lastCheckpointPosition; fade-to-black via alpha tween |
| UX-01 | Instant restart (R key) | KeyboardHandler keydown: call resetWorld(), no countdown replay |
| UX-02 | Pause menu (pause, resume only) | Escape key toggles PAUSED state; simple overlay Text container |
| UX-05 | Loading screen during asset loading | Shown during app.init(); Title Text + Graphics progress bar, removed on first render |
| UX-06 | Fullscreen toggle | F/F11 keydown: document.fullscreenElement ? exitFullscreen : canvas.requestFullscreen() |
</phase_requirements>

---

## Summary

Phase 2 wires the completed engine into a browser-playable game. The work divides cleanly into four domains: (1) the PixiJS v8 rendering layer reading engine state as a pure consumer, (2) the fixed-timestep game loop with render interpolation, (3) keyboard input handling feeding the `Input` interface the engine already expects, and (4) game-loop state management (countdown, respawn, pause, restart).

PixiJS v8 is already installed (`pixi.js ^8.16.0`). The API is well-documented and stable. The main v8 breaking changes vs. v7 are: async `app.init()`, the new Graphics API (`rect().fill()` replaces `beginFill()/drawRect()/endFill()`), and `cacheAsTexture()` replacing `cacheAsBitmap`. All three are straightforward to work with.

The engine is headless-first and deterministic. The renderer is purely a read-only consumer of `WorldState`. The clean separation already established in Phase 1 (`src/engine/` imports zero PixiJS, returns plain data objects) means the rendering code has zero risk of polluting game logic.

**Primary recommendation:** Build the renderer as a thin scene graph over the existing engine. Use a two-container architecture (world container + HUD container). Implement the fixed-timestep accumulator manually — it's ~25 lines of code and keeps full control without a plugin dependency. Drive rendering from `app.ticker.add()`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | ^8.16.0 (already installed) | 2D rendering, scene graph, ticker | Project dependency, WebGL/WebGPU, high performance |
| TypeScript | ^5.9.3 (already installed) | Type safety | Project requirement, strict mode enforced |
| Vite | ^7.3.1 (already installed) | Dev server, HMR, bundler | Project dependency, fast builds |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.0.18 (already installed) | Unit tests | Engine-side tests already use it; renderer tests are minimal |
| vitest-webgl-canvas-mock | latest | Mock WebGL for Vitest | Needed if any renderer code gets unit-tested; optional for Phase 2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled fixed timestep | pixijs-interpolated-ticker plugin | Plugin is <2KB and battle-tested, but adds a dependency for ~25 lines of code. Hand-roll preferred for full control and zero deps. |
| pixi.js Graphics for track | Pre-rendered canvas texture | Graphics with cacheAsTexture is simpler, same performance for a static track |

**Installation:** No new packages needed. pixi.js is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── engine/          # Existing — NEVER import from pixi.js
├── tracks/          # Existing — track control points
├── renderer/
│   ├── RendererApp.ts       # Top-level: PixiJS Application init, game loop
│   ├── WorldRenderer.ts     # Reads WorldState, updates scene graph
│   ├── TrackRenderer.ts     # Draws track geometry once, caches as texture
│   ├── CarRenderer.ts       # Draws car sprite, updated each frame with interpolation
│   ├── HudRenderer.ts       # All HUD elements (speed, laps, times, minimap)
│   ├── CameraController.ts  # World container transform (position, rotation, zoom)
│   ├── InputHandler.ts      # Keyboard state → Input interface
│   ├── GameLoop.ts          # Fixed-timestep accumulator, state machine (LOADING/COUNTDOWN/RACING/PAUSED/RESPAWN)
│   └── GameState.ts         # GamePhase enum, respawn timer, stuck detection
└── main.ts                  # Entry point: creates RendererApp
```

### Pattern 1: Two-Container Scene Graph

The stage is split into two root containers that never mix:

```typescript
// Source: PixiJS official docs — Container management
const worldContainer = new Container(); // Track + Car — camera transforms applied here
const hudContainer = new Container();   // All HUD — fixed to screen, never transformed

app.stage.addChild(worldContainer);
app.stage.addChild(hudContainer);
// HUD must be added AFTER world — renders on top
```

All camera math (position, rotation, zoom) applies to `worldContainer` only. The HUD container is never touched by the camera, so it always reads correctly in screen space.

### Pattern 2: Car-Facing-Up Camera

The car always points to the top of the screen. The world container rotates around the screen center as the car's heading changes.

```typescript
// CameraController.ts — applied every render frame
// Source: Verified pattern; PixiJS Container transforms
function updateCamera(
  worldContainer: Container,
  carPos: Vec2,       // interpolated world position
  carHeading: number, // interpolated heading (radians)
  zoom: number,       // current zoom level
  screenW: number,
  screenH: number,
): void {
  const cx = screenW / 2;
  const cy = screenH / 2;

  // 1. Pivot at screen center
  worldContainer.pivot.set(carPos.x, carPos.y);
  worldContainer.position.set(cx, cy);

  // 2. Rotate world so car heading = "up" on screen
  //    PixiJS +Y is down, engine heading 0 = +X (right).
  //    Car-facing-up means we rotate the world by -(heading + PI/2).
  worldContainer.rotation = -(carHeading + Math.PI / 2);

  // 3. Apply zoom
  worldContainer.scale.set(zoom);
}
```

**Why pivot works:** Setting `pivot` to the car's world position and `position` to the screen center causes PixiJS to render the world such that the car's world-space coordinates map exactly to the screen center, after which rotation and scale apply around that same center point.

**Heading convention check (from engine source):** `car.heading` is in radians; 0 = +X direction (right). In PixiJS coordinate space, +Y is down (standard 2D). The adjustment `-(heading + PI/2)` maps engine heading 0 (→ right) to screen-up (top of canvas). Verified against `car.ts` heading update: `newHeading = car.heading + newYawRate * dt`.

### Pattern 3: Fixed-Timestep Game Loop with Interpolation

```typescript
// GameLoop.ts — drives all simulation and rendering
// Source: "Fix Your Timestep" — Gaffer On Games (verified accumulator algorithm)
//         PixiJS Ticker for rAF integration

const FIXED_DT_MS = 1000 / 60; // 16.667ms
let accumulator = 0;
let prevState: WorldState = initialState;
let currState: WorldState = initialState;

app.ticker.add((ticker) => {
  // 1. Accumulate real elapsed time
  accumulator += ticker.deltaMS;

  // 2. Consume in fixed steps (cap at 200ms to prevent spiral of death)
  accumulator = Math.min(accumulator, 200);
  while (accumulator >= FIXED_DT_MS) {
    prevState = currState;
    currState = stepWorld(currState, getInput());
    accumulator -= FIXED_DT_MS;
  }

  // 3. Compute interpolation factor (0..1)
  const alpha = accumulator / FIXED_DT_MS;

  // 4. Render interpolated state
  worldRenderer.render(prevState, currState, alpha);
});
```

**Alpha factor:** `alpha = accumulator / FIXED_DT_MS`. At alpha=0, render prevState exactly. At alpha=1, render currState exactly. Linear interpolation between for smooth visuals at any display framerate.

**Interpolating car position and heading:**
```typescript
// WorldRenderer.ts — inside render()
const pos = {
  x: lerp(prevState.car.position.x, currState.car.position.x, alpha),
  y: lerp(prevState.car.position.y, currState.car.position.y, alpha),
};

// Heading: must handle wrapping at ±PI boundary
const heading = lerpAngle(prevState.car.heading, currState.car.heading, alpha);
```

**Heading lerp caution:** Naive lerp breaks at the `±PI` boundary (e.g., lerp from 3.1 to -3.1 goes the wrong way). Use angle difference clamping:
```typescript
function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  // Wrap diff to [-PI, PI]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}
```

### Pattern 4: Keyboard Input Handler

```typescript
// InputHandler.ts
// Source: Standard browser KeyboardEvent API

const keys = new Set<string>();

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  // Prevent default scroll behavior for arrow keys
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function getInput(): Input {
  const throttle = (keys.has('ArrowUp') || keys.has('KeyW')) ? 1.0 : 0.0;
  const brake    = (keys.has('ArrowDown') || keys.has('KeyS')) ? 1.0 : 0.0;
  const steerL   = (keys.has('ArrowLeft') || keys.has('KeyA')) ? 1.0 : 0.0;
  const steerR   = (keys.has('ArrowRight') || keys.has('KeyD')) ? 1.0 : 0.0;
  return {
    throttle,
    brake,
    steer: steerR - steerL, // -1.0 to +1.0
  };
}
```

**No smoothing here:** Keyboard smoothing is handled inside the engine's `smoothInput()` function (already implemented in `car.ts`). The input handler outputs raw binary values. Confirmed from `constants.ts`: `INPUT_RATES.steer = 4.0`, `throttle = 6.0`, `brake = 10.0`.

**Input is paused during COUNTDOWN/PAUSED/RESPAWN states:** The GameLoop passes `{ steer: 0, throttle: 0, brake: 0 }` to `stepWorld()` during those phases, regardless of keys held.

### Pattern 5: Track Rendering (Static, Cached)

The track is drawn once at startup and cached as a GPU texture. This avoids redrawing hundreds of polygon vertices every frame.

```typescript
// TrackRenderer.ts
// Source: PixiJS cacheAsTexture docs (v8 replaces v7 cacheAsBitmap)

function buildTrackGraphics(track: TrackState): Container {
  const container = new Container();

  // 1. Background (runoff area): filled polygon using outer boundary
  const runoffGraphics = new Graphics();
  runoffGraphics.poly(flattenVec2Array(track.outerBoundary)).fill(0xC2A87A); // light tan

  // 2. Road surface: filled polygon using inner+outer boundary (ring)
  const roadGraphics = new Graphics();
  roadGraphics.poly(flattenVec2Array(track.outerBoundary)).fill(0x3A3A3A); // dark grey
  roadGraphics.poly(flattenVec2Array(track.innerBoundary)).cut(); // punch hole for inner

  // 3. Wall boundary: stroked lines for both boundaries
  const wallGraphics = new Graphics();
  wallGraphics.poly(flattenVec2Array(track.outerBoundary)).stroke({ width: 1.5, color: 0x7B3B2A }); // red-brown
  wallGraphics.poly(flattenVec2Array(track.innerBoundary)).stroke({ width: 1.5, color: 0x7B3B2A });

  // 4. Finish line: checkered strip at checkpoint[0]
  // (drawn as alternating small rectangles along the gate)

  container.addChild(runoffGraphics, roadGraphics, wallGraphics);
  container.cacheAsTexture(); // Cache entire track as single GPU texture
  return container;
}
```

**Why the outer-polygon minus inner-polygon approach:** The engine provides `track.outerBoundary` and `track.innerBoundary` as `readonly Vec2[]` polylines. Using `.cut()` after `.poly()` creates a hole. This renders the road surface correctly without needing to triangulate the ring manually. Verified from `engine/types.ts`: `TrackState` has `outerBoundary` and `innerBoundary`.

**Coordinate system note:** Engine world units are in game units (roughly -200 to +200 range from track data in `track01.ts`). The world container's zoom applies a pixel-per-unit scale. At medium-tight zoom ~3x, the track fits comfortably in a 1920x1080 viewport.

### Pattern 6: Finish Line (Checkered Strip)

The finish line is painted as alternating colored squares along the checkpoint[0] gate. The gate has `.left`, `.right`, and `.direction` from `engine/types.ts`.

```typescript
// In buildTrackGraphics()
const finishGate = track.checkpoints[0];
const numSquares = 8;
// Divide gate into numSquares segments, alternate dark/light fill
for (let i = 0; i < numSquares; i++) {
  const t0 = i / numSquares;
  const t1 = (i + 1) / numSquares;
  // Interpolate left→right positions
  // Draw a thin quad perpendicular to gate direction
  // Alternate fill: 0xFFFFFF / 0x222222
}
```

### Pattern 7: Minimap

The minimap renders in a dedicated Graphics object inside the HUD container. It redraws each frame since the car dot moves.

```typescript
// HudRenderer.ts — minimap update
function updateMinimap(minimap: Graphics, track: TrackState, carPos: Vec2): void {
  minimap.clear();

  const scale = 0.15; // World units → minimap pixels
  const ox = app.screen.width - 140; // Bottom-right anchor
  const oy = app.screen.height - 140;

  // Draw background panel
  minimap.rect(ox - 5, oy - 5, 130, 130).fill({ color: 0x000000, alpha: 0.6 });

  // Draw track outline (outer boundary only — thin line)
  minimap.poly(track.outerBoundary.map(p => ({ x: ox + p.x * scale, y: oy + p.y * scale })))
         .stroke({ width: 1, color: 0xAAAAAA });

  // Draw car position dot
  minimap.circle(ox + carPos.x * scale, oy + carPos.y * scale, 3).fill(0xFFFF00);
}
```

**Performance note:** The minimap redraws every frame (car position changes). This is acceptable since it's a small, simple shape operation. If profiling shows it's a bottleneck, cache the track outline as a separate Graphics and only redraw the car dot.

### Pattern 8: Dynamic Camera Zoom

```typescript
// CameraController.ts
const ZOOM_BASE = 3.0;           // Base zoom (pixels per world unit)
const ZOOM_MIN = 2.5;            // Pulled back at high speed
const ZOOM_MAX = 3.5;            // Tight at low speed
const ZOOM_SLIDE_BONUS = 0.4;    // Extra zoom-out when sliding
const SLIDE_THRESHOLD = 0.3;     // slip angle proxy: |yawRate| threshold

function computeZoom(car: CarState): number {
  // Speed-based zoom: tight at low speed, wide at high speed
  const speedFactor = car.speed / CAR.maxSpeed; // 0..1
  let zoom = ZOOM_MAX - (ZOOM_MAX - ZOOM_MIN) * speedFactor;

  // Slide bonus: detect slide via yaw rate magnitude
  const sliding = Math.abs(car.yawRate) > SLIDE_THRESHOLD;
  if (sliding) zoom -= ZOOM_SLIDE_BONUS;

  return Math.max(ZOOM_MIN - ZOOM_SLIDE_BONUS, Math.min(ZOOM_MAX, zoom));
}
```

**Smooth zoom transitions:** Apply lerp to zoom value each frame to avoid jarring snaps:
```typescript
currentZoom = lerp(currentZoom, targetZoom, 0.05); // ~5% per frame easing
```

### Pattern 9: Game State Machine

```typescript
// GameState.ts
export const enum GamePhase {
  Loading    = 'loading',
  Countdown  = 'countdown',
  Racing     = 'racing',
  Paused     = 'paused',
  Respawning = 'respawning',
}

// GameLoop.ts manages:
// - phase transitions
// - countdown tick counter (0..3 beats × 60 ticks)
// - stuckTimer (ticks of near-zero velocity; threshold = 5 × 60 = 300 ticks)
// - respawnTimer (fade duration: 0.5s = 30 ticks)
```

**Stuck detection:** Check `currState.car.speed < STUCK_SPEED_THRESHOLD` each tick. If stuck for `STUCK_TIMEOUT_TICKS` (300), transition to `Respawning`. Respawn places the car at the last-crossed checkpoint position with zero velocity.

**Checkpoint positions for respawn:** `track.checkpoints[timing.lastCheckpointIndex].center` gives the world position. If no checkpoints crossed (`lastCheckpointIndex === -1`), use `track.startPosition`.

### Pattern 10: Fullscreen Toggle

```typescript
// InputHandler.ts — handle F and F11
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' || e.code === 'F11') {
    e.preventDefault(); // Prevent F11 native browser behavior
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      app.canvas.requestFullscreen().catch(() => {
        // Silently ignore — fullscreen must be triggered from user event (it is)
      });
    }
  }
});
```

**Source:** MDN Fullscreen API Guide (verified). `requestFullscreen()` must be called from a user event handler — a `keydown` qualifies. `document.fullscreenElement` is null when not in fullscreen.

### Anti-Patterns to Avoid

- **Importing pixi.js in engine files:** Engine has zero PixiJS imports — CLAUDE.md constraint. Verified: `src/engine/` imports only from `./types`, `./vec2`, `./constants` — no renderer.
- **Mutating WorldState inside the renderer:** The engine is functional/immutable. The renderer reads `WorldState` and `prevState` but never calls setters on them.
- **Redrawing the static track geometry every frame:** The track's polylines don't change. Build once, call `cacheAsTexture()`, never touch again.
- **Using `ticker.deltaTime` directly as physics dt:** `ticker.deltaTime` is a dimensionless scale (1.0 at 60fps). Use `ticker.deltaMS` for real elapsed milliseconds in the accumulator pattern.
- **Naive angle lerp across the ±PI boundary:** Causes the car sprite to spin the wrong way when heading wraps. Use the `lerpAngle()` function described above.
- **Calling `requestFullscreen()` outside a user event handler:** Browser will reject it silently (or throw). The `keydown` event IS a user gesture — this is safe.
- **Blocking game loop during countdown:** The physics still steps during countdown (so the car stays pinned at the start with zero input). Only rendering and input feed change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scene graph / transforms | Custom matrix math | PixiJS Container.pivot + position + rotation | PixiJS handles world/screen transform stack including GPU batching |
| Rendering loop | Manual requestAnimationFrame | app.ticker.add() | PixiJS Ticker integrates rAF, handles tab visibility, delta capping |
| Polygon fill | Custom canvas2d | Graphics.poly().fill() | PixiJS sends to WebGL/WebGPU — far faster than Canvas2D for many shapes |
| Text rendering | Canvas2D text | PixiJS Text / BitmapText | Handles DPI scaling, font metrics, GPU-batched |
| Texture caching | Manual canvas buffer | container.cacheAsTexture() | PixiJS manages GPU texture lifecycle, handles resize events |
| Per-pixel hit testing | Custom | Not needed — this is a racer, no clicks on game objects | |

**Key insight:** PixiJS has already solved the hard problems of 2D scene graphs on WebGL/WebGPU. The renderer's job is to map `WorldState` fields to scene graph properties — not to re-implement rendering primitives.

---

## Common Pitfalls

### Pitfall 1: PixiJS v8 Requires Async Init

**What goes wrong:** Calling `new Application()` and immediately using `app.stage` throws or silently fails.
**Why it happens:** v8 added WebGPU support which requires async renderer detection. init() is now `async`.
**How to avoid:**
```typescript
const app = new Application();
await app.init({ resizeTo: window, backgroundColor: 0x1a1a2e });
document.body.appendChild(app.canvas);
// Only now is app.stage, app.screen, app.ticker available
```
**Source:** PixiJS v8 migration guide (Context7, official GitHub).

### Pitfall 2: Graphics API Changed in v8

**What goes wrong:** Using v7 `beginFill()/drawRect()/endFill()` pattern in v8 — deprecated, will emit warnings or fail.
**Why it happens:** v8 overhauled Graphics to separate shape definition from fill/stroke.
**How to avoid:** Always use the v8 pattern:
```typescript
// v8: shape first, then fill/stroke
graphics.rect(x, y, w, h).fill(0xff0000);
graphics.rect(x, y, w, h).fill('blue').stroke({ width: 2, color: 'white' });
```
**Source:** Context7 PixiJS migration docs (HIGH confidence).

### Pitfall 3: cacheAsBitmap is Gone in v8

**What goes wrong:** Using `container.cacheAsBitmap = true` throws or is undefined in v8.
**Why it happens:** v8 replaced it with `cacheAsTexture()`.
**How to avoid:** Use `container.cacheAsTexture()`. Call `container.updateCacheTexture()` if the content ever changes.
**Source:** Context7 PixiJS docs (HIGH confidence).

### Pitfall 4: Heading Lerp Wraps Incorrectly

**What goes wrong:** Car sprite rapidly spins 360° when heading crosses the ±PI boundary (e.g., going from heading 3.1 to -3.1).
**Why it happens:** `lerp(3.1, -3.1, 0.5) = 0.0` — goes the short way mathematically but looks like a full spin visually.
**How to avoid:** Use `lerpAngle()` which wraps the difference to `[-PI, PI]` before interpolating.
**Warning signs:** Car sprite spinning instead of smoothly turning during tight corners.

### Pitfall 5: Spiral of Death in Accumulator

**What goes wrong:** Tab is hidden for 5 seconds. Tab becomes visible. `ticker.deltaMS` is 5000ms. The while loop runs `5000/16.67 = ~300` physics steps in one frame, freezing the browser.
**Why it happens:** Accumulator is uncapped.
**How to avoid:** Cap accumulator before the while loop: `accumulator = Math.min(accumulator, 200)`. Drops those 300 steps, small visual glitch acceptable.
**Source:** Gaffer On Games "Fix Your Timestep" article (verified).

### Pitfall 6: Arrow Keys Scroll the Page

**What goes wrong:** Pressing arrow keys scrolls the browser page instead of steering.
**Why it happens:** ArrowUp/Down/Left/Right have default scroll behavior.
**How to avoid:** Call `e.preventDefault()` in the keydown handler when arrow keys are pressed.
**Warning signs:** Page scrolls during gameplay.

### Pitfall 7: F11 Triggers Browser Fullscreen Instead of Game Fullscreen

**What goes wrong:** Pressing F11 triggers the browser's native fullscreen toggle (address bar visible, etc.) instead of the game's programmatic fullscreen.
**Why it happens:** F11 is a browser-native shortcut; it doesn't fire `keydown` reliably in all browsers when it triggers native fullscreen.
**How to avoid:** `e.preventDefault()` in keydown for F11. Note that this is browser-dependent — some browsers intercept F11 at OS level before JS sees it. The `F` key is the reliable game fullscreen trigger; F11 is best-effort.
**Warning signs:** Inconsistent fullscreen behavior between browsers.

### Pitfall 8: PixiJS Text Has Per-Frame GC Pressure

**What goes wrong:** Calling `text.text = newValue` every frame for values that haven't changed creates unnecessary redraws.
**Why it happens:** PixiJS Text redraws its canvas texture when `.text` changes.
**How to avoid:** Cache the last-displayed value and only update when it changes:
```typescript
if (currentLapDisplay !== newDisplay) {
  currentLapDisplay = newDisplay;
  lapText.text = newDisplay;
}
```

---

## Code Examples

Verified patterns from official sources:

### Application Init (v8)

```typescript
// Source: Context7 PixiJS — Application setup
import { Application } from 'pixi.js';

const app = new Application();
await app.init({
  resizeTo: window,
  backgroundColor: 0x1a1a2e,
  antialias: true,
  resolution: window.devicePixelRatio ?? 1,
});
document.body.appendChild(app.canvas);
```

### Graphics Drawing (v8 API)

```typescript
// Source: Context7 PixiJS — Graphics v8 API
import { Graphics } from 'pixi.js';

// Filled polygon (track road surface)
const road = new Graphics();
road.poly([x1, y1, x2, y2, x3, y3, ...]).fill(0x3A3A3A);

// Stroked polygon (wall boundary)
const wall = new Graphics();
wall.poly([...points]).stroke({ width: 1.5, color: 0x7B3B2A });

// Semi-transparent panel (HUD background)
const panel = new Graphics();
panel.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.65 });

// Filled rect (speedometer bar)
const speedBar = new Graphics();
speedBar.rect(x, y, barWidth, barHeight).fill(0x44FFAA);
```

### Container as World Camera

```typescript
// Source: Context7 PixiJS — Container transforms
import { Container } from 'pixi.js';

const world = new Container();
app.stage.addChild(world);

// In render loop:
world.pivot.set(carWorldX, carWorldY);  // Pivot at car's world position
world.position.set(screenCX, screenCY); // Place pivot at screen center
world.rotation = -(carHeading + Math.PI / 2);
world.scale.set(zoom);
```

### Text for HUD

```typescript
// Source: Context7 PixiJS — Text creation
import { Text } from 'pixi.js';

const lapText = new Text({
  text: 'Lap 1',
  style: {
    fontFamily: 'monospace',
    fontSize: 18,
    fill: '#ffffff',
  },
});
lapText.x = 20;
lapText.y = 20;
hudContainer.addChild(lapText);
```

### cacheAsTexture for Static Track

```typescript
// Source: Context7 PixiJS — cacheAsTexture
trackContainer.cacheAsTexture();
// If track ever needed to update:
// trackContainer.updateCacheTexture();
```

### Fullscreen Toggle

```typescript
// Source: MDN Fullscreen API Guide (verified)
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'KeyF' || e.code === 'F11') {
    e.preventDefault();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      app.canvas.requestFullscreen();
    }
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `beginFill(color).drawRect(x,y,w,h).endFill()` | `rect(x,y,w,h).fill(color)` | PixiJS v8 | All Graphics drawing code must use new API |
| `cacheAsBitmap = true` | `cacheAsTexture()` | PixiJS v8 | Static container optimization works differently |
| `new Application({ width, height })` (sync) | `await app.init({ ... })` | PixiJS v8 | Entry point must be async |
| `GraphicsGeometry` for shared shapes | `GraphicsContext` | PixiJS v8 | Share a context across multiple Graphics instances |
| `ticker.deltaTime` for physics | Accumulator with `ticker.deltaMS` | Always best practice | Decouples physics from render FPS |

**Deprecated/outdated:**
- `displayObject.cacheAsBitmap`: Removed in v8 — use `cacheAsTexture()`
- `Application` constructor options: Must now pass options to `app.init()`
- `Graphics.beginFill()` / `Graphics.endFill()` / `Graphics.lineStyle()`: Deprecated in v8 with warnings — use new chained API

---

## Coordinate System Reference

This is critical for Phase 2 implementation:

| System | X axis | Y axis | Angle 0 | Angle increases |
|--------|--------|--------|---------|----------------|
| Engine (world) | → Right | → Up (math-standard) | +X (right) | Counter-clockwise |
| PixiJS (screen) | → Right | → Down (screen-standard) | +X (right) | Clockwise |

**The mismatch:** Engine uses math-convention Y-up. PixiJS uses screen-convention Y-down.

**Consequence for camera rotation:** A car heading east (heading=0) should appear driving "up" on screen. Applying `rotation = -(heading + PI/2)` in PixiJS maps this correctly. For a heading of 0 (east): `rotation = -(0 + PI/2) = -PI/2`, which rotates the world so east aligns with screen-up. Verified by inspection of `car.ts` `stepCar()` which uses standard 2D rotation matrices with heading convention matching the math standard.

**Consequence for track rendering:** The track boundary vertices from `TrackState` are in engine world space. They can be passed directly to PixiJS `Graphics.poly()`. PixiJS Y-down flips what was "up" to "down" in visual space, but since the camera rotation corrects for this, the track will appear correctly oriented when viewed through the rotating world container.

---

## Open Questions

1. **Entry Point: index.html + main.ts**
   - What we know: No `index.html` exists yet (confirmed by file inspection). Vite needs one.
   - What's unclear: Whether to put the entry in project root or `public/`.
   - Recommendation: Create `index.html` at project root (standard Vite convention) with `<script type="module" src="/src/main.ts">`. Vite handles it.

2. **Vite Config for PixiJS**
   - What we know: `vite` v7.3.1 is installed. No `vite.config.ts` found at project root.
   - What's unclear: Whether PixiJS v8 needs any Vite plugin or alias configuration.
   - Recommendation: No Vite plugin needed for PixiJS v8. Standard `import { Application } from 'pixi.js'` works. Create a minimal `vite.config.ts` if needed for TypeScript resolution.

3. **Respawn: Track Last Checkpoint**
   - What we know: `TimingState.lastCheckpointIndex` tracks the last gate crossed. `TrackState.checkpoints[i].center` is the center point. `startPosition` is the fallback.
   - What's unclear: Whether to face the car in the gate's `.direction` or at the track start heading on respawn.
   - Recommendation: Use `checkpoints[lastCheckpointIndex].direction` to orient the car — it points forward along the track. More natural respawn.

4. **Rendering Tests**
   - What we know: Vitest is configured for `tests/engine/`. PixiJS requires a WebGL context, not available in JSDOM.
   - What's unclear: Whether `nyquist_validation` applies to renderer code in this project's config.
   - Recommendation: `config.json` does NOT have `workflow.nyquist_validation: true` — it has `workflow.research`, `plan_check`, `verifier`. **Skip Validation Architecture section** — renderer code is manually verified by running the game.

---

## Validation Architecture

> Skipped: `workflow.nyquist_validation` is not present in `.planning/config.json`. Renderer correctness is verified by running the game in a browser.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/pixijs/pixijs` — Application init, Graphics API v8, Container transforms, Ticker, Text, cacheAsTexture, resize
- Context7 `/llmstxt/pixijs_llms-full_txt` — RenderGroup, Graphics polygon, camera patterns
- PixiJS v8 migration guide (GitHub `pixijs/pixijs/dev`) — Breaking changes from v7 to v8
- MDN Fullscreen API Guide — requestFullscreen, exitFullscreen, fullscreenElement
- `src/engine/types.ts` — WorldState, CarState, TrackState, TimingState interfaces (direct inspection)
- `src/engine/car.ts` — Heading convention, smoothInput, stepCar (direct inspection)
- `src/engine/constants.ts` — DT=1/60, CAR.maxSpeed=200, INPUT_RATES (direct inspection)
- `src/engine/checkpoint.ts` — TimingState structure, lastCheckpointIndex (direct inspection)
- `src/tracks/track01.ts` — Track extents ~(-200..+200) world units (direct inspection)

### Secondary (MEDIUM confidence)
- Gaffer On Games "Fix Your Timestep" — Accumulator pattern, interpolation formula (verified algorithm, authoritative source)
- MDN Fullscreen API Guide — F11 behavior cross-browser note
- PixiJS GitHub Discussion #9490 — Camera implementation: container pivot pattern (community verified)

### Tertiary (LOW confidence)
- html5gamedevs.com forum — Layer management recommendation; older post, pattern still valid for PixiJS
- pixijs-interpolated-ticker README — Used as reference only, not adopting the plugin

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pixi.js is already installed, verified via package.json; all API patterns confirmed in Context7
- Architecture: HIGH — camera pivot math is standard geometry; fixed timestep is a well-understood algorithm; engine interfaces verified by direct inspection
- Pitfalls: HIGH for v8 API changes (official migration docs); MEDIUM for heading coordinate system (derived from engine source, mathematically verified)

**Research date:** 2026-02-27
**Valid until:** 2026-08-27 (PixiJS v8 is stable; Fullscreen API is a W3C standard)
