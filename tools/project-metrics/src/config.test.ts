import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadMultiProjectConfig, validateEditorial } from './config.js';
import { buildMultiProjectReport } from './multi-report.js';

const tmps: string[] = [];
async function tmpDir(prefix: string): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tmps.push(d);
  return d;
}
async function makeProject(files: Record<string, string>): Promise<string> {
  const dir = await tmpDir('cc-proj-');
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
  return dir;
}
afterEach(async () => {
  while (tmps.length) await fs.rm(tmps.pop()!, { recursive: true, force: true });
});

describe('loadMultiProjectConfig — meta/archive parsing', () => {
  it('parses a projects-only config (backward compat): no meta/archive', async () => {
    const home = await tmpDir('cc-home-');
    await fs.writeFile(
      path.join(home, '.project-metrics-projects.yaml'),
      'projects:\n  - path: /a\n  - path: /b\n',
      'utf8',
    );
    const { config } = await loadMultiProjectConfig(home);
    expect(config?.projects).toHaveLength(2);
    expect(config?.meta ?? []).toEqual([]);
    expect(config?.archive ?? []).toEqual([]);
  });

  it('parses projects + meta + archive into typed arrays', async () => {
    const home = await tmpDir('cc-home-');
    await fs.writeFile(
      path.join(home, '.project-metrics-projects.yaml'),
      [
        'projects:',
        '  - path: /proj/a',
        'meta:',
        '  - path: /tool',
        '  - path: /site',
        'archive:',
        '  - path: /arch/x',
        '',
      ].join('\n'),
      'utf8',
    );
    const { config } = await loadMultiProjectConfig(home);
    expect(config?.projects).toHaveLength(1);
    expect(config?.meta).toHaveLength(2);
    expect(config?.archive).toHaveLength(1);
    expect(config?.meta?.[0]?.path).toBe('/tool');
  });
});

describe('buildMultiProjectReport — meta + archive aggregation', () => {
  it('backward compat: projects-only ⇒ meta [], archiveCollective null, 0 sessions', async () => {
    const a = await makeProject({ 'src/index.ts': 'export const a = 1;\n' });
    const bareHome = await tmpDir('cc-bare-'); // no .claude/projects
    const { report, orphanSlugs } = await buildMultiProjectReport({
      homeDir: bareHome,
      projectPaths: [a],
    });
    expect(report.meta).toEqual([]);
    expect(report.archiveCollective).toBeNull();
    expect(report.combined.totalSessions).toBe(0);
    expect(orphanSlugs).toEqual([]);
  });

  it('meta is totals-only: in meta[] (editorial null), NOT projects[], but summed into combined', async () => {
    const proj = await makeProject({ 'src/p.ts': 'export const p = 1;\n// two lines\n' });
    // meta project ships an editorial block — it MUST be forced null.
    const metaProj = await makeProject({
      'src/m.ts': 'export const m = 1;\nexport const n = 2;\nexport const o = 3;\n',
      'project-metrics.config.yaml':
        'editorial:\n  oneLiner: "should be ignored"\n  hookStat: { label: X, value: "1" }\n  description: ignored\n',
    });
    const bareHome = await tmpDir('cc-bare-');
    const { report } = await buildMultiProjectReport({
      homeDir: bareHome,
      projectPaths: [proj],
      metaPaths: [metaProj],
    });

    expect(report.projects).toHaveLength(1);
    expect(report.meta).toHaveLength(1);
    expect(report.meta[0]?.editorial).toBeNull(); // forced null despite the config block
    expect(report.projects.map((p) => p.projectPath)).not.toContain(report.meta[0]?.projectPath);

    // combined.totalAuthoredLines includes BOTH project + meta — meta is summed, not dropped.
    const projLines = report.projects[0]!.grandTotals.authoredLines;
    const metaLines = report.meta[0]!.grandTotals.authoredLines;
    expect(metaLines).toBeGreaterThan(0);
    expect(report.combined.totalAuthoredLines).toBe(projLines + metaLines);
    // projectCount stays projects-only.
    expect(report.combined.projectCount).toBe(1);
  });

  it('archive rolls into archiveCollective (not projects[]/meta[]) and into combined', async () => {
    const proj = await makeProject({ 'src/p.ts': 'export const p = 1;\n' });
    const arch1 = await makeProject({ 'src/a.ts': 'export const a = 1;\nexport const b = 2;\n' });
    const arch2 = await makeProject({ 'src/c.ts': 'export const c = 3;\n' });
    const bareHome = await tmpDir('cc-bare-');
    const { report } = await buildMultiProjectReport({
      homeDir: bareHome,
      projectPaths: [proj],
      archivePaths: [arch1, arch2],
    });

    expect(report.projects).toHaveLength(1);
    expect(report.meta).toEqual([]);
    expect(report.archiveCollective?.projectCount).toBe(2);
    expect(report.archiveCollective?.projectNames).toHaveLength(2);
    // archive authored lines fold into combined.
    const projLines = report.projects[0]!.grandTotals.authoredLines;
    const archLines = report.archiveCollective!.totalAuthoredLines;
    expect(archLines).toBeGreaterThan(0);
    expect(report.combined.totalAuthoredLines).toBe(projLines + archLines);
    // projectCount stays projects-only (archive is not counted as projects).
    expect(report.combined.projectCount).toBe(1);
  });
});

describe('validateEditorial', () => {
  it('accepts a valid block and defaults optionals', () => {
    const { value, warnings } = validateEditorial({
      oneLiner: 'A thing',
      hookStat: { label: 'TESTS', value: '167' },
      description: 'desc',
    });
    expect(warnings).toEqual([]);
    expect(value).toMatchObject({
      oneLiner: 'A thing',
      status: 'active',
      heroImage: null,
      liveUrl: null,
      repoUrl: null,
      gallery: [],
    });
  });

  it('returns null + warning when required fields are missing', () => {
    const { value, warnings } = validateEditorial({ oneLiner: 'only this' });
    expect(value).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('rejects an absolute heroImage path (privacy guard) and nulls it', () => {
    const { value, warnings } = validateEditorial({
      oneLiner: 'x',
      hookStat: { label: 'L', value: 'v' },
      description: 'd',
      heroImage: 'C:/Users/brigg/secret.png',
    });
    expect(value?.heroImage).toBeNull();
    expect(warnings.some((w) => w.includes('heroImage'))).toBe(true);
  });
});
