---
module: renderer
date: "2026-03-12"
problem_type: ui_bug
component: FilterManager.ts, EffectsRenderer.ts
symptoms:
  - "Only upper quadrant of screen rendered due to filterArea clipping with Y-flipped camera"
  - "Dark artifacts on skid marks from multiply blend mode applied to transparent RenderTexture"
  - "Skid mark fade effect producing visual artifacts when combined with transparency"
root_cause: "filterArea = app.screen provided fixed screen-space bounds that became invalid under the camera's negative-Y-scale transform, causing PixiJS to clip filter output; multiply blend mode on transparent pixels produced black instead of passthrough"
resolution_type: code_change
severity: high
tags:
  - pixijs-v8
  - webgl
  - filter-area
  - blend-mode
  - multiply
  - camera-transform
  - y-flip
  - render-texture
  - skid-marks
  - clipping
  - post-processing
---

## Problem

Two rendering bugs surfaced during visual verification of Phase 3 (post-processing filters + effects), despite all 408 tests passing:

1. **filterArea clipping** — Only the upper quadrant of the screen rendered with filters applied. The rest of the game world was clipped to black.
2. **Multiply blend artifacts** — Skid marks rendered on a transparent `RenderTexture` using `blendMode = 'multiply'` produced dark/black rectangular artifacts instead of subtle tire marks. A fade-out approach (semi-transparent white rect drawn over the RT each frame) caused full-screen darkening.

Both bugs were invisible to the test suite because unit tests mock the WebGL pipeline and never produce actual rendered pixels.

## Investigation

**filterArea clipping:**
- Confirmed that `worldContainer.filterArea = app.screen` was applied as a documented PixiJS performance optimization (avoids expensive recursive bounds calculation every frame).
- Observed that the camera system applies a Y-flip via negative `scale.y` on the world container to convert between engine coordinates (Y-up) and screen coordinates (Y-down).
- Tested removing `filterArea` entirely — rendering corrected immediately, confirming the fixed screen-space rectangle was the problem.

**Multiply blend artifacts:**
- Confirmed `blendMode = 'multiply'` was set on the skid mark `Sprite` backed by a `RenderTexture` with transparent background.
- Tested switching to `blendMode = 'normal'` — artifacts disappeared.
- Tested the fade approach (rendering a semi-transparent white rectangle over the RT each frame to gradually erase old marks) — produced a different artifact: full-screen progressive darkening, because the white rect composited against transparency incorrectly.
- Tested disabling fade entirely (marks persist until race reset) — clean rendering confirmed.

## Root Cause

**Bug 1: filterArea + Y-flip incompatibility**

`filterArea` accepts a `Rectangle` in the container's *local* coordinate space. When `app.screen` is assigned (e.g., `{ x: 0, y: 0, width: 1280, height: 720 }`), PixiJS clips filter output to that rectangle. But the camera's Y-flip (`scale.y = -1`) inverts the container's local Y-axis, meaning local coordinate `y = 0` is now at the *bottom* of the screen and positive Y extends *upward*. The fixed `app.screen` rectangle only covers `y = 0..720` in local space — which, after the flip, maps to a single quadrant of the visible viewport. PixiJS clips everything outside that region.

```typescript
// BROKEN: filterArea assumes local Y matches screen Y
worldContainer.filterArea = app.screen; // Rectangle(0, 0, 1280, 720)
// But camera applies: worldContainer.scale.y = -1
// Local y=0..720 maps to only one quadrant after the flip
```

**Bug 2: Multiply blend + transparent RenderTexture**

The WebGL multiply blend equation is `result = src * dst`. When the destination (the RenderTexture) has transparent pixels (`rgba(0,0,0,0)`), multiplying any color by zero alpha does not produce "nothing" — it produces black (`rgb(0,0,0)` with some alpha). This is a fundamental property of the multiply blend mode in WebGL, not a PixiJS bug. The fade workaround (drawing `rgba(255,255,255, 0.02)` over the RT each frame) compounds the problem: it introduces non-zero alpha across the entire texture, which then multiplies with the scene and progressively darkens the screen.

