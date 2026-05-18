/**
 * Phase 0 Unit 0.2 Step 0.5 — Audio pre-flight clip generator.
 *
 * Generates ONE ~15-second clip via Gemini 3.1 Flash TTS Preview using
 * the Director's Chair adapter (`cadence-spec-gemini.md`) and the
 * 32-word preflight trim of paragraph 1 (`PARAGRAPH_1_PREFLIGHT`).
 *
 * Output:
 *   sample-eval/r4-dash/preflight/gemini-spec-test.wav
 *
 * Cost: ~$0 (Gemini Flash TTS Preview free tier covers single-clip
 * experiments; the model exposes audio output at no additional charge
 * beyond standard token accounting per ai.google.dev/gemini-api/docs/
 * speech-generation as of 2026-05-18).
 *
 * Invoke from `videos/trailer/`:
 *   pnpm tsx scripts/generate-preflight-clip.ts
 *
 * Bash equivalent if pnpm absent:
 *   npx tsx scripts/generate-preflight-clip.ts
 *
 * Per the project autonomy rule (.env load convention), no manual env
 * step is required — dotenv loads from BURNED root, mirroring
 * check-tts-readiness.ts.
 */

import { config as loadEnv } from 'dotenv';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARAGRAPH_1_PREFLIGHT } from './sample-script-dash.js';

// videos/trailer/scripts/generate-preflight-clip.ts → BURNED root = ../../..
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');
const ADAPTER_PATH = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/cadence-spec-gemini.md');
const OUTPUT_DIR = resolve(TRAILER_ROOT, 'sample-eval/r4-dash/preflight');
const WAV_PATH = resolve(OUTPUT_DIR, 'gemini-spec-test.wav');
const LOG_PATH = resolve(OUTPUT_DIR, 'generation-log.md');

loadEnv({ path: ENV_PATH });

// Pinned per cadence-spec-gemini.md §2 — change there first, not here.
const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE_NAME = 'Charon';

// Section markers MUST stay in lockstep with cadence-spec-gemini.md §4.
// Newline-anchored so prose references like "between `---PROMPT START---`
// and `---PROMPT END---`" inside the explanatory sections (§1, §4
// preface) don't false-match before the actual fence line.
const PROMPT_START_MARKER = '\n---PROMPT START---\n';
const PROMPT_END_MARKER = '\n---PROMPT END---\n';
const TRANSCRIPT_SLOT_TOKEN = '{TRANSCRIPT_SLOT}';
const TRANSCRIPT_SECTION_MARKER = '### TRANSCRIPT';

export function extractPromptTemplate(adapterMarkdown: string): string {
  const startIdx = adapterMarkdown.indexOf(PROMPT_START_MARKER);
  const endIdx = adapterMarkdown.indexOf(PROMPT_END_MARKER);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    throw new Error(
      `Could not locate prompt fence in ${ADAPTER_PATH}. Expected lines '---PROMPT START---' and '---PROMPT END---' on their own (newline-bounded).`,
    );
  }
  const inner = adapterMarkdown.slice(startIdx + PROMPT_START_MARKER.length, endIdx);
  return inner.replace(/^\n+/, '').replace(/\n+$/, '');
}

export function substituteTranscript(template: string, transcript: string): string {
  const slotCount = template.split(TRANSCRIPT_SLOT_TOKEN).length - 1;
  if (slotCount !== 1) {
    throw new Error(
      `Adapter template must contain exactly one ${TRANSCRIPT_SLOT_TOKEN}; found ${slotCount}.`,
    );
  }
  return template.replace(TRANSCRIPT_SLOT_TOKEN, transcript);
}

/**
 * VOICE_DIRECTION ANTI-PATTERN RUNTIME GUARD — see cadence-spec-gemini.md §1.
 *
 * Gemini Flash TTS reads ALL prose in the request payload aloud unless
 * the `### TRANSCRIPT` section marker explicitly demarcates the
 * read-aloud content. The Director's Notes / Scene / Audio Profile
 * steering prose lives ABOVE the `### TRANSCRIPT` marker — without
 * the marker, those words get spoken aloud as part of the audio
 * (twice-bitten failure mode per memory `feedback-narrator-voice-direction`).
 *
 * Two runtime assertions before POST:
 *   1. The full prompt contains exactly one `### TRANSCRIPT` marker —
 *      catches accidental marker deletion / typo.
 *   2. The substituted transcript content (the slot text only) does NOT
 *      contain direction-language tokens — defense-in-depth against a
 *      future paragraph edit slipping director prose into the read.
 *
 * Compile-time guard lives in `sample-script-dash.test.ts` (asserts on
 * the static script text); this runtime guard catches dynamic
 * substitution + marker-deletion bugs the static test cannot see.
 */
