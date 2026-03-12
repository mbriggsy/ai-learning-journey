---
title: "Phase 2: Core Visual Upgrade"
type: feat
status: active
date: 2026-03-11
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
deepened: 2026-03-11
---

# Phase 2: Core Visual Upgrade

## Enhancement Summary

**Deepened on:** 2026-03-11
**Agents used:** 10 (Architecture Strategist, TypeScript Reviewer, Performance Oracle, Pattern Recognition, Code Simplicity, Security Sentinel, Frontend Races, Spec Flow Analyzer, Best Practices Researcher, Framework Docs Researcher)

### Key Improvements
1. **6 critical bugs fixed** — async race conditions in asset loading, unsafe type casts, missing null guards, EffectsRenderer migration undersized
2. **PixiJS v8 API confirmed** — `FillPattern` + `textureSpace: 'global'` validated for polygon texture fills with high confidence
3. **22 spec flow gaps identified and resolved** — spectator dispatch, OverlayRenderer, WorldRenderer lifecycle, menu screen reparenting, v02 carry-forward file list
4. **~30% LOC reduction** — menu BG lifecycle simplified (keep loaded), boot loading parallelized, error fallbacks deferred
5. **VRAM budget corrected** — mipmaps add ~33%; track BG mipmaps should be disabled (saves 5.3MB)
6. **Phase 3 debt flagged** — EffectsRenderer per-frame Graphics allocation will bottleneck with filters

### Critical Fixes (Must Address Before Implementation)
| # | Issue | Source | Fix |
|---|-------|--------|-----|
| C1 | `loadTrack()` race on rapid track switching | Races Reviewer | Generation counter pattern |
| C2 | ScreenManager allows concurrent async transitions | Races Reviewer | `transitioning` flag |
| C3 | Asset unload before container hide causes blank frame | Races Reviewer | Hide containers BEFORE unloading textures |
| C4 | Unsafe cast `(container.children[0] as Sprite).tint` | TypeScript Reviewer | Expose `setTint()`/`setAlpha()` on CarRenderer |
| C5 | Non-null assertions on `prev.aiCar!` | TypeScript Reviewer | Guard both `prev.aiCar` and `curr.aiCar` |
| C6 | EffectsRenderer migration is more than "one-line" | Architecture Strategist | Constructor must accept `effectsLayer`, not `worldContainer` |
| C7 | `render()` signature missing `RaceState` | Architecture Strategist | Add `race: RaceState` parameter |
| C8 | WorldRenderer lifecycle vs. shared containers undefined | Spec Flow Analyzer | Define ownership: recreate per race, caller cleans containers |
| C9 | Spectator mode dispatch pattern incompatible with v02 | Spec Flow Analyzer | Follow v02 pattern: GameLoop swaps primary state |

### New Considerations Discovered
- **`isRenderGroup: true`** should be set on `worldContainer` and `hudContainer` for transform isolation and filter performance
- **`app.renderer.prepare.upload(texture)`** forces GPU texture upload before gameplay — prevents first-frame hitch
- **Filter resolution must match `devicePixelRatio`** on HiDPI displays (Phase 3 concern, document now)
- **`backgroundLoadBundle()`** can preload the next likely track while player is on menu
- **`shoulderSide` config** from v02 must be carried forward or explicitly removed
- **EffectsRenderer per-frame Graphics allocation** is Phase 3 debt — will bottleneck with filter passes

---

## Overview

Phase 2 transforms the game from v02's geometric shapes to sprite-based rendering with pre-rendered track backgrounds, tiled surface textures, and a polished container hierarchy. This is where the game starts *looking* like a real game.

**Consumes:** Phase 1 outputs (typed asset manifest, processed assets in `public/assets/`, redesigned track geometry)
**Produces:** A fully rendered game with car sprites, textured tracks, environment backgrounds, and correct container hierarchy ready for Phase 3 post-processing filters

## Problem Statement / Motivation

v02 renders everything with PixiJS `Graphics` objects — flat color fills, geometric car shapes (15+ objects per car), no textures. The game works but looks like a prototype. Phase 0/1 generated and processed production-quality assets (car sprites, track backgrounds, tiled textures). Phase 2 integrates these assets into the renderer to replace every geometric placeholder with textured, sprite-based rendering.

The engine is frozen — all changes live in the renderer layer, which reads engine state but never mutates it (see brainstorm: `docs/brainstorms/2026-03-11-full-build-brainstorm.md` — Decision #2).

## Proposed Solution

### Architecture Decisions (Resolving SpecFlow Gaps)

The SpecFlow analysis identified 21 gaps in the Phase 2 specification. These are resolved below as explicit architectural decisions:

#### D1: Asset Loading Strategy (SpecFlow Gap 1-3)

**Two-tier loading: boot assets (once) + per-track assets (on selection).**

| Tier | Assets | Lifecycle | VRAM |
|------|--------|-----------|------|
| Boot (load once, keep forever) | Car atlas (520x520), asphalt tile, grass tile, curb tile, menu BG (1920x1080) | Load at `Application.init()`, never unloaded | ~10.3MB |
| Per-track (load on selection, destroy on track change) | Track BG (2048x2048) | Load when player selects track, destroy when leaving gameplay or switching tracks | ~16MB |

**PixiJS API pattern:** Use `Assets.init()` with a manifest that registers all assets by key. Use `Assets.load()` with array form for parallel loading.

```typescript
// Boot: load ALL shared assets in parallel (single call)
await Assets.load([
  ASSETS.cars.atlas,
  ASSETS.textures.asphalt,
  ASSETS.textures.grass,
  ASSETS.textures.curb,
  ASSETS.ui.menuBg,
]);

// Track selection: load track-specific BG
await Assets.load(ASSETS.tracks[trackId].bg);

// Track change: unload previous
Assets.unload(ASSETS.tracks[prevTrackId].bg);
```

**Loading screen:** Simple splash screen (title text, no per-asset progress bar). Boot assets total ~10.3MB — loads in under 1 second on local Vite dev server, under 3 seconds on production. The splash screen shows until the single `Assets.load([...])` promise resolves.

**Track-switch loading:** Block on track-select screen. Show a brief "Loading track..." text indicator. Transition to `playing` only after the track BG texture is fully uploaded to GPU.

### Research Insights — D1

**Parallel loading is critical:**
PixiJS v8's `Assets.load()` accepts an array of keys and loads them in parallel. The original plan used 5 sequential `await` calls, which serializes network requests and can push boot time past the 3-second budget on real connections.

**Menu BG lifecycle simplified (was three tiers, now two):**
The original plan unloaded the menu BG (~8MB) during gameplay and reloaded on return. The code simplicity reviewer flagged this as over-engineering: 8MB savings against a 512MB+ GPU budget is negligible, and the load/unload/reload cycle introduces async race conditions on rapid menu/gameplay toggling. The menu BG now stays loaded permanently.

**Background preloading available:**
`Assets.backgroundLoadBundle('track-oval')` can preload the most likely track while the player is on the menu. Not implemented in Phase 2 but available as a future optimization.

**`Assets.load()` progress callback exists for bundles:**
`Assets.loadBundle('bundle-name', (progress) => { /* 0.0 to 1.0 */ })` provides progress. But for boot assets served from localhost, the load is sub-second, making a progress bar unnecessary overhead.

---

#### D2: Tiled Texture Technique (SpecFlow Gap 7-8)

**Use PixiJS v8 `Graphics.fill()` with `FillPattern` or texture fill options.**

This directly replaces v02's `graphics.poly(points).fill({ color: 0x3a3a3a })` with textured polygon fills. Minimal architectural change from v02's TrackRenderer pattern.

**Tile scale:** Fixed world-unit scale, independent of BG-to-world mapping:
- Asphalt: repeats every **20 world units** (512px tile / 20wu = 25.6 px/wu — crisp at all zoom levels)
- Grass: repeats every **10 world units** (256px tile / 10wu = 25.6 px/wu)
- Curb: repeats every **5 world units** along the shoulder strip

These values will need visual tuning at runtime. Start with these and adjust.

### Research Insights — D2

**API confirmed with high confidence:**
PixiJS v8 supports two approaches for textured polygon fills:

```typescript
// Approach 1: Direct texture fill with textureSpace
const asphaltTexture = Assets.get(ASSETS.textures.asphalt);
roadGraphics.poly(roadVertices)
  .fill({ texture: asphaltTexture, textureSpace: 'global' });

// Approach 2: FillPattern for explicit tiling
import { FillPattern, Matrix } from 'pixi.js';
const pattern = new FillPattern(asphaltTexture, 'repeat');
roadGraphics.poly(roadVertices).fill({ fill: pattern });
```

**`textureSpace: 'global'` is key:**
- `'local'` (default): UV coordinates normalized to shape bounding box — texture stretches to fit. Wrong for tiling.
- `'global'`: Texture coordinates relative to Graphics object's coordinate system — texture tiles consistently across shapes. **Use this for all track surface fills.**

**Matrix transform for tile scale control:**
```typescript
const matrix = new Matrix().scale(20 / 512, 20 / 512); // 20wu per tile repeat
roadGraphics.poly(roadVertices)
  .fill({ texture: asphaltTexture, textureSpace: 'global', matrix });
```

**Spike test required (Step 0):**
While the API is confirmed in docs, the matrix math for world-space tiling on arbitrary polygons should be validated early. Add a spike test as the first action before building the full TrackRenderer.

**Power-of-two dimensions:**
Required for proper tiling in WebGL1. All planned tile textures (512x512, 256x256, 128x64) satisfy this. The 128x64 curb tile is not square but is still power-of-two per dimension.

---

#### D3: Car Sprite Scale (SpecFlow Gap 9-10)

**Scale 256px sprite to ~10 world units tall (matching v02 visual footprint).**

v02's `CarRenderer` uses `CAR_LENGTH = 10.0` for visual dimensions (distinct from the engine's `CAR.length = 4.0` physics body). The sprite maps to the visual footprint:

