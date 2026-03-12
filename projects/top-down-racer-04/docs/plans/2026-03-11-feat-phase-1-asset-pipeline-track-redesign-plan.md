---
title: "Phase 1: Asset Pipeline + Track Redesign"
type: feat
status: active
date: 2026-03-11
deepened: 2026-03-11
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

# Phase 1: Asset Pipeline + Track Redesign

## Enhancement Summary

**Deepened on:** 2026-03-11
**Research agents used:** 10 (PixiJS v8 Spritesheet, Sharp Composite/Atlas, Track Geometry Design, Architecture Strategist, Performance Oracle, TypeScript Reviewer, Pattern Recognition, Spec Flow Analyzer, Security Sentinel, Code Simplicity Reviewer)

### Critical Fixes Found
1. **BUG: `spriteSourceSize` in atlas JSON uses atlas coordinates instead of source-relative** — all frames must use `{ x: 0, y: 0, w: 256, h: 256 }` for untrimmed sprites
2. **Manifest structure mismatch** — spec ADR-02 shows individual car PNGs; plan shows atlas frames. Plan is correct. Spec example is superseded.
3. **Track backgrounds are environment art** — must be explicitly documented. BGs show scenery (grandstands, grass), NOT the track surface. Road surface is still rendered programmatically. Phase 0 BGs don't need to match redesigned geometry pixel-for-pixel.

### Key Research Findings
4. **Atlas needs 1-2px padding** between sprites to prevent WebGL texture bleeding (bilinear filtering pulls adjacent pixels)
5. **AI reward uses continuous arc-length, NOT checkpoints** — checkpoints serve lap counting + respawn only. Increase to 40/45 for longer tracks to improve respawn granularity.
6. **Chicane self-intersection rule**: lateral jog must be ≤25 units at H=14-16 width. Longitudinal spacing ≥140 units. v02's chicane failed because total inner offset (56 units) exceeded curvature radius.
7. **Decreasing-radius corner**: progressively decrease control point spacing (80→55→35 units apart) while tapering width from C=22 to H=16
8. **Codegen determinism is critical** — sorted keys, no timestamps, `@generated` header, `eslint-disable`, `--check` flag for CI
9. **Per-track texture loading is essential** — each 2048×2048 BG = 16MB VRAM. All 3 loaded = 48MB (too much for integrated GPUs)
10. **World-to-pixel mapping resolved** — fit largest BB dimension + margins to 2048px square. All tracks stay crisp at camera zoom 2.5-4.0 px/wu.

### Simplifications Applied
11. Cut 4 low-value geometry tests (bounding box range, CP count range, straight detection, decreasing-radius detection) — these test design guidelines, not functional invariants
12. Validation gate 6 (checkpoint containment) removed — tests the frozen engine, not track data
13. Preview tool scoped down to inner/outer boundaries + control point dots + grid lines only
14. "All-or-nothing" output → simpler "clean-before-write + fail-fast" pattern
15. Track geometry tests moved to `tests/engine/track-geometry.test.ts` (follows v02 convention)

## Overview

