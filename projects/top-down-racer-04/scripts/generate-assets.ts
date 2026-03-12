#!/usr/bin/env tsx
/**
 * Asset generation pipeline — Gemini Imagen 4 API.
 *
 * Usage:
 *   pnpm run generate-assets                        # generate all 11 assets
 *   pnpm run generate-assets -- --only car-ai       # regenerate one asset
 *   pnpm run generate-assets -- --dry-run           # log what would happen, no API calls
 *
 * The pipeline is SEQUENTIAL (not parallel) because the Imagen API has
 * per-minute rate limits (10 IPM on Tier 1). Parallel calls hit 429s immediately.
 */

import { GoogleGenAI, SafetyFilterLevel } from '@google/genai';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { ASSET_NAMES, ASSET_PROMPTS, STYLE_PREFIX } from './asset-prompts.js';
import { chromaKeyRemove, cropAndResize, resizeAsset, validateOutput } from './image-processing.js';
import type { AssetPrompt, GenerationLog, GenerationLogEntry } from './types.js';

// --- Constants ---

const MODEL = 'imagen-4.0-generate-001';
const SDK_VERSION = '1.44.0';
const INTER_CALL_DELAY_MS = 7_000;
const CALL_TIMEOUT_MS = 60_000;
const RETRY_DELAY_RATE_LIMIT_MS = 10_000;
const RETRY_DELAY_SERVER_MS = 3_000;
const OUTPUT_DIR = resolve('assets/raw');

// --- CLI Arg Parsing ---

// Strip leading '--' that pnpm injects when forwarding args
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
const onlyNames = values.only ?? [];

// Validate --only names against known assets
for (const name of onlyNames) {
  if (!ASSET_NAMES.has(name)) {
    console.error(
      `ERROR: Unknown asset name "${name}". Valid names: ${[...ASSET_NAMES].join(', ')}`,
    );
    process.exit(1);
  }
}

const assetsToGenerate =
  onlyNames.length > 0
    ? ASSET_PROMPTS.filter((p) => onlyNames.includes(p.name))
    : [...ASSET_PROMPTS];

// --- API Key Validation ---

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY not set. Add it to .env (see .env.example).');
  process.exit(1);
}

if (dryRun) {
  console.log('\n=== DRY RUN — no API calls will be made ===\n');
}

// --- Helpers ---

function promptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 12);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(e: unknown): number | null {
  if (e instanceof Error && 'status' in e) {
    return (e as { status: number }).status;
  }
  return null;
}

async function writeLogIncrementally(log: GenerationLog): Promise<void> {
  await writeFile(
    resolve(OUTPUT_DIR, 'generation-log.json'),
    JSON.stringify(log, null, 2),
    'utf-8',
  );
}

// --- Post-Processing Dispatch ---

async function postProcess(
  rawBuffer: Buffer,
  asset: AssetPrompt,
): Promise<Buffer> {
  const pp = asset.postProcess;
  switch (pp.kind) {
    case 'chroma-key-then-resize': {
      const bgRemoved = await chromaKeyRemove(rawBuffer);
      return resizeAsset(bgRemoved, asset.targetWidth, asset.targetHeight);
    }
    case 'crop-and-resize':
      return cropAndResize(rawBuffer, pp.cropRegion, asset.targetWidth, asset.targetHeight);
    case 'resize':
      return resizeAsset(rawBuffer, asset.targetWidth, asset.targetHeight);
  }
}

// --- Single Asset Generation (with retry) ---