```typescript
const CAR_VISUAL_LENGTH = 10.0; // world units — matches v02 visual size
const SPRITE_PX = 256;
const carScale = CAR_VISUAL_LENGTH / SPRITE_PX; // 0.0391
sprite.anchor.set(0.5, 0.5); // rotation around center of gravity
sprite.scale.set(carScale, carScale);
```

The car sprite PNG is authored with front pointing UP. `sprite.rotation` is set to `heading` from engine state.

#### D4: AI Car Phase 2 Treatment (SpecFlow Gap 11)

**Phase 2: different atlas frame + tint + alpha. Phase 3 adds GlowFilter.**

The AI car uses the `car-ai` atlas frame (different silhouette per ADR-03). Phase 2 applies:
- `sprite.tint = AI_CAR_TINT` (0x00eeff, cyan — carried from v02)
- `sprite.alpha = AI_CAR_ALPHA` (0.55, ghost transparency — carried from v02)

No `GlowFilter` until Phase 3 (when `pixi-filters` is added as a dependency). The tint + alpha provides sufficient visual distinction for all 3 game modes.

### Research Insights — D4

**Extract magic numbers to named constants:**
```typescript
const AI_CAR_TINT = 0x00eeff;
const AI_CAR_ALPHA = 0.55;
```
Makes tuning trivial and grep-able.

**Expose styling through CarRenderer API, not child traversal:**
The original plan used `(this.container.children[0] as Sprite).tint = 0x00eeff` — a fragile cast that breaks if CarRenderer adds children (e.g., shadow sprite in Phase 3). Instead, expose controlled methods:
```typescript
// CarRenderer.ts
setTint(color: number): void { this.sprite.tint = color; }
setAlpha(value: number): void { this.container.alpha = value; }
```

**Consider eliminating AiCarRenderer as a class:**
The code simplicity reviewer notes that Phase 2's AiCarRenderer is a 2-line configuration wrapper with no behavior. Options:
- **(a) Keep AiCarRenderer** — documents AI-specific visual treatment, provides a home for Phase 3's GlowFilter.
- **(b) Add `tint`/`alpha` options to CarRenderer constructor** — `new CarRenderer(ASSETS.cars.frames.ai, { tint: AI_CAR_TINT, alpha: AI_CAR_ALPHA })`. Reintroduce AiCarRenderer in Phase 3 when GlowFilter justifies it.

**Decision: Keep AiCarRenderer** but fix the child traversal anti-pattern using `setTint()`/`setAlpha()`. It provides a clear extension point for Phase 3.

---

#### D5: Container Hierarchy (SpecFlow Gap 12-13)

**Phase 2 creates the full ADR-05 hierarchy. Phase 3 attaches filters.**

```
App.stage
  ├── menuContainer (visible: main-menu, track-select, settings)
  │    ├── Menu BG sprite
  │    ├── MainMenuScreen.container
  │    ├── TrackSelectScreen.container
  │    └── SettingsScreen.container
  ├── worldContainer (visible: playing — camera transform applied here, isRenderGroup: true)
  │    ├── trackLayer (Container)
  │    │    ├── bgSprite (2048x2048 environment art)
  │    │    ├── surfaceGraphics (tiled asphalt fill on road polygon)
  │    │    ├── shoulderGraphics (tiled grass/curb on shoulder polygon)
  │    │    ├── finishLine (checkered pattern — from v02)
  │    │    └── wallStrokes (boundary lines — from v02)
  │    ├── effectsLayer (Container — EffectsRenderer migrated here)
  │    │    ├── skidSegments
  │    │    ├── particles
  │    │    └── checkpointFlashes
  │    └── carLayer (Container)
  │         ├── aiCarSprite (if vs-ai/spectator)
  │         └── playerCarSprite
  └── hudContainer (visible: playing — NO camera transform, NO filters, isRenderGroup: true)
       └── OverlayRenderer (countdown, pause, finished — copied from v02)
```

**Rendering order:** PixiJS renders children in add-order. `trackLayer` first (background), then `effectsLayer` (skid marks under cars), then `carLayer` (cars on top). Within `trackLayer`, children are ordered back-to-front: BG → surface → shoulder → finish → walls.

**EffectsRenderer migration:** Change EffectsRenderer constructor to accept `effectsLayer` instead of `worldContainer`. This is a constructor signature change, not a one-line reparent (see Research Insights below).

**Car layer ordering:** AI car sprite added before player car sprite so player car renders on top (visually in front during overtakes).

**Menu screen reparenting:** v02 adds screen containers directly to `app.stage` via `deps.stage.addChildAt()`. Phase 2 adds them to `menuContainer` instead, so `menuContainer.visible = false` hides all menu UI when entering gameplay.

### Research Insights — D5

**Set `isRenderGroup: true` on worldContainer and hudContainer:**
Promotes each to its own render group, providing transform isolation and better filter performance. Filters applied to a render group only affect that subtree.
```typescript
const worldContainer = new Container({ label: 'world', isRenderGroup: true });
const hudContainer = new Container({ label: 'hud', isRenderGroup: true });
```

**EffectsRenderer migration is more than one line (blocking fix C6):**
v02's EffectsRenderer constructor takes `worldContainer` and calls `worldContainer.addChild(this.container)` internally. Phase 2 must change the constructor parameter to `effectsLayer`:
```typescript
// v02: new EffectsRenderer(worldContainer)
// v04: new EffectsRenderer(effectsLayer)
```
This affects: constructor signature, RendererApp wiring, and potentially `destroy()`. Construct with `effectsLayer` directly — never construct-then-reparent (avoids timing window where effects render at wrong z-order).

**OverlayRenderer must be included:**
v02's OverlayRenderer handles countdown, pause overlay, and finished overlay. Without it, the player has no countdown, no pause UI, and no race results. Copy from v02 and add to `hudContainer`.

**Menu screen containers must be reparented:**
v02's ScreenManager calls `deps.stage.addChildAt(screen.container, 0)`. Phase 2 must change this to `menuContainer.addChild(screen.container)` so the `menuContainer.visible` toggle works.

---

#### D6: Y-Flip Pattern (SpecFlow Gap 6)

**All world-space sprites set `scale.y = -1` to counteract the camera's negative Y scale.**

v02's `CameraController` applies `worldContainer.scale.set(zoom, -zoom)` for the engine's Y-up → screen Y-down conversion. Any Sprite placed in the world container inherits this flip and renders upside-down unless compensated.

