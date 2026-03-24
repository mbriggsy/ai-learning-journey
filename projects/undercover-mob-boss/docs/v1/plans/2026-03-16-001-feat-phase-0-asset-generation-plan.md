---
title: "Phase 0: Asset Generation — Visual Assets + Narrator Audio"
type: feat
status: active
date: 2026-03-16
phase: 0
deepened: true
---

# Phase 0: Asset Generation

## Overview

Initialize the UMB project and build two automated generation pipelines: one for 11 visual assets via Gemini Imagen 4, one for ~24 narrator audio lines via ElevenLabs TTS. Both pipelines run as CLI scripts with zero manual steps. The Imagen 4 pipeline is ported from the proven racer-04 reference implementation; the ElevenLabs pipeline is greenfield.

## Problem Statement / Motivation

The game cannot be built without its visual and audio assets. Every screen in the spec depends on role cards, policy cards, vote cards, executive power cards, or a background. Every key game moment depends on narrator audio. Phase 0 produces these artifacts so all subsequent phases can reference real assets.

## Proposed Solution

### Part 1: Project Initialization

Initialize the project from scratch — no code exists yet.

1. **Create `package.json`** via `pnpm init`
2. **Install dependencies** (exact versions researched 2026-03-16):
   - `@google/genai@^1.45.0` — Gemini Imagen 4 SDK (latest stable, GA, supports imagen-4.0-generate-001)
   - `sharp@^0.34.5` — image post-processing (resize, chroma-key, format conversion)
   - `tsx@^4.21.0` — TypeScript script runner (zero-config, `--env-file` support)
   - `@elevenlabs/elevenlabs-js@^2.38.1` — ElevenLabs TTS SDK (official, actively maintained, typed)
   - `typescript@^5.9.3` — dev dependency (latest stable; TS 6.0 is RC only)
   - `vitest@^4.1.0` — dev dependency (testing, used in later phases but install now)
   - `vite@^8.0.0` — dev dependency (build tool with Rolldown bundler, used in later phases)
   - `vite-plugin-pwa@^1.2.0` — dev dependency (PWA service worker, used in Phase 6)

   ```bash
   pnpm add @google/genai sharp tsx @elevenlabs/elevenlabs-js
   pnpm add -D typescript vitest vite vite-plugin-pwa @types/node
   ```

   Add to `package.json`:
   ```json
   {
     "pnpm": {
       "onlyBuiltDependencies": ["sharp"]
     }
   }
   ```

3. **Create `tsconfig.json`** — port from racer-04, adapt includes for UMB structure:

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "esModuleInterop": true,
       "outDir": "./dist",
       "rootDir": ".",
       "declaration": true,
       "sourceMap": true,
       "isolatedModules": true,
       "moduleDetection": "force",
       "skipLibCheck": true
     },
     "include": ["src/**/*", "scripts/**/*"],
     "exclude": ["node_modules", "dist", "tests"]
   }
   ```

   Key differences from racer-04: `rootDir` is `.` (not `./src`) because `scripts/` lives outside `src/`. `include` covers both `src/**/*` and `scripts/**/*`. Added `skipLibCheck` to speed up builds.

4. **Scaffold directory structure** per SPEC.md:
   ```
   src/client/views/
   src/client/audio/
   src/client/state/
   src/server/game/
   src/shared/
   public/assets/
   public/audio/
   public/fonts/
   scripts/
   tests/unit/
   tests/integration/
   assets/raw/          # gitignored — raw Imagen outputs before processing
   ```

5. **Create `.env.example`** documenting required env vars (without values):

   ```bash
   # .env.example — Copy to .env and fill in values
   # NEVER commit .env to git

   # Gemini Imagen 4 — get key from https://aistudio.google.com/apikey
   # Requires billing enabled for Imagen 4 (~$0.06/image)
   GEMINI_API_KEY=

   # ElevenLabs TTS — get key from https://elevenlabs.io/app/settings/api-keys
   ELEVENLABS_API_KEY=

   # ElevenLabs Voice ID — pick from voice library or use a cloned voice
   # Recommended voices for noir narrator: "George" (warm, trustworthy),
   # "Callum" (intense, dramatic), or "Austin" (deep, gravelly)
   # Browse: https://elevenlabs.io/voice-library
   ELEVENLABS_VOICE_ID=
   ```

6. **Create `vercel.json`** — port COOP/COEP headers from racer-04 (identical):

   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Cross-Origin-Opener-Policy",
             "value": "same-origin"
           },
           {
             "key": "Cross-Origin-Embedder-Policy",
             "value": "require-corp"
           }
         ]
       }
     ]
   }
   ```

   These headers are required for `SharedArrayBuffer` support (needed by PartyKit/WebSocket in later phases) and PWA service worker registration.

