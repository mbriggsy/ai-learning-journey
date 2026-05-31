/**
 * Janet VO cue list — v2 origin trailer. The machine contract derived from
 * the LOCKED beat sheet (`docs/plans/origin-trailer-v2/2026-05-28-beat-sheet-draft.md`,
 * draft v4, Briggsy-approved).
 *
 * v2 is AUDIO-FIRST (the v1 ordering correction): cues carry NO composition
 * frames. We generate VO from this list, MEASURE the actual durations, then
 * build visuals timed to those measurements. Frames do not belong here.
 *
 * The list is a flat, ordered sequence of two cue kinds:
 *   - `speech`  — a contiguous spoken chunk. Generated via generateJanet().
 *   - `silence` — a measured pause. Generated as a silent WAV and stitched
 *                 between speech cues (FFmpeg concat). This is how the beat
 *                 sheet's `[beat]` / `[long beat]` / `[hold]` become real air.
 *
 * THREE HARD RULES (each a logged BURNED landmine):
 *  1. `text` is SPOKEN WORDS ONLY. No stage directions, no beat markers, no
 *     markdown emphasis. ElevenLabs reads prose aloud verbatim — a stray
 *     "[dry]" or "*burned*" would be spoken. Delivery intent lives in the
 *     `direction` field (documentation only; NEVER concatenated into `text`,
 *     NEVER sent to the API). See [[feedback-narrator-voice-direction]].
 *  2. Beats are SILENCE cues, not API tags. eleven_v3 has no reliable
 *     pause primitive (and rejects previous_text/next_text priming), so we
 *     split the utterance at each marked pause and stitch silence between.
 *  3. We split ONLY at marked dramatic pauses + paragraph breaths. Within a
 *     speech cue, let the model pace its own sentence periods — over-splitting
 *     kills natural prosody and multiplies v3 boundary artifacts.
 *
 * Silence durations are dramaturgical first-drafts, tuned by ear (N=1
 * Briggsy) at generation time — EXCEPT the Beat-7 detonation, whose RELATIVE
 * ordering is sacred per the beat sheet's non-negotiables: "Including mine"
 * gets its full silent HOLD before the warm "This kid…" button returns.
 *
 * Companion: `janet.ts` (the locked voice). Mirrors the v1 `src/lib/script.ts`
 * precedent (preserved in the `origin-trailer-v1` git tag), minus the frames.
 */

export type Beat = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Why a pause exists — drives ear-tuning priority + future visual sync. */
export type SilenceReason =
  | 'tiny' // a quick breath, smaller than a paragraph — e.g. before a snappy logline
  | 'paragraph' // natural breath between paragraphs (within a beat)
  | 'boundary' // subject-change pause BETWEEN two narrative beats (longer than an in-beat paragraph)
  | 'beat' // the beat sheet's [beat] — a deliberate dramatic hold
  | 'turn' // a register shift ([dry] / [turn — softer]) needs air to land
  | 'long-beat' // a long, deliberate pause — the guard-drop turn before the warm button (Beat 7)
  | 'hold' // [hold] — the reveal detonates in silence, on black (Beat 7)

/** Named first-draft durations (ms). Ear-tuned at generation; relative order in Beat 7 is sacred. */
export const SILENCE_MS = {
  tiny: 250,
  paragraph: 400,
  boundary: 600,
  beat: 550,
  turn: 650,
  longBeat: 1300,
  hold: 2200,
} as const satisfies Record<string, number>

export type SpeechCue = {
  readonly kind: 'speech'
  readonly id: string
  readonly beat: Beat
  /** VERBATIM spoken text. No directions, no beat markers, no markdown. */
  readonly text: string
  /** Delivery note from the beat sheet. Documentation ONLY — never sent to the API. */
  readonly direction?: string
  /** Non-verbal that the voice may render as a breath rather than a word — test, don't assume. */
  readonly nonVerbal?: boolean
}

export type SilenceCue = {
  readonly kind: 'silence'
  readonly id: string
  readonly beat: Beat
  readonly ms: number
  readonly reason: SilenceReason
}

export type Cue = SpeechCue | SilenceCue

const silence = (id: string, beat: Beat, reason: SilenceReason): SilenceCue => ({
  kind: 'silence',
  id,
  beat,
  reason,
  ms: SILENCE_MS[reason === 'long-beat' ? 'longBeat' : reason],
})