**Pattern for all world-space sprites:**
```typescript
// Environment BG
bgSprite.scale.y = -1; // counteract camera Y-flip

// Car sprites — already use rotation, so:
const carScale = CAR_VISUAL_LENGTH / SPRITE_PX;
carSprite.scale.set(carScale, -carScale); // negative Y counteracts camera flip
```

This is a **mandatory pattern** for any Sprite added to `worldContainer` or its children. Document as a comment in the base setup.

### Research Insights — D6

**Per-layer Y-flip alternative considered:**
Setting `scale.y = -1` on each sub-layer container (trackLayer, carLayer, effectsLayer — 3 lines) instead of per-sprite would reduce the bug surface area. However, this negates child position Y values too, requiring all position assignments to be negated. The added complexity outweighs the benefit. **Per-sprite approach retained.**

**Rotation direction inverts under Y-flip:**
When the Y-axis is flipped via the camera, positive rotation that was clockwise becomes counter-clockwise. v02 handles this correctly (heading from engine maps directly). Document this for future developers.

**Text under Y-flip needs special handling:**
Text objects do not have `anchor` — use `pivot` instead. Not relevant for Phase 2 (HUD text is in `hudContainer` which is not Y-flipped) but relevant if debug text is ever added to `worldContainer`.

---

#### D7: Camera Polish Scope (SpecFlow Gap 16)

**Phase 2 camera polish = verify BG coverage at all zoom levels. No new camera features.**

v02's CameraController works correctly. Phase 2 changes:
1. Verify the BG sprite extends beyond the camera viewport at all zoom levels (ZOOM_MIN=2.5 through ZOOM_MAX=4.0) for all three tracks
2. Verify the world-to-pixel mapping from Phase 1 produces correct visual results
3. No camera rotation, no lookahead, no shake — those are Phase 3+ polish items

The camera's `_carHeading` parameter remains unused. If Phase 3 wants car-facing-up rotation, it can enable it then.

#### D8: Loading Screen & Transitions (SpecFlow Gap 14-15)

**Boot loading:** Simple splash screen (title text on dark background). All boot assets load in a single parallel `Assets.load([...])` call. No per-asset progress bar — boot completes in under 1 second locally. Splash screen shows until the promise resolves, then transitions to main menu.

**Track-switch loading:** Block on track-select screen. Show a brief "Loading track..." text indicator over the track-select UI. Transition to `playing` only after the track BG texture is fully uploaded to GPU. Use `app.renderer.prepare.upload(texture)` to force GPU upload before transitioning.

**Track-switch transition must be non-interruptible:** While track BG loads, the ScreenManager refuses additional `goto()` calls (see `transitioning` flag in Step 7).

### Research Insights — D8

**Force GPU texture upload before gameplay (prevents first-frame hitch):**
PixiJS may defer actual GPU upload until the texture is first drawn. A 16MB RGBA texture upload can take 5-30ms on integrated GPUs. Force upload after `Assets.load()` completes:
```typescript
await Assets.load(ASSETS.tracks[trackId].bg);
const texture = Assets.get(ASSETS.tracks[trackId].bg);
app.renderer.prepare.upload(texture); // upload to GPU now, not on first render
```

**Boot progress bar is YAGNI:**
For 5 local assets totaling ~10.3MB served by Vite, boot completes in under 100ms locally. Even on production (static CDN), sub-second. A per-asset progress bar with sequential loading adds ~30 LOC of complexity for a sub-second operation. Simple splash screen is sufficient.

---

#### D9: Track BG on Return to Menu (SpecFlow Gap related)

**Destroy track BG when leaving gameplay.** The reload cost on re-entry is acceptable. VRAM savings (16MB freed) are worth more than avoiding a sub-second reload.

State transitions:
```
track-select → [load track BG] → playing
playing → [destroy track BG] → track-select
track-select → [load same/different track BG] → playing
```

**Critical: unload ordering.** Always hide `worldContainer` (set `visible = false`) BEFORE calling `Assets.unload()` on the track BG. If the texture is unloaded while still visible, PixiJS renders a blank/corrupted frame.

#### D10: Car Shadows (SpecFlow Gap — Q12)

**Deferred to Phase 3.** `DropShadowFilter` requires `pixi-filters`. Phase 2 renders cars without shadows. The container hierarchy (CarLayer) supports adding shadow sprites later.

#### D11: Curb/Shoulder Texture (SpecFlow Gap — Q13)

**Phase 2 applies all three textures:**
- **Asphalt tile** → road surface polygon (between inner/outer road edges)
- **Grass tile** → off-track area (outside outer boundary, inside track BG bounds)
- **Curb tile** → shoulder/runoff polygon (between road edge and wall boundary)

v02 renders shoulders as solid tan (`#c2a87a`). Phase 2 replaces this with the curb tile texture.

**`shoulderSide` configuration:** v02's `buildTrackGraphics()` accepts `shoulderSide: 'inner' | 'both'` to control which sides get shoulder rendering. Phase 2 must carry this parameter forward — different tracks may use different shoulder configurations.

#### D12: Error Handling for Asset Loads (SpecFlow Gap 19)

**Simple error handling — no graceful degradation code paths.**

Assets are local static files served by Vite (dev) or a static host (prod). If they fail, the build is broken. Writing four different fallback rendering paths for scenarios that indicate broken builds is premature.

- **Any asset fails:** `console.error` with the asset key. PixiJS renders its default behavior (empty/white textures). The developer sees the error immediately and fixes the build.
- **No retry logic.** No fallback rendering code. No alternate color fills.
- **Car atlas failure during boot:** The `Assets.load([...])` promise rejects. The splash screen remains visible. A text error message is displayed on the canvas.

### Research Insights — D12

**Graceful degradation deferred (simplicity):**
The original plan defined 4 different error handling behaviors (fatal for atlas, console warning + fallback for BG, console warning + color fill for tiles, console warning + solid dark for menu BG). The code simplicity reviewer identified this as ~30-40 LOC of fallback paths that will never execute in a correctly built game. Deferred to "if a real problem surfaces."

**`buildTrackGraphics()` needs a null guard on BG texture:**
If `Assets.get(ASSETS.tracks[trackId].bg)` returns undefined, `new Sprite(undefined)` throws. Add:
```typescript
const bgTexture = Assets.get(ASSETS.tracks[trackId].bg);
if (bgTexture) {
  const bgSprite = new Sprite(bgTexture);
  // ... position, scale, add to container
}
```

---

#### D13: VRAM Budget (SpecFlow Gap 20)

**Total VRAM budget at gameplay time: ~28MB (with mipmaps) or ~22MB (without mipmaps on track BG).**

| Asset | Base VRAM | With Mipmaps (+33%) |
|-------|-----------|---------------------|
| Car atlas (520x520 RGBA) | ~1.0MB | ~1.3MB |
| Asphalt tile (512x512 RGBA) | ~1.0MB | ~1.3MB |
| Grass tile (256x256 RGBA) | ~0.25MB | ~0.33MB |
| Curb tile (128x64 RGBA) | ~0.03MB | ~0.04MB |
| Menu BG (1920x1080 RGBA) — kept loaded | ~7.9MB | ~10.5MB |
| Track BG (2048x2048 RGBA) | ~16.0MB | ~21.3MB |
| PixiJS internals (render targets, back buffer) | ~2-4MB | ~2-4MB |
| **Total (mipmaps on all)** | | **~36.7MB** |
| **Total (mipmaps disabled on track BG + menu BG)** | | **~22.0MB** |

### Research Insights — D13

**Mipmaps are a hidden VRAM multiplier:**
PixiJS v8 generates mipmaps by default (`autoGenerateMipmaps: true`). Mipmaps add ~33% per texture. The track BG at 2048x2048 gains 5.3MB from mipmaps alone.

**Disable mipmaps on track BG and menu BG:**
At zoom levels 2.5-4.0 px/wu, the track BG is rendered at or above native resolution — lower mip levels are never sampled. The menu BG is displayed at 1:1 screen resolution. Disabling mipmaps on both saves ~12.9MB with no visual quality loss.

```typescript
// After loading, disable mipmaps on large textures
const bgTexture = Assets.get(ASSETS.tracks[trackId].bg);
bgTexture.source.autoGenerateMipmaps = false;
```