7. **Create `CLAUDE.md`** — project-level build instructions:

   ```markdown
   # Undercover Mob Boss — Build Instructions

   ## Project Type
   TypeScript browser game (PWA) with PartyKit multiplayer.
   1940s noir social deduction game — digital adaptation of Secret Hitler (CC BY-NC-SA 4.0).

   ## Tech Stack
   - **Build:** Vite 8 + TypeScript 5.9
   - **Testing:** Vitest 4
   - **Multiplayer:** PartyKit (added in Phase 2)
   - **Assets:** Gemini Imagen 4 (pre-generated)
   - **Audio:** ElevenLabs TTS (pre-generated)
   - **Hosting:** Vercel

   ## Commands
   ```bash
   pnpm install              # install dependencies
   pnpm run dev              # start vite dev server (Phase 1+)
   pnpm run build            # production build (Phase 1+)
   pnpm run test             # run vitest (Phase 1+)
   pnpm run typecheck        # tsc --noEmit
   pnpm run generate-assets  # generate visual assets via Imagen 4
   pnpm run generate-narrator # generate narrator audio via ElevenLabs
   ```

   ## Key Directories
   - `src/client/` — browser-side code (views, audio, state)
   - `src/server/` — PartyKit server (room logic, game engine)
   - `src/shared/` — types shared between client + server
   - `public/assets/` — AI-generated images (committed to git)
   - `public/audio/` — pre-generated narrator MP3s (committed to git)
   - `scripts/` — asset generation pipelines (Imagen 4, ElevenLabs)
   - `assets/raw/` — raw Imagen outputs before processing (gitignored)

   ## Environment Variables
   See `.env.example`. Requires:
   - `GEMINI_API_KEY` — Gemini API with billing enabled
   - `ELEVENLABS_API_KEY` — ElevenLabs API key
   - `ELEVENLABS_VOICE_ID` — voice ID for narrator

   ## Architectural Decisions
   - See `docs/spec/SPEC.md` for full spec (LOCKED)
   - See `docs/user/RULES.md` for player-facing rules
   - Host device is authoritative (ADR-04)
   - Pre-generated audio, not runtime TTS (ADR-02)
   - All assets AI-generated via Imagen 4 (ADR-05)

   ## Conventions
   - Use Mermaid for technical diagrams
   - All prompts versioned in `scripts/` (never regenerate without prompt changes)
   - Sequential API calls with delays (rate limit safety)
   - Chroma-key BEFORE resize (prevents color bleeding)
   ```

8. **Add `package.json` scripts:**
   ```json
   {
     "scripts": {
       "generate-assets": "tsx --env-file=.env scripts/generate-assets.ts",
       "generate-narrator": "tsx --env-file=.env scripts/generate-narrator.ts",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

### Part 2: Visual Asset Pipeline (Imagen 4)

Port the proven racer-04 pipeline architecture. 4-module structure:

**`scripts/types.ts`** — shared types

Adapted from racer-04 `scripts/types.ts`. Key simplifications: UMB has only two post-processing modes (`chroma-key-then-resize` and `resize`), no `crop-and-resize`. No spritesheet types needed.

```typescript
// --- Prompt & Asset Definitions ---

export type PostProcessing =
  | { kind: 'resize' }
  | { kind: 'chroma-key-then-resize' };

export interface AssetPrompt {
  readonly name: string;
  readonly promptSuffix: string;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly aspectRatio: '3:4' | '1:1' | '16:9';
  readonly needsTransparency: boolean;
  readonly postProcess: PostProcessing;
}

// --- Generation Log ---

export interface GenerationLogEntry {
  name: string;
  status: 'success' | 'failed';
  promptHash: string;
  dimensions: { width: number; height: number } | null;
  hasAlpha: boolean | null;
  failureReason?: string;
  generatedAt: string;
}

export interface GenerationLog {
  generatedAt: string;
  model: string;
  sdkVersion: string;
  assets: GenerationLogEntry[];
  summary: { total: number; succeeded: number; failed: number };
}

// --- Narrator Types ---

export interface NarratorPrompt {
  readonly id: string;
  readonly trigger: string;
  readonly script: string;
}

export interface NarratorLogEntry {
  id: string;
  status: 'success' | 'failed';
  fileSizeBytes: number | null;
  durationMs: number | null;
  failureReason?: string;
  generatedAt: string;
}

export interface NarratorLog {
  generatedAt: string;
  model: string;
  voiceId: string;
  lines: NarratorLogEntry[];
  summary: { total: number; succeeded: number; failed: number };
}
```

**`scripts/asset-prompts.ts`** — all 11 visual asset definitions

| # | ID | Description | Dimensions | Transparency | Notes |
|---|---|---|---|---|---|
| 1 | `role-citizen` | 1940s city worker, honest face, noir | 768x1024 | Yes | Role card overlay |
| 2 | `role-mob-soldier` | Shadowy figure, fedora, menacing | 768x1024 | Yes | Role card overlay |
| 3 | `role-mob-boss` | Silhouette, power pose, backlit | 768x1024 | Yes | Role card overlay |
| 4 | `policy-good` | City seal, clean, official | 768x1024 | Yes | Policy card overlay |
| 5 | `policy-bad` | Dark, cracked, corrupt | 768x1024 | Yes | Policy card overlay |
| 6 | `background` | Noir city skyline, night | 1920x1080 | No | Host/table view background |
| 7 | `vote-approve` | Green, clean design | 512x512 | Yes | Vote button overlay |
| 8 | `vote-block` | Red, harsh design | 512x512 | Yes | Vote button overlay |
| 9 | `power-investigate` | Magnifying glass, noir detective | 768x1024 | Yes | Executive power card |
| 10 | `power-nominate` | Gavel, authoritative | 768x1024 | Yes | Executive power card |
| 11 | `power-execute` | Dark silhouette, elimination | 768x1024 | Yes | Executive power card |

**Refined STYLE_PREFIX** (based on Imagen 4 best practices — descriptive layered prompts, explicit style anchoring, embedded negative framing since `negativePrompt` is not supported):

```typescript
/**
 * Style prefix prepended to ALL prompts for visual consistency.
 *
 * Imagen 4 best practices applied:
 * - Lead with explicit art style to prevent photorealistic default
 * - Layer descriptive modifiers for lighting, texture, color palette
 * - Embed negatives directly ("NOT photographic") since Imagen 4
 *   ignores the negativePrompt config parameter
 * - Keep boosters to 2-3 max to avoid muddy output
 * - Magenta background suffix added per-asset for chroma-key extraction
 */
export const STYLE_PREFIX =
  '1940s film noir illustration, hand-drawn ink and wash style, dramatic chiaroscuro lighting with deep blacks and harsh highlights, sepia-toned with desaturated warm palette, vintage halftone texture, atmospheric smoke and shadow, stylized NOT photographic, NOT 3D render, NOT realistic, no watermarks, no text overlay, no logos, ';

/**
 * Chroma-key background suffix — appended to all assets needing transparency.
 * Imagen 4 cannot produce native transparent PNGs. We generate on a solid
 * magenta background and strip it with Sharp in post-processing.
 */