```typescript
// BROKEN: multiply blend with transparent RT
skidSprite.blendMode = 'multiply';
// WebGL: result = src_color * dst_color
// When dst is rgba(0,0,0,0), result is black, not transparent

// ALSO BROKEN: fade via white rect
fadeRect.color = 0xffffff;
fadeRect.alpha = 0.02; // Introduces alpha everywhere -> progressive darkening
```

## Solution

**Step 1: Remove filterArea from FilterManager.ts**

Remove the `filterArea = app.screen` optimization entirely. Let PixiJS auto-compute bounds each frame. This is slower (recursive bounds traversal) but correct regardless of container transforms.

```typescript
// BEFORE (FilterManager.ts)
attach(worldContainer: Container, carLayer: Container, aiCarContainer: Container | null, app: Application): void {
  worldContainer.filters = [this.bloom, this.motionBlur];
  worldContainer.filterArea = app.screen;
}

// AFTER
attach(worldContainer: Container, carLayer: Container, aiCarContainer: Container | null): void {
  worldContainer.filters = [this.bloom, this.motionBlur];
  // filterArea removed — auto-bounds is slower but correct with Y-flip camera
}
```

**Step 2: Remove the `app` parameter from the attach call site in ScreenManager.ts**

```typescript
// BEFORE (ScreenManager.ts)
this.filterManager.attach(this.worldContainer, this.carLayer, this.worldRenderer.getAiCarContainer(), this.app);

// AFTER
this.filterManager.attach(this.worldContainer, this.carLayer, this.worldRenderer.getAiCarContainer());
```

**Step 3: Switch skid marks to normal blend and disable fade in EffectsRenderer.ts**

```typescript
// BEFORE
this.skidSprite.blendMode = 'multiply';
this.skidFadeRect = new Graphics().rect(0, 0, texW, texH).fill({ color: 0xffffff, alpha: SKID_FADE_ALPHA });

// AFTER
// Normal blend — multiply causes artifacts with transparent RenderTextures
this.skidFadeRect = new Graphics().rect(0, 0, texW, texH).fill({ color: 0x000000, alpha: 0 });

private fadeSkidMarks(): void {
  // Fade disabled — marks persist until race reset.
  // Avoids blend mode artifacts with transparent RenderTextures.
  // Can revisit with alpha-reduction approach later.
}
```

**Step 4: Update tests in filter-manager.test.ts**

```typescript
// BEFORE
const app = { screen: { width: 1920, height: 1080 } } as any;
fm.attach(world, car, null, app);
expect(world.filterArea).toBe(screen);

// AFTER
fm.attach(world, car, null);
expect(world.filterArea).toBeUndefined(); // deferred optimization
```

## Key Insight

**PixiJS performance optimizations that bypass automatic computation assume a standard coordinate system.** The `filterArea` optimization is safe *only* when the container's local coordinate space aligns with screen space. Any non-trivial transform on the container — negative scale for Y-flip, rotation, non-origin pivot — invalidates the assumption that `app.screen` describes the visible region in local coordinates. Similarly, non-standard blend modes (`multiply`, `screen`, `overlay`) assume opaque destination pixels; they produce mathematically correct but visually wrong results when the destination contains transparency. Neither of these interactions is documented in PixiJS — they emerge from the gap between the API's convenience abstractions and WebGL's actual blending math. When visual bugs appear despite passing tests, the root cause is almost always an assumption that holds in the test mock but breaks in the real GPU pipeline.

## Prevention

### Rules and Guidelines

