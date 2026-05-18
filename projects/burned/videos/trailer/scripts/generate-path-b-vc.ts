/**
 * Phase 0 Unit 0.6 Path B — Voice Changer (Speech-to-Speech) renderer.
 *
 * Applies the locked Dash voice (Roger, ElevenLabs Voice Library) to
 * Briggsy's recorded human scream via the
 * `POST /v1/speech-to-speech/{voice_id}` endpoint.
 *
 * Input:
 *   sample-eval/r5-scream/briggsy-scream-source.wav
 *     — Recording conditions per phase-0-gate-resolution.md §Unit 0.6
 *       Path B (12-18" mic distance, peak ~-3 dBFS, 1.5s, WAV format).
 *
 * Output:
 *   sample-eval/r5-scream/path-b-hybrid.mp3
 *
 * Cost: ~25 chars billed against the ElevenLabs Creator allowance per
 * call (negligible vs. the 100K monthly cap; spec budget envelope).
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tsx scripts/generate-path-b-vc.ts
 *
 * Bash equivalent:
 *   npx tsx scripts/generate-path-b-vc.ts
 *
 * API surface verified via Context7 (elevenlabs.io docs) 2026-05-18:
 *   - multipart/form-data with `audio` (file) + `model_id` + optional
 *     `voice_settings` (JSON string) + `remove_background_noise` (bool)
 *   - `output_format` is a QUERY-STRING parameter, not multipart field
 *   - Model: `eleven_multilingual_sts_v2` (ElevenLabs documented STS
 *     model — see "Model selection guide > Voice changer" in their docs).
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
// Canonical owned-voice source filename per .gitignore convention
// (sibling pattern: `r4-dash/voice-clone-source.*` for the IVC source).
// Gitignored as security-sensitive — never tracked.
const SOURCE_PATH = resolve(R5_DIR, 'path-b-source-recording.wav');
const OUTPUT_PATH = resolve(R5_DIR, 'path-b-hybrid.mp3');
const LOG_PATH = resolve(R5_DIR, 'path-b-generation-log.md');
const BUDGET_PATH = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/char-budget.json');

// Roger voice — locked at Unit 0.2 closure (2026-05-18) as the Dash voice.
// Authoritative source: videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md
const ROGER_VOICE_ID = 'CwhRBWXzGAHq8TQ4Fs17';
const STS_MODEL = 'eleven_multilingual_sts_v2';

// Mirror Roger voice_settings from cadence-spec-elevenlabs.json. STS still
// applies voice_settings to the target voice generation; passing Roger's
// locked values keeps Path B's output timbre aligned with Path A's.
const VOICE_SETTINGS = {
  stability: 0.70,
  similarity_boost: 0.75,
  style: 0.15,
  use_speaker_boost: true,
  speed: 0.95,
} as const;

// STS spec budget — ~25 chars per call per phase-0-gate-resolution.md
// (Unit 0.6 Path B step 2). Used to keep char-budget.json in lockstep
// with reality. Conservative ceiling; ElevenLabs may bill less.
const STS_CHAR_COST_ESTIMATE = 25;

loadEnv({ path: ENV_PATH });

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Reject inputs that don't have a valid RIFF/WAVE header before we
 * waste an STS billing cycle on a malformed file. Format errors from
 * ElevenLabs come back as generic 400s — local checking gives the
 * caller a precise error message.
 */
