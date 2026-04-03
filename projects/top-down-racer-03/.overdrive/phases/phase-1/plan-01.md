## Plan 1

**Wave:** 1
**Commit Message:** `feat(phase1): scaffold asset pipeline directories, install Sharp, create asset spec document`

### Task Description

Set up the foundational directory structure, dependencies, and documentation that all subsequent Phase 1 plans depend on. This plan produces NO game logic — just infrastructure.

**1. Create directory structure:**

```
assets/
  raw/                    ← gitignored, human drops AI-generated assets here
    sprites/              ← car PNGs from Nano Banana
    textures/             ← tileable surface textures from Nano Banana
    tracks/               ← full track background PNGs from Ludo.ai
    audio/                ← engine sound WAVs from Ludo.ai
    ui-designs/           ← Stitch screenshots for design reference
public/
  assets/                 ← already exists, tracked in git
    sprites/              ← already exists — processed car sprites go here
    textures/             ← NEW — processed tileable textures
    tracks/               ← already exists — processed track backgrounds
    audio/                ← already exists — processed audio
    atlas/                ← NEW — texture atlas output (JSON + PNG)
tools/                    ← already exists (empty) — asset processing scripts
src/
  assets/                 ← NEW — typed manifest lives here
```

Create any directories that don't already exist. Use `.gitkeep` files in empty tracked directories to ensure git tracks them. Do NOT create `.gitkeep` in `assets/raw/` subdirectories (they're gitignored).

**2. Update `.gitignore`:**

Add these lines to the project's `.gitignore`:

```
# Raw AI-generated assets (human provides, not tracked)
assets/raw/
```

**3. Install Sharp as a dev dependency:**

Run `pnpm add -D sharp @types/sharp`. Sharp is the image processing library used by the asset processor and atlas builder (Plans 4 and 5). Installing it now ensures it's available for all Wave 2 work.

**4. Create the Asset Spec Document:**

Create `docs/asset-spec.md` — a comprehensive document defining every asset the human needs to generate. This is the "shopping list" that Briggsy hands to Nano Banana and Ludo.ai.

The document must include, for EACH asset:
- **Asset name** and what it's for
- **Generation tool** (Nano Banana or Ludo.ai)
- **Format** (PNG transparent, PNG opaque, WAV)
- **Dimensions** (exact pixel dimensions)
- **Filename** in `assets/raw/` (exact filename the pipeline expects)
- **Art direction prompt** (what to tell the AI tool)
- **Notes** (seamless tiling, transparency, etc.)

Asset table (from ADR-11, expanded with filenames and prompts):

| Asset | Tool | Format | Size | Raw Filename | Prompt Guidance |
|-------|------|--------|------|-------------|-----------------|
| Player car (red) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-red.png` | "Top-down racing car, directly from above, centered on transparent background, 256×256px, clean vector-style illustration, hard shadows, red racing livery with sponsor decals, front clearly distinguishable from rear" |
| Player car (blue) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-blue.png` | Same as above, blue livery |
| Player car (yellow) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-yellow.png` | Same as above, yellow livery |
| AI car (white) | Nano Banana | PNG transparent | 256×256 | `sprites/car-ai-white.png` | Same prompt but different car silhouette/model, white with minimal livery, clearly distinct from player car shape |
| Track 01 background | Ludo.ai | PNG | 2048×2048 | `tracks/track01-bg.png` | "Top-down view of oval racing circuit, asphalt surface with painted lines, curbs, grass surroundings, grandstands, day lighting, clean professional style" |
| Track 02 background | Ludo.ai | PNG | 2048×2048 | `tracks/track02-bg.png` | "Top-down view of high-speed racing circuit, banked feel, asphalt with painted lines, night lighting, stadium atmosphere" |
| Track 03 background | Ludo.ai | PNG | 2048×2048 | `tracks/track03-bg.png` | "Top-down view of tight technical racing circuit, moody European circuit aesthetic, asphalt with curbs, varied corner types" |
| Asphalt texture (dry) | Nano Banana | PNG | 512×512 | `textures/asphalt-dry.png` | "Seamless tileable dark asphalt texture, top-down, subtle aggregate detail, racing surface quality" |
| Asphalt texture (wet) | Nano Banana | PNG | 512×512 | `textures/asphalt-wet.png` | "Seamless tileable wet asphalt texture, top-down, reflective puddles, rain-soaked surface" |
| Grass texture | Nano Banana | PNG | 256×256 | `textures/grass.png` | "Seamless tileable green grass texture, top-down, manicured racing circuit grass" |
| Curb texture | Nano Banana | PNG | 128×64 | `textures/curb.png` | "Racing circuit curb/kerb, red and white alternating stripes, top-down view, tileable horizontally" |
| Menu background | Nano Banana | PNG | 1920×1080 | `ui-designs/menu-bg.png` | "Dark dramatic racing atmosphere, moody lighting, suitable as game menu background" |
| Engine sound idle | Ludo.ai | WAV | ≤200KB | `audio/engine-idle.wav` | "Racing car engine idle loop, low RPM, seamless loop point" |
| Engine sound mid | Ludo.ai | WAV | ≤200KB | `audio/engine-mid.wav` | "Racing car engine mid-RPM loop, moderate revs, seamless loop point" |
| Engine sound high | Ludo.ai | WAV | ≤200KB | `audio/engine-high.wav` | "Racing car engine high-RPM loop, screaming revs, seamless loop point" |

**5. Create placeholder asset manifest type:**

Create `src/assets/manifest.ts` as a placeholder that establishes the pattern but will be auto-generated by the manifest tool in Plan 5. For now, it should export an empty typed constant:

```typescript
/**
 * Typed asset manifest — auto-generated by tools/generate-manifest.ts
 * DO NOT EDIT MANUALLY. Run `pnpm run manifest` to regenerate.
 *
 * All asset paths are relative to the public/ directory.
 */