1. **Never hardcode `filterArea` on containers that use non-identity transforms.** The `filterArea` rectangle is interpreted in the container's local coordinate space. If the container has negative scale, rotation, or non-trivial pivot, the rectangle maps to unexpected screen regions. Let PixiJS auto-compute bounds unless you have profiling evidence that bounds computation is a bottleneck — and even then, test with the actual camera transform active.

2. **Never use `multiply` blend mode on content with transparency.** Multiply blends RGB channels independently: `result = src * dst`. When `src` alpha is 0, the RGB channels are typically 0 (pre-multiplied alpha), so the multiplication produces black, not transparency. This applies to any blend mode that is not alpha-aware (`multiply`, `screen`, `overlay`, etc.) when used on RenderTextures or sprites with transparent regions.

3. **Do not fade RenderTexture content by overdrawing semi-transparent rects.** Each frame's semi-transparent overlay compounds multiplicatively, driving RGB toward black rather than toward transparency. If you need fading trail effects, either (a) reduce alpha of the entire RT sprite each frame and redraw from scratch periodically, or (b) maintain a ring buffer of recent marks and age them individually.

4. **Treat PixiJS "optimization tips" as conditional advice, not universal rules.** Documentation examples often assume the simplest case (no camera transform, opaque backgrounds, identity scale). Any optimization that interacts with coordinate spaces or blending must be re-validated against your actual rendering pipeline.

### When to Be Suspicious

- **Black rectangles or black regions** appearing where transparency is expected — almost always a blend mode operating on pre-multiplied-alpha content with zero alpha.
- **Rendering that works at one camera position but clips at another** — a strong signal that a bounds rectangle (filterArea, hitArea, mask) is in the wrong coordinate space.
- **Negative scale on any container in the filter chain** — Y-flip (`scale.y = -1`) is the most common case. Any manually-specified rectangle on that container will be inverted.
- **Progressive darkening over time** — compounding blend operations on a persistent surface. Each frame's "fade" pass multiplies existing color values down.

### Testing Strategies

1. **Automated screenshot regression tests** with `pixelmatch` or Playwright's `toHaveScreenshot`. Capture known scenes, diff against baseline.
2. **Camera extremes test scene** — render a known pattern at origin, far positive, far negative, and maximum zoom. This would have caught filterArea clipping immediately.
3. **Transparency canary** — use a bright non-black background behind composited layers during development. Black artifacts on magenta are instantly obvious.
4. **Blend mode smoke test** — render the sprite at full and zero opacity on a known background. Verify zero-opacity produces no visible output.

### Pre-Flight Checklist: PixiJS Filters + Camera Transforms

- [ ] **filterArea**: Is it set manually? Does the container have non-identity scale/rotation/pivot? If both: remove or transform the rectangle.
- [ ] **Blend mode**: Is any mode other than `normal` used? Does the source have transparent pixels? Verify no black artifacts.
- [ ] **RenderTexture accumulation**: Is any RT drawn to across frames without full clear? Confirm no progressive darkening.
- [ ] **Camera positions**: Visually verified at multiple camera positions including negative coordinates?
- [ ] **Background contrast test**: Composited result viewed against bright contrasting background to reveal hidden artifacts?
- [ ] **Scale sign**: Any negative scale values between stage and filtered container? Verify manually-specified rectangles account for the flip.

## Related Documentation

- `docs/evidence/methodology-in-practice.md` — Documents this bug in the bug detection table (line 160) and "What Was Harder Than Expected" section
- `docs/plans/2026-03-12-feat-phase-3-post-processing-effects-plan.md` — Contains the original plan that prescribed both `filterArea` and `multiply` blend. Deepen-plan correction #4 ironically introduced the multiply blend
- `docs/Phase-3-Post-Processing-Learnings.md` — Pre-execution learnings (written before the bug manifested)
- `docs/research/2026-03-12-integration-best-practices.md` — Contains the same filterArea pattern that caused the bug (line 612)
- Commit `63b0d6bf` — The fix
- Commit `ad13e9b5` — The original FilterManager implementation that introduced filterArea
