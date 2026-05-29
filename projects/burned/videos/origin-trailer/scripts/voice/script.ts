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
 * Companion: `janet.ts` (the locked voice). Mirrors the v1
 * `videos/trailer/src/lib/script.ts` precedent, minus the frame machinery.
 */

export type Beat = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Why a pause exists — drives ear-tuning priority + future visual sync. */
export type SilenceReason =
  | 'tiny' // a quick breath, smaller than a paragraph — e.g. before a snappy logline
  | 'paragraph' // natural breath between paragraphs
  | 'beat' // the beat sheet's [beat] — a deliberate dramatic hold
  | 'turn' // a register shift ([dry] / [turn — softer]) needs air to land
  | 'long-beat' // a long, deliberate pause — the guard-drop turn before the warm button (Beat 7)
  | 'hold' // [hold] — the reveal detonates in silence, on black (Beat 7)

/** Named first-draft durations (ms). Ear-tuned at generation; relative order in Beat 7 is sacred. */
export const SILENCE_MS = {
  tiny: 250,
  paragraph: 400,
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
  // ─── Beat 1 — OPEN + WHAT IT IS (engine #4 + logline) ───
  {
    kind: 'speech',
    id: 'b1-origin',
    beat: 1,
    text: 'Every great operation begins the same way. Not in a war room. Not with a directive from on high. It begins with bourbon, a folding table, and a card game nobody could stop playing.',
  },
  silence('b1-para', 1, 'paragraph'),
  {
    kind: 'speech',
    id: 'b1-rules',
    beat: 1,
    text: 'The rules are simple. Draw a card. Don\'t draw the one that gets you burned. And do everything short of decent to make sure the person next to you draws it first. Last cover standing wins.',
  },

  silence('b1-to-b2', 1, 'paragraph'),

  // ─── Beat 2 — THE BET (engine #2, spine starts) ───
  {
    kind: 'speech',
    id: 'b2-problem',
    beat: 2,
    text: 'The man at that table builds data pipelines. The quiet machinery nobody thanks you for. One night he decided that card game deserved a screen. There was just the one problem. He had no idea how to build it himself.',
  },
  silence('b2-beat', 2, 'beat'),
  {
    kind: 'speech',
    id: 'b2-machine',
    beat: 2,
    text: 'He knew the machine could. He hadn\'t a flicker of doubt.',
  },
  silence('b2-turn', 2, 'turn'),
  {
    kind: 'speech',
    id: 'b2-janet-doubt',
    beat: 2,
    text: 'I had several. I gave it two weeks.',
    direction: '[dry] — the skepticism through-line plants here; Janet as the doubt the protagonist lacks.',
  },

  silence('b2-to-b3', 2, 'paragraph'),

  // ─── Beat 3 — THE DOUBLE-DOWN (engine #2 spine) ───
  {
    kind: 'speech',
    id: 'b3-sensible',
    beat: 3,
    text: 'Now — a sensible man builds something small.',
  },
  silence('b3-beat', 3, 'beat'),
  {
    kind: 'speech',
    id: 'b3-opposite',
    beat: 3,
    text: 'He did the opposite. He wanted up to ten of you in the same room. Ten phones hiding ten secret hands, every move landing the instant you made it. And it had to look like a real studio made it — or it wasn\'t worth making.',
  },
  silence('b3-para', 3, 'paragraph'),
  {
    kind: 'speech',
    id: 'b3-moving-bar',
    beat: 3,
    text: 'He didn\'t raise the bar once. He kept moving it out of his own reach.',
  },

  silence('b3-to-b4', 3, 'paragraph'),

  // ─── Beat 4 — THE BUILD + SCALE (engine #2 spine) ───
  {
    kind: 'speech',
    id: 'b4-pointed',
    beat: 4,
    text: 'He didn\'t write it. Any of it. He pointed — and the machine built.',
  },
  silence('b4-para', 4, 'paragraph'),
  {
    kind: 'speech',
    id: 'b4-numbers',
    beat: 4,
    // Canonical site buckets (beat sheet v4): app 43,357 / testing 29,033 / planning 62,082.
    // Spoken roundings round DOWN (honest). Numbers spelled so v3 reads them as words.
    text: 'Forty-three thousand lines of code, in a language he\'d never touched. Twenty-nine thousand more, written for the sole purpose of attacking the first forty-three. And sixty-two thousand lines of planning behind all of it.',
  },
  silence('b4-beat', 4, 'beat'),
  {
    kind: 'speech',
    id: 'b4-more-planning',
    beat: 4,
    text: 'More planning than code.',
  },
  silence('b4-kicker-turn', 4, 'turn'),
  {
    kind: 'speech',
    id: 'b4-measure-twice',
    beat: 4,
    text: '\'Measure twice,\' they say.',
    direction: '[dry] — deadpan turn; the over-planning DNA owned without a brag.',
  },

  silence('b4-to-b5', 4, 'paragraph'),

  // ─── Beat 5 — THE GAUNTLET (challenger agents, engine #2 spine) ───
  {
    kind: 'speech',
    id: 'b5-deranged',
    beat: 5,
    text: 'Then it did the genuinely deranged thing. It unleashed a swarm of adversaries — agents whose only job was to hunt the game\'s weak points and break them.',
  },
  // Beat 5 trimmed to the single deranged-swarm line (2026-05-29) — the chaos
  // imagery + "1326 times" punch were cut for length. Scene-transition breath
  // into the proof beat (also separates "break them" / "attempts to break it").
  silence('b5-to-b6', 5, 'paragraph'),

  // ─── Beat 6 — THE PROOF + COST (engine #2 spine) ───
  {
    kind: 'speech',
    id: 'b6-attempts',
    beat: 6,
    text: 'Thirteen hundred and twenty-six attempts to break it.',
  },
  silence('b6-beat', 6, 'beat'),
  {
    kind: 'speech',
    id: 'b6-held',
    beat: 6,
    text: 'Thirteen hundred and twenty-six times, it didn\'t.',
  },
  silence('b6-turn', 6, 'turn'),
  {
    kind: 'speech',
    id: 'b6-cost',
    beat: 6,
    text: 'What did it cost him? Sleep. A lot of sleep. The specific madness of a man who\'ll stand over a screen at two in the morning and tell a machine, \'no — make it beautiful.\' He gave it an unreasonable refusal to accept \'good enough.\'',
    direction: '[turn — softer] — the dryness softens to affection; the heart of the piece. Hold the register through the whole passage.',
  },
  silence('b6-beat-rest', 6, 'beat'),
  {
    kind: 'speech',
    id: 'b6-machine-rest',
    beat: 6,
    text: 'The machine did the rest.',
  },

  silence('b6-to-b7', 6, 'paragraph'),

  // ─── Beat 7 — RETURN + TAG (engine #3 subset) ───
  {
    kind: 'speech',
    id: 'b7-return-q',
    beat: 7,
    text: 'What did he get in return?',
  },
  silence('b7-beat-1', 7, 'beat'),
  {
    kind: 'speech',
    id: 'b7-game',
    beat: 7,
    text: 'A game. A real one. A hundred and twenty cards, up to ten of your closest friends, and not one shred of honor among them.',
  },
  silence('b7-para-1', 7, 'paragraph'),
  {
    kind: 'speech',
    id: 'b7-bet',
    beat: 7,
    text: 'He bet a machine could build something worth playing.',
  },
  silence('b7-beat-2', 7, 'beat'),
  {
    kind: 'speech',
    id: 'b7-right',
    beat: 7,
    text: 'He was right.',
  },
  silence('b7-para-2', 7, 'paragraph'),
  {
    kind: 'speech',
    id: 'b7-came-from-hand',
    beat: 7,
    text: 'And not one piece of this — the game, the swarm, the thirteen hundred tests, every image, every second of audio, this very trailer — was created by him.',
  },
  // The autonomy claim turns to warmth — the matriarch's guard drops a half-inch.
  // (The Janet-is-synthetic "Including mine" reveal was cut for length 2026-05-29;
  // "…was written by him" now carries the machine-made-everything point. This is a
  // turn-to-warmth pause, NOT the old reveal detonation — hence 'turn', not 'hold'.)
  silence('b7-turn-to-warmth', 7, 'long-beat'),
  {
    kind: 'speech',
    id: 'b7-this-kid',
    beat: 7,
    text: 'This kid is starting to impress me.',
    direction: '[then, unhurried — the matriarch\'s guard drops a half-inch]. Warmth, not exposition — the skeptic→impressed bookend.',
  },
  silence('b7-beat-hmph', 7, 'beat'),
  {
    kind: 'speech',
    id: 'b7-hmph',
    beat: 7,
    text: '…Hmph.',
    nonVerbal: true,
    direction: 'PRODUCTION FLAG (beat sheet): non-verbal — the voice may render this as a breath rather than a word. Test, don\'t assume; if it drops, capture a separate breath take or trim the cue.',
  },
] as const

/** Speech-only projection — the cues that hit the TTS API, in order. */
export const SPEECH_CUES: readonly SpeechCue[] = JANET_CUES.filter(
  (c): c is SpeechCue => c.kind === 'speech',
)