export const JANET_CUES: readonly Cue[] = [
  // ═══ SHORT RECUT (2026-05-31) ═══
  // The brag is the TEXT now, not the subtext: an AI + one man built this. Six
  // beats, brag-forward, ~70s. The hinge ("So he didn't" → the machine) cuts
  // straight into the BuildHero terminal engine. Janet stays Malory-dry; the
  // wink ("Not even me") IS the closer. Supersedes the 3:01 narrated cut.

  // ─── Beat 1 — HOOK (kinetic roster cold open) ───
  {
    kind: 'speech',
    id: 'b1-hook',
    beat: 1,
    text: 'Every great operation has an origin story.',
  },

  silence('b1-to-b2', 1, 'boundary'),

  // ─── Beat 2 — THE MAN + THE PROBLEM ───
  {
    kind: 'speech',
    id: 'b2-man',
    beat: 2,
    text: 'This one starts with a man who builds data pipelines. The quiet machinery nobody thanks you for. One night, he decided his favorite card game deserved a screen.',
  },
  silence('b2-beat', 2, 'beat'),
  {
    kind: 'speech',
    id: 'b2-problem',
    beat: 2,
    text: 'There was just one problem. He had no idea how to build it himself.',
  },

  silence('b2-to-b3', 2, 'boundary'),

  // ─── Beat 3 — THE HINGE → THE MACHINE (cut to terminal) ───
  {
    kind: 'speech',
    id: 'b3-hinge',
    beat: 3,
    text: 'So he didn\'t.',
    direction: '[dry] — the pivot. This line cuts straight into the terminal ripping (BuildHero). The gag is the gap: "couldn\'t build it" → the machine builds it.',
  },
  silence('b3-turn', 3, 'turn'),
  {
    kind: 'speech',
    id: 'b3-machine',
    beat: 3,
    text: 'He handed it to a machine. And he pointed.',
  },

  silence('b3-to-b4', 3, 'boundary'),

  // ─── Beat 4 — THE BRAG / SCALE ───
  {
    kind: 'speech',
    id: 'b4-brag',
    beat: 4,
    // Spoken roundings round DOWN (honest): code 43,357 → "forty-three thousand";
    // tests 1407 → "fourteen hundred"; 120 cards exact. Numbers spelled so v3 reads as words.
    text: 'Two weeks. Forty-three thousand lines of code, in a language he\'d never touched. A hundred and twenty cards. Fourteen hundred tests, written to attack his own game.',
  },
  silence('b4-beat', 4, 'beat'),
  {
    kind: 'speech',
    id: 'b4-measure',
    beat: 4,
    text: 'More planning than code. \'Measure twice,\' they say.',
    direction: '[dry] — deadpan; the over-planning DNA owned without a brag.',
  },

  silence('b4-to-b5', 4, 'boundary'),

  // ─── Beat 5 — THE GAUNTLET + IT\'S GOOD ───
  {
    kind: 'speech',
    id: 'b5-gauntlet',
    beat: 5,
    text: 'Then a swarm of machines tried to break it. It held. Every time.',
  },
  silence('b5-turn', 5, 'turn'),
  {
    kind: 'speech',
    id: 'b5-good',
    beat: 5,
    text: 'And somehow, the thing is good.',
    direction: '[the dryness cracks a half-inch toward respect]',
  },

  silence('b5-to-b6', 5, 'boundary'),

  // ─── Beat 6 — THE BUTTON + THE WINK ───
  {
    kind: 'speech',
    id: 'b6-bet',
    beat: 6,
    text: 'He bet a machine could build something worth playing. He was right.',
  },
  silence('b6-para', 6, 'paragraph'),
  {
    kind: 'speech',
    id: 'b6-reveal',
    beat: 6,
    text: 'Not one piece of this was made by him. Not an image. Not a sound. Not even me.',
    direction: '[dry — the wink] — Janet reveals the narration itself is machine-made. The "built by an agent" punchline, played straight.',
  },
  silence('b6-turn-to-warmth', 6, 'long-beat'),
  {
    kind: 'speech',
    id: 'b6-impress',
    beat: 6,
    text: 'This kid is starting to impress me.',
    direction: '[then, unhurried — the matriarch\'s guard drops a half-inch]. Warmth, not exposition — the skeptic→impressed bookend.',
  },
  silence('b6-beat-hmph', 6, 'beat'),
  {
    kind: 'speech',
    id: 'b6-hmph',
    beat: 6,
    text: '…Hmph.',
    nonVerbal: true,
    direction: 'PRODUCTION FLAG: non-verbal — the voice may render this as a breath rather than a word. Test, don\'t assume; if it drops, capture a separate breath take or trim the cue.',
  },
] as const

/** Speech-only projection — the cues that hit the TTS API, in order. */
export const SPEECH_CUES: readonly SpeechCue[] = JANET_CUES.filter(
  (c): c is SpeechCue => c.kind === 'speech',
)
