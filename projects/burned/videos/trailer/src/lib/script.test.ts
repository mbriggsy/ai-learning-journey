/**
 * Trailer script invariants.
 *
 * Unit 1.1 SCAFFOLD STATUS: the line set is empty by design. Tests
 * below assert structural shape of the empty scaffold + verify the
 * `Line` type machinery typechecks. **Unit 1.2 tightens these
 * assertions** once lines land:
 *
 * - Each Line.id matches `<!-- @line: ID -->` marker in
 *   `videos/trailer/BEAT-SHEET.md` exactly once (insight #029 —
 *   marker pattern, not Markdown-table-cell parsing).
 * - Each Line.frame falls inside its declared scene's frame range.
 * - Each Line.text is non-empty and free of `[bracket-tag-leak]`
 *   beyond the cadenceAdapter.prefixTag field.
 * - R6 Pendleton-vocab grep returns zero matches on Line.text bodies.
 * - Per-cue word-count vs. wps target window (sustained 1.9–2.3 /
 *   list 2.4–2.6 / payoff 1.6–2.0).
 */
import { describe, expect, it } from 'vitest'
import { BURNED_TRAILER_LINES, type Line } from './script'

describe('script scaffold (Unit 1.1)', () => {
  it('BURNED_TRAILER_LINES is an array', () => {
    expect(Array.isArray(BURNED_TRAILER_LINES)).toBe(true)
  })

  it('Line type can be instantiated (typecheck smoke)', () => {
    // Compile-time smoke check that Line accepts the documented shape.
    // Unit 1.2 will replace this with real lines.
    const _stub: Line = {
      id: 'scaffold-smoke',
      scene: 'S01',
      frame: 0,
      voice: 'dash',
      text: 'placeholder',
      cueType: 'sustained',
      expectedFrames: 0,
      leadFramesHint: 0,
    }
    expect(_stub.id).toBe('scaffold-smoke')
  })

  // === Tightened-by-Unit-1.2 assertions (placeholders below) ===
  // it.todo('every Line.id appears exactly once in BEAT-SHEET.md via <!-- @line: ID --> marker')
  // it.todo('every Line.frame is inside its declared scene range')
  // it.todo('R6 Pendleton-vocab grep returns zero matches on Line.text bodies')
  // it.todo('per-cue word-count fits wps target window')
})
