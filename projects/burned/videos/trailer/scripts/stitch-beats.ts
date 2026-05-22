/**
 * Phase 2 Unit 2.6 intra-line beat handling.
 *
 * For cues whose `text` contains `[BEAT N.Ns]` or `[BEAT NNNms]`
 * marker tokens (currently the S03 cues per Phase 1 Unit 1.2 Step 4
 * — S03-roster has 3 markers, S03-deck has 1), this script:
 *
 *   1. Parses tokens out of `cue.text` to extract segment boundaries
 *      + beat durations.
 *   2. Renders each segment via `generateForCue` (one API call per
 *      segment); per-segment spend is tracked under a synthetic
 *      `${cue.id}#seg${i}` cueId.
 *   3. Generates `anullsrc` mono silence WAVs of the declared
 *      duration at each beat position.
 *   4. Concatenates via FFmpeg `concat` demuxer into a single
 *      stitched WAV.
 *   5. Writes the stitched WAV to `public/audio/lines/raw/` (NOT
 *      the in-place location). Unit 2.5 post-process detects the
 *      new rawMtime via its sentinel SHA and re-applies loudnorm +
 *      silenceremove + fade.
 *
 * Token format: handles BOTH `[BEAT 0.3s]` (decimal seconds) AND
 * `[BEAT 300ms]` (integer milliseconds). The Phase 2 plan's
 * deepening notes claimed Phase 1 ships the `ms` form, but the
 * actual `src/lib/script.ts` ships the decimal-second form.
 * Supporting both keeps the regex resilient to either convention.
 *
 * Spec: `docs/plans/origin-trailer/phase-2-voice-pipeline.md`
 * Unit 2.6 §Step 2.
 */
import 'dotenv/config';
import { execFileSync as runArgv } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { cueFilename } from './lib/cue-filename.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { assertWithinBudget, trackSpend, totalSpend, HARD_CEILING_USD } from './lib/cost-tracker.js';
import { generateForCue } from './tts-clients/index.js';
import { isValidWav } from './tts-clients/wav-utils.js';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const LINES_DIR = resolve(TRAILER_ROOT, 'public/audio/lines');
const RAW_DIR = resolve(LINES_DIR, 'raw');
const PHASE_0_EXIT = resolve(TRAILER_ROOT, 'PHASE-0-EXIT.md');

const BEAT_TOKEN = /\[BEAT\s+(\d+(?:\.\d+)?)(ms|s)\]/g;

function toFFmpegPath(p: string): string {
  // FFmpeg concat-demuxer treats `\` as escape; forward-slash is safe
  // on every platform including Windows.
  return p.replace(/\\/g, '/');
}

function parseBeatMs(value: string, unit: string): number {
  const n = parseFloat(value);
  return unit === 's' ? Math.round(n * 1000) : Math.round(n);
}

interface ParsedBeats {
  readonly segments: readonly string[];
  readonly beatsMs: readonly number[];
}