**VRAM acceptance criterion is untestable:**
There is no browser API to measure VRAM usage. Remove "Peak VRAM ≤ 25MB" from acceptance criteria. Replace with "Manual verification that GPU performance is acceptable" (already covered by quality gates).

---

### Implementation Phases

#### Step 0: Texture Fill Spike Test (NEW)

**Goal:** Validate `Graphics.poly().fill({ texture, textureSpace: 'global', matrix })` before building the full TrackRenderer.

**Test:** Create a simple PixiJS app. Draw a polygon. Fill it with a tiled texture using a scale matrix. Verify the texture tiles correctly within the polygon boundaries.

```typescript
const app = new Application();
await app.init({ width: 800, height: 600 });
const texture = await Assets.load('test-tile.png');
const matrix = new Matrix().scale(20 / 512, 20 / 512);
const g = new Graphics()
  .poly([0, 0, 400, 0, 400, 300, 0, 300])
  .fill({ texture, textureSpace: 'global', matrix });
app.stage.addChild(g);
```

**If this fails:** Fall back to `TilingSprite` with stencil mask on the track polygon. This has significantly different implementation requirements — design the fallback before proceeding with Step 3.

**Acceptance criteria:**
- [ ] Texture tiles correctly within a polygon (no stretching, proper repeat)
- [ ] `textureSpace: 'global'` produces consistent tiling across multiple shapes
- [ ] Matrix scale controls tile repeat frequency as expected
- [ ] Works with non-rectangular polygons (annular road polygon)

---

#### Step 1: RendererApp Bootstrap + Container Hierarchy

**Files:** `src/renderer/RendererApp.ts` (new)

Set up the PixiJS Application, create the container hierarchy (D5), and implement the boot loading sequence.

```typescript
// RendererApp.ts — bootstrap
const app = new Application();
await app.init({ background: '#111111', resizeTo: window, autoDensity: true });

// Create container hierarchy with render groups
const menuContainer = new Container({ label: 'menu' });
const worldContainer = new Container({ label: 'world', isRenderGroup: true });
const trackLayer = new Container({ label: 'trackLayer' });
const effectsLayer = new Container({ label: 'effectsLayer' });
const carLayer = new Container({ label: 'carLayer' });
worldContainer.addChild(trackLayer, effectsLayer, carLayer);
const hudContainer = new Container({ label: 'hud', isRenderGroup: true });
app.stage.addChild(menuContainer, worldContainer, hudContainer);

// Show splash screen (simple title text on dark background)
const splash = createSplashScreen(); // PixiJS Text, centered
app.stage.addChild(splash);

// Boot loading — ALL shared assets in parallel (single call)
await Assets.load([
  ASSETS.cars.atlas,
  ASSETS.textures.asphalt,
  ASSETS.textures.grass,
  ASSETS.textures.curb,
  ASSETS.ui.menuBg,
]);

// Remove splash, show main menu
app.stage.removeChild(splash);
splash.destroy();
```

**Acceptance criteria:**
- [ ] PixiJS Application initializes with WebGL backend
- [ ] Container hierarchy matches ADR-05 exactly (worldContainer > trackLayer/effectsLayer/carLayer, separate hudContainer)
- [ ] `isRenderGroup: true` set on worldContainer and hudContainer
- [ ] Boot loading completes for all shared assets in parallel (single `Assets.load([...])` call)
- [ ] Splash screen shown during boot, removed after load completes
- [ ] `autoDensity: true` set for HiDPI support
- [ ] Fullscreen toggle wired (F/F11 keys — copied from v02)

---

#### Step 2: CarRenderer — Sprite-Based Replacement

**Files:** `src/renderer/CarRenderer.ts` (new), `src/renderer/AiCarRenderer.ts` (new)

Replace v02's 15+ Graphics objects with a single Sprite per car loaded from the atlas.

```typescript
// CarRenderer.ts
const AI_CAR_TINT = 0x00eeff;
const AI_CAR_ALPHA = 0.55;
const CAR_VISUAL_LENGTH = 10.0; // world units — matches v02 visual size
const SPRITE_PX = 256;
const DEFAULT_PLAYER_FRAME = 'car-player-red'; // default until Phase 4 color selection

export class CarRenderer {
  public readonly container: Container;
  private readonly sprite: Sprite;

  constructor(frameName: string) {
    this.container = new Container();
    const texture = Texture.from(frameName); // resolved from atlas (must be pre-loaded)
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.5);
    const scale = CAR_VISUAL_LENGTH / SPRITE_PX; // 0.0391
    this.sprite.scale.set(scale, -scale); // negative Y for camera Y-flip (D6)
    this.container.addChild(this.sprite);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.container.position.set(worldX, worldY);
    this.container.rotation = heading;
  }

  setTint(color: number): void {
    this.sprite.tint = color;
  }

  setAlpha(value: number): void {
    this.container.alpha = value;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

```typescript
// AiCarRenderer.ts — Phase 2 treatment (D4)
export class AiCarRenderer {
  public readonly container: Container;
  private carRenderer: CarRenderer;

  constructor() {
    this.carRenderer = new CarRenderer(ASSETS.cars.frames.ai);
    this.container = this.carRenderer.container;
    // Phase 2: tint + alpha only. Phase 3 adds GlowFilter.
    this.carRenderer.setAlpha(AI_CAR_ALPHA);
    this.carRenderer.setTint(AI_CAR_TINT);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.carRenderer.update(worldX, worldY, heading);
  }

  destroy(): void {
    this.carRenderer.destroy();
  }
}
```

**Acceptance criteria:**
- [ ] Player car renders from atlas sprite (default frame: `car-player-red`)
- [ ] AI car renders from `car-ai` atlas frame with cyan tint + 55% alpha
- [ ] No unsafe type casts — tint/alpha set via CarRenderer's `setTint()`/`setAlpha()` methods
- [ ] Cars rotate smoothly based on engine heading state
- [ ] Cars display right-side-up despite camera Y-flip (D6)
- [ ] `update()` interface identical to v02 (position + heading)
- [ ] Car visual size matches v02 (~10 world units — D3)
- [ ] `destroy()` method cleans up PixiJS objects

---

#### Step 3: TrackRenderer — Textured Surfaces + Environment BG

**Files:** `src/renderer/TrackRenderer.ts` (new)

Replace v02's solid-color fills with textured fills and add the pre-rendered environment BG.

**Track layer composition (back to front within `trackLayer`):**
1. **Environment BG sprite** — 2048x2048 pre-rendered art, positioned and scaled per Phase 1's world-to-pixel mapping
2. **Grass fill** — tiled grass texture filling the area outside the outer road edge (environment detail)
3. **Road surface** — tiled asphalt texture filling the road polygon (between inner/outer road edges)
4. **Shoulder/runoff** — tiled curb texture filling shoulder strips (between road edges and wall boundaries)
5. **Finish line** — checkered pattern (carried from v02)
6. **Wall strokes** — boundary lines (carried from v02)

```typescript
// TrackRenderer.ts — core pattern
function buildTrackGraphics(
  track: TrackState,
  trackId: TrackId,
  shoulderSide: 'inner' | 'both' = 'both', // carried from v02
): Container {
  const container = new Container();

  // 1. Environment BG (null-guarded per D12)
  const bgTexture = Assets.get(ASSETS.tracks[trackId].bg);
  if (bgTexture) {
    const bgSprite = new Sprite(bgTexture);
    bgSprite.anchor.set(0.5, 0.5);
    // Compute centroid from track geometry bounding box at runtime
    const bb = computeBoundingBox(track);
    bgSprite.position.set(bb.centerX, bb.centerY);
    const bgScale = (bb.maxExtent + 200) / 2048; // Phase 1 mapping with margins
    bgSprite.scale.set(bgScale, -bgScale); // negative Y for camera Y-flip (D6)
    container.addChild(bgSprite);
  }

  // 2. Road surface with tiled asphalt
  const asphaltTexture = Assets.get(ASSETS.textures.asphalt);
  const roadGraphics = new Graphics();
  const asphaltMatrix = new Matrix().scale(20 / 512, 20 / 512); // 20wu tile repeat
  roadGraphics.poly([...track.outerRoadEdge, ...track.innerRoadEdge.slice().reverse()])
    .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: asphaltMatrix });
  container.addChild(roadGraphics);

  // 3. Shoulder with curb texture (similar pattern, uses shoulderSide config)
  // 4. Finish line (from v02 buildFinishLine logic)
  // 5. Wall strokes (from v02 wall rendering logic)

  return container;
}
```

### Research Insights — Step 3

**Compute track centroid at runtime, not hardcode:**
Rather than embedding centroid values in the plan, compute BG position from track geometry's bounding box in `buildTrackGraphics()`. This keeps positioning in sync with any geometry tweaks.

**`shoulderSide` parameter must be preserved:**
v02's TrackRenderer uses this to control which sides get shoulder rendering. Different tracks may use `'inner'` or `'both'`. Carry forward.

**Acceptance criteria:**
- [ ] Environment BG renders behind all track geometry, correctly positioned at computed track centroid
- [ ] BG renders right-side-up despite camera Y-flip (D6)
- [ ] Road surface uses tiled asphalt texture with `textureSpace: 'global'` (not solid color)
- [ ] Shoulder/runoff uses tiled curb texture (not solid tan)
- [ ] `shoulderSide` configuration carried from v02
- [ ] Finish line renders correctly (checkered, from v02 logic)
- [ ] Wall boundary strokes render on top of everything else in track layer
- [ ] BG covers entire camera viewport at all zoom levels (2.5-4.0 px/wu) for all 3 tracks
- [ ] Tiling scale looks natural (not too large, not too small — visual tuning pass)
- [ ] BG texture has mipmaps disabled (saves ~5.3MB VRAM)

---

#### Step 4: Asset Lifecycle — Per-Track Loading/Unloading

**Files:** Asset loading inlined into `RendererApp.ts` (boot) and `ScreenManager.ts` (track transitions)

### Research Insights — Step 4

**AssetManager class reconsidered:**
The code simplicity reviewer flagged `AssetManager` as YAGNI — it manages 5 boot assets + 1 per-track asset with 5 methods, when the actual logic is ~6 lines of `Assets.load()`/`Assets.unload()` calls. The architecture reviewer identified the need for async race guards.

**Decision: Keep AssetManager** but add explicit state tracking and race condition guards. The class is small, but it centralizes the critical async ordering logic that would be harder to reason about if scattered across ScreenManager.

```typescript
// AssetManager.ts — with race condition guards
export class AssetManager {
  private currentTrackId: TrackId | null = null;
  private loadGeneration = 0; // monotonic counter for stale-load detection