const CHROMA_BG_SUFFIX =
  'on a solid flat bright magenta background EXACT hex #FF00FF, NO gradients, NO noise, NO texture on background, clean sharp edges against background';
```

Full asset definitions:

```typescript
import type { AssetPrompt } from './types.js';

export const ASSET_PROMPTS = [
  // --- Role Cards (3) ---
  {
    name: 'role-citizen',
    promptSuffix: `portrait of a 1940s honest city worker, clean-shaven, wearing a newsboy cap and suspenders, trustworthy expression, warm lighting on face, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'role-mob-soldier',
    promptSuffix: `portrait of a menacing 1940s mobster, wearing a dark fedora pulled low, trench coat with upturned collar, face partially in shadow, cigarette smoke wisps, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'role-mob-boss',
    promptSuffix: `dramatic silhouette of a powerful figure, backlit by a single overhead lamp, power pose with arms folded, fedora, thick cigar glow in darkness, only the outline and highlights visible, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Policy Cards (2) ---
  {
    name: 'policy-good',
    promptSuffix: `ornate 1940s official city seal on parchment, eagle emblem, laurel wreath border, clean government document style, embossed gold lettering border, dignified and official, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'policy-bad',
    promptSuffix: `dark cracked document, 1940s city seal corrupted and broken, ink splattered, torn edges, ominous red wax seal, sense of decay and corruption, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Background (1) ---
  {
    name: 'background',
    promptSuffix: 'panoramic 1940s noir city skyline at night, rain-slicked streets reflecting neon signs, dark alleyways, steam rising from manholes, moonlight through clouds, cinematic wide establishing shot, moody atmospheric perspective',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },

  // --- Vote Cards (2) ---
  {
    name: 'vote-approve',
    promptSuffix: `1940s style rubber stamp imprint reading APPROVED in bold block letters, green ink on aged paper texture, clean circular stamp border, official government stamp aesthetic, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'vote-block',
    promptSuffix: `1940s style rubber stamp imprint reading BLOCKED in bold block letters, harsh red ink on aged paper texture, angular stamp border, aggressive official denial stamp, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Executive Power Cards (3) ---
  {
    name: 'power-investigate',
    promptSuffix: `noir detective magnifying glass held up, examining a dossier folder, dramatic single desk lamp lighting, smoke curling, investigation scene, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'power-nominate',
    promptSuffix: `1940s wooden judge gavel on a desk, authoritative, dark wood grain, brass details, dramatic overhead lighting, sense of power and authority, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'power-execute',
    promptSuffix: `dark dramatic silhouette of a hand drawing a line through a name on a list, crossed out name, dim red lighting, ominous elimination scene, sense of finality, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
] as const satisfies readonly AssetPrompt[];

/** Union of all valid asset names — used to validate --only CLI arg. */
export type AssetName = (typeof ASSET_PROMPTS)[number]['name'];

/** Set of valid asset names for runtime validation. */
export const ASSET_NAMES = new Set(ASSET_PROMPTS.map((p) => p.name));
```

Uses `as const satisfies` pattern for compile-time `--only` validation (same pattern as racer-04).

**`scripts/image-processing.ts`** — port from racer-04

Direct port of the chroma-key algorithm. The UMB version is simpler — no `cropAndResize`, no `buildAtlas`, no `generateSpritesheetJson`. Only two functions needed:

```typescript
import sharp from 'sharp';

const MAX_INPUT_PIXELS = 4096 * 4096;
const TOLERANCE_INNER = 30; // Below = fully transparent
const TOLERANCE_OUTER = 80; // Above = fully opaque; between = gradient alpha

/**
 * Auto-detect background color by sampling corner pixels.
 * Returns median R, G, B from the four corners.
 *
 * Ported from racer-04. The Imagen 4 API does not produce exact #FF00FF —
 * the actual magenta varies per generation, so we detect empirically.
 */
function detectBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  const corners = [
    0,                              // top-left
    (width - 1) * 4,               // top-right
    (width * (height - 1)) * 4,    // bottom-left
    (width * height - 1) * 4,      // bottom-right
  ];

  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (const i of corners) {
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return Math.round((sorted[1] + sorted[2]) / 2);
  };

  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * Two-pass chroma-key removal with soft alpha ramp and color decontamination.
 *
 * Pass 1: Compute alpha from color distance to detected background.
 * Pass 2: Remove color spill from semi-transparent edge pixels.
 *
 * MUST be called at full resolution BEFORE resizing to avoid color bleed.
 */
export async function chromaKeyRemove(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = detectBackgroundColor(data, info.width, info.height);
  console.log(`    Detected background color: R=${bg.r} G=${bg.g} B=${bg.b}`);

  // Pass 1 — Soft alpha from color distance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);

    if (dist <= TOLERANCE_INNER) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
    } else if (dist < TOLERANCE_OUTER) {
      data[i + 3] = Math.round(
        ((dist - TOLERANCE_INNER) / (TOLERANCE_OUTER - TOLERANCE_INNER)) * 255,
      );
    }
  }

  // Pass 2 — Color decontamination (remove background spill)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[i]     = Math.round(Math.max(0, Math.min(255, (data[i]     - bg.r * (1 - a)) / a)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, (data[i + 1] - bg.g * (1 - a)) / a)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, (data[i + 2] - bg.b * (1 - a)) / a)));
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Resize image to target dimensions using lanczos3 kernel. */
export async function resizeAsset(
  buffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** Validate output dimensions and alpha channel. */
export async function validateOutput(
  buffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
  expectAlpha: boolean,
): Promise<{ valid: boolean; width: number; height: number; hasAlpha: boolean }> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const hasAlpha = meta.hasAlpha ?? false;

  const valid =
    width === expectedWidth &&
    height === expectedHeight &&
    (expectAlpha ? hasAlpha : true);

  return { valid, width, height, hasAlpha };
}
```

**Note on noir-specific tolerance tuning:** The racer-04 defaults (TOLERANCE_INNER=30, TOLERANCE_OUTER=80) work well for bright-colored car sprites on magenta. UMB's noir palette is darker overall, which may cause the color distance from dark image areas to magenta to be larger — actually making chroma-key easier. However, if dark areas (backlit silhouettes, deep shadows) get partial transparency, increase TOLERANCE_INNER to 40-50 on a per-test basis. Test with `role-mob-boss` first as it's the darkest asset.

**`scripts/generate-assets.ts`** — main pipeline script

Structural port from racer-04 `scripts/generate-assets.ts`. Key structure:

```typescript
import { GoogleGenAI } from '@google/genai';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

