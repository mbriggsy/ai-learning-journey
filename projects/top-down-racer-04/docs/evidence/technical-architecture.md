# Technical Architecture

## Overview

Top-Down Racer v04 is a layered browser-based racing game with strict architectural boundaries. The engine layer is frozen from v02 (366+ unit tests, zero modifications). The renderer layer was rebuilt from scratch in PixiJS v8. The AI opponent trains offline in Python against the headless engine, exports to ONNX, and runs inference in the browser via WebAssembly. All visual assets are generated autonomously via the Gemini Imagen 4 API -- no human art tools.

This document maps every architectural claim to specific file paths.

---

## System Architecture

```
+-------------------------------------------------------------------+
|                        BROWSER (Client)                           |
|                                                                   |
|  +---------------------+     reads state     +------------------+ |
|  |   Renderer Layer    |<--------------------|   Engine Layer   | |
|  |   (PixiJS v8)       |     (never mutates)  | (deterministic) | |
|  |   19 .ts files      |                     | 10 .ts files    | |
|  |   + 4 dom/ + 3 scr  |                     | 60Hz physics    | |
|  +---------------------+                     +------------------+ |
|           |                                          ^            |
|           v                                          |            |
|  +---------------------+                    +--------+---------+  |
|  |   HUD Container     |                    |  AI Inference    |  |
|  |   (no filters,      |                    |  ONNX Runtime    |  |
|  |    always sharp)     |                    |  WASM backend    |  |
|  +---------------------+                    |  24 KB model     |  |
|                                             +------------------+  |
+-------------------------------------------------------------------+

+-------------------------------------------------------------------+
|                    OFFLINE (Development)                           |
|                                                                   |
|  +---------------------+                    +------------------+  |
|  |   Asset Pipeline    |                    | Training Pipeline|  |
|  |   Gemini Imagen 4   |                    | Python 3.12      |  |
|  |   Sharp processing  |                    | SB3 PPO          |  |
|  |   Typed manifest    |                    | 2M steps         |  |
|  +---------------------+                    +------------------+  |
|           |                                          |            |
|           v                                          v            |
|     public/assets/                            public/ai/          |
|     (sprites, textures,                       model.onnx (24 KB)  |
|      tracks, ui)                              vecnorm_stats.json  |
+-------------------------------------------------------------------+
```

---

## Engine Layer (Frozen)

**Directory:** `src/engine/`
**Line count:** ~2,400 lines across 10 files
**Test coverage:** 366+ unit tests (zero modifications from v02)

### Files

| File | Purpose |
|---|---|
| `constants.ts` | All physics tuning: mass, tire model, surface grip, input rates |
| `types.ts` | Immutable type contracts: `CarState`, `WorldState`, `TrackState`, `TimingState` |
| `car.ts` | Physics step: Pacejka tire model, weight transfer, drag, surface penalties |
| `collision.ts` | Car-wall collision detection and response (penetration + normal) |
| `checkpoint.ts` | Checkpoint crossing detection and lap timing |
| `track.ts` | Track construction from control points, boundary generation, spline math |
| `spline.ts` | Catmull-Rom spline evaluation, arc-length parameterization |
| `vec2.ts` | Pure-function 2D vector math (add, sub, rotate, dot, etc.) |
| `world.ts` | World tick orchestration: input smoothing, physics, collision, timing |
| `RaceController.ts` | High-level race state machine: countdown, racing, finished |

### Key Design Decisions

**Deterministic 60Hz physics** (`src/engine/constants.ts`): Fixed timestep `DT = 1/60`. No frame-rate dependency. Identical behavior in browser and headless training.

**Pacejka tire model** (`src/engine/constants.ts`): Simplified `B=5.0, C=1.4, mu=0.5` -- arcade-tuned. Tire forces add drift flavor without punishing casual players.

**Immutable state snapshots** (`src/engine/types.ts`): Every `CarState` and `WorldState` is a readonly snapshot. The physics step produces a new state each tick. No mutation anywhere.

**Surface system** (`src/engine/constants.ts`): Three surfaces (Road, Runoff, Shoulder) with independent grip and speed multipliers. Road = 1.0/1.0. Runoff = 0.5/0.4. Drives strategic line-keeping.

### Why Frozen

