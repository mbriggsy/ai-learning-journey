---
title: "Phase 0: Asset Generation — Gemini Imagen 4 API Pipeline"
type: feat
status: completed
date: 2026-03-11
deepened: 2026-03-11
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

# Phase 0: Asset Generation — Gemini Imagen 4 API Pipeline

## Enhancement Summary

**Deepened on:** 2026-03-11
**Sections enhanced:** 12
**Research agents used:** architecture-strategist, security-sentinel, performance-oracle, kieran-typescript-reviewer, code-simplicity-reviewer, pattern-recognition-specialist, gemini-imagegen-skill, sharp-best-practices-researcher, framework-docs-researcher, repo-research-analyst

### Critical Corrections Discovered
1. **`negativePrompt` is NOT supported on Imagen 4** — silently ignored by the API. Must restructure into positive prompt framing.
2. **Processing order bug** — plan had resize before chroma-key removal. Must remove background at full resolution FIRST, then resize. Reversed order causes permanent magenta contamination.
3. **Chroma-key strategy uncommitted** — plan listed two alternatives. Committed to soft-alpha pixel replacement with color decontamination.
4. **`enhancePrompt` defaults to `true`** — will rewrite prompts via LLM, breaking style consistency and chroma-key reliability. Must explicitly set `false`.
5. **`numberOfImages` may default to 4** — wastes 3x API quota per call. Must explicitly set `1`.

### Key Improvements
1. Full SDK API signatures, enums, and response format documented
2. Two-pass chroma-key algorithm with soft alpha ramp + color decontamination (eliminates halos)
3. 4-module TypeScript architecture (prompts, entrypoint, image-processing, types)
4. Type-safe prompt definitions via `as const satisfies`
5. Per-call timeout via `abortSignal` (prevents indefinite hangs)
6. Post-generation self-validation pass (verify dimensions + alpha programmatically)
7. Simplified retry logic (single retry, fixed delay — appropriate for build script)
8. `seed` parameter for reproducible prompt iteration during development
9. `.env.example` added to deliverables
10. Security hardening: `.gitignore` expansion, `--only` arg validation, Sharp `limitInputPixels`

---

## Overview

Build an autonomous asset generation pipeline that calls the Gemini Imagen 4 API, generates 11 game assets (car sprites, track backgrounds, tileable textures, menu background), applies minimal Sharp post-processing (background removal for cars, resize to target dimensions), and writes the results to `assets/raw/`. The pipeline runs via `pnpm run generate-assets` with zero human art tooling.

**Spec update required:** The spec references "Gemini Imagen 3 API" throughout, but Imagen 3 was **shut down November 10, 2025**. This plan targets **Imagen 4** (`imagen-4.0-generate-001`) via the `@google/genai` SDK v1.44.0. The spec should be updated to reflect this. Imagen 4 itself sunsets June 24, 2026 — not blocking for Phase 0, but raw assets should be committed to git after visual approval to preserve them permanently. Replacement models after sunset: `gemini-3-pro-image-preview` or `gemini-2.5-flash-image`.

