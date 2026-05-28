/**
 * FFmpeg wrappers for the v2 voice pipeline. Ported from the v1 trailer
 * (proven). argv arrays via execFileSync — never through a shell.
 */
import { execFileSync as runArgv } from 'node:child_process'
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
