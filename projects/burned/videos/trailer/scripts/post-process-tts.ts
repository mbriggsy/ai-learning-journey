/**
 * Phase 2 Unit 2.5 audio post-process pipeline.
 *
 * Two-pass `loudnorm` (-16 LUFS / LRA 9 / TP -1.5 dBTP) +
 * areverse-sandwich `silenceremove` (SKIP for `cue.skipSilenceremove`)
 * + per-cue `afade` from `Line.fadeInMs` / `Line.fadeOutMs` + `-ac 1`
 * mono lock + 48 kHz / pcm_s16le.
 *
 * Raw input WAVs preserved in `public/audio/lines/raw/`. Processed
 * versions overwrite the in-place location atomically via `.tmp`. An
 * idempotence sentinel `${final}.processed` stores
 * `sha256(rawMtime + filter signature)` so re-running skips no-op
 * work.
 *
 * Spec: `docs/plans/origin-trailer/phase-2-voice-pipeline.md` Unit
 * 2.5 §Step 4. Pass-1 measure → pass-2 apply with `linear=true`
 * (NOT dynamic compression). Pass-2B fade is a second invocation so
 * the fade-out start uses the POST-trim duration.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ffmpegPreflight, runFFmpegJson } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { cueFilename } from './lib/cue-filename.js';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const LINES_DIR = resolve(TRAILER_ROOT, 'public/audio/lines');
const RAW_DIR = resolve(LINES_DIR, 'raw');
const PHASE_0_EXIT = resolve(TRAILER_ROOT, 'PHASE-0-EXIT.md');
const LOUDNESS_LOG = resolve(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/loudness-audit.jsonl',
);

const TARGET_I = -16;
const TARGET_LRA = 9;
const TARGET_TP = -1.5;

interface LoudnormMeasured {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function probeDurationSec(wavPath: string): number {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      wavPath,
    ],
    { encoding: 'utf-8' },
  );
  return parseFloat(out.trim());
}

function buildSilenceremoveFilter(threshold: string): string {
  return [
    `silenceremove=start_periods=1:start_silence=0.05:start_threshold=${threshold}:detection=peak`,
    'areverse',
    `silenceremove=start_periods=1:start_silence=0.05:start_threshold=${threshold}:detection=peak`,
    'areverse',
  ].join(',');
}

function buildFadeFilters(cue: Line, durSec: number): string[] {
  const fadeInMs = cue.fadeInMs ?? 30;
  const fadeOutMs = cue.fadeOutMs ?? 30;
  const fadeInSec = fadeInMs / 1000;
  const fadeOutSec = fadeOutMs / 1000;
  // qsin (quarter-sine) curve for expressive cues per deepening lock
  const curve =
    cue.cueType === 'scream' || cue.id === 'S06-phrasing' ? ':curve=qsin' : '';
  const filters: string[] = [];
  if (fadeInMs > 0) filters.push(`afade=t=in:st=0:d=${fadeInSec}${curve}`);
  if (fadeOutMs > 0) {
    const fadeOutStart = Math.max(0, durSec - fadeOutSec);
    filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}${curve}`);
  }
  return filters;
}

function processCue(cue: Line, cfg: Phase0ExitConfig): 'processed' | 'skipped' | 'absent' {
  // R5 outcome gating (consistent with Unit 2.2)
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') return 'absent';

  const filename = cueFilename(cue);
  const final = resolve(LINES_DIR, filename);
  const raw = resolve(RAW_DIR, filename);

  if (!existsSync(final) && !existsSync(raw)) {
    console.warn(`MISS ${filename} (no raw + no processed; run Unit 2.4 first)`);
    return 'absent';
  }

  // First post-process moves raw out of in-place location into raw/
  if (!existsSync(raw) && existsSync(final)) {
    renameSync(final, raw);
  }

  // Idempotence sentinel: skip if raw mtime + filter signature unchanged
  const rawMtime = statSync(raw).mtimeMs;
  const filterSha = createHash('sha256')
    .update(
      `${rawMtime}|${cue.cueType}|${cue.fadeInMs ?? 30}|${cue.fadeOutMs ?? 30}|` +
        `${cue.skipSilenceremove ?? false}|${TARGET_I}|${TARGET_LRA}|${TARGET_TP}`,
    )
    .digest('hex')
    .slice(0, 16);
  const sentinelPath = `${final}.processed`;
  if (
    existsSync(sentinelPath) &&
    existsSync(final) &&
    readFileSync(sentinelPath, 'utf-8').trim() === filterSha
  ) {
    console.log(`SKIP ${filename} (sentinel matches)`);
    return 'skipped';
  }

  // Pass 1 — measure loudness
  const pass1 = runFFmpegJson([
    '-i',
    raw,
    '-af',
    `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json`,
    '-f',
    'null',
    '-',
  ]) as LoudnormMeasured;

  // Build Pass 2A filter chain (loudnorm + silenceremove).
  // -30dB is the more aggressive threshold for "non-scream expressive
  // cues" (payoff one-liners — Phrasing, S04-payoff, S06-close); -50dB
  // for paced cues (sustained, list, cold-open) — per Phase 2 plan
  // §Step 2. The scream cue gets skipSilenceremove entirely, so its
  // threshold value is unused.
  const trimThreshold = cue.cueType === 'payoff' || cue.cueType === 'scream'
    ? '-30dB'
    : '-50dB';
  const pass2Filters: string[] = [
    `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:` +
      `measured_I=${pass1.input_i}:measured_TP=${pass1.input_tp}:` +
      `measured_LRA=${pass1.input_lra}:measured_thresh=${pass1.input_thresh}:` +
      `offset=${pass1.target_offset}:linear=true:print_format=summary`,
  ];
  if (!cue.skipSilenceremove) {
    pass2Filters.push(buildSilenceremoveFilter(trimThreshold));
  }

  const tmpPath = `${final}.tmp`;
  const tmpFade = `${final}.fade.tmp`;

  try {
    // Pass 2A — loudnorm + (maybe) silenceremove → .tmp
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        raw,
        '-af',
        pass2Filters.join(','),
        '-ar',
        '48000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        tmpPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    // Pass 2B — afade using POST-trim duration
    const postTrimSec = probeDurationSec(tmpPath);
    const fadeFilters = buildFadeFilters(cue, postTrimSec);
    if (fadeFilters.length > 0) {
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-i',
          tmpPath,
          '-af',
          fadeFilters.join(','),
          '-ar',
          '48000',
          '-ac',
          '1',
          '-c:a',
          'pcm_s16le',
          '-f',
          'wav',
          tmpFade,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      renameSync(tmpFade, final);
      try {
        unlinkSync(tmpPath);
      } catch {
        // tmp already gone is fine
      }
    } else {
      renameSync(tmpPath, final);
    }

    writeFileSync(sentinelPath, filterSha);
    console.log(`POST ${filename}`);
    return 'processed';
  } catch (e) {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(tmpFade);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

function loudnessAudit(cfg: Phase0ExitConfig): void {
  // Truncate the audit log per run so each invocation is a fresh report.
  writeFileSync(LOUDNESS_LOG, '');
  for (const cue of BURNED_TRAILER_LINES) {
    if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') continue;
    const final = resolve(LINES_DIR, cueFilename(cue));
    if (!existsSync(final)) continue;
    const summary = runFFmpegJson([
      '-i',
      final,
      '-af',
      `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json`,
      '-f',
      'null',
      '-',
    ]) as LoudnormMeasured;
    const measuredI = parseFloat(summary.input_i);
    const drift = Math.abs(measuredI - TARGET_I);
    if (drift > 1.0) {
      console.warn(
        `!! ${cueFilename(cue)} loudness drift: measured ${summary.input_i} LUFS vs target ${TARGET_I} (Δ ${drift.toFixed(2)} LU)`,
      );
    }
    appendFileSync(
      LOUDNESS_LOG,
      JSON.stringify({
        cueId: cue.id,
        measuredI: summary.input_i,
        measuredTp: summary.input_tp,
        targetI: TARGET_I,
        drift,
      }) + '\n',
    );
  }
}

function main(): void {
  ffmpegPreflight();
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
  const cfg = parsePhase0Exit(PHASE_0_EXIT);

  const counters = { processed: 0, skipped: 0, absent: 0 };
  for (const cue of BURNED_TRAILER_LINES) {
    const verdict = processCue(cue, cfg);
    counters[verdict]++;
  }
  console.log(
    `\nPost-process: processed=${counters.processed} skipped=${counters.skipped} absent=${counters.absent}`,
  );

  console.log('\nRunning loudness audit...');
  loudnessAudit(cfg);
  console.log(`Loudness audit written: ${LOUDNESS_LOG}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
