import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { GitStats } from './taxonomy.js';

const execFileAsync = promisify(execFile);

const ASSET_EXT_FAMILIES: Record<string, string[]> = {
  images: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.tiff', '.tif'],
  audio: ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'],
  video: ['.mp4', '.webm', '.mov', '.mkv', '.avi'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
};

const ALL_ASSET_EXTS = new Set(Object.values(ASSET_EXT_FAMILIES).flat());

function extToFamily(ext: string): string | null {
  const lower = ext.toLowerCase();
  for (const [family, exts] of Object.entries(ASSET_EXT_FAMILIES)) {
    if (exts.includes(lower)) return family;
  }
  return null;
}

function emptyStats(): GitStats {
  return {
    isGitRepo: false,
    totalCommits: 0,
    commitsByAuthor: [],
    lifetimeLinesAdded: 0,
    lifetimeLinesRemoved: 0,
    uniqueFilesTouched: 0,
    commitMessageLines: 0,
    discardedAssetFiles: 0,
    discardedAssetEvents: 0,
    discardedAssetByKind: {},
    assetModificationEvents: 0,
    assetUniquePathsTouched: 0,
    firstCommitISO: null,
    lastCommitISO: null,
    projectAgeDays: null,
    linesByAuthor: [],
    timeline: {
      commitsByDay: [],
      activeDays: 0,
      peakDay: null,
      largestSingleCommit: null,
    },
  };
}

/**
 * Resolve repo context for the given project root.
 *   - `scope: 'own'` — rootDir IS the git toplevel (its own repo).
 *   - `scope: 'subdir'` — rootDir is inside a larger repo; we'll scope
 *     all git queries to its subtree using a pathspec.
 *   - returns null if not under git at all.
 */
async function getRepoContext(rootDir: string): Promise<{
  scope: 'own' | 'subdir';
  /** Pathspec to use with `-- <pathspec>` when scope === 'subdir'. */
  pathspec?: string;
} | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', rootDir, 'rev-parse', '--show-toplevel'],
      { windowsHide: true },
    );
    const toplevel = path.resolve(stdout.trim());
    const resolvedRoot = path.resolve(rootDir);
    if (toplevel === resolvedRoot) {
      return { scope: 'own' };
    }
    return { scope: 'subdir' };
  } catch {
    return null;
  }
}

async function git(rootDir: string, args: string[], maxBuffer = 256 * 1024 * 1024): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', rootDir, ...args], {
    maxBuffer,
    windowsHide: true,
  });
  return stdout;
}

/**
 * Append `-- .` to scope a log command to the current directory's subtree.
 * Works whether we're at the repo root (matches everything) or in a subdir
 * (matches only that subtree's history).
 */
function withScope(args: string[]): string[] {
  return [...args, '--', '.'];
}

