/**
 * Phase 3 Unit 3.0 — BURNED HTP vocabulary vendor copy.
 *
 * Copies the 5 BURNED HTP vocabulary component pairs (10 files total)
 * from `src/client/howtoplay/components/` into
 * `videos/trailer/src/components/burned-vocabulary/`. The trailer's
 * Remotion scenes consume the vendored copies — giving Phase 4 the
 * EXACT visual primitives BURNED's HTP renders in-game (stamp slam,
 * crest svg|image variant, classification banner red/amber/navy, etc.)
 * without crossing the package isolation boundary.
 *
 * Run on Phase 3 entry; re-run whenever BURNED's HTP vocabulary
 * changes. `verify-vocab-sync.ts` is the CI drift gate.
 *
 * **Vendored-file list** is a HAND-LISTED ALLOWLIST per the plan's
 * Path B architecture decision. If BURNED adds a NEW vocabulary
 * component (say, `Insignia.tsx`), it WILL NOT be auto-vendored —
 * extend `VENDORED_FILES` below + re-run. The maintenance ritual is
 * documented in `burned-vocabulary/README.md`. (Insight #061 — plan
 * enumerations decay; the script is fail-loud on missing sources but
 * silent on additions.)
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VENDORED_FILES } from './lib/vocab-files.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(HERE, '..');
const BURNED_ROOT = resolve(TRAILER_ROOT, '../..');

const SOURCE_DIR = resolve(BURNED_ROOT, 'src/client/howtoplay/components');
const TARGET_DIR = resolve(TRAILER_ROOT, 'src/components/burned-vocabulary');

if (!existsSync(SOURCE_DIR)) {
  throw new Error(
    `Vendor blocked: BURNED HTP components dir missing.\n` +
      `Expected: ${SOURCE_DIR}\n` +
      `BURNED checkout intact? \`src/client/howtoplay/components/\` should exist.`,
  );
}

mkdirSync(TARGET_DIR, { recursive: true });

for (const filename of VENDORED_FILES) {
  const src = resolve(SOURCE_DIR, filename);
  const dst = resolve(TARGET_DIR, filename);
  if (!existsSync(src)) {
    throw new Error(
      `Vendor blocked: source file missing.\n` +
        `Expected: ${src}\n` +
        `BURNED's HTP vocabulary may have been renamed — update VENDORED_FILES in this script.`,
    );
  }
  cpSync(src, dst);
  console.log(`OK   copied ${filename}`);
}

console.log(
  `\nOK   ${VENDORED_FILES.length} files vendored to ${TARGET_DIR}\n` +
    `     Run \`pnpm verify:vocab-sync\` to verify no drift.`,
);
