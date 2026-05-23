/**
 * Unit 2.8 — AudioAsset manifest codegen.
 *
 * Reads Phase 1's `BURNED_TRAILER_LINES`, probes each post-processed WAV
 * via FFprobe for measured duration, pulls integrated loudness from
 * Unit 2.5's `loudness-audit.jsonl`, and emits
 * `src/lib/audio-manifest.ts` for Phase 4 Remotion consumption.
 *
 * **Sentinel gate.** Asserts `phase-1-reconciliation-signoff.txt`
 * exists before running. Without that sentinel the audit-vs-budget
 * reconciliation hasn't been signed off and any manifest is premature.
 * The sentinel is gitignore-allowlisted per the Unit 2.7 closeout
 * (see `docs/insights/059-sentinel-gated-architecture-can-be-theatrical.md`
 * for the gotcha that nearly turned this gate into theater).
 *
 * **R5 filter.** PHASE-0-EXIT.md drives whether the scream cue ships
 * — when `r5Outcome === 'cut'`, S05-scream is excluded from the
 * manifest and Phase 4 typecheck remains clean either way.
 *
 * **Patterns matched.** `fileURLToPath`-based TRAILER_ROOT (not
 * cwd-relative — see audit-durations.ts), `execFileSync` argv (security
 * convention), `atomicWriteSync` (crash-safe writes), `.js`-extension
 * imports (NodeNext ESM). One-shot subprocess so stdio drains on exit —
 * no pipe-backpressure risk (insight #026).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import type { AudioAsset } from '../src/lib/audio-manifest-types.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { cueFilename, cueStaticPath } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';

const FPS = 30;
const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');

const SIGNOFF_SENTINEL = resolve(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/phase-1-reconciliation-signoff.txt',
);
const LOUDNESS_AUDIT = resolve(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/loudness-audit.jsonl',
);
const PHASE_0_EXIT = resolve(TRAILER_ROOT, 'PHASE-0-EXIT.md');
// Per Phase 4 Unit 4.1 ADR #15 correction — see cue-filename.ts.
const WAV_DIR = resolve(TRAILER_ROOT, '../../public/trailer/audio/lines');
const MANIFEST_OUT = resolve(TRAILER_ROOT, 'src/lib/audio-manifest.ts');

// ─── sentinel gate ────────────────────────────────────────────────
if (!existsSync(SIGNOFF_SENTINEL)) {
  throw new Error(
    `Codegen blocked: phase-1-reconciliation-signoff.txt sentinel missing.\n` +
      `Expected: ${SIGNOFF_SENTINEL}\n` +
      `Run Unit 2.7 reconciliation sign-off first.`,
  );
}

// ─── Phase 0 EXIT — drives R5 filter ─────────────────────────────
const cfg = parsePhase0Exit(PHASE_0_EXIT);

// ─── loudness audit lookup ───────────────────────────────────────
interface LoudnessAuditEntry {
  readonly cueId: string;
  readonly measuredI: string;
}

function loadLoudnessByCueId(path: string): Map<string, number> {
  if (!existsSync(path)) return new Map();
  const lines = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
  const entries = lines.map((line): readonly [string, number] => {
    const entry = JSON.parse(line) as LoudnessAuditEntry;
    return [entry.cueId, parseFloat(entry.measuredI)] as const;
  });
  return new Map(entries);
}

const loudnessByCueId = loadLoudnessByCueId(LOUDNESS_AUDIT);

// ─── ffprobe duration probe ──────────────────────────────────────
function ffprobeDurationSec(wavPath: string): number {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      wavPath,
    ],
    { encoding: 'utf-8' },
  );
  const seconds = parseFloat(out.trim());
  if (!Number.isFinite(seconds)) {
    throw new Error(`ffprobe returned non-finite duration for ${wavPath}: "${out.trim()}"`);
  }
  return seconds;
}

// ─── build entries ───────────────────────────────────────────────
const entries: AudioAsset[] = [];
const skipped: string[] = [];

for (const cue of BURNED_TRAILER_LINES) {
  // R5=cut filter — Phase 0 EXIT decides whether scream ships.
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') {
    skipped.push(`${cue.id} (R5 outcome: cut)`);
    continue;
  }

  const filename = cueFilename(cue);
  const wavPath = resolve(WAV_DIR, filename);
  if (!existsSync(wavPath)) {
    throw new Error(
      `Codegen: WAV missing for cue ${cue.id}.\n` +
        `Expected: ${wavPath}\n` +
        `Re-run \`pnpm tts\` + \`pnpm post-process\` (and \`pnpm stitch:beats\` for [BEAT] cues) to produce it.`,
    );
  }

  const seconds = ffprobeDurationSec(wavPath);
  const actualFrames = Math.round(seconds * FPS);

  // Loudness pull. Fail loudly when the audit log exists but a cue is
  // missing from it — per `docs/insights/062-default-fallback-coincides-
  // with-valid-measurement.md`, silently substituting the -16 LUFS
  // target as a fallback for a missing per-cue entry would mask
  // upstream regen drift (e.g., cueId renames). The fallback only
  // fires when the audit log is entirely absent (empty map).
  if (loudnessByCueId.size > 0 && !loudnessByCueId.has(cue.id)) {
    throw new Error(
      `Codegen: loudness audit log exists at ${LOUDNESS_AUDIT} but ` +
        `cue ${cue.id} has no entry. Re-run \`pnpm post-process\` to ` +
        `regenerate the audit, then \`pnpm generate:manifest\`.`,
    );
  }
  const loudnessLufs = loudnessByCueId.get(cue.id) ?? -16;

  entries.push({
    filename,
    staticPath: cueStaticPath(cue),
    startFrame: cue.frame,
    actualFrames,
    voice: cue.voice,
    expectedFrames: cue.expectedFrames,
    cueType: cue.cueType,
    leadFramesHint: cue.leadFramesHint,
    loudnessLufs,
    ...(cue.cadenceAdapter ? { cadenceAdapter: cue.cadenceAdapter } : {}),
  });
}

// ─── emit ────────────────────────────────────────────────────────
const banner =
  `// AUTOGENERATED by scripts/generate-audio-manifest.ts (Unit 2.8) — do not edit by hand.\n` +
  `// Regenerate with: pnpm generate:manifest\n` +
  `// Source of truth: src/lib/script.ts BURNED_TRAILER_LINES + Unit 2.5 loudness audit + FFprobe.\n`;

const tsBody =
  banner +
  `import type { AudioAsset } from './audio-manifest-types.js';\n` +
  `\n` +
  `export type { AudioAsset } from './audio-manifest-types.js';\n` +
  `\n` +
  `export const AUDIO_ASSETS: readonly AudioAsset[] = ${JSON.stringify(entries, null, 2)} as const;\n`;

atomicWriteSync(MANIFEST_OUT, tsBody);

// ─── report ──────────────────────────────────────────────────────
const totalSec = entries.reduce((sum, e) => sum + e.actualFrames / FPS, 0);
console.log(
  `OK audio-manifest.ts generated with ${entries.length} entries` +
    (skipped.length ? ` (${skipped.length} skipped: ${skipped.join(', ')})` : '') +
    `\n   Cumulative measured audio: ${totalSec.toFixed(2)}s across ${entries.length} cues` +
    `\n   Output: ${MANIFEST_OUT}`,
);
