/**
 * Trailer script — machine contract for Phase 2 voice pipeline.
 *
 * Unit 1.2 lock: 14 verbatim VO cues across 6 scenes. Bracket-tag
 * treatment lives in cadenceAdapter metadata, NEVER inline in `text`
 * (per Phase 0 `cold-open-prototype.ts` convention — VOICE_DIRECTION
 * guard rejects `[deadpan]`/`[sarcastic]` tokens inside payload
 * strings; engine-specific renderers apply tags at TTS time).
 *
 * Companion to `videos/trailer/BEAT-SHEET.md` (the human contract).
 * Phase 2 imports `BURNED_TRAILER_LINES`; `script.test.ts` asserts
 * every BEAT-SHEET.md line appears in `BURNED_TRAILER_LINES` with
 * matching scene + frame text via the `<!-- @line: ID -->` marker
 * pattern (insight #029 — Markdown-table-cell parsing fragility
 * avoided).
 *
 * Mirrors UMB v3 `narrator-prompts.ts` `TRAILER_V3_PROMPTS`
 * precedent.
 */

/**
 * Cue-type drives Phase 2's per-engine fade / silenceremove behavior
 * and Phase 6's QA tolerance band selection.
 */
export type CueType =
  | 'sustained' // briefing / background narration; 1.9–2.3 wps
  | 'list' // cascade stats; 2.4–2.6 wps ceiling
  | 'payoff' // declarative truth-collision; 1.6–2.0 wps
  | 'cold-open' // S01 establishing cue
  | 'scream' // S05 scream Sterling-CODED volume-discontinuous

/**
 * A single VO cue placed at an absolute composition frame.
 *
 * **Frame absolute-only invariant** (per AMENDMENT 2026-05-17 plan
 * fix): every `frame` is an absolute composition frame
 * (0 ≤ frame < TOTAL_FRAMES). NO scene-relative encoding.
 * `script.test.ts` asserts `frame >= S{N}_START && frame < S{N}_END`
 * for the declared scene N.
 */
export type Line = {
  readonly id: string // e.g., 'S04-payoff'
  readonly scene: 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06'
  readonly frame: number // ABSOLUTE composition frame
  readonly voice: 'dash' | 'sable' | 'janet' | 'vera'
  readonly text: string // verbatim, no embedded direction
  readonly cueType: CueType

  /** Phase 1 ships the budgeted target; Phase 2 computes actual at TTS time. */
  readonly expectedFrames: number

  /**
   * Phase 4 places `<Audio>` at `<Sequence from={frame -
   * leadFramesHint}>` per ADR #16 composition-level audio placement.
   * Default 0; payoff cues 2; scream 1.
   */
  readonly leadFramesHint: number

  /**
   * Per-cue tolerance override; falls back to cueType band when
   * omitted. Sustained ±5% / list ±7% / payoff ±4% / scream ±20%.
   */
  readonly driftToleranceOverride?: number

  /**
   * Per-cue fade-in/fade-out shape overrides. Defaults: sustained
   * 30 ms / 30 ms; payoff 5 ms in / 30 ms out; phrasing 30 ms in /
   * 50 ms out + qsin curve; scream 0 ms in / 30 ms out.
   */
  readonly fadeInMs?: number
  readonly fadeOutMs?: number

  /**
   * Scream cue (frame 2400) must preserve full attack envelope —
   * FFmpeg silenceremove would clip the volume-discontinuous onset.
   */
  readonly skipSilenceremove?: boolean

  readonly cadenceAdapter?: {
    readonly engine: 'elevenlabs-v3' | 'gemini-tts' | 'openai-tts' | 'voice-actor'
    readonly prefixTag?: string // e.g., '[shouts]' (ElevenLabs v3, self-closing) or '[mood: shouting]' (Gemini)
    readonly notes?: string // free-text director notes
  }
}

