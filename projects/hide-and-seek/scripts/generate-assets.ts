import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { ASSET_PROMPTS, ASSET_IDS, STYLE_PREFIX } from './asset-prompts.js';
import type {
  AssetDefinition,
  GenerationConfig,
  GenerationError,
  GenerationLog,
  GenerationLogEntry,
  GenerationResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'assets', 'raw');
const LOG_PATH = path.join(ROOT, 'assets', 'generation-log.json');
const PALETTE_DIR = path.join(ROOT, 'assets', 'palette');
const STYLE_REF_PATH = path.join(PALETTE_DIR, 'style-reference.png');

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_BUDGET_CAP = 50;
const DEFAULT_INTER_CALL_DELAY_MS = 6_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CIRCUIT_BREAKER = 5;
const CALL_TIMEOUT_MS = 90_000;
const RETRY_DELAY_RATE_LIMIT_MS = 12_000;
const RETRY_DELAY_SERVER_MS = 4_000;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseCli(): GenerationConfig {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'dry-run': { type: 'boolean', default: false },
      'force-all': { type: 'boolean', default: false },
      only: { type: 'string', multiple: true },
      model: { type: 'string', default: DEFAULT_MODEL },
      budget: { type: 'string', default: String(DEFAULT_BUDGET_CAP) },
    },
    strict: true,
  });

  const only = values['only'];
  if (only) {
    for (const id of only) {
      if (!ASSET_IDS.has(id)) {
        console.error(`Unknown asset ID: "${id}". Valid IDs:\n${[...ASSET_IDS].join('\n')}`);
        process.exit(1);
      }
    }
  }

  const styleRef = fs.existsSync(STYLE_REF_PATH) ? STYLE_REF_PATH : undefined;

  return {
    model: values['model'] ?? DEFAULT_MODEL,
    budgetCap: Number(values['budget'] ?? DEFAULT_BUDGET_CAP),
    interCallDelayMs: DEFAULT_INTER_CALL_DELAY_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
    circuitBreakerThreshold: DEFAULT_CIRCUIT_BREAKER,
    styleReferencePath: styleRef,
    forceAll: values['force-all'] ?? false,
    dryRun: values['dry-run'] ?? false,
    only: only as readonly string[] | undefined,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function getErrorStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'status' in e && typeof (e as Record<string, unknown>)['status'] === 'number') {
    return (e as Record<string, unknown>)['status'] as number;
  }
  return undefined;
}

function classifyError(e: unknown): GenerationError {
  const status = getErrorStatus(e);
  const msg = e instanceof Error ? e.message : String(e);

  if (status === 401 || status === 403) {
    return { kind: 'auth', message: msg };
  }
  if (status === 429) {
    return { kind: 'rate-limit', retryAfterMs: RETRY_DELAY_RATE_LIMIT_MS };
  }
  if (status !== undefined && status >= 500) {
    return { kind: 'server-error', status, message: msg };
  }
  if (msg.includes('SAFETY') || msg.includes('blocked') || msg.includes('filtered')) {
    return { kind: 'safety-block', reason: msg };
  }
  if (msg.includes('aborted') || msg.includes('AbortError') || msg.includes('timeout')) {
    return { kind: 'timeout' };
  }
  return { kind: 'unknown', message: msg };
}

function shouldRetry(err: GenerationError): boolean {
  return err.kind === 'rate-limit' || err.kind === 'server-error' || err.kind === 'timeout';
}