The engine was proven in v02. Freezing it means:
- 366 tests act as guardrails -- any regression is caught immediately
- Renderer changes cannot accidentally break physics
- AI training results are reproducible across builds
- Track data lives as TypeScript arrays outside the engine (no freeze violation)

---

## Renderer Layer (New in v04)

**Directory:** `src/renderer/` (+ `dom/` and `screens/` subdirectories)
**Line count:** ~7,744 lines across 26 files
**Boundary rule:** reads engine state, never mutates it

### Files

| File | Lines | Purpose |
|---|---|---|
| `OverlayRenderer.ts` | 1,519 | Race UI overlays: countdown, lap times, position |
| `HudRenderer.ts` | 572 | Speed, minimap, lap counter (outside filter container) |
| `SoundManager.ts` | 564 | Web Audio API synthesis -- engine sound, skid, collision |
| `GameLoop.ts` | 527 | Main game loop: tick engine, update renderer, coordinate systems |
| `EffectsRenderer.ts` | 437 | Tire smoke, skid marks, sparks particle effects |
| `ScreenManager.ts` | 344 | Screen transitions and lifecycle management |
| `TrackRenderer.ts` | 217 | Track surface, boundaries, curbs using tiled textures |
| `RendererApp.ts` | 209 | Top-level application bootstrap and container setup |
| `FilterManager.ts` | 208 | Post-processing: bloom, shadow, glow via pixi-filters |
| `WorldRenderer.ts` | 196 | World container: track + cars + effects |
| `InputHandler.ts` | 92 | Keyboard input mapping to engine `Input` interface |
| `Settings.ts` | 85 | User preferences: graphics quality, volume, controls |
| `Leaderboard.ts` | 82 | Race results and standings |
| `AssetManager.ts` | 71 | Load and cache PixiJS assets from typed manifest |
| `SpritePool.ts` | 59 | Object pool for particle sprites |
| `CarRenderer.ts` | 58 | Player car sprite rendering from atlas |
| `CameraController.ts` | 57 | Smooth camera follow with lookahead |
| `AiCarRenderer.ts` | 32 | AI ghost car sprite (distinct visual from player) |

**DOM subdirectory** (`src/renderer/dom/`):

| File | Purpose |
|---|---|
| `DomMainMenu.ts` | HTML/CSS main menu overlay |
| `DomSettings.ts` | HTML/CSS settings panel |
| `DomTrackSelect.ts` | HTML/CSS track selection UI |
| `dom-styles.ts` | Shared CSS constants |

**Screens subdirectory** (`src/renderer/screens/`):

| File | Purpose |
|---|---|
| `MainMenuScreen.ts` | Menu screen lifecycle |
| `SettingsScreen.ts` | Settings screen lifecycle |
| `TrackSelectScreen.ts` | Track select screen lifecycle |

### Container Hierarchy

```
PixiJS Application
|
+-- World Container (with pixi-filters: bloom, shadow, glow)
|   +-- TrackRenderer (tiled asphalt, grass, curbs)
|   +-- EffectsRenderer (skid marks, tire smoke, sparks)
|   +-- CarRenderer (player sprite from atlas)
|   +-- AiCarRenderer (AI ghost car sprite)
|
+-- HUD Container (NO filters -- always sharp, never blurred)
|   +-- HudRenderer (speed, minimap, lap counter)
|   +-- OverlayRenderer (countdown, lap times, race position)
|
+-- DOM Layer (HTML/CSS overlays, outside PixiJS entirely)
    +-- DomMainMenu
    +-- DomTrackSelect
    +-- DomSettings
```

The HUD/filter separation is a deliberate architectural choice documented in `CLAUDE.md`: "HUD lives OUTSIDE the post-processing filter container (always sharp)." Without this, bloom and glow filters blur text to unreadable levels.

### Sound Design

`SoundManager.ts` generates all audio via the Web Audio API at runtime. No external audio files. Engine tone, skid sounds, and collision impacts are synthesized from oscillators and noise generators. Zero additional asset downloads.

---

## Asset Pipeline

All visual assets are generated autonomously. No manual art tools, no third-party asset packs.

```
scripts/asset-prompts.ts          11 versioned prompts + STYLE_PREFIX
        |
        v
scripts/generate-assets.ts        Gemini Imagen 4 API (sequential, rate-limited)
        |
        v
assets/raw/                        Raw API output (gitignored)
        |
        v
scripts/process-assets.ts          Sharp: chroma-key, crop, resize, atlas pack
        |
        v
public/assets/                     Deployed assets (committed)
        |
        v
src/assets/manifest.ts             Typed asset references (no magic strings)
```

