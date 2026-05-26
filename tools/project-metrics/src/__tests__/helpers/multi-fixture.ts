import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectPathToSessionSlug } from '../../session-tokens.js';
import { assistantLine, makeSessionFixture } from './session-fixture.js';
import { makeGitFixture } from './git-fixture.js';

export interface MultiFixture {
  homeDir: string;
  projectPaths: string[]; // [active-a, active-b, active-c]
  metaPaths: string[]; // [meta-tool]
  archivePaths: string[]; // [archive-a, archive-b]
  orphanSlug: string;
  cleanup: () => Promise<void>;
}

const DATE = '2026-05-01T10:00:00-04:00';

async function plainDir(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-plain-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
  return dir;
}

/**
 * Build a full multi-project fixture exercising every Phase-0 path:
 * - active-a: git + editorial config (heroImage exists) + test file + plan + asset
 * - active-b: git, no editorial
 * - active-c: NO git (graceful-degradation: git.firstCommitISO null)
 * - meta-tool: git + editorial config (MUST be forced null in meta[])
 * - archive-a / archive-b: git (roll into archiveCollective)
 * Plus a ~/.claude/projects stub: active-a (3 msgs, 1 sidechain) + its worktree
 * (1 msg) + active-b (empty file, 0 msgs) + meta-tool (2 msgs) + an orphan slug.
 */
export async function buildMultiFixture(): Promise<MultiFixture> {
  const activeA = await makeGitFixture([
    {
      message: 'active-a init',
      dateISO: DATE,
      files: {
        'src/index.ts': 'export const a = 1;\nexport const b = 2;\n',
        'src/app.test.ts': "import { it } from 'vitest';\nit('one', () => {});\nit('two', () => {});\n",
        'docs/plans/plan-1.md': '# Plan\n\nA plan doc.\nWith a few lines.\n',
        'public/assets/images/hero.png': 'PNG\x89fake-bytes-for-size-counting-only-0123456789',
        'project-metrics.config.yaml': [
          'editorial:',
          '  oneLiner: "Active A — the rich one"',
          '  hookStat: { label: "TESTS", value: "metric:testCases" }',
          '  heroImage: public/assets/images/hero.png',
          '  repoUrl: https://example.com/a',
          '  status: active',
          '  description: |',
          '    Active project A with a full editorial block.',
          '',
        ].join('\n'),
      },
    },
  ]);

  const activeB = await makeGitFixture([
    { message: 'active-b init', dateISO: DATE, files: { 'README.md': '# Active B\nNo editorial.\n' } },
  ]);

  const activeC = await plainDir({ 'README.md': '# Active C\nNo git history here.\n' });

  const metaTool = await makeGitFixture([
    {
      message: 'meta init',
      dateISO: DATE,
      files: {
        'src/m.ts': 'export const m = 1;\n',
        // A meta project may carry an editorial block — it MUST be forced null.
        'project-metrics.config.yaml':
          'editorial:\n  oneLiner: "should be forced null"\n  hookStat: { label: X, value: "1" }\n  description: ignored\n',
      },
    },
  ]);

  const archiveA = await makeGitFixture([
    { message: 'arch a', dateISO: DATE, files: { 'src/a.ts': 'export const a = 1;\nexport const b = 2;\n' } },
  ]);
  const archiveB = await makeGitFixture([
    { message: 'arch b', dateISO: DATE, files: { 'src/b.ts': 'export const c = 3;\n' } },
  ]);

  const slugA = projectPathToSessionSlug(activeA);
  const slugB = projectPathToSessionSlug(activeB);
  const slugMeta = projectPathToSessionSlug(metaTool);
  const orphanSlug = 'c--Users-test-unconfigured-orphan';

  const homeDir = await makeSessionFixture({
    [slugA]: {
      'session-1.jsonl': [
        assistantLine({ ts: '2026-05-01T00:00:00.000Z', input: 100, output: 50 }),
        assistantLine({ ts: '2026-05-03T00:00:00.000Z', input: 100, cacheRead: 900, sidechain: true }),
        assistantLine({ ts: '2026-05-05T00:00:00.000Z', input: 100, output: 50 }),
      ],
    },
    [`${slugA}--claude-worktrees-test-abc`]: {
      'session-2.jsonl': [assistantLine({ ts: '2026-05-02T00:00:00.000Z', input: 200 })],
    },
    [slugB]: { 'empty.jsonl': [] },
    [slugMeta]: {
      'meta-session.jsonl': [
        assistantLine({ ts: '2026-05-01T00:00:00.000Z', input: 1000 }),
        assistantLine({ ts: '2026-05-02T00:00:00.000Z', input: 1000 }),
      ],
    },
    [orphanSlug]: { 'stranded.jsonl': [assistantLine({ input: 99999 })] },
  });

  const dirs = [activeA, activeB, activeC, metaTool, archiveA, archiveB, homeDir];
  return {
    homeDir,
    projectPaths: [activeA, activeB, activeC],
    metaPaths: [metaTool],
    archivePaths: [archiveA, archiveB],
    orphanSlug,
    cleanup: async () => {
      for (const d of dirs) await fs.rm(d, { recursive: true, force: true });
    },
  };
}