Phase 1 combines two parallel workstreams into a single phase (as spec confirms — see brainstorm: `docs/brainstorms/2026-03-11-full-build-brainstorm.md` — Decision #3):

**Workstream A — Asset Processor Tooling:** Build a Sharp-based pipeline that ingests the 11 raw PNGs from Phase 0's `assets/raw/`, optimizes them (compression, metadata stripping), packs car sprites into a texture atlas, organizes outputs into `public/assets/`, and auto-generates a typed manifest at `src/assets/manifest.ts`. Zero magic strings in game code.

**Workstream B — Track 2 & 3 Geometry Redesign:** Replace Track 2 (speedway) and Track 3 (gauntlet) geometry with new designs that force genuine AI generalization. No two corners share a radius. Track 1 geometry remains FROZEN. Track data files in `src/tracks/` are data, not engine code — modification is in scope.

## Problem Statement / Motivation

**Asset pipeline:** Phase 0 produces raw PNGs at correct dimensions, but the game needs optimized assets organized by category, a texture atlas for sprite batching, and typed references so the renderer never uses string literals. Without this pipeline, Phase 2 (visual upgrade) has no typed asset contract to build against.

**Track redesign:** v02's AI didn't learn to drive — it memorized Track 3's specific polygon (ADR-12). The v02 model is a lookup table wearing a neural net costume. Tracks 2 and 3 must be redesigned so that no two corners share a radius, making memorization statistically impossible. This is the foundation of v04's AI generalization story.

## Proposed Solution

### Workstream A: Asset Processor Architecture

```
scripts/process-assets.ts   — CLI entrypoint: read raw → optimize → atlas → organize → manifest
scripts/image-processing.ts — Reuse from Phase 0 (Sharp functions already exist)
scripts/types.ts             — Reuse from Phase 0 (shared type contract)
  ↓ reads from
assets/raw/*.png             — 11 raw PNGs from Phase 0
  ↓ writes to
public/assets/
  ├── sprites/
  │   ├── cars-atlas.json    — PixiJS Spritesheet descriptor
  │   └── cars-atlas.png     — 512×512 atlas (4 × 256×256 car sprites)
  ├── tracks/
  │   ├── track01-bg.png     — optimized 2048×2048
  │   ├── track02-bg.png     — optimized 2048×2048
  │   └── track03-bg.png     — optimized 2048×2048
  ├── textures/
  │   ├── asphalt-tile.png   — optimized 512×512
  │   ├── grass-tile.png     — optimized 256×256
  │   └── curb-tile.png      — optimized 128×64
  └── ui/
      └── menu-bg.png        — optimized 1920×1080

src/assets/manifest.ts       — auto-generated typed manifest (as const)
```

### Script Flow

```
pnpm run process-assets
  0. DELETE public/assets/ entirely (clean-before-write — prevents stale artifacts)
  1. Verify assets/raw/ exists with expected PNGs (fail fast if Phase 0 hasn't run)
  2. Create public/assets/ subdirectory structure (sprites/, tracks/, textures/, ui/)
  3. Optimize individual assets:
     a. PNG compression (compressionLevel: 9, adaptiveFiltering: true)
        (Sharp strips metadata by default — no withMetadata(false) needed)
     b. Copy to category subdirectory in public/assets/
  4. Build car sprite atlas:
     a. Read 4 car PNGs (256×256 each)
     b. Composite into 520×520 atlas PNG (2×2 grid, 2px padding per edge)
     c. Generate PixiJS Spritesheet JSON descriptor (with padding-adjusted coordinates)
     d. Write atlas.png + atlas.json to public/assets/sprites/
  5. Generate typed manifest:
     a. Inventory all processed assets (sorted keys for determinism)
     b. Write src/assets/manifest.ts with as const
  6. Validate all outputs:
     a. Verify every manifest path resolves to an existing file
     b. Verify atlas JSON is structurally valid
     c. Validate output paths don't escape target directories (path jail check)
     d. Print summary table
  7. Non-zero exit code if any step failed

pnpm run process-assets --check
  (CI mode: generate in memory, compare to existing files, exit non-zero if diff detected)
```

#### Research Insights: Asset Processor

**Clean-before-write (replaces "all-or-nothing"):** Delete `public/assets/` at step 0, then write files sequentially. If any step fails, the incomplete directory is obviously missing files — no stale manifest risk. This is simpler than transactional temp-directory-then-rename and matches how `tsc`, `vite build`, and other tools work.

**Sharp PNG defaults:** Sharp strips all metadata (EXIF, ICC, XMP) by default. Explicit `withMetadata(false)` is unnecessary. `compressionLevel: 9` with `adaptiveFiltering: true` is the correct choice for build-time assets — 5-15% smaller than level 6, with negligible absolute time difference for 11 files.

**Path jail check:** Before every file write, validate the resolved path starts with the intended output directory. Prevents theoretical path traversal if asset names ever contain `../`. Also validate asset names match `/^[a-z0-9-]+$/` before emitting into the manifest to prevent code injection into the generated TypeScript.

**`--check` flag for CI:** Runs the full pipeline in memory, compares output to existing committed files, exits non-zero if they differ. Catches "forgot to regenerate" bugs. Common pattern for codegen tools.

### Typed Manifest Pattern

```typescript
/* eslint-disable */
// @generated by scripts/process-assets.ts — DO NOT EDIT
// Regenerate with: pnpm run process-assets

export const ASSETS = {
  cars: {
    atlas: 'assets/sprites/cars-atlas.json',
    frames: {
      playerRed: 'car-player-red',
      playerBlue: 'car-player-blue',
      playerYellow: 'car-player-yellow',
      ai: 'car-ai',
    },
  },
  tracks: {
    'track-01': { bg: 'assets/tracks/track01-bg.png' },
    'track-02': { bg: 'assets/tracks/track02-bg.png' },
    'track-03': { bg: 'assets/tracks/track03-bg.png' },
  },
  textures: {
    asphalt: 'assets/textures/asphalt-tile.png',
    grass: 'assets/textures/grass-tile.png',
    curb: 'assets/textures/curb-tile.png',
  },
  ui: {
    menuBg: 'assets/ui/menu-bg.png',
  },
} as const;

export type PlayerCarFrame = typeof ASSETS.cars.frames[Exclude<keyof typeof ASSETS.cars.frames, 'ai'>];
export type AiCarFrame = typeof ASSETS.cars.frames['ai'];
export type CarFrame = PlayerCarFrame | AiCarFrame;
export type TrackId = keyof typeof ASSETS.tracks;
```

**Manifest design rationale:**
- Car sprites reference atlas frame names (not file paths) — PixiJS Spritesheet resolves frames from the atlas JSON
- Everything else references file paths relative to `public/` (the Vite static asset root)
- `as const` preserves literal types — game code gets autocomplete and type errors for invalid asset keys
- Derived types (`CarFrame`, `TrackId`) prevent magic strings downstream
- **NOTE: This manifest structure supersedes the spec ADR-02 example.** The spec shows individual car PNGs; this plan uses atlas frames. This is the canonical structure.

#### Research Insights: Manifest TypeScript

**`@generated` header:** The `@generated` tag is recognized by GitHub's diff view (auto-collapses generated files in PRs) and signals to developers/tools that the file is machine-produced. Combined with `eslint-disable`, this prevents lint rules from fighting the codegen output.

**Track key alignment with registry:** Manifest track keys use `'track-01'` (with hyphen) to match the registry's `id: 'track-01'` convention. This eliminates a naming mismatch that would require a mapping function. The registry and manifest reference tracks with the same string format.

**`PlayerCarFrame` / `AiCarFrame` split:** The 3 game modes (Single Player, vs AI, Spectator) need to distinguish player-selectable car frames from the AI frame. Splitting the union type now costs two lines and prevents a "why are all frames in one union" refactor when Phase 4 builds the game mode UI.

**Codegen determinism:** The generator MUST produce byte-for-byte identical output across runs when inputs haven't changed. Object keys must be sorted alphabetically (not filesystem readdir order). No timestamps. Consistent formatting via template strings. This prevents phantom git diffs on regeneration.

### Car Sprite Atlas Format

PixiJS v8 Spritesheet JSON format (TexturePacker-compatible). **With 2px padding per edge to prevent texture bleeding:**

```json
{
  "frames": {
    "car-player-red": {
      "frame": { "x": 2, "y": 2, "w": 256, "h": 256 },
      "trimmed": false,
      "sourceSize": { "w": 256, "h": 256 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 256, "h": 256 }
    },
    "car-player-blue": {
      "frame": { "x": 262, "y": 2, "w": 256, "h": 256 },
      "trimmed": false,
      "sourceSize": { "w": 256, "h": 256 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 256, "h": 256 }
    },
    "car-player-yellow": {
      "frame": { "x": 2, "y": 262, "w": 256, "h": 256 },
      "trimmed": false,
      "sourceSize": { "w": 256, "h": 256 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 256, "h": 256 }
    },
    "car-ai": {
      "frame": { "x": 262, "y": 262, "w": 256, "h": 256 },
      "trimmed": false,
      "sourceSize": { "w": 256, "h": 256 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 256, "h": 256 }
    }
  },
  "meta": {
    "image": "cars-atlas.png",
    "format": "RGBA8888",
    "size": { "w": 520, "h": 520 },
    "scale": "1"
  }
}
```

**Why atlas for 4 sprites:** The spec (ADR-02) explicitly calls for a texture atlas builder. With 4 car sprites at 256×256, a ~520×520 atlas (2px padding per edge) is a clean 2×2 grid — trivial to implement with Sharp's `composite()`. PixiJS's sprite batcher can draw both cars in a single draw call from the atlas. No external atlas-packing library needed.

#### Research Insights: Atlas Format

**BUG FIX — `spriteSourceSize`:** The original plan had `spriteSourceSize` using atlas-space coordinates (e.g., `x: 256, y: 0`). This is wrong. `spriteSourceSize` describes the offset of content *within the original source image*, which for untrimmed sprites is always `{ x: 0, y: 0, w: 256, h: 256 }`. The `frame` field already encodes the atlas position. Confirmed by reading PixiJS v8 source (`Spritesheet.ts`).

**`trimmed: false` is important:** Without it, PixiJS defaults `trimmed` to `undefined`, and `undefined !== false` is `true` — meaning PixiJS would create a trim rectangle from `spriteSourceSize` even though sprites aren't trimmed. Explicitly setting `trimmed: false` skips trim processing entirely.

**2px padding prevents texture bleeding:** WebGL's bilinear filtering (`GL_LINEAR`, PixiJS default) samples neighboring pixels. Without padding, the GPU can pull in pixels from adjacent sprites at frame boundaries. 2px padding per edge is standard practice. Atlas grows from 512×512 to 520×520 (4 tiles at 256 + 4 gaps at 2px = 520).

**Minimal valid format:** PixiJS v8 only requires `frame` in each frame entry and `scale` in meta. `sourceSize`, `spriteSourceSize`, and `trimmed` are optional. But including them explicitly prevents edge-case bugs and is more self-documenting. Keep the full format.

**v7 → v8 format unchanged:** The JSON schema is identical between PixiJS v7 and v8 (confirmed by comparing source code). Only the TypeScript interface name changed (`ISpritesheetFrameData` → `SpritesheetFrameData`). No migration risk.

**Loading in Phase 2:** Use `Assets.load('assets/sprites/cars-atlas.json')` — PixiJS auto-detects the spritesheet, loads the atlas image, and resolves frames by name. Handles caching and resolution detection automatically.

**Sharp composite for atlas:**
```typescript
await sharp({ create: { width: 520, height: 520, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: 'car-red.png',    top: 2,   left: 2   },
    { input: 'car-blue.png',   top: 2,   left: 262 },
    { input: 'car-yellow.png', top: 262, left: 2   },
    { input: 'car-ai.png',     top: 262, left: 262 },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile('cars-atlas.png');
```

### Workstream B: Track Geometry Redesign

#### Track Data File Contract (v02 structure, improved naming for v04)

```typescript
import type { TrackControlPoint } from '../engine/types';

// Width constants per section type (descriptive names — improvement over v02's W/C/H)
const STRAIGHT_WIDTH = 32;   // straight half-width
const CORNER_WIDTH = 26;     // corner half-width
const HAIRPIN_WIDTH = 14;    // hairpin/chicane half-width

export const TRACK_XX_CONTROL_POINTS: TrackControlPoint[] = [
  // ── Section N: Name (direction description) ──
  { position: { x: NNN, y: NNN }, width: STRAIGHT_WIDTH },
  // ...
];
```

**Pattern note:** v02 Track 02 uses inline numeric literals (no named constants), v02 Track 03 uses `W/C/H`. v04 standardizes on descriptive names for all tracks — a deliberate improvement over v02, not a strict pattern match.

Each control point defines a `position: Vec2` and `width: number` (half-width from centerline to road edge). The engine's `buildTrack()` function consumes this array plus a `checkpointCount` and generates:
- Inner/outer boundary polylines (wall positions)
- Inner/outer road edge polylines (driveable surface)
- Checkpoints at uniform arc-length intervals (auto-generated — NOT manually defined)
- Start position and heading (derived from first control point)

**Checkpoint count per track (updated from research — see Research Insights below):**
- Track 1: 30 (FROZEN)
- Track 2: 40 (longer track → more checkpoints for respawn granularity)
- Track 3: 45 (longest track → densest checkpoint spacing needed)

**Key v02 learnings for geometry design (from ISS-001):**
1. Polygon winding normalization runs automatically in the frozen engine — but new geometry must be **validated** to ensure boundaries nest correctly (`outerBoundary > innerBoundary`)
2. Tight curves need lower width values (H=12-16) to prevent inner boundary self-intersection
3. The curvature-clamping algorithm helps but has limits — hairpins need narrow widths
4. Inner shoulder (gap between `innerRoadEdge` and `innerBoundary`) must be visible on all tracks — if curvature clamping collapses it, adjust the geometry
5. **`buildTrack()` requires a complete closed loop** — you cannot validate partial point sets. Design methodology is: define ALL control points with approximate positions for the full circuit, then refine one section at a time, re-running `buildTrack()` on the full set after each refinement.

#### Track 2 (Speedway) — v04 Design Specification

**Identity:** High-speed modern circuit. Think Bahrain meets Silverstone — long straights demanding throttle discipline, medium-radius sweepers at speed, genuine braking zones where the AI must choose between maintaining speed and crashing.

**Constraints from ADR-12:**
- Circuit length: 30-40% larger than v02 Track 2
- At least one straight long enough that the AI must decide when to lift (≥800 units)
- 2-3 genuine braking zones (not just curves — speed-reduction-required zones)
- No hairpins — high-speed track
- Width: ~20% wider than v02 (~W=30-35 base, C=26-28 corners)
- No two corners share the same geometric radius

**v02 Track 2 reference:**
- 16 control points, ~890 × ~690 unit bounding box
- Widths: 22-30

**v04 Track 2 target:**
- ~25-30 control points
- ~1200 × ~900 unit bounding box (30-40% larger)
- Widths: W=32 (straights), C=26-28 (corners)
- Section plan:
  1. **Main straight** (≥800 units) — flat-out, defines the track
  2. **Hard braking zone** into medium-speed corner
  3. **Flowing sweeper** (large radius, different from any other corner)
  4. **Short straight** connecting sections
  5. **Double-apex corner** (two distinct turn-in points, unique challenge)
  6. **Back straight** (~500 units)
  7. **Braking zone** into final corner
  8. **Final sweeper** back to start/finish

**Design methodology:** Define control points section-by-section, run `buildTrack()` after each section addition, validate boundaries visually and with tests. Iterate until all constraints are met.

#### Track 3 (Gauntlet) — v04 Design Specification

**Identity:** European grand prix technical circuit. Think Suzuka meets Spa — every corner is unique, the layout demands a complete driving skillset. This is the memorization breaker: an AI that memorized v02 Track 3 should fail this track on first inference.

**Constraints from ADR-12:**
- Circuit length: 50-60% larger than v02 Track 3
- Minimum 6 distinct corners, **no two with the same geometric radius**
- One genuinely decreasing-radius corner ("the bastard" — tightens mid-corner, punishes late apex)
- One chicane (two direction changes in quick succession)
- Variable width: narrower in technical sections, wider on straights
- The memorization test: v02 AI should fail this track on first inference

**v02 Track 3 reference:**
- 47 control points, ~670 × ~630 unit bounding box
- Widths: H=12 (hairpins), C=20 (corners), W=22 (straights)

**v04 Track 3 target:**
- ~60-75 control points (more detail for varied corner shapes)
- ~1050 × ~950 unit bounding box (50-60% larger)
- Widths: H=14-16 (tight sections), C=20-22 (medium corners), W=26-28 (straights)
- Minimum 7 distinct corners with unique radii:
  1. **High-speed sweeper** — large radius (~200 units), wide entry, commitment corner
  2. **Medium braking corner** — standard 90° right, medium radius (~100 units)
  3. **Decreasing-radius corner** ("the bastard") — starts as medium radius, tightens to tight radius mid-corner. Requires 6-8 control points with progressively decreasing distance from center and narrowing width
  4. **Chicane** — two direction changes in ~200 units, narrow width (H), tests reaction time
  5. **Tight hairpin** — small radius (~60 units), heavy braking, narrow width (H=14)
  6. **Off-camber sweeper** — long radius but narrow width, punishes overconfidence
  7. **Fast esses** — alternating left-right at speed, medium width
- Section plan:
  1. Start/finish straight (~400 units)
  2. Corner 1 (high-speed sweeper)
  3. Short straight
  4. Corner 2 (medium braking)
  5. Corner 3 (the bastard — decreasing radius)
  6. Back straight (~350 units)
  7. Corner 4 (chicane)
  8. Corner 5 (tight hairpin)
  9. Connecting straight
  10. Corner 6 (off-camber sweeper)
  11. Corner 7 (fast esses)
  12. Return straight to start/finish

#### Research Insights: Decreasing-Radius Corner ("The Bastard")

The key to a decreasing-radius corner with Catmull-Rom splines is **progressively decreasing control point spacing** combined with **tapering width**:

```
Entry (2 CPs):    ~80 units apart, radius ~150 units, width C=22
Mid (2-3 CPs):    ~55 units apart, radius ~100 units, width C=20
Tight (2-3 CPs):  ~35 units apart, radius ~65 units,  width H=16
Exit (1 CP):      establishes straight-line exit, width C=20
```

The centripetal parameterization (`alpha=0.5` in `spline.ts`) naturally clusters interpolated samples in high-curvature regions — denser boundary samples exactly where curvature is tightest. This is a built-in advantage that requires no special handling.

**Width must decrease with radius.** The inner boundary offset (width + WALL_OFFSET=30) must stay below the curvature radius at all points. At the tightest section (radius ~65, width H=16): total offset = 16+30 = 46 < 65. Safe.

#### Research Insights: Chicane Design (Preventing v02's Self-Intersection)

**Why v02's chicane failed:** v02 Track 2's chicane had width=26. Total inner offset = 26 + WALL_OFFSET(30) = **56 units**. Any chicane apex with curvature radius < 56 causes self-intersection. The offset curve cusps when `kappa * d + 1 = 0`, i.e., when offset distance `d >= R` (radius of curvature).

**v04 chicane constraints (H=14-16 width):**
- Total inner offset = 16 + 30 = **46 units**
- Minimum inflection radius: **>46 units** (to prevent self-intersection)
- Maximum lateral jog: **≤25 units** at this width
- Minimum longitudinal spacing between direction changes: **≥140 units** (3× the total offset)

**Concrete chicane control point pattern:**
```
Approach:     straight, width W=26
Pre-chicane:  1 point, begin narrowing to H=16
Left jog:     2 points, lateral offset ~20 units over ~80 units longitudinal
Right jog:    2 points, lateral offset ~20 units back over ~80 units longitudinal
Post-chicane: 1 point, widen back to W=26
```
Total chicane length: ~200 units. The modest 20-unit lateral jog keeps curvature radius well above 46 units.

**Validation failure decision tree:**
- Self-intersection at chicane → reduce lateral jog OR increase longitudinal spacing
- Self-intersection at hairpin → reduce width to H=12-14
- Shoulder gap too small → increase width OR increase corner radius
- Polygon nesting wrong → check for degenerate geometry (should not happen with engine auto-normalization)

#### Registry Update

```typescript
// src/tracks/registry.ts — updated entries for v04 redesigned tracks
{
  id: 'track-02',
  name: 'Speedway',
  description: 'Fast — high-speed sweepers, genuine braking zones',
  controlPoints: TRACK_02_CONTROL_POINTS,
  checkpointCount: 40,  // increased from 30 for longer track respawn granularity
  parTimes: { gold: 0, silver: 0, bronze: 0 },  // SENTINEL — Phase 5 tunes from AI lap data
},
{
  id: 'track-03',
  name: 'Gauntlet',
  description: 'Technical — mixed-radius corners, no mercy',
  controlPoints: TRACK_03_CONTROL_POINTS,
  checkpointCount: 45,  // increased from 30 for longest track respawn granularity
  parTimes: { gold: 0, silver: 0, bronze: 0 },  // SENTINEL — Phase 5 tunes from AI lap data
},
```

**Par times are sentinels (0).** Obviously-invalid values that cannot be mistaken for real data. Phase 5 tunes from AI lap data. The `checkpointCount` field is a new addition to `TrackInfo` — defines the single source of truth for checkpoint count per track, consumed by both the game and Phase 5 AI training.

#### Research Insights: Checkpoint Count

**Critical finding: AI reward uses continuous arc-length, NOT checkpoints.** The v02 reward function (`src/ai/reward.ts` line 42-55) computes progress as `(currArc - prevArc) / totalLength`. Checkpoints are NOT used for reward shaping. They serve two purposes: (1) lap counting / race logic, (2) respawn positions after off-track.

**Why increase to 40/45:** With 30 checkpoints on tracks that are 30-60% longer, checkpoint spacing increases proportionally. Wider spacing means the AI loses more progress on respawn (it snaps back to the last crossed checkpoint). Increasing to 40/45 keeps spacing roughly consistent with v02's ~67-unit density:

| Track | Length (est.) | Checkpoints | Spacing |
|-------|-------------|-------------|---------|
| Track 1 | ~1000 units | 30 (frozen) | ~33 units |
| Track 2 | ~1700 units | 40 | ~43 units |
| Track 3 | ~2400 units | 45 | ~53 units |

The engine's `buildTrack()` already accepts any `checkpointCount` as a parameter. This is a data-layer change, not an engine modification.

## Technical Considerations

### Asset Processor: Sharp Reuse from Phase 0

Phase 0 already creates `scripts/image-processing.ts` with Sharp functions (resize, chroma-key, validation). Phase 1's asset processor reuses these functions and adds:
- `optimizePng(inputPath, outputPath)` — compress (Sharp strips metadata by default)
- `buildAtlas(inputPaths, outputPath, gridCols, gridRows, padding)` — composite sprites with padding
- `generateSpritesheetJson(frames, meta)` — write PixiJS Spritesheet descriptor

No new npm dependencies required — `sharp` is already added by Phase 0.

#### Research Insights: Sharp Best Practices

**Atlas compositing pattern:**
```typescript
const atlas = sharp({
  create: { width: 520, height: 520, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
});
// composite() accepts Buffer or file path inputs, positions via top/left
// Default blend mode 'over' handles alpha correctly (Porter-Duff source-over)
```

**Memory for 2048×2048 PNGs:** Raw RGBA = 16MB per image. Sharp/libvips processes in streaming tiles, so actual peak memory is much lower. 2048×2048 is well within Sharp's default `limitInputPixels` (268M pixels). No special configuration needed.

**Type the spritesheet descriptor in `scripts/types.ts`:**
```typescript
interface SpritesheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  trimmed: boolean;
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}
interface SpritesheetDescriptor {
  frames: Record<string, SpritesheetFrame>;
  meta: { image: string; format: string; size: { w: number; h: number }; scale: string };
}
```
This ensures the codegen script cannot produce malformed JSON. Lives in `scripts/types.ts` (build-time contract), NOT in `src/`. Do NOT import PixiJS types into scripts/.

### Asset Processor: No Circular Dependencies

The asset processor (`scripts/process-assets.ts`) generates `src/assets/manifest.ts`. The manifest is consumed by game code (renderer). The processor does NOT import from `src/` — it writes to it. The dependency is one-way:

```
scripts/process-assets.ts  →  writes  →  src/assets/manifest.ts
src/renderer/**            →  imports →  src/assets/manifest.ts
```

No circular dependency possible. The manifest file is auto-generated output, not a shared dependency.

### Asset Processor: Missing/Wrong-Dimension Raw Assets

If `assets/raw/` is missing files or files have wrong dimensions:
1. Script logs which files are missing/wrong with expected vs actual dimensions
2. Prints "Run `pnpm run generate-assets` to generate raw assets first"
3. Exits with non-zero code (clean-before-write means `public/assets/` is already empty at this point)

### Asset Processor: Git Strategy for Generated Output

**Decision: Commit `public/assets/` and `src/assets/manifest.ts` to git.** Rationale:
- Project compiles from a clean clone without running the pipeline
- CI does not need the asset processor to validate TypeScript
- Diffs on the manifest make asset changes visible in code review
- The `--check` flag in CI verifies committed outputs match the pipeline

### Track Geometry: Checkpoint Generation

Checkpoints are auto-generated by the engine at uniform arc-length intervals. **Do NOT define checkpoints manually.** The `checkpointCount` is passed to `buildTrack()` per track (30/40/45 — see registry). The engine handles everything.

Checkpoints serve **lap counting and respawn positioning**, NOT AI reward. The AI reward function uses continuous arc-length progress (`currArc - prevArc`), not discrete checkpoint crossing. Increasing checkpoint count on longer tracks improves respawn granularity without affecting the reward signal.

### Track Geometry: Curvature vs Width Tradeoff

The engine's Catmull-Rom spline interpolation creates smooth boundaries, but tight curves with wide widths cause inner boundary self-intersection. v02 Track 3 used:
- H=12 for hairpins (tightest)
- C=20 for corners
- W=22 for straights

v04's larger tracks can afford slightly wider values since the corners are generally larger:
- H=14-16 for tight sections (larger than v02's 12 because v04 corners have larger radii)
- C=20-22 for medium corners
- W=26-28 for straights (~20% wider than v02)

**Exception: Track 3's tight hairpin** — may need H=12-14 if the radius is small enough. Test with engine and adjust.

### Track Geometry: Validation Strategy

After defining each new track, run this validation sequence:

1. **`buildTrack()` succeeds** — no errors thrown
2. **Closed loop** — boundary endpoints within 1 unit of each other
3. **No self-intersection** — inner and outer boundaries don't cross themselves
4. **Polygon nesting** — `area(outerBoundary) > area(innerBoundary)` (ISS-001 prevention)
5. **Shoulder visibility** — for each boundary sample index `i`, compute `distance(innerRoadEdge[i], innerBoundary[i])`. Minimum across all `i` must be ≥ 8 units. (Visual inspection in Phase 2 is the ultimate check; this is a safety net.)
6. **Surface detection** — first control point position returns `Surface.Road`
7. **Corner diversity (Track 3)** — compute radius at each corner apex, verify no two are within 10% of each other
8. **All existing engine tests pass** — zero failures (use relative count, not hardcoded number)

#### Research Insights: Validation Simplification

**Gate 6 (checkpoint containment) removed:** Checkpoints are auto-generated by the frozen engine. If `buildTrack()` succeeds and boundaries are valid, checkpoint containment is guaranteed by the engine's own logic. Testing this re-tests the engine, not the track data.

**Test count:** Use "all existing tests pass (zero failures)" instead of hardcoding "377/377". CLAUDE.md says "366+", Phase -1 says "377". Use whatever count Phase -1 produces, verified by zero exit code from `pnpm test`.

### Track Geometry: Preview Rendering

During development, use a simple diagnostic script to render track boundaries to SVG for visual inspection.

```
scripts/preview-track.ts — reads track control points → buildTrack() → render boundaries to SVG
```

**Scope (kept minimal):** Inner boundary + outer boundary as polylines. Control points as dots. Grid lines at 100-unit intervals with bounding box dimensions annotated. Skip road edges and checkpoint gates — if boundaries look right, derived geometry will be right too. Output to `$TEMP` directory (per user preference for debug output).

This is a development aid, not a production deliverable.

## System-Wide Impact

- **Interaction graph:** The asset processor writes files to `public/assets/` and `src/assets/manifest.ts`. The track data files are read by the engine's `buildTrack()`. No callbacks, middleware, or observers involved — both workstreams produce static outputs.
- **Error propagation:** Asset processor errors stay in the script (non-zero exit code). Track geometry errors are caught by existing engine tests.
- **State lifecycle risks:** Clean-before-write policy (delete `public/assets/` at start of each run) prevents stale artifacts. If the processor crashes mid-run, the incomplete output directory is obviously incomplete.
- **API surface parity:** Track data files (`src/tracks/track02.ts`, `track03.ts`) are consumed by the engine via `registry.ts`. The `TrackControlPoint[]` contract is unchanged. The `TrackInfo` interface gains a `checkpointCount` field (additive, non-breaking).
- **New directory:** `src/assets/` is a new addition to the project structure (not in v02). Contains only the auto-generated manifest. Documented as a deliberate v04 architectural addition.
- **Integration test scenarios:**
  1. Run `pnpm run process-assets` → verify 11 files + atlas + manifest exist
  2. Run `pnpm test` → all existing tests pass (zero failures)
  3. Import manifest in test → verify all referenced files exist on disk
  4. Build project → verify no TypeScript errors from manifest types
  5. Run `buildTrack()` on new Track 2/3 → verify boundary integrity

### Research Insights: Track Background Purpose (Q1 Resolution)

**Track background PNGs are environment art, NOT the track surface.** They render BEHIND the programmatic track boundaries (grandstands, grass, scenery, atmosphere). The road surface, shoulders, and walls are still rendered programmatically from engine geometry (as in v02, via `Graphics.poly().fill().cut()` in `TrackRenderer.ts`). Phase 2 may add tiled textures on top.

**This means Phase 0 backgrounds do NOT need pixel-accurate alignment with Phase 1's redesigned geometry.** The Gemini prompts describe the track's aesthetic ("speedway, night, stadium"), not its exact shape. Backgrounds provide atmospheric context only.

**World-to-pixel mapping (for Phase 2):**

| Track | BB (w × h) | + Margins | BG World Size | Scale (px/wu) |
|-------|-----------|-----------|--------------|---------------|
| Track 1 | ~480 × 200 | 680 × 400 | 680 × 680 | 3.01 |
| Track 2 | ~1200 × 900 | 1400 × 1100 | 1400 × 1400 | 1.46 |
| Track 3 | ~1050 × 950 | 1250 × 1150 | 1250 × 1250 | 1.64 |

At camera ZOOM_MIN=2.5 (high speed), the effective screen resolution is 3.65-7.5 screen pixels per background pixel. No pixelation concerns. The 2048×2048 square image is mapped to the larger bounding box dimension + 100-unit margin per side, centered on the track centroid.

## Acceptance Criteria

### Prerequisites (from Phase -1 and Phase 0)

- [ ] Phase -1 complete: engine, AI, tracks, tests copied from v02, 377 tests passing
- [ ] Phase 0 complete: 11 raw PNGs in `assets/raw/`, Briggsy-approved
- [ ] `sharp` available in devDependencies (added by Phase 0)
- [ ] `scripts/image-processing.ts` exists (from Phase 0)
- [ ] `scripts/types.ts` exists (from Phase 0)

### Workstream A: Asset Processor

#### Script Files

- [ ] `scripts/process-assets.ts` — CLI entrypoint
  - Deletes `public/assets/` before writing (clean-before-write)
  - Validates `assets/raw/` contains all 11 expected PNGs
  - Validates raw asset dimensions match expectations (from `scripts/types.ts`)
  - Validates asset names match `/^[a-z0-9-]+$/` (code injection prevention)
  - Validates output paths don't escape target directories (path jail)
  - Creates `public/assets/` subdirectory structure
  - Optimizes PNGs (compression level 9, adaptive filtering)
  - Builds car sprite atlas (520×520, 2×2 grid with 2px padding)
  - Generates PixiJS Spritesheet JSON (with `trimmed: false`, correct `spriteSourceSize`)
  - Generates `src/assets/manifest.ts` with `@generated` header + `eslint-disable`
  - Deterministic output (sorted keys, no timestamps)
  - Validates all outputs (file existence, atlas structure)
  - Prints summary table
  - Supports `--check` flag for CI (compare without writing)
  - Non-zero exit on failure
- [ ] `scripts/image-processing.ts` — extended from Phase 0
  - Add `optimizePng(inputPath, outputPath)` function
  - Add `buildAtlas(inputs, output, cols, rows, padding)` function (2px padding default)
  - Add `generateSpritesheetJson(frames, meta)` function (typed via `SpritesheetDescriptor`)
- [ ] `scripts/types.ts` — extended from Phase 0
  - Add `SpritesheetFrame` and `SpritesheetDescriptor` interfaces (build-time type contract)

#### Generated Outputs

- [ ] `public/assets/sprites/cars-atlas.png` — 520×520, 4 car sprites composited with 2px padding
- [ ] `public/assets/sprites/cars-atlas.json` — valid PixiJS Spritesheet JSON (trimmed: false, correct spriteSourceSize)
- [ ] `public/assets/tracks/track01-bg.png` — optimized, 2048×2048
- [ ] `public/assets/tracks/track02-bg.png` — optimized, 2048×2048
- [ ] `public/assets/tracks/track03-bg.png` — optimized, 2048×2048
- [ ] `public/assets/textures/asphalt-tile.png` — optimized, 512×512
- [ ] `public/assets/textures/grass-tile.png` — optimized, 256×256
- [ ] `public/assets/textures/curb-tile.png` — optimized, 128×64
- [ ] `public/assets/ui/menu-bg.png` — optimized, 1920×1080
- [ ] `src/assets/manifest.ts` — auto-generated, typed with `as const`, `@generated` header, `eslint-disable`

#### Package.json

- [ ] Add `"process-assets": "tsx scripts/process-assets.ts"` to scripts
- [ ] Add `"process-assets:check": "tsx scripts/process-assets.ts --check"` to scripts

#### Tests — Asset Processor

- [ ] `tests/scripts/process-assets.test.ts` — asset processor tests
  - Manifest file is valid TypeScript (compiles without errors)
  - All manifest paths resolve to existing files in `public/assets/`
  - Atlas JSON has correct frame coordinates, `trimmed: false`, and meta
  - Optimized PNGs are ≤ raw PNGs in file size (or within 5% — compression may vary)
  - Atlas PNG dimensions are 520×520 (includes 2px padding)
  - All car sprite frames reference valid atlas regions (accounting for padding offsets)

### Workstream B: Track Redesign

#### Track Data Files

- [ ] `src/tracks/track02.ts` — new v04 geometry (replaces v02 verbatim copy)
  - Follows v02 file structure (JSDoc, imports, section comments) with improved naming (descriptive width constants)
  - ~25-30 control points
  - Bounding box ~1200 × ~900 units (30-40% larger than v02)
  - Width constants: STRAIGHT_WIDTH=32, CORNER_WIDTH=26-28
  - At least one straight ≥800 units
  - 2-3 genuine braking zones
  - No hairpins
  - No two corners share the same geometric radius

- [ ] `src/tracks/track03.ts` — new v04 geometry (replaces v02 verbatim copy)
  - Follows v02 file structure with improved naming
  - ~60-75 control points
  - Bounding box ~1050 × ~950 units (50-60% larger than v02)
  - Width constants: HAIRPIN_WIDTH=14-16, CORNER_WIDTH=20-22, STRAIGHT_WIDTH=26-28
  - Minimum 7 distinct corners, no two with same radius (within 10%)
  - One decreasing-radius corner (6-8 CPs: spacing 80→55→35 units, width tapering C=22→H=16)
  - One chicane (lateral jog ≤25 units, longitudinal spacing ≥140 units, width H=14-16)
  - Variable width across sections

- [ ] `src/tracks/registry.ts` — updated entries
  - Track 02: updated description, `checkpointCount: 40`
  - Track 03: updated description, `checkpointCount: 45`
  - Par times: sentinel values (0) flagged for Phase 5 tuning
  - `TrackInfo` interface: add optional `checkpointCount` field (single source of truth)
  - Track 01: UNCHANGED (frozen geometry, frozen description, checkpointCount: 30)

#### Track Validation Gates

- [ ] `buildTrack(track02Points, 40)` succeeds without errors
- [ ] `buildTrack(track03Points, 45)` succeeds without errors
- [ ] Both tracks: boundary endpoints form closed loop (gap < 1 unit)
- [ ] Both tracks: no boundary self-intersection
- [ ] Both tracks: polygon nesting correct (`outerBoundary` area > `innerBoundary` area)
- [ ] Both tracks: inner shoulder visible (min gap ≥ 8 units — iterate all boundary sample indices)
- [ ] Both tracks: surface detection works (first control point → `Surface.Road`)
- [ ] Track 3: corner radius diversity verified (no two within 10% of each other)
- [ ] `pnpm test` — all existing tests pass (zero failures)

#### Tests — Track Geometry

- [ ] New test: `tests/engine/track-geometry.test.ts` (follows v02 convention: track tests in `tests/engine/`)
  - Track 2: `buildTrack()` succeeds, produces valid closed boundaries
  - Track 3: `buildTrack()` succeeds, produces valid closed boundaries
  - Track 3: corner radius diversity (no two corners within 10%) — core ADR-12 requirement
  - Both tracks: polygon nesting (outer > inner area) — ISS-001 prevention
  - Both tracks: minimum shoulder gap ≥ 8 units — visual quality check

**Tests removed (design guidelines, not functional invariants):** Bounding box dimensions, control point counts, straight segment detection, and decreasing-radius detection. These are design targets enforced during authoring and confirmed visually with the preview tool, not regressions that could sneak in later (track data is written once and rarely changes).

#### Development Aid

- [ ] `scripts/preview-track.ts` — renders track boundaries to SVG for visual inspection
  - Reads control points from track data file
  - Calls `buildTrack()` to generate boundaries
  - Outputs SVG with inner/outer boundaries + control point dots + 100-unit grid lines + bounding box annotation
  - Usage: `tsx scripts/preview-track.ts track02` → writes to `$TEMP/track02-preview.svg`
  - Development aid only, not a production deliverable

## Success Metrics

| Metric | Target |
|--------|--------|
| Asset processor produces all outputs | 11 optimized PNGs + atlas (520×520 w/ padding) + manifest |
| Manifest compiles | Zero TypeScript errors when imported |
| Atlas is valid | PixiJS Spritesheet JSON loads without error (trimmed: false, correct coords) |
| Codegen determinism | Running processor twice produces identical output |
| Optimized file sizes | ≤ raw file sizes (or within 5%) |
| Track 2 circuit length | 30-40% larger than v02 Track 2 |
| Track 3 circuit length | 50-60% larger than v02 Track 3 |
| Track 3 corner diversity | 7+ corners, no two within 10% radius |
| All existing tests pass | Zero failures |
| New track geometry tests | All passing (5 tests in tests/engine/track-geometry.test.ts) |
| Zero engine modifications | `diff` between v02 and v04 `src/engine/` is empty |

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase 0 raw assets not ready | Low | Blocks entire workstream A | Phase 0 plan is complete, execute first |
| Sharp atlas composite produces artifacts at sprite boundaries | Low | Visible seams on car sprites | 2px padding between sprites prevents WebGL texture bleeding; test visually |
| Tight corners on Track 3 cause boundary self-intersection | Medium | `buildTrack()` fails or produces bad geometry | Use narrow widths (H=14-16) for tight sections; test incrementally |
| Track 2 "too similar" to Track 3 for AI generalization | Low | Phase 5 cross-track validation is meaningless | Design for maximum character contrast: Track 2 is about speed, Track 3 is about precision |
| Inner shoulder disappears on tight Track 3 corners | Medium | ISS-001 regression (visual bug) | Monitor shoulder gap during geometry design; adjust widths if gap < 8 units |
| Manifest naming doesn't match Phase 0's file names | Low | Script breaks | Phase 0's `scripts/types.ts` defines the naming contract; import and use it |
| PixiJS Spritesheet JSON format changes in v8 | Very low | Atlas won't load in Phase 2 | Format is stable and well-documented; verify with Context7 during implementation |
| Track par times are wrong (placeholders) | Certain | Inaccurate difficulty ratings | Par times are explicitly flagged as placeholders — Phase 5 tunes them after AI training |

## Execution Order

```
Workstream A (Asset Processor) and B (Track Redesign) can proceed in parallel.
They share no dependencies except the final test gate.

Workstream A — Asset Processor:
  Step A1 — Extend scripts:
    ├── Add optimizePng(), buildAtlas(+padding), generateSpritesheetJson() to image-processing.ts
    ├── Add SpritesheetFrame/SpritesheetDescriptor types to scripts/types.ts
    └── Add "process-assets" + "process-assets:check" scripts to package.json

  Step A2 — Build processor:
    └── Write scripts/process-assets.ts
        ├── Raw asset validation
        ├── PNG optimization pipeline
        ├── Atlas builder (520×520 from 4 × 256×256 + 2px padding)
        ├── Spritesheet JSON generator (trimmed: false, correct spriteSourceSize)
        ├── Manifest TypeScript generator (@generated header, sorted keys, eslint-disable)
        ├── Path jail + asset name validation
        └── Output validation + --check mode

  Step A3 — Run and verify:
    ├── pnpm run process-assets (all outputs generated)
    ├── Visual inspection of atlas PNG
    └── Verify manifest compiles (import in test file)

  Step A4 — Write tests:
    └── tests/scripts/process-assets.test.ts

Workstream B — Track Redesign:
  Step B1 — Build preview tool:
    └── scripts/preview-track.ts (SVG output for visual inspection)

  Step B2 — Design Track 2:
    ├── Define control points section-by-section
    ├── Run buildTrack() after each section
    ├── Validate boundaries (no self-intersection, correct nesting)
    ├── Preview SVG for visual inspection
    └── Iterate until all ADR-12 constraints met

  Step B3 — Design Track 3:
    ├── Define control points section-by-section
    ├── Focus on corner diversity (unique radii)
    ├── Implement decreasing-radius corner (6-8 points, tightening)
    ├── Implement chicane (two quick direction changes)
    ├── Validate boundaries + shoulder visibility
    ├── Preview SVG for visual inspection
    └── Iterate until all ADR-12 constraints met

  Step B4 — Update registry:
    ├── Update track descriptions
    └── Set placeholder par times

  Step B5 — Write geometry tests:
    └── tests/engine/track-geometry.test.ts (5 tests — follows v02 convention)

Final Gate:
  ├── pnpm test — all tests pass (zero failures, includes new geometry tests)
  ├── pnpm run typecheck — zero errors
  ├── pnpm run process-assets — all outputs valid
  ├── pnpm run process-assets --check — idempotent (no diff)
  ├── diff src/engine/ — zero modifications to frozen engine
  └── Visual inspection: track previews + atlas (Briggsy gate)
```

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: (1) Phase 1 keeps asset pipeline + track redesign combined, (2) Track 1 frozen / Tracks 2+3 redesigned, (3) No two corners share a radius
- **Full spec:** [docs/Top-Down-Racer-v04-CE-Spec.md](docs/Top-Down-Racer-v04-CE-Spec.md) — ADR-02 (asset pipeline), ADR-03 (car sprites), ADR-04 (track art), ADR-12 (track redesign)
- **Phase -1 plan (prerequisite):** [docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md](docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md)
- **Phase 0 plan (prerequisite):** [docs/plans/2026-03-11-feat-phase-0-asset-generation-plan.md](docs/plans/2026-03-11-feat-phase-0-asset-generation-plan.md) — Phase 0/1 boundary, file naming contract, `scripts/types.ts` shared types
- **v02 Track 2 reference:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\tracks\track02.ts` — 16 control points, Monza-inspired, widths 22-30
- **v02 Track 3 reference:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\tracks\track03.ts` — 47 control points, stacked chicanes, widths 12-24
- **v02 Track registry:** `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02\src\tracks\registry.ts` — `TrackInfo` interface pattern
- **v02 issues (ISS-001):** Polygon winding normalization bug — inner/outer boundaries inverted on CW tracks. Fixed in engine. New geometry must validate nesting.
- **v02 issues (ISS-002):** Shoulder particle spawning — fixed, verify on new tracks.
- **v02 issues (ISS-003):** Minimap scaling — fixed with dynamic scale, no work needed.
- **CE Playbook (Phase 1):** [docs/Top-Down-Racer-v04-CE-Playbook.md](docs/Top-Down-Racer-v04-CE-Playbook.md) — deepen-plan focus areas, session structure

### Flags for Later Phases

- **Phase 2:** Import `ASSETS` from `src/assets/manifest.ts` for all asset references. Load car sprites via atlas (`Assets.load('cars-atlas.json')`, access frames by name). Load track backgrounds via direct path.
- **Phase 2:** **Per-track texture loading is ESSENTIAL.** Each 2048×2048 BG = 16MB VRAM. Load only the selected track's background; destroy previous track texture on track switch. Destroy menu background when entering gameplay. Prevents 48MB VRAM spike on integrated GPUs.
- **Phase 2:** Handle **premultiplied alpha** for sprite atlas. PixiJS v8 defaults to premultiplied alpha for spritesheets. If Sharp outputs straight alpha (PNG default), there may be visible fringing on sprite edges.
- **Phase 2:** Track background sprite placement: fit to larger BB dimension + 100-unit margin per side, centered on track centroid. See world-to-pixel mapping table in System-Wide Impact section.
- **Phase 2:** Relocate `Leaderboard.ts` from `src/renderer/` to `src/utils/` when building the new renderer (flagged in Phase -1 plan).
- **Phase 2:** Consider WebP as secondary output format in asset pipeline (Sharp supports natively, 25-35% smaller than PNG). Low priority if load times are acceptable.
- **Phase 5:** Tune Track 2 and Track 3 par times in `registry.ts` using AI lap data (replace sentinel 0 values).
- **Phase 5:** v02 ISS-001 (polygon winding) applies to new track geometry — validation tests added in this phase catch regressions.
- **Phase 5:** Verify v02 ONNX model fails on v04 Track 3 (the memorization test from ADR-12).
- **Phase 5:** If headless training throughput drops vs v02, profile `distanceToTrackCenter` and `findNearestOnBoundary` first — both scale linearly with track length (1.3-1.6x growth). Still microseconds territory but worth confirming.