  async boot(): Promise<void> {
    // Load ALL shared assets in parallel
    await Assets.load([
      ASSETS.cars.atlas,
      ASSETS.textures.asphalt,
      ASSETS.textures.grass,
      ASSETS.textures.curb,
      ASSETS.ui.menuBg,
    ]);
  }

  async loadTrack(trackId: TrackId): Promise<void> {
    if (this.currentTrackId === trackId) return; // already loaded

    const generation = ++this.loadGeneration;

    // Unload previous track BG immediately
    if (this.currentTrackId) {
      Assets.unload(ASSETS.tracks[this.currentTrackId].bg);
      this.currentTrackId = null;
    }

    await Assets.load(ASSETS.tracks[trackId].bg);

    // Stale check: another loadTrack() was called while we were awaiting
    if (generation !== this.loadGeneration) {
      Assets.unload(ASSETS.tracks[trackId].bg); // discard stale load
      return;
    }

    this.currentTrackId = trackId;
  }

  unloadTrack(): void {
    if (this.currentTrackId) {
      Assets.unload(ASSETS.tracks[this.currentTrackId].bg);
      this.currentTrackId = null;
    }
  }

  get hasTrackLoaded(): boolean {
    return this.currentTrackId !== null;
  }
}
```

**Key changes from original plan:**
- Boot loading uses array form (parallel)
- Menu BG lifecycle removed — stays loaded permanently (simplification)
- `enterGameplay()` and `returnToMenu()` removed — menu BG is permanent
- Generation counter prevents stale load races (Critical Fix C1)
- `currentTrackId` set to null immediately when starting a new load (not after await)

**Acceptance criteria:**
- [ ] Boot loading completes for all shared assets in parallel before showing main menu
- [ ] Track BG loads when track is selected, before gameplay begins
- [ ] Previous track BG is unloaded when switching tracks
- [ ] Re-selecting the same track does not reload the BG unnecessarily
- [ ] Rapid track switching does not leak VRAM (generation counter discards stale loads)
- [ ] `unloadTrack()` called on every exit path from gameplay

---

#### Step 5: WorldRenderer — Scene Composition Upgrade

**Files:** `src/renderer/WorldRenderer.ts` (new)

Adapt v02's WorldRenderer to use the new container hierarchy and sprite-based rendering.

**WorldRenderer lifecycle model:** WorldRenderer is **destroyed and recreated for each race start**. The caller (`ScreenManager.startGame()`) must clear shared containers (`carLayer.removeChildren()`, `effectsLayer.removeChildren()`) before constructing a new WorldRenderer. This prevents leaking car sprites and effects across races.

**Spectator mode dispatch:** Follow v02's pattern — GameLoop swaps the primary world state for spectator mode. `WorldRenderer.render()` always updates the "primary" car from `curr.car`. In spectator mode, `curr.car` IS the AI car's state (dispatched by GameLoop), and `curr.aiCar` is null. Player car sprite is hidden in spectator mode.

```typescript
// WorldRenderer.ts — key changes from v02
export class WorldRenderer {
  private trackLayer: Container;
  private effectsLayer: Container;
  private carLayer: Container;
  private carRenderer: CarRenderer;
  private aiCarRenderer: AiCarRenderer | null = null;
  private trackGraphics: Container | null = null;
  private readonly gameMode: GameMode;

  constructor(
    trackLayer: Container,
    effectsLayer: Container,
    carLayer: Container,
    gameMode: GameMode,
    playerCarFrame: string = DEFAULT_PLAYER_FRAME,
  ) {
    this.trackLayer = trackLayer;
    this.effectsLayer = effectsLayer;
    this.carLayer = carLayer;
    this.gameMode = gameMode;

    // Create car renderers with atlas sprites
    this.carRenderer = new CarRenderer(playerCarFrame);

    if (gameMode === 'spectator') {
      // Spectator: player car hidden, only AI car visible
      this.carRenderer.container.visible = false;
    }

    this.carLayer.addChild(this.carRenderer.container);

    if (gameMode === 'vs-ai' || gameMode === 'spectator') {
      this.aiCarRenderer = new AiCarRenderer();
      // Add AI car BEFORE player car so player renders on top
      this.carLayer.addChildAt(this.aiCarRenderer.container, 0);
    }
  }

  initTrack(track: TrackState, trackId: TrackId, shoulderSide: 'inner' | 'both' = 'both'): void {
    // Clear and DESTROY previous track graphics
    for (const child of this.trackLayer.removeChildren()) {
      child.destroy({ children: true });
    }
    // Build new textured track
    this.trackGraphics = buildTrackGraphics(track, trackId, shoulderSide);
    this.trackLayer.addChild(this.trackGraphics);
  }

  render(prev: WorldState, curr: WorldState, alpha: number, race: RaceState): void {
    // Guard: skip rendering if track not yet initialized
    if (!this.trackGraphics) return;

    // Interpolate primary car positions (same as v02)
    // In spectator mode, curr.car IS the AI car's state (GameLoop dispatch)
    const carX = lerp(prev.car.x, curr.car.x, alpha);
    const carY = lerp(prev.car.y, curr.car.y, alpha);
    const heading = lerpAngle(prev.car.heading, curr.car.heading, alpha);
    this.carRenderer.update(carX, carY, heading);

    // Update AI car if present AND both prev/curr have AI state
    if (this.aiCarRenderer && curr.aiCar && prev.aiCar) {
      const aiX = lerp(prev.aiCar.x, curr.aiCar.x, alpha);
      const aiY = lerp(prev.aiCar.y, curr.aiCar.y, alpha);
      const aiHeading = lerpAngle(prev.aiCar.heading, curr.aiCar.heading, alpha);
      this.aiCarRenderer.update(aiX, aiY, aiHeading);
    }

    // Camera follows primary car — via CameraController (wired externally)
  }