function retryDelay(err: GenerationError): number {
  if (err.kind === 'rate-limit') return err.retryAfterMs;
  if (err.kind === 'server-error') return RETRY_DELAY_SERVER_MS;
  return RETRY_DELAY_SERVER_MS;
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

function assertPathUnder(filePath: string, allowedDir: string): void {
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(allowedDir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    throw new Error(`Path jail violation: ${resolved} is not under ${resolvedDir}`);
  }
}

const SAFE_NAME = /^[a-z0-9-]+$/;

// ---------------------------------------------------------------------------
// Generation log
// ---------------------------------------------------------------------------

function loadLog(): GenerationLog {
  if (fs.existsSync(LOG_PATH)) {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8')) as GenerationLog;
  }
  return {
    generatedAt: new Date().toISOString(),
    model: DEFAULT_MODEL,
    assets: [],
    summary: { total: 0, succeeded: 0, failed: 0, skipped: 0 },
  };
}

function saveLog(log: GenerationLog): void {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function findLogEntry(log: GenerationLog, assetId: string): GenerationLogEntry | undefined {
  return log.assets.find((e) => e.assetId === assetId);
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

async function generateOne(
  ai: GoogleGenAI,
  asset: AssetDefinition,
  fullPrompt: string,
  config: GenerationConfig,
  styleRefBase64: string | undefined,
): Promise<{ buffer: Buffer | null; error: GenerationError | null }> {
  let lastError: GenerationError | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      // Build content parts: style reference (if any) + text prompt
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (styleRefBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: styleRefBase64 } });
        parts.push({ text: 'Use this image as a style reference. Match its visual style exactly. ' });
      }

      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: config.model,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: asset.aspectRatio,
            imageSize: asset.imageSize,
          },
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeout);

      // Extract image from response
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        lastError = { kind: 'safety-block', reason: 'No candidates returned' };
        // Safety blocks don't retry
        return { buffer: null, error: lastError };
      }

      const parts2 = candidates[0]?.content?.parts;
      if (!parts2) {
        lastError = { kind: 'unknown', message: 'No parts in response' };
        if (attempt < config.maxRetries - 1) continue;
        return { buffer: null, error: lastError };
      }

      for (const part of parts2) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          return { buffer, error: null };
        }
      }

      lastError = { kind: 'unknown', message: 'Response contained no image data' };
      if (attempt < config.maxRetries - 1) continue;
      return { buffer: null, error: lastError };

    } catch (e: unknown) {
      clearTimeout(timeout);
      lastError = classifyError(e);

      if (lastError.kind === 'auth') {
        console.error(`FATAL: Auth error — ${lastError.message}`);
        process.exit(1);
      }

      if (lastError.kind === 'safety-block') {
        console.warn(`  Safety blocked: ${lastError.reason}`);
        return { buffer: null, error: lastError };
      }

      if (attempt < config.maxRetries - 1 && shouldRetry(lastError)) {
        const wait = retryDelay(lastError);
        console.warn(`  Attempt ${attempt + 1} failed (${lastError.kind}). Retrying in ${wait / 1000}s...`);
        await delay(wait);
        continue;
      }
    }
  }

  return { buffer: null, error: lastError };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseCli();

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set. Add it to .env and run via: pnpm assets:generate');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Filter assets
  let assets: readonly AssetDefinition[] = ASSET_PROMPTS;
  if (config.only) {
    const onlySet = new Set(config.only);
    assets = assets.filter((a) => onlySet.has(a.id));
  }

  // Validate asset names
  for (const a of assets) {
    if (!SAFE_NAME.test(a.id)) {
      console.error(`Invalid asset ID "${a.id}" — must match /^[a-z0-9-]+$/`);
      process.exit(1);
    }
  }

  // Load style reference
  let styleRefBase64: string | undefined;
  if (config.styleReferencePath && fs.existsSync(config.styleReferencePath)) {
    styleRefBase64 = fs.readFileSync(config.styleReferencePath).toString('base64');
    console.log(`Style reference: ${config.styleReferencePath}`);
  } else {
    console.log('No style reference found — generating without one.');
  }

  // Load existing log for idempotency
  const log = loadLog();
  log.generatedAt = new Date().toISOString();
  log.model = config.model;

  console.log(`\nAssets to process: ${assets.length}`);
  console.log(`Model: ${config.model}`);
  console.log(`Budget cap: ${config.budgetCap}`);
  console.log(`Dry run: ${config.dryRun}`);
  console.log(`Force all: ${config.forceAll}\n`);

  let apiCallCount = 0;
  let consecutiveFailures = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const fullPrompt = STYLE_PREFIX + asset.promptSuffix;
    const hash = promptHash(fullPrompt);
    const categoryDir = path.join(RAW_DIR, asset.category);
    const outPath = path.join(categoryDir, `${asset.id}.png`);

    assertPathUnder(outPath, RAW_DIR);

    // Idempotency check
    if (!config.forceAll) {
      const existing = findLogEntry(log, asset.id);
      if (existing && existing.status === 'success' && existing.promptHash === hash && fs.existsSync(outPath)) {
        console.log(`[${i + 1}/${assets.length}] SKIP ${asset.id} (prompt unchanged)`);
        skipped++;

        // Update log entry
        const idx = log.assets.findIndex((e) => e.assetId === asset.id);
        if (idx === -1) {
          (log.assets as GenerationLogEntry[]).push({
            assetId: asset.id, status: 'skipped', promptHash: hash,
            timestamp: new Date().toISOString(), model: config.model, attempts: 0,
          });
        }
        continue;
      }
    }

    // Budget check
    if (apiCallCount >= config.budgetCap) {
      console.warn(`\nBudget cap reached (${config.budgetCap} calls). Stopping.`);
      break;
    }

    // Circuit breaker
    if (consecutiveFailures >= config.circuitBreakerThreshold) {
      console.error(`\nCircuit breaker tripped: ${consecutiveFailures} consecutive failures. Halting.`);
      break;
    }

    console.log(`[${i + 1}/${assets.length}] Generating ${asset.id}...`);

    if (config.dryRun) {
      console.log(`  DRY RUN — prompt hash: ${hash}`);
      console.log(`  Output: ${outPath}`);
      console.log(`  Prompt: ${fullPrompt.slice(0, 120)}...`);
      skipped++;
      continue;
    }

    // Generate
    apiCallCount++;
    const { buffer, error } = await generateOne(ai, asset, fullPrompt, config, styleRefBase64);

    if (buffer) {
      // Save raw PNG via sharp re-encode (Gemini may return JPEG)
      fs.mkdirSync(categoryDir, { recursive: true });
      const sharp = (await import('sharp')).default;
      const pngBuffer = await sharp(buffer).png().toBuffer();
      fs.writeFileSync(outPath, pngBuffer);

      const meta = await sharp(pngBuffer).metadata();
      console.log(`  OK — ${meta.width}x${meta.height}, ${(pngBuffer.length / 1024).toFixed(1)} KB`);

      consecutiveFailures = 0;
      succeeded++;

      // Update log
      const entry: GenerationLogEntry = {
        assetId: asset.id, status: 'success', promptHash: hash,
        timestamp: new Date().toISOString(), model: config.model, attempts: apiCallCount,
        dimensions: { width: meta.width ?? 0, height: meta.height ?? 0 },
      };
      const idx = log.assets.findIndex((e) => e.assetId === asset.id);
      if (idx >= 0) (log.assets as GenerationLogEntry[])[idx] = entry;
      else (log.assets as GenerationLogEntry[]).push(entry);

    } else {
      const errMsg = error ? `${error.kind}: ${JSON.stringify(error)}` : 'unknown';
      console.error(`  FAILED — ${errMsg}`);
      consecutiveFailures++;
      failed++;

      const entry: GenerationLogEntry = {
        assetId: asset.id, status: 'failed', promptHash: hash,
        timestamp: new Date().toISOString(), model: config.model, attempts: apiCallCount,
        error: errMsg,
      };
      const idx = log.assets.findIndex((e) => e.assetId === asset.id);
      if (idx >= 0) (log.assets as GenerationLogEntry[])[idx] = entry;
      else (log.assets as GenerationLogEntry[]).push(entry);
    }

    // Save log incrementally
    log.summary = { total: assets.length, succeeded, failed, skipped };
    saveLog(log);

    // Rate limit delay
    if (i < assets.length - 1) {
      await delay(config.interCallDelayMs);
    }
  }

  // Final summary
  log.summary = { total: assets.length, succeeded, failed, skipped };
  saveLog(log);

  console.log('\n--- Generation Complete ---');
  console.log(`Total: ${assets.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`API calls: ${apiCallCount}`);

  if (failed > 0) {
    console.log('\nFailed assets:');
    for (const entry of log.assets) {
      if (entry.status === 'failed') {
        console.log(`  - ${entry.assetId}: ${entry.error}`);
      }
    }
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