(see brainstorm: `docs/brainstorms/2026-03-11-full-build-brainstorm.md` — Decision #5, #10)

## Problem Statement / Motivation

v04 needs high-quality visual assets but the entire SDLC is autonomous — zero human art involvement. The Gemini Imagen API generates production-quality images from text prompts. Phase 0 produces the raw material that Phase 1's asset processor will optimize, atlas-pack, and manifest-type for the game.

Two API constraints force Phase 0 to include minimal Sharp processing:
1. **No transparent backgrounds** — Imagen models cannot produce alpha channels. Car sprites must be generated on a solid chroma-key background and stripped with Sharp.
2. **No arbitrary pixel dimensions** — The API offers aspect ratios (1:1, 16:9) and size tiers (1K, 2K), not exact pixel sizes. All assets must be resized to target dimensions with Sharp.

### Research Insights — API Constraints

**Imagen 4 Hard Limits (confirmed via SDK source and docs):**
- Max 480 tokens per prompt (English-only recommended)
- 1-4 images per request (always set `numberOfImages: 1` to avoid quota waste)
- Output is always fully opaque — no alpha channel generation possible
- SynthID watermark always embedded (invisible, not removable)
- `imageSize: "2K"` only available on Standard and Ultra models (not Fast)
- `seed` parameter requires `addWatermark: false` to function

**Known SDK Issues (v1.44.0):**
- `imageSize: "2K"` was silently ignored in SDK versions before v1.32.0 — verify output dimensions after generation
- `negativePrompt` field exists in the TypeScript interface but is **silently ignored** by all Imagen 4 models
- API does not throw errors for unsupported parameters — bugs hide silently

## Proposed Solution

### Architecture

```
scripts/asset-prompts.ts    — Typed prompt definitions (versioned in git)
scripts/types.ts            — Shared types (Phase 0 + Phase 1 contract)
  ↓
scripts/generate-assets.ts  — CLI entrypoint: parse args → orchestrate → summarize
  ↓ calls
scripts/image-processing.ts — Sharp: bg removal (cars), resize, crop (curb), validate
  ↓ uses
@google/genai SDK           — Gemini Imagen 4 API (model: imagen-4.0-generate-001)
  ↓ returns base64
assets/raw/                 — 11 PNG files at correct dimensions with correct alpha
```

### Research Insights — Module Structure

**4 modules instead of 2** (TypeScript reviewer recommendation):

| Module | Responsibility | Testable independently? |
|--------|---------------|------------------------|
| `scripts/asset-prompts.ts` | Pure data — prompt definitions, style prefix, asset metadata | N/A (data only) |
| `scripts/types.ts` | Shared types consumed by Phase 0 writer AND Phase 1 reader | N/A (types only) |
| `scripts/generate-assets.ts` | CLI entrypoint — arg parsing, orchestration loop, summary | Yes (mock API + image processor) |
| `scripts/image-processing.ts` | Sharp resize, crop, chroma-key removal, validation | Yes (feed known PNGs, assert output) |

**Rationale:** The chroma-key removal alone has non-trivial tolerance tuning and edge handling. Isolating it in `image-processing.ts` lets you unit test it with known PNG inputs without mocking the Gemini API. The shared `types.ts` prevents Phase 0/Phase 1 type drift.

**Why the pipeline is sequential** (document this to prevent future "optimization" into `Promise.all`): The Imagen API has per-minute rate limits (10 IPM on Tier 1). Parallel calls would hit 429s immediately.

### Script Flow

```
pnpm run generate-assets
  1. Load .env via tsx --env-file=.env (zero-dependency, no dotenv)
  2. Validate API key exists (fail fast if missing)
  3. Parse CLI args via node:util parseArgs (--only, --dry-run)
  4. Iterate 11 asset prompts from asset-prompts.ts:
     a. Log: "Generating [asset name]... (N/11)"
     b. Call Imagen 4 API with prompt + config (60s timeout via abortSignal)
     c. Check response for safety filter blocks (log raiFilteredReason, continue)
     d. Decode base64 → Buffer
     e. Sharp (cars only): chroma-key bg removal at FULL RESOLUTION (before resize)
     f. Sharp: resize to target dimensions (lanczos3 kernel)
     g. Sharp (curb only): extract() center strip, then resize to 128x64
     h. Validate: verify output dimensions + alpha via Sharp metadata
     i. Write to assets/raw/<filename>.png (compressionLevel: 9, adaptiveFiltering: true)
     j. Delay 7s before next call (hardcoded, Tier 1 safe)
  5. Print summary table: pass/fail per asset with failure reasons
  6. Non-zero exit code if any asset failed
```

### Research Insights — Script Flow Changes

**Critical fix — step ordering for car sprites:**
The original plan had resize (step 4e) before bg removal (step 4f). This is **backwards**. Resizing a magenta-background image blends magenta into edge pixels via interpolation, creating permanent color contamination no tolerance can fix. Correct order: chroma-key removal at full resolution (1024x1024), THEN resize to 256x256.

**Simplifications applied** (code-simplicity-reviewer):
- ~~Smoke test~~ → The first real asset call IS the smoke test. If auth fails, the script exits on the first call. Saves ~15 LOC and one API call ($0.04).
- ~~`--skip-existing`~~ → 11 assets at ~3 min total. Use `--only` for selective regeneration instead. Saves ~15 LOC.
- ~~`GEMINI_DELAY_MS` env var~~ → Hardcode `7000ms`. One API, one tier, one rate limit. If it changes, change one constant. Saves ~5 LOC.
- ~~Exponential backoff~~ → Single retry with 10s fixed delay. This is a build script making 11 calls, not a production service. Saves ~15 LOC.
- ~~Generation log JSON~~ → **Kept but simplified.** The pattern analyst argues it provides Phase 1 integration metadata and audit trail. Write incrementally (after each asset) so partial runs still have a log.

**Addition — `--dry-run` flag:** Logs what it would generate without making API calls. Useful for verifying CLI behavior and prompt parsing before spending money.

**Addition — post-generation validation (step 4h):** After Sharp processing, verify output with `sharp(buffer).metadata()` — check width, height, and hasAlpha match expectations. Catches corrupt/truncated API responses and Sharp processing failures.

### Chroma-Key Strategy for Car Sprites

Car sprites are generated with a **solid bright magenta (#FF00FF) background** in the prompt. Sharp then replaces that color with transparent alpha using a **two-pass soft alpha ramp + color decontamination** algorithm.

**Processing order (CRITICAL): Chroma-key at full resolution (1024x1024) → resize to 256x256.**

#### Algorithm — Two-Pass Soft Alpha with Color Decontamination

**Pass 1 — Soft alpha from color distance:**

```typescript
const CHROMA_R = 255, CHROMA_G = 0, CHROMA_B = 255; // #FF00FF
const TOLERANCE_INNER = 10;  // below = fully transparent
const TOLERANCE_OUTER = 40;  // above = fully opaque; between = gradient alpha

const { data, info } = await sharp(buffer)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const dist = Math.sqrt((r - CHROMA_R) ** 2 + (g - CHROMA_G) ** 2 + (b - CHROMA_B) ** 2);

  if (dist <= TOLERANCE_INNER) {
    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0; // fully transparent
  } else if (dist < TOLERANCE_OUTER) {
    data[i + 3] = Math.round(((dist - TOLERANCE_INNER) / (TOLERANCE_OUTER - TOLERANCE_INNER)) * 255);
  }
  // else: fully opaque, leave unchanged
}
```

**Pass 2 — Color decontamination (remove magenta spill from semi-transparent pixels):**

```typescript
for (let i = 0; i < data.length; i += 4) {
  const alpha = data[i + 3];
  if (alpha > 0 && alpha < 255) {
    const a = alpha / 255;
    // Recover true foreground color by removing chroma-key contribution
    data[i]     = Math.round(Math.max(0, Math.min(255, (data[i]     - CHROMA_R * (1 - a)) / a)));
    data[i + 1] = Math.round(Math.max(0, Math.min(255, (data[i + 1] - CHROMA_G * (1 - a)) / a)));
    data[i + 2] = Math.round(Math.max(0, Math.min(255, (data[i + 2] - CHROMA_B * (1 - a)) / a)));
  }
}

// Reconstruct and resize
const result = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(256, 256, { kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();
```

### Research Insights — Chroma-Key

**Why two-pass over binary threshold:** A naive binary threshold (transparent or opaque at distance 15) produces jagged edges with magenta fringing. The soft alpha ramp creates smooth anti-aliased edges, and the color decontamination pass removes magenta spill from semi-transparent edge pixels.

**Magenta vs Green debate:** The Gemini research agent found real-world evidence (Robotic Ape, March 2026) that green (#00FF00) outperforms magenta for game sprites because magenta is closer to red in hue space. However, magenta was chosen because the player car livery includes no magenta variants. **Decision: Keep magenta.** If red car sprites show edge artifacts during testing, switch to green and re-test. The algorithm is color-agnostic — changing the CHROMA_R/G/B constants is the only required change.

**Why Sharp, not a dedicated library:** Sharp has no built-in chroma-key function (confirmed by maintainer in GitHub issue #1648). The raw pixel buffer approach is the proven pattern. The two-pass algorithm runs in <5ms on a 1024x1024 image — negligible for a build script.

**Tolerance tuning:** Start with TOLERANCE_INNER=10, TOLERANCE_OUTER=40. If halos appear, increase OUTER. If car edges erode, decrease OUTER. Test with one car sprite first (`--only car-player-red`) before running all 4.

### API Configuration per Asset

| Asset | Aspect Ratio | Size Tier | Post-Processing |
|-------|-------------|-----------|-----------------|
| Player car (red) | 1:1 | 1K | Chroma-key bg removal (full res) → resize 256x256 |
| Player car (blue) | 1:1 | 1K | Chroma-key bg removal (full res) → resize 256x256 |
| Player car (yellow) | 1:1 | 1K | Chroma-key bg removal (full res) → resize 256x256 |
| AI opponent car | 1:1 | 1K | Chroma-key bg removal (full res) → resize 256x256 |
| Track 01 background | 1:1 | 2K | Resize 2048x2048 |
| Track 02 background | 1:1 | 2K | Resize 2048x2048 |
| Track 03 background | 1:1 | 2K | Resize 2048x2048 |
| Asphalt texture | 1:1 | 1K | Resize 512x512 |
| Grass texture | 1:1 | 1K | Resize 256x256 |
| Curb texture | 1:1 | 1K | extract() center strip → resize 128x64 |
| Menu background | 16:9 | 2K | Resize 1920x1080 |

**Shared API config for ALL calls:**

```typescript
{
  numberOfImages: 1,                                    // explicit — API may default to 4
  outputMimeType: 'image/png',
  enhancePrompt: false,                                 // CRITICAL — preserves exact prompt intent
  safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH, // most permissive for game art
  personGeneration: PersonGeneration.DONT_ALLOW,        // no people in assets
  includeRaiReason: true,                               // diagnostics for safety blocks
  addWatermark: false,                                  // required for seed to work
}
```

**Notes:**
- 2K size tier requires Imagen 4 Standard or Ultra (not Fast)
- Curb texture: generate 1:1 at 1K, use Sharp `extract({ left: 0, top: 384, width: 1024, height: 256 })` to take center horizontal strip, then resize to 128x64. Prompt should place content centered vertically.
- Track backgrounds at 2K (~2048px) may need only minor resizing to hit exact 2048x2048 — verify with metadata after generation
- Car sprites generate at 1K (1024px) then chroma-key then downscale to 256x256 — downscaling preserves quality
- **Verify output dimensions** after each generation with `sharp(buffer).metadata()` — the `imageSize: "2K"` parameter has known SDK bugs where it is silently ignored

### Research Insights — API Configuration

**Imagen 4 model variants:**

| Model | ID | 2K Support | Speed | Best For |
|-------|----|-----------|-------|----------|
| Standard | `imagen-4.0-generate-001` | Yes | Medium | This pipeline (best balance) |
| Ultra | `imagen-4.0-ultra-generate-001` | Yes | Slow | Overkill for game sprites |
| Fast | `imagen-4.0-fast-generate-001` | No (1K max) | Fast | Not suitable — can't do 2K |

**Supported aspect ratios:** `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"` — only these five. No `"2:1"`.

**Exact 1K pixel dimensions per aspect ratio:**

| Aspect Ratio | 1K Dimensions | 2K Dimensions |
|-------------|---------------|---------------|
| 1:1 | 1024x1024 | 2048x2048 |
| 3:4 | 896x1280 | ~1792x2560 |
| 4:3 | 1280x896 | ~2560x1792 |
| 9:16 | 768x1408 | ~1536x2816 |
| 16:9 | 1408x768 | ~2816x1536 |

**`seed` for reproducible iteration:** During prompt tuning, use `seed: 42` (any integer 1-2147483647) with `addWatermark: false` to get deterministic output. Same seed + same prompt = same image. Remove seed for final generation to get the "best" stochastic result. This enables A/B comparison when tweaking prompt wording.

### Prompt Engineering

**Style prefix** (prepended to ALL prompts for visual consistency):
```
"2D top-down racing game asset, clean vector-style illustration, bold flat colors, hard shadows, professional game art, NOT 3D, NOT realistic, NOT photographic, avoid blurriness, no watermarks, no text overlay, no logos, "
```

~~**Negative prompt** (applied to ALL calls):~~
~~`"3D, realistic, photographic, blurry, noisy, watermark, text, logo, low quality"`~~

**CORRECTION: `negativePrompt` is NOT supported on Imagen 4.** The SDK field exists but the API silently ignores it. All exclusion language must be folded into the positive prompt. The style prefix above incorporates the negative constraints as positive directives ("NOT 3D", "NOT realistic", etc.).

**Asset-specific prompt suffixes** defined in `scripts/asset-prompts.ts`. Key conventions:
- Car sprites: `"...viewed directly from above (bird's eye view), car pointing up (north), on a solid flat bright magenta background EXACT hex #FF00FF, NO gradients, NO noise, NO texture, NO shadows on background, NO ground plane, clean white outline 2px wide around the car..."`
- Track backgrounds: `"...aerial overhead view of a complete racing circuit, bird's eye view, top-down perspective..."`
- Tileable textures: `"...seamless tileable pattern, seamless tile, repeating texture, seamless edges, uniform lighting, no directional shadows, no vignette, no center focal point..."`
- Curb texture: `"...red and white alternating curb pattern, centered vertically in the image, with empty space above and below..."` (enables reliable center-crop)

**Car orientation:** All car sprites point **north (up)** in the PNG. This matches the convention where PixiJS `rotation = 0` faces north. The renderer applies rotation from engine state.

### Research Insights — Prompt Engineering

**Best practices for Imagen 4 game assets:**
- Front-load the most important requirements — the model weights early tokens more heavily
- Use CAPITALIZED emphasis for critical constraints: `"EXACT hex #FF00FF"`, `"NOT 3D"`
- Specify exact hex color values rather than color names for backgrounds
- Request a clean white outline/border 2px around sprites — creates buffer zone for chroma-key
- For seamless textures, stack multiple tileability keywords: "seamless tileable pattern, seamless tile, repeating texture, seamless edges"
- Budget 3-5 regeneration cycles per asset for prompt tuning
- Avoid mentioning "crowds" or "spectators" in track background prompts — triggers person-generation filters even with `personGeneration: DONT_ALLOW`

**enhancePrompt must be false because:**
1. Style prefix is crafted for exact game aesthetic — LLM rewriting overrides it
2. Chroma-key background specification must be exact — rewriting may add "details" to the background
3. Car orientation ("pointing north") may be reinterpreted by the LLM
4. Reproducibility: different runs may produce different enhanced prompts

**Menu background exception:** Consider `enhancePrompt: true` for `menu-bg.png` only, where richer artistic interpretation is welcome. Compare results with both settings.

### Error Handling Strategy

| Error Type | Detection | Response |
|-----------|-----------|----------|
| Missing API key | `!process.env.GEMINI_API_KEY` | Exit immediately with clear message |
| Auth error (400/403) | SDK throws `ApiError` with status 400/403 | Exit immediately — key is invalid, no point continuing |
| Rate limit (429) | SDK throws with status 429, message contains `RESOURCE_EXHAUSTED` | Wait 10s, retry once. If still 429, log failure and continue to next asset. |
| Server error (5xx) | SDK throws with status 500/503 | Wait 3s, retry once. If still failing, log and continue. |
| Safety filter block | `response.generatedImages` empty or `raiFilteredReason` set | Log warning with asset name + reason (via `includeRaiReason`), continue to next asset |
| Network timeout | `abortSignal` fires after 60s | Log timeout, retry once. If still hanging, log and continue. |
| Corrupt API response | `imageBytes` empty/undefined despite no safety block | Log error, continue to next asset |
| Sharp processing error | Sharp throws | Log error, save raw unprocessed image as `<name>.raw.png`, continue |
| Dimension mismatch | `sharp(output).metadata()` differs from target | Log warning (non-fatal — resize corrects this) |

**Summary at end:** Script prints a table (via `console.table`) showing pass/fail per asset with failure reasons. Non-zero exit code if any asset failed.

### Research Insights — Error Handling

**Simplified retry logic** (code-simplicity-reviewer): Exponential backoff is over-engineered for 11 API calls. A single retry with a fixed delay covers 95% of transient failures. Different delays for different errors:
- 429 (rate limit): 10s wait — the per-minute window needs time to rotate
- 5xx (server): 3s wait — transient, usually resolves quickly
- Network timeout: immediate retry (the 60s already elapsed)

**Safety filters do NOT throw errors.** The API returns HTTP 200 with an empty `generatedImages` array or with `raiFilteredReason` populated on individual images. You must check the response, not catch exceptions.

**SDK error shape:**
```typescript
catch (e) {
  if (e instanceof Error && 'status' in e) {
    const status = (e as { status: number }).status;
    // 429, 400, 403, 500, 503
  }
}
```

**Per-call timeout:** Use `abortSignal` in the SDK config:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);
try {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: fullPrompt,
    config: { ...sharedConfig, abortSignal: controller.signal },
  });
} finally {
  clearTimeout(timeout);
}
```

### Idempotency and Selective Regeneration

- **Default behavior:** Overwrite all existing files in `assets/raw/`. This is the "clean regeneration" the spec describes.
- **Selective mode:** `pnpm run generate-assets -- --only car-ai track02-bg` regenerates only the named assets. This supports the visual inspection workflow where Briggsy approves some and rejects others.
- **Dry run mode:** `pnpm run generate-assets -- --dry-run` logs what would be generated without making API calls. Validates CLI behavior and prompt parsing before spending money.

### Research Insights — CLI Design

**Use `node:util parseArgs`** (Node 18.3+, zero-dependency):

```typescript
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    only: { type: 'string', multiple: true },
    'dry-run': { type: 'boolean', default: false },
  },
  allowPositionals: false,
  strict: true,  // throws on unknown flags like --onyl (typo)
});
```

**`--only` must validate against known asset names.** If someone passes `--only car-playr-red` (typo), the script should error immediately, not silently skip everything and report 0/0. With `as const satisfies` on the prompt array, asset names are a compile-time union type.

### Git Strategy for `assets/raw/`

1. `assets/raw/` is permanently in `.gitignore` during development
2. After Briggsy's visual approval of all 11 assets, temporarily remove the gitignore entry
3. Commit the approved final set in a single commit
4. Re-add `assets/raw/` to `.gitignore`

**Rationale:** Imagen 4 sunsets June 24, 2026. Once the API is gone, raw assets cannot be regenerated from prompts alone. Committing the approved set preserves them permanently. The ~20-40MB cost is acceptable given the alternative is permanent loss.

### Research Insights — Security

**Expand `.gitignore` to cover all `.env` variants** (security-sentinel finding):
```
.env
.env.*
.env.local
.env.*.local
```

**Create `.env.example`** documenting required variables (without values):
```
GEMINI_API_KEY=
```

**API key restriction:** After Phase 0 is complete, restrict the Gemini API key in Google Cloud Console to the Generative Language API only. Set a billing quota/alert.

## Technical Considerations

### Phase 0 / Phase 1 Boundary

**Phase 0 delivers:** `assets/raw/` containing 11 PNG files at correct target dimensions with correct alpha channels (transparent for cars, opaque for everything else). Plus 4 script files in `scripts/`.

**Phase 1 picks up:** Optimizes file sizes, builds texture atlases (PixiJS-compatible JSON + PNG), generates typed manifest (`src/assets/manifest.ts`), and outputs to `public/assets/`.

Phase 0 does "minimal Sharp" (background removal + resize) because the API physically cannot produce the required format. Phase 1 does "production Sharp" (optimization + atlas packing).

**File naming contract for Phase 1:** Phase 1 processes only `*.png` files in `assets/raw/` (excluding `*.raw.png` fallback files from Sharp failures). It ignores `*.json` files. This contract should be documented in `scripts/types.ts`.

### Research Insights — Phase Boundary

**Naming reconciliation needed:** The spec (ADR-02) shows manifest paths like `car-red.png` while this plan uses `car-player-red.png`. The plan's naming is more descriptive. Phase 1 should adopt the plan's naming convention. Update the spec manifest example to match.

### Dependencies to Add (Phase 0)

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/genai` | `^1.44.0` | Gemini Imagen 4 SDK |
| `sharp` | `^0.34.0` | Image processing (bg removal, resize) |