import { ASSET_NAMES, ASSET_PROMPTS, STYLE_PREFIX } from './asset-prompts.js';
import { chromaKeyRemove, resizeAsset, validateOutput } from './image-processing.js';
import type { AssetPrompt, GenerationLog, GenerationLogEntry } from './types.js';

const MODEL = 'imagen-4.0-generate-001';
const INTER_CALL_DELAY_MS = 7_000;   // 7s between calls (safe for 10 IPM limit)
const CALL_TIMEOUT_MS = 60_000;       // 60s per API call
const OUTPUT_DIR = resolve('public/assets');
const RAW_DIR = resolve('assets/raw');

// CLI: --only {id}, --dry-run
// Sequential execution, retry on 429/5xx, incremental log
// See racer-04 generate-assets.ts for full implementation pattern
```

- CLI args via `node:util parseArgs`: `--only {id}`, `--dry-run`
- Sequential execution (Tier 1 rate limit: 10 IPM)
- 7-second inter-call delay
- 60-second per-call timeout via `AbortSignal.timeout()`
- Imagen 4 config: `enhancePrompt: false`, `numberOfImages: 1`, `personGeneration: "DONT_ALLOW"`
- Safety filter handling: check for empty `generatedImages` array (API returns 200, not error)
- Retry on 429/5xx: up to 3 retries with exponential backoff
- Write to `public/assets/{id}.png` (transparent) or `public/assets/{id}.jpg` (background)
- Save raw originals to `assets/raw/{id}.png` (gitignored)
- Incremental generation log: `public/assets/generation-log.json` (write after each asset)
- Exit code 0 on full success, 1 on any failure
- Console output: progress bar, success/fail per asset, summary

### Part 3: Narrator Audio Pipeline (ElevenLabs TTS)

Greenfield build following the same structural patterns as the visual pipeline.

#### ElevenLabs API Details (researched 2026-03-16)

**Endpoint:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

**Authentication:**
```
Header: xi-api-key: {ELEVENLABS_API_KEY}
Content-Type: application/json
```

**Request body:**
```json
{
  "text": "The script text to speak",
  "model_id": "eleven_multilingual_v2",
  "output_format": "mp3_44100_128",
  "voice_settings": {
    "stability": 0.65,
    "similarity_boost": 0.80,
    "style": 0.35,
    "use_speaker_boost": true,
    "speed": 0.9
  }
}
```

**Response:** Binary audio stream (`application/octet-stream`). Returns `ReadableStream<Uint8Array>` via SDK.

**Voice settings rationale for noir narrator:**
- `stability: 0.65` — slightly below default (0.5 is max variation). We want some emotional range for dramatic delivery but not so much that consecutive lines sound like different people.
- `similarity_boost: 0.80` — high adherence to the original voice character. Keeps the narrator consistent across 38 lines.
- `style: 0.35` — moderate style exaggeration. Adds theatrical flair without going over the top.
- `use_speaker_boost: true` — enhances speaker similarity at slight compute cost (acceptable for batch generation).
- `speed: 0.9` — slightly slower than default for deliberate, dramatic delivery.

**Model choice:** `eleven_multilingual_v2` — the most emotionally expressive model with rich prosody. Best for narration with dramatic delivery. 10,000 character limit per request (more than enough for our longest line at ~150 chars). Not using `eleven_v3` because it's newer and less battle-tested; not using Flash models because we don't need low latency for batch generation.

**Output format:** `mp3_44100_128` — 44.1kHz sample rate, 128kbps bitrate. This is the default and provides good quality at reasonable file size (~1KB per second of audio). Our lines average 3-8 seconds, so ~3-8KB per file. Total for 38 files: ~200KB.

**Rate limits (researched):**
- Concurrency limits by tier: Free=2, Starter=3, Creator=5, Pro=10
- No documented requests-per-minute cap — concurrency is the primary throttle
- For sequential generation (concurrency=1), a 2-second inter-call delay is conservative
- 429 responses include `Retry-After` header — respect it
- Free tier: 10,000 credits/month (~20 min audio). Our 38 lines at ~5s avg = ~190s = ~3.2 min. Fits in free tier.

**SDK:** `@elevenlabs/elevenlabs-js@^2.38.1` — official, actively maintained, full TypeScript types. The older `elevenlabs` package (1.59.0) is deprecated. The SDK's `textToSpeech.convert()` returns a `ReadableStream<Uint8Array>` that must be consumed via `for await...of` and written to a file.

**`scripts/narrator-prompts.ts`** — all 38 narrator line definitions with full script text

```typescript
import type { NarratorPrompt } from './types.js';

/**
 * All narrator lines for Undercover Mob Boss.
 *
 * Voice direction: 1940s noir detective narrator — gravelly, deliberate,
 * theatrical. Think Raymond Chandler audiobook meets Rod Serling.
 * Pauses indicated by ellipsis (...) in the script text.
 *
 * Total: 38 lines (15 round-start variants + 23 unique event lines)
 */
