/**
 * v2 voice pipeline — full VO generation (audio-first).
 *
 * Walks the authored cue list (`voice/script.ts`) in order and produces:
 *   - per-cue WAVs in        out/vo/cues/<id>.wav   (48k mono PCM)
 *   - the stitched master in out/vo/janet-vo-master.wav
 *   - a measured manifest in out/vo/manifest.json   (real per-cue durations
 *     + cumulative start offsets — the honest runtime)
 *
 * Single locked narrator (Janet = Eleanor, see voice/janet.ts). The casting
 * A/B that picked her ran a two-candidate variant of this script
 * (2026-05-29); the generic `generateVoice(voice, …)` client entry stays
 * available if another A/B is ever needed.
 *
 * Order is audio-first: we generate + MEASURE here; visuals get timed to
 * these durations later. Speech cues hit ElevenLabs; silence cues are
 * generated locally (cheap) and ALWAYS rebuilt so SILENCE_MS ear-tuning
 * takes effect without re-spending API characters. Per-cue `<id>.txt`
 * sidecars cache by exact text; `--force` regenerates all speech.
 *
 * Run from videos/origin-trailer/:
 *   set -a && source ../../.env && set +a && pnpm tts:test            (cached)
 *   set -a && source ../../.env && set +a && pnpm tts:test -- --force (full)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { ffmpegPreflight, silentWav48kMono, concatWavs, wavDurationSec } from './lib/ffmpeg.js'
import { generateJanet } from './tts-clients/elevenlabs.js'
import { JANET_CUES, SPEECH_CUES, type Cue } from './voice/script.js'

const FORCE = process.argv.includes('--force')
const OUT_DIR = 'out/vo'
const CUE_DIR = join(OUT_DIR, 'cues')
const MASTER_PATH = join(OUT_DIR, 'janet-vo-master.wav')
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json')

/** Rate-limit courtesy between real API calls (client also retries 429). */
const API_GAP_MS = 400
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

type ManifestEntry = {
  id: string
  beat: number
  kind: Cue['kind']
  durationSec: number
  startSec: number
  text?: string
  ms?: number
  cached?: boolean
  nonVerbal?: boolean
}

async function resolveSpeech(
  cue: Extract<Cue, { kind: 'speech' }>,
): Promise<{ wav: Buffer; cached: boolean; chars: number }> {
  const wavPath = join(CUE_DIR, `${cue.id}.wav`)
  const txtPath = join(CUE_DIR, `${cue.id}.txt`)
  const cacheHit =
    !FORCE && existsSync(wavPath) && existsSync(txtPath) && readFileSync(txtPath, 'utf-8') === cue.text
  if (cacheHit) return { wav: readFileSync(wavPath), cached: true, chars: 0 }

  const wav = await generateJanet({ text: cue.text })
  writeFileSync(wavPath, wav)
  writeFileSync(txtPath, cue.text)
  await sleep(API_GAP_MS)
  return { wav, cached: false, chars: cue.text.length }
}

async function main(): Promise<void> {
  ffmpegPreflight()
  mkdirSync(CUE_DIR, { recursive: true })

  console.log(
    `Generating VO: ${SPEECH_CUES.length} speech cues + ${JANET_CUES.length - SPEECH_CUES.length} silences` +
      `${FORCE ? ' (--force: regenerating all speech)' : ' (cached where unchanged)'}\n`,
  )

  const segments: Buffer[] = []
  const manifest: ManifestEntry[] = []
  let startSec = 0
  let generated = 0
  let charsSpent = 0

  for (const cue of JANET_CUES) {
    let wav: Buffer
    let cached = false
    if (cue.kind === 'speech') {
      const r = await resolveSpeech(cue)
      wav = r.wav
      cached = r.cached
      charsSpent += r.chars
      if (!r.cached) generated++
    } else {
      wav = silentWav48kMono(cue.ms)
      writeFileSync(join(CUE_DIR, `${cue.id}.wav`), wav)
    }

    const durationSec = wavDurationSec(wav)
    segments.push(wav)
    manifest.push({
      id: cue.id,
      beat: cue.beat,
      kind: cue.kind,
      durationSec: Number(durationSec.toFixed(3)),
      startSec: Number(startSec.toFixed(3)),
      ...(cue.kind === 'speech'
        ? { text: cue.text, ...(cue.nonVerbal ? { nonVerbal: true } : {}), cached }
        : { ms: cue.ms }),
    })

    const tag = cue.kind === 'speech' ? (cached ? 'cache' : 'gen  ') : 'sil  '
    const flag = cue.kind === 'speech' && cue.nonVerbal ? '  ⚑ non-verbal (test for breath)' : ''
    console.log(`  [b${cue.beat}] ${tag} ${cue.id.padEnd(20)} ${durationSec.toFixed(2)}s${flag}`)
    startSec += durationSec
  }

  const master = concatWavs(segments)
  writeFileSync(MASTER_PATH, master)
  const totalSec = wavDurationSec(master)
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify({ totalSec: Number(totalSec.toFixed(3)), cues: manifest }, null, 2),
  )

  const mm = Math.floor(totalSec / 60)
  const ss = Math.round(totalSec % 60)
  console.log(
    `\n✓ master: ${MASTER_PATH}  (${totalSec.toFixed(1)}s = ${mm}:${String(ss).padStart(2, '0')})\n` +
      `  manifest: ${MANIFEST_PATH}\n` +
      `  this run: ${generated} speech cue(s) generated, ~${charsSpent} chars spent` +
      `${generated < SPEECH_CUES.length ? ` (${SPEECH_CUES.length - generated} cached)` : ''}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