async function generateOne(
  ai: GoogleGenAI,
  asset: AssetPrompt,
  index: number,
  total: number,
): Promise<{ buffer: Buffer | null; error?: string }> {
  const fullPrompt = STYLE_PREFIX + asset.promptSuffix;
  console.log(`\nGenerating "${asset.name}"... (${index + 1}/${total})`);
  console.log(`  Prompt hash: ${promptHash(fullPrompt)}`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would call Imagen 4 with ${asset.sizeTier} ${asset.aspectRatio}`);
    console.log(`  [DRY RUN] Post-process: ${asset.postProcess.kind} → ${asset.targetWidth}x${asset.targetHeight}`);
    return { buffer: null };
  }

  const config = {
    numberOfImages: 1,
    outputMimeType: 'image/png',
    safetyFilterLevel: SafetyFilterLevel.BLOCK_LOW_AND_ABOVE,
    aspectRatio: asset.aspectRatio,
    ...(asset.sizeTier === '2K' ? { imageSize: '2K' } : {}),
  };

  let lastError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

      let response;
      try {
        response = await ai.models.generateImages({
          model: MODEL,
          prompt: fullPrompt,
          config: { ...config, abortSignal: controller.signal },
        });
      } finally {
        clearTimeout(timeout);
      }

      // Check for safety filter blocks
      if (!response.generatedImages || response.generatedImages.length === 0) {
        const reason = (response as Record<string, unknown>).raiFilteredReason ?? 'unknown';
        lastError = `Safety filter blocked: ${reason}`;
        console.warn(`  WARNING: ${lastError}`);
        return { buffer: null, error: lastError };
      }

      const image = response.generatedImages[0];
      if (!image.image?.imageBytes) {
        lastError = 'API returned empty image bytes';
        console.warn(`  WARNING: ${lastError}`);
        return { buffer: null, error: lastError };
      }

      // Decode base64 to Buffer
      const rawBuffer = Buffer.from(image.image.imageBytes, 'base64');
      console.log(`  Raw image received (${rawBuffer.length} bytes)`);

      // Post-process
      try {
        const processed = await postProcess(rawBuffer, asset);

        // Validate output
        const expectAlpha = asset.postProcess.kind === 'chroma-key-then-resize';
        const validation = await validateOutput(
          processed,
          asset.targetWidth,
          asset.targetHeight,
          expectAlpha,
        );

        if (!validation.valid) {
          console.warn(
            `  WARNING: Validation mismatch — got ${validation.width}x${validation.height} (alpha: ${validation.hasAlpha}), ` +
              `expected ${asset.targetWidth}x${asset.targetHeight} (alpha: ${expectAlpha})`,
          );
        } else {
          console.log(
            `  Validated: ${validation.width}x${validation.height}, alpha: ${validation.hasAlpha}`,
          );
        }

        return { buffer: processed };
      } catch (sharpErr) {
        const msg = sharpErr instanceof Error ? sharpErr.message : String(sharpErr);
        console.warn(`  WARNING: Sharp processing failed: ${msg}`);
        // Save raw unprocessed image as fallback
        const rawPath = resolve(OUTPUT_DIR, `${asset.name}.raw.png`);
        await writeFile(rawPath, rawBuffer);
        console.warn(`  Saved raw fallback to ${rawPath}`);
        return { buffer: null, error: `Sharp error: ${msg}` };
      }
    } catch (e) {
      const status = getErrorStatus(e);
      const msg = e instanceof Error ? e.message : String(e);

      if (status === 400 || status === 403) {
        console.error(`  FATAL: Auth error (${status}): ${msg}`);
        process.exit(1);
      }

      if (attempt === 0) {
        if (status === 429) {
          console.warn(`  Rate limited (429). Waiting ${RETRY_DELAY_RATE_LIMIT_MS / 1000}s and retrying...`);
          await delay(RETRY_DELAY_RATE_LIMIT_MS);
          lastError = `Rate limit: ${msg}`;
          continue;
        }
        if (status && status >= 500) {
          console.warn(`  Server error (${status}). Waiting ${RETRY_DELAY_SERVER_MS / 1000}s and retrying...`);
          await delay(RETRY_DELAY_SERVER_MS);
          lastError = `Server error ${status}: ${msg}`;
          continue;
        }
        if (msg.includes('aborted') || msg.includes('AbortError')) {
          console.warn(`  Timeout after ${CALL_TIMEOUT_MS / 1000}s. Retrying...`);
          lastError = 'Timeout';
          continue;
        }
      }

      lastError = `${status ? `HTTP ${status}: ` : ''}${msg}`;
      console.error(`  ERROR: ${lastError}`);
      return { buffer: null, error: lastError };
    }
  }

  return { buffer: null, error: lastError ?? 'Max retries exceeded' };
}

// --- Main ---

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  const log: GenerationLog = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    sdkVersion: SDK_VERSION,
    assets: [],
    summary: { total: assetsToGenerate.length, succeeded: 0, failed: 0 },
  };

  const results: Array<{ name: string; status: string; error?: string }> = [];

  for (let i = 0; i < assetsToGenerate.length; i++) {
    const asset = assetsToGenerate[i];
    const fullPrompt = STYLE_PREFIX + asset.promptSuffix;
    const { buffer, error } = await generateOne(ai, asset, i, assetsToGenerate.length);

    if (dryRun) {
      results.push({ name: asset.name, status: 'dry-run' });
      continue;
    }

    const entry: GenerationLogEntry = {
      name: asset.name,
      status: buffer ? 'success' : 'failed',
      promptHash: promptHash(fullPrompt),
      dimensions: null,
      hasAlpha: null,
      generatedAt: new Date().toISOString(),
    };

    if (buffer) {
      const outPath = resolve(OUTPUT_DIR, `${asset.name}.png`);
      await writeFile(outPath, buffer);
      console.log(`  Saved: ${outPath}`);

      const meta = await (await import('sharp')).default(buffer).metadata();
      entry.dimensions = { width: meta.width ?? 0, height: meta.height ?? 0 };
      entry.hasAlpha = meta.hasAlpha ?? false;

      log.summary.succeeded++;
      results.push({ name: asset.name, status: 'success' });
    } else {
      entry.status = 'failed';
      entry.failureReason = error;
      log.summary.failed++;
      results.push({ name: asset.name, status: 'FAILED', error });
    }

    log.assets.push(entry);
    await writeLogIncrementally(log);

    // Delay between calls (skip after last asset)
    if (i < assetsToGenerate.length - 1) {
      console.log(`  Waiting ${INTER_CALL_DELAY_MS / 1000}s before next call...`);
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
