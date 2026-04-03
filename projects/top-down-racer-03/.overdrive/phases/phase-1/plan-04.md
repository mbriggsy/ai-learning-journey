## Plan 4

**Wave:** 2
**Commit Message:** `feat(phase1): implement Sharp-based asset processor for image and audio optimization`

### Task Description

Build the asset processor script at `tools/process-assets.ts` that reads raw assets from `assets/raw/`, processes them (resize, optimize, format-convert), and writes optimized game-ready outputs to `public/assets/`. This is a Node.js CLI script run via `pnpm run process-assets`.

**Prerequisites from Plan 1 (already completed):**
- `sharp` and `@types/sharp` are installed as dev dependencies
- Directory structure exists: `assets/raw/{sprites,textures,tracks,audio,ui-designs}` → `public/assets/{sprites,textures,tracks,audio}`
- `package.json` has script: `"process-assets": "tsx tools/process-assets.ts"`

**Asset processing rules:**

The processor must handle four categories of assets. For each input file in `assets/raw/`, apply the appropriate transformation and write to the corresponding output directory in `public/assets/`.

| Category | Input Dir | Output Dir | Processing |
|----------|-----------|------------|------------|
| Car sprites | `assets/raw/sprites/car-*.png` | `public/assets/sprites/` | Resize to 128×128 (game-size from 256×256 raw), preserve transparency, optimize PNG |
| Track backgrounds | `assets/raw/tracks/track*-bg.png` | `public/assets/tracks/` | Keep original size (2048×2048), optimize PNG compression |
| Tileable textures | `assets/raw/textures/*.png` | `public/assets/textures/` | Keep original size, verify power-of-2 dimensions, optimize PNG |
| Audio files | `assets/raw/audio/*.wav` | `public/assets/audio/` | Copy as-is (WAV processing is out of scope for Sharp — just verify file size ≤ 200KB and copy) |

**Script architecture:**

```typescript
// tools/process-assets.ts

import sharp from 'sharp';
import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

// Constants
const RAW_DIR = 'assets/raw';
const OUTPUT_DIR = 'public/assets';

// Processing configuration per asset category
interface ProcessingRule {
  inputGlob: string;      // subdirectory + pattern in RAW_DIR
  outputSubdir: string;   // subdirectory in OUTPUT_DIR
  process: (inputPath: string, outputPath: string) => Promise<void>;
}
```

**Functions to implement:**

1. `processSprites(inputDir: string, outputDir: string): Promise<ProcessResult[]>`
   - Reads all `car-*.png` files from `inputDir`
   - Resizes each to 128×128 using Sharp with `fit: 'contain'`, transparent background
   - Writes to `outputDir` preserving filename
   - Returns array of `{ file: string, status: 'ok' | 'error', message?: string }`

2. `processTrackBackgrounds(inputDir: string, outputDir: string): Promise<ProcessResult[]>`
   - Reads all `track*-bg.png` files
   - Validates dimensions are 2048×2048 (warn if not, but still process)
   - Optimizes PNG compression using Sharp's `.png({ compressionLevel: 9, adaptiveFiltering: true })`
   - Writes to output

3. `processTextures(inputDir: string, outputDir: string): Promise<ProcessResult[]>`
   - Reads all `*.png` files from textures dir
   - Validates power-of-2 dimensions (256, 512, etc.) — warn if not
   - Optimizes PNG compression
   - Writes to output

4. `processAudio(inputDir: string, outputDir: string): Promise<ProcessResult[]>`
   - Reads all `*.wav` files
   - Validates file size ≤ 200KB (warn if exceeds)
   - Copies to output directory (no audio processing — just copy + validate)

5. `main(): Promise<void>`
   - Ensures output directories exist
   - Runs all four processors
   - Prints summary: total files processed, any warnings/errors
   - Exits with code 1 if any errors occurred, 0 if all ok
   - Handles the case where `assets/raw/` is empty or missing gracefully (print "No raw assets found. Place files in assets/raw/ per docs/asset-spec.md")

**ProcessResult type:**
```typescript
interface ProcessResult {
  inputFile: string;
  outputFile: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}
```

**Error handling:**
- If `assets/raw/` doesn't exist or is empty: print helpful message and exit 0 (not an error — assets haven't been generated yet)
- If an individual file fails processing: log the error, continue with remaining files, include in summary
- If output directory doesn't exist: create it

**Test requirements:**

Create `tests/tools/process-assets.test.ts`:

Tests must create temporary directories with fixture files, run the processing functions, and verify outputs. Use Vitest.

1. **Sprite resize test:** Create a 256×256 test PNG (use Sharp to generate a solid-color test image), run `processSprites`, verify output is 128×128 and PNG format
2. **Transparency preservation test:** Create a 256×256 PNG with transparency, process it, verify alpha channel is preserved in output
3. **Track background optimization test:** Create a 2048×2048 test PNG, run `processTrackBackgrounds`, verify output exists and is smaller than or equal to input
4. **Texture power-of-2 validation test:** Create a 300×300 PNG, run `processTextures`, verify a warning is included in result
5. **Audio copy test:** Create a small WAV-like file (or just a test file), run `processAudio`, verify it's copied to output
6. **Audio size validation test:** Create a file > 200KB, run `processAudio`, verify a warning is included
7. **Empty directory test:** Run processor on empty directory, verify no errors, clean exit
8. **Missing directory test:** Run processor when `assets/raw/` doesn't exist, verify graceful handling

For test fixtures, use Sharp's programmatic API to generate test PNGs:
```typescript
// Generate a test 256x256 red square PNG
await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
  .png()
  .toFile(testInputPath);
```

### File Targets
- `tools/process-assets.ts` — NEW: main asset processor script
- `tests/tools/process-assets.test.ts` — NEW: comprehensive tests with Sharp-generated fixtures

### Acceptance Criteria
- [ ] `tools/process-assets.ts` exports `processSprites`, `processTrackBackgrounds`, `processTextures`, `processAudio`, and `main` — `Satisfies: R-001`
- [ ] Running `pnpm run process-assets` with raw assets in `assets/raw/` produces optimized outputs in `public/assets/` — `Satisfies: R-001`
- [ ] Car sprites are resized from 256×256 to 128×128 with transparency preserved — `Satisfies: R-001`
- [ ] Track backgrounds are PNG-optimized (compression level 9) — `Satisfies: R-001`
- [ ] Textures get power-of-2 dimension validation (warning on non-power-of-2) — `Satisfies: R-001`
- [ ] Audio files ≤ 200KB are copied, files > 200KB produce a warning — `Satisfies: R-001`
- [ ] Empty/missing `assets/raw/` directory produces a helpful message, not an error — `Satisfies: R-001`
- [ ] All 8 tests pass in `tests/tools/process-assets.test.ts` — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`
- [ ] TypeScript compiles without errors: `pnpm exec tsc --noEmit` — `Satisfies: R-005`

### Dependencies
- **Depends on:** Plan 1 (directory structure, Sharp dependency, package.json scripts)
- **Needed by:** None directly (Phase 2 will use this tool to process raw assets)

### Locked Decisions
- Sharp for image processing (ADR-02, spec)
- Input: `assets/raw/`, Output: `public/assets/` (ADR-02)
- Car sprites: single PNG per variant, 256×256 raw → 128×128 game-size (ADR-03)
- Track backgrounds: 2048×2048 (ADR-04)
- Audio: WAV format, ≤ 200KB per file (ADR-11)