/**
 * Verbatim line set, ordered by absolute frame. **Janet voice settings
 * override (S01-cold-open)** flows through Phase 2 via
 * `scripts/cold-open-prototype.ts` `COLD_OPEN_SPEAKER.voiceSettings`
 * (matriarch-tuned, NOT Roger defaults). Phase 2 reads voice settings
 * from the COLD_OPEN_SPEAKER constant when voice === 'janet'; defaults
 * to Phase 0 Unit 0.2 Roger settings for voice === 'dash'.
 */
export const BURNED_TRAILER_LINES: readonly Line[] = [
  // ─── S01 Cold Open (0–210) ───
  {
    id: 'S01-cold-open',
    scene: 'S01',
    frame: 60, // 2.0s in — visual establishes, then VO drops
    voice: 'janet',
    text: "He's a machine, this kid. Honestly at this point I'm just impressed.",
    cueType: 'cold-open',
    expectedFrames: 150, // ~5.0s budget for 13-word line at deadpan pace
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "Inline [sarcastic] tag before 'Honestly' per Phase 0 Unit 0.3 cadence-spec.md. Voice settings override per COLD_OPEN_SPEAKER constant in scripts/cold-open-prototype.ts (Sloane matriarch-tuned: stability 0.85, similarity 0.75, style 0.05, speaker_boost true, speed 0.92). Voice ID m8AHWg36LJTQWKmfeGVv (Shared Library).",
    },
  },

  // ─── S02 Briefing Setup (210–570) ───
  {
    id: 'S02-briefing',
    scene: 'S02',
    frame: 219, // ~0.3s scene-head buffer for venetian-blind establishing shot
    voice: 'dash',
    text: 'Good morning. The agency has decided you can be trusted with Operation Pendleton. Code-name in the field: BURNED. Pull up a chair. Try not to embarrass me.',
    cueType: 'sustained',
    expectedFrames: 351, // 28 words ÷ 2.4 wps × 30 = 350 frames (~11.7s)
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes: 'Sterling-CODED briefing-room formality; ellipsis pauses at clause boundaries; Roger defaults voice_settings.',
    },
  },

  // ─── S03 Mission Background (570–1050) — two-segment construction ───
  {
    id: 'S03-roster',
    scene: 'S03',
    frame: 570, // scene start — segment 1 begins immediately
    voice: 'dash',
    text:
      'Our autonomous field assets infiltrated the contract last quarter. [BEAT 0.3s] Seven operatives in the active roster. [BEAT 0.3s] Six expense reports, all classified. [BEAT 0.3s] One who insists on being called \'Agent X\' and refuses to file any paperwork whatsoever.',
    cueType: 'sustained',
    expectedFrames: 270, // ~9.0s budget for segment 1 (~35 words + 3×0.3s beats; 3.89 wps deadpan-tight)
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        '[BEAT NNNms] markers expand to per-engine pause primitive (SSML <break time="NNNms"/> or equivalent). 1.0s mid-scene dossier-page wipe to deck reveal happens AFTER this segment ends, before S03-deck begins.',
    },
  },
  {
    id: 'S03-deck',
    scene: 'S03',
    frame: 870, // segment 1 ends ~frame 840 + 30-frame mid-wipe = 870
    voice: 'dash',
    text:
      'Mission: a deck of one hundred and twenty operations. [BEAT 0.4s] One ends your career instantly. [BEAT 0.3s] The rest help you survive. Or ensure your colleagues don\'t.',
    cueType: 'sustained',
    expectedFrames: 180, // ~6.0s budget for segment 2 (~24 words + 2 beats; 4.0 wps deadpan-tight)
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "Trimmed from plan-original (~31w) to fit deadpan delivery in 6.0s budget. Cuts: 'of them' (implied by antecedent), 'exist to' + 'it' (compressed 'exist to help you survive it' → 'help you survive'), 'to' + final beat (compressed 'Or to ensure your colleagues don't' → 'Or ensure your colleagues don't' running with no preceding pause). Dark-closing gag preserved.",
    },
  },

  // ─── S04 Receipts Cascade w/ Stacked Payoff (1050–2040) — 8 cues ───
  {
    id: 'S04-cue-01',
    scene: 'S04',
    frame: 1050, // S04 start; HTP dossier slides into hero position
    voice: 'dash',
    text: 'Operational planning.',
    cueType: 'list',
    expectedFrames: 60, // 2.0s window; 2 words at 1.0 wps deliberate-open
    leadFramesHint: 0,
    cadenceAdapter: { engine: 'elevenlabs-v3', prefixTag: '[sarcastic]' },
  },
  {
    id: 'S04-cue-02',
    scene: 'S04',
    frame: 1110,
    voice: 'dash',
    text: 'Fourteen thousand pages of forensic dossiers.',
    cueType: 'list',
    expectedFrames: 90, // 3.0s window; 7 words ≈ 2.3 wps
    leadFramesHint: 0,
    cadenceAdapter: { engine: 'elevenlabs-v3', prefixTag: '[sarcastic]' },
  },
  {
    id: 'S04-cue-03',
    scene: 'S04',
    frame: 1200,
    voice: 'dash',
    text: 'Drafted on weekends, by a field asset — name redacted for compliance.',
    cueType: 'list',
    expectedFrames: 90, // 3.0s window; 11 words / 3.0s = 3.67 wps (under 4.5 sanity ceiling)
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "Trimmed from plan-original (~14w, 'who, for compliance reasons, is not named') to fit per-cue list-band sanity ceiling. 'name redacted for compliance' is in-character spy vocab; the em-dash carries the explanatory beat.",
    },
  },
  {
    id: 'S04-stat-01',
    scene: 'S04',
    frame: 1290, // stat 1 enters safe-square center-bottom
    voice: 'dash',
    text: 'Mission rehearsal: fourteen hundred and seven contingencies war-gamed.',
    cueType: 'list',
    expectedFrames: 120, // 4.0s window; 9 words ≈ 2.25 wps
    leadFramesHint: 0,
    cadenceAdapter: { engine: 'elevenlabs-v3', prefixTag: '[sarcastic]' },
  },
  {
    id: 'S04-stat-02',
    scene: 'S04',
    frame: 1410,
    voice: 'dash',
    text: "Six of them, deliberately unrehearsed — the 'memorable ones.'",
    cueType: 'list',
    expectedFrames: 150, // 5.0s window; 10 words ≈ 2.0 wps
    leadFramesHint: 0,
    cadenceAdapter: { engine: 'elevenlabs-v3', prefixTag: '[sarcastic]' },
  },
  {
    id: 'S04-stat-03',
    scene: 'S04',
    frame: 1560,
    voice: 'dash',
    text: 'Seventeen asset illustrations. Five of them with hats.',
    cueType: 'list',
    expectedFrames: 120, // 4.0s window; 8 words ≈ 2.0 wps
    leadFramesHint: 0,
    cadenceAdapter: { engine: 'elevenlabs-v3', prefixTag: '[sarcastic]' },
  },
  {
    id: 'S04-stat-04',
    scene: 'S04',
    frame: 1680,
    voice: 'dash',
    text: "Seven on the roster. Six in the deck. One on the research budget. Don't ask.",
    cueType: 'list',
    expectedFrames: 180, // 6.0s window; 15 words ≈ 2.5 wps
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "Otto 'on the research budget' phrasing matches ActRoster.tsx:153-158 source ('busy with the (unsanctioned, off-books, almost certainly illegal) research budget'). The 'Don't ask.' kicker is the deadpan glaze.",
    },
  },
  {
    id: 'S04-payoff',
    scene: 'S04',
    frame: 1950, // R3 stacked-payoff stamp slap + Dash truth-collision
    voice: 'dash',
    text: 'They WERE the operation.',
    cueType: 'payoff',
    expectedFrames: 60, // 2.0s window; 4 words at 2.0 wps controlled-deadpan (sits at payoff ceiling)
    leadFramesHint: 2, // payoff cues use 2-frame perceptual-sync hint
    fadeInMs: 5,
    fadeOutMs: 30,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "R3 stacked-payoff truth-collision. Music ducks 1980→2010 (30 frames, 90%→30%). 1.0s silent visual hold 2010-2040. Cascade chrome at 30% IS the visual antecedent of 'they' (per Unit 1.5 SHOWING-beats-TELLING).",
    },
  },

  // ─── S05 Gameplay Dissolve (2040–2580) — sparse VO ───
  {
    id: 'S05-gameplay-vo',
    scene: 'S05',
    frame: 2280,
    voice: 'dash',
    text: 'And — between you and me — they appear to be enjoying it.',
    cueType: 'sustained',
    expectedFrames: 150, // 5.0s window; 12 words ≈ 2.4 wps
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes: "Sparse VO over live gameplay audio at 30% bed; em-dash pauses for sotto-voce conspiratorial register.",
    },
  },
  {
    id: 'S05-scream',
    scene: 'S05',
    frame: 2400, // 200-frame-delayed reaction beat after clip-relative-160 BURNED-card-draw at absolute frame 2200
    voice: 'dash',
    text: 'VEEEEEEEERAAAA!!!',
    cueType: 'scream',
    expectedFrames: 50, // ~1.7s Sterling-LANA shape; Phase 2 measures actual
    leadFramesHint: 1, // scream uses 1-frame perceptual-sync hint
    fadeInMs: 0,
    fadeOutMs: 30,
    skipSilenceremove: true, // preserve attack envelope; silenceremove would clip the onset
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[shouts]',
      notes:
        "Sterling-LANA four-axis acoustic shape per Phase 0 Unit 0.6 cadence-spec.md §3.6: (1) flat pitch (no F0 falsetto rise), (2) 6-12 dB amplitude jump vs surrounding gameplay bed, (3) FIRST-vowel drag, (4) accent anchored on first syllable. Self-closing [shouts] tag (ElevenLabs v3 ONLY).",
    },
  },

  // ─── S06 Closing Directive (2580–2850) — 2 cues (close + Phrasing) ───
  {
    id: 'S06-close',
    scene: 'S06',
    frame: 2580, // scene start — Dash launches close immediately
    voice: 'dash',
    text: "That's the briefing. Operation Pendleton is in your hands. Hold it tight.",
    cueType: 'payoff',
    expectedFrames: 222, // 7.4s window; 14 words at 1.9 wps deliberate-close pace
    leadFramesHint: 0,
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "'Hold it tight' is the entendre setup line for Phrasing! — physical-action ambiguity per spec §3.5 earned-Phrasing! mechanic. BURNED logo lands at frame 2780 (during this line, mid-clause).",
    },
  },
  {
    id: 'S06-phrasing',
    scene: 'S06',
    frame: 2814, // S06-close ends at 2802 (+222 frames from 2580) + [BEAT 0.4s] = 12 frames pause + landing
    voice: 'dash',
    text: 'Phrasing.',
    cueType: 'payoff',
    expectedFrames: 12, // 0.4s window for the punchline word
    leadFramesHint: 0,
    fadeInMs: 30,
    fadeOutMs: 50, // qsin curve per plan Step 7 phrasing-specific fade shape
    cadenceAdapter: {
      engine: 'elevenlabs-v3',
      prefixTag: '[sarcastic]',
      notes:
        "FFmpeg fade curve: qsin (per plan Step 7 phrasing-specific shape). R15 #4 stamp 'OPERATION STATUS: FIELD-READY' lands at frame 2820 (concurrent with Phrasing audio tail). R15 #5 closing-card lands at frame 2835 (post-audio).",
    },
  },
] as const
