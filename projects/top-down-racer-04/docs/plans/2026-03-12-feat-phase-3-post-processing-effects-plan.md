---
title: "Phase 3: Post-Processing & Effects"
type: feat
status: visual-verification
date: 2026-03-12
deepened: 2026-03-12
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

## Enhancement Summary

**Deepened on:** 2026-03-12
**Research agents used:** 10 (best-practices-researcher, framework-docs-researcher, kieran-typescript-reviewer, performance-oracle, architecture-strategist, security-sentinel, code-simplicity-reviewer, pattern-recognition-specialist, spec-flow-analyzer, v02-codebase-explorer)

### Critical Fixes (Plan was wrong — implementation would fail)

1. **DropShadowFilter offset DOES need Y-flip compensation** — pixi-filters docs confirm offset is in filter's local coordinate space, not screen space. Use `offset: { x: 3, y: -3 }` on the Y-flipped carLayer.
2. **ShimmerFilter GLSL uses legacy WebGL1 syntax** — PixiJS v8 GlProgram defaults to `#version 300 es`. Must use `in`/`out`/`texture()` instead of `varying`/`gl_FragColor`/`texture2D()`.
3. **`DEFAULT_VERTEX` does not exist** in PixiJS v8 — correct import is `defaultFilterVert` from `pixi.js`.
4. **Skid mark fade technique produces full-screen darkening** — semi-transparent black rect fills the entire texture with opaque black over time. Must use `blendMode: 'multiply'` on skidSprite or alpha-reduction approach.
5. **SpritePool is unbounded** (contradicts "bounded child count" acceptance criteria) — must pre-allocate and cap pool size.
6. **Spectator mode rendering is broken** (inherited Phase 2 gap) — visible AI car sprite never updates because dispatch routes state to hidden player sprite.

### Key Performance Insights

1. **Use `Filter.defaultOptions.resolution = 1`** (not 2) — blur-based filters look fine at 1x, halves fill rate to ~16.5M pixels/frame.
2. **Implement `filterArea`** on worldContainer (not just a comment) — set to `app.screen` to eliminate per-frame bounds traversal across entire subtree.
3. **BloomFilter uses Kawase blur with downsampling** — actual fill is ~3M effective pixels, not 8.3M. Real P0+P1 budget is ~16M pixels, comfortable on integrated GPUs.
4. **PixiJS uses ping-pong textures** — 2 temp RTs max for N filters on same container, not 1 per filter. Actual VRAM ~66MB, not ~100MB.
5. **Gate skid fade render behind dirty flag** — avoid rendering every frame when not skidding.
6. **Use `renderable = false`** instead of `visible = false` for pooled sprites — excludes from bounds calculation.

### Structural Recommendations

1. **Merge Steps 1+2** — no reason for separate "create FilterManager" and "attach filters" steps.
2. **Collapse Steps 5+6** into single conditional step — defer GLSL to work phase, not plan.
3. **Extract SpritePool to own file** (`src/renderer/SpritePool.ts`) for testability.
4. **Add EffectsRenderer renderer reference** — needs `Renderer` for RenderTexture operations.
5. **Compute SKID_TEXTURE_SIZE from track AABB** — not a fixed constant.

### New Risks Discovered

1. Skid mark RenderTexture coordinate space under camera Y-flip (Medium)
2. FilterManager.attach() timing relative to container population (Low-Medium)
3. Pause flow overwrites motion blur velocity on next render frame (Medium)
4. WebGL context loss destroys skid mark RenderTexture without recovery (Low)

---

# Phase 3: Post-Processing & Effects

## Overview

Phase 3 transforms the game from "looks like a game" to "feels like a game." Post-processing filters add depth perception (shadows), speed sensation (motion blur), and cinematic polish (bloom, glow). The effects pipeline is refactored from v02's per-frame Graphics allocation to a pooled/RenderTexture approach that performs efficiently under filter passes.

**Consumes:** Phase 2 outputs (WorldContainer hierarchy with `isRenderGroup: true`, sprite-based car rendering, EffectsRenderer in effectsLayer, textured track surfaces)
**Produces:** A fully post-processed game with bloom, shadows, motion blur, and upgraded particle effects ready for Phase 4's UI layer

**Scope floor (P0+P1):** Bloom/glow, drop shadows, motion blur, upgraded skid marks
**Scope ceiling (P0-P3):** Above plus heat shimmer, speed lines, full-scene CRT/bloom — conditional on 55fps performance gate after P1

