import { GoogleGenAI } from '@google/genai';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { NARRATOR_IDS, NARRATOR_PROMPTS } from './narrator-prompts.js';
import type { NarratorLog, NarratorLogEntry } from './types.js';

// --- Constants ---

const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE_NAME = 'Charon'; // Deep, dramatic — good for noir narrator
const INTER_CALL_DELAY_MS = 2_000;
const RETRY_DELAY_MS = 5_000;
const MAX_RETRIES = 3;
const OUTPUT_DIR = resolve('public/audio');

// PCM format from Gemini TTS: 24kHz, 16-bit signed LE, mono
const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

/**
 * Voice direction prepended to every line.
 * Gemini TTS uses natural language in the text prompt to control delivery.
 */
const VOICE_DIRECTION =
  'Read this as a 1940s noir detective narrator. Deep gravelly voice, deliberate pacing, theatrical delivery with dramatic pauses. Think Raymond Chandler audiobook meets Rod Serling: ';

// --- CLI Arg Parsing ---

const rawArgs = process.argv.slice(2).filter((a) => a !== '--');
const { values } = parseArgs({
  args: rawArgs,
  options: {
    only: { type: 'string', multiple: true },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
  allowPositionals: false,
  strict: true,
});

const dryRun = values['dry-run'] ?? false;
const force = values.force ?? false;
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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY not set. Add it to .env (see .env.example).');
  process.exit(1);
}

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap raw PCM data in a WAV container.
 * Gemini TTS returns 24kHz, 16-bit signed LE, mono PCM.
 */
function pcmToWav(pcmData: Buffer): Buffer {
  const dataSize = pcmData.length;
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  // WAV header is 44 bytes
  const header = Buffer.alloc(44);

  // RIFF chunk
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4); // file size - 8
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);           // sub-chunk size
  header.writeUInt16LE(1, 20);            // PCM format
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/** Validate WAV: check RIFF header and non-zero size. */
function isValidWav(buffer: Buffer): boolean {
  if (buffer.length < 44) return false;
  return buffer.toString('ascii', 0, 4) === 'RIFF' &&
         buffer.toString('ascii', 8, 12) === 'WAVE';
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
  ai: GoogleGenAI,
  id: string,
  script: string,
  index: number,
  total: number,
): Promise<{ buffer: Buffer | null; error?: string }> {
  console.log(`\nGenerating "${id}"... (${index + 1}/${total})`);
  console.log(`  Script: "${script.slice(0, 80)}${script.length > 80 ? '...' : ''}"`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would call Gemini TTS with model ${MODEL}, voice ${VOICE_NAME}`);
    return { buffer: null };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [{ text: script }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE_NAME },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`  Empty audio response. Retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return { buffer: null, error: 'No audio data in response' };
      }

      const pcmBuffer = Buffer.from(audioData, 'base64');
      const wavBuffer = pcmToWav(pcmBuffer);

      if (!isValidWav(wavBuffer)) {
        return { buffer: null, error: 'Invalid WAV output' };
      }

      console.log(`  Audio received (${pcmBuffer.length} bytes PCM → ${wavBuffer.length} bytes WAV)`);
      return { buffer: wavBuffer };
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
        const backoff = RETRY_DELAY_MS * (attempt + 1);
        console.warn(`  Error (${status}): ${msg}. Retrying in ${backoff / 1000}s...`);
        await delay(backoff);
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

  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const log: NarratorLog = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    voiceId: VOICE_NAME,
    lines: [],
    summary: { total: linesToGenerate.length, succeeded: 0, failed: 0 },
  };

  const results: Array<{ id: string; status: string; error?: string }> = [];

  console.log(`\n=== Undercover Mob Boss — Narrator Generation ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Voice: ${VOICE_NAME}`);
  console.log(`Lines: ${linesToGenerate.length} of ${NARRATOR_PROMPTS.length}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Force: ${force}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  for (let i = 0; i < linesToGenerate.length; i++) {
    const line = linesToGenerate[i];

    // Skip files that already exist (unless --force)
    if (!force) {
      const outPath = resolve(OUTPUT_DIR, `${line.id}.wav`);
      try {
        await access(outPath);
        console.log(`  [${i + 1}/${linesToGenerate.length}] Skipping ${line.id} (already exists, use --force to overwrite)`);
        results.push({ id: line.id, status: 'skipped' });
        log.lines.push({ id: line.id, status: 'skipped', fileSizeBytes: null, durationMs: null, generatedAt: new Date().toISOString() });
        continue;
      } catch {
        // File doesn't exist — proceed with generation
      }
    }

    const { buffer, error } = await generateOne(ai, line.id, line.script, i, linesToGenerate.length);

    if (dryRun) {
      results.push({ id: line.id, status: 'dry-run' });
      continue;
    }

    const entry: NarratorLogEntry = {
      id: line.id,
      status: buffer ? 'success' : 'failed',
      fileSizeBytes: buffer?.length ?? null,
      durationMs: buffer ? Math.round((buffer.length - 44) / (SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)) * 1000) : null,
      generatedAt: new Date().toISOString(),
    };

    if (buffer) {
      const outPath = resolve(OUTPUT_DIR, `${line.id}.wav`);
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
