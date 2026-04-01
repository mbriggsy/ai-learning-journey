---
title: "Phase 7: Art Pipeline"
type: feat
status: ready
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
executed:
reviewed:
---

# Phase 7: Art Pipeline

## Enhancement Summary

**Deepened on:** 2026-03-30
**Sections enhanced:** 12
**Research agents used:** 15 (6 research + 6 review + 2 skill + 1 best-practices)
**Context7 doc queries:** 2 (Phaser 3.90 atlas/tilemap loading)
**Contradictions resolved:** 7

### Key Improvements Discovered

1. **CRITICAL: Master plan regression** — Phase plan dropped 8 details from master plan (generate-at-high-res, post-processing, API key safety, Nano Banana Pro, hash idempotency, palette hex values, atlas tooling, sprite sheet strategy). Reconciled.
2. **CRITICAL: No Gemini model supports 32x32 output** — minimum 1K (1024x1024). Two-stage downscale pipeline mandatory: LANCZOS 1024→128, NEAREST 128→32.
3. **CRITICAL: JPEG default destroys pixel art** — Gemini returns JPEG by default. Must force PNG via `sharp` re-encode. Magenta chroma-key for transparency.
4. **CRITICAL: .env with live API key has zero .gitignore protection** — public repo, one `git add .` from exposure. Prerequisite blocker.
5. **HIGH: Tile extrusion mandatory** — WebGL texture sampling at sub-pixel positions causes tile bleeding. `tile-extruder` npm package, margin=1, spacing=2 in Tiled.
6. **HIGH: No asset manifest / typed texture keys** — magic strings across renderer files. `as const satisfies` pattern + Preloader drives from manifest.
7. **HIGH: Script decomposition** — racer-04 sibling has proven 5-file pipeline. Single monolithic script is anti-pattern at 100+ assets.
8. **Model decision: Nano Banana Pro over Imagen 4** — `gemini-3-pro-image-preview` advertises "pixel-perfect detail" + "locked-in identity across variations." Style reference images (up to 14 per call) are the strongest consistency mechanism.
9. **Mirror optimization** — generate East-facing sprites only, flip programmatically for West. Saves 25% of character generation calls.
10. **Flashlight as separate overlay** — not baked into seeker sprite. Enables mirroring and independent rotation.
11. **4-frame walk cycle confirmed** — community consensus for 32x32. 2-frame breathing idle at 4 FPS. Walk at 8-10 FPS.
12. **UI design elevated** — every element now has personality, animation timelines, colorblind accessibility, and Among Us / Overcooked energy.
13. **52 unique frames total** — 18 hider + 30 seeker (includes chase) + 4 flashlight prop. AI hider via palette swap (0 additional frames).
14. **TypeScript + Sharp for all processing** — no Python dependency. Follow racer-04 pattern. `@google/genai` SDK (NOT deprecated `@google/generative-ai`).
15. **Rate limits tighter than expected** — 250 RPD on Tier 1 for preview models. Budget 500-750 calls across 2-3 days.

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| .env API key exposure (no .gitignore) | Critical | Create .gitignore BEFORE any generation work. Rotate key if exposed. |
| Tile bleed at non-integer zoom (SpectatorGame) | High | Tile extrusion post-processing + addTilesetImage margin/spacing params |
| 1024→32 downscale destroys fine detail | High | Two-stage downscale (LANCZOS→NEAREST). Prompt for chunky pixel grid at 1K. |
| JPEG artifacts in pixel art | High | Force PNG re-encode through Sharp on every generated image |
| Wrong perspective (3/4 view instead of top-down) | High | Negative prompt constraints. Test batch of 5 tiles first. |
| Transparent/opaque background mismatch | Medium | Magenta chroma-key for sprites. Opaque generation for floor tiles. |
| Rate limit exhaustion mid-batch | Medium | 6-second delay between calls. Session budget cap (configurable). Dry-run mode. |
| Multi-tile aspect ratio gaps (no 2:1 in API) | Medium | Generate at closest ratio, crop with Sharp |
| Chat session loss on script crash | Medium | Save style-establishing prompt for replay. Idempotent skip of completed assets. |
| Cost overrun from retries | Medium | Circuit breaker: halt after 5 consecutive failures. Cost estimate logged before batch. |
| Outline weight too thick at 3x zoom | Low | Verify at all zoom levels in visual polish pass |

### Contradictions Resolved

