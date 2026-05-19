/**
 * Phase 2 TTS cumulative spend tracker with hard ceiling.
 *
 * Ceiling: **$50 USD** (matches Phase 0 Unit 0.2 envelope). No env-var
 * override — if $50 is genuinely insufficient, edit `HARD_CEILING_USD`
 * in this file. Atomic, intentional, traced in git history.
 *
 * Per-cue billing:
 *   - ElevenLabs TTS:   per-char ($0.30 / 1k chars on Creator)
 *   - ElevenLabs S2S:   per-input-second (Voice Changer / Path B)
 *   - Gemini TTS:       per-char ($0.075 / 1M chars — negligible)
 *   - OpenAI TTS:       per-char ($15 / 1M chars)
 *
 * Log shape: JSONL at `videos/trailer/sample-eval/voice-pipeline/tts-spend.json`.
 * The file is gitignored (account-scoped voice IDs + spend visibility).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Line } from '../../src/lib/script.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '../..');
const SPEND_LOG = resolve(TRAILER_ROOT, 'sample-eval/voice-pipeline/tts-spend.json');

export const HARD_CEILING_USD = 50;

type BillingUnit = 'char' | 'input-second';

interface EngineBilling {
  readonly unit: BillingUnit;
  readonly rateUsd: number;
}

const BILLING: Readonly<Record<string, EngineBilling>> = {
  'elevenlabs-v3': { unit: 'char', rateUsd: 0.3 / 1000 },
  'elevenlabs-sts': { unit: 'input-second', rateUsd: 0.3 / 60 },
  'gemini-tts': { unit: 'char', rateUsd: 0.075 / 1_000_000 },
  'openai-tts': { unit: 'char', rateUsd: 15 / 1_000_000 },
};

export interface SpendEntry {
  readonly runId: string;
  readonly ts: string;
  readonly cueId: string;
  readonly engine: string;
  readonly voiceIdPrefix: string;
  readonly unit: BillingUnit;
  readonly unitsBilled: number;
  readonly estimatedCostUsd: number;
}

function readSpendLog(): readonly SpendEntry[] {
  if (!existsSync(SPEND_LOG)) return [];
  return readFileSync(SPEND_LOG, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as SpendEntry);
}

export function totalSpend(): number {
  return readSpendLog().reduce((sum, e) => sum + e.estimatedCostUsd, 0);
}

export async function assertWithinBudget(): Promise<void> {
  const total = totalSpend();
  if (total > HARD_CEILING_USD) {
    throw new Error(
      `Phase 2 TTS spend cap exceeded: $${total.toFixed(2)} > $${HARD_CEILING_USD} ceiling.\n` +
        `No override env var exists by design.\n` +
        `Options:\n` +
        `  (a) Reduce iteration count via --only / --scene targeting.\n` +
        `  (b) If the ceiling genuinely needs to be lifted, edit HARD_CEILING_USD\n` +
        `      in cost-tracker.ts (atomic, traced in git history).\n` +
        `  (c) Reset spend tracker: rm ${SPEND_LOG} (only post-rework).`,
    );
  }
}

function ensureLogDir(): void {
  if (!existsSync(dirname(SPEND_LOG))) mkdirSync(dirname(SPEND_LOG), { recursive: true });
}

function runId(): string {
  return process.env.RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '');
}

/** Standard per-char-billed engines. */
export async function trackSpend(
  cue: Line,
  engine: string,
  voiceIdPrefix: string,
): Promise<void> {
  const billing = BILLING[engine];
  if (!billing) throw new Error(`No billing rate for engine '${engine}'`);
  if (billing.unit !== 'char') {
    throw new Error(
      `Engine '${engine}' uses '${billing.unit}' billing; use trackSpendInputSeconds.`,
    );
  }
  const unitsBilled = cue.text.length;
  const entry: SpendEntry = {
    runId: runId(),
    ts: new Date().toISOString(),
    cueId: cue.id,
    engine,
    voiceIdPrefix,
    unit: 'char',
    unitsBilled,
    estimatedCostUsd: unitsBilled * billing.rateUsd,
  };
  ensureLogDir();
  appendFileSync(SPEND_LOG, JSON.stringify(entry) + '\n');
}

/** ElevenLabs Speech-to-Speech / Voice Changer (Unit 2.Y / Path B). */
export async function trackSpendInputSeconds(
  cue: Line,
  engine: string,
  inputSeconds: number,
  voiceIdPrefix: string,
): Promise<void> {
  const billing = BILLING[engine];
  if (!billing) throw new Error(`No billing rate for engine '${engine}'`);
  if (billing.unit !== 'input-second') {
    throw new Error(`Engine '${engine}' uses '${billing.unit}' billing; use trackSpend.`);
  }
  const entry: SpendEntry = {
    runId: runId(),
    ts: new Date().toISOString(),
    cueId: cue.id,
    engine,
    voiceIdPrefix,
    unit: 'input-second',
    unitsBilled: inputSeconds,
    estimatedCostUsd: inputSeconds * billing.rateUsd,
  };
  ensureLogDir();
  appendFileSync(SPEND_LOG, JSON.stringify(entry) + '\n');
}