  destroy(): void {
    // Destroy car renderers
    this.carRenderer.destroy();
    this.aiCarRenderer?.destroy();
    // Destroy track graphics
    for (const child of this.trackLayer.removeChildren()) {
      child.destroy({ children: true });
    }
    this.trackGraphics = null;
  }
}
```

### Research Insights — Step 5

**Render signature must include `RaceState` (Critical Fix C7):**
v02's `GameLoop.onRender()` passes `(prev, curr, alpha, race)`. EffectsRenderer uses `race.phase === GamePhase.Loading` for loading-state detection. The original plan dropped `race` from the signature — this breaks EffectsRenderer. Added back.

**Guard both `prev.aiCar` and `curr.aiCar` (Critical Fix C5):**
Original code used `prev.aiCar!` (non-null assertion) without checking. If `prev.aiCar` is null on the first frame after AI spawns, this crashes. Now guarded with `&& prev.aiCar`.

**Null guard on `trackGraphics` (prevents render-before-ready):**
If `worldContainer.visible` is set true before `initTrack()` completes, `render()` is called with null track graphics. Added early return guard.

**`removeChildren()` must `destroy()` (prevents GPU buffer leak):**
`removeChildren()` detaches from display list but does not free GPU geometry buffers. After 10 track switches, 10 orphaned Graphics objects accumulate. Now calls `.destroy({ children: true })` on all removed children.

**Spectator mode: player car hidden, not omitted:**
The player car is always created (engine always simulates it) but set to `visible = false` in spectator mode. Camera follows the primary car (which in spectator mode is the AI's state, dispatched by GameLoop).

**Acceptance criteria:**
- [ ] WorldRenderer uses sub-container hierarchy (trackLayer, effectsLayer, carLayer)
- [ ] EffectsRenderer migrated to effectsLayer (constructor accepts `effectsLayer`)
- [ ] Cars render on top of effects, effects render on top of track
- [ ] AI car renders behind player car within carLayer
- [ ] Spectator mode: camera follows AI car (via GameLoop dispatch), player car hidden
- [ ] Solo mode: no AI car created
- [ ] `render()` uses interpolation for smooth 60fps motion (same as v02)
- [ ] `render()` includes `race: RaceState` parameter
- [ ] `render()` guards both `prev.aiCar` and `curr.aiCar` (no non-null assertions)
- [ ] `render()` skips frame if `trackGraphics` is null (render-before-ready guard)
- [ ] `destroy()` properly destroys all children (no GPU buffer leaks)
- [ ] `initTrack()` destroys previous track children before adding new ones

---

#### Step 6: EffectsRenderer Migration

**Files:** `src/renderer/EffectsRenderer.ts` (adapted from v02)

Copy v02's EffectsRenderer. Change the constructor to accept `effectsLayer` instead of `worldContainer`:

```typescript
// v02 constructor:
constructor(private worldContainer: Container) {
  this.container = new Container();
  worldContainer.addChild(this.container);
}

// v04 constructor:
constructor(private effectsLayer: Container) {
  this.container = new Container();
  effectsLayer.addChild(this.container);
}
```

Internal rendering (skid marks, particles, checkpoint flashes) is unchanged. Phase 3 upgrades the visual quality.

### Research Insights — Step 6

**Phase 3 performance debt: per-frame Graphics allocation.**
v02's EffectsRenderer creates new Graphics objects per skid segment/particle per frame, and destroys old ones via splice + destroy. At 60fps with active skidding, this creates GC pressure. More critically, Phase 3's filters (bloom, motion blur) will render the entire `worldContainer` subtree to render targets — if `effectsLayer` contains 300+ individual Graphics children, each filter pass iterates all of them. Two filters = 3x the rendering cost for effects.

**Document as known Phase 3 debt:** Before adding filters in Phase 3, refactor EffectsRenderer to use a single pooled Graphics object or sprite pool instead of create/destroy cycles.

**Acceptance criteria:**
- [ ] EffectsRenderer constructor accepts `effectsLayer` (not `worldContainer`)
- [ ] EffectsRenderer container lives inside effectsLayer
- [ ] Skid marks render correctly between track surface and cars
- [ ] Particles and checkpoint flashes render at correct layer depth
- [ ] No visual changes to effect rendering (Phase 3 handles upgrades)

---

#### Step 7: ScreenManager Integration + v02 Carry-Forward

**Files:** `src/renderer/ScreenManager.ts` (adapted from v02)

Update v02's ScreenManager to handle asset lifecycle transitions, the new container hierarchy, and async transition guards.

**Key changes from v02:**
- Wire `AssetManager.loadTrack(trackId)` when player selects a track
- Wire `AssetManager.unloadTrack()` when leaving gameplay
- Show loading indicator during track BG load
- Force GPU upload via `prepare.upload()` after track BG loads
- Hide `menuContainer` (not individual screen containers) when entering gameplay
- Show `worldContainer` + `hudContainer` when entering gameplay
- Add `transitioning` flag to prevent concurrent async transitions (Critical Fix C2)
- Hide `worldContainer` BEFORE unloading track BG (Critical Fix C3)
- Add menu screen containers to `menuContainer` (not `stage`)

**Async transition guard (Critical Fix C2):**
```typescript
private transitioning = false;

private async goto(target: ScreenState): Promise<void> {
  if (this.transitioning) return; // refuse concurrent transitions
  if (this.state === target) return;
  if (!VALID_TRANSITIONS[this.state]?.includes(target)) return;

  this.transitioning = true;
  try {
    await this.showScreen(target);
  } finally {
    this.transitioning = false;
  }
}
```

**State transitions with asset management:**
```
main-menu (menuBg loaded permanently, worldContainer hidden)
  → track-select (same)
    → [player picks track] → loadTrack(trackId) → [loading indicator]
      → [prepare.upload(trackBG)] → playing (menuContainer hidden, worldContainer visible)
        → [player finishes/quits]
          → [worldContainer.visible = false] → [unloadTrack()] → track-select (menuContainer visible)