These are **devDependencies** — they're build-time tools, not runtime game code.

**Note:** `tsx` is needed to run the script but is already added by Phase -1. If Phase -1 hasn't run, `tsx` is available globally (`v4.21.0` on this system) and can be used directly.

**Env loading:** Use `tsx --env-file=.env` (Node 20.6+ native support) instead of adding `dotenv` as a dependency.

**After installation:** Run `pnpm audit` to verify no known vulnerabilities in the new dependencies.

### Rate Limiting

- Default delay: **7 seconds** between API calls (hardcoded constant, safe for Tier 1 at 10 IPM)
- 7s provides ~17% safety margin over the theoretical minimum of 6s per call
- On 429 response: wait 10s, retry once (single retry, not exponential backoff)
- On 5xx response: wait 3s, retry once
- Skip delay after the last asset (saves 7s)
- Total estimated time: ~2.5-4 minutes for 11 assets (API call time + 7s delay between)
- Budget: 11 API calls. At $0.04/call = ~$0.44 per full run.

### Research Insights — Rate Limiting

**Performance oracle analysis:** The pipeline is entirely API-bound. Sharp processing for all 11 images totals ~1.5 seconds. The 7s inter-call delay dominates by 50-100x. No parallelization opportunity exists given rate limits.

**Process each image during the delay window:** Ensure Sharp processing runs BEFORE `await delay(7000)`, not after. The processing (~50-200ms per image) completes within the delay window for free.

