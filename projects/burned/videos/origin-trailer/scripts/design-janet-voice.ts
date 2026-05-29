/**
 * Voice Design — generate custom Janet candidates (2026-05-28).
 *
 * The Shared Library doesn't have Janet (white NY socialite, 50s, rich,
 * perpetually-annoyed, drinker + former smoker — the Jessica-Walter /
 * Malory / Lucille-Bluth archetype). So we design her: ElevenLabs
 * `text-to-voice/create-previews` builds ORIGINAL voices from a text
 * description. Coded, not cloned — no audio of anyone is uploaded; the
 * Jessica-Walter line is a tonal *reference* that shapes an original voice.
 *
 * Description adapted from v1's mallory-design (dialed from "late seventies"
 * to Briggsy's 50s + rich + former-smoker brief).
 *
 * Run:  set -a && source ../../.env && set +a && pnpm tsx scripts/design-janet-voice.ts
 * Each preview saves a .wav + its generated_voice_id (the handle we use to
 * mint the real voice once Briggsy picks one).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { assertEnv } from './lib/env.js'
import { mp3ToWav48kMono } from './lib/ffmpeg.js'

const KEY = assertEnv('ELEVENLABS_API_KEY')

const JANET_DESCRIPTION = `Wealthy American woman, early fifties, native New York, old-money Upper East Side. Mid-to-low alto, chest-resonant. A pronounced dry, gravelled rasp threaded through every line — decades of cigarettes and bourbon, smoke-cured texture sitting low and rough under the tone, on every word and especially sustained vowels — yet articulation stays crisp, every consonant precise. Cold, controlled, regal authority: the poised, faintly menacing command of a woman accustomed to being obeyed and bored of being right. Sardonic deadpan, downward inflection at line ends — the faint exhaustion of explaining the obvious to people who should know better. Emphasis is a quiet knife-edge, never raised volume; vowels drawn out on dismissive moments. Reference: Jessica Walter as Malory Archer and Lucille Bluth, the icy command of a cold queen. NOT: warm, breathy, sweet, smooth, clean-toned, theatrical, cartoonish, podcast, audiobook, soothing, motherly, British, slurred, shouty, youthful, perky.`

// ~340 chars from the locked v2 beat sheet (Beats 1-2) — exercises her
// narration plus the dry kicker that is the whole character.
const PREVIEW_TEXT = `The man at that table builds spreadsheets for a living. Pipelines. The quiet machinery nobody thanks you for. One night, several bourbons deep, he decided that card game deserved a screen. There was just the one problem. He had no idea how to build it himself. That a machine could? He hadn't a flicker of doubt. I had several. I gave it two weeks.`

const OUT_DIR = 'out/janet-design'

async function main(): Promise<void> {
  console.log(`description: ${JANET_DESCRIPTION.length} chars | preview: ${PREVIEW_TEXT.length} chars\n`)

  const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice_description: JANET_DESCRIPTION,
      text: PREVIEW_TEXT,
      model_id: 'eleven_v3',
      output_format: 'mp3_44100_192',
    }),
  })

  if (!res.ok) {
    console.error(`FAIL ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const body = (await res.json()) as {
    previews: Array<{ audio_base_64: string; generated_voice_id: string; duration_secs: number }>
  }
  console.log(`got ${body.previews.length} previews\n`)

  mkdirSync(OUT_DIR, { recursive: true })
  for (let i = 0; i < body.previews.length; i++) {
    const p = body.previews[i]!
    const wav = mp3ToWav48kMono(Buffer.from(p.audio_base_64, 'base64'))
    const wavPath = join(OUT_DIR, `janet-design-${i + 1}.wav`)
    writeFileSync(wavPath, wav)
    writeFileSync(wavPath.replace('.wav', '.voice-id.txt'), p.generated_voice_id)
    console.log(`janet-design-${i + 1}.wav  →  generated_voice_id=${p.generated_voice_id}  (${p.duration_secs.toFixed(2)}s)`)
  }
  console.log(`\nAuditions in ${OUT_DIR}/`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
