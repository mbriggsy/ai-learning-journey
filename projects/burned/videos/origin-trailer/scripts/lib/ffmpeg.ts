/**
 * FFmpeg wrappers for the v2 voice pipeline. Ported from the v1 trailer
 * (proven). argv arrays via execFileSync — never through a shell.
 */
import { execFileSync as runArgv, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'

const MIN_FFMPEG_VERSION = 5

export function ffmpegPreflight(): void {
  let output: string
  try {
    output = runArgv('ffmpeg', ['-version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error(
      'Preflight: ffmpeg not found on PATH. Install: winget install Gyan.FFmpeg',
    )
  }
  const m = /version (\d+)\.(\d+)/.exec(output)
  if (!m || parseInt(m[1], 10) < MIN_FFMPEG_VERSION) {
    throw new Error(
      `Preflight: ffmpeg >= ${MIN_FFMPEG_VERSION}.0 required (loudnorm two-pass + areverse silenceremove).`,
    )
  }
}

/**
 * Convert an MP3 buffer to 48kHz / 16-bit signed-LE / mono WAV.
 *
 * The ElevenLabs client requests mp3_44100_192 (Creator-tier ceiling — PCM
 * silently downgrades to MP3 on Creator) and converts here to the 48k mono
 * PCM WAV the Remotion composite expects. Temp-file dance: the MP3 demuxer
 * needs random-access input; pipes choke on ID3 framing.
 */
export function mp3ToWav48kMono(mp3: Buffer): Buffer {
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-mp3-'))
  const mp3Path = join(tmpDir, 'in.mp3')
  const wavPath = join(tmpDir, 'out.wav')
  try {
    writeFileSync(mp3Path, mp3)
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
    )
    return readFileSync(wavPath)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Generate a silent 48kHz / 16-bit / mono WAV of `ms` milliseconds — the
 * format-matched filler that turns the cue list's `[beat]`/`[long beat]`/
 * `[hold]` markers into real air. Same codec/rate/channels as the speech
 * WAVs so `concatWavs` can stream-copy with no re-encode.
 */
export function silentWav48kMono(ms: number): Buffer {
  if (!Number.isFinite(ms) || ms <= 0) throw new Error(`silentWav48kMono: bad ms ${ms}`)
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-sil-'))
  const wavPath = join(tmpDir, 'silence.wav')
  try {
    runArgv(
      'ffmpeg',
      [
        '-y',
        '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', 'anullsrc=r=48000:cl=mono',
        '-t', (ms / 1000).toFixed(3),
        '-sample_fmt', 's16',
        '-c:a', 'pcm_s16le',
        wavPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return readFileSync(wavPath)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Concatenate same-format 48k mono PCM WAVs into one, in order, via the
 * concat demuxer with stream-copy. Segments are written to a temp dir and
 * referenced by basename (cwd = tmpDir) so no Windows path escaping is
 * needed in the concat list (the lavfi `movie=` colon trap does NOT apply to
 * the concat demuxer's `file 'name'` lines, but basenames sidestep it anyway).
 */
export function concatWavs(segments: readonly Buffer[]): Buffer {
  if (segments.length === 0) throw new Error('concatWavs: no segments')
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-cat-'))
  const outPath = join(tmpDir, 'master.wav')
  const listPath = join(tmpDir, 'list.txt')
  try {
    const lines: string[] = []
    segments.forEach((buf, i) => {
      const name = `seg${String(i).padStart(4, '0')}.wav`
      writeFileSync(join(tmpDir, name), buf)
      lines.push(`file '${name}'`)
    })
    writeFileSync(listPath, lines.join('\n'))
    runArgv(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'master.wav'],
      { cwd: tmpDir, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return readFileSync(outPath)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Peak level (dB) of a WAV's final `ms` — the trailing-clip detector. A clean
 * ElevenLabs take decays into its release/silence (peak well below ~-12 dB in
 * the last ~120ms); a stochastically tail-truncated take ends mid-word at near
 * speaking energy (peak ~-8 to -10 dB). astats writes to STDERR, so spawnSync
 * (NOT execFileSync — the v1 STDERR landmine). Returns -Infinity on silence.
 */
export function tailPeakDb(wav: Buffer, ms = 120): number {
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-tail-'))
  const wavPath = join(tmpDir, 'tail.wav')
  try {
    writeFileSync(wavPath, wav)
    const res = spawnSync(
      'ffmpeg',
      ['-sseof', `-${(ms / 1000).toFixed(3)}`, '-i', wavPath, '-af', 'astats=metadata=1', '-f', 'null', '-'],
      { encoding: 'utf-8' },
    )
    const matches = [...(res.stderr || '').matchAll(/Peak level dB:\s*(-?\d+(?:\.\d+)?)/g)]
    if (matches.length === 0) return -Infinity // pure-silence tail prints "-inf" (unmatched)
    return parseFloat(matches[matches.length - 1][1]!)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/** Measure a WAV buffer's duration in seconds via ffprobe (the honest source of truth). */
export function wavDurationSec(wav: Buffer): number {
  const tmpDir = mkdtempSync(join(tmpdir(), 'burned-dur-'))
  const wavPath = join(tmpDir, 'probe.wav')
  try {
    writeFileSync(wavPath, wav)
    const out = runArgv(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', wavPath],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const sec = parseFloat(out.trim())
    if (!Number.isFinite(sec)) throw new Error(`wavDurationSec: ffprobe returned "${out.trim()}"`)
    return sec
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