### Generation Log

`assets/raw/generation-log.json` — written **incrementally** (updated after each asset completes, not only at the end):

```json
{
  "generatedAt": "2026-03-12T10:30:00Z",
  "model": "imagen-4.0-generate-001",
  "sdkVersion": "1.44.0",
  "assets": [
    {
      "name": "car-player-red",
      "status": "success",
      "promptHash": "a1b2c3d4e5f6",
      "dimensions": { "width": 256, "height": 256 },
      "hasAlpha": true,
      "generatedAt": "2026-03-12T10:30:05Z"
    }
  ],
  "summary": { "total": 11, "succeeded": 11, "failed": 0 }
}
```

### Research Insights — Generation Log

**Simplifications:**
- Removed redundant `filename` field — derive from `name` programmatically (`${name}.png`)
- `promptHash` uses `createHash('sha256').update(fullPrompt).digest('hex').slice(0, 12)` from `node:crypto`
- Status is a union: `'success' | 'failed'`
- Written incrementally so partial runs have a machine-readable record

**What NOT to include:** Raw API responses, error messages from the API, or request headers. Only safe metadata.

## TypeScript Architecture

### Research Insights — Type Safety

**Prompt definitions with `as const satisfies`:**

```typescript
// scripts/types.ts
export interface AssetPrompt {
  readonly name: string;
  readonly promptSuffix: string;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly aspectRatio: '1:1' | '16:9';
  readonly sizeTier: '1K' | '2K';
  readonly postProcess: PostProcessing;
}

export type PostProcessing =
  | { kind: 'resize' }
  | { kind: 'chroma-key-then-resize' }
  | { kind: 'crop-and-resize'; cropRegion: { left: number; top: number; width: number; height: number } };

// scripts/asset-prompts.ts
export const ASSET_PROMPTS = [
  {
    name: 'car-player-red',
    promptSuffix: '...',
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  // ...11 entries
] as const satisfies readonly AssetPrompt[];

export type AssetName = typeof ASSET_PROMPTS[number]['name'];
// = 'car-player-red' | 'car-player-blue' | ... (literal union)
```