function parseBeats(text: string): ParsedBeats {
  const segments: string[] = [];
  const beatsMs: number[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  BEAT_TOKEN.lastIndex = 0;
  while ((match = BEAT_TOKEN.exec(text)) !== null) {
    segments.push(text.slice(cursor, match.index).trim());
    beatsMs.push(parseBeatMs(match[1], match[2]));
    cursor = match.index + match[0].length;
  }
  segments.push(text.slice(cursor).trim());
  return { segments, beatsMs };
}

/**
 * Trim leading + trailing silence on a per-segment WAV in place via
 * the same areverse-sandwich pattern Unit 2.5 post-process uses. This
 * is necessary because each rendered segment carries v3's natural
 * sentence-end pause (~1.5-2s of trailing silence per sentence) that
 * compounds across the concat. Trimming per-segment lets the anullsrc
 * `[BEAT N.Ns]` silence become the ONLY inter-segment gap — matching
 * Phase 1's timing intent.
 *
 * Threshold matches the post-process rule for sustained cueType
 * (S03's cueType): `-50dB`. Payoff/scream cueTypes don't currently
 * carry beat markers; if a future beat-bearing payoff cue arrives,
 * mirror Unit 2.5's `cueType === 'payoff' || 'scream' ? -30dB : -50dB`
 * rule here.
 */
function trimSegmentSilence(inPath: string, outPath: string): void {
  // start_silence=0.005 (5 ms) — tighter than Unit 2.5 post-process's
  // 50 ms cushion because INSIDE a stitch we want zero compounding
  // with the inserted anullsrc gap. The inserted anullsrc IS the
  // cushion; per-segment cushion would push detected silence beyond
  // declared by up to 100 ms (50 ms × 2 segment edges) and blow the
  // ±15 ms tolerance Unit 2.6 Step 3 verifies. 5 ms × 2 sides = 10 ms
  // worst-case, comfortably inside tolerance.
  const filter = [
    'silenceremove=start_periods=1:start_silence=0.005:start_threshold=-50dB:detection=peak',
    'areverse',
    'silenceremove=start_periods=1:start_silence=0.005:start_threshold=-50dB:detection=peak',
    'areverse',
  ].join(',');
  runArgv(
    'ffmpeg',
    [
      '-y',
      '-i',
      inPath,
      '-af',
      filter,
      '-ar',
      '48000',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      outPath,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function makeSilence(durSec: number, outPath: string): void {
  // anullsrc → mono 48kHz pcm_s16le; matches the post-process output
  // format so concat-demuxer can copy without re-encoding.
  runArgv(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=mono:sample_rate=48000',
      '-t',
      durSec.toFixed(3),
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      outPath,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function concatWavs(parts: readonly string[], outPath: string): void {
  // Per-invocation unique temp list path; concurrent runs won't clobber.
  const concatTmpDir = join(tmpdir(), 'burned-stitch');
  if (!existsSync(concatTmpDir)) mkdirSync(concatTmpDir, { recursive: true });
  const listPath = join(
    concatTmpDir,
    `concat-list-${Date.now()}-${process.pid}.txt`,
  );
  const tmpOut = `${outPath}.stitch.tmp`;
  try {
    writeFileSync(
      listPath,
      parts.map((p) => `file '${toFFmpegPath(p)}'`).join('\n'),
    );
    runArgv(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c',
        'copy',
        '-f',
        'wav',
        tmpOut,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    renameSync(tmpOut, outPath);
  } finally {
    try {
      unlinkSync(listPath);
    } catch {
      /* ignore */
    }
    try {
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
    } catch {
      /* ignore */
    }
  }
}

async function stitchCue(cue: Line, cfg: Phase0ExitConfig): Promise<'stitched' | 'no-beats'> {
  const { segments, beatsMs } = parseBeats(cue.text);
  if (beatsMs.length === 0) return 'no-beats';

  const filename = cueFilename(cue);
  console.log(
    `STITCH ${filename}: ${beatsMs.length} beat(s) at ${beatsMs.join('ms / ')}ms`,
  );

  const voiceId = cfg.voiceIds[cue.voice];
  if (!voiceId) {
    throw new Error(
      `No voice ID for cell '${cue.voice}' in PHASE-0-EXIT.md.`,
    );
  }
  const cadenceAdapter = readFileSync(
    resolve(TRAILER_ROOT, cfg.cadenceAdapterPath),
    'utf-8',
  );

  // Per-cue temp dir; deleted at the end whether stitch succeeds or not.
  const segTmpDir = join(tmpdir(), `burned-stitch-${cue.id}-${Date.now()}`);
  mkdirSync(segTmpDir, { recursive: true });

  const parts: string[] = [];
  try {
    for (let i = 0; i < segments.length; i++) {
      const segText = segments[i];
      if (!segText) continue; // skip empty trailing segment

      await assertWithinBudget();

      const rawSegPath = join(segTmpDir, `${cue.id}-seg-${i}.raw.wav`);
      const trimmedSegPath = join(segTmpDir, `${cue.id}-seg-${i}.wav`);
      const wavBuf = await generateForCue({
        engine: cfg.engine,
        text: segText,
        voice: cue.voice,
        voiceId,
        cadenceAdapter,
        cadencePrefixTag: cue.cadenceAdapter?.prefixTag,
        modelId: cfg.modelId,
      });
      if (!isValidWav(wavBuf)) {
        throw new Error(
          `Invalid WAV returned for ${cue.id} segment ${i} — RIFF/WAVE header missing.`,
        );
      }
      atomicWriteSync(rawSegPath, wavBuf);
      // Trim per-segment leading + trailing silence so the inserted
      // anullsrc gap becomes the ONLY inter-segment pause.
      trimSegmentSilence(rawSegPath, trimmedSegPath);
      parts.push(trimmedSegPath);

      // Track spend per segment under a synthetic cueId so the spend
      // log can attribute the cost line-by-line to the stitched cue.
      const segCue: Line = { ...cue, id: `${cue.id}#seg${i}`, text: segText };
      const voiceIdPrefix = voiceId.length <= 8 ? voiceId : `${voiceId.slice(0, 8)}...`;
      await trackSpend(segCue, cfg.engine, voiceIdPrefix);

      // Insert silence after this segment unless this is the last spoken
      // segment (beatsMs.length silences total — one per gap, fewer if
      // the trailing segment was empty).
      if (i < beatsMs.length) {
        const silencePath = join(segTmpDir, `${cue.id}-silence-${i}.wav`);
        makeSilence(beatsMs[i] / 1000, silencePath);
        parts.push(silencePath);
      }

      // Gentle inter-call delay matching the main generator (~2s).
      if (i < segments.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Concat directly into raw/ so post-process picks up the new mtime
    // and re-applies loudnorm + silenceremove + fades.
    if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
    const rawOut = join(RAW_DIR, filename);
    concatWavs(parts, rawOut);

    // Invalidate the post-process sentinel so the next post-process run
    // doesn't shortcut-skip on a stale rawMtime cache.
    const sentinelPath = join(LINES_DIR, `${filename}.processed`);
    try {
      if (existsSync(sentinelPath)) unlinkSync(sentinelPath);
    } catch {
      /* ignore */
    }

    console.log(`OK     ${filename} → raw/ (${parts.length} parts)`);
    return 'stitched';
  } finally {
    try {
      rmSync(segTmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function main(): Promise<void> {
  ffmpegPreflight();
  const cfg = parsePhase0Exit(PHASE_0_EXIT);

  const beatBearing = BURNED_TRAILER_LINES.filter((c) => {
    BEAT_TOKEN.lastIndex = 0;
    return BEAT_TOKEN.test(c.text);
  });
  BEAT_TOKEN.lastIndex = 0;

  console.log(
    `Stitching ${beatBearing.length} beat-bearing cue(s): ${beatBearing.map((c) => c.id).join(', ')}`,
  );

  let stitched = 0;
  for (const cue of beatBearing) {
    const verdict = await stitchCue(cue, cfg);
    if (verdict === 'stitched') stitched++;
  }

  const cumulative = totalSpend();
  console.log(
    `\nDone — stitched=${stitched} / ${beatBearing.length}. Cumulative spend: $${cumulative.toFixed(2)} / $${HARD_CEILING_USD}.`,
  );
  console.log('\nNext: pnpm post-process (mtime invalidation will re-process the new raw stitched cues).');
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