export const NARRATOR_PROMPTS = [
  // --- Game Start ---
  {
    id: 'intro',
    trigger: 'Game start',
    script: 'Citizens of Millbrook City... your fate has been sealed. Check your phone. Know your allegiance. And whatever you do... don\'t let it show.',
  },

  // --- Round Start (15 pre-generated variants) ---
  {
    id: 'round-start-1',
    trigger: 'Round 1',
    script: 'Round one. The city holds its breath.',
  },
  {
    id: 'round-start-2',
    trigger: 'Round 2',
    script: 'Round two. The city holds its breath.',
  },
  {
    id: 'round-start-3',
    trigger: 'Round 3',
    script: 'Round three. The city holds its breath.',
  },
  {
    id: 'round-start-4',
    trigger: 'Round 4',
    script: 'Round four. The city holds its breath.',
  },
  {
    id: 'round-start-5',
    trigger: 'Round 5',
    script: 'Round five. The city holds its breath.',
  },
  {
    id: 'round-start-6',
    trigger: 'Round 6',
    script: 'Round six. The tension builds.',
  },
  {
    id: 'round-start-7',
    trigger: 'Round 7',
    script: 'Round seven. Alliances are fracturing.',
  },
  {
    id: 'round-start-8',
    trigger: 'Round 8',
    script: 'Round eight. Trust is a luxury no one can afford.',
  },
  {
    id: 'round-start-9',
    trigger: 'Round 9',
    script: 'Round nine. The city is running out of time.',
  },
  {
    id: 'round-start-10',
    trigger: 'Round 10',
    script: 'Round ten. The walls are closing in.',
  },
  {
    id: 'round-start-11',
    trigger: 'Round 11',
    script: 'Round eleven. Every vote could be the last.',
  },
  {
    id: 'round-start-12',
    trigger: 'Round 12',
    script: 'Round twelve. The city teeters on the edge.',
  },
  {
    id: 'round-start-13',
    trigger: 'Round 13',
    script: 'Round thirteen. Unlucky for someone.',
  },
  {
    id: 'round-start-14',
    trigger: 'Round 14',
    script: 'Round fourteen. The end is near... for someone.',
  },
  {
    id: 'round-start-15',
    trigger: 'Round 15',
    script: 'Round fifteen. If this city survives the night... it\'ll be a miracle.',
  },

  // --- Election Phase ---
  {
    id: 'nomination',
    trigger: 'Mayor nominates Police Chief',
    script: 'The Mayor has nominated the Police Chief. The city watches. The mob waits.',
  },
  {
    id: 'vote-open',
    trigger: 'Voting begins',
    script: 'Cast your vote. Approve... or block. No one will know. Until everyone knows.',
  },
  {
    id: 'vote-reveal',
    trigger: 'Votes revealed',
    script: 'The votes are in. Democracy... has spoken. Or has it?',
  },
  {
    id: 'approved',
    trigger: 'Nomination passes',
    script: 'The nomination passes. The city has chosen.',
  },
  {
    id: 'blocked',
    trigger: 'Nomination fails',
    script: 'Blocked. The people have spoken. For now.',
  },

  // --- Election Tracker ---
  {
    id: 'tracker-advance',
    trigger: 'Election tracker moves',
    script: 'Three failed nominations. The city cannot afford indecision.',
  },
  {
    id: 'auto-enact',
    trigger: 'Tracker hits 3',
    script: 'The deadlock ends. A policy is enacted without a vote.',
  },

  // --- Policy Enactment ---
  {
    id: 'good-policy',
    trigger: 'Good policy enacted',
    script: 'A good policy for Millbrook City. The citizens breathe a little easier.',
  },
  {
    id: 'bad-policy',
    trigger: 'Bad policy enacted',
    script: 'Another bad policy. The mob smiles.',
  },

  // --- Executive Powers ---
  {
    id: 'investigate',
    trigger: 'Investigate power activated',
    script: 'The Police Chief has demanded an investigation. Someone\'s cover is about to get a little thinner.',
  },
  {
    id: 'special-nomination',
    trigger: 'Special nomination power activated',
    script: 'The Police Chief will choose the next Mayor. Democracy takes a back seat.',
  },
  {
    id: 'execution',
    trigger: 'Execution power activated',
    script: 'One player will be eliminated. Choose carefully. The mob is counting on your mistakes.',
  },
  {
    id: 'executed',
    trigger: 'Player eliminated',
    script: 'A player has been eliminated. Whether they were friend or foe... you\'ll find out soon enough.',
  },

  // --- Game End: Citizens Win ---
  {
    id: 'mob-boss-executed',
    trigger: 'Mob Boss eliminated by execution',
    script: 'The Mob Boss is dead. Millbrook City is saved.',
  },
  {
    id: 'citizens-win-policy',
    trigger: '5 good policies enacted',
    script: 'Five good policies enacted. Millbrook City is saved. The mob has lost.',
  },
  {
    id: 'citizens-win-execution',
    trigger: 'Mob Boss found and executed',
    script: 'The Mob Boss has been found and eliminated. The city is free.',
  },

  // --- Game End: Mob Wins ---
  {
    id: 'mob-wins-policy',
    trigger: '6 bad policies enacted',
    script: 'Six bad policies enacted. Millbrook City belongs to the mob. Game over.',
  },
  {
    id: 'mob-wins-election',
    trigger: 'Mob Boss elected Police Chief after 3+ bad policies',
    script: 'The Mob Boss has taken office. The city never saw it coming. Game over.',
  },

  // --- Deck & Veto Mechanics ---
  {
    id: 'deck-reshuffle',
    trigger: 'Policy deck reshuffled (random threshold 3-7)',
    script: 'The policy deck has been reshuffled. The city\'s memory... is short.',
  },
  {
    id: 'veto-proposed',
    trigger: 'Police Chief proposes veto (after 5 bad policies)',
    script: 'The Police Chief has proposed a veto. The Mayor must decide.',
  },
  {
    id: 'veto-approved',
    trigger: 'Mayor agrees to veto',
    script: 'The veto stands. Both policies are discarded. The clock ticks.',
  },
  {
    id: 'veto-rejected',
    trigger: 'Mayor refuses veto',
    script: 'The Mayor refuses the veto. A policy must be enacted.',
  },
] as const satisfies readonly NarratorPrompt[];

