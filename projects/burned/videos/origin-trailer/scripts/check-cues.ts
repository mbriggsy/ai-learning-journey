/**
 * Cue-list sanity gate. Proves the authored VO list (`voice/script.ts`) is
 * clean and well-formed BEFORE we spend API characters generating it.
 *
 * Checks:
 *  1. VOICE_DIRECTION leak gate — no stage-direction brackets `[ ]` or
 *     markdown emphasis `*` survived into any spoken `text`. (A leaked token
 *     would be read aloud by ElevenLabs — the cardinal narrator landmine.)
 *  2. Structure — all 7 beats present; every cue id unique.
 *  3. Runtime estimate — spoken words ÷ pace + total silence, bracketed at a
 *     deadpan/brisk pace band, against the beat sheet's ~119s target.
 *
 * Run from videos/origin-trailer/:  pnpm cues:check
 */
import { JANET_CUES, SPEECH_CUES, type Beat } from './voice/script.js'

const FORBIDDEN = /[[\]*]/ // brackets (stage dirs) or asterisks (markdown emphasis)
let failed = false
const fail = (msg: string): void => {
  console.error(`✗ ${msg}`)
  failed = true
}

// ── 1. Leak gate ───────────────────────────────────────────────────────────
for (const cue of SPEECH_CUES) {
  if (FORBIDDEN.test(cue.text)) {
    fail(`LEAK: cue "${cue.id}" text contains a stage-direction/markdown token: ${cue.text}`)
  }
}

// ── 2. Structure ─────────────────────────────────────────────────────────────
const ids = new Set<string>()
for (const cue of JANET_CUES) {
  if (ids.has(cue.id)) fail(`duplicate cue id: ${cue.id}`)
  ids.add(cue.id)
}
const beatsPresent = new Set<Beat>(JANET_CUES.map((c) => c.beat))
for (let b = 1 as Beat; b <= 7; b = (b + 1) as Beat) {
  if (!beatsPresent.has(b)) fail(`beat ${b} has no cues`)
}

// ── 3. Runtime estimate ──────────────────────────────────────────────────────
const wordsOf = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length
const totalWords = SPEECH_CUES.reduce((n, c) => n + wordsOf(c.text), 0)
const totalSilenceMs = JANET_CUES.reduce((ms, c) => ms + (c.kind === 'silence' ? c.ms : 0), 0)

// Janet's measured pace: the tts:test line ran 19 words in ~8.0s of WAV
// (≈2.4 wps, padding included). Bracket the estimate deadpan↔brisk.
const PACE = { deadpan: 2.1, brisk: 2.6 } as const
const estSec = (wps: number): number => totalWords / wps + totalSilenceMs / 1000
const TARGET_SEC = 119

console.log('\nPer-beat spoken words:')
for (let b = 1 as Beat; b <= 7; b = (b + 1) as Beat) {
  const w = SPEECH_CUES.filter((c) => c.beat === b).reduce((n, c) => n + wordsOf(c.text), 0)
  console.log(`  beat ${b}: ${w} words`)
}
console.log(
  `\nTotals: ${SPEECH_CUES.length} speech cues · ${totalWords} spoken words · ` +
    `${(totalSilenceMs / 1000).toFixed(1)}s silence across ${JANET_CUES.length - SPEECH_CUES.length} pauses`,
)
console.log(
  `Estimated runtime: ${estSec(PACE.brisk).toFixed(0)}s (brisk 2.6 wps) – ` +
    `${estSec(PACE.deadpan).toFixed(0)}s (deadpan 2.1 wps)  |  beat-sheet target ~${TARGET_SEC}s`,
)
const lo = estSec(PACE.brisk)
if (lo > TARGET_SEC * 1.15) {
  console.warn(
    `\n⚠ RUNTIME TENSION: even at a brisk pace the VO estimates ${lo.toFixed(0)}s vs the ~${TARGET_SEC}s ` +
      `target. The cue list is the approved prose verbatim — reconcile by ear after the real ` +
      `generation+measure pass (trim prose, accept a longer cut, or nudge pace). Surface to Briggsy; do not trim unilaterally.`,
  )
}

if (failed) {
  console.error('\n✗ cue-list check FAILED')
  process.exit(1)
}
console.log('\n✓ cue-list check passed (leak gate clean, all 7 beats present)')
