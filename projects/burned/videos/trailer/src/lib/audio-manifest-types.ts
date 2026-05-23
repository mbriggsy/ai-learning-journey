/**
 * AudioAsset manifest type — Phase 2 → Phase 4 hand-off contract.
 *
 * Type stays stable; the data file (`audio-manifest.ts`) is regenerated
 * by `scripts/generate-audio-manifest.ts` (Unit 2.8 codegen). Separating
 * the type from the data lets Phase 4 import a stable shape while the
 * data churns under codegen reruns.
 *
 * **Type derivation contract.** `voice`, `cueType`, and `cadenceAdapter`
 * are derived from Phase 1's `Line` shape — never re-declared as parallel
 * unions. Phase 1's `script.ts` is the canonical source for these unions
 * (per CLAUDE.md "Types derived from data, never parallel enums" +
 * `docs/insights/057-plan-declared-constants-vs-phase-0-spike-locked-values-drift.md`
 * spike-wins rule). If Phase 1 adds a voice cell or cue-type, the
 * manifest contract widens automatically and a re-codegen surfaces the
 * gap.
 *
 * **Phase 4 consumption.** `<Sequence from={asset.startFrame -
 * (asset.leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} /></Sequence>`.
 * NOT `<Audio from={...}>` — that prop does not exist on
 * `@remotion/media`'s `<Audio>` component (verified Phase 0 ADR #5 +
 * Context7).
 */
import type { Line, CueType } from './script.js';

export interface AudioAsset {
  /** Cue filename in `<BURNED-root>/public/trailer/audio/lines/` (e.g., `s04-cue-2280-dash.wav`). */
  readonly filename: string;
  /** Static-file path consumable by Remotion `staticFile()`. */
  readonly staticPath: string;
  /** Absolute composition frame at which this audio enters (Phase 1 `Line.frame`). */
  readonly startFrame: number;
  /** Measured frame duration (post-processed actual, from FFprobe). */
  readonly actualFrames: number;
  /** Voice cell — derived from Phase 1's `Line.voice` union. */
  readonly voice: Line['voice'];
  /** Original Phase 1 budgeted duration. */
  readonly expectedFrames: number;
  /**
   * Phase 1 cue type. Phase 4 may use for music-bed ducking decisions
   * (e.g., payoff cues duck the bed harder than sustained briefing).
   */
  readonly cueType: CueType;
  /**
   * Phase 4 places `<Audio>` at `<Sequence from={startFrame -
   * (leadFramesHint ?? 0)}>` for perceptual A/V sync. Payoff cues use 2
   * frames; scream uses 1 frame; default 0.
   */
  readonly leadFramesHint: number;
  /**
   * Measured integrated loudness post-Unit-2.5 (Phase 6 QA consumes).
   * Target -16 LUFS; shorter cues (<3s) drift up to ±2 LU per
   * loudnorm's documented limitation.
   */
  readonly loudnessLufs: number;
  /** Mirrored from Phase 1's `Line.cadenceAdapter` for Phase 4 reference. */
  readonly cadenceAdapter?: Line['cadenceAdapter'];
}