export const ASSETS = {
  cars: {},
  tracks: {},
  textures: {},
  audio: {},
  atlas: {},
} as const;

/** Type helper for asset path lookup */
export type AssetManifest = typeof ASSETS;
```

**6. Add npm script stubs:**

In `package.json`, add these script entries (they'll be implemented in Plans 4 and 5):

```json
"process-assets": "tsx tools/process-assets.ts",
"build-atlas": "tsx tools/build-atlas.ts",
"manifest": "tsx tools/generate-manifest.ts"
```

### File Targets
- `assets/raw/` — create directory structure (gitignored)
- `public/assets/textures/` — create directory with `.gitkeep`
- `public/assets/atlas/` — create directory with `.gitkeep`
- `src/assets/manifest.ts` — placeholder typed manifest
- `tools/` — remains empty (Plans 4/5 populate it)
- `.gitignore` — add `assets/raw/` exclusion
- `package.json` — add Sharp dev dependency + script stubs
- `docs/asset-spec.md` — comprehensive asset generation spec

### Acceptance Criteria
- [ ] `assets/raw/` exists with subdirectories: `sprites/`, `textures/`, `tracks/`, `audio/`, `ui-designs/` — `Satisfies: R-006`
- [ ] `assets/raw/` is in `.gitignore` — `Satisfies: R-006`
- [ ] `public/assets/textures/` and `public/assets/atlas/` exist with `.gitkeep` — `Satisfies: R-006`
- [ ] `src/assets/manifest.ts` exports `ASSETS` as `const` with correct type structure — `Satisfies: R-002 (partial)`
- [ ] `sharp` and `@types/sharp` are in `devDependencies` in `package.json` — `Satisfies: R-011`
- [ ] `docs/asset-spec.md` contains complete asset table with all 15 assets, dimensions, formats, filenames, and prompt guidance — `Satisfies: R-008`
- [ ] `package.json` has script stubs: `process-assets`, `build-atlas`, `manifest`
- [ ] `pnpm install` completes without errors after changes
- [ ] TypeScript compiles without errors: `pnpm exec tsc --noEmit`

### Dependencies
- **Depends on:** None — Wave 1
- **Needed by:** Plan 4, Plan 5 (directory structure + Sharp dependency)

### Locked Decisions
- Sharp for image processing (ADR-02, spec)
- Directory structure: `assets/raw/` gitignored, `public/assets/` tracked (spec)
- Typed manifest pattern with `as const` (ADR-02)
- Claude Code defines asset specs; human runs generation tools (ADR-11)
- PixiJS-compatible TexturePacker JSON format for atlas (ADR-02)