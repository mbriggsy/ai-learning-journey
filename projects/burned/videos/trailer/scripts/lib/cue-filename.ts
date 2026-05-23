/**
 * Phase 2 cue-filename derivation.
 *
 * Filename + Remotion staticPath are DERIVED from Phase 1's `Line` —
 * never stored on the Line itself. Naming is a Phase 2 concern that
 * can change without reopening Phase 1.
 *
 * Convention: `s{NN}-cue-{frame}-{voice}.wav`
 *   - `s` lowercase + zero-padded scene number (s01..s06)
 *   - frame is the absolute composition frame from Line.frame
 *   - voice is the cell that owns the cue (dash | sable | janet | vera)
 *
 * Examples:
 *   - S01 cold-open (Janet at frame 60)    → s01-cue-60-janet.wav
 *   - S04 R3 payoff (Dash at frame 2280)   → s04-cue-2280-dash.wav
 *   - S05 scream (Dash at frame 2730)      → s05-cue-2730-dash.wav
 *
 * Scream note: voice cell is `dash`; the Sterling-CODED shout is
 * steered by `cadenceAdapter.prefixTag: '[shouts]'` per Phase 0 Unit
 * 0.6, NOT by a separate voice cell. So the filename uses `dash`.
 *
 * **Path discipline (Phase 4 Unit 4.1 correction, 2026-05-22).** TTS
 * WAVs are trailer-only assets — per Phase 3 ADR #15 they live under
 * `<BURNED-root>/public/trailer/...`. The staticPath prefix is
 * `trailer/audio/lines/`, matching the music-bed pattern (Phase 3.5)
 * and resolving through the trailer's `setPublicDir('../../public')`
 * to the BURNED root. The earlier `audio/lines/` prefix resolved to
 * `<BURNED-root>/public/audio/lines/` which doesn't exist —
 * Remotion 404s on every VO cue at master-composition mount.
 */
import type { Line } from '../../src/lib/script.js';

export function cueFilename(line: Line): string {
  return `${line.scene.toLowerCase()}-cue-${line.frame}-${line.voice}.wav`;
}

/** Static-file path Phase 4 hands to Remotion `staticFile()`. */
export function cueStaticPath(line: Line): string {
  return `trailer/audio/lines/${cueFilename(line)}`;
}
