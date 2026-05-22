/**
 * Phase 2 Unit 2.6 Step 3 — automated beat-position verification.
 *
 * Runs FFmpeg silencedetect on stitched WAVs and confirms each
 * inserted silence matches its declared duration within tolerance.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const LINES_DIR = resolve(TRAILER_ROOT, 'public/audio/lines');

const BEAT_TOKEN = /\[BEAT\s+(\d+(?:\.\d+)?)(ms|s)\]/g;
const TOLERANCE_MS = 15;
const DETECT_THRESHOLD_DB = -50;
const DETECT_MIN_SILENCE_MS = 200;

interface DetectedSilence {
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
}

function parseBeatDurations(text: string): number[] {
  const beatsMs: number[] = [];
  BEAT_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BEAT_TOKEN.exec(text)) !== null) {
    const value = parseFloat(m[1]);
    beatsMs.push(m[2] === 's' ? Math.round(value * 1000) : Math.round(value));
  }
  return beatsMs;
}

function detectSilences(wavPath: string): DetectedSilence[] {
  // silencedetect writes to STDERR, not stdout — use spawnSync so we
  // can capture both pipes (execFileSync only returns stdout).
  const result = spawnSync(
    'ffmpeg',
    [
      '-nostdin',
      '-i',
      wavPath,
      '-af',
      `silencedetect=noise=${DETECT_THRESHOLD_DB}dB:d=${DETECT_MIN_SILENCE_MS / 1000}`,
      '-f',
      'null',
      '-',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' },
  );
  const stderr = String(result.stderr ?? '');
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((mm) =>
    Math.round(parseFloat(mm[1]) * 1000),
  );
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((mm) =>
    Math.round(parseFloat(mm[1]) * 1000),
  );
  const out: DetectedSilence[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    out.push({
      startMs: starts[i],
      endMs: ends[i],
      durationMs: ends[i] - starts[i],
    });
  }
  return out;
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

interface CueAuditRow {
  readonly cueId: string;
  readonly declared: readonly number[];
  readonly detected: readonly DetectedSilence[];
  readonly matches: readonly {
    declaredMs: number;
    detectedMs: number | null;
    driftMs: number | null;
  }[];
  readonly allWithinTolerance: boolean;
}

let totalFailures = 0;
const rows: CueAuditRow[] = [];

for (const cue of BURNED_TRAILER_LINES) {
  const declared = parseBeatDurations(cue.text);
  if (declared.length === 0) continue;

  const wavPath = resolve(LINES_DIR, cueFilename(cue));
  if (!existsSync(wavPath)) {
    console.warn(`MISS ${cue.id} — WAV not present at ${wavPath}`);
    totalFailures++;
    continue;
  }

  const detected = detectSilences(wavPath);

  // Greedy match: for each declared beat, claim the closest-duration
  // detected silence and remove from the pool.
  const pool = [...detected];
  const matches: CueAuditRow['matches'] = declared.map((declaredMs) => {
    let bestIdx = -1;
    let bestDrift = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pool.length; i++) {
      const drift = Math.abs(pool[i].durationMs - declaredMs);
      if (drift < bestDrift) {
        bestDrift = drift;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      return { declaredMs, detectedMs: null, driftMs: null };
    }
    const claimed = pool.splice(bestIdx, 1)[0];
    return {
      declaredMs,
      detectedMs: claimed.durationMs,
      driftMs: claimed.durationMs - declaredMs,
    };
  });

  const allWithinTolerance = matches.every(
    (m) => m.driftMs !== null && Math.abs(m.driftMs) <= TOLERANCE_MS,
  );
  if (!allWithinTolerance) totalFailures++;

  rows.push({
    cueId: cue.id,
    declared,
    detected,
    matches,
    allWithinTolerance,
  });
}

console.log('Stitch position verification — Unit 2.6 Step 3\n');
console.log(
  `Tolerance: ±${TOLERANCE_MS} ms. Detection floor: ${DETECT_THRESHOLD_DB} dB / ${DETECT_MIN_SILENCE_MS} ms.\n`,
);

for (const row of rows) {
  console.log(
    `${row.cueId} (${row.detected.length} silence(s) detected ≥${DETECT_MIN_SILENCE_MS} ms)`,
  );
  console.log(
    pad('  #', 4) +
      pad('declared', 12) +
      pad('detected', 12) +
      pad('drift', 12) +
      'verdict',
  );
  console.log('  ' + '─'.repeat(48));
  for (let i = 0; i < row.matches.length; i++) {
    const m = row.matches[i];
    const detectedStr = m.detectedMs === null ? 'NO MATCH' : `${m.detectedMs} ms`;
    const driftStr =
      m.driftMs === null ? '—' : `${m.driftMs >= 0 ? '+' : ''}${m.driftMs} ms`;
    const verdict =
      m.driftMs === null
        ? 'FAIL'
        : Math.abs(m.driftMs) <= TOLERANCE_MS
          ? 'OK'
          : 'FAIL';
    console.log(
      pad(`  ${i + 1}`, 4) +
        pad(`${m.declaredMs} ms`, 12) +
        pad(detectedStr, 12) +
        pad(driftStr, 12) +
        verdict,
    );
  }
  const extras = row.detected.length - row.declared.length;
  if (extras > 0) {
    console.log(
      `  Note: ${extras} additional silence(s) detected beyond declared beats ` +
        `(segment-internal v3 pauses — expected, not a stitch bug).`,
    );
  }
  console.log();
}

if (totalFailures > 0) {
  console.error(`${totalFailures} cue(s) failed stitch-position verification.`);
  process.exit(3);
}
console.log('All declared beats within tolerance ✓');
