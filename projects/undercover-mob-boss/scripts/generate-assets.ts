import { GoogleGenAI, PersonGeneration } from '@google/genai';
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
const MAX_RETRIES = 3;
const OUTPUT_DIR = resolve('public/assets');
const RAW_DIR = resolve('assets/raw');

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
const onlyNames = values.only ?? [];

// Validate --only names
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

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 12);
}

async function writeLogIncrementally(log: GenerationLog): Promise<void> {
  await writeFile(
    resolve(OUTPUT_DIR, 'generation-log.json'),
    JSON.stringify(log, null, 2),
    'utf-8',
  );
}

// --- Single Asset Generation (with retry) ---

async function generateOne(
  ai: GoogleGenAI,
  asset: AssetPrompt,
  index: number,
  total: number,
): Promise<{ buffer: Buffer | null; promptHash: string; error?: string }> {
  const fullPrompt = STYLE_PREFIX + asset.promptSuffix;
  const promptHash = hashPrompt(fullPrompt);

  console.log(`\n[${ index + 1}/${total}] Generating "${asset.name}"...`);
  console.log(`  Prompt hash: ${promptHash}`);
  console.log(`  Target: ${asset.targetWidth}x${asset.targetHeight} (${asset.aspectRatio})`);
  console.log(`  Transparency: ${asset.needsTransparency}`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would call Imagen 4 with model ${MODEL}`);
    console.log(`  [DRY RUN] Full prompt: "${fullPrompt.slice(0, 120)}..."`);
    return { buffer: null, promptHash };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: asset.aspectRatio,
          personGeneration: PersonGeneration.DONT_ALLOW,
        },
      });

      // Safety filter: API returns 200 with empty array
      const images = response.generatedImages;
      if (!images || images.length === 0) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`  Safety filter or empty response. Retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await delay(INTER_CALL_DELAY_MS);
          continue;
        }
        return { buffer: null, promptHash, error: 'Safety filter blocked generation (empty response)' };
      }

      const imageData = images[0].image;
      if (!imageData?.imageBytes) {
        return { buffer: null, promptHash, error: 'No image bytes in response' };
      }

      const rawBuffer = Buffer.from(imageData.imageBytes, 'base64');
      console.log(`  Raw image received (${rawBuffer.length} bytes)`);

      // Save raw to assets/raw/ (gitignored)
      const rawPath = resolve(RAW_DIR, `${asset.name}.png`);
      await writeFile(rawPath, rawBuffer);
      console.log(`  Raw saved: ${rawPath}`);

      // Post-process
      let processed: Buffer;
      if (asset.postProcess.kind === 'chroma-key-then-resize') {
        console.log(`  Post-processing: chroma-key → resize`);
        const keyed = await chromaKeyRemove(rawBuffer);
        processed = await resizeAsset(keyed, asset.targetWidth, asset.targetHeight);
      } else {
        console.log(`  Post-processing: resize only`);
        processed = await resizeAsset(rawBuffer, asset.targetWidth, asset.targetHeight);
      }

      // Validate
      const validation = await validateOutput(
        processed,
        asset.targetWidth,
        asset.targetHeight,
        asset.needsTransparency,
      );
      if (!validation.valid) {
        console.warn(`  Validation warning: ${validation.width}x${validation.height}, alpha=${validation.hasAlpha}`);
      }

      return { buffer: processed, promptHash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = e instanceof Error && 'status' in e
        ? (e as { status: number }).status
        : null;

      if (status === 401 || status === 403) {
        console.error(`  FATAL: Auth error (${status}): ${msg}`);
        process.exit(1);
      }

      if ((status === 429 || (status && status >= 500)) && attempt < MAX_RETRIES - 1) {
        const backoff = INTER_CALL_DELAY_MS * (attempt + 2);
        console.warn(`  Error (${status}): ${msg}. Retrying in ${backoff / 1000}s...`);
        await delay(backoff);
        continue;
      }

      return { buffer: null, promptHash, error: `${status ? `HTTP ${status}: ` : ''}${msg}` };
    }
  }

  return { buffer: null, promptHash: hashPrompt(STYLE_PREFIX + asset.promptSuffix), error: 'Max retries exceeded' };
}

// --- Main ---

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(RAW_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const log: GenerationLog = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    sdkVersion: '@google/genai@1.45.0',
    assets: [],
    summary: { total: assetsToGenerate.length, succeeded: 0, failed: 0 },
  };

  const results: Array<{ name: string; status: string; error?: string }> = [];

  console.log(`\n=== Undercover Mob Boss — Asset Generation ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Assets: ${assetsToGenerate.length} of ${ASSET_PROMPTS.length}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  for (let i = 0; i < assetsToGenerate.length; i++) {
    const asset = assetsToGenerate[i];
    const { buffer, promptHash, error } = await generateOne(ai, asset, i, assetsToGenerate.length);

    if (dryRun) {
      results.push({ name: asset.name, status: 'dry-run' });
      continue;
    }

    const entry: GenerationLogEntry = {
      name: asset.name,
      status: buffer ? 'success' : 'failed',
      promptHash,
      dimensions: null,
      hasAlpha: null,
      generatedAt: new Date().toISOString(),
    };

    if (buffer) {
      // Determine output format
      const ext = asset.needsTransparency ? 'png' : 'jpg';
      const outPath = resolve(OUTPUT_DIR, `${asset.name}.${ext}`);

      if (!asset.needsTransparency) {
        // Convert to JPEG for opaque assets
        const sharp = (await import('sharp')).default;
        const jpgBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        await writeFile(outPath, jpgBuffer);
      } else {
        await writeFile(outPath, buffer);
      }

      const validation = await validateOutput(
        buffer,
        asset.targetWidth,
        asset.targetHeight,
        asset.needsTransparency,
      );
      entry.dimensions = { width: validation.width, height: validation.height };
      entry.hasAlpha = validation.hasAlpha;

      console.log(`  Saved: ${outPath} (${buffer.length} bytes)`);
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

    // Delay between calls (skip after last)
    if (!dryRun && i < assetsToGenerate.length - 1) {
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