function assertRiffWav(buf: Buffer, path: string): void {
  if (buf.length < 44) {
    throw new Error(`Source ${path} is too short to be a valid WAV (${buf.length} bytes)`);
  }
  const magic = buf.subarray(0, 4).toString('ascii');
  if (magic !== 'RIFF') {
    throw new Error(`Source ${path} missing RIFF header (got "${magic}"). Re-record as WAV format.`);
  }
  const wave = buf.subarray(8, 12).toString('ascii');
  if (wave !== 'WAVE') {
    throw new Error(`Source ${path} missing WAVE format marker (got "${wave}").`);
  }
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}. Run \`pnpm check:tts\` first to confirm engine readiness.`);
  }

  if (!existsSync(SOURCE_PATH)) {
    throw new Error(
      [
        `Missing source recording at ${SOURCE_PATH}.`,
        '',
        `Path B Voice Changer needs Briggsy's recorded scream as input.`,
        'Recording brief (per phase-0-gate-resolution.md §Unit 0.6 Path B):',
        '  - Mic distance: 12-18" (phone) or 6"+ (laptop) — too close clips the loud peaks',
        '  - Target peak: ~-3 dBFS (loud but unclipped); 5-10 takes, pick the best',
        '  - Length: ~1.5s — "VERAAA!!!" should pop instantly, not ramp up',
        '  - Format: WAV (not MP3) — STS prefers lossless input',
        '  - Pre-flight: open the take in Audacity; flat-top clipping = re-take further from mic',
        `  - Save to: ${SOURCE_PATH}`,
      ].join('\n'),
    );
  }

  const sourceBuf = readFileSync(SOURCE_PATH);
  assertRiffWav(sourceBuf, SOURCE_PATH);
  const sourceSha = sha256(sourceBuf);

  console.log(`[path-b] source: ${SOURCE_PATH}`);
  console.log(`[path-b]   size: ${sourceBuf.length.toLocaleString()} bytes`);
  console.log(`[path-b]   sha256: ${sourceSha}`);
  console.log(`[path-b] target voice: Roger (${ROGER_VOICE_ID})`);
  console.log(`[path-b] model: ${STS_MODEL}`);
  console.log(`[path-b] voice_settings: ${JSON.stringify(VOICE_SETTINGS)}`);
  console.log(`[path-b] remove_background_noise: true`);

  // Native Node 18+ FormData / Blob. undici fetch handles boundary
  // generation + Content-Type header automatically when body is FormData.
  const form = new FormData();
  const audioBlob = new Blob([sourceBuf], { type: 'audio/wav' });
  form.append('audio', audioBlob, 'path-b-source-recording.wav');
  form.append('model_id', STS_MODEL);
  form.append('voice_settings', JSON.stringify(VOICE_SETTINGS));
  form.append('remove_background_noise', 'true');

  const url = `https://api.elevenlabs.io/v1/speech-to-speech/${ROGER_VOICE_ID}?output_format=mp3_44100_128`;

  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
  });
  const latencyMs = Date.now() - started;

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`ElevenLabs STS failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
  }

  const outBytes = await res.arrayBuffer();
  const outBuf = Buffer.from(outBytes);
  // Sanity check — STS rarely returns <1KB on a real scream conversion.
  // <100 bytes typically means the API returned an error-shaped JSON
  // payload with a 200 status (defensive guard against silent failures).
  if (outBuf.length < 1000) {
    const peek = outBuf.toString('utf8', 0, Math.min(outBuf.length, 200));
    throw new Error(`STS returned suspiciously small payload (${outBuf.length} bytes). Peek: ${peek}`);
  }

  mkdirSync(R5_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, outBuf);

  const outSha = sha256(outBuf);
  console.log(`[path-b] output: ${OUTPUT_PATH}`);
  console.log(`[path-b]   size: ${outBuf.length.toLocaleString()} bytes`);
  console.log(`[path-b]   sha256: ${outSha}`);
  console.log(`[path-b]   latency: ${latencyMs}ms`);

  // Char-budget tracking — STS charges ~25 chars per call (spec estimate).
  // Keeping this in sync with reality is cheap and lets `pnpm check:tts`
  // surface accurate utilization.
  if (existsSync(BUDGET_PATH)) {
    const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) as {
      month: string;
      elevenlabs_chars_used: number;
      elevenlabs_chars_cap: number;
      tripwire_50pct: boolean;
      tripwire_80pct: boolean;
    };
    budget.elevenlabs_chars_used += STS_CHAR_COST_ESTIMATE;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.5) budget.tripwire_50pct = true;
    if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.8) budget.tripwire_80pct = true;
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    console.log(`[path-b]   char-budget: +${STS_CHAR_COST_ESTIMATE} → ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`);
  }

  const log = [
    '# Path B Voice Changer — Generation Log',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Script: \`scripts/generate-path-b-vc.ts\``,
    '',
    '## Input',
    `- Source: \`${SOURCE_PATH}\``,
    `- Bytes: ${sourceBuf.length.toLocaleString()}`,
    `- sha256: \`${sourceSha}\``,
    '',
    '## Config',
    `- Voice ID: \`${ROGER_VOICE_ID}\` (Roger — locked Dash voice per Unit 0.2)`,
    `- Model: \`${STS_MODEL}\``,
    `- voice_settings: \`${JSON.stringify(VOICE_SETTINGS)}\``,
    `- remove_background_noise: true`,
    `- output_format: \`mp3_44100_128\``,
    '',
    '## Output',
    `- File: \`${OUTPUT_PATH}\``,
    `- Bytes: ${outBuf.length.toLocaleString()}`,
    `- sha256: \`${outSha}\``,
    `- Latency: ${latencyMs}ms`,
    `- Char-budget impact: +${STS_CHAR_COST_ESTIMATE} estimated`,
    '',
  ].join('\n');
  writeFileSync(LOG_PATH, log);
  console.log(`[path-b]   log: ${LOG_PATH}`);
}

main().catch((e) => {
  console.error('[path-b] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