### Prompt Architecture (`scripts/asset-prompts.ts`)

Every prompt shares a `STYLE_PREFIX` for visual consistency:

```
"2D top-down racing game asset, clean vector-style illustration,
 bold flat colors, hard shadows, professional game art, NOT 3D,
 NOT realistic, NOT photographic ..."
```

11 prompts total:
- 4 car sprites (player red/blue/yellow + AI) -- chroma-keyed on `#FF00FF`
- 3 track backgrounds (2048x2048 each)
- 3 tileable textures (asphalt, grass, curb)
- 1 menu background (1920x1080)

All prompts are versioned in git. Regenerating assets from the same prompts produces consistent visual style.

### Post-Processing (`scripts/image-processing.ts`)

Three processing modes:
- `chroma-key-then-resize`: Remove magenta background, resize to target dimensions (car sprites)
- `crop-and-resize`: Extract specific region then resize (curb texture)
- `resize`: Direct resize to target dimensions (backgrounds, textures)

Car sprites are packed into a single texture atlas (`public/assets/sprites/cars-atlas.json` + `cars-atlas.png`) to minimize draw calls.

### Typed Manifest (`src/assets/manifest.ts`)

```typescript
export const ASSETS = {
  cars: { atlas: 'assets/sprites/cars-atlas.json', frames: { ... } },
  tracks: { 'track-01': { bg: 'assets/tracks/track01-bg.png' }, ... },
  textures: { asphalt: '...', grass: '...', curb: '...' },
} as const;
```

Generated by `process-assets.ts`. The `as const` assertion means every asset path is a string literal type. Referencing a nonexistent asset is a compile-time error.

### Deployed Assets (`public/assets/`)

```
public/assets/
  sprites/     cars-atlas.json, cars-atlas.png
  textures/    asphalt-tile.png, grass-tile.png, curb-tile.png
  tracks/      track01-bg.png, track02-bg.png, track03-bg.png
  ui/          menu-bg.png
  ort/         ort-wasm-simd-threaded.jsep.mjs, .wasm (ONNX runtime)
```

---

## AI Training Pipeline

The AI opponent trains entirely offline against the headless engine, then deploys as a 24 KB ONNX model for browser inference.

```
python/racer_env/env.py              Gymnasium env wrapping headless engine
        |
        v
python/training/train_ppo.py         Stable Baselines3 PPO training
        |                             2M timesteps on Track 3 (Gauntlet)
        v
python/models/*.zip                   Checkpointed PyTorch models (every 50K steps)
        |
        v
python/training/export_onnx.py        torch.onnx.export (opset 17)
        |
        v
public/ai/model.onnx                  24 KB deployed model
public/ai/vecnorm_stats.json          Observation normalization statistics
        |
        v
src/ai/browser-ai-runner.ts           onnxruntime-web WASM inference
```

### Architecture Bridge

Training uses a WebSocket bridge between Python and the headless TypeScript engine:

| Component | File | Role |
|---|---|---|
| Bridge server | `src/ai/bridge-server.ts` | Node.js WebSocket server exposing engine `step()` and `reset()` |
| Bridge client | `python/racer_env/bridge_client.py` | Python WebSocket client |
| Gymnasium env | `python/racer_env/env.py` | Standard Gymnasium interface wrapping bridge client |
| Runner script | `src/ai/run-bridge.ts` | Launches bridge server (`pnpm run bridge`) |

This architecture means Python never reimplements physics. The training environment is byte-identical to the game engine.

### Observation Space (14 dimensions)

Defined in `src/ai/observations.ts` and `src/ai/ai-config.ts`:

| Index | Value | Range | Source |
|---|---|---|---|
| 0-8 | Ray distances (9 rays, 180-degree arc) | [0, 1] | `src/ai/raycaster.ts` |
| 9 | Speed (normalized) | [0, 1] | `car.speed / CAR.maxSpeed` |
| 10 | Yaw rate (normalized) | [-1, 1] | `car.yawRate / 5.0` |
| 11 | Steering input | [-1, 1] | `car.prevInput.steer` |
| 12 | Lap progress | [0, 1] | `arcLength / totalLength` |
| 13 | Centerline distance | [0, 1] | `distance / 80` |