/** Union of all valid narrator IDs — used to validate --only CLI arg. */
export type NarratorId = (typeof NARRATOR_PROMPTS)[number]['id'];

/** Set of valid narrator IDs for runtime validation. */
export const NARRATOR_IDS = new Set(NARRATOR_PROMPTS.map((p) => p.id));
```

Total: **38 audio files** (15 round-start variants + 23 unique lines)

**`scripts/generate-narrator.ts`** — main pipeline script

```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { NARRATOR_IDS, NARRATOR_PROMPTS } from './narrator-prompts.js';
import type { NarratorLog, NarratorLogEntry } from './types.js';

// --- Constants ---

const MODEL = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';
const INTER_CALL_DELAY_MS = 2_000;      // 2s between calls (conservative for concurrency=1)
const RETRY_DELAY_MS = 5_000;            // 5s backoff on 429
const MAX_RETRIES = 3;
const OUTPUT_DIR = resolve('public/audio');

/** Voice settings tuned for noir narrator delivery. */
const VOICE_SETTINGS = {
  stability: 0.65,
  similarity_boost: 0.80,
  style: 0.35,
  use_speaker_boost: true,
  speed: 0.9,
};

// --- CLI Arg Parsing ---

const rawArgs = process.argv.slice(2).filter((a) => a !== '--');
const { values } = parseArgs({
  args: rawArgs,
  options: {
    only: { type: 'string', multiple: true },
    'dry-run': { type: 'boolean', default: false },
  },
  allowPositionals: false,
  strict: true,
});

const dryRun = values['dry-run'] ?? false;
const onlyIds = values.only ?? [];

// Validate --only IDs
for (const id of onlyIds) {
  if (!NARRATOR_IDS.has(id)) {
    console.error(
      `ERROR: Unknown narrator ID "${id}". Valid IDs: ${[...NARRATOR_IDS].join(', ')}`,
    );
    process.exit(1);
  }
}

const linesToGenerate =
  onlyIds.length > 0
    ? NARRATOR_PROMPTS.filter((p) => onlyIds.includes(p.id))
    : [...NARRATOR_PROMPTS];

// --- API Key Validation ---

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;

if (!apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY not set. Add it to .env (see .env.example).');
  process.exit(1);
}
if (!voiceId) {
  console.error('ERROR: ELEVENLABS_VOICE_ID not set. Add it to .env (see .env.example).');
  process.exit(1);
}

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Consume a ReadableStream into a Buffer. */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Validate MP3 header — first 2 bytes should be 0xFF 0xFB (or 0xFF 0xF3/0xF2). */
function isValidMp3(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // MP3 frame sync: first 11 bits are all 1s (0xFF followed by 0xE0+ mask)
  return buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
}

async function writeLogIncrementally(log: NarratorLog): Promise<void> {
  await writeFile(
    resolve(OUTPUT_DIR, 'generation-log.json'),
    JSON.stringify(log, null, 2),
    'utf-8',
  );
}

// --- Single Line Generation (with retry) ---

