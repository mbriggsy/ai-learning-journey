/**
 * Phase 3 Unit 3.0 — BURNED HTP vocabulary drift gate.
 *
 * sha256-compares the vendored copies in
 * `videos/trailer/src/components/burned-vocabulary/` against the
 * canonical BURNED HTP sources at `src/client/howtoplay/components/`.
 * Exits non-zero on any drift or missing-source — CI-ready.
 *
 * Recovery paths when this fires:
 *   - DRIFT: BURNED's source intentionally changed → re-run
 *     `pnpm vendor:vocab` to absorb. BURNED's change was unintentional
 *     → roll it back in BURNED.
 *   - MISSING source (renamed in BURNED): update VENDORED_FILES in
 *     `vendor-burned-vocab.ts` + here, then re-vendor.
 *   - MISSING vendored: never ran `pnpm vendor:vocab` → run it.
 *
 * The vendored-file list MUST stay in sync with `vendor-burned-vocab.ts`.
 * Both scripts share the same hand-listed allowlist by design (Path B
 * architecture, explicit + cross-platform-portable per plan §Unit 3.0).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const BURNED_ROOT = resolve(TRAILER_ROOT, '../..');

const SOURCE_DIR = resolve(BURNED_ROOT, 'src/client/howtoplay/components');
const TARGET_DIR = resolve(TRAILER_ROOT, 'src/components/burned-vocabulary');

const VENDORED_FILES = [
  'Stamp.tsx',
  'Stamp.module.css',
  'Crest.tsx',
  'Crest.module.css',
  'RedactBar.tsx',
  'RedactBar.module.css',
  'ClassificationBanner.tsx',
  'ClassificationBanner.module.css',
  'DossierPage.tsx',
  'DossierPage.module.css',
] as const;

function sha(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const failures: string[] = [];

for (const filename of VENDORED_FILES) {
  const src = resolve(SOURCE_DIR, filename);
  const dst = resolve(TARGET_DIR, filename);

  if (!existsSync(dst)) {
    failures.push(
      `MISSING vendored: ${filename} — run \`pnpm vendor:vocab\` to create.`,
    );
    continue;
  }
  if (!existsSync(src)) {
    failures.push(
      `MISSING source: ${filename} — BURNED renamed or removed it; ` +
        `update VENDORED_FILES in vendor-burned-vocab.ts + verify-vocab-sync.ts.`,
    );
    continue;
  }

  const srcSha = sha(readFileSync(src, 'utf-8'));
  const dstSha = sha(readFileSync(dst, 'utf-8'));
  if (srcSha !== dstSha) {
    failures.push(
      `DRIFT in ${filename}: BURNED source changed — re-run \`pnpm vendor:vocab\` ` +
        `(or roll back the BURNED change if unintentional).`,
    );
  } else {
    console.log(`OK   ${filename}`);
  }
}

if (failures.length > 0) {
  console.error(`\nVOCAB SYNC FAILURES (${failures.length}):`);
  failures.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log(`\nOK   all ${VENDORED_FILES.length} vendored files in sync.`);