**Why this pattern:** `as const` preserves literal types for `name` fields (enabling `--only` validation at compile time). `satisfies` validates structural correctness against the interface. The discriminated union for `PostProcessing` makes impossible states unrepresentable — you cannot have `chroma-key` AND a crop region by accident.

**Error handling with Result type:**

```typescript
export type GenerationResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; error: GenerationError };

export type GenerationError =
  | { kind: 'auth'; message: string }
  | { kind: 'rate-limit'; retryAfterMs: number }
  | { kind: 'server-error'; status: number; message: string }
  | { kind: 'safety-block'; reason: string }
  | { kind: 'timeout' }
  | { kind: 'sharp-error'; message: string; rawSaved: boolean };
```

**Modern TypeScript idioms:**
- `node:` prefix for all Node.js imports (`node:crypto`, `node:fs/promises`, `node:path`, `node:util`)
- `node:fs/promises` exclusively — never `writeFileSync` in an async pipeline
- Validate env vars explicitly: `Number.parseInt(x, 10)` + `Number.isNaN()` check

## System-Wide Impact

- **Interaction graph:** Phase 0 is isolated — no callbacks, no middleware, no observers. It's a standalone build script.
- **Error propagation:** Errors stay within the script. Non-zero exit code signals failure to the operator.
- **State lifecycle risks:** Partial failure leaves some files in `assets/raw/` and others missing. The incremental generation log and `--only` flag mitigate this.
- **API surface parity:** No other interface generates assets. This is the single source.
- **Integration test scenarios:** (1) Run script with valid key, verify 11 files exist at correct dimensions. (2) Run script with invalid key, verify immediate exit. (3) Run `--only` with a single asset, verify only that file changes. (4) Run `--dry-run`, verify zero API calls made.

