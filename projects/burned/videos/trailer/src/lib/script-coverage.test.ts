/**
 * Phase 2 coverage drift-guard: every Line in BURNED_TRAILER_LINES has
 * a generated WAV after a pipeline run.
 *
 * Designed to FAIL until Unit 2.4 completes — runs after Unit 2.4 emits
 * the full set under `public/audio/lines/`. CI shouldn't gate on this
 * test directly; it's a post-pipeline assertion, not a unit invariant.
 *
 * Phase 1's `script.test.ts` guards BEAT-SHEET ↔ script.ts drift —
 * intentionally NOT duplicated here.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BURNED_TRAILER_LINES } from './script';
import { cueFilename } from '../../scripts/lib/cue-filename';
import { parsePhase0Exit } from '../../scripts/lib/phase-0-exit';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '../..');
// Per Phase 4 Unit 4.1 ADR #15 correction — see cue-filename.ts.
const LINES_DIR = resolve(TRAILER_ROOT, '../../public/trailer/audio/lines');
const PHASE_0_EXIT = resolve(TRAILER_ROOT, 'PHASE-0-EXIT.md');

/**
 * Pre-pipeline state: no WAVs yet. Returns true when the test should
 * skip (directory missing OR contains zero .wav files). Once Unit 2.4
 * deposits any WAV, the coverage assertion becomes meaningful — a
 * MISSING WAV after Unit 2.4 is the drift signal we want.
 */
function pipelineNotRunYet(): boolean {
  if (!existsSync(LINES_DIR)) return true;
  return readdirSync(LINES_DIR).filter((f) => f.endsWith('.wav')).length === 0;
}

describe('script-coverage', () => {
  it('cueFilename produces a Remotion-static-safe pattern for every line', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const name = cueFilename(line);
      expect(name, `bad filename for cue ${line.id}`).toMatch(
        /^s0[1-6]-cue-\d+-(dash|sable|janet|vera)\.wav$/,
      );
    }
  });

  it('no two lines share a generated filename (collision check)', () => {
    const filenames = BURNED_TRAILER_LINES.map(cueFilename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it.skipIf(pipelineNotRunYet())(
    'every cue in BURNED_TRAILER_LINES has a generated WAV',
    () => {
      const cfg = parsePhase0Exit(PHASE_0_EXIT);
      const missing: string[] = [];

      for (const line of BURNED_TRAILER_LINES) {
        // If R5 was cut at Phase 0 close, the scream cue has no WAV.
        if (line.cueType === 'scream' && cfg.r5Outcome === 'cut') continue;

        const wav = resolve(LINES_DIR, cueFilename(line));
        if (!existsSync(wav)) missing.push(cueFilename(line));
      }

      expect(missing, `Missing WAVs after pipeline run: ${missing.join(', ')}`).toEqual([]);
    },
  );
});
