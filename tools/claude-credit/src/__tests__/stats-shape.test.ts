import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildMultiProjectReport } from '../multi-report.js';
import { ALLOWED_KEY_PATHS, stripForPublish } from '../strip-for-publish.js';
import { buildMultiFixture, type MultiFixture } from './helpers/multi-fixture.js';

let fx: MultiFixture;
beforeAll(async () => {
  fx = await buildMultiFixture();
}, 60_000);
afterAll(async () => {
  await fx.cleanup();
});

/**
 * Collect every POPULATED key-path (array indices → []). null/undefined leaves
 * and empty containers carry no data (and no PII), so they produce no path —
 * the allowlist need only enumerate paths that actually ship a value.
 */
function collectKeyPaths(value: unknown, prefix: string, acc: Set<string>): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) collectKeyPaths(item, `${prefix}[]`, acc);
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      collectKeyPaths(v, prefix ? `${prefix}.${k}` : k, acc);
    }
    return;
  }
  if (prefix) acc.add(prefix);
}

describe('§0.10 — stats.json shape allowlist', () => {
  it('every published key-path is enumerated in ALLOWED_KEY_PATHS', async () => {
    const { report } = await buildMultiProjectReport({
      homeDir: fx.homeDir,
      projectPaths: fx.projectPaths,
      metaPaths: fx.metaPaths,
      archivePaths: fx.archivePaths,
    });
    const stripped = stripForPublish(report);
    const paths = new Set<string>();
    collectKeyPaths(stripped, '', paths);

    const allowed = new Set(ALLOWED_KEY_PATHS);
    const extra = [...paths].filter((p) => !allowed.has(p)).sort();
    if (extra.length > 0) {
      // Surface the exact paths so a reviewer can vet + add them deliberately.
      console.error('Unexpected published key-paths (review, then add to ALLOWED_KEY_PATHS):\n' + extra.join('\n'));
    }
    expect(extra).toEqual([]);
  });

  it('ALLOWED_KEY_PATHS has no duplicate entries', () => {
    expect(new Set(ALLOWED_KEY_PATHS).size).toBe(ALLOWED_KEY_PATHS.length);
  });
});
