import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectGitStats, parseCoAuthorTrailers, parseGitCommitLog } from './git-stats.js';
import { cleanupFixture, makeGitFixture } from './__tests__/helpers/git-fixture.js';

const NUL = '\0';

describe('parseCoAuthorTrailers (pure)', () => {
  it('returns [] when there are no trailers', () => {
    expect(parseCoAuthorTrailers('just a subject\n\nsome body text')).toEqual([]);
  });

  it('parses a single Co-Authored-By trailer', () => {
    const body = 'subject\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n';
    expect(parseCoAuthorTrailers(body)).toEqual(['Claude']);
  });

  it('parses two trailers across case variants (Co-authored-by / co-Authored-By)', () => {
    const body =
      'subject\n\nCo-authored-by: Claude <a@b.com>\nco-Authored-By: Otto <c@d.com>\n';
    expect(parseCoAuthorTrailers(body)).toEqual(['Claude', 'Otto']);
  });

  it('ignores a malformed trailer with no <email> part', () => {
    const body = 'subject\n\nCo-Authored-By: NoAngleBrackets\n';
    expect(parseCoAuthorTrailers(body)).toEqual([]);
  });
});

describe('parseGitCommitLog (pure, byte-format)', () => {
  it('parses the -z NUL layout: header fields, leading-\\n first numstat, binary as 0 lines', () => {
    // Mirrors real `git log -z --pretty=format:"%H%x00%aI%x00%aN%x00%B%x00" --numstat`.
    const log =
      'aaaaaaa' + NUL + '2026-01-02T10:00:00-05:00' + NUL + 'Alice' + NUL +
      'msg2\n\nCo-Authored-By: Bob <b@x.com>\n' + NUL +
      '\n5\t2\tfile1.ts' + NUL + '3\t0\tfile2.ts' + NUL + NUL +
      'bbbbbbb' + NUL + '2026-01-01T10:00:00-05:00' + NUL + 'Alice' + NUL +
      'msg1\n' + NUL +
      '\n-\t-\timg.png' + NUL;

    const commits = parseGitCommitLog(log);
    expect(commits).toHaveLength(2);

    expect(commits[0]).toEqual({
      sha: 'aaaaaaa',
      dateISO: '2026-01-02T10:00:00-05:00',
      author: 'Alice',
      coAuthors: ['Bob'],
      linesAdded: 8, // 5 + 3
      linesRemoved: 2, // 2 + 0
    });

    // Binary-only commit: `-\t-\t<path>` contributes 0 lines.
    expect(commits[1]).toEqual({
      sha: 'bbbbbbb',
      dateISO: '2026-01-01T10:00:00-05:00',
      author: 'Alice',
      coAuthors: [],
      linesAdded: 0,
      linesRemoved: 0,
    });
  });

  it('returns [] on empty input', () => {
    expect(parseGitCommitLog('')).toEqual([]);
  });
});

describe('collectGitStats — linesByAuthor additive attribution (e2e)', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await makeGitFixture([
      { message: 'c1 no coauthor', files: { 'f.txt': 'a\nb\nc\n' }, dateISO: '2026-01-01T10:00:00-05:00' },
      {
        message: 'c2\n\nCo-Authored-By: Claude <x@y.com>',
        files: { 'f.txt': 'a\nb\nc\nd\ne\n' }, // +2 lines
        dateISO: '2026-01-02T10:00:00-05:00',
      },
      {
        message: 'c3\n\nCo-authored-by: Claude <x@y.com>\nco-Authored-By: Otto <a@b.com>',
        files: { 'g.txt': 'z\n' }, // +1 line
        dateISO: '2026-01-03T10:00:00-05:00',
      },
    ]);
  });
  afterAll(async () => {
    await cleanupFixture(dir);
  });

  it('credits the primary author all 3 commits, co-authors additively', async () => {
    const stats = await collectGitStats(dir);
    const by = Object.fromEntries(stats.linesByAuthor.map((e) => [e.author, e]));

    // Primary author: 3 commits, 3 + 2 + 1 = 6 lines added, no co-authored.
    expect(by['Test Author']).toMatchObject({
      commits: 3,
      coAuthoredCommits: 0,
      linesAdded: 6,
      linesRemoved: 0,
    });

    // Claude: never a primary author, co-authored c2 (+2) and c3 (+1) = +3 lines.
    expect(by['Claude']).toMatchObject({
      commits: 0,
      coAuthoredCommits: 2,
      linesAdded: 3,
      linesRemoved: 0,
    });

    // Otto: co-authored only c3 (+1).
    expect(by['Otto']).toMatchObject({
      commits: 0,
      coAuthoredCommits: 1,
      linesAdded: 1,
      linesRemoved: 0,
    });
  });
});

describe('collectGitStats — timeline.peakDay tiebreaker (e2e)', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await makeGitFixture([
      { message: 'a1', files: { 'a1.txt': '1\n' }, dateISO: '2026-02-01T09:00:00-05:00' },
      { message: 'a2', files: { 'a2.txt': '2\n' }, dateISO: '2026-02-01T12:00:00-05:00' },
      { message: 'b1', files: { 'b1.txt': '3\n' }, dateISO: '2026-02-02T09:00:00-05:00' },
    ]);
  });
  afterAll(async () => {
    await cleanupFixture(dir);
  });

  it('picks the day with the most commits', async () => {
    const stats = await collectGitStats(dir);
    expect(stats.timeline.activeDays).toBe(2);
    expect(stats.timeline.peakDay).toEqual({ date: '2026-02-01', count: 2 });
    expect(stats.timeline.commitsByDay).toEqual([
      { date: '2026-02-01', count: 2 },
      { date: '2026-02-02', count: 1 },
    ]);
  });
});
