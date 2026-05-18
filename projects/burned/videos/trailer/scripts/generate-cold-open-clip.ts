/**
 * Phase 0 Unit 0.3 Step 2 — Cold-open TTS renderer.
 *
 * Parameterized one-shot TTS call against the cold-open speaker voice
 * (Sarah, ElevenLabs Voice Library, model eleven_v3) for the R14 binary
 * autonomy-hook gate. Renders one TESTED candidate at a time so Briggsy
 * can A/B-audition without re-running a matrix.
 *
 * Invoke from `videos/trailer/`:
 *   pnpm cold-open:clip --candidate 4
 *   pnpm cold-open:clip --candidate 5
 *
 * Output:
 *   sample-eval/r14-cold-open/clips/candidate-{4,5}.mp3
 *
 * Voice + settings inherit Unit 0.2 Roger lock for stylistic consistency
 * (stability 0.70 / similarity 0.75 / style 0.15 / speaker_boost true /
 * speed 0.95) — the cadence-spec rationale (deadpan, declarative,
 * compressed dynamic range) applies to the cold-open speaker the same
 * way it applies to Dash. Voice ID swaps to Sarah; settings stay.
 *
 * Bracket-tag treatment:
 *   - [deadpan] leading — establishes register, mirrors Unit 0.4 tone
 *     paragraph's leading tag pattern.
 *   - [sarcastic] inline before the kicker phrase ("Honestly..." for
 *     #4, "He's getting good..." for #5) — sardonic-micro-lift on the
 *     punchline tail. Same shape as Unit 0.4's …Phrasing tag handling.
 *
 * Char-budget impact: ~95 chars per render (paragraph + 22 chars of
 * bracket tags). Two renders ≈ 190 chars ≈ 0.19% of monthly cap.
 */

import { config as loadEnv } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_4,
  CANDIDATE_5,
  COLD_OPEN_SPEAKER,
  type CandidateId,
} from './cold-open-prototype.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

const CLIPS_DIR = resolve(TRAILER_ROOT, 'sample-eval/r14-cold-open/clips');
const PUBLIC_COLD_OPEN_DIR = resolve(BURNED_ROOT, 'public/trailer/cold-open');
const BUDGET_PATH = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/char-budget.json');

const MODEL_ID = 'eleven_v3';
const VOICE_SETTINGS = {
  stability: 0.70,
  similarity_boost: 0.75,
  style: 0.15,
  use_speaker_boost: true,
  speed: 0.95,
} as const;

loadEnv({ path: ENV_PATH });

function parseArgs(): { candidate: CandidateId } {
  const argv = process.argv.slice(2);
  let id: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--candidate' && i + 1 < argv.length) {
      id = Number(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (id !== 4 && id !== 5) {
    throw new Error('--candidate is required and must be 4 or 5');
  }
  return { candidate: id };
}

/**
 * Wraps the raw paragraph with the Unit 0.3 bracket-tag treatment:
 * leading [deadpan] for the declarative read, [sarcastic] immediately
 * before the kicker phrase to reinforce the sardonic-micro-lift.
 *
 * Each candidate has its own anchor phrase — fails LOUDLY if the
 * paragraph constant drifts away from the anchor, so a future text
 * edit can't silently strand the inline tag at column 0.
 */
function buildPayload(candidate: CandidateId): string {
  if (candidate === 4) {
    const anchor = 'Honestly';
    if (!CANDIDATE_4.includes(anchor)) {
      throw new Error(`CANDIDATE_4 missing "${anchor}" anchor — inline-tag insertion would fail silently.`);
    }
    const tagged = CANDIDATE_4.replace(anchor, `[sarcastic] ${anchor}`);
    return `[deadpan] ${tagged}`;
  }
  const anchor = "He's getting good";
  if (!CANDIDATE_5.includes(anchor)) {
    throw new Error(`CANDIDATE_5 missing "${anchor}" anchor — inline-tag insertion would fail silently.`);
  }
  const tagged = CANDIDATE_5.replace(anchor, `[sarcastic] ${anchor}`);
  return `[deadpan] ${tagged}`;
}

async function main(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error(`ELEVENLABS_API_KEY missing from ${ENV_PATH}`);

  const { candidate } = parseArgs();
  const payload = buildPayload(candidate);

  console.log(`[cold-open] candidate: #${candidate}`);
  console.log(`[cold-open] payload (${payload.length} chars):`);
  console.log(`[cold-open]   "${payload}"`);
  console.log(`[cold-open] voice: ${COLD_OPEN_SPEAKER.voiceLibraryName} (${COLD_OPEN_SPEAKER.voiceId}), model ${MODEL_ID}`);

  const started = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${COLD_OPEN_SPEAKER.voiceId}`, {
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
  mkdirSync(CLIPS_DIR, { recursive: true });
  mkdirSync(PUBLIC_COLD_OPEN_DIR, { recursive: true });
  // Write to BOTH: sample-eval is the audit-trail location (bare-audio
  // audition + signoff record); public/trailer/cold-open is the render-
  // input location (Remotion staticFile resolution under ADR #15).
  const auditPath = resolve(CLIPS_DIR, `candidate-${candidate}.mp3`);
  const renderInputPath = resolve(PUBLIC_COLD_OPEN_DIR, `candidate-${candidate}.mp3`);
  writeFileSync(auditPath, buf);
  writeFileSync(renderInputPath, buf);

  console.log(`[cold-open] audit-trail: ${auditPath}`);
  console.log(`[cold-open] render-input: ${renderInputPath}`);
  console.log(`[cold-open]   bytes: ${buf.length.toLocaleString()}`);
  console.log(`[cold-open]   sha256: ${sha256Hex}`);
  console.log(`[cold-open]   latency: ${latencyMs}ms`);

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
    console.log(`[cold-open]   char-budget: +${payload.length} → ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`);
  }
}

main().catch((e) => {
  console.error('[cold-open] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
