import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifySlugs,
  collectSessionTokens,
  normalizeModel,
  parseLine,
  projectPathToSessionSlug,
} from './session-tokens.js';
import { buildMultiProjectReport } from './multi-report.js';
import { assistantLine, cleanupHome, makeSessionFixture } from './__tests__/helpers/session-fixture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, 'session-tokens.ts');

// A fictional but absolute project path; collectSessionTokens never stats it.
const PROJECT = path.resolve('/proj/parent');
const PARENT = projectPathToSessionSlug(PROJECT);

const homes: string[] = [];
async function fixture(spec: Parameters<typeof makeSessionFixture>[0]): Promise<string> {
  const home = await makeSessionFixture(spec);
  homes.push(home);
  return home;
}
afterEach(async () => {
  while (homes.length) await cleanupHome(homes.pop()!);
});

describe('parseLine — privacy-by-construction pick-list', () => {
  it('returns EXACTLY the seven allowed keys, dropping all PII-bearing fields', () => {
    const piiLine = {
      type: 'assistant',
      timestamp: '2026-05-01T10:00:00.000Z',
      isSidechain: false,
      cwd: 'C:/Users/brigg/secret/path',
      gitBranch: 'feat/TICKET-123',
      lastPrompt: 'do not leak me',
      attachment: { stdout: 'hook output' },
      aiTitle: 'summary',
      toolUseResult: 'file contents + secrets',
      snapshot: 'raw file content',
      message: {
        model: 'claude-opus-4-7',
        content: 'the full transcript',
        usage: {
          input_tokens: 1,
          output_tokens: 2,
          cache_creation_input_tokens: 3,
          cache_read_input_tokens: 4,
        },
      },
    };
    const parsed = parseLine(piiLine);
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!).sort()).toEqual([
      'cacheCreate',
      'cacheRead',
      'input',
      'model',
      'output',
      'sidechain',
      'ts',
    ]);
  });

  it('returns null for non-assistant line types', () => {
    expect(parseLine({ type: 'user', message: { content: 'hi' } })).toBeNull();
    expect(parseLine({ type: 'file-history-snapshot', snapshot: 'x' })).toBeNull();
    expect(parseLine('not an object')).toBeNull();
  });

  it('source contains no destructure-rest and never serializes the raw line', async () => {
    const src = await fs.readFile(SOURCE, 'utf8');
    expect(src).not.toMatch(/\.\.\.[a-zA-Z]+\s*}/); // no {...rest}
    expect(src).not.toMatch(/JSON\.stringify\(line/); // never serialize the raw line
  });
});

describe('slug merging', () => {
  it('merges a worktree slug into the parent', async () => {
    const home = await fixture({
      [PARENT]: { 's1.jsonl': [assistantLine({ input: 100 })] },
      [`${PARENT}--claude-worktrees-foo-39913a`]: { 's2.jsonl': [assistantLine({ input: 100 })] },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.tokensProcessed).toBe(200);
    expect(stats?.sessionCount).toBe(2);
  });

  it('merges a subdir slug but respects longest-prefix for a sibling project', async () => {
    const OTHER = path.resolve('/proj/parent-other');
    const otherSlug = projectPathToSessionSlug(OTHER); // PARENT + '-other'
    const home = await fixture({
      [PARENT]: { 'a.jsonl': [assistantLine({ input: 10 })] },
      [`${PARENT}-atc`]: { 'b.jsonl': [assistantLine({ input: 20 })] }, // subdir of PARENT
      [otherSlug]: { 'c.jsonl': [assistantLine({ input: 1000 })] }, // its OWN project
    });
    const parents = [PARENT, otherSlug];
    const parent = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: parents });
    const other = await collectSessionTokens(OTHER, { homeDir: home, configuredParentSlugs: parents });
    // parent absorbs itself + the -atc subdir (10 + 20), NOT -other.
    expect(parent.stats?.tokensProcessed).toBe(30);
    expect(parent.stats?.sessionCount).toBe(2);
    // -other claims only its own slug.
    expect(other.stats?.tokensProcessed).toBe(1000);
    expect(other.matchedSlugs).toEqual([otherSlug]);
  });

  it('matches case-insensitively (lowercase drive-letter slug on disk)', async () => {
    // PARENT begins with an uppercase drive letter on Windows; lower it on disk.
    const onDisk = PARENT.charAt(0).toLowerCase() + PARENT.slice(1);
    const home = await fixture({ [onDisk]: { 's.jsonl': [assistantLine({ input: 42 })] } });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.tokensProcessed).toBe(42);
  });

  it('merges a nested worktree-of-worktree into the parent', async () => {
    const nested = `${PARENT}--claude-worktrees-foo--claude-worktrees-bar`;
    const home = await fixture({
      [PARENT]: { 'a.jsonl': [assistantLine({ input: 5 })] },
      [nested]: { 'b.jsonl': [assistantLine({ input: 5 })] },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.tokensProcessed).toBe(10);
    expect(stats?.sessionCount).toBe(2);
  });

  it('classifySlugs flags unmatched slugs as orphans', () => {
    const { byParent, orphans } = classifySlugs([PARENT], [PARENT, `${PARENT}-atc`, 'c--unrelated-thing']);
    expect(byParent.get(PARENT.toLowerCase())).toEqual([PARENT, `${PARENT}-atc`]);
    expect(orphans).toEqual(['c--unrelated-thing']);
  });
});

