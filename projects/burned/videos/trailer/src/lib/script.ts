/**
 * Trailer script — machine contract for Phase 2 voice pipeline.
 *
 * Unit 1.1 SCAFFOLD STATUS: type definitions locked + empty array
 * export. **Unit 1.2 authors the verbatim line set.** Until then,
 * `BURNED_TRAILER_LINES` is `[]` by design — `script.test.ts`
 * accepts the empty array as a valid scaffold state and will tighten
 * assertions once Unit 1.2 lands.
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
 * Verbatim line set, ordered by absolute frame. **Empty in Unit 1.1
 * scaffold; populated by Unit 1.2 (Narration Script Draft) +
 * Unit 1.3 (Voice Cast Lock & Per-Line Assignment).**
 */
export const BURNED_TRAILER_LINES: readonly Line[] = [] as const
