/**
 * FFmpeg / FFprobe preflight + thin wrappers.
 *
 * Phase 2 audio post-processing requires >=5.0 for two-pass loudnorm +
 * areverse-sandwich silenceremove. Wrappers return parsed JSON where
 * applicable so callers don't shell-stringify themselves.
 *
 * Uses `node:child_process` `execFileSync` (NOT `exec`) — argv arrays
 * never pass through a shell, matching project security convention.
 */
import { execFileSync as runArgv, spawnSync } from 'node:child_process';

const MIN_FFMPEG_VERSION = 5;

export interface FFmpegBins {
  readonly ffmpegVersion: string;
  readonly ffprobeVersion: string;
}

export function ffmpegPreflight(): FFmpegBins {
  const versions: Record<string, string> = {};
  for (const bin of ['ffmpeg', 'ffprobe']) {
    let output: string;
    try {
      output = runArgv(bin, ['-version'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      throw new Error(
        `Preflight: ${bin} not found on PATH (${code ?? 'unknown error'}).\n` +
          `Install:\n` +
          `  Windows: winget install Gyan.FFmpeg  OR  choco install ffmpeg\n` +
          `  macOS:   brew install ffmpeg\n` +
          `  Linux:   apt-get install ffmpeg`,
      );
    }
    const match = /version (\d+)\.(\d+)(?:\.(\d+))?/.exec(output);
    if (!match) {
      throw new Error(
        `Preflight: ${bin} returned unparseable version line: ${output.split('\n')[0]}`,
      );
    }
    const major = parseInt(match[1], 10);
    if (major < MIN_FFMPEG_VERSION) {
      throw new Error(
        `Preflight: ${bin} ${match[1]}.${match[2]} is below minimum ${MIN_FFMPEG_VERSION}.0.\n` +
          `Upgrade per install instructions above (loudnorm two-pass + areverse-silenceremove require >=5.0).`,
      );
    }
    versions[bin] = `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
  }
  return { ffmpegVersion: versions.ffmpeg, ffprobeVersion: versions.ffprobe };
}

/**
 * Run ffprobe on a file. Returns the parsed JSON; throws structured
 * error if ffprobe fails or output is malformed.
 */
export function runFFprobe(path: string): unknown {
  const output = runArgv(
    'ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(output);
}

/**
 * Run ffmpeg with the given argv and extract the last balanced JSON
 * object from its stderr. Used for two-pass `loudnorm` measurement —
 * Pass 1 prints a JSON block to stderr (the filter prefaces it with
 * diagnostic lines; we want the trailing `{...}` block) and we parse
 * it for Pass 2 input.
 *
 * Uses `spawnSync` (NOT `execFileSync`) because loudnorm pass-1 writes
 * to STDERR and execFileSync only returns stdout. spawnSync captures
 * both pipes in one shot whether the exit code is zero or not.
 *
 * Throws if ffmpeg has no JSON object in stderr OR if the JSON is
 * malformed.
 */
export function runFFmpegJson(args: readonly string[]): unknown {
  const result = spawnSync('ffmpeg', args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stderr = String(result.stderr ?? '');
  if (result.error) {
    throw new Error(`ffmpeg failed to spawn: ${result.error.message}`);
  }
  // Find the LAST balanced JSON object in stderr (loudnorm's summary).
  const lastClose = stderr.lastIndexOf('}');
  if (lastClose === -1) {
    throw new Error(
      `ffmpeg stderr contained no JSON object. ` +
        `Exit code: ${result.status}. Stderr tail: ${stderr.slice(-400)}`,
    );
  }
  let depth = 0;
  let openIdx = -1;
  for (let i = lastClose; i >= 0; i--) {
    const ch = stderr[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      depth--;
      if (depth === 0) {
        openIdx = i;
        break;
      }
    }
  }
  if (openIdx === -1) {
    throw new Error('ffmpeg stderr JSON object has unbalanced braces');
  }
  return JSON.parse(stderr.slice(openIdx, lastClose + 1));
}

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';

/**
 * Convert an MP3 buffer to 48kHz / 16-bit signed LE PCM / mono WAV.
 *
 * Used by the ElevenLabs client because Creator-tier accounts can't
 * request PCM directly from the API (per ElevenLabs docs: "PCM with
 * 44.1kHz sample rate requires Pro tier or above"). MP3 is the highest-
 * quality Creator-tier output (`mp3_44100_192`); FFmpeg converts to the
 * 48kHz mono PCM WAV format Phase 4 Remotion + Unit 2.5 expect.
 *
 * Stdin/stdout pipes would avoid the temp-file dance, but FFmpeg's MP3
 * demuxer needs random-access input — pipe input forces it to scan the
 * stream first, sometimes choking on ID3 framing. Temp files are
 * reliable and fast (~50 ms per cue).
 */
export function mp3ToWav48kMono(mp3: Buffer): Buffer {
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-mp3-'));
  const mp3Path = join(tmpDir, 'in.mp3');
  const wavPath = join(tmpDir, 'out.wav');
  try {
    writeFileSync(mp3Path, mp3);
    runArgv(
      'ffmpeg',
      [
        '-y',
        '-loglevel', 'error',
        '-i', mp3Path,
        '-ac', '1',
        '-ar', '48000',
        '-sample_fmt', 's16',
        '-c:a', 'pcm_s16le',
        wavPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return readFileSync(wavPath);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