(see brainstorm: `docs/brainstorms/2026-03-11-full-build-brainstorm.md` — Decision #7: "VFX scope: P0 + P1 minimum")

## Problem Statement / Motivation

Phase 2 delivers sprite-based rendering with textured tracks — the game *looks* like a game. But it lacks:
- **Depth perception** — cars float on the track surface with no grounding
- **Speed sensation** — no motion blur, no speed lines, movement feels static
- **AI visual identity** — tint + alpha only, no glow halo (v02 had GlowFilter but it's deferred to Phase 3)
- **Atmospheric polish** — no bloom, no heat shimmer, no cinematic effects
- **Effect pipeline performance** — v02's EffectsRenderer creates 300+ individual Graphics objects per frame via `new Graphics()` per skid segment/particle. Each filter pass iterates all children: 2 filters = 3x rendering cost for effects

The success bar: effects should feel *integrated*, not bolted on. A stranger watching should not notice individual effects — they should notice the game feels polished.

## Proposed Solution

### Architecture: Filter Attachment Points

Resolving the critical question of where each filter lives in the container hierarchy:

```
App.stage
  +-- menuContainer (NO filters)
  +-- worldContainer (isRenderGroup: true, camera transform)
  |    |  filters: [bloomFilter, motionBlurFilter]  <-- scene-level filters
  |    +-- trackLayer
  |    |    +-- bgSprite
  |    |    +-- surfaceGraphics
  |    |    +-- shoulderGraphics
  |    |    +-- skidMarkSprite (NEW: RenderTexture display)
  |    |    +-- finishLine
  |    |    +-- wallStrokes
  |    +-- effectsLayer
  |    |    +-- particles (sprite pool, NOT individual Graphics)
  |    |    +-- checkpointFlashes
  |    +-- carLayer
  |         |  filters: [dropShadowFilter]  <-- car-specific filter
  |         +-- aiCarContainer
  |         |    |  filters: [glowFilter]  <-- AI-specific filter
  |         |    +-- aiCarSprite
  |         +-- playerCarContainer
  |              +-- playerCarSprite
  +-- hudContainer (isRenderGroup: true, NO filters — always sharp)
```

**Filter attachment decisions:**

| Filter | Container | Rationale |
|--------|-----------|-----------|
| BloomFilter | `worldContainer` | Scene-level bloom on all bright objects (sparks, headlights, glow) |
| MotionBlurFilter | `worldContainer` | Screen-space velocity blur on entire scene |
| DropShadowFilter | `carLayer` | Shadows only on cars, not on track/effects. Single pass for all cars. |
| GlowFilter | `AiCarRenderer.container` | AI-only glow halo. Stays per-car (not moved to carLayer — would glow both cars). Managed lifecycle via FilterManager. |
| DisplacementFilter (P2) | Custom GLSL on `worldContainer` | Localized heat shimmer via position uniforms, not full-frame displacement |
| Speed Lines (P2) | Custom GLSL filter on `worldContainer` | Screen-space by nature — operates on rendered texture |
| CRT/AdvancedBloom (P3) | `worldContainer` | Full-scene cinematic post-pass |

### Filter Chain Order

Filters in `worldContainer.filters` array execute sequentially. Order matters:

```typescript
worldContainer.filters = [
  bloomFilter,       // 1. Bloom bright areas (sparks, glow halos)
  motionBlurFilter,  // 2. Blur the bloomed scene by velocity (glow trails streak)
  // P2 (conditional):
  // shimmerFilter,  // 3. Localized displacement
  // speedLinesFilter, // 4. Screen-space speed lines overlay
  // P3 (conditional):
  // crtFilter,      // 5. Full-scene CRT/vignette
];
```

**Why this order:** Bloom first creates glow halos. Motion blur then smears them into speed-streaks. This produces natural-looking glow trails at high speed. Reversing (blur then bloom) would bloom the blurred frame uniformly — less interesting.

### Camera Y-Flip Compatibility

The camera applies `worldContainer.scale.set(zoom, -zoom)`. Filters operate on the **rendered** RenderTexture (post-transform, screen space). Directional filter properties must account for the Y inversion:

| Filter Property | Compensation | Explanation |
|----------------|-------------|-------------|
| `MotionBlurFilter.velocity.y` | Negate engine vy | Engine Y-up to screen Y-down |
| `DropShadowFilter.offset.y` | **Negate: use `{ x: 3, y: -3 }`** | pixi-filters docs confirm offset is in filter's local coordinate space. In Y-flipped carLayer, positive Y = above car on screen. Must negate for shadow below. |
| Displacement UV animation | Negate Y scroll direction | Shimmer should drift upward visually |

### Filter Resolution (HiDPI)

Set default filter resolution at startup before creating any filters:

```typescript
import { Filter } from 'pixi.js';

// Use resolution 1 for all blur-based filters — they look fine at 1x
// and this halves fill rate compared to 2x. Bloom, glow, shadow, and
// motion blur all produce soft output where the reduced resolution is
// actually desirable (softer result).
Filter.defaultOptions.resolution = 1;
```

> **Research insight:** The original plan proposed `Math.min(devicePixelRatio, 2)` but best-practices research found that blur-based filters (which ALL Phase 3 filters are) look identical at resolution 1 vs 2. Using resolution 1 halves the fill rate budget from ~33M to ~16.5M pixels/frame. Only increase to `Math.min(devicePixelRatio, 2)` if visual quality is noticeably poor during Step 2 visual verification. Per-filter override is available: `new BloomFilter({ ..., resolution: 2 })`.

**Fill rate budget (corrected):** BloomFilter uses Kawase blur internally, which downsamples before blurring — actual fill is ~3M effective pixels, not 8.3M. At resolution 1 with 4 active filter passes, the real budget is ~16M pixels/frame. PixiJS uses ping-pong textures (at most 2 temp RTs for N filters on same container), so VRAM is ~66MB total, not ~100MB.

**Performance gate:** If FPS drops below 55 after P1 effects, do NOT increase filter resolution — it's already at 1. Instead, reduce bloom quality or cut P2.

### Filter Lifecycle

Key non-obvious behaviors (everything else is "filters are always on; they just work"):

1. **Pause:** Zero motion blur velocity via `FilterManager.pause()`. **Critical: the render callback must skip `updateMotionBlur()` during pause** (check `race.phase === GamePhase.Paused`), otherwise the next frame overwrites pause state with pre-pause velocity. Pass `dt = 0` to ShimmerFilter.update() during pause to freeze shimmer animation.
2. **Menu return:** `worldContainer.visible = false` — PixiJS skips all filter processing on invisible containers. Zero GPU cost.
3. **Track switch:** Clear skid mark RenderTexture via `renderer.render({ container: emptyContainer, target: skidTexture, clear: true })`. No filter recreation needed.
4. **Tab visibility:** Motion blur self-corrects on next frame (per-frame velocity update). Skid fade pauses during tab invisibility (PixiJS ticker stops). CRT/shimmer time may jump on resume — acceptable.
5. **Window resize:** Update `worldContainer.filterArea` dimensions (see filterArea section below). Filters themselves auto-adapt.
6. **WebGL context loss:** Add `webglcontextrestored` handler that recreates skid mark RenderTexture (clearing marks is acceptable — they are cosmetic).

### filterArea Optimization (REQUIRED — Not Optional)

Without `filterArea`, PixiJS calls `getFastGlobalBounds()` every frame — walking the entire `worldContainer` subtree (track layers, 60+ pooled sprites, car containers) to compute bounds. With 2 filters on worldContainer, this runs **twice per frame**. From FilterSystem.mjs source analysis, this is the third most expensive per-frame operation after fill rate and scene rendering.

```typescript
import { Rectangle } from 'pixi.js';

// In FilterManager.attach() or WorldRenderer setup:
worldContainer.filterArea = app.screen; // app.screen is a Rectangle

// On window resize:
// app.screen auto-updates when the Application resizes — filterArea
// is a reference, so it tracks automatically. No manual update needed
// if you use app.screen directly.
```

**Do NOT set filterArea on `carLayer` or `aiCarContainer`** — these are small containers where bounds measurement is cheap (1-2 children), and filterArea would need to track moving car positions.

### Disabling Filters Per Mode

Use `filter.enabled = false` instead of rebuilding the filters array. PixiJS skips disabled filters in the pipeline (confirmed in FilterSystem source: `_applyFiltersToTexture` checks `filter.enabled`). This avoids array allocation and PixiJS internal bookkeeping:

```typescript
// Single-player mode: disable glow (no AI car)
filterManager.glow.enabled = false;

// Re-enable for vs-AI mode:
filterManager.glow.enabled = true;
```

### FilterManager.attach() Timing

**Call `attach()` AFTER the container hierarchy is fully populated** — after WorldRenderer creates trackLayer, effectsLayer, carLayer, and aiCarContainer. If called before containers exist, filters attach to null/empty containers. If called after the first render frame, one frame renders without filters (visual flash).

**Calling sequence in ScreenManager.startGame():**
1. Create WorldRenderer (builds container hierarchy)
2. Create EffectsRenderer (builds particle pool, skid texture)
3. Call `FilterManager.attach(worldContainer, carLayer, aiCarContainer)`
4. Register render callbacks
5. Start game loop

### Game Mode Behavior

Motion blur velocity tracks the camera-target car (`curr.car` — GameLoop swaps primary state for spectator mode). GlowFilter only attached when AI car exists (`aiCarContainer: null` in single player). DropShadowFilter on `carLayer` covers all visible cars automatically. P2 effects (if implemented) follow the same camera-target pattern.

**The only non-obvious mode differences:**

| Concern | Single Player | vs AI | Spectator |
|---------|--------------|-------|-----------|
| Glow attached? | No (`aiCarContainer = null`) | Yes | Yes |
| Motion blur source | Player velocity | Player velocity | AI velocity (via dispatch swap) |
| Skid marks source | Player car | Player car only (AI skids = Phase 3 debt) | AI car (via dispatch swap) |

> **Spectator mode gap (inherited from Phase 2):** The dispatch model routes `curr.car` to the hidden player sprite while `curr.aiCar` is null, so the visible AI sprite never updates position. **This must be resolved in Phase 2 before Phase 3 spectator filters can work.** Recommended fix: add spectator-mode branch in WorldRenderer.render() that routes `curr.car` data to `aiCarRenderer.update()`.

## Technical Approach

### Step 0: EffectsRenderer Refactor (PREREQUISITE)

**Files:** `src/renderer/EffectsRenderer.ts` (adapted from v02)

**The problem:** v02 creates `new Graphics()` per skid segment (up to 300 alive), per dust particle (up to 40), per spark (up to 20), and per checkpoint flash. At 60fps with active skidding, this creates GC pressure. With filter passes iterating all children, 300+ individual Graphics objects in `effectsLayer` multiply rendering cost per filter.

**The refactor — two strategies:**

**A. Skid marks → RenderTexture accumulation**

Replace individual skid segment Graphics objects with a persistent RenderTexture:

```typescript
// Create once per track
const skidTexture = RenderTexture.create({
  width: SKID_TEXTURE_SIZE, // Match track BG dimensions or viewport
  height: SKID_TEXTURE_SIZE,
  resolution: 1, // Skid marks don't need HiDPI resolution
});
const skidSprite = new Sprite(skidTexture);
trackLayer.addChild(skidSprite); // Between shoulderGraphics and finishLine

// Reusable staging Graphics (never added to scene graph)
const skidStaging = new Graphics();

// Each frame — render new segments into texture
function addSkidSegment(from: Vec2, to: Vec2, alpha: number): void {
  skidStaging.clear();
  skidStaging.moveTo(from.x, from.y);
  skidStaging.lineTo(to.x, to.y);
  skidStaging.stroke({ width: 1.8, color: 0x444444, alpha });

  renderer.render({
    container: skidStaging,
    target: skidTexture,
    clear: false, // Accumulate — preserve previous marks
  });
}
```

**Gradual fade:** Render a semi-transparent rect over the entire texture each frame to naturally fade old marks:

```typescript
const fadeRect = new Graphics()
  .rect(0, 0, SKID_TEXTURE_SIZE, SKID_TEXTURE_SIZE)
  .fill({ color: 0x000000, alpha: 0.003 }); // Very slow fade

// Each frame (even when not skidding):
renderer.render({ container: fadeRect, target: skidTexture, clear: false });
```

**Clear on reset:** On race restart or track switch:

```typescript
renderer.render({ container: new Container(), target: skidTexture, clear: true });
```

**Coordinate space:** The skid RenderTexture must use the same coordinate system as `worldContainer` children. Position `skidSprite` at track origin. Skid mark coordinates from the engine map directly.

> **Research insight — coordinate space under Y-flip:** The RenderTexture renders Y-down (screen convention). The skidSprite is displayed inside `worldContainer` which has `scale.set(zoom, -zoom)`. Per Phase 2's D6, all world-space sprites need `scale.y = -1` to counteract the camera flip. **Apply the same D6 pattern to skidSprite:** `skidSprite.scale.y = -1`. Test by rendering a mark at a known world position and verifying it appears at the correct track location.

> **Research insight — skid texture sizing:** `SKID_TEXTURE_SIZE` must be computed from the track's axis-aligned bounding box (AABB), not a fixed constant. The three tracks have different world-space extents (gauntlet is 50-60% larger than oval). A fixed-size texture will either waste VRAM or clip marks on larger tracks:
> ```typescript
> const bounds = computeTrackAABB(track.outerBoundary);
> const skidTexture = RenderTexture.create({
>   width: Math.ceil(bounds.width + 20),
>   height: Math.ceil(bounds.height + 20),
>   resolution: 1,
> });
> skidSprite.position.set(bounds.x - 10, bounds.y - 10);
> ```
> Wrap `RenderTexture.create()` in try/catch with fallback to "no skid marks" mode (VRAM exhaustion protection).

> **Research insight — fade alpha correction:** Alpha 0.003 causes 8-bit quantization issues — marks stop fading at ~37% opacity and become permanent "ghosts." **Use alpha 0.005–0.008** for cleaner fade-to-zero. Also, the semi-transparent black rect progressively fills the ENTIRE texture with opaque black, darkening the track surface below. **Set `skidSprite.blendMode = 'multiply'`** so only dark mark regions affect the track, or use an alpha-reduction approach instead of additive black.

> **Research insight — dirty flag:** Gate the fade render behind a `skidTextureHasMarks` boolean. Skip the fade render entirely when no marks exist (countdown, straight-line driving, menu). This eliminates a wasted RenderTexture bind + full-texture render on every non-skidding frame.

**B. Particles + checkpoint flashes → Sprite pool**

Replace per-frame `new Graphics()` with pre-rendered sprite textures and an object pool.

**Extract to `src/renderer/SpritePool.ts`** — own file for independent testability. This follows the `screens/` subdirectory precedent (related files grouped, orchestrator at root level).

```typescript
// src/renderer/SpritePool.ts
import { Sprite, Texture, Container } from 'pixi.js';

export class SpritePool {
  private readonly idle: Sprite[] = [];
  private readonly maxSize: number;

  constructor(
    private readonly texture: Texture,
    parent: Container,
    maxSize: number = 64,
  ) {
    this.maxSize = maxSize;
    // Pre-allocate ALL sprites at boot — eliminates runtime allocation
    for (let i = 0; i < maxSize; i++) {
      const sprite = new Sprite(texture);
      sprite.renderable = false; // Not visible = false (see below)
      sprite.anchor.set(0.5);
      parent.addChild(sprite); // Add once, never remove
      this.idle.push(sprite);
    }
  }

  acquire(): Sprite | null {
    const sprite = this.idle.pop();
    if (!sprite) return null; // Pool exhausted — caller skips spawn
    sprite.renderable = true;
    return sprite;
  }

  release(sprite: Sprite): void {
    sprite.renderable = false;
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    sprite.scale.set(1);
    sprite.rotation = 0;
    this.idle.push(sprite);
  }

  get activeCount(): number { return this.maxSize - this.idle.length; }
}
```

> **Research insight — `renderable` vs `visible`:** Use `renderable = false` instead of `visible = false`. In PixiJS v8, `visible = false` still includes the sprite in bounds calculations. `renderable = false` skips the object entirely during rendering AND bounds measurement. With 60 pooled sprites (~40 typically idle), this eliminates ~40 unnecessary bounds checks per filter pass.

> **Research insight — bounded pool:** The pool MUST be bounded. The original `?? new Sprite()` fallback grows the pool without limit — contradicting the "bounded child count" acceptance criterion and re-introducing the exact performance problem the refactor solves. Pre-allocate max capacity (64 sprites). `acquire()` returns `null` when exhausted. Caller skips particle spawn when `null`.

> **Research insight — active particle removal:** Use swap-and-pop instead of `Array.splice()` for the active particles list. `splice()` is O(n) per removal; swap-and-pop is O(1). Particle render order doesn't matter:
> ```typescript
> // In ageParticles loop — O(1) removal:
> activeParticles[i] = activeParticles[activeParticles.length - 1];
> activeParticles.pop();
> ```

**Particle types and tint:**

| Particle Type | v02 Color | Pool Tint | Max Count |
|--------------|-----------|-----------|-----------|
| Dust | `0xbb9966` | `sprite.tint = 0xbb9966` | 40 |
| Spark | `0xffdd44` | `sprite.tint = 0xffdd44` | 20 |
| Checkpoint flash | `0x44ff44` | `sprite.tint = 0x44ff44` | 4 |

All use the same white circle texture, differentiated by tint. This enables a single shared pool.

**Particle spawn guard (from v02 ISS-002 fix):** Spawn on both `Surface.Shoulder` and `Surface.Runoff`, skip only `Surface.Road`.

> **Research insight — EffectsRenderer needs Renderer reference:** The refactored EffectsRenderer calls `renderer.render({ container: skidStaging, target: skidTexture })` for RenderTexture operations. The current Phase 2 constructor only accepts `effectsLayer: Container`. **Add `renderer: Renderer` as a second constructor parameter.** This is a required dependency for the core skid mark refactor — without it, the implementation cannot function.

**Acceptance criteria — Step 0:**
- [x] Zero `new Graphics()` calls per frame in EffectsRenderer
- [x] Skid marks render to RenderTexture with gradual fade
- [x] Particles use sprite pool (acquire/release, no create/destroy)
- [x] Skid mark texture clears on race restart and track switch
- [x] effectsLayer child count is bounded (pool size + skidSprite = constant)
- [x] Visual parity with v02 effects (same colors, sizes, lifetimes)
- [x] No visual regression on particle spawn surfaces (ISS-002 guard preserved)

---

### Step 1+2 (Merged): pixi-filters Setup + FilterManager + P0 Effects

> **Structural change:** Steps 1 and 2 are merged — there is no reason for a separate "create FilterManager" and "attach filters" step. They are the same work: install pixi-filters, create the filters, attach them, verify visuals.

**Files:** `src/renderer/FilterManager.ts` (new), `src/renderer/AiCarRenderer.ts`, `src/renderer/WorldRenderer.ts`

**Install dependency:**

```bash
pnpm add pixi-filters@^6.1.5
```

> **Note:** FilterManager is the project's first "Manager" class — distinct from "Renderer" (render callback) and "Controller" (input/camera) classes. It deliberately does NOT follow the `render(prev, curr, alpha, race)` callback pattern because it manages cross-cutting concerns across multiple containers. Document this in the file header.

**FilterManager class:**

Centralized filter lifecycle management. Creates, configures, attaches, and updates all filters.

```typescript
import { BloomFilter } from 'pixi-filters/bloom';
import { DropShadowFilter } from 'pixi-filters/drop-shadow';
import { GlowFilter } from 'pixi-filters/glow';
import { MotionBlurFilter } from 'pixi-filters/motion-blur';
import { Filter, Container, Application } from 'pixi.js';

// ---- Filter Configuration ----
const BLOOM_STRENGTH = 3;
const BLOOM_QUALITY = 4;
const SHADOW_OFFSET = { x: 3, y: -3 }; // Y negated for camera Y-flip (see Y-Flip table)
const SHADOW_ALPHA = 0.4;
const SHADOW_BLUR = 2;
const GLOW_DISTANCE = 8;
const GLOW_OUTER_STRENGTH = 1.5;
const GLOW_COLOR = 0x00eeff; // AI_CAR_TINT
const GLOW_QUALITY = 0.3;
const MOTION_BLUR_KERNEL = 5;
const MOTION_BLUR_MAX_VELOCITY = 30; // Pixel-space clamp
const MOTION_BLUR_MAX_VELOCITY_SQ = MOTION_BLUR_MAX_VELOCITY * MOTION_BLUR_MAX_VELOCITY;

export class FilterManager {
  private readonly bloom: BloomFilter;
  private readonly shadow: DropShadowFilter;
  private readonly glow: GlowFilter;
  private readonly motionBlur: MotionBlurFilter;

  constructor() {
    this.bloom = new BloomFilter({
      strength: BLOOM_STRENGTH,
      quality: BLOOM_QUALITY,
    });

    this.shadow = new DropShadowFilter({
      offset: SHADOW_OFFSET,
      color: 0x000000,
      alpha: SHADOW_ALPHA,
      blur: SHADOW_BLUR,
      quality: 3,
    });

    this.glow = new GlowFilter({
      distance: GLOW_DISTANCE,
      outerStrength: GLOW_OUTER_STRENGTH,
      color: GLOW_COLOR,
      quality: GLOW_QUALITY,
    });

    this.motionBlur = new MotionBlurFilter({
      velocity: { x: 0, y: 0 },
      kernelSize: MOTION_BLUR_KERNEL,
    });
  }

  attach(worldContainer: Container, carLayer: Container, aiCarContainer: Container | null, app: Application): void {
    worldContainer.filters = [this.bloom, this.motionBlur];
    carLayer.filters = [this.shadow];
    if (aiCarContainer) {
      aiCarContainer.filters = [this.glow];
    } else {
      this.glow.enabled = false; // Disable, don't rebuild array
    }

    // REQUIRED: eliminate per-frame bounds traversal
    worldContainer.filterArea = app.screen;
  }

  updateMotionBlur(vx: number, vy: number, zoom: number): void {
    const screenVx = vx * zoom;
    const screenVy = -vy * zoom; // Y-flip compensation

    // Fast-path: skip sqrt when below clamp threshold (~70% of frames)
    const magSq = screenVx * screenVx + screenVy * screenVy;
    if (magSq <= MOTION_BLUR_MAX_VELOCITY_SQ) {
      this.motionBlur.velocity.x = screenVx;
      this.motionBlur.velocity.y = screenVy;
    } else {
      const mag = Math.sqrt(magSq);
      const scale = MOTION_BLUR_MAX_VELOCITY / mag;
      this.motionBlur.velocity.x = screenVx * scale;
      this.motionBlur.velocity.y = screenVy * scale;
    }
  }

  pause(): void {
    this.motionBlur.velocity.x = 0;
    this.motionBlur.velocity.y = 0;
  }

  destroy(): void {
    this.bloom.destroy();
    this.shadow.destroy();
    this.glow.destroy();
    this.motionBlur.destroy();
  }
}
```

> **Research insight — private filters:** Filter instances are `private` (not `readonly` public). All mutations go through FilterManager methods. If Phase 4 needs a quality tier API, add a `setQualityTier()` method rather than exposing filter internals.

> **Research insight — GlowFilter caveat:** `distance` and `quality` are baked into the GLSL shader source at construction time (via string replacement). Changing these properties after construction updates uniforms but NOT the compiled shader step size. To change glow distance/quality, create a new GlowFilter instance.

> **Research insight — MotionBlurFilter velocity format:** The velocity type format (`{x,y}` vs `[x,y]`) locks at construction. Always use `{x,y}` for consistency with PixiJS's `PointData` type.

**Filter resolution setup (in RendererApp, before FilterManager creation):**

```typescript
import { Filter } from 'pixi.js';
Filter.defaultOptions.resolution = 1; // Blur-based effects look fine at 1x
```

**Acceptance criteria — Step 1+2:**
- [x] `pixi-filters@^6.1.5` installed and importable
- [x] FilterManager creates all P0+P1 filter instances
- [x] Filters attached to correct containers per architecture diagram
- [x] `Filter.defaultOptions.resolution = 1` set at startup
- [x] `worldContainer.filterArea` set to `app.screen`
- [x] Motion blur velocity clamp prevents scene-obscuring blur at max speed
- [x] `pause()` zeroes motion blur velocity
- [x] No filters on `hudContainer` (stays sharp)
- [ ] Bloom visible on spark particles and AI car glow
- [ ] AI car has cyan glow halo (matches v02 visual appearance)
- [ ] Both cars have soft drop shadow (depth perception)
- [ ] Shadow appears below cars on screen (not above — verify Y-flip compensation)
- [ ] No bloom/glow on HUD elements
- [ ] Single-player mode: glow filter disabled (no AI car)
- [ ] All 3 tracks render correctly with filters active

---

### Step 3: P1 Effects — Motion Blur + Skid Mark Upgrade

**Files:** `src/renderer/FilterManager.ts`, `src/renderer/EffectsRenderer.ts`, `src/renderer/WorldRenderer.ts`

**Motion Blur (MotionBlurFilter on worldContainer):**

Updated per frame in the render callback:

```typescript
// In WorldRenderer.render() or GameLoop.onRender():
const car = curr.car; // Camera target (player or AI in spectator)
const vx = car.velocity.x; // World-space velocity
const vy = car.velocity.y;
filterManager.updateMotionBlur(vx, vy, camera.zoom);
```

**Motion blur behavior by game phase:**

| Phase | Behavior |
|-------|----------|
| Countdown (3-2-1) | velocity = [0,0] — car is stationary |
| Racing | Velocity from camera target, clamped |
| Paused | velocity = [0,0] — FilterManager.pause() called |
| Finished | Velocity naturally decelerates as car stops |
| Loading | Filters not processing (worldContainer invisible) |

**Motion blur velocity clamping:** Max 30px in screen space. At the typical max speed (~100 wu/s) and min zoom (2.5), that's 250px unclamped — would obscure the entire screen. The clamp preserves the blur sensation without readability loss.

**Skid mark RenderTexture upgrade** (from Step 0 refactor):

The Step 0 refactor already migrates skid marks to RenderTexture. Step 3 upgrades visual quality:

- **Line width:** Increase from v02's 1.8 to 2.2 world units for visibility under bloom
- **Color:** Darken to `0x333333` — darker marks are more visible on textured asphalt
- **Alpha:** Start at 0.8, fade via the gradual RenderTexture overlay
- **Under bloom:** Skid marks are dark (low brightness) — bloom has minimal effect. No visual issue.

**Acceptance criteria — Step 3:**
- [x] Motion blur visible at high speed (≥ 50% max speed)
- [x] Motion blur direction matches car movement direction on screen
- [x] Motion blur zeroed during countdown and pause
- [x] Motion blur clamped — scene readable at max speed
- [ ] Spectator mode: motion blur follows AI car velocity
- [x] Skid marks persist via RenderTexture (not individual Graphics)
- [x] Skid marks gradually fade over time
- [x] Skid marks clear on race restart and track switch
- [ ] 60fps maintained with P0+P1 effects active on dev machine

---

### Step 4: Performance Gate

**Before proceeding to P2 effects, verify performance:**

```
Target: 60fps with all P0+P1 effects active
Threshold: If FPS ≥ 55 → proceed to P2
           If FPS 45-54 → reduce filter resolution to 1x, retest
           If FPS < 45 → cut P2 and P3 entirely
```

**Test conditions:**
- All 3 tracks, with active racing (motion blur, particles, skid marks all firing)
- vs-AI mode (maximum filter count: bloom + motion blur + shadow + glow = 4 passes)
- Window at full screen resolution

**Measurement:** Use `performance.now()` delta in the render loop. Record frame times for 10 seconds of active racing.

> **Research insight — use P1 frame time, not average FPS:** Average FPS masks frame spikes. A game can average 58fps but have 100ms hitches every 2 seconds. **Use the 1st percentile frame time (P1).** Collect all frame deltas over 10 seconds, sort, take the 99th entry. Threshold: P1 frame time must be under 22ms (equivalent to 45fps floor on spikes).

> **Research insight — warm-up period:** PixiJS and GPU drivers compile shaders lazily on first use. **Discard the first 3 seconds** of measurement data to exclude shader compilation stalls.

> **Research insight — test on largest track:** Run the gate specifically on Track 3 (gauntlet, 50-60% larger than v02 Track 3) in vs-AI mode. This is maximum filter load + maximum track size + maximum skid texture dimensions.

If performance gate passes, proceed to Step 5+6. Otherwise, skip to Step 7 (testing).

---

### Step 5+6 (Merged): P2+P3 Effects — Shimmer, Speed Lines, CRT (ALL CONDITIONAL)

> **Structural change:** Steps 5 and 6 collapsed into a single conditional step. These are behind the performance gate — defer implementation details (GLSL) to the work phase if the gate passes. Writing production GLSL in the plan for features that may be cut is premature.

**Files (if gate passes):** `src/renderer/filters/ShimmerFilter.ts` (new), `src/renderer/filters/SpeedLinesFilter.ts` (new), `src/renderer/FilterManager.ts` (extend)

**P2: Heat Shimmer** — Localized displacement filter behind camera target's exhaust. Custom `Filter` subclass with `GlProgram`. NOT a full-frame DisplacementFilter. Speed-gated: only active above 40% max speed. Position/heading uniforms updated per frame. Heading Y-component must be negated for camera Y-flip.

**P2: Speed Lines** — Screen-space radial lines from screen center outward. Custom `Filter` subclass with `GlProgram`. Speed-gated: only visible above 60% max speed. Thin, subtle, white with low alpha.

**P3: CRT/Bloom** — `CRTFilter` from pixi-filters as the last filter in the worldContainer chain. Subtle settings: low curvature, faint scanlines, barely-visible noise. Use time-based seed (`crt.time % 1.0`) instead of `Math.random()` for reproducibility. Pause CRT ticker callback during game pause.

> **Research insight — GLSL ES 3.0 required:** PixiJS v8's `GlProgram` defaults to `#version 300 es`. Custom shaders MUST use ES 3.0 syntax: `in` (not `varying`), `out vec4 finalColor` (not `gl_FragColor`), `texture()` (not `texture2D()`). The plan's original GLSL would fail compilation on every browser.

> **Research insight — `DEFAULT_VERTEX` does not exist:** The correct import is `defaultFilterVert` from `pixi.js`. Use: `import { Filter, GlProgram, defaultFilterVert } from 'pixi.js'`.

> **Research insight — uniform typing:** PixiJS v8 resources are typed as `Record<string, any>`. Define a typed interface for uniforms and cast explicitly to prevent silent `any` chains: `const u = this.resources.shimmerUniforms.uniforms as ShimmerUniforms`.

> **Research insight — dead uniform:** Remove `uResolution` from ShimmerFilter — it is declared but never referenced in the fragment shader. Dead uniforms consume GPU uniform buffer space.

**Acceptance criteria — Step 5+6 (if performance gate passes):**
- [ ] Heat shimmer visible behind car exhaust at high speed, localized
- [ ] Speed lines visible at high speed, absent when slow
- [ ] CRT effect visible but subtle, does not interfere with HUD
- [ ] Both P2 effects respect camera Y-flip
- [ ] GLSL uses ES 3.0 syntax (`in`/`out`/`texture()`)
- [ ] FPS ≥ 55 with all active effects
- [ ] All effects can be disabled via `filter.enabled = false`

---

### Step 7: Integration Testing + Visual Verification

**All priority tiers:**

- [ ] All 3 game modes (single, vs-AI, spectator) with all active filters
- [ ] All 3 tracks with all active filters
- [ ] Screen transitions: menu → track-select → playing → pause → playing → finish → menu
- [ ] Track switching: playing Track 1 → menu → playing Track 2 (filters reset correctly)
- [ ] Race restart on same track (skid marks clear, motion blur resets)
- [ ] Window resize during gameplay (filters adapt)
- [ ] Browser tab switch and return (filters resume correctly)
- [ ] Countdown → racing transition (motion blur starts at zero, ramps up)
- [ ] Pause → resume (motion blur zeroes during pause, resumes on unpause)
- [ ] Spectator mode: filters follow AI car (motion blur, shadow on correct car)

**Performance:**
- [ ] 60fps with P0+P1 on all 3 tracks in vs-AI mode
- [ ] No visible GC stutter from particle pool
- [ ] effectsLayer child count does not grow unbounded

**Visual verification (manual — Briggsy approves):**
- [ ] Drop shadows create depth perception (cars feel grounded)
- [ ] Bloom enhances spark and glow effects without washing out
- [ ] Motion blur creates speed sensation without obscuring gameplay
- [ ] AI car glow halo is visible and distinct from player car
- [ ] Skid marks accumulate and fade naturally
- [ ] No filter artifacts at screen edges
- [ ] HUD remains crisp and unaffected by all filters

## System-Wide Impact

### Interaction Graph

Filter attachment triggers this chain:
1. `FilterManager.attach()` sets `worldContainer.filters` → PixiJS begins rendering worldContainer to RenderTexture each frame
2. PixiJS uses **ping-pong textures** for filter chains — at most 2 temp RTs for N filters on the same container
3. `carLayer.filters` adds a separate render pass for car subtree (small bounds: ~50x50px at world scale × zoom)
4. `AiCarRenderer.container.filters` adds another pass for AI car (trivially small bounds)

**Corrected render pass budget (vs-AI mode at resolution 1):**

| Pass | Pixels (at res 1) | Notes |
|------|-------------------|-------|
| Main scene render | 2.07M | 1920×1080 backbuffer |
| Bloom (Kawase downsampled) | ~0.8M | Internal downsampling before blur |
| Motion blur | 2.07M | Full viewport, kernel 5 |
| Drop shadow (carLayer bounds) | ~0.13M | Only car sprite bounds |
| Glow (AI car bounds) | ~0.05M | Only AI sprite bounds |
| Skid RT fade (when dirty) | Variable | Track AABB at res 1 |
| **P0+P1 Total** | **~5.1M** | Comfortable on all hardware |

### API Surface Parity

- **FilterManager** is new — no existing interface to maintain
- **EffectsRenderer** refactored internally — external API (`render()`, `reset()`, `destroy()`) unchanged
- **AiCarRenderer** receives GlowFilter from FilterManager instead of creating its own — constructor signature change
- **WorldRenderer** calls `FilterManager.attach()` during setup — new wiring

## Acceptance Criteria

### Functional Requirements (P0 — Must Ship)

- [ ] Bloom/glow visible on AI car and spark particles
- [ ] Drop shadow on all cars in all game modes
- [ ] No filters affect HUD (hudContainer stays sharp)
- [x] EffectsRenderer creates zero `new Graphics()` per frame

### Functional Requirements (P1 — Must Ship)

- [x] Motion blur scales with car velocity (visible at high speed, absent when stationary)
- [x] Motion blur direction correct under camera Y-flip
- [x] Skid marks persist via RenderTexture with gradual fade
- [x] Skid marks clear on race restart and track switch

### Functional Requirements (P2 — Conditional on Performance Gate)

- [ ] Heat shimmer localized behind exhaust, speed-gated
- [ ] Speed lines visible at high speed, screen-space

### Functional Requirements (P3 — Conditional on Performance Gate)

- [ ] CRT/bloom effect subtle and cinematic

### Non-Functional Requirements

- [ ] 60fps with P0+P1 effects active (55fps minimum threshold)
- [x] Filter resolution capped at 2x DPI
- [x] No memory leaks from filter or RenderTexture lifecycle
- [x] effectsLayer child count bounded (sprite pool size constant)

### Quality Gates

- [ ] Visual verification by Briggsy (manual play session)
- [ ] All 3 tracks + all 3 game modes tested with filters
- [ ] Screen transitions tested (no filter artifacts on state changes)

## Dependencies & Prerequisites

| Dependency | Status | Source |
|-----------|--------|--------|
| Phase 2 complete (container hierarchy, car sprites, effects layer) | Required | Phase 2 plan |
| `pixi-filters@^6.1.5` | Add in Step 1 | npm |
| PixiJS v8 `Filter`, `GlProgram`, `RenderTexture` APIs | Available | pixi.js |
| `isRenderGroup: true` on worldContainer + hudContainer | Set in Phase 2 | Phase 2 plan D5 |
| AiCarRenderer with `setTint()`/`setAlpha()` API | Built in Phase 2 | Phase 2 plan D4 |
| EffectsRenderer with effectsLayer constructor | Built in Phase 2 | Phase 2 plan Step 6 |

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Integrated GPU drops below 60fps with filters | P2/P3 cut | Medium | Performance gate at Step 4. Filter resolution cap at 2x. |
| Camera Y-flip breaks filter directions | Motion blur/shadow point wrong way | Medium | Spike test filter+Y-flip early in Step 2. Explicit negation in FilterManager. |
| EffectsRenderer refactor breaks visual parity | Effects look different than v02 | Low | Step 0 acceptance criteria require visual parity check. |
| Custom GLSL fails on some GPUs | Heat shimmer/speed lines absent | Low | P2 is conditional. GLSL kept simple (no advanced features). Graceful fallback (no filter). |
| RenderTexture coordinate space mismatch | Skid marks at wrong positions | Medium | Match skidSprite position to track origin. Test on all 3 tracks. |
| pixi-filters v6 API mismatch with PixiJS v8 minor version | Import or runtime errors | Low | v02 already uses pixi-filters@6.1.5 with PixiJS v8 successfully. |
| Bloom on dust particles looks wrong | Brown particles glow unnaturally | Low | Accept — bloom at `strength: 3` on low-brightness objects is minimal. Tune if needed. |
| **NEW: Skid RT coordinate space under Y-flip** | Marks appear mirrored | Medium | Apply `skidSprite.scale.y = -1` per D6 pattern. Spike test in Step 0. |
| **NEW: FilterManager.attach() timing** | Glow on null container | Low-Medium | Call after WorldRenderer construction, before first render. |
| **NEW: Pause overwrites motion blur** | Blur flickers during pause | Medium | Render callback must check `GamePhase.Paused` and skip `updateMotionBlur()`. |
| **NEW: Skid fade darkens entire track** | Track progressively blackens | Medium | Use `skidSprite.blendMode = 'multiply'` or alpha-reduction approach. |
| **NEW: WebGL context loss** | Skid RT destroyed without recovery | Low | Add `webglcontextrestored` handler to recreate skid RT. |
| **NEW: Spectator mode rendering broken** | AI sprite never updates | High | Phase 2 gap — must fix dispatch routing before Phase 3. |

## Implementation Summary

| Step | Scope | Files | New/Modified |
|------|-------|-------|-------------|
| 0 | EffectsRenderer refactor | `EffectsRenderer.ts`, `SpritePool.ts` | Modified + New |
| 1+2 | pixi-filters + FilterManager + P0 Effects | `FilterManager.ts`, `AiCarRenderer.ts`, `WorldRenderer.ts`, `package.json` | New + Modified |
| 3 | P1: Motion Blur + Skid Upgrade | `FilterManager.ts`, `EffectsRenderer.ts`, `WorldRenderer.ts` | Modified |
| 4 | Performance Gate | (testing only) | None |
| 5+6 | P2+P3: Shimmer + Speed Lines + CRT (CONDITIONAL) | `filters/ShimmerFilter.ts`, `filters/SpeedLinesFilter.ts`, `FilterManager.ts` | New + Modified |
| 7 | Integration Testing | (testing only) | None |

**New files:** 4 (`FilterManager.ts`, `SpritePool.ts`, `ShimmerFilter.ts`, `SpeedLinesFilter.ts`)
**Modified files:** 4 (`EffectsRenderer.ts`, `AiCarRenderer.ts`, `WorldRenderer.ts`, `package.json`)
**Engine files touched:** 0 (engine is FROZEN)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: VFX scope P0+P1 minimum (Decision #7), filter container architecture (ADR-05), pixi-filters not Spine/DragonBones
- **CE Spec ADR-05:** Post-processing filter chain on dedicated compositing container, HUD outside filter chain
- **CE Spec ADR-09:** Phase 3 scope — bloom, motion blur, shadow, heat shimmer, upgraded particles

### Internal References

- Phase 2 plan (container hierarchy, filter debt): `docs/plans/2026-03-11-feat-phase-2-core-visual-upgrade-plan.md`
- v02 EffectsRenderer (refactor source): `top-down-racer-02/src/renderer/EffectsRenderer.ts`
- v02 AiCarRenderer (GlowFilter pattern): `top-down-racer-02/src/renderer/AiCarRenderer.ts`
- v02 CameraController (Y-flip): `top-down-racer-02/src/renderer/CameraController.ts`

### External References

- [PixiJS v8 Filters Guide](https://pixijs.com/8.x/guides/components/filters)
- [PixiJS v8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [pixi-filters v6 GitHub](https://github.com/pixijs/filters)
- [pixi-filters Interactive Demos](https://pixijs.io/filters/examples/)
- [Filter HiDPI Resolution Issue #11467](https://github.com/pixijs/pixijs/issues/11467)
- [PixiJS v8 ParticleContainer Guide](https://pixijs.com/8.x/guides/components/scene-objects/particle-container)
- [PixiJS v8 RenderTexture API](https://pixijs.download/dev/docs/rendering.RenderTexture.html)

### Phase 3 Debt Items (Documented for Phase 4+)

| Item | Description | When to Address |
|------|------------|-----------------|
| AI car skid marks | EffectsRenderer only tracks camera-target car. AI skid marks in vs-AI mode not rendered. | Phase 4 polish or defer |
| Spectator mode rendering | Dispatch routes AI state to hidden player sprite — visible AI sprite never updates. Blocks spectator filters. | **Must fix in Phase 2 before Phase 3 execution** |