## Acceptance Criteria

### Prerequisites (from Phase -1 or Phase 0 setup)

- [x] `tsx` available (globally or in devDeps)
- [x] `@google/genai` added to devDeps (`pnpm add -D @google/genai`)
- [x] `sharp` added to devDeps (`pnpm add -D sharp`)
- [x] `.env` contains valid `GEMINI_API_KEY`
- [x] `.env.example` created with `GEMINI_API_KEY=`
- [x] `.gitignore` expanded with `.env.*` patterns
- [x] `assets/raw/` directory created and gitignored
- [x] `pnpm run generate-assets` script entry added to `package.json`

### Script Files

- [x] `scripts/types.ts` — shared types for Phase 0/Phase 1 contract
  - Exports `AssetPrompt`, `PostProcessing`, `AssetName`, `GenerationLog`, `GenerationResult`, `GenerationError`
- [x] `scripts/asset-prompts.ts` — typed prompt definitions for all 11 assets
  - Exports a `STYLE_PREFIX` constant (includes negation language since `negativePrompt` is unsupported)
  - Exports `ASSET_PROMPTS` array with `as const satisfies` for compile-time name validation
  - All prompts versioned in git
- [x] `scripts/image-processing.ts` — Sharp processing functions
  - `chromaKeyRemove(buffer)` — auto-detects bg color, two-pass soft alpha + color decontamination
  - `resizeAsset(buffer, width, height)` — lanczos3 resize
  - `cropAndResize(buffer, cropRegion, width, height)` — for curb texture
  - `validateOutput(buffer, expectedWidth, expectedHeight, expectAlpha)` — metadata check
