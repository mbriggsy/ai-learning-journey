/**
 * Phase 0 Unit 0.6 — Scream variant renderer.
 *
 * Parameterized one-shot TTS call against the locked Dash voice
 * (Roger, ElevenLabs Voice Library) for the R5 scream audition.
 *
 * Lets Briggsy A/B-compare alternate bracket tags + alternate text
 * shapes (e.g., vowel-drag "VERAAAAAAA!!!" sustained-call form vs.
 * the matrix-default "VERAAA!!!" short-burst form) without editing
 * the cadence-spec-elevenlabs.json adapter and re-running the full
 * matrix.
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tsx scripts/generate-scream-variant.ts \
 *     --text "VERAAAAAAAAAAA!!!" \
 *     --label "v2-vowel-drag"
 *
 *   pnpm tsx scripts/generate-scream-variant.ts \
 *     --text "VERAAAAAAA!!!" \
 *     --label "v3-no-tag" \
 *     --no-tag
 *
 *   pnpm tsx scripts/generate-scream-variant.ts \
 *     --text "VERAAAAAAA!!!" \
 *     --label "v4-shouting" \
 *     --tag "[shouting]"
 *
 * Output:
 *   sample-eval/r5-scream/path-a-tts-{label}.mp3
 *
 * Voice + settings hardcoded to the Unit 0.2 lock (Roger, eleven_v3,
 * stability 0.70 / similarity 0.75 / style 0.15 / speaker_boost true /
 * speed 0.95). Char-budget tracker updated with actual payload length.
 */

import { config as loadEnv } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

const R5_DIR = resolve(TRAILER_ROOT, 'sample-eval/r5-scream');
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

type Args = {
  text: string;
  label: string;
  leadingTag: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let text = '';
  let label = '';
  let leadingTag = '[shouts]';
  let noTag = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--text' && i + 1 < argv.length) {
      text = argv[++i]!;
    } else if (arg === '--label' && i + 1 < argv.length) {
      label = argv[++i]!;
    } else if (arg === '--tag' && i + 1 < argv.length) {
      leadingTag = argv[++i]!;
    } else if (arg === '--no-tag') {
      noTag = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!text) throw new Error('--text is required (e.g. "VERAAAAAAAAA!!!")');
  if (!label) throw new Error('--label is required (e.g. "v2-vowel-drag")');
  if (!/^[a-z0-9-]+$/.test(label)) {
    throw new Error(`--label must be kebab-case alphanumeric (got "${label}")`);
  }
  return { text, label, leadingTag: noTag ? '' : leadingTag };
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}`);

  const { text, label, leadingTag } = parseArgs();
  const payload = leadingTag ? `${leadingTag} ${text}` : text;

  console.log(`[variant] label: ${label}`);
  console.log(`[variant] text: "${text}"`);
  console.log(`[variant] leading_tag: ${leadingTag || '<none>'}`);
  console.log(`[variant] payload: "${payload}" (${payload.length} chars)`);
  console.log(`[variant] voice: Roger (${ROGER_VOICE_ID}), model ${MODEL_ID}`);

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
  mkdirSync(R5_DIR, { recursive: true });
  const outPath = resolve(R5_DIR, `path-a-tts-${label}.mp3`);
  writeFileSync(outPath, buf);

  console.log(`[variant] output: ${outPath}`);
  console.log(`[variant]   bytes: ${buf.length.toLocaleString()}`);
  console.log(`[variant]   sha256: ${sha256Hex}`);
  console.log(`[variant]   latency: ${latencyMs}ms`);

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
    console.log(`[variant]   char-budget: +${payload.length} → ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`);
  }
}

main().catch((e) => {
  console.error('[variant] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
