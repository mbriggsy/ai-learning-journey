import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildMultiProjectReport } from '../multi-report.js';
import { stripForPublish } from '../strip-for-publish.js';
import { multiProjectReportSchema } from './schema.js';
import { buildMultiFixture, type MultiFixture } from './helpers/multi-fixture.js';

let fx: MultiFixture;
beforeAll(async () => {
  fx = await buildMultiFixture();
}, 60_000);
afterAll(async () => {
  await fx.cleanup();
});

function fullRun() {
  return buildMultiProjectReport({
    homeDir: fx.homeDir,
    projectPaths: fx.projectPaths,
    metaPaths: fx.metaPaths,
    archivePaths: fx.archivePaths,
  });
}

/** Collect dotted key-paths (array indices → []) and string leaves from a value. */
function walk(value: unknown, prefix: string, keyPaths: Set<string>, stringLeaves: string[], keys: Set<string>): void {
  if (Array.isArray(value)) {
    if (value.length === 0) keyPaths.add(prefix + '[]');
    for (const item of value) walk(item, prefix + '[]', keyPaths, stringLeaves, keys);
  } else if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) keyPaths.add(prefix);
    for (const [k, v] of entries) {
      keys.add(k);
      walk(v, prefix ? `${prefix}.${k}` : k, keyPaths, stringLeaves, keys);
    }
  } else {
    if (prefix) keyPaths.add(prefix);
    if (typeof value === 'string') stringLeaves.push(value);
  }
}

describe('§0.10 — JSON schema validation', () => {
  it('the report validates against the Zod mirror, with null discipline + meta rules', async () => {
    const { report } = await fullRun();
    const parsed = multiProjectReportSchema.safeParse(report);
    expect(parsed.success || parsed.error.toString()).toBe(true);

    const [activeA, activeB, activeC] = fx.projectPaths;
    expect(report.projects.find((p) => p.projectPath === activeB)?.editorial).toBeNull();
    expect(report.projects.find((p) => p.projectPath === activeC)?.git.firstCommitISO).toBeNull();
    expect(report.projects.find((p) => p.projectPath === activeA)?.editorial?.oneLiner).toBe(
      'Active A — the rich one',
    );

    // meta: present, editorial forced null (despite its config block), never in projects[].
    expect(report.meta).toHaveLength(1);
    expect(report.meta[0]?.editorial).toBeNull();
    expect(report.projects.map((p) => p.projectPath)).not.toContain(report.meta[0]?.projectPath);
  });
});

describe('§0.10 — aggregation invariants A/B/C + meta counted', () => {
  it('Invariant A (sum-class) holds across projects + meta + archive', async () => {
    const { report } = await fullRun();
    const c = report.combined;
    const arch = report.archiveCollective!;
    const sum = (pick: (r: (typeof report.projects)[number]) => number) =>
      report.projects.reduce((a, r) => a + pick(r), 0) + report.meta.reduce((a, r) => a + pick(r), 0);
    expect(c.totalAuthoredLines).toBe(sum((r) => r.grandTotals.authoredLines) + arch.totalAuthoredLines);
    expect(c.totalCommits).toBe(sum((r) => r.git.totalCommits) + arch.totalCommits);
    expect(c.totalTestCases).toBe(sum((r) => r.testCases) + arch.totalTestCases);
  });

  it('Invariant B (tokens) + C (window) hold; meta + worktree counted', async () => {
    const { report } = await fullRun();
    const c = report.combined;
    const tokenSum = (pick: (t: NonNullable<(typeof report.projects)[number]['tokens']>) => number) =>
      [...report.projects, ...report.meta].reduce((a, r) => a + (r.tokens ? pick(r.tokens) : 0), 0);
    expect(c.totalTokensProcessed).toBe(tokenSum((t) => t.tokensProcessed) + report.archiveCollective!.totalTokensProcessed);
    // 6 = active-a (3) + worktree (1) + active-b empty (0) + meta (2)
    expect(c.totalSessions).toBe(6);
    // window spans the earliest (2026-05-01) to latest (2026-05-05) message.
    expect(c.tokenWindowStartISO).toBe('2026-05-01T00:00:00.000Z');
    expect(c.tokenWindowEndISO).toBe('2026-05-05T00:00:00.000Z');
    expect(c.tokenWindowDays).toBe(4);
  });

  it('meta is COUNTED, not dropped: combined strictly exceeds projects+archive alone', async () => {
    const withMeta = (await fullRun()).report.combined;
    const withoutMeta = (
      await buildMultiProjectReport({
        homeDir: fx.homeDir,
        projectPaths: fx.projectPaths,
        archivePaths: fx.archivePaths,
      })
    ).report.combined;
    expect(withMeta.totalAuthoredLines).toBeGreaterThan(withoutMeta.totalAuthoredLines);
    expect(withMeta.totalTokensProcessed).toBeGreaterThan(withoutMeta.totalTokensProcessed);
  });

  it('projects-only run: meta [], archiveCollective null, totals collapse', async () => {
    const { report } = await buildMultiProjectReport({
      homeDir: fx.homeDir,
      projectPaths: fx.projectPaths,
    });
    expect(report.meta).toEqual([]);
    expect(report.archiveCollective).toBeNull();
  });
});

describe('§0.10 — privacy round-trip (shared stripForPublish)', () => {
  const BAD = [
    /C:\\/,
    /C:\//,
    /\/Users\//,
    /\\Users\\/,
    /AppData/,
    /brigg/,
    /node_modules/,
    /\/private\//,
    /\\private\\/,
    /secret/i,
    /password/i,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    /^[A-Za-z]--[A-Za-z]/,
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  ];

  it('strips projectPath + sha and leaks no path/username/secret string', async () => {
    const { report } = await fullRun();
    const stripped = stripForPublish(report);
    const keyPaths = new Set<string>();
    const stringLeaves: string[] = [];
    const keys = new Set<string>();
    walk(stripped, '', keyPaths, stringLeaves, keys);

    expect(keys.has('projectPath')).toBe(false);
    expect(keys.has('sha')).toBe(false);
    expect(keys.has('messageFirstLine')).toBe(false);

    for (const leaf of stringLeaves) {
      for (const re of BAD) {
        expect(re.test(leaf), `leaked "${leaf}" matched ${re}`).toBe(false);
      }
    }
  });
});

describe('§0.10 — session merge + orphan handling', () => {
  it('counts 6 sessions, returns the orphan slug, and excludes its tokens', async () => {
    const { report, orphanSlugs } = await fullRun();
    expect(report.combined.totalSessions).toBe(6);
    expect(orphanSlugs).toContain(fx.orphanSlug);
    // the orphan's 99,999-input message must NOT appear in combined.
    expect(report.combined.totalTokensProcessed).toBeLessThan(99_999);
  });
});