- [x] `scripts/generate-assets.ts` — CLI entrypoint + orchestration
  - Validates `GEMINI_API_KEY` from environment
  - Parses CLI args via `node:util parseArgs` (`--only`, `--dry-run`)
  - Validates `--only` names against `AssetName` union
  - Iterates all prompts with 7s delay between calls
  - 60s per-call timeout via `abortSignal`
  - Single-retry on 429 (10s wait) and 5xx (3s wait)
  - Applies correct post-processing per asset's `PostProcessing` discriminant
  - Writes to `assets/raw/<name>.png`
  - Writes `generation-log.json` incrementally
  - Prints summary table via `console.table`
  - Non-zero exit code if any asset failed

### Generated Assets (11 files in `assets/raw/`)

- [x] `car-player-red.png` — 256x256, transparent background
- [x] `car-player-blue.png` — 256x256, transparent background
- [x] `car-player-yellow.png` — 256x256, transparent background
- [x] `car-ai.png` — 256x256, transparent background, visually distinct silhouette
- [x] `track01-bg.png` — 2048x2048, oval circuit, day racing, grandstands
- [x] `track02-bg.png` — 2048x2048, speedway, night, stadium atmosphere
- [x] `track03-bg.png` — 2048x2048, technical circuit, moody European aesthetic
- [x] `asphalt-tile.png` — 512x512, seamless tileable
- [x] `grass-tile.png` — 256x256, seamless tileable
- [x] `curb-tile.png` — 128x64, red/white alternating, seamless
- [x] `menu-bg.png` — 1920x1080, dark dramatic racing atmosphere
- [x] `generation-log.json` — incremental metadata for all 11 assets

### Validation Gates

- [x] `pnpm run generate-assets` completes with 11/11 success
- [x] All 11 PNG files exist at correct dimensions (verified programmatically by the script itself)
- [x] Car sprites have transparent backgrounds (alpha channel present, minor edge fringing)
- [x] Tileable textures tile without visible seams (visual inspection)
- [x] All assets share a consistent art style (visual inspection — Briggsy gate)
- [x] `pnpm run generate-assets -- --only car-ai` regenerates only the AI car (selective mode works)
- [x] `pnpm run generate-assets -- --dry-run` completes without API calls (dry run works)
- [ ] Running with an invalid API key exits immediately with clear error

## Success Metrics

| Metric | Target |
|--------|--------|
| All 11 assets generated | 11/11 |
| Car sprites have clean transparency | No magenta halos or artifacts visible at game scale |
| Art style consistency | A stranger would believe all 11 images came from the same artist |
| Script completes autonomously | Zero manual steps between `pnpm run generate-assets` and files on disk |
| Briggsy visual approval | All 11 assets pass human inspection |

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Safety filter blocks a car/track prompt | Medium | One or more assets missing | Adjust prompt wording. Use `BLOCK_ONLY_HIGH`. Avoid "crowds"/"spectators" language. Check `raiFilteredReason`. |
| Chroma-key removal produces halos on car sprites | Medium | Visible artifact in every frame | Two-pass soft alpha + color decontamination algorithm. Test with one car first. Tune TOLERANCE_INNER/OUTER. |
| Tileable textures have visible seams | Medium | Breaks visual quality of track surface | Stack seamless keywords. Generate 2x2 tile preview for visual validation. May need Sharp offset-blend post-processing. |
| `negativePrompt` silently ignored | **Confirmed** | Style contamination if not caught | Fold all negative constraints into positive prompt style prefix. Already corrected in this plan. |
| `enhancePrompt` rewrites prompts | **Confirmed** | Style/chroma-key breakage | Explicitly set `enhancePrompt: false` for all calls. |
| `imageSize: "2K"` silently ignored by SDK | Medium | Track backgrounds generate at 1K | Verify dimensions after generation with Sharp metadata. Resize corrects this regardless. |
| Imagen 4 sunsets June 24, 2026 | Low (for Phase 0) | Script becomes non-functional | Complete Phase 0 well before June. Commit approved assets to git. |
| API returns low-quality/wrong-style images | Medium | Prompt iteration needed | Budget 3-5 prompt iteration cycles. Use `seed` for reproducible comparisons. |
| Curb texture 2:1 ratio not available | **Confirmed** | Must crop from square | Generate 1:1, Sharp `extract()` center strip, resize to 128x64. Prompt places content centered vertically. |
| API hangs indefinitely | Low | Script blocks forever | 60s `abortSignal` timeout per call. |

## Execution Order

