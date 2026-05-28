/**
 * v2 voice pipeline — minimal slice (2026-05-28).
 *
 * Generates ONE Janet line to prove the rebuilt machine end-to-end (real
 * ElevenLabs call → MP3→WAV conversion → on-disk WAV) BEFORE authoring the
 * full cue list. Run from videos/origin-trailer/:
 *
 *   set -a && source ../../.env && set +a && pnpm tts:test
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { ffmpegPreflight } from './lib/ffmpeg.js'
import { generateJanet } from './tts-clients/elevenlabs.js'

// One representative line from the LOCKED v2 beat sheet (Beat 1 open) —
// tests Janet's dry matriarch cadence. Spoken text only; no stage dirs.
const TEST_LINE =
  'Every great operation begins the same way. Not in a war room. Not with a directive from on high.'

async function main(): Promise<void> {
  ffmpegPreflight()
  console.log('Generating one Janet test line via ElevenLabs…')
  const wav = await generateJanet({ text: TEST_LINE })
  mkdirSync('out/vo-test', { recursive: true })
  const outPath = 'out/vo-test/janet-test.wav'
  writeFileSync(outPath, wav)
  console.log(`✓ wrote ${outPath} (${(wav.length / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