export async function collectGitStats(rootDir: string): Promise<GitStats> {
  const stats = emptyStats();
  const ctx = await getRepoContext(rootDir);
  if (!ctx) return stats;
  stats.isGitRepo = true;

  // Total commits scoped to rootDir's subtree.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%H']));
    stats.totalCommits = out.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return stats;
  }

  if (stats.totalCommits === 0) return stats;

  // Commits by author, scoped. shortlog doesn't take pathspec directly in
  // all versions — pipe via `log --format=%aN` and tally in JS.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%aN']));
    const counts = new Map<string, number>();
    for (const line of out.split(/\r?\n/)) {
      const a = line.trim();
      if (!a) continue;
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    stats.commitsByAuthor = Array.from(counts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    /* ignore */
  }

  // 0.1 — temporal context (first/last commit + age), scoped to the subtree.
  // One newest-first pass: line[0] = newest (last commit), line[last] = oldest
  // (first commit). NOTE: `git log --reverse --max-count=1` does NOT return the
  // oldest commit — --max-count is applied BEFORE --reverse, so it yields the
  // NEWEST (verified on BURNED: identical to `-1`). Derive both bounds in JS.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%aI']));
    const dates = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (dates.length > 0) {
      const lastISO = dates[0]!;
      const firstISO = dates[dates.length - 1]!;
      stats.lastCommitISO = lastISO;
      stats.firstCommitISO = firstISO;
      const ageMs = Date.parse(lastISO) - Date.parse(firstISO);
      stats.projectAgeDays = Number.isFinite(ageMs) ? Math.floor(ageMs / 86_400_000) : null;
    }
  } catch {
    /* leave null defaults from emptyStats() */
  }

  // Lifetime churn + unique files touched, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--numstat', '--pretty=format:']));
    const filesTouched = new Set<string>();
    let added = 0;
    let removed = 0;
    for (const line of out.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [aStr, rStr, ...rest] = parts;
      const filePath = rest.join('\t');
      if (aStr !== '-' && rStr !== '-') {
        added += Number(aStr) || 0;
        removed += Number(rStr) || 0;
      }
      const renameMatch = filePath.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
      filesTouched.add(renameMatch ? `${renameMatch[1]}${renameMatch[3]}${renameMatch[4]}` : filePath);
    }
    stats.lifetimeLinesAdded = added;
    stats.lifetimeLinesRemoved = removed;
    stats.uniqueFilesTouched = filesTouched.size;
  } catch {
    /* ignore */
  }

  // Commit message line count, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--pretty=format:%B']));
    stats.commitMessageLines = out.split(/\r?\n/).filter((l) => l.trim()).length;
  } catch {
    /* ignore */
  }

  // Discarded asset files, scoped. Get all deletions in subtree, filter by ext in JS.
  try {
    const out = await git(rootDir, withScope(['log', '--diff-filter=D', '--name-only', '--pretty=format:']));
    const uniquePaths = new Set<string>();
    let events = 0;
    const byKind: Record<string, number> = {};
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim();
      if (!p) continue;
      const ext = path.extname(p).toLowerCase();
      if (!ALL_ASSET_EXTS.has(ext)) continue;
      events += 1;
      uniquePaths.add(p);
      const family = extToFamily(ext);
      if (family) byKind[family] = (byKind[family] ?? 0) + 1;
    }
    stats.discardedAssetFiles = uniquePaths.size;
    stats.discardedAssetEvents = events;
    stats.discardedAssetByKind = byKind;
  } catch {
    /* ignore */
  }

  // Asset modification events — every commit-event touching an asset path, scoped.
  try {
    const out = await git(rootDir, withScope(['log', '--name-only', '--pretty=format:']));
    const unique = new Set<string>();
    let events = 0;
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim();
      if (!p) continue;
      const ext = path.extname(p).toLowerCase();
      if (!ALL_ASSET_EXTS.has(ext)) continue;
      events += 1;
      unique.add(p);
    }
    stats.assetModificationEvents = events;
    stats.assetUniquePathsTouched = unique.size;
  } catch {
    /* ignore */
  }

  // 0.4 + 0.5 — linesByAuthor (Co-Authored-By aware) + timeline, in ONE -z pass.
  // ADDITIVE to the lifetime-churn/uniqueFiles pass above (which stays as-is).
  try {
    const out = await git(
      rootDir,
      withScope(['log', '-z', '--pretty=format:%H%x00%aI%x00%aN%x00%B%x00', '--numstat']),
    );
    const commits = parseGitCommitLog(out);

    // linesByAuthor — ADDITIVE attribution: primary author gets the commit's
    // churn + a `commits` tick; each Co-Authored-By trailer gets the SAME full
    // churn + a `coAuthoredCommits` tick (NOT a `commits` tick).
    const authorMap = new Map<
      string,
      { author: string; commits: number; linesAdded: number; linesRemoved: number; coAuthoredCommits: number }
    >();
    const entryFor = (author: string) => {
      let e = authorMap.get(author);
      if (!e) {
        e = { author, commits: 0, linesAdded: 0, linesRemoved: 0, coAuthoredCommits: 0 };
        authorMap.set(author, e);
      }
      return e;
    };

    const byDay = new Map<string, number>();
    let largest: GitStats['timeline']['largestSingleCommit'] = null;

    for (const c of commits) {
      const primary = entryFor(c.author);
      primary.commits += 1;
      primary.linesAdded += c.linesAdded;
      primary.linesRemoved += c.linesRemoved;
      for (const co of c.coAuthors) {
        const e = entryFor(co);
        e.coAuthoredCommits += 1;
        e.linesAdded += c.linesAdded;
        e.linesRemoved += c.linesRemoved;
      }

      const day = c.dateISO.slice(0, 10); // YYYY-MM-DD (author-local)
      if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);

      // largestSingleCommit: max churn; binary-only commits (0 churn) ineligible;
      // tie → LATER commit wins (compared by real timestamp, not lexical ISO).
      const churn = c.linesAdded + c.linesRemoved;
      if (churn > 0) {
        const curChurn = largest ? largest.linesAdded + largest.linesRemoved : -1;
        const laterOnTie =
          largest !== null &&
          churn === curChurn &&
          Date.parse(c.dateISO) > Date.parse(largest.dateISO);
        if (!largest || churn > curChurn || laterOnTie) {
          largest = {
            sha: c.sha,
            dateISO: c.dateISO,
            linesAdded: c.linesAdded,
            linesRemoved: c.linesRemoved,
          };
        }
      }
    }

    stats.linesByAuthor = Array.from(authorMap.values()).sort(
      (a, b) => b.linesAdded + b.linesRemoved - (a.linesAdded + a.linesRemoved),
    );

    const commitsByDay = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)); // asc by date

    let peakDay: GitStats['timeline']['peakDay'] = null;
    for (const d of commitsByDay) {
      // max count; tie → latest date (YYYY-MM-DD lexical == chronological)
      if (!peakDay || d.count > peakDay.count || (d.count === peakDay.count && d.date > peakDay.date)) {
        peakDay = { date: d.date, count: d.count };
      }
    }

    stats.timeline = {
      commitsByDay,
      activeDays: commitsByDay.length,
      peakDay,
      largestSingleCommit: largest,
    };
  } catch {
    /* leave empty defaults from emptyStats() */
  }

  return stats;
}