```
Step 1 — Setup:
  ├── pnpm add -D @google/genai sharp
  ├── Create assets/raw/ directory
  ├── Add "generate-assets": "tsx --env-file=.env scripts/generate-assets.ts" to package.json
  ├── Add assets/raw/ to .gitignore
  ├── Expand .gitignore with .env.* patterns
  └── Create .env.example with GEMINI_API_KEY=

Step 2 — Build Types:
  └── Write scripts/types.ts
      ├── AssetPrompt interface + PostProcessing discriminated union
      ├── AssetName type (derived from prompts)
      ├── GenerationLog, GenerationResult, GenerationError types
      └── Shared contract for Phase 1

Step 3 — Build Prompts:
  └── Write scripts/asset-prompts.ts
      ├── STYLE_PREFIX constant (includes negative framing since negativePrompt unsupported)
      └── ASSET_PROMPTS array (11 entries with as const satisfies)

Step 4 — Build Image Processor:
  └── Write scripts/image-processing.ts
      ├── chromaKeyRemove() — two-pass soft alpha + decontamination
      ├── resizeAsset() — lanczos3 resize with PNG optimization
      ├── cropAndResize() — extract() + resize for curb texture
      └── validateOutput() — metadata dimension/alpha check

Step 5 — Build Generator:
  └── Write scripts/generate-assets.ts
      ├── CLI arg parsing (node:util parseArgs)
      ├── API key validation
      ├── Generation loop with delay + single-retry
      ├── Post-processing dispatch (by PostProcessing.kind)
      ├── Incremental generation log writer
      └── Summary printer

Step 6 — Test Run:
  └── pnpm run generate-assets -- --only car-player-red
      ├── Verify one car sprite generates correctly
      ├── Inspect chroma-key quality (no halos?)
      └── Tune tolerance if needed

Step 7 — Full Generation:
  └── pnpm run generate-assets
      └── All 11 assets generated and saved to assets/raw/

Step 8 — Visual Inspection (Briggsy gate):
  ├── Review all 11 assets
  ├── Approve or flag for regeneration
  └── If flagged: adjust prompts in asset-prompts.ts, re-run with --only <names>

Step 9 — Commit:
  ├── Temporarily remove assets/raw/ from .gitignore
  ├── Commit approved assets + scripts
  └── Re-add assets/raw/ to .gitignore
```

## Security Considerations

### Urgent (from security-sentinel audit)

**GitHub PAT in git remote URL:** The security audit discovered a plaintext GitHub Personal Access Token embedded in the git remote URL. This must be rotated immediately:
1. Rotate the PAT on GitHub (Settings > Developer settings > Personal access tokens)
2. `git remote set-url origin https://github.com/mbriggsy/ai-learning-journey.git`
3. Use Git Credential Manager for future authentication

**Gemini API key rotation:** The API key has been exposed in agent conversation context during this planning session. Rotate the key after planning is complete.

### Implementation-Time Security

- **`--only` arg validation:** Validate against the known `ASSET_PROMPTS` name array. Reject unknown names immediately. This prevents path traversal via crafted asset names.
- **File write safety:** Derive filenames from the `name` field programmatically. Never use user input directly in file paths. Validate resolved paths start with `assets/raw/`.
- **Sharp input guard:** `sharp(buffer, { limitInputPixels: 4096 * 4096 })` — caps maximum processed image size.
- **API error logging:** Never log the API key in error messages. Log status codes and error descriptions only.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: (1) Smoke test API first, (2) Fully autonomous asset generation, (3) Gemini API only
- **Full spec (ADR-02, ADR-03, ADR-04, ADR-11):** [docs/Top-Down-Racer-v04-CE-Spec.md](docs/Top-Down-Racer-v04-CE-Spec.md)
- **Phase -1 plan (prerequisite):** [docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md](docs/plans/2026-03-11-feat-phase-neg1-foundation-plan.md)
- **@google/genai SDK:** https://www.npmjs.com/package/@google/genai (v1.44.0)
- **@google/genai GitHub:** https://github.com/googleapis/js-genai
- **Gemini Imagen API docs:** https://ai.google.dev/gemini-api/docs/imagen
- **Imagen 4 model page:** https://ai.google.dev/gemini-api/docs/models/imagen
- **Imagen deprecations/sunset dates:** https://ai.google.dev/gemini-api/docs/deprecations
- **negativePrompt deprecated:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt
- **No transparent PNG support:** https://discuss.ai.google.dev/t/unable-to-create-transparent-pngs/92868
- **imageSize 2K SDK bug:** https://discuss.ai.google.dev/t/imagesize-2k-parameter-ignored-in-google-genai-sdk-but-works-in-ai-studio/111364
- **Sharp documentation:** https://sharp.pixelplumbing.com/
- **Sharp color-to-transparent (issue #1648):** https://github.com/lovell/sharp/issues/1648
- **Game sprite generation lessons (Robotic Ape, March 2026):** https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/
- **Imagen 4 API guide (Scalevise):** https://scalevise.com/resources/imagen-4-api-guide/
- **Imagen 4 prompting guide (Atlabs AI):** https://www.atlabs.ai/blog/imagen-4-prompting-guide

### Flags for Later Phases
- **Phase 1:** Build asset processor that reads from `assets/raw/`, optimizes, atlas-packs, generates typed manifest. Consumes `scripts/types.ts` for the file naming contract.
- **Phase 2:** Integrate assets via manifest — car sprites, track backgrounds, textures
- **Post-June 2026:** If assets need regeneration after Imagen 4 sunset, migrate to `gemini-3-pro-image-preview` or `gemini-2.5-flash-image`
- **Spec update:** Replace all "Gemini Imagen 3" references with "Gemini Imagen 4" and update model ID throughout. Reconcile manifest naming convention.
