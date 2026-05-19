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
 *   - S04 R3 payoff (Dash at frame 1950)   → s04-cue-1950-dash.wav
 *   - S05 scream (Dash at frame 2400)      → s05-cue-2400-dash.wav
 *
 * Scream note: voice cell is `dash`; the Sterling-CODED shout is
 * steered by `cadenceAdapter.prefixTag: '[shouts]'` per Phase 0 Unit
 * 0.6, NOT by a separate voice cell. So the filename uses `dash`.
 */
import type { Line } from '../../src/lib/script.js';

export function cueFilename(line: Line): string {
  return `${line.scene.toLowerCase()}-cue-${line.frame}-${line.voice}.wav`;
}

/** Static-file path Phase 4 hands to Remotion `staticFile()`. */
export function cueStaticPath(line: Line): string {
  return `audio/lines/${cueFilename(line)}`;
}