/** One parsed commit from the -z log pass. */
export interface ParsedCommit {
  sha: string;
  dateISO: string;
  author: string;
  coAuthors: string[];
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Extract Co-Authored-By trailer names from a raw commit body.
 *
 * Case-INSENSITIVE on the whole key (git trailers are): matches `Co-Authored-By`,
 * `Co-authored-by`, `co-Authored-By`, etc. Requires a `<...>` email-ish part —
 * a malformed trailer with no angle-bracket part is ignored (returns no name).
 */
export function parseCoAuthorTrailers(body: string): string[] {
  const names: string[] = [];
  const re = /^co-authored-by:\s*(.+?)\s*<[^>]*>/gim;
  for (const m of body.matchAll(re)) {
    const name = (m[1] ?? '').trim();
    if (name) names.push(name);
  }
  return names;
}

/**
 * Parse the NUL-delimited output of:
 *   git log -z --pretty=format:"%H%x00%aI%x00%aN%x00%B%x00" --numstat
 *
 * Split on \0, the fields per commit are: sha, dateISO, author, body, then one
 * field per numstat line, terminated by an empty field (the commit boundary
 * under -z). The FIRST numstat field carries a leading \n (git's format→numstat
 * separator) which is stripped. Binary files appear as `-\t-\t<path>` and
 * contribute 0 lines. Verified against real `git log -z` output (2026-05-25).
 */
export function parseGitCommitLog(stdout: string): ParsedCommit[] {
  const fields = stdout.split('\0');
  const commits: ParsedCommit[] = [];
  let i = 0;
  while (i < fields.length) {
    while (i < fields.length && fields[i] === '') i++; // skip boundary empties
    if (i + 3 >= fields.length) break; // not a full header (sha,date,name,body)
    const sha = fields[i++]!;
    const dateISO = fields[i++]!;
    const author = fields[i++]!;
    const body = fields[i++]!;
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) break; // defensive: format desync

    let linesAdded = 0;
    let linesRemoved = 0;
    while (i < fields.length) {
      const line = fields[i++]!.replace(/^\r?\n/, '');
      if (line === '') break; // commit boundary
      const m = line.match(/^(-|\d+)\t(-|\d+)\t/);
      if (!m) continue; // not a numstat line; ignore defensively
      linesAdded += m[1] === '-' ? 0 : Number(m[1]) || 0;
      linesRemoved += m[2] === '-' ? 0 : Number(m[2]) || 0;
    }

    commits.push({
      sha,
      dateISO,
      author,
      coAuthors: parseCoAuthorTrailers(body),
      linesAdded,
      linesRemoved,
    });
  }
  return commits;
}