1. **Hash-based idempotency vs fs.existsSync** — Architecture said "hash superior," Simplicity said "YAGNI." Resolution: **prompt-hash in generation-log.json** — 10 lines of code, handles prompt changes, not a full registry. Lighter than architecture wanted, smarter than simplicity suggested.
2. **Playwright screenshot tests: keep vs kill** — Architecture said "smart," Simplicity said "zero ROI." Resolution: **keep 4 targeted tests** (game scene, menu, FOUND splash, SURVIVED splash). Phase 3 already built TestBridge — incremental cost is low. Baselines protect against future regressions.
3. **Master plan absorb-all vs standalone-wins** — Resolution: **master plan wins where it adds detail** (API key safety, palette hex values, Nano Banana Pro). **Simplicity wins where master plan over-engineers** (hash registry simplified to prompt-hash, post-processing scoped to downscale + chroma-key + palette enforcement only). **Research overrides master plan** on "generate full sprite sheet then slice" → generate individual frames with reference image instead (AI sheets have alignment issues).
4. **Python (Pillow) vs TypeScript (Sharp)** — Resolution: **TypeScript + Sharp**. Racer-04 sibling uses Sharp. One language, one runner, one tsconfig. Sharp backed by libvips (well-audited).
5. **Background removal: magenta chroma-key vs transparent generation** — Resolution: **magenta chroma-key**. Gemini cannot reliably generate transparent backgrounds. JPEG default has no alpha channel. Magenta (#FF00FF) never appears in game art. Standard game dev workflow.
6. **Generation resolution: 256x256 vs 1024x1024** — Resolution: **1K (1024x1024) with two-stage downscale**. Master plan's "256x256" is outdated — no current Gemini Pro model supports it. Two-stage: LANCZOS 1024→128, NEAREST 128→32. Evaluate `gemini-3.1-flash-image-preview` at 512x512 during style reference phase — if 16:1 ratio produces better results, switch.
7. **Wall corners: 4 generated vs 1 rotated in Tiled** — Resolution: **1 corner + 1 T-junction, rotate in Tiled**. Tiled GID flip flags work in Phaser. At 32x32 cartoon style, rotated lighting is imperceptible. Revisit only if polish pass catches issues.

---

## Goal

Replace all placeholder art with AI-generated stylized cartoon assets. Game looks polished and professional.

## Context

With all gameplay systems complete (Phases 0-6), this phase replaces placeholder colored rectangles with custom-generated stylized cartoon art. The engine/renderer separation means art changes are purely in `src/renderer/` and `public/assets/` — zero game logic changes. (see master plan and brainstorm for art direction)

### Art Direction (from brainstorm + master plan)

- **Style:** Stylized cartoon — clean black outlines (1px at 32x32, ~32px at 1024x1024 generation size), bold colors, slightly exaggerated proportions
- **Vibe:** Among Us / Overcooked energy
- **Palette (specific hex values):**
  - Wood brown: `#8B4513`
  - Carpet red: `#C41E3A`
  - Cream wall: `#F5E6D3`
  - Sonar blue: `#0047AB`
  - Alert red: `#FF2400`
  - Outline black: `#000000`
  - Highlight white: `#FFFFFF`
  - Warm tan (UI): `#D4C4A8`
  - Gold (victory): `#FFD700`
  - Amber (warning): `#FFA500`
- **Perspective:** Strict top-down (NOT 3/4 view — negative prompt constraint)
- **Tile size:** 32x32 pixels (generated at 1024x1024, two-stage downscale)
- **Character size:** 32x32 (fits one tile)
- **Light source:** Top-left, consistent across ALL assets
- **Generated with:** Gemini `gemini-3-pro-image-preview` (Nano Banana Pro) — primary model
- **Fallback model:** `imagen-4.0-generate-001` (Imagen 4) if NBP style control insufficient

## Prerequisites / Blockers

These MUST be complete before any Phase 7 work begins:

- [x] **`.gitignore` exists** with `.env` excluded (Phase 0 task — currently missing, .env has live API key in public repo)
- [x] **`.env.example` created** with `GEMINI_API_KEY=your_key_here` (tracked in git, no actual values)
- [x] **API key variable is `GEMINI_API_KEY`**, NOT `VITE_GEMINI_API_KEY` (Vite auto-exposes `VITE_` prefix to client bundle)
- [ ] **Phases 0-6 complete** (all gameplay systems working with placeholder art)
- [ ] **Gemini API key in .env** with sufficient quota (budget ~500-750 calls across 2-3 days)

## Pipeline Architecture

### Three-Tier Directory Structure

```
assets/                              # NOT served to browser
  raw/                               # AI-generated originals (1024x1024, untouched)
    characters/
    tiles/
    ui/
    furniture/
  processed/                         # Post-processed (downscaled, chroma-keyed, palette-enforced)
    characters/
    tiles/
    ui/
    furniture/
  palette/
    master-palette.json              # Hex values — single source of truth
  generation-log.json                # Per-asset: prompt hash, status, timestamps
public/assets/                       # Game-ready — what Phaser loads
  sprites/                           # Character + furniture atlases
    characters.png + characters.json
  tilesets/                          # Tilemap images (extruded)
    interior.png
  ui/                                # UI atlas
    ui.png + ui.json
  maps/                              # Tiled JSON exports
```

### Script Decomposition (5 files, following racer-04 pattern)

| File | Responsibility |
|------|---------------|
| `scripts/types.ts` | AssetDefinition, GenerationResult, GenerationConfig, AssetCategory |
| `scripts/asset-prompts.ts` | STYLE_PREFIX, per-asset prompts, target sizes, aspect ratios |
| `scripts/generate-assets.ts` | Gemini API calls, multi-turn chat sessions, retry with error classification, save to `assets/raw/` |
| `scripts/process-assets.ts` | Sharp-based: two-stage downscale, chroma-key, palette enforcement, tile extrusion |
| `scripts/pack-atlases.ts` | free-tex-packer-core: atlas assembly, JSON atlas generation, manifest output |

### npm Scripts

```json
{
  "assets:generate": "tsx scripts/generate-assets.ts",
  "assets:process": "tsx scripts/process-assets.ts",
  "assets:pack": "tsx scripts/pack-atlases.ts",
  "assets:pipeline": "npm run assets:generate && npm run assets:process && npm run assets:pack",
  "assets:pipeline:force": "npm run assets:generate -- --force-all && npm run assets:process && npm run assets:pack"
}
```

### Technology Stack

| Tool | Purpose |
|------|---------|
| `@google/genai` | Gemini API TypeScript SDK (NOT deprecated `@google/generative-ai`) |
| `sharp` | Image processing: resize, crop, raw pixel manipulation, PNG encode |
| `free-tex-packer-core` | Atlas packing with Phaser 3 JSON Hash export |
| `tile-extruder` | Tileset extrusion (1px border duplication per tile) |
| `tsx` | TypeScript script runner (zero-config, ESM-native) |

## Type Definitions

### Research Insights — TypeScript Safety

**Best Practices:**
- All texture keys must be compile-time safe — typos silently produce missing texture errors at runtime
- Generation script needs discriminated union result types, not thrown exceptions
- Separate tsconfig for scripts (`scripts/tsconfig.json`) — needs Node.js types, drops DOM types

**Asset Key Type (single source of truth for all texture references):**

```typescript
// src/renderer/asset-keys.ts
export const TEXTURE_KEYS = {
  // Tilesets
  TILESET_INTERIOR: 'tileset-interior',
  // Character atlases
  CHARACTERS: 'characters',
  // UI atlas
  UI: 'ui',
  // ... all keys
} as const satisfies Record<string, string>;

export type TextureKey = typeof TEXTURE_KEYS[keyof typeof TEXTURE_KEYS];
```

**Generation Result Type:**

```typescript
type GenerationResult =
  | { readonly status: 'success'; readonly assetId: string; readonly path: string }
  | { readonly status: 'skipped'; readonly assetId: string; readonly reason: 'prompt-unchanged' }
  | { readonly status: 'failed'; readonly assetId: string; readonly attempts: number; readonly lastError: string };
```

**Error Classification for Retry:**

| Error Kind | Retry? | Strategy |
|-----------|--------|----------|
| Auth error (401/403) | No — fatal | Halt script, report API key issue |
| Rate limit (429) | Yes | Exponential backoff: `baseDelay * 2^attempt + jitter` |
| Server error (500/503) | Yes | Standard retry, shorter delay |
| Safety block (content filtered) | No — skip | Log prompt, move to next asset |
| Timeout | Yes | Retry once with longer timeout |

**Preloader drives from manifest (not manual list):**
The Preloader iterates `TEXTURE_KEYS` to load all assets. Adding a new asset = add to manifest + add to `TEXTURE_KEYS`. Forgetting either is a compile-time or load-time error, never a silent visual bug.

## Tasks

### Task 1: Art Style Guide Document

- [ ] Create `docs/art-style-guide.md`:
  - Color palette with all hex values (from palette section above)
  - Line weight: 1px at 32x32 (maps to ~32px outlines at 1024x1024 generation size)
  - Proportions: chibi/super-deformed — head = 10-16px at 32x32
  - Light source: top-left, consistent everywhere
  - Master palette file: `assets/palette/master-palette.json`
  - **Prompt template** (base prompt all asset prompts extend):

```
"Top-down view pixel art game sprite of [SUBJECT], 32-pixel grid style with
large chunky pixels visible as distinct squares, stylized cartoon, [PALETTE_COLORS],
bold 1-pixel dark outlines, solid magenta (#FF00FF) background, game asset,
no anti-aliasing, no gradients, no dithering, clean grid-aligned edges,
not isometric, not 3/4 view, strict top-down perspective"
```

  - Do/don't examples for AI prompt consistency
  - Aspect ratio mapping table for multi-tile assets

#### Research Insights — Prompt Engineering

**Best Practices:**
- Include negative constraints: "not isometric, not 3/4 view, no smooth gradients, no anti-aliasing"
- Specify pixel density at generation resolution: "each visible pixel should be ~32x32 real pixels at this 1024x1024 resolution"
- Name exact palette colors in every prompt (don't rely on model memory)
- For floor tiles: "seamless tileable texture, edges match when repeated"
- For characters: "facing [direction], [specific pose description], symmetrical body"

**Edge Cases:**
- Gemini sometimes adds unwanted text/watermarks — include "no text, no labels, no watermarks" in prompts
- "Pixel art" alone produces "pixel art style" (smooth, anti-aliased). Must specify "chunky pixels, visible grid, no anti-aliasing"

### Task 2: Style Reference Generation (Human Checkpoint)

- [x] **Phase A — Generate 3-5 candidate style reference tiles** using base prompt
- [x] **Phase B — Briggsy picks the canonical style reference** (saved as `assets/palette/style-reference.png`)
- [x] Pass approved style reference image to ALL subsequent generation calls for consistency
- [ ] Optionally evaluate `gemini-3.1-flash-image-preview` at 512x512 (0.5K) — if 16:1 downscale produces cleaner results than 32:1, switch model

#### Research Insights — Style Consistency

**Best Practices:**
- Reference image in every call is the #1 consistency technique (Gemini supports up to 14 per call)
- Multi-turn chat sessions per asset CATEGORY (all floors in one chat, all walls in another)
- Post-processing palette enforcement as safety net (even good prompts drift across 50+ calls)
- Generate a "contact sheet" after each batch — all sprites in a labeled grid for visual inspection

### Task 3: Asset Generation Script

- [ ] `scripts/generate-assets.ts` — Gemini API integration:
  - Load API key: `set -a && source .env && set +a` before running
  - SDK: `@google/genai` (`GoogleGenAI` class)
  - Model: `gemini-3-pro-image-preview` (Nano Banana Pro)
  - Config: `responseModalities: ['IMAGE']`, `imageConfig: { aspectRatio: '1:1', imageSize: '1K' }`
  - Multi-turn chat sessions per asset category
  - Pass style reference image with every call
  - **Rate limiting:** 6-second minimum delay between API calls
  - **Idempotent:** prompt-hash check in `generation-log.json` — skip if prompt unchanged AND file exists
  - **Retry:** up to 3 attempts with error classification (auth=fatal, rate-limit=backoff, safety=skip)
  - **Circuit breaker:** halt after 5 consecutive failures
  - **Dry-run mode:** `--dry-run` flag prints what would be generated without calling API
  - **Session budget cap:** configurable max API calls per invocation (default 50)
  - Save to `assets/raw/` with kebab-case naming: `{category}-{entity}-{variant}.png`
  - **Always save as PNG** via Sharp re-encode (Gemini returns JPEG by default)
  - Log results to `generation-log.json` with prompt hashes, timestamps, dimensions

- [ ] `scripts/asset-prompts.ts` — Prompt definitions:
  - `STYLE_PREFIX` constant (shared across all prompts)
  - Per-asset prompt definitions with target dimensions and aspect ratios
  - Aspect ratio mapping: 1:1 for single tiles, 3:2 for rugs, closest match + crop for 2:1/1:2

- [ ] `scripts/types.ts` — Shared type definitions:
  - `AssetDefinition`, `AssetCategory`, `GenerationConfig`
  - `GenerationResult` discriminated union
  - `GenerationLog` structure

#### Research Insights — API Specifics

**Performance Considerations:**
- Free tier: ~10 RPM, ~250 RPD. Tier 1: 20 RPM, 250 RPD. Budget 3-5 calls per final asset.
- Cost estimate (Tier 1): ~$9.38 for 70 assets at Nano Banana Pro 1K pricing ($0.134/image)
- Imagen 4 alternative: ~$1.40-4.20 for 70 assets ($0.02-0.06/image) — worse style consistency
- Batch API (50% discount) available for non-real-time generation if moving to paid tier

**Landmines:**
- `@google/generative-ai` is DEPRECATED — use `@google/genai` only
- `responseModalities: ['IMAGE']` (without 'TEXT') avoids MIME type mismatch bug
- No `seed` parameter on Nano Banana Pro — Imagen 4 has `seed` for reproducibility
- `gemini-2.5-flash-image` deprecated Oct 2, 2026 — do not use

### Task 4: Post-Processing Script

- [ ] `scripts/process-assets.ts` — Sharp-based pipeline:
  1. **Two-stage downscale** (1024→32):
     - Stage 1: LANCZOS from 1024 to 128 (intelligent detail merge)
     - Stage 2: NEAREST from 128 to 32 (preserve pixel edges)
     - Multi-tile assets: downscale to proportional size (e.g., couch 2x1 → 64x32)
  2. **Chroma-key background removal** (sprites/furniture only, NOT floor tiles):
     - Read raw pixel buffer, find magenta (#FF00FF) within tolerance (±30 per channel)
     - Set alpha to 0 for matching pixels
  3. **Binary alpha cleanup:**
     - Snap all semi-transparent pixels to fully opaque (≥128) or fully transparent (<128)
  4. **Palette enforcement:**
     - Quantize all opaque pixels to master palette colors
     - No dithering (destroys pixel art aesthetic)
  5. **Tile extrusion** (tilesets only):
     - Run `tile-extruder` on tileset images: 1px border duplication per tile
     - Output: each 32x32 tile gets 1px extrusion → 34x34 spacing in atlas
     - Update Tiled tileset: margin=1, spacing=2
  6. Save processed assets to `assets/processed/`
  7. Run quality gates (see Task 5)

- [ ] `scripts/image-processing.ts` — Sharp utility functions:
  - `downscalePixelArt(input, targetW, targetH)` — two-stage downscale
  - `chromaKey(input, color, tolerance)` — magenta removal
  - `cleanAlpha(input, threshold)` — binary alpha
  - `enforcePalette(input, paletteColors)` — color quantization
  - `extrudeTileset(input, tileW, tileH)` — tile extrusion wrapper

#### Research Insights — Image Processing

**Best Practices:**
- `sharp.kernel.nearest` for final downscale — non-negotiable for pixel art
- Palette enforcement MUST be the LAST step before save (after all other transforms)
- Tile extrusion prevents the #1 visual defect in Phaser tilemap games
- Power-of-two atlas dimensions (256, 512, 1024) — some mobile GPUs silently pad NPOT textures

**Edge Cases:**
- Multi-tile assets with no exact API aspect ratio (2:1 couch, 1:2 bookshelf) — generate at closest ratio, crop with Sharp
- Floor tiles must be OPAQUE (no chroma-key) — validate no alpha channel after processing
- Character sprites must HAVE alpha — validate transparency exists

### Task 5: Quality Gates

- [ ] `scripts/validate-assets.ts` — automated checks on processed assets:

| Check | Expected | Severity |
|-------|----------|----------|
| Dimensions | 32x32 (or exact multi-tile size) | CRITICAL |
| Color mode | RGBA | CRITICAL |
| Has transparency | True for sprites/furniture, False for floor tiles | CRITICAL |
| Off-palette colors | 0 (all colors in master palette) | CRITICAL |
| PNG validity | Opens without error | CRITICAL |
| Minimum opaque area | >10% of pixels opaque (not blank) | CRITICAL |
| Semi-transparent pixels | 0 (binary alpha only) | WARNING |
| File size | <10KB per 32x32 sprite | WARNING |
| Color count | ≤ palette size | WARNING |

- [ ] Pipeline halts on any CRITICAL failure
- [ ] **Build verification:** `grep -r "GEMINI" dist/` must return 0 matches (API key leak check)

### Task 6: Tileset Generation

All tiles 32x32 (generated at 1024x1024, downscaled):

- [ ] Floor tiles:
  - Wood planks (2-3 variants for visual variety)
  - Carpet (2 colors: red, neutral)
  - Kitchen tile
  - Bathroom tile
  - **Seamless tiling:** include "seamless tileable texture, edges match when repeated" in prompts. Verify by rendering 3x3 grid.
- [ ] Wall tiles:
  - Interior wall horizontal
  - Interior wall vertical
  - Wall corner (1 tile — rotate in Tiled for 4 orientations)
  - Wall T-junction (1 tile — rotate in Tiled for 4 orientations)
  - Exterior wall (if visible from game camera)
- [ ] Door tiles:
  - Closed state (matches wall style with door frame)
  - Open state (doorway/gap)
  - **Note:** Phase 4 references door frames as `"door_open"` / `"door_closed"` from the tileset. Keep as tileset tiles (not atlas sprites) for consistency with Phase 4's `createDoorSprite()`.
- [ ] Furniture (generate as single images, then slice for multi-tile):
  - Couch (2x1 tiles) — generate at ~2:1 aspect, crop, slice to 2 tiles
  - Table (2x2 tiles) — generate at 1:1, downscale to 64x64, slice to 4 tiles
  - Bookshelf (1x2 tiles) — generate at ~1:2 aspect, crop, slice to 2 tiles
  - Chair (1x1 tile)
  - Bed (2x2 tiles) — same as table approach
  - Desk (2x1 tiles) — same as couch approach
  - **Tile custom properties in Tiled:** `hideable: true` on furniture that players can hide behind
  - **Collision:** `collides: true` custom property on wall/obstacle tiles. `setCollisionByProperty({ collides: true })` in Phaser.
- [ ] Decorative:
  - Rug (2x2 or 3x2) — generate at 1:1 or 3:2 aspect
  - Lamp (1x1)
  - Plant (1x1)
  - Picture frame (1x1, on wall)

#### Research Insights — Tiled Integration

**Best Practices:**
- Use **external tilesets (.tsx files)** — all per-tile metadata shared across maps
- **Tileset swap process:** overwrite image file in-place, keep exact same dimensions/tile size/grid layout. Tile IDs stay stable.
- **Export as JSON** with CSV tile layer format. Enable "export on save" in Tiled preferences.
- **Never use zlib/gzip/zstd compression** in Tiled export — Phaser cannot decompress them.
- In Phaser: `addTilesetImage('TilesetNameInTiled', 'phaser-cache-key', 32, 32, 1, 2)` — the first arg must EXACTLY match the tileset name in Tiled.
- Phaser IGNORES the tileset image path in the Tiled JSON — it uses the Phaser cache key.

**Edge Cases:**
- Changing tileset image width (different column count) shifts ALL tile IDs — never change grid layout after map design begins
- Tiled's "Collection of Images" tileset type is NOT supported by Phaser — each tileset must be a single spritesheet image

### Task 7: Character Sprites

- [ ] **Hider** (blue/green tones — blend with environment):
  - 3 unique directions: South (default/front), North (back), East (side)
  - West = programmatic horizontal flip of East (mirror optimization)
  - Idle: 2 frames per direction (1px breathing bob, 4 FPS)
  - Walk: 4 frames per direction (contact-down-passing-up cycle, 8 FPS)
  - Color family: cool blue/teal/green
  - Silhouette: rounded, compact, slightly hunched (hiding posture)
  - **Total unique frames: 18** (3 dirs × (2 idle + 4 walk))

- [ ] **Seeker** (red/orange tones — threatening):
  - 3 unique directions: South, North, East (West = flip)
  - Idle: 2 frames per direction (4 FPS)
  - Walk: 4 frames per direction (8 FPS)
  - Chase: 4 frames per direction (same structure as walk, 12 FPS playback for urgency)
  - Color family: warm red/orange
  - Silhouette: angular, broad, upright (confident posture)
  - **Flashlight:** separate 4-frame overlay sprite (rotates with facing direction). NOT baked into character sprite.
  - **Total unique frames: 30** (3 dirs × (2 idle + 4 walk + 4 chase))
  - **Flashlight overlay: 4 frames** (N/S/E/W orientations)

- [ ] **AI hider variant:**
  - 0 additional frames — **palette swap** of player hider
  - Shifted color family: purple/magenta (distinct from player's blue/green)
  - Implementation: either pre-rendered palette-swapped PNGs (simpler) or runtime shader (more flexible)
  - For 2 variants only, pre-rendered is recommended (40 frames × 2 variants = 80 total, still small)

- [ ] **Grounding shadow:** 1-2px dark ellipse under each character's feet (prevents "floating" look)

**Total character generation budget: ~52 unique frames** (18 hider + 30 seeker + 4 flashlight) + palette-swapped duplicates

#### Research Insights — Character Animation

**Best Practices:**
- Frame naming convention: `char-{character}-{action}-{direction}-{frame:02d}.png` (e.g., `char-hider-walk-s-01.png`)
- Generate each frame individually with reference image (NOT as a sprite sheet — AI sheets have alignment issues)
- For walk frame prompts, describe specific pose: "left foot forward touching ground" / "weight shifting onto left foot" / "legs crossing at neutral height" / "right foot forward, pushing off"
- South (down) is the default/hero direction — generate first, use as reference for other directions
- At 32x32, use chibi proportions: head = 10-16px tall, body fills remaining space
- 1px outlines everywhere, 2-3 shading levels per color (base, shadow, highlight)

**Phaser Animation Registration:**
```typescript
this.anims.create({
  key: 'hider-walk-s',
  frames: this.anims.generateFrameNames('characters', {
    prefix: 'char-hider-walk-s-',
    start: 1, end: 4, zeroPad: 2, suffix: '.png'
  }),
  frameRate: 8,
  repeat: -1
});
```

### Task 8: UI Elements

- [ ] **Minimap frame/border:**
  - Asymmetric rounded rectangle (top-left + bottom-right rounded, top-right + bottom-left sharp — "security clipboard" feel)
  - 3px outer stroke black `#000000`, 1px inner stroke cream `#F5E6D3` (Among Us "double outline" signature)
  - Fill: subtle paper grain texture at ~8% opacity over warm tan `#D4C4A8`
  - Tiny push-pin detail in top-left corner (4x4px)
  - 2px drop shadow (bottom-right), `rgba(0,0,0,0.3)`
  - Position: bottom-right, 8px margin from screen edge
  - Size: ~160x160px at 1080p

- [ ] **Timer display background:**
  - Pill/capsule shape (~180x48px at 1080p)
  - Two-tone: left 30% dark wood `#5C3A21` (clock icon area), right 70% cream `#F5E6D3` (digits)
  - 2px black outline, 2px drop shadow
  - BitmapText in rounded sans-serif (Fredoka One or Nunito Black)
  - **Urgency states (time-based, independent of Phase 6a's distance-based heartbeat):**
    - \>50% time: cream background, black text (calm)
    - 25-50%: background shifts to amber `#FFA500` (subtle warning)
    - <25%: background pulses red `#C41E3A` ↔ dark red `#8B1A1A` on 1s cycle. Scale bounce 1.0→1.05→1.0.
    - <10s: scale pop each tick (1.0→1.15→1.0, 200ms ease-out)
  - **Note:** Timer urgency is time-based. Phase 6a heartbeat is distance-based. They create overlapping tension naturally without explicit synchronization.
  - Position: top-right, 8px from edge

- [ ] **"FOUND!" splash graphic:**
  - Heavy condensed font (Luckiest Guy / Bungee Shade style), 120px at 1080p
  - Fill: alert red `#FF2400`, 4px black outline, 3px dark red `#8B0000` comic-book shadow offset
  - Background: 12-ray red starburst (`#FF2400` / `#8B0000` alternating), rotating 15 deg/s CW
  - Red vignette overlay: `rgba(139,0,0,0.4)` on game camera edges
  - **Animation:** slam-bounce-hold-shrink
    1. 200% scale, 0 opacity → 110% + full opacity (150ms, cubic ease-out) — the slam
    2. 110% → 100% (200ms, elastic ease) — the bounce
    3. Hold 1000ms
    4. 100% → 90% + fade out (300ms, ease-in) — deflation
  - **Reduced motion:** skip starburst rotation and slam. 200ms fade-in at 100% scale.

- [ ] **"SURVIVED!" splash graphic:**
  - Same font as FOUND, matching visual weight
  - Fill: gradient gold `#FFD700` → amber `#FFA500`, 3px black outline, dark gold `#8B6914` shadow
  - Background: gold/cream starburst, rotating CCW (opposite of FOUND)
  - 8-12 diamond sparkle particles (4-8px), gold/white, twinkling opacity 0.3-1.0 on 400ms staggered cycles
  - Gold vignette: `rgba(255,215,0,0.15)`
  - **Animation:** rise-hold-ascend
    1. 50% scale, 0 opacity, 40px below final position → 105% + full opacity + final position (300ms, cubic ease-out) — rising triumph
    2. 105% → 100% (200ms, gentle ease) — settle
    3. Sparkles appear (staggered 50ms each)
    4. Hold 1000ms
    5. 100% → 110% + fade out (300ms, ease-in) — ascension
  - **Reduced motion:** skip rise animation and sparkles. 200ms fade-in at 100% scale.

- [ ] **Menu background:**
  - Single-room top-down view: seeker in center (idle animation), hider behind couch (peeking out)
  - "Board game box art" treatment: 80% saturation, vignette, subtle diagonal stripe texture at 3%
  - Title "HIDE & SEEK" in heavy condensed font, white fill + 3px black outline + cream shadow
  - Buttons in lower third, floating over scene
  - Subtle parallax on mouse/gamepad: background shifts 2-4px opposite to input (Celeste title screen trick)

- [ ] **Button sprites:**
  - Rounded rectangle (8px radius, ~240x56px)
  - **Normal:** cream `#F5E6D3` fill, 3px black outline, 4px bottom "depth" strip `#C4A882`, 2px drop shadow
  - **Hover:** lighter `#FFF5E6`, scale 1.03x, 100ms ease-out
  - **Pressed:** darker `#D4B896`, depth strip shrinks 4px→1px, position shifts DOWN 3px, scale 0.98x, 50ms snap
  - **Focus (controller):** identical to hover + pulsing gold `#FFD700` outline at 2px (0.5-1.0 opacity, 600ms cycle)

- [ ] **Sonar ping ring:**
  - Expanding circle via `Graphics.strokeCircle()` (NOT a sprite — needs smooth scaling)
  - Color: sonar blue `#0047AB`, one-sided gradient (leading edge visible, trailing edge transparent)
  - Stroke: 3px at emission, thinning to 1px at max radius (lerp)
  - Timeline: expand to minimap boundary over 800ms (ease-out-cubic), opacity fades 1.0→0.0 back-loaded
  - Seeker blip appears when ring crosses seeker's minimap position ("just swept over them" effect)
  - Fake glow: second ring 1px outside at 30% opacity

- [ ] **Seeker blip dot:**
  - Core: 6px circle, alert red `#FF2400`
  - Glow: 12px circle behind core, `rgba(255,36,0,0.35)`
  - Pop-in: 0 size/opacity → 120% (150ms elastic) → 100% (100ms settle)
  - Pulse: core oscillates 6-7px, glow opacity 0.25-0.45 on 500ms cycle
  - Fade-out: opacity 1→0 over 1000ms, no shrink
  - **Colorblind:** diamond/triangle shape INSIDE blip (communicates "threat" independently of color)
  - **High contrast mode option:** yellow `#FFD700` + black outline, sonar ring → white `#FFFFFF`

- [ ] **Results screen UI** (follows FOUND/SURVIVED splash after exit animation):
  - Background: warm tan panel `#D4C4A8` with paper grain texture, 3px black outline, 2px drop shadow
  - Score count-up: body font, right-aligned numbers (BitmapText)
  - Itemized breakdown: body font labels left-aligned, values right-aligned
  - "NEW BEST!" indicator: gold `#FFD700` flash animation, display font
  - Two buttons: "Play Again" (primary), "Back to Menu" (secondary) — same button styles as menu

- [ ] **BitmapFont atlas generation** (required for BitmapText — Phaser can't use TTF/OTF directly):
  - Generate bitmap font atlas for **display font** (Luckiest Guy or Bungee Shade — splash text, title, button labels)
  - Generate bitmap font atlas for **body font** (Fredoka One or Nunito Black — timer digits, score text, labels)
  - Tools: snowb.org (free web), Hiero (offline), or BMFont
  - Include in Boot scene preload and `TEXTURE_KEYS` manifest
  - **Note:** SURVIVED splash "gradient gold→amber" text is NOT possible with BitmapText. Use flat gold `#FFD700` fill instead, or pre-render the splash text as a sprite in the UI atlas.

#### Research Insights — UI Design

**Cross-Cutting Rules (apply to ALL UI elements):**
1. **Two fonts only:** one heavy display (splash text, title, button labels), one rounded body (timer digits, phase text)
2. **Thick outline on everything:** 2-3px black outline is the visual glue (Among Us signature)
3. **Drop shadow consistency:** every floating UI element gets 2px down-right `rgba(0,0,0,0.25)`
4. **Warm neutrals, never gray:** use `#C4A882`, `#D4C4A8`, `#8B7355` instead of `#808080`
5. **Texture everything:** even at 5-8% opacity, texture transforms flat colors into materials
6. **Motion budget in HUNT phase:** only sonar ring, blip pulse, and timer urgency animate. Everything else static.

**HUD Layout (during HUNT phase):**
```
+--------------------------------------------------+
|                              [TIMER: 01:47]  (TR)|
|                                                  |
|                    GAME VIEW                     |
|                  (fog of war)                    |
|                                                  |
|                                 +----------+ (BR)|
|                                 | MINIMAP  |     |
|                                 +----------+     |
+--------------------------------------------------+
All critical info on right side. Left 75% clear for gameplay.
```

**Colorblind Accessibility:**
- Shape encoding: diamond for seeker blip (circle for neutral)
- Animation encoding: blip pulses, nothing else does
- Optional high-contrast markers toggle in GameSettings

### Task 9: Texture Atlas Creation

- [ ] **Characters atlas** (Phaser JSON Hash format):
  - Pack all character frames + flashlight overlay into one 512x256 or 512x512 atlas
  - Use `free-tex-packer-core` with options: `padding: 1`, `allowRotation: false`, `allowTrim: false`, `exporter: 'JsonHash'`
  - Frame naming in atlas must match animation `generateFrameNames()` patterns
  - Power-of-two dimensions mandatory

- [ ] **UI atlas** (Phaser JSON Hash format):
  - Pack all static UI sprites (minimap frame, timer bg, splash graphics, buttons)
  - Sonar ring and blip are rendered via Graphics/code — NOT in atlas
  - 256x256 should be sufficient

- [ ] **Tileset** stays as standard tilemap image (NOT atlased):
  - Grid-based layout matching Tiled's tile numbering (left-to-right, top-to-bottom)
  - **Extruded version** for Phaser runtime (margin=1, spacing=2)
  - **Non-extruded version** for Tiled editing (keep both)

- [ ] Generate `src/renderer/asset-keys.ts` — typed texture key constants derived from atlas

#### Research Insights — Atlas Packing

**Best Practices:**
- JSON Hash format preferred (frame names as keys, more readable)
- Phaser auto-detects JSON Hash vs Array — both work with `this.load.atlas()`
- For uniform 32x32 frames without trimming: free-tex-packer-core or even a simple grid arrangement script
- Aseprite native JSON export is an option if art is authored/finalized in Aseprite

**Performance Notes (from performance review):**
- Total VRAM for all game art: ~1.3 MB. Not a concern.
- Total download: ~55-145 KB. Load everything upfront in Preloader.
- Draw calls: ~6-10 per frame. 1-2% of browser budget.
- 3 separate atlases (characters, UI, tileset) is optimal — do NOT combine.

### Task 10: Update Tiled Map

- [ ] Replace placeholder tileset image with generated tileset (same dimensions, same grid layout)
- [ ] Verify tile IDs match (overwrite in-place, same column count = stable IDs)
- [ ] Verify custom properties survived (`collides: true`, `hideable: true`)
- [ ] Re-export JSON with CSV tile layer format
- [ ] Verify collision works in-game after swap

### Task 11: Integration

- [ ] Update Boot scene (Phase 3 merged Boot+Preloader into `Boot.ts`) to load from `TEXTURE_KEYS` manifest (not manual list):
  ```typescript
  // Tileset
  this.load.image(TEXTURE_KEYS.TILESET_INTERIOR, 'assets/tilesets/interior.png');
  // Atlases
  this.load.atlas(TEXTURE_KEYS.CHARACTERS, 'assets/sprites/characters.png', 'assets/sprites/characters.json');
  this.load.atlas(TEXTURE_KEYS.UI, 'assets/ui/ui.png', 'assets/ui/ui.json');
  ```
- [ ] Update `addTilesetImage` call with extrusion params: `map.addTilesetImage('Interior', TEXTURE_KEYS.TILESET_INTERIOR, 32, 32, 1, 2)`
- [ ] Register all character animations (idle/walk/chase per direction) using `generateFrameNames()`
- [ ] Update all sprite creation code to use `TEXTURE_KEYS` constants
- [ ] Implement East→West mirror flip in character renderer
- [ ] **FSM state → animation mapping** (explicit, for Phase 5a compatibility):
  - PATROL → `walk` animation (8 FPS)
  - SUSPICIOUS → `walk` (8 FPS) while moving, `idle` (4 FPS) during LOOK_AROUND facing rotation
  - SEARCH → `walk` animation (8 FPS)
  - CHASE → `chase` animation (12 FPS)
- [ ] **Phase 3 EndOfRoundSequence replacement:** Phase 7's FOUND/SURVIVED splash animations (starburst, particles, elastic tweens) exceed Phase 3's SequenceStep union. Phase 7 replaces the Phase 3 sequences with direct Phaser tween/Graphics code, retiring the data-driven approach for splash scenes.
- [ ] Verify animations play correctly at all frame rates
- [ ] Test at 1x, 2x, and 3x zoom — verify no tile bleed, no blurry pixels
- [ ] **Phaser config verified:** `pixelArt: true`, `roundPixels: true`, `antialias: false` (all top-level, NOT nested under `render`)

### Task 12: Visual Polish Pass

Binary pass/fail checklist (not open-ended — prevents scope creep):

- [ ] Can you distinguish hider from seeker at default zoom? (silhouette + color test)
- [ ] Can you distinguish player hider from AI hider? (palette swap visible?)
- [ ] Does furniture read as a hiding spot? (couch, bookshelf, desk recognizable?)
- [ ] Are doors obviously interactable? (visual affordance — closed vs open distinct?)
- [ ] Are there visible tile seams during camera pan at 1x? 2x? 3x?
- [ ] Do outlines remain legible at 1x and not dominate at 3x? (2px outline = 6px at 3x)
- [ ] Does palette feel consistent across all assets? (no obvious color outliers?)
- [ ] Are floor tile variants visually distinct but cohesive?
- [ ] Do splash screens (FOUND/SURVIVED) feel dramatic and distinct from each other?
- [ ] Is the minimap readable at game zoom? (seeker blip visible against map tiles?)
- [ ] **Colorblind verification:** seeker blip distinguishable from carpet tiles for deuteranopia?

### Task 13: Playwright Screenshot Baseline Tests

4 targeted tests using Phase 3's existing TestBridge infrastructure:

- [ ] Full game scene with new art (verifies: tile rendering, character sprites, no tile seams, fog overlay)
- [ ] Menu screen (verifies: background, title text, button sprites, layout)
- [ ] FOUND splash screen (verifies: text rendering, starburst, vignette)
- [ ] SURVIVED splash screen (verifies: text rendering, sparkles, gold treatment)

Configuration: Phase 3's visual test project, `maxDiffPixelRatio: 0.01`, `threshold: 0.2`, Docker + SwiftShader for determinism, Playwright Clock API to freeze game at exact frame.

First passing screenshots become the baseline.

## Success Criteria

- All placeholder colored rectangles replaced with stylized cartoon art
- Consistent visual style across all assets (same palette, line weight, perspective)
- Characters are distinguishable (hider vs seeker vs AI hider) — passes silhouette test
- Furniture reads clearly as hiding spots
- Doors are obviously interactable (visual affordance)
- Game looks polished and professional at default zoom
- Assets readable at 2x and 3x scale
- No visual artifacts (tile seams, sprite bleed, wrong z-order)
- No API keys in build output (`grep -r "GEMINI" dist/` returns 0 matches)
- All quality gates pass (dimensions, palette, transparency, PNG validity)
- Playwright screenshot baselines established (4 tests)
- Generation script is idempotent (re-run produces same results)
- All texture keys are compile-time safe (no string literals in renderer code)

## Dependencies

- Phases 0-6 complete (all gameplay systems working with placeholder art)
- `.gitignore` with `.env` excluded (PREREQUISITE BLOCKER)
- Gemini API key in `.env` with sufficient quota (~500-750 calls budget)
- Style guide finalized and style reference approved by Briggsy before batch generation

### Package Dependencies (add to devDependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/genai` | latest | Gemini API TypeScript SDK |
| `sharp` | latest | Image processing (resize, crop, pixel manipulation) |
| `@types/sharp` | latest | TypeScript types for Sharp |
| `free-tex-packer-core` | latest | Atlas packing with Phaser JSON Hash export |
| `tile-extruder` | latest | Tileset extrusion (1px border duplication) |
| `tsx` | latest | TypeScript script runner |

## Risks

| Risk | Mitigation |
|------|------------|
| .env API key exposure (no .gitignore) | Create .gitignore BEFORE Phase 7 begins. Verify with `git check-ignore .env`. |
| Imagen style inconsistency across generations | Style reference image in every call. Multi-turn chat per category. Palette enforcement post-processing. |
| Generated tiles don't tile seamlessly | "Seamless tiling" in prompts. 3x3 grid verification. Manual touch-up if needed. |
| Character sprites lack animation clarity | Generate each frame individually with explicit pose description and reference image. |
| Tileset swap breaks Tiled map | Overwrite in-place with identical dimensions. Verify tile IDs. Back up map before swap. |
| API rate limits / budget exhaustion | 6-second delays. Session budget cap. Dry-run mode. Circuit breaker on 5 consecutive failures. |
| Tile bleed at non-integer zoom | Tile extrusion (1px) with margin=1, spacing=2. Verify at 1x, 2x, 3x. |
| 1024→32 downscale destroys detail | Two-stage (LANCZOS→NEAREST). Prompt for chunky pixel grid. Evaluate 512x512 flash model. |
| JPEG artifacts in pixel art | Force PNG via Sharp re-encode. Validate MIME type. |
| Wrong perspective (3/4 instead of top-down) | Negative prompt: "not isometric, not 3/4 view". Test batch of 5 first. |
| Multi-tile aspect ratio mismatch | Generate at closest API ratio, crop/resize with Sharp. |
| Cost overrun from retries | Circuit breaker. Cost estimate logged. Max 3 retries. Budget cap per session. |

## Landmines

- **`@google/generative-ai` is DEPRECATED** — use `@google/genai` only
- **`responseModalities: ['IMAGE']`** (without 'TEXT') avoids MIME type mismatch bug
- **`pixelArt` and `roundPixels` are TOP-LEVEL** Phaser config props, NOT nested under `render`
- **`addTilesetImage` first argument** must EXACTLY match tileset name in Tiled editor (case-sensitive)
- **Tiled JSON export:** use CSV tile layer format, NOT zlib/gzip/zstd (Phaser can't decompress)
- **Tile IDs shift if tileset column count changes** — lock grid layout before map design
- **Keep two tileset versions:** non-extruded for Tiled editing, extruded for Phaser runtime
- **`VITE_` prefix auto-exposes env vars to client** — API key must be `GEMINI_API_KEY`, never `VITE_GEMINI_API_KEY`
- **Nano Banana Pro has no `seed` parameter** — Imagen 4 does (for reproducibility)
- **gemini-2.5-flash-image deprecated Oct 2, 2026** — do not use
- **Free Texture Packer: `allowRotation: false`** — rotation destroys pixel art alignment
- **Phaser DOES NOT support Tiled's "Collection of Images" tileset** — each tileset must be a single spritesheet image

## Sources

- [Gemini Image Generation API Documentation](https://ai.google.dev/gemini-api/docs/imagen)
- [Google GenAI TypeScript SDK](https://github.com/googleapis/js-genai) (`@google/genai`)
- [Phaser 3.90 Documentation — Texture Atlas](https://docs.phaser.io/phaser/concepts/loader) (Context7)
- [Phaser 3.90 Documentation — Tilemap Loading](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) (Context7)
- [tile-extruder npm package](https://github.com/sporadic-labs/tile-extruder)
- [free-tex-packer-core](https://github.com/nickolasg/free-tex-packer-core)
- [Sharp image processing library](https://sharp.pixelplumbing.com/)
- Brainstorm: docs/ideation/2026-03-29-hide-and-seek-brainstorm.md
- Master plan: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md (Phase 7 section, lines 681-740)
- Sibling project pattern: top-down-racer-04/scripts/ (5-file pipeline decomposition)
