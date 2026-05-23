/**
 * Unit 2.4 per-cue duration audit.
 *
 * Reads BURNED_TRAILER_LINES, ffprobes each rendered WAV, and flags
 * any cue whose actual duration drifts outside its cueType tolerance
 * band (sustained ±5%, list ±7%, payoff ±4%, scream ±20%, cold-open
 * treated as sustained).
 *
 * S06-phrasing reconciliation: TODO carries the 12-vs-27 frame
 * contradiction. This audit reports both the script value (12) and
 * the measured actual; Unit 2.7 reconciliation amends Phase 1 if
 * natural delivery lands closer to 27.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BURNED_TRAILER_LINES, type CueType } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';

const FPS = 30;
const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
// Per Phase 4 Unit 4.1 ADR #15 correction — see cue-filename.ts.
const OUT_DIR = resolve(TRAILER_ROOT, '../../public/trailer/audio/lines');

const TOLERANCE: Record<CueType, number> = {
  sustained: 0.05,
  list: 0.07,
  payoff: 0.04,
  'cold-open': 0.05,
  scream: 0.20,
};

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
  return parseFloat(out.trim());
}

interface Row {
  id: string;
  cueType: CueType;
  expectedF: number;
  actualF: number;
  driftPct: number;
  tolerancePct: number;
  status: 'OK' | 'WARN' | 'FAIL' | 'MISSING';
  durSec: number;
}

const rows: Row[] = [];

for (const cue of BURNED_TRAILER_LINES) {
  const wavPath = resolve(OUT_DIR, cueFilename(cue));
  if (!existsSync(wavPath)) {
    rows.push({
      id: cue.id,
      cueType: cue.cueType,
      expectedF: cue.expectedFrames,
      actualF: 0,
      driftPct: 0,
      tolerancePct: TOLERANCE[cue.cueType],
      status: 'MISSING',
      durSec: 0,
    });
    continue;
  }
  const durSec = ffprobeDurationSec(wavPath);
  const actualF = Math.round(durSec * FPS);
  const driftPct = (actualF - cue.expectedFrames) / cue.expectedFrames;
  const tol = cue.driftToleranceOverride ?? TOLERANCE[cue.cueType];
  const absDrift = Math.abs(driftPct);
  const status: Row['status'] =
    absDrift <= tol ? 'OK' : absDrift <= tol * 2 ? 'WARN' : 'FAIL';
  rows.push({
    id: cue.id,
    cueType: cue.cueType,
    expectedF: cue.expectedFrames,
    actualF,
    driftPct,
    tolerancePct: tol,
    status,
    durSec,
  });
}

const pad = (s: string, n: number): string => s.padEnd(n);
console.log(
  pad('cueId', 20) +
    pad('type', 12) +
    pad('expF', 8) +
    pad('actF', 8) +
    pad('Δ%', 10) +
    pad('tol±%', 10) +
    pad('dur(s)', 10) +
    'status',
);
console.log('─'.repeat(86));
for (const r of rows) {
  console.log(
    pad(r.id, 20) +
      pad(r.cueType, 12) +
      pad(r.expectedF.toString(), 8) +
      pad(r.actualF.toString(), 8) +
      pad((r.driftPct * 100).toFixed(1) + '%', 10) +
      pad('±' + (r.tolerancePct * 100).toFixed(0) + '%', 10) +
      pad(r.durSec.toFixed(2), 10) +
      r.status,
  );
}

const flagged = rows.filter((r) => r.status !== 'OK');
console.log('\n' + flagged.length + ' / ' + rows.length + ' flagged (WARN/FAIL/MISSING).');
if (flagged.length) {
  console.log('\nFlagged cues:');
  for (const r of flagged) {
    console.log(
      `  ${r.status.padEnd(7)} ${r.id}: expected ${r.expectedF}f, actual ${r.actualF}f (Δ ${(r.driftPct * 100).toFixed(1)}%, tol ±${(r.tolerancePct * 100).toFixed(0)}%)`,
    );
  }
}

// Emit duration-reconciliation.md per Phase 2 plan Step 2.
const REPORT_PATH = resolve(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/duration-reconciliation.md',
);
const tableRows = rows
  .map(
    (r) =>
      `| \`${cueFilenameFromRow(r.id)}\` | ${r.cueType} | ${r.expectedF} | ${r.actualF} | ${(r.driftPct * 100).toFixed(1)}% | ±${(r.tolerancePct * 100).toFixed(0)}% | ${r.status} |`,
  )
  .join('\n');
const md =
  `# Duration Reconciliation — Unit 2.4 output\n\n` +
  `Generated: ${new Date().toISOString()}\n` +
  `Composition fps: ${FPS}\n` +
  `Tolerance bands: sustained ±5%, list ±7%, payoff ±4%, scream ±20%, cold-open ±5%.\n` +
  `WARN = drift within 2× tolerance; FAIL = beyond 2× tolerance.\n\n` +
  `Routing: drift items → Unit 2.7 reconciliation. Some drift is expected to\n` +
  `resolve in Unit 2.5 (silenceremove + loudnorm) and Unit 2.6 (intra-line\n` +
  `[BEAT NNNms] stitching).\n\n` +
  `| Cue | Type | Expected | Actual | Drift | Tolerance | Verdict |\n` +
  `|-----|------|----------|--------|-------|-----------|---------|\n` +
  `${tableRows}\n`;
writeFileSync(REPORT_PATH, md);
console.log(`\nWrote ${REPORT_PATH}.`);

// Exit codes per Phase 2 plan Step 2: missing = 2, drift = 3, clean = 0.
const missing = rows.filter((r) => r.status === 'MISSING');
const fails = rows.filter((r) => r.status === 'FAIL' || r.status === 'WARN');
if (missing.length) {
  console.error(`\nFATAL: ${missing.length} WAV(s) missing.`);
  process.exit(2);
}
if (fails.length) {
  console.error(`\n${fails.length} cue(s) exceed tolerance — route to Unit 2.7 reconciliation.`);
  process.exit(3);
}
console.log('\nAll cues within tolerance ✓');

function cueFilenameFromRow(id: string): string {
  const cue = BURNED_TRAILER_LINES.find((l) => l.id === id);
  return cue ? cueFilename(cue) : id;
}