async function generateOne(
  client: ElevenLabsClient,
  id: string,
  script: string,
  index: number,
  total: number,
): Promise<{ buffer: Buffer | null; error?: string }> {
  console.log(`\nGenerating "${id}"... (${index + 1}/${total})`);
  console.log(`  Script: "${script.slice(0, 80)}${script.length > 80 ? '...' : ''}"`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would call ElevenLabs TTS with model ${MODEL}`);
    return { buffer: null };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const audioStream = await client.textToSpeech.convert(voiceId!, {
        text: script,
        modelId: MODEL,
        outputFormat: OUTPUT_FORMAT,
        voiceSettings: VOICE_SETTINGS,
      });

      const buffer = await streamToBuffer(audioStream);

      if (buffer.length === 0) {
        return { buffer: null, error: 'Empty audio response' };
      }

      if (!isValidMp3(buffer)) {
        return { buffer: null, error: 'Invalid MP3 header in response' };
      }

      console.log(`  Audio received (${buffer.length} bytes)`);
      return { buffer };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof Error && 'statusCode' in e
        ? (e as { statusCode: number }).statusCode
        : null;

      if (status === 401 || status === 403) {
        console.error(`  FATAL: Auth error (${status}): ${msg}`);
        process.exit(1);
      }

      if (status === 429 && attempt < MAX_RETRIES - 1) {
        console.warn(`  Rate limited (429). Waiting ${RETRY_DELAY_MS / 1000}s and retrying...`);
        await delay(RETRY_DELAY_MS * (attempt + 1)); // exponential-ish backoff
        continue;
      }

      if (status && status >= 500 && attempt < MAX_RETRIES - 1) {
        console.warn(`  Server error (${status}). Retrying...`);
        await delay(RETRY_DELAY_MS);
        continue;
      }

      return { buffer: null, error: `${status ? `HTTP ${status}: ` : ''}${msg}` };
    }
  }

  return { buffer: null, error: 'Max retries exceeded' };
}

// --- Main ---

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const client = new ElevenLabsClient({ apiKey });

  const log: NarratorLog = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    voiceId: voiceId!,
    lines: [],
    summary: { total: linesToGenerate.length, succeeded: 0, failed: 0 },
  };

  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (let i = 0; i < linesToGenerate.length; i++) {
    const line = linesToGenerate[i];
    const { buffer, error } = await generateOne(client, line.id, line.script, i, linesToGenerate.length);

    if (dryRun) {
      results.push({ id: line.id, status: 'dry-run' });
      continue;
    }

    const entry: NarratorLogEntry = {
      id: line.id,
      status: buffer ? 'success' : 'failed',
      fileSizeBytes: buffer?.length ?? null,
      durationMs: null, // Could parse MP3 header for duration; skip for now
      generatedAt: new Date().toISOString(),
    };

    if (buffer) {
      const outPath = resolve(OUTPUT_DIR, `${line.id}.mp3`);
      await writeFile(outPath, buffer);
      console.log(`  Saved: ${outPath}`);
      log.summary.succeeded++;
      results.push({ id: line.id, status: 'success' });
    } else {
      entry.status = 'failed';
      entry.failureReason = error;
      log.summary.failed++;
      results.push({ id: line.id, status: 'FAILED', error });
    }

    log.lines.push(entry);
    await writeLogIncrementally(log);

    // Delay between calls (skip after last)
    if (i < linesToGenerate.length - 1) {
      await delay(INTER_CALL_DELAY_MS);
    }
  }

  // Summary
  console.log('\n=== Generation Summary ===\n');
  console.table(results);

  if (!dryRun) {
    console.log(`\nTotal: ${log.summary.total} | Succeeded: ${log.summary.succeeded} | Failed: ${log.summary.failed}`);
  }

  if (log.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
```

Key implementation details:
- CLI args via `node:util parseArgs`: `--only {id}`, `--dry-run`
- ElevenLabs config: voice ID from `.env`, model `eleven_multilingual_v2`, MP3 128kbps
- Sequential execution with 2s inter-call delay (concurrency=1, well within all tier limits)
- SDK returns `ReadableStream<Uint8Array>` — consumed via `for await...of` into `Buffer`
- MP3 validation: check frame sync bits (0xFF followed by 0xE0+ mask) and non-zero size
- Write to `public/audio/{id}.mp3`
- Incremental generation log: `public/audio/generation-log.json`
- Retry on 429/5xx: up to 3 retries with increasing backoff (5s, 10s, 15s)
- Exit code 0 on full success, 1 on any failure

### Part 4: Spec & Rules Corrections

During Phase 0, fix the discovered discrepancies:

1. **SPEC.md** — correct asset count from 9 to 11 in acceptance criteria
2. **SPEC.md** — add `deck-reshuffle`, `veto-proposed`, `veto-approved`, `veto-rejected` to narrator table
3. **SPEC.md** — update `executed` line to remove `[Name]`, make generic
4. **SPEC.md** — update `round-start` to note pre-generated variants 1–15
5. **RULES.md** — remove "blocking Mob Boss = citizen win" (line ~115) — follows SH rules (blocking prevents loss, game continues)
6. **RULES.md** — update executive power table to vary by player count (match SPEC.md board layout table)
7. **ENVIRONMENT-SETUP.md** — correct narrator line count

## Technical Considerations

### Imagen 4 Critical Gotchas (from racer-04)
- `enhancePrompt` must be explicitly `false` — defaults to `true`, rewrites prompts
- `numberOfImages` must be explicitly `1` — may default to 4
- Safety filters return HTTP 200 with empty array — must check response, not catch exceptions
- No native transparent PNG — chroma-key on magenta background + Sharp stripping
- Chroma-key BEFORE resize — prevents color bleeding
- Sequential calls only — Tier 1 rate limit is 10 IPM, 7s delay is safe
- Avoid "crowds"/"spectators" in prompts — triggers person-generation safety filters
- `personGeneration: "DONT_ALLOW"` — set explicitly because role card prompts describe people (but as illustrations, not photos). If safety filter blocks, try `"ALLOW_ADULT"` as fallback.
- Imagen 4 prompt best practices: lead with explicit art style, use descriptive layered modifiers, embed negatives directly in prompt text ("NOT photographic"), keep style boosters to 2-3 max
- **Imagen 4 sunsets June 24, 2026** — commit approved assets to git
- **@google/genai SDK** is at v1.45.0 (GA, actively maintained). The older `@google/generative-ai` package is deprecated.

### ElevenLabs Details (researched 2026-03-16)
- **SDK:** `@elevenlabs/elevenlabs-js@^2.38.1` — official, typed, actively maintained. The older `elevenlabs` package (1.59.0) is deprecated.
- **API endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` — auth via `xi-api-key` header
- **Rate limits:** Concurrency-based (Free=2, Starter=3, Creator=5, Pro=10). No RPM cap. Sequential calls with 2s delay is safe.
- **Free tier budget:** 10,000 credits/month (~20 min audio). Our 38 lines at ~5s avg = ~190s = 3.2 min. Well within free tier.
- **Model:** `eleven_multilingual_v2` — best emotional range, 29 languages, 10k char limit. Do not use `eleven_v3` (newer, less tested) or Flash models (optimized for latency, not quality).
- **Voice settings:** `stability: 0.65`, `similarity_boost: 0.80`, `style: 0.35`, `speed: 0.9`. These are starting values — tune after first test generation.
- **Output:** `mp3_44100_128` (default). Returns `ReadableStream<Uint8Array>` via SDK.
- **Recommended voices for noir:** "George" (warm, narration), "Callum" (intense, dramatic), "Austin" (deep, gravelly). Test with a single `intro` line before committing to a voice.
- **SDK pattern:** `client.textToSpeech.convert(voiceId, { text, modelId, outputFormat, voiceSettings })`
- **Previous/next text:** SDK supports `previousText` and `nextText` params for prosody continuity between chunks. Not needed for our use case (each line is independent).

### Dependencies on racer-04 Reference
- `scripts/generate-assets.ts` — structural port (pipeline orchestration, CLI, logging)
- `scripts/image-processing.ts` — direct port (chroma-key algorithm, resize). Simplified: no cropAndResize, no atlas building.
- `scripts/types.ts` — adapt types for UMB assets + add narrator types
- `scripts/asset-prompts.ts` — new content, same `as const satisfies` pattern
- `vercel.json` — direct port (identical)
- `tsconfig.json` — adapt includes (`scripts/**/*` added, `rootDir` changed to `.`)

## Acceptance Criteria

### Project Initialization
- [ ] `package.json` exists with all dependencies at researched versions
- [ ] `pnpm install` succeeds
- [ ] `tsconfig.json` configured (adapted from racer-04)
- [ ] Directory structure scaffolded per SPEC.md
- [ ] `.env.example` documents all required env vars (GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID)
- [ ] `vercel.json` with COOP/COEP headers (ported from racer-04)
- [ ] `CLAUDE.md` with build instructions

### Visual Asset Pipeline
- [ ] `pnpm run generate-assets --dry-run` completes without error
- [ ] `pnpm run generate-assets` produces 11 assets in `public/assets/`
- [ ] `pnpm run generate-assets --only role-citizen` regenerates a single asset
- [ ] All card assets have transparent backgrounds (PNG with alpha)
- [ ] Background asset is opaque JPG at 1920x1080
- [ ] `public/assets/generation-log.json` written with metadata for all assets
- [ ] All prompts versioned in `scripts/asset-prompts.ts`
- [ ] Raw originals saved to `assets/raw/` (gitignored)

### Narrator Audio Pipeline
- [ ] `pnpm run generate-narrator --dry-run` completes without error
- [ ] `pnpm run generate-narrator` produces 38 audio files in `public/audio/`
- [ ] `pnpm run generate-narrator --only intro` regenerates a single line
- [ ] All files are valid MP3, non-zero size
- [ ] `public/audio/generation-log.json` written with metadata
- [ ] All narrator scripts versioned in `scripts/narrator-prompts.ts`
- [ ] Round-start lines 1–15 generated as individual files

### Spec & Rules Corrections
- [ ] SPEC.md asset count corrected to 11
- [ ] SPEC.md narrator table updated (new lines, parameterized line changes)
- [ ] RULES.md blocking-mob-boss win condition removed
- [ ] RULES.md executive power table updated to vary by player count
- [ ] ENVIRONMENT-SETUP.md narrator line count corrected

## Success Metrics

- Both `generate-assets` and `generate-narrator` exit code 0 on full run
- All 11 visual assets visually consistent (noir aesthetic, same style)
- All 38 audio files audibly consistent (same voice, same tone)
- Both scripts are idempotent — re-running produces the same results
- Total generation time < 10 minutes (sequential, with delays)

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Imagen 4 safety filters reject noir prompts | Medium | High | Iterate prompt wording; avoid "violence", "weapons", "blood"; test with single asset first. If `personGeneration: "DONT_ALLOW"` blocks role cards, switch to `"ALLOW_ADULT"`. |
| ElevenLabs rate limits hit on 38 sequential calls | Low | Medium | 2s delay is conservative for concurrency=1. Increase to 5s if needed. Retry with exponential backoff on 429. |
| ElevenLabs voice doesn't match noir aesthetic | Low | High | Test with single `intro` line before full run. Try George, Callum, or Austin voices. Tune stability/style settings. |
| Chroma-key halos on dark/noir images | Medium | Medium | Proven algorithm from racer-04. May need TOLERANCE_INNER increase to 40-50 for darker palette. Test with `role-mob-boss` first. |
| API billing issues | Low | Critical | Verify billing active before running. Free tier ElevenLabs covers our ~3 min of audio. Gemini Imagen 4 costs ~$0.66 for 11 images. |
| @elevenlabs/elevenlabs-js SDK breaking changes | Low | Low | Pin to ^2.38.1. SDK is actively maintained (last release: 5 days ago). Fallback: direct REST via native `fetch()`. |
| Imagen 4 sunset (June 24, 2026) | Certain | Medium | Commit approved assets to git immediately. Prompts versioned for potential re-generation with successor model. |

## Sources & References

### Internal
- Racer-04 asset pipeline: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\scripts\generate-assets.ts`
- Racer-04 image processing: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\scripts\image-processing.ts`
- Racer-04 asset prompts: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\scripts\asset-prompts.ts`
- Racer-04 types: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\scripts\types.ts`
- Racer-04 vercel.json: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\vercel.json`
- Racer-04 tsconfig: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\tsconfig.json`
- Racer-04 package.json: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04\package.json`
- UMB SPEC.md: `docs/spec/SPEC.md`
- UMB RULES.md: `docs/user/RULES.md`
- Deck reshuffle brainstorm: `docs/brainstorms/2026-03-16-deck-reshuffle-brainstorm.md`

### External (researched 2026-03-16)
- [ElevenLabs TTS API — Create Speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs Models Overview](https://elevenlabs.io/docs/overview/models)
- [ElevenLabs Voice Settings](https://elevenlabs.io/docs/api-reference/voices/settings/get)
- [ElevenLabs Rate Limits FAQ](https://help.elevenlabs.io/hc/en-us/articles/14312733311761-How-many-requests-can-I-make-and-can-I-increase-it)
- [ElevenLabs JS SDK — GitHub](https://github.com/elevenlabs/elevenlabs-js)
- [@elevenlabs/elevenlabs-js — npm](https://www.npmjs.com/package/@elevenlabs/elevenlabs-js) (v2.38.1)
- [@google/genai — npm](https://www.npmjs.com/package/@google/genai) (v1.45.0)
- [Gemini Imagen 4 Documentation](https://ai.google.dev/gemini-api/docs/imagen)
- [Gemini Image Generation Guide](https://ai.google.dev/gemini-api/docs/image-generation)
- [sharp — npm](https://www.npmjs.com/package/sharp) (v0.34.5)
- [tsx — npm](https://www.npmjs.com/package/tsx) (v4.21.0)
- [vite — npm](https://www.npmjs.com/package/vite) (v8.0.0)
- [vitest — npm](https://www.npmjs.com/package/vitest) (v4.1.0)
- [vite-plugin-pwa — npm](https://www.npmjs.com/package/vite-plugin-pwa) (v1.2.0)
- [TypeScript — npm](https://www.npmjs.com/package/typescript) (v5.9.3)
- [Imagen 4 Prompt Guide](https://gpt4oimageprompt.com/pages/blog/imagen-4-prompt-guide.html)