```

**Container cleanup on race start:**
```typescript
// Before creating new WorldRenderer:
carLayer.removeChildren().forEach(c => c.destroy({ children: true }));
// effectsLayer children managed by EffectsRenderer
```

### v02 Files Carried Forward (Explicit List)

The following files are copied from v02 with minimal or no changes:

| File | Changes from v02 |
|------|-----------------|
| `EffectsRenderer.ts` | Constructor accepts `effectsLayer` instead of `worldContainer` |
| `CameraController.ts` | Unchanged |
| `OverlayRenderer.ts` | Unchanged — countdown, pause, finish overlays. Added to `hudContainer` |
| `InputHandler.ts` | Unchanged (or adapted if interface changed) |
| `GameLoop.ts` | Unchanged — spectator dispatch pattern preserved |
| `MainMenuScreen.ts` | Container added to `menuContainer` instead of `stage` |
| `TrackSelectScreen.ts` | Container added to `menuContainer` instead of `stage` |
| `SettingsScreen.ts` | Container added to `menuContainer` instead of `stage` |
| `HudRenderer.ts` | Unchanged — added to `hudContainer` |
| `SoundManager.ts` | No-op stub (Phase 4 replaces with real implementation) |

**Audio:** SoundManager is stubbed as no-op so ScreenManager and OverlayRenderer can reference it without null checks. Phase 4 replaces with real audio.

**Fullscreen:** F/F11 key toggle wired in RendererApp bootstrap (10 lines, copied from v02).

**Leaderboard:** Best lap time persistence (localStorage) carried from v02 if it exists. Phase 4 may redesign.

**Settings:** SettingsScreen carried from v02 (lap count configuration). Default: 3 laps.

**Acceptance criteria:**
- [ ] Menu BG visible on main menu and track select screens
- [ ] Menu screen containers live inside `menuContainer` (not `stage`)
- [ ] Loading indicator shown during track BG load
- [ ] Gameplay starts only after track BG is fully loaded AND GPU-uploaded
- [ ] `transitioning` flag prevents concurrent async transitions
- [ ] `worldContainer.visible = false` set BEFORE `unloadTrack()` on gameplay exit
- [ ] No VRAM leaks across repeated screen transitions
- [ ] OverlayRenderer (countdown, pause, finish) works in `hudContainer`
- [ ] Settings screen accessible from main menu
- [ ] Fullscreen toggle (F/F11) works
- [ ] SoundManager stubbed (no-op)

---

#### Step 8: CameraController Verification

**Files:** `src/renderer/CameraController.ts` (copied from v02, verified)

Copy v02's CameraController unchanged. Verify:
1. BG coverage: At ZOOM_MIN (2.5), the camera viewport is `screenWidth / 2.5` world units wide. The BG must extend at least this far from the car in all directions.
2. Y-flip interaction: `worldContainer.scale.set(zoom, -zoom)` correctly flips all child sprites that use the D6 pattern.
3. Speed-driven zoom: Verify zoom range still feels correct with sprites instead of geometry.

### Research Insights — Step 8

**Force GPU texture upload before gameplay:**
After `Assets.load()` completes, use `app.renderer.prepare.upload(texture)` to force the GPU upload. This prevents a 5-30ms hitch on the first gameplay frame when the renderer encounters the 16MB texture for the first time.

**Acceptance criteria:**
- [ ] Camera follows car smoothly at all speeds
- [ ] Speed-driven zoom (2.5-4.0) works correctly with sprite rendering
- [ ] BG covers viewport at all zoom levels for all 3 tracks
- [ ] No visual artifacts from Y-flip interaction with sprites
- [ ] Track BG texture GPU-uploaded before first gameplay frame

---

## Technical Considerations

### Architecture Impacts

- **New files:** 5 new renderer files (RendererApp, CarRenderer, AiCarRenderer, TrackRenderer, WorldRenderer) + AssetManager
- **Adapted files:** 3 from v02 (EffectsRenderer constructor change, ScreenManager async guards + menuContainer, screen classes reparented)
- **Copied unchanged:** 5+ from v02 (CameraController, OverlayRenderer, InputHandler, GameLoop, HudRenderer)
- **Stubbed:** SoundManager (no-op)
- **No engine changes.** The renderer reads `TrackState`, `WorldState`, `CarState` — same interfaces as v02.
- **Phase 3 ready:** The WorldContainer hierarchy supports filter attachment. Phase 3 just adds `worldContainer.filters = [bloomFilter, ...]`.

### Performance Implications

- **Draw calls:** v02 ~50-80 draw calls per frame → v04 Phase 2 ~10-30. Car atlas enables sprite batching (2 cars = 1 draw call). Track is ~5 draw calls (BG sprite + 3-4 textured Graphics).
- **Texture memory:** ~22MB peak VRAM during gameplay (mipmaps disabled on large textures).
- **Texture fills:** `Graphics.fill({ texture, textureSpace: 'global' })` uses GPU texture sampling — no per-frame CPU cost beyond initial Graphics construction.
- **Track Graphics rebuild:** Built once per track load (not per frame). Static after construction.
- **Phase 3 debt:** EffectsRenderer per-frame Graphics allocation is acceptable for Phase 2 but must be refactored before adding filter passes in Phase 3.

### PixiJS v8 API Confirmations

| API | Status | Notes |
|-----|--------|-------|
| `Graphics.poly().fill({ texture, textureSpace, matrix })` | **Confirmed** | Official docs + research. Spike test in Step 0 validates matrix math. |
| `Assets.load([...])` (array form, parallel) | **Confirmed** | Official API. Returns single Promise. |
| `Assets.unload()` | **Confirmed** | Removes from cache + frees GPU memory. |
| `Texture.from(frameName)` | **Confirmed** | Requires pre-loaded resource in v8 (breaking change from v7). |
| `Container({ isRenderGroup: true })` | **Confirmed** | Promotes to own render group for transform isolation + filter performance. |
| `app.renderer.prepare.upload(texture)` | **Confirmed** | Forces GPU upload. Prevents first-frame hitch. |
| `FillPattern(texture, 'repeat')` | **Confirmed** | Alternative to direct texture fill. Forces wrapMode to REPEAT. |
| `app.canvas` (not `app.view`) | **v8 breaking change** | `app.view` is v7. |
| `new Application(); await app.init()` | **v8 breaking change** | Constructor is sync, `init()` is async. |
| Ticker callback receives `Ticker` | **v8 breaking change** | Not `deltaTime` directly. Use `ticker.deltaTime`. |
| `cacheAsTexture()` | **v8 breaking change** | Replaces `cacheAsBitmap`. |

### v7 → v8 Breaking Changes Relevant to v02 Adaptation

| Area | v7/v02 | v8/v04 |
|------|--------|--------|
| Canvas ref | `app.view` | `app.canvas` |
| App init | `new Application(options)` | `await app.init(options)` |
| Graphics | `beginFill().drawRect().endFill()` | `.rect().fill()` |
| Graphics shapes | `drawPolygon` | `poly` |
| Holes | `beginHole().drawCircle().endHole()` | `.circle().cut()` |
| Ticker | `(deltaTime) => {}` | `(ticker) => { ticker.deltaTime }` |
| Children | Sprites can have children | Only Containers can have children |
| DisplayObject | Base class | Removed; Container is base |
| Scale/Wrap modes | `SCALE_MODES.LINEAR` | `'linear'` string literal |
| Texture.from | Loads from URL | Requires pre-loaded resource |

---

## System-Wide Impact

### Interaction Graph

`RendererApp.init()` → `Assets.load([...])` → GPU texture upload → show main menu
`ScreenManager.selectTrack(id)` → `AssetManager.loadTrack(id)` → `prepare.upload(texture)` → `WorldRenderer.initTrack()` → `buildTrackGraphics()` → `trackLayer.addChild()`
`GameLoop.tick()` → `WorldRenderer.render(prev, curr, alpha, race)` → `CarRenderer.update()` → sprite position/rotation set → PixiJS renders frame
`ScreenManager.exitGameplay()` → `worldContainer.visible = false` → `AssetManager.unloadTrack()` → `WorldRenderer.destroy()` → show menu

### Error Propagation

- Asset load failure → `Assets.load()` rejects → console.error → splash screen remains (boot) or loading indicator persists (track load)
- Missing atlas frame → `Texture.from(frameName)` returns `Texture.EMPTY` → console warning → visual bug (no crash)
- GPU texture upload failure → PixiJS swallows (renders placeholder) → visible but non-fatal

### State Lifecycle Risks

- **Track BG leak:** If `AssetManager.unloadTrack()` is not called on every exit path, the BG persists in VRAM. Mitigation: ScreenManager always calls `unloadTrack()` when leaving gameplay, generation counter discards stale loads.
- **Stale load race:** If player rapidly switches tracks, generation counter detects and discards stale loads (Critical Fix C1).
- **EffectsRenderer orphan:** If EffectsRenderer is constructed with wrong parent container, effects render at wrong depth. Mitigation: constructor accepts `effectsLayer` explicitly (Critical Fix C6).
- **Render-before-ready:** If `render()` is called before `initTrack()`, the null guard returns early (no crash, no visual glitch).
- **Unload-before-hide:** If texture is unloaded while container is visible, PixiJS renders blank frame. Mitigation: always hide container before unloading (Critical Fix C3).

### Integration Test Scenarios

1. **Full game cycle:** Boot → menu → select track → play 3 laps → finish → return to menu → select different track → play → quit. Verify VRAM does not grow monotonically.
2. **Track switch:** Select Track 1 → play → return → select Track 2 → play. Verify Track 1 BG is unloaded, Track 2 BG is loaded, no visual artifacts.
3. **All game modes:** Play each track in solo, vs-ai, and spectator mode. Verify correct car count, camera target, and player car visibility.
4. **Resize/DPI:** Resize browser window during gameplay. Verify `autoDensity` handles DPR changes.
5. **Rapid transitions:** Quickly switch between menu and gameplay 10+ times. Verify no memory leaks or orphaned containers.
6. **Rapid track switching:** On track-select, quickly click through Track 1 → Track 2 → Track 3 → start game. Verify only Track 3 BG is loaded, no VRAM leaks from abandoned loads.
7. **Spectator mode:** Camera follows AI car. Player car not visible. AI tint/alpha correct. Race finish triggers correctly.

## Acceptance Criteria

### Functional Requirements

- [ ] Car sprites render from atlas (player: default red frame, AI: car-ai frame)
- [ ] Cars rotate smoothly based on engine heading
- [ ] AI car visually distinct (tint + alpha) in vs-ai and spectator modes
- [ ] Spectator mode: player car hidden, camera follows AI
- [ ] Environment BG renders behind track geometry for all 3 tracks
- [ ] Road surface uses tiled asphalt texture (`textureSpace: 'global'`)
- [ ] Shoulder/runoff uses tiled curb texture
- [ ] Grass texture applied outside track boundaries
- [ ] Finish line and wall strokes render correctly (from v02 logic)
- [ ] Track BG loads per-track, unloads on track change (with race guard)
- [ ] Menu BG stays loaded permanently (simplified from original)
- [ ] Container hierarchy matches ADR-05 spec with `isRenderGroup: true`
- [ ] EffectsRenderer renders between track and car layers
- [ ] Camera follows car with speed-driven zoom
- [ ] All 3 game modes (solo, vs-ai, spectator) work correctly
- [ ] OverlayRenderer provides countdown, pause, and finish screens
- [ ] Settings screen accessible (lap count configuration)
- [ ] Fullscreen toggle works (F/F11)
- [ ] Track graphics properly destroyed on track switch (no GPU buffer leaks)

### Non-Functional Requirements

- [ ] 60fps maintained with all visual upgrades active
- [ ] Boot loading completes in < 3 seconds on a 100Mbps connection
- [ ] Track switch loading completes in < 1 second
- [ ] No visible texture bleeding on car sprite atlas edges
- [ ] No Y-flip visual bugs (all sprites render right-side-up)
- [ ] Mipmaps disabled on track BG and menu BG textures

### Quality Gates

- [ ] All existing engine tests (366+) still pass (engine untouched)
- [ ] Manual visual verification on all 3 tracks
- [ ] Manual verification of all 3 game modes
- [ ] Manual verification of track switching (no VRAM leak)
- [ ] Manual verification of rapid transitions (no state corruption)
- [ ] HiDPI rendering verified (if HiDPI display available)

## Dependencies & Risks

### Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| Phase -1 (foundation) | Plan complete, not executed | Must complete before Phase 2 |
| Phase 0 (asset generation) | Plan complete, not executed | Must complete — Phase 2 needs raw assets |
| Phase 1 (asset pipeline + tracks) | Plan deepened | Must complete — Phase 2 needs processed assets + manifest |
| PixiJS v8 `Graphics.fill({ texture })` | **Confirmed in docs** — spike test Step 0 validates | Low risk (confirmed API) |
| PixiJS v8 `Assets` API | Well-documented, confirmed | Low risk |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `Graphics.fill({ texture })` matrix math produces wrong tiling scale | Visual quality issue | Spike test in Step 0, tunable matrix constants |
| Tiled texture scale looks wrong | Visual quality issue | Tunable constants, visual verification gate |
| Y-flip causes unexpected sprite behavior | All sprites render upside-down | D6 pattern documented, caught immediately at runtime |
| Track BG doesn't cover viewport edge cases | Visible background gap at screen edges | BG coverage verified per-track, centroid computed at runtime |
| Car sprite scale mismatch | Cars look too big or too small | CAR_VISUAL_LENGTH constant tunable, compared against v02 |
| Rapid track switching causes VRAM leak | Memory growth | Generation counter in AssetManager (Critical Fix C1) |
| Concurrent async transitions corrupt state | Wrong screen displayed | `transitioning` flag in ScreenManager (Critical Fix C2) |
| Phase 3 filters bottleneck on EffectsRenderer | Low FPS with effects + filters | Known debt — refactor before adding filters |

### Phase 3 Debt Items (Documented Now)

| Item | Description | Impact if Unaddressed |
|------|-------------|----------------------|
| EffectsRenderer per-frame alloc | Creates/destroys Graphics per skid segment per frame | Filter passes iterate 300+ objects per pass. 2 filters = 3x cost. |
| HiDPI fill rate | 2x DPI = 4x pixel fill. Each filter pass multiplies this. | Integrated GPUs may drop below 60fps with multiple filters. |
| Filter resolution | Filters default to `resolution: 1`. On HiDPI, they render blurry. | Must set `filter.resolution = devicePixelRatio` for each filter. |

## Alternative Approaches Considered

### Pre-rendered full track image (no programmatic rendering)
Render the entire track (surface + shoulders + walls) as a single pre-rendered image. Rejected because: (a) BGs are environment art, not track surfaces — the programmatic track rendering provides exact polygon boundaries that the physics engine uses, (b) a pre-rendered surface would require pixel-perfect alignment with engine boundaries, which is fragile.

### Individual car PNGs instead of atlas
Load each car sprite as a separate texture. Rejected because: (a) spec ADR-02 explicitly calls for atlas, (b) atlas enables sprite batching (single draw call for both cars), (c) Phase 1 already produces the atlas.

### DOM overlay for loading screens
Use HTML/CSS overlays for loading indicators. Rejected for Phase 2: menus are Phase 4 scope. Phase 2 loading screens use PixiJS text/graphics for simplicity. Phase 4 may introduce DOM overlays.

### Eliminate AssetManager class (inline asset calls)
Inline `Assets.load()`/`Assets.unload()` directly into RendererApp and ScreenManager. Considered but rejected: the generation counter for stale-load detection is critical async logic that benefits from centralization. Scattering it across ScreenManager makes the race condition harder to reason about.

### Keep menu BG loaded permanently vs. unload/reload cycle
Menu BG lifecycle simplified to permanent loading. The 8MB VRAM savings was not worth the async complexity of unload/reload and the race conditions it introduced.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions carried forward: engine frozen (Decision #2), skip Stitch (Decision #4), Phase structure follows spec (Decision #3)

### Internal References

- **Full spec:** [docs/Top-Down-Racer-v04-CE-Spec.md](docs/Top-Down-Racer-v04-CE-Spec.md) — ADR-02 (asset pipeline), ADR-03 (car sprites), ADR-04 (track art), ADR-05 (post-processing/container hierarchy), ADR-10 (test strategy)
- **Phase 1 plan (deepened):** [docs/plans/2026-03-11-feat-phase-1-asset-pipeline-track-redesign-plan.md](docs/plans/2026-03-11-feat-phase-1-asset-pipeline-track-redesign-plan.md) — Asset manifest structure, atlas format, world-to-pixel mapping, checkpoint counts
- **Phase 0 plan:** [docs/plans/2026-03-11-feat-phase-0-asset-generation-plan.md](docs/plans/2026-03-11-feat-phase-0-asset-generation-plan.md) — Raw asset dimensions and formats

### v02 Reference Files

- `src/renderer/WorldRenderer.ts` — Scene composition template
- `src/renderer/TrackRenderer.ts` — Track layer structure (polygon-based fills), `shoulderSide` config
- `src/renderer/CarRenderer.ts` — 15+ Graphics objects being replaced
- `src/renderer/AiCarRenderer.ts` — Tint/alpha/GlowFilter treatment
- `src/renderer/CameraController.ts` — Camera/zoom/Y-flip logic
- `src/renderer/RendererApp.ts` — App bootstrap, container creation, fullscreen toggle
- `src/renderer/EffectsRenderer.ts` — Skid marks, particles, checkpoint flashes
- `src/renderer/ScreenManager.ts` — Screen transitions, game flow state machine
- `src/renderer/OverlayRenderer.ts` — Countdown, pause, finish overlays
- `src/renderer/HudRenderer.ts` — HUD elements
- `src/renderer/InputHandler.ts` — Keyboard input
- `src/game/GameLoop.ts` — Fixed timestep loop, spectator dispatch

### PixiJS v8 Documentation Sources

- [Graphics Fill Guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics/graphics-fill) — FillPattern, textureSpace, matrix
- [Assets Guide](https://pixijs.com/8.x/guides/components/assets) — load, unload, bundles, progress
- [Textures Guide](https://pixijs.com/8.x/guides/components/textures) — TextureSource, mipmaps, VRAM
- [Container Guide](https://pixijs.com/8.x/guides/components/scene-objects/container) — isRenderGroup, filters
- [Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips) — batching, draw calls
- [Garbage Collection](https://pixijs.com/8.x/guides/concepts/garbage-collection) — TextureGCSystem
- [v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8) — Breaking changes from v7
