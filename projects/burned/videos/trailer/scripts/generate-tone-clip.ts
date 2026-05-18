/**
 * Phase 0 Unit 0.4 Step 2 — Tone clip renderer.
 *
 * One-shot TTS call against the Unit 0.2 locked Dash voice (Roger,
 * ElevenLabs Voice Library, model eleven_v3) for the R2 + R6 tone gate.
 * Renders TONE_SAMPLE_PARAGRAPH to sample-eval/tone/sample.mp3 with
 * the bracket-tag treatment encoded in buildPayload().
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tone:clip
 *
 * Voice + settings hardcoded to the Unit 0.2 lock (Roger
 * CwhRBWXzGAHq8TQ4Fs17 / eleven_v3 / stability 0.70 / similarity 0.75 /
 * style 0.15 / speaker_boost true / speed 0.95). Char-budget tracker
 * updated with actual payload length.
 *
 * Bracket-tag treatment:
 *   - [deadpan] leading — mirrors adapter §bracket_tags_per_paragraph
 *     .deadpan-exposition (Unit 0.2 paragraph 1)
 *   - [sarcastic] immediately before "…Phrasing" — mirrors adapter
 *     §bracket_tags_per_paragraph.monologue-exasperation Phrasing
 *     handling (Unit 0.2 paragraph 2)
 *
 * Tags assembled here, not in tone-prototype.ts, so the constant stays
 * raw prose and the VOICE_DIRECTION anti-pattern guard test catches any
 * future drift that leaks bracket tokens into the constant payload.
 *
 * If Briggsy elects re-render with a tweaked bracket-tag treatment after
 * the audition, edit buildPayload() below. There is no CLI flag surface
 * — this is a deterministic one-shot, not a matrix iteration.
 */

import { config as loadEnv } from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TONE_SAMPLE_PARAGRAPH } from './tone-prototype.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

const TONE_DIR = resolve(TRAILER_ROOT, 'sample-eval/tone');
const BUDGET_PATH = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/char-budget.json');

// Locked Dash voice per Unit 0.2 disposition.
const ROGER_VOICE_ID = 'CwhRBWXzGAHq8TQ4Fs17';
const MODEL_ID = 'eleven_v3';
const VOICE_SETTINGS = {
  stability: 0.70,
  similarity_boost: 0.75,
  style: 0.15,
  use_speaker_boost: true,
  speed: 0.95,
} as const;

loadEnv({ path: ENV_PATH });

/**
 * Wraps the raw paragraph with the Unit 0.4 bracket-tag treatment:
 * leading [deadpan] for the declarative read, [sarcastic] immediately
 * before the …Phrasing landing to reinforce the sardonic-micro-lift.
 */
function buildPayload(paragraph: string): string {
  if (!paragraph.includes('…Phrasing')) {
    throw new Error('TONE_SAMPLE_PARAGRAPH missing "…Phrasing" anchor — bracket-tag insertion would fail silently.');
  }
  const tagged = paragraph.replace('…Phrasing', '[sarcastic] …Phrasing');
  return `[deadpan] ${tagged}`;
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}`);

  const payload = buildPayload(TONE_SAMPLE_PARAGRAPH);

  console.log(`[tone-clip] payload (${payload.length} chars):`);
  console.log(`[tone-clip]   "${payload}"`);
  console.log(`[tone-clip] voice: Roger (${ROGER_VOICE_ID}), model ${MODEL_ID}`);

  const started = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ROGER_VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
      output_format: 'mp3_44100_128',
    }),
  });
  const latencyMs = Date.now() - started;

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
  }

  const bytes = await res.arrayBuffer();
  const buf = Buffer.from(bytes);
  if (buf.length < 1000) {
    const peek = buf.toString('utf8', 0, Math.min(buf.length, 200));
    throw new Error(`TTS returned suspiciously small payload (${buf.length} bytes). Peek: ${peek}`);
  }

  const sha256Hex = createHash('sha256').update(buf).digest('hex');
  mkdirSync(TONE_DIR, { recursive: true });
  const outPath = resolve(TONE_DIR, 'sample.mp3');
  writeFileSync(outPath, buf);

  console.log(`[tone-clip] output: ${outPath}`);
  console.log(`[tone-clip]   bytes: ${buf.length.toLocaleString()}`);
  console.log(`[tone-clip]   sha256: ${sha256Hex}`);
  console.log(`[tone-clip]   latency: ${latencyMs}ms`);

  if (existsSync(BUDGET_PATH)) {
    const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) as {
      month: string;
      elevenlabs_chars_used: number;
      elevenlabs_chars_cap: number;
      tripwire_50pct: boolean;
      tripwire_80pct: boolean;
    };
    budget.elevenlabs_chars_used += payload.length;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.5) budget.tripwire_50pct = true;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.8) budget.tripwire_80pct = true;
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    console.log(`[tone-clip]   char-budget: +${payload.length} → ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`);
  }
}

main().catch((e) => {
  console.error('[tone-clip] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