Ray casting (`src/ai/raycaster.ts`): 9 rays spread across 180 degrees forward arc, max range 200 game units. Each ray tests against every segment of both inner and outer track boundaries.

### Action Space (3 continuous)

Output from the ONNX model: `[steer, throttle, brake]`. Maps directly to the engine's `Input` interface.

### Training Details

- **Algorithm:** PPO (Proximal Policy Optimization)
- **Framework:** Stable Baselines3 (`python/training/train_ppo.py`)
- **Steps:** 2,000,000 on Track 3 (Gauntlet -- most complex track)
- **Normalization:** VecNormalize wrapping observations (statistics exported as JSON)
- **Checkpointing:** Every 50,000 steps (`python/models/`)
- **Reward shaping** (`src/ai/reward.ts`): Progress-weighted with penalties for wall contact, off-track, and stillness

### Browser Inference (`src/ai/browser-ai-runner.ts`)

- Loads `public/ai/model.onnx` (24 KB) and `public/ai/vecnorm_stats.json` (822 bytes)
- ONNX Runtime Web WASM backend (single-threaded, `numThreads = 1`)
- VecNormalize statistics applied in TypeScript before inference (`src/ai/vecnormalize.ts`)
- Runs per-tick: build observation, normalize, infer, apply actions
- No server required -- pure client-side inference

---

## Track Design Philosophy

Three tracks, increasing complexity:

| Track | Name | Purpose |
|---|---|---|
| Track 1 | Oval | Sanity check, frozen from v02. Simple geometry validates engine stability. |
| Track 2 | Speedway | Redesigned for v04. Banked corners, varying radii. |
| Track 3 | Gauntlet | Redesigned for v04. Chicanes, hairpins, decreasing-radius corners. |

Design constraints:
- **Zero repeated corner radii** -- forces the AI to generalize, not memorize
- **Decreasing-radius corners** -- the hardest kind of turn; braking point changes with entry speed
- **Chicanes** -- rapid direction changes test the AI's reactive behavior
- **Track data is pure TypeScript arrays** -- not engine code, so adding/modifying tracks does not violate the engine freeze

The AI trains exclusively on Track 3 (the hardest). Performance on Tracks 1 and 2 validates generalization.

---

## Deployment

### Build Pipeline (`package.json`)

```
pnpm run build
  = node scripts/copy-ort-wasm.cjs    # Copy ORT WASM to public/
  && tsc --noEmit                      # Type-check (no emit)
  && vite build                        # Production bundle
```

### Vite Configuration (`vite.config.ts`)

- `base: './'` -- relative paths for static hosting
- Custom `ortWasmPlugin`: dev middleware serves ORT files from `node_modules/` bypassing Vite's module transform (ORT dynamically imports `.mjs` glue code at runtime, which Vite's transform breaks)
- `assetsInlineLimit: 0` -- no asset inlining (ONNX model must stay as separate file)
- `optimizeDeps.exclude: ['onnxruntime-web']` -- prevent Vite pre-bundling of WASM module

### ORT WASM Copy (`scripts/copy-ort-wasm.cjs`)

Copies `ort-wasm-simd-threaded.jsep.{mjs,wasm}` from `node_modules/onnxruntime-web/dist/` to `public/assets/ort/`. Required because Vite serves `public/` as-is with no module transformation, which is what ORT's dynamic import expects.

### COOP/COEP Headers (`vercel.json`)

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
      { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
    ]
  }]
}
```

Required for `SharedArrayBuffer` access, which ONNX Runtime WASM uses for multi-threaded inference. Without these headers, the WASM backend fails silently in production.

### Build Verification

13 integration tests (`tests/integration/`) validate deployment artifacts:
- ONNX model file exists and is loadable
- VecNormalize stats match expected observation size
- All asset files referenced by `manifest.ts` exist in `public/`
- ORT WASM files are present
- HTML entry point references correct asset paths

Run with: `pnpm run test:build`

### Hosting

Static deployment on Vercel. No backend, no server-side logic, no database. The entire application -- physics, rendering, AI inference -- runs in the browser.

---

## Cross-References

- **Metrics and test counts:** see `evidence-package.md`
- **Development process and methodology:** see `methodology-in-practice.md`
- **Full project specification:** see `docs/Top-Down-Racer-v04-CE-Spec.md`