describe('aggregation', () => {
  it('computes windowDays from min/max timestamps', async () => {
    const home = await fixture({
      [PARENT]: {
        's.jsonl': [
          assistantLine({ ts: '2026-05-01T00:00:00.000Z', input: 1 }),
          assistantLine({ ts: '2026-05-06T00:00:00.000Z', input: 1 }),
          assistantLine({ ts: '2026-05-11T00:00:00.000Z', input: 1 }),
        ],
      },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.windowDays).toBe(10);
  });

  it('windowDays is 0 for a single message', async () => {
    const home = await fixture({ [PARENT]: { 's.jsonl': [assistantLine({ input: 1 })] } });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.windowDays).toBe(0);
  });

  it('sidechain lines contribute to BOTH sidechainTokens and tokensProcessed', async () => {
    const home = await fixture({
      [PARENT]: {
        's.jsonl': [
          assistantLine({ input: 100, sidechain: false }),
          assistantLine({ input: 50, sidechain: true }),
        ],
      },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.tokensProcessed).toBe(150);
    expect(stats?.sidechainTokens).toBe(50);
  });

  it('token aggregate math: processed = all four, fresh = excludes cache reads', async () => {
    const home = await fixture({
      [PARENT]: {
        's.jsonl': [assistantLine({ input: 100, output: 200, cacheCreate: 50, cacheRead: 1000 })],
      },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats?.tokensProcessed).toBe(1350);
    expect(stats?.tokensFresh).toBe(350);
  });

  it('normalizes known model ids and passes unknowns through', async () => {
    const home = await fixture({
      [PARENT]: {
        's.jsonl': [
          assistantLine({ model: 'claude-opus-4-7', input: 10 }),
          assistantLine({ model: 'claude-future-7-0', input: 20 }),
        ],
      },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    const models = (stats?.byModel ?? []).map((m) => m.model).sort();
    expect(models).toEqual(['Opus 4.7', 'claude-future-7-0']);
    expect(normalizeModel('claude-opus-4-7')).toBe('Opus 4.7');
    expect(normalizeModel('claude-future-7-0')).toBe('claude-future-7-0');
  });
});

describe('robustness', () => {
  it('never throws on malformed input; counts parse-health', async () => {
    const home = await fixture({
      [PARENT]: {
        's.jsonl': [
          assistantLine({ input: 10 }), // good
          '{ "type": "assistant", "message": ', // truncated → JSON parse error
          'not json at all', // parse error
          { type: 'assistant', timestamp: '2026-05-01T10:00:00.000Z', message: { model: 'm' } }, // missing usage
        ],
      },
    });
    const { stats } = await collectSessionTokens(PROJECT, { homeDir: home, configuredParentSlugs: [PARENT] });
    expect(stats).not.toBeNull();
    expect(stats?.parseHealth.lineParseErrors).toBe(2);
    expect(stats?.parseHealth.usageShapeWarnings).toBe(1); // the missing-usage assistant line
    expect(stats?.sessionCount).toBe(2); // the good line + the missing-usage line (both "seen")
    expect(stats?.tokensProcessed).toBe(10);
  });

  it('returns {stats:null, matchedSlugs:[]} when ~/.claude/projects is absent', async () => {
    const bareHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-bare-')); // no .claude dir
    homes.push(bareHome);
    const { stats, matchedSlugs } = await collectSessionTokens(PROJECT, { homeDir: bareHome });
    expect(stats).toBeNull();
    expect(matchedSlugs).toEqual([]);
  });
});

describe('orphan slugs via buildMultiProjectReport', () => {
  it('returns orphan slug names and excludes them from combined totals', async () => {
    const home = await fixture({
      [PARENT]: { 's.jsonl': [assistantLine({ input: 100 })] },
      'c--Users-test-unconfigured': { 'x.jsonl': [assistantLine({ input: 999 })] },
    });
    const { report, orphanSlugs } = await buildMultiProjectReport({
      homeDir: home,
      projectPaths: [PROJECT], // fictional dir → skipped by stat, but seeds configuredParentSlugs
    });
    expect(orphanSlugs).toContain('c--Users-test-unconfigured');
    // The orphan's 999 tokens are NOT folded into combined.
    expect(report.combined.totalTokensProcessed).toBe(0);
  });
});