export function assertVoiceDirectionGuard(prompt: string, transcript: string): void {
  const markerCount = prompt.split(TRANSCRIPT_SECTION_MARKER).length - 1;
  if (markerCount !== 1) {
    throw new Error(
      `VOICE_DIRECTION guard: expected exactly one ${TRANSCRIPT_SECTION_MARKER} marker in prompt, found ${markerCount}. Cadence-spec prose will be spoken aloud without it.`,
    );
  }
  const FORBIDDEN_IN_TRANSCRIPT = [
    /\b(read|speak|narrate|deliver) (this|the following)\b/i,
    /\bvoice (direction|notes?)\b/i,
    /\bin a (deep|gravelly|noir|deadpan|sardonic|dramatic) voice\b/i,
  ];
  for (const pattern of FORBIDDEN_IN_TRANSCRIPT) {
    if (pattern.test(transcript)) {
      throw new Error(
        `VOICE_DIRECTION guard: transcript content matches forbidden directive pattern ${pattern}. The transcript must contain only words to be voiced, never directions on how to voice them.`,
      );
    }
  }
}

/**
 * Wrap raw 24kHz / 16-bit / mono PCM in a WAV RIFF header so the file
 * is directly playable by any standard audio app. No `wav` npm dep —
 * 44-byte header is trivial and the call-site count is one.
 *
 * Reference: http://soundfile.sapp.org/doc/WaveFormat/
 */
function pcmToWav(pcmBuffer: Buffer): Buffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
  error?: { code?: number; message?: string; status?: string };
};

async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(`GEMINI_API_KEY missing from ${ENV_PATH}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const adapter = readFileSync(ADAPTER_PATH, 'utf8');
  const template = extractPromptTemplate(adapter);
  const prompt = substituteTranscript(template, PARAGRAPH_1_PREFLIGHT);

  // VOICE_DIRECTION RUNTIME GUARD — see assertVoiceDirectionGuard.
  // If this throws, the spec / script / adapter changed in a way that
  // would leak director prose into the spoken audio. Fix the source,
  // never weaken the guard.
  assertVoiceDirectionGuard(prompt, PARAGRAPH_1_PREFLIGHT);

  console.log(`[preflight] model=${MODEL} voice=${VOICE_NAME}`);
  console.log(`[preflight] transcript=${PARAGRAPH_1_PREFLIGHT.length} chars`);
  console.log(`[preflight] prompt=${prompt.length} chars (target <8K Gemini context)`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE_NAME },
        },
      },
    },
  };

  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsedMs = Date.now() - started;

  if (!res.ok) {
    const text = await res.text();
    // No key leak — log the URL with the key masked.
    const safeUrl = url.replace(/key=[^&]+/, 'key=***');
    throw new Error(`Gemini ${res.status} ${res.statusText}\nURL: ${safeUrl}\nBody: ${text.slice(0, 2000)}`);
  }

  const json = (await res.json()) as GeminiResponse;
  if (json.error) {
    throw new Error(`Gemini error ${json.error.code}: ${json.error.message}`);
  }

  const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const pcmBase64 = inlineData?.data;
  if (!pcmBase64) {
    throw new Error(
      `Gemini response missing inlineData.data. Shape: ${JSON.stringify(json, null, 2).slice(0, 1500)}`,
    );
  }

  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const wavBuffer = pcmToWav(pcmBuffer);
  writeFileSync(WAV_PATH, wavBuffer);

  // 24 kHz × 2 bytes/sample × mono → 48 000 bytes per second of audio.
  const durationSeconds = pcmBuffer.length / 48000;

  const log = [
    '# Preflight Generation Log',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Model: \`${MODEL}\``,
    `- Voice: \`${VOICE_NAME}\``,
    `- Adapter: \`videos/trailer/sample-eval/r4-dash/cadence-spec-gemini.md\``,
    `- Transcript: \`PARAGRAPH_1_PREFLIGHT\` (${PARAGRAPH_1_PREFLIGHT.split(/\s+/).length} words, ${PARAGRAPH_1_PREFLIGHT.length} chars)`,
    `- Prompt size: ${prompt.length} chars`,
    `- API latency: ${elapsedMs} ms`,
    `- PCM bytes returned: ${pcmBuffer.length.toLocaleString()}`,
    `- WAV file size: ${wavBuffer.length.toLocaleString()} bytes`,
    `- Audio duration: ${durationSeconds.toFixed(2)} s (target ~15 s)`,
    `- MIME type reported: \`${inlineData?.mimeType ?? '(none)'}\``,
    `- Output: \`${WAV_PATH.replace(BURNED_ROOT, '').replace(/^[/\\\\]/, '')}\``,
    '',
    '## Next step',
    '',
    'Audition `gemini-spec-test.wav` and capture votes in',
    '`preflight-decision.md` (Reader A + Reader B). Step 1.5 is gated on',
    'both readers passing per Phase 0 plan §Unit 0.2 Step 0.5.',
    '',
  ].join('\n');
  writeFileSync(LOG_PATH, log);

  console.log(`[preflight] wrote ${WAV_PATH}`);
  console.log(`[preflight] duration ${durationSeconds.toFixed(2)}s (target ~15s)`);
  console.log(`[preflight] log ${LOG_PATH}`);
}

// Only execute when invoked directly via `pnpm preflight` or `tsx`.
// Without this guard, importing `extractPromptTemplate` /
// `substituteTranscript` / `assertVoiceDirectionGuard` from this file
// (as generate-tts-eval.ts does) triggers a Gemini API call on every
// import — wastes budget and produces confusing logs.
const isCalledDirectly = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url);
if (isCalledDirectly) {
  main().catch((err) => {
    console.error('[preflight] FAIL');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